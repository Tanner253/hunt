import { v4 as uuid } from 'uuid';
import { GameMap } from './Map';
import { ServerEntity, SeekerBot } from './Entity';
import { GameState, PlayerInput, GameOverData, EmoteEvent, PowerUpState } from '../shared/types';
import {
  TICK_RATE,
  ROUND_TIME,
  HIDE_TIME,
  PLAYER_SPEED,
  PLAYER_RADIUS,
  SEEKER_BOOST_SPEED,
  STINK_DURATION,
  STINK_PROJECTILE_SPEED,
  STINK_PROJECTILE_RADIUS,
  SPEED_BOOST_DURATION,
  POWERUP_SPAWN_INTERVAL,
  POWERUP_PICKUP_RADIUS,
  POWERUP_MAX_ON_MAP,
  MAP_DEFAULT,
  ItemType,
} from '../shared/constants';

export interface GameEventCallbacks {
  onStateUpdate: (playerId: string, state: GameState) => void;
  onGameOver: (data: GameOverData) => void;
  onKill: (victimId: string, victimName: string, x: number, y: number) => void;
  onMarked: (markerId: string, victimId: string, victimName: string) => void;
  onShieldBreak?: (playerId: string) => void;
}

interface PowerUp {
  id: string;
  x: number;
  y: number;
  itemType: ItemType;
}

const ITEM_TYPES: ItemType[] = ['stink', 'speed', 'shield'];

interface StinkProjectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  life: number;
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
  powerUps: PowerUp[] = [];
  powerUpSpawnTimer = POWERUP_SPAWN_INTERVAL;
  projectiles: StinkProjectile[] = [];

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

  useItem(playerId: string) {
    const player = this.players.get(playerId);
    if (!player || player.isDead || !player.heldItem) return;
    const itemType = player.heldItem;

    if (itemType === 'stink') {
      const hiders = Array.from(this.players.values());
      const result = player.useStinkBomb(hiders, this.map);
      if (result) {
        player.heldItem = null;
        this.projectiles.push({
          id: uuid(),
          x: player.x,
          y: player.y,
          vx: result.dx * STINK_PROJECTILE_SPEED,
          vy: result.dy * STINK_PROJECTILE_SPEED,
          ownerId: playerId,
          life: 1.5,
        });
      }
    } else if (itemType === 'speed') {
      player.heldItem = null;
      player.speedBoostUntil = Date.now() + SPEED_BOOST_DURATION * 1000;
    } else if (itemType === 'shield') {
      player.heldItem = null;
      player.shieldActive = true;
    }
  }

  private updateProjectiles(delta: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const tileX = Math.floor(p.x / 60);
      const tileY = Math.floor(p.y / 60);
      if (tileX < 0 || tileY < 0 || tileX >= this.map.cols || tileY >= this.map.rows || this.map.grid[tileY]?.[tileX] === 1) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (const [, entity] of this.players) {
        if (entity.isDead || entity.id === p.ownerId) continue;
        if (Math.hypot(entity.x - p.x, entity.y - p.y) < PLAYER_RADIUS + STINK_PROJECTILE_RADIUS) {
          entity.markedUntil = Date.now() + STINK_DURATION * 1000;
          this.callbacks.onMarked(p.ownerId, entity.id, entity.name);
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
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
      entity.updateSpeed();
      const moveSpeed = entity.speed;
      const input = entity.pendingInput;
      if (input) {
        entity.vx = 0;
        entity.vy = 0;
        if (input.up) entity.vy = -moveSpeed;
        if (input.down) entity.vy = moveSpeed;
        if (input.left) entity.vx = -moveSpeed;
        if (input.right) entity.vx = moveSpeed;
        if (entity.vx !== 0 && entity.vy !== 0) {
          const len = Math.hypot(entity.vx, entity.vy);
          entity.vx = (entity.vx / len) * moveSpeed;
          entity.vy = (entity.vy / len) * moveSpeed;
        }
      } else {
        entity.vx = 0;
        entity.vy = 0;
      }
      entity.update(delta, this.map.walls);
    }

    if (this.phase === 'hunting') {
      const isOvertime = this.timer <= 0;
      if (isOvertime) this.seeker.speed = SEEKER_BOOST_SPEED;
      this.updatePowerUps(delta);
      this.updateProjectiles(delta);
      const hiders = Array.from(this.players.values());
      this.seeker.updateAI(delta, hiders, this.map, isOvertime);
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

  private updatePowerUps(delta: number) {
    this.powerUpSpawnTimer -= delta;
    if (this.powerUpSpawnTimer <= 0 && this.powerUps.length < POWERUP_MAX_ON_MAP) {
      const pos = this.map.getRandomWalkablePos();
      const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
      this.powerUps.push({ id: uuid(), x: pos.x, y: pos.y, itemType });
      this.powerUpSpawnTimer = POWERUP_SPAWN_INTERVAL;
    }

    for (const [, entity] of this.players) {
      if (entity.isDead || entity.heldItem) continue;
      for (let i = this.powerUps.length - 1; i >= 0; i--) {
        const pu = this.powerUps[i];
        if (Math.hypot(entity.x - pu.x, entity.y - pu.y) < POWERUP_PICKUP_RADIUS) {
          entity.heldItem = pu.itemType;
          this.powerUps.splice(i, 1);
          break;
        }
      }
    }
  }

  private checkKills() {
    for (const [, entity] of this.players) {
      if (entity.isDead) continue;
      const dist = Math.hypot(entity.x - this.seeker.x, entity.y - this.seeker.y);
      if (dist < PLAYER_RADIUS * 2) {
        if (entity.shieldActive) {
          entity.shieldActive = false;
          this.callbacks.onShieldBreak?.(entity.id);
          continue;
        }
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
      powerUps: this.powerUps.map((p) => ({ id: p.id, x: p.x, y: p.y, itemType: p.itemType })),
      projectiles: this.projectiles.map((p) => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y) })),
    };
  }

  getAlivePlayerIds(): string[] {
    return this.getAliveHiders().map((e) => e.id);
  }
}
