import { v4 as uuid } from 'uuid';
import { LobbyInfo, LobbyPlayerInfo, ChatMessage } from '../shared/types';
import {
  MAX_LOBBIES,
  MAX_PLAYERS_PER_LOBBY,
  FREE_LOBBY_MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  PLAYER_COLORS,
} from '../shared/constants';
import { GameEngine } from './GameEngine';

export interface LobbyPlayer {
  id: string;
  socketId: string;
  name: string;
  colorId: string;
  hasVoted: boolean;
}

export interface Spectator {
  socketId: string;
  watchingPlayerId: string | null;
}

export class Lobby {
  id: string;
  name: string;
  players: Map<string, LobbyPlayer> = new Map();
  spectators: Map<string, Spectator> = new Map();
  maxPlayers: number;
  isFree: boolean;
  state: 'waiting' | 'countdown' | 'playing' | 'finished' = 'waiting';
  votes: Set<string> = new Set();
  game: GameEngine | null = null;
  countdownTimer: ReturnType<typeof setInterval> | null = null;
  chatHistory: ChatMessage[] = [];

  constructor(id: string, name: string, maxPlayers: number, isFree: boolean) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.isFree = isFree;
  }

  getNextColor(): string {
    const used = new Set(Array.from(this.players.values()).map((p) => p.colorId));
    return PLAYER_COLORS.find((c) => !used.has(c)) || PLAYER_COLORS[0];
  }

  addPlayer(socketId: string, name: string): LobbyPlayer | null {
    if (this.players.size >= this.maxPlayers || this.state === 'playing') return null;

    const player: LobbyPlayer = {
      id: uuid(),
      socketId,
      name,
      colorId: this.getNextColor(),
      hasVoted: false,
    };
    this.players.set(player.id, player);
    return player;
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId);
    this.votes.delete(playerId);
    if (this.state === 'countdown' && !this.checkVoteThreshold()) {
      this.cancelCountdown();
    }
    if (this.players.size === 0) {
      this.state = 'waiting';
      this.votes.clear();
    }
  }

  toggleVote(playerId: string): boolean {
    if (this.state !== 'waiting' || !this.players.has(playerId)) return false;
    const player = this.players.get(playerId)!;
    if (this.votes.has(playerId)) {
      this.votes.delete(playerId);
      player.hasVoted = false;
    } else {
      this.votes.add(playerId);
      player.hasVoted = true;
    }
    return this.checkVoteThreshold();
  }

  checkVoteThreshold(): boolean {
    const count = this.players.size;
    if (count < MIN_PLAYERS_TO_START) return false;
    const voted = this.votes.size;
    if (count <= 3) return voted === count;
    return voted / count >= 0.75;
  }

  cancelCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.state = 'waiting';
  }

  getInfo(): LobbyInfo {
    return {
      id: this.id,
      name: this.name,
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        colorId: p.colorId,
        hasVoted: p.hasVoted,
      })),
      maxPlayers: this.maxPlayers,
      state: this.state,
      isFree: this.isFree,
      votes: Array.from(this.votes),
      spectators: this.spectators.size,
    };
  }
}

export class LobbyManager {
  lobbies: Map<string, Lobby> = new Map();
  playerLobbyMap: Map<string, string> = new Map();
  playerIdMap: Map<string, string> = new Map();

  constructor() {
    this.initLobbies();
  }

  private initLobbies() {
    const free = new Lobby('free', 'Free Lobby', FREE_LOBBY_MAX_PLAYERS, true);
    this.lobbies.set('free', free);
    for (let i = 1; i <= MAX_LOBBIES; i++) {
      const lobby = new Lobby(`lobby-${i}`, `Lobby ${i}`, MAX_PLAYERS_PER_LOBBY, false);
      this.lobbies.set(lobby.id, lobby);
    }
  }

  getLobbies(): LobbyInfo[] {
    return Array.from(this.lobbies.values()).map((l) => l.getInfo());
  }

  getLobby(id: string): Lobby | undefined {
    return this.lobbies.get(id);
  }

  joinLobby(
    lobbyId: string,
    socketId: string,
    playerName: string,
  ): { success: boolean; error?: string; lobby?: Lobby; player?: LobbyPlayer } {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { success: false, error: 'Lobby not found' };
    if (this.playerLobbyMap.has(socketId)) this.leaveLobby(socketId);

    const player = lobby.addPlayer(socketId, playerName);
    if (!player) return { success: false, error: 'Lobby is full or game in progress' };

    this.playerLobbyMap.set(socketId, lobbyId);
    this.playerIdMap.set(socketId, player.id);
    return { success: true, lobby, player };
  }

  leaveLobby(socketId: string): Lobby | null {
    const lobbyId = this.playerLobbyMap.get(socketId);
    if (!lobbyId) return null;
    const lobby = this.lobbies.get(lobbyId);
    const playerId = this.playerIdMap.get(socketId);
    if (lobby && playerId) lobby.removePlayer(playerId);
    this.playerLobbyMap.delete(socketId);
    this.playerIdMap.delete(socketId);
    return lobby || null;
  }

  getPlayerLobby(socketId: string): Lobby | null {
    const lobbyId = this.playerLobbyMap.get(socketId);
    return lobbyId ? this.lobbies.get(lobbyId) || null : null;
  }

  getPlayerId(socketId: string): string | null {
    return this.playerIdMap.get(socketId) || null;
  }

  resetLobby(lobbyId: string) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return;
    lobby.game?.stop();
    lobby.game = null;
    lobby.state = 'waiting';
    lobby.votes.clear();
    for (const player of lobby.players.values()) player.hasVoted = false;
  }
}
