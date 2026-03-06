import { GameMap } from './Map';
import { ServerEntity, SeekerBot } from './Entity';
import { GameState, PlayerInput, GameOverData, EmoteEvent } from '../shared/types';
import {
  TICK_RATE,
  ROUND_TIME,
  HIDE_TIME,
  PLAYER_SPEED,
  PLAYER_RADIUS,
  SEEKER_BOOST_SPEED,
  MAP_DEFAULT,
} from '../shared/constants';

export interface GameEventCallbacks {
  onStateUpdate: (playerId: string, state: GameState) => void;
  onGameOver: (data: GameOverData) => void;
  onKill: (victimId: string, victimName: string, x: number, y: number) => void;
}

export class GameEngine {
  id: string;
  map: GameMap;
  players: Map<string, ServerEntity> = new Map();
  seeker: SeekerBot;
  phase: 'hiding' | 'hunting' | 'over' = 'hiding';
  timer: number;
  tick = 0;
  interval: ReturnType<typeof setInterval> | null = null;
  callbacks: GameEventCallbacks;
  startTime: number;
  deathOrder: { id: string; name: string; time: number }[] = [];
  emotes: EmoteEvent[] = [];

  constructor(
    id: string,
    playerInfos: { id: string; name: string; colorId: string }[],
    callbacks: GameEventCallbacks,
  ) {
    this.id = id;
    this.callbacks = callbacks;
    this.map = new GameMap(MAP_DEFAULT);
    this.timer = HIDE_TIME;
    this.startTime = Date.now();

    const seekerPos = this.map.getRandomWalkablePos();
    this.seeker = new SeekerBot('seeker', seekerPos.x, seekerPos.y);

    for (const info of playerInfos) {
      let pos: { x: number; y: number };
      let attempts = 0;
      do {
        pos = this.map.getRandomWalkablePos();
        attempts++;
      } while (Math.hypot(pos.x - seekerPos.x, pos.y - seekerPos.y) < 600 && attempts < 50);

      const entity = new ServerEntity(info.id, pos.x, pos.y, info.colorId, 'hider');
      entity.name = info.name;
      this.players.set(info.id, entity);
    }
  }

  start() {
    this.interval = setInterval(() => this.updateTick(), 1000 / TICK_RATE);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  processInput(playerId: string, input: PlayerInput) {
    const entity = this.players.get(playerId);
    if (!entity || entity.isDead) return;
    entity.pendingInput = input;
  }

  addEmote(playerId: string, emoteId: string) {
    this.emotes.push({ playerId, emoteId, timestamp: Date.now() });
    setTimeout(() => {
      this.emotes = this.emotes.filter((e) => !(e.playerId === playerId && e.emoteId === emoteId));
    }, 3000);
  }

  private updateTick() {
    const delta = 1 / TICK_RATE;
    this.tick++;
    this.timer -= delta;

    if (this.phase === 'hiding' && this.timer <= 0) {
      this.phase = 'hunting';
      this.timer = ROUND_TIME;
    }

    for (const [, entity] of this.players) {
      if (entity.isDead) continue;
      const input = entity.pendingInput;
      if (input) {
        entity.vx = 0;
        entity.vy = 0;
        if (input.up) entity.vy = -PLAYER_SPEED;
        if (input.down) entity.vy = PLAYER_SPEED;
        if (input.left) entity.vx = -PLAYER_SPEED;
        if (input.right) entity.vx = PLAYER_SPEED;
        if (entity.vx !== 0 && entity.vy !== 0) {
          const len = Math.hypot(entity.vx, entity.vy);
          entity.vx = (entity.vx / len) * PLAYER_SPEED;
          entity.vy = (entity.vy / len) * PLAYER_SPEED;
        }
      } else {
        entity.vx = 0;
        entity.vy = 0;
      }
      entity.update(delta, this.map.walls);
    }

    if (this.phase === 'hunting') {
      if (this.timer <= 0) this.seeker.speed = SEEKER_BOOST_SPEED;
      const hiders = Array.from(this.players.values());
      this.seeker.updateAI(delta, hiders, this.map);
      this.checkKills();
    } else {
      this.seeker.vx = 0;
      this.seeker.vy = 0;
      this.seeker.update(delta, this.map.walls);
    }

    const alive = this.getAliveHiders();
    if (this.phase === 'hunting' && alive.length <= 1) {
      this.phase = 'over';
      this.stop();
      const winner = alive[0] || null;
      this.callbacks.onGameOver({
        winnerId: winner?.id || null,
        winnerName: winner?.name || null,
        duration: (Date.now() - this.startTime) / 1000,
        standings: this.buildStandings(winner),
      });
      return;
    }

    for (const [playerId] of this.players) {
      const state = this.getStateForPlayer(playerId);
      if (state) this.callbacks.onStateUpdate(playerId, state);
    }
  }

  private checkKills() {
    for (const [, entity] of this.players) {
      if (entity.isDead) continue;
      const dist = Math.hypot(entity.x - this.seeker.x, entity.y - this.seeker.y);
      if (dist < PLAYER_RADIUS * 2) {
        entity.isDead = true;
        entity.deathTime = Date.now();
        this.deathOrder.push({
          id: entity.id,
          name: entity.name,
          time: (Date.now() - this.startTime) / 1000,
        });
        this.callbacks.onKill(entity.id, entity.name, entity.x, entity.y);
      }
    }
  }

  private getAliveHiders(): ServerEntity[] {
    return Array.from(this.players.values()).filter((e) => !e.isDead);
  }

  private buildStandings(winner: ServerEntity | null): GameOverData['standings'] {
    const standings: GameOverData['standings'] = [];
    if (winner) {
      standings.push({
        id: winner.id,
        name: winner.name,
        survivalTime: (Date.now() - this.startTime) / 1000,
      });
    }
    for (const death of [...this.deathOrder].reverse()) {
      standings.push({ id: death.id, name: death.name, survivalTime: death.time });
    }
    return standings;
  }

  getStateForPlayer(playerId: string): GameState | null {
    const player = this.players.get(playerId);
    if (!player) return null;

    const entities: GameState['entities'] = [player.serialize(true)];

    const seekerVisible = player.isDead || this.map.checkLineOfSight(player.x, player.y, this.seeker.x, this.seeker.y);
    entities.push(this.seeker.serialize(seekerVisible));

    for (const [id, entity] of this.players) {
      if (id === playerId) continue;
      const canSee = player.isDead || this.map.checkLineOfSight(player.x, player.y, entity.x, entity.y);
      entities.push(entity.serialize(canSee));
    }

    return {
      tick: this.tick,
      timer: Math.max(0, this.timer),
      phase: this.phase,
      entities,
      hidersAlive: this.getAliveHiders().length,
    };
  }

  getAlivePlayerIds(): string[] {
    return this.getAliveHiders().map((e) => e.id);
  }
}
