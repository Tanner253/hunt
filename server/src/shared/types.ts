export interface EntityState {
  id: string;
  x: number;
  y: number;
  facingLeft: boolean;
  isMoving: boolean;
  isDead: boolean;
  colorId: string;
  role: 'seeker' | 'hider';
  name: string;
  visible: boolean;
  isMarked: boolean;
  hasItem: boolean;
}

export interface PowerUpState {
  id: string;
  x: number;
  y: number;
}

export interface GameState {
  tick: number;
  timer: number;
  phase: 'hiding' | 'hunting' | 'over';
  entities: EntityState[];
  hidersAlive: number;
  powerUps: PowerUpState[];
}

export interface LobbyPositionState {
  id: string;
  x: number;
  y: number;
  facingLeft: boolean;
  isMoving: boolean;
  colorId: string;
  name: string;
}

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  seq: number;
}

export interface LobbyInfo {
  id: string;
  name: string;
  players: LobbyPlayerInfo[];
  maxPlayers: number;
  state: 'waiting' | 'countdown' | 'playing' | 'finished';
  isFree: boolean;
  votes: string[];
  spectators: number;
}

export interface LobbyPlayerInfo {
  id: string;
  name: string;
  colorId: string;
  hasVoted: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface EmoteEvent {
  playerId: string;
  emoteId: string;
  timestamp: number;
}

export interface GameOverData {
  winnerId: string | null;
  winnerName: string | null;
  duration: number;
  standings: { id: string; name: string; survivalTime: number }[];
}

export interface ServerToClientEvents {
  'lobby:list': (lobbies: LobbyInfo[]) => void;
  'lobby:state': (lobby: LobbyInfo) => void;
  'lobby:chat': (message: ChatMessage) => void;
  'lobby:countdown': (seconds: number) => void;
  'lobby:positions': (positions: LobbyPositionState[]) => void;
  'game:state': (state: GameState) => void;
  'game:start': (data: { mapId: string; yourId: string; colorId: string }) => void;
  'game:over': (data: GameOverData) => void;
  'game:kill': (data: { victimId: string; victimName: string; x: number; y: number }) => void;
  'game:emote': (data: EmoteEvent) => void;
  'game:marked': (data: { markerId: string; victimId: string; victimName: string }) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'lobby:list': (callback: (lobbies: LobbyInfo[]) => void) => void;
  'lobby:join': (
    data: { lobbyId: string; playerName: string },
    callback: (result: { success: boolean; error?: string; lobby?: LobbyInfo }) => void,
  ) => void;
  'lobby:leave': () => void;
  'lobby:vote-start': () => void;
  'lobby:chat': (text: string) => void;
  'lobby:move': (input: PlayerInput) => void;
  'game:input': (input: PlayerInput) => void;
  'game:use-item': () => void;
  'game:emote': (emoteId: string) => void;
  'spectate:join': (lobbyId: string) => void;
  'spectate:switch': (direction: 'next' | 'prev') => void;
  'spectate:leave': () => void;
}
