import { v4 as uuid } from 'uuid';
import { LobbyInfo, LobbyPlayerInfo, LobbyPositionState, LobbyArenaState, LobbyCoin, ChatMessage, MapCandidate } from '../shared/types';
import {
  MAX_LOBBIES,
  MAX_PLAYERS_PER_LOBBY,
  FREE_LOBBY_MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  PLAYER_COLORS,
  LOBBY_ARENA_W,
  LOBBY_ARENA_H,
  PLAYER_SPEED,
} from '../shared/constants';
import { pickRandomMaps, MapDef, getMapById } from '../shared/maps';
import { GameEngine } from './GameEngine';

export interface LobbyPlayer {
  id: string;
  socketId: string;
  name: string;
  colorId: string;
  hasVoted: boolean;
  lobbyX: number;
  lobbyY: number;
  lobbyVx: number;
  lobbyVy: number;
  lobbyFacingLeft: boolean;
  lobbyScore: number;
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
  lobbyCoins: LobbyCoin[] = [];
  lobbyCoinTimer = 0;
  mapCandidates: MapDef[] = [];
  mapVotes: Map<string, string> = new Map();

  constructor(id: string, name: string, maxPlayers: number, isFree: boolean) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.isFree = isFree;
    this.spawnCoins(5);
    this.rollMapCandidates();
  }

  private spawnCoins(count: number) {
    const pad = 50;
    for (let i = 0; i < count; i++) {
      this.lobbyCoins.push({
        id: uuid(),
        x: pad + Math.random() * (LOBBY_ARENA_W - pad * 2),
        y: pad + Math.random() * (LOBBY_ARENA_H - pad * 2),
      });
    }
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
      lobbyX: 80 + Math.random() * (LOBBY_ARENA_W - 160),
      lobbyY: 80 + Math.random() * (LOBBY_ARENA_H - 160),
      lobbyVx: 0,
      lobbyVy: 0,
      lobbyFacingLeft: false,
      lobbyScore: 0,
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
    return voted / count >= 0.55;
  }

  rollMapCandidates() {
    this.mapCandidates = pickRandomMaps(3);
    this.mapVotes.clear();
  }

  voteMap(playerId: string, mapId: string) {
    if (!this.players.has(playerId)) return;
    if (!this.mapCandidates.some((m) => m.id === mapId)) return;
    this.mapVotes.set(playerId, mapId);
  }

  getWinningMap(): MapDef {
    const counts: Record<string, number> = {};
    for (const mapId of this.mapVotes.values()) {
      counts[mapId] = (counts[mapId] || 0) + 1;
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [mapId, count] of Object.entries(counts)) {
      if (count > bestCount) { best = mapId; bestCount = count; }
    }
    if (best) {
      const found = this.mapCandidates.find((m) => m.id === best);
      if (found) return found;
    }
    return this.mapCandidates[Math.floor(Math.random() * this.mapCandidates.length)];
  }

  updateLobbyPositions(delta: number) {
    if (this.state === 'playing') return;
    const pad = 30;
    const coinPickupRadius = 25;

    for (const p of this.players.values()) {
      const isMoving = Math.abs(p.lobbyVx) > 0.1 || Math.abs(p.lobbyVy) > 0.1;
      if (isMoving) {
        p.lobbyX += p.lobbyVx * delta;
        p.lobbyY += p.lobbyVy * delta;
        p.lobbyX = Math.max(pad, Math.min(LOBBY_ARENA_W - pad, p.lobbyX));
        p.lobbyY = Math.max(pad, Math.min(LOBBY_ARENA_H - pad, p.lobbyY));
        if (p.lobbyVx < -0.1) p.lobbyFacingLeft = true;
        if (p.lobbyVx > 0.1) p.lobbyFacingLeft = false;
      }

      for (let i = this.lobbyCoins.length - 1; i >= 0; i--) {
        const c = this.lobbyCoins[i];
        if (Math.hypot(p.lobbyX - c.x, p.lobbyY - c.y) < coinPickupRadius) {
          p.lobbyScore++;
          this.lobbyCoins.splice(i, 1);
        }
      }
    }

    this.lobbyCoinTimer += delta;
    if (this.lobbyCoinTimer >= 3 && this.lobbyCoins.length < 5) {
      this.lobbyCoinTimer = 0;
      this.spawnCoins(1);
    }
  }

  getLobbyArenaState(): LobbyArenaState {
    return {
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        x: Math.round(p.lobbyX),
        y: Math.round(p.lobbyY),
        facingLeft: p.lobbyFacingLeft,
        isMoving: Math.abs(p.lobbyVx) > 0.1 || Math.abs(p.lobbyVy) > 0.1,
        colorId: p.colorId,
        name: p.name,
        score: p.lobbyScore,
      })),
      coins: this.lobbyCoins,
    };
  }

  cancelCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.state = 'waiting';
  }

  getInfo(): LobbyInfo {
    const mapVotesObj: Record<string, string> = {};
    for (const [pid, mid] of this.mapVotes) mapVotesObj[pid] = mid;
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
      mapCandidates: this.mapCandidates.map((m) => ({ id: m.id, name: m.name })),
      mapVotes: mapVotesObj,
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
    lobby.rollMapCandidates();
  }
}
