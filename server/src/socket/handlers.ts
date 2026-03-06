import { Server, Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { LobbyManager, Lobby } from '../game/LobbyManager';
import { GameEngine } from '../game/GameEngine';
import {
  ChatMessage,
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInput,
  GameOverData,
} from '../shared/types';
import { PLAYER_SPEED, LOBBY_TICK_RATE } from '../shared/constants';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: IO, lobbyManager: LobbyManager) {
  const lobbyInterval = setInterval(() => {
    const delta = 1 / LOBBY_TICK_RATE;
    for (const [, lobby] of lobbyManager.lobbies) {
      if (lobby.state !== 'waiting' && lobby.state !== 'countdown') continue;
      if (lobby.players.size === 0) continue;
      lobby.updateLobbyPositions(delta);
      io.to(`lobby:${lobby.id}`).emit('lobby:positions', lobby.getLobbyArenaState());
    }
  }, 1000 / LOBBY_TICK_RATE);

  io.on('connection', (socket: TypedSocket) => {
    console.log(`Connected: ${socket.id}`);

    socket.on('lobby:list', (callback) => {
      callback(lobbyManager.getLobbies());
    });

    socket.on('lobby:join', (data, callback) => {
      const result = lobbyManager.joinLobby(data.lobbyId, socket.id, data.playerName);
      if (result.success && result.lobby) {
        socket.join(`lobby:${data.lobbyId}`);
        callback({ success: true, lobby: result.lobby.getInfo() });
        io.to(`lobby:${data.lobbyId}`).emit('lobby:state', result.lobby.getInfo());
        broadcastLobbyList(io, lobbyManager);
      } else {
        callback({ success: false, error: result.error });
      }
    });

    socket.on('lobby:leave', () => {
      const lobby = lobbyManager.leaveLobby(socket.id);
      if (lobby) {
        socket.leave(`lobby:${lobby.id}`);
        io.to(`lobby:${lobby.id}`).emit('lobby:state', lobby.getInfo());
        broadcastLobbyList(io, lobbyManager);
      }
    });

    socket.on('lobby:vote-start', () => {
      const lobby = lobbyManager.getPlayerLobby(socket.id);
      const playerId = lobbyManager.getPlayerId(socket.id);
      if (!lobby || !playerId) return;

      const shouldStart = lobby.toggleVote(playerId);
      io.to(`lobby:${lobby.id}`).emit('lobby:state', lobby.getInfo());

      if (shouldStart && lobby.state === 'waiting') {
        startCountdown(io, lobbyManager, lobby);
      }
    });

    socket.on('lobby:chat', (text) => {
      const lobby = lobbyManager.getPlayerLobby(socket.id);
      const playerId = lobbyManager.getPlayerId(socket.id);
      if (!lobby || !playerId) return;
      const player = lobby.players.get(playerId);
      if (!player) return;

      const message: ChatMessage = {
        id: uuid(),
        senderId: playerId,
        senderName: player.name,
        text: text.slice(0, 200),
        timestamp: Date.now(),
      };
      lobby.chatHistory.push(message);
      if (lobby.chatHistory.length > 50) lobby.chatHistory.shift();
      io.to(`lobby:${lobby.id}`).emit('lobby:chat', message);
    });

    socket.on('lobby:move', (input: PlayerInput) => {
      const lobby = lobbyManager.getPlayerLobby(socket.id);
      const playerId = lobbyManager.getPlayerId(socket.id);
      if (!lobby || !playerId) return;
      const player = lobby.players.get(playerId);
      if (!player) return;
      let vx = 0, vy = 0;
      if (input.up) vy = -PLAYER_SPEED;
      if (input.down) vy = PLAYER_SPEED;
      if (input.left) vx = -PLAYER_SPEED;
      if (input.right) vx = PLAYER_SPEED;
      if (vx !== 0 && vy !== 0) {
        const len = Math.hypot(vx, vy);
        vx = (vx / len) * PLAYER_SPEED;
        vy = (vy / len) * PLAYER_SPEED;
      }
      player.lobbyVx = vx;
      player.lobbyVy = vy;
    });

    socket.on('game:input', (input: PlayerInput) => {
      const lobby = lobbyManager.getPlayerLobby(socket.id);
      const playerId = lobbyManager.getPlayerId(socket.id);
      if (!lobby?.game || !playerId) return;
      lobby.game.processInput(playerId, input);
    });

    socket.on('game:use-item', () => {
      const lobby = lobbyManager.getPlayerLobby(socket.id);
      const playerId = lobbyManager.getPlayerId(socket.id);
      if (!lobby?.game || !playerId) return;
      lobby.game.useItem(playerId);
    });

    socket.on('game:emote', (emoteId: string) => {
      const lobby = lobbyManager.getPlayerLobby(socket.id);
      const playerId = lobbyManager.getPlayerId(socket.id);
      if (!lobby?.game || !playerId) return;
      lobby.game.addEmote(playerId, emoteId);
      io.to(`lobby:${lobby.id}`).emit('game:emote', {
        playerId,
        emoteId,
        timestamp: Date.now(),
      });
    });

    socket.on('spectate:join', (lobbyId: string) => {
      const lobby = lobbyManager.getLobby(lobbyId);
      if (!lobby?.game) return;
      const playerIds = lobby.game.getAlivePlayerIds();
      if (playerIds.length === 0) return;
      const watchingId = playerIds[0];
      lobby.spectators.set(socket.id, { socketId: socket.id, watchingPlayerId: watchingId });
      socket.join(`lobby:${lobbyId}`);
      socket.emit('game:start', { mapId: 'default', yourId: watchingId, colorId: 'spectator' });
    });

    socket.on('spectate:switch', (direction) => {
      for (const [, lobby] of lobbyManager.lobbies) {
        const spectator = lobby.spectators.get(socket.id);
        if (!spectator || !lobby.game) continue;
        const ids = lobby.game.getAlivePlayerIds();
        if (ids.length === 0) return;
        const idx = ids.indexOf(spectator.watchingPlayerId || '');
        const next = direction === 'next' ? (idx + 1) % ids.length : (idx - 1 + ids.length) % ids.length;
        spectator.watchingPlayerId = ids[next];
        socket.emit('game:start', { mapId: 'default', yourId: ids[next], colorId: 'spectator' });
      }
    });

    socket.on('spectate:leave', () => {
      for (const [, lobby] of lobbyManager.lobbies) {
        if (lobby.spectators.has(socket.id)) {
          lobby.spectators.delete(socket.id);
          socket.leave(`lobby:${lobby.id}`);
        }
      }
    });

    socket.on('disconnect', () => {
      for (const [, lobby] of lobbyManager.lobbies) lobby.spectators.delete(socket.id);
      const lobby = lobbyManager.leaveLobby(socket.id);
      if (lobby) {
        io.to(`lobby:${lobby.id}`).emit('lobby:state', lobby.getInfo());
        broadcastLobbyList(io, lobbyManager);
      }
      console.log(`Disconnected: ${socket.id}`);
    });
  });
}

function broadcastLobbyList(io: IO, lm: LobbyManager) {
  io.emit('lobby:list' as any, lm.getLobbies());
}

function startCountdown(io: IO, lm: LobbyManager, lobby: Lobby) {
  lobby.state = 'countdown';
  let count = 5;
  io.to(`lobby:${lobby.id}`).emit('lobby:countdown', count);
  lobby.countdownTimer = setInterval(() => {
    count--;
    if (count <= 0) {
      lobby.cancelCountdown();
      startGame(io, lm, lobby);
    } else {
      io.to(`lobby:${lobby.id}`).emit('lobby:countdown', count);
    }
  }, 1000);
}

function startGame(io: IO, lm: LobbyManager, lobby: Lobby) {
  lobby.state = 'playing';
  const playerInfos = Array.from(lobby.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    colorId: p.colorId,
  }));

  const callbacks = {
    onStateUpdate: (playerId: string, state: any) => {
      const player = lobby.players.get(playerId);
      if (player) io.to(player.socketId).emit('game:state', state);
      for (const [, spec] of lobby.spectators) {
        if (spec.watchingPlayerId === playerId) {
          io.to(spec.socketId).emit('game:state', state);
        }
      }
    },
    onGameOver: (data: GameOverData) => {
      io.to(`lobby:${lobby.id}`).emit('game:over', data);
      setTimeout(() => {
        lm.resetLobby(lobby.id);
        io.to(`lobby:${lobby.id}`).emit('lobby:state', lobby.getInfo());
        broadcastLobbyList(io, lm);
      }, 10000);
    },
    onKill: (victimId: string, victimName: string, x: number, y: number) => {
      io.to(`lobby:${lobby.id}`).emit('game:kill', { victimId, victimName, x, y });
    },
    onMarked: (markerId: string, victimId: string, victimName: string) => {
      io.to(`lobby:${lobby.id}`).emit('game:marked', { markerId, victimId, victimName });
    },
  };

  lobby.game = new GameEngine(lobby.id, playerInfos, callbacks);
  for (const player of lobby.players.values()) {
    io.to(player.socketId).emit('game:start', {
      mapId: 'default',
      yourId: player.id,
      colorId: player.colorId,
    });
  }
  lobby.game.start();
  broadcastLobbyList(io, lm);
}
