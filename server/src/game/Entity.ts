import {
  TILE_SIZE,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  SEEKER_SPEED,
  SEEKER_VISION_RADIUS,
  STINK_RANGE,
  SPEED_BOOST_MULTIPLIER,
  ItemType,
} from '../shared/constants';
import { EntityState, PlayerInput } from '../shared/types';
import { GameMap, Wall } from './Map';

export class ServerEntity {
  id: string;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  radius = PLAYER_RADIUS;
  speed: number;
  baseSpeed: number;
  colorId: string;
  role: 'seeker' | 'hider';
  name = '';
  facingLeft = false;
  isMoving = false;
  isDead = false;
  deathTime = 0;
  walkCycle = 0;
  pendingInput: PlayerInput | null = null;
  markedUntil = 0;
  heldItem: ItemType | null = null;
  shieldActive = false;
  speedBoostUntil = 0;

  constructor(id: string, x: number, y: number, colorId: string, role: 'seeker' | 'hider') {
    this.id = id;
    this.x = x;
    this.y = y;
    this.colorId = colorId;
    this.role = role;
    this.baseSpeed = role === 'seeker' ? SEEKER_SPEED : PLAYER_SPEED;
    this.speed = this.baseSpeed;
  }

  get isMarked(): boolean {
    return this.markedUntil > Date.now();
  }

  get isBoosted(): boolean {
    return this.speedBoostUntil > Date.now();
  }

  updateSpeed() {
    if (this.role === 'seeker') return;
    this.speed = this.isBoosted ? this.baseSpeed * SPEED_BOOST_MULTIPLIER : this.baseSpeed;
  }

  update(delta: number, walls: Wall[]) {
    if (this.isDead) return;
    this.isMoving = Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1;
    if (this.isMoving) {
      this.walkCycle += delta * 15;
      if (this.vx < -0.1) this.facingLeft = true;
      if (this.vx > 0.1) this.facingLeft = false;
    } else {
      this.walkCycle = 0;
    }
    this.moveAxis(this.vx * delta, 0, walls);
    this.moveAxis(0, this.vy * delta, walls);
  }

  private moveAxis(dx: number, dy: number, walls: Wall[]) {
    this.x += dx;
    this.y += dy;
    for (const w of walls) {
      const cX = Math.max(w.x, Math.min(this.x, w.x + w.w));
      const cY = Math.max(w.y, Math.min(this.y, w.y + w.h));
      const distX = this.x - cX;
      const distY = this.y - cY;
      let dist = Math.hypot(distX, distY);
      if (dist < this.radius) {
        const pen = this.radius - dist;
        if (dist === 0) dist = 1;
        this.x += (distX / dist) * pen;
        this.y += (distY / dist) * pen;
      }
    }
  }

  useStinkBomb(allHiders: ServerEntity[], map: GameMap): { target: ServerEntity; dx: number; dy: number } | null {
    if (this.isDead) return null;
    let closest: ServerEntity | null = null;
    let minDist = Infinity;
    for (const other of allHiders) {
      if (other.id === this.id || other.isDead) continue;
      const d = Math.hypot(other.x - this.x, other.y - this.y);
      if (d < STINK_RANGE && d < minDist && map.checkLineOfSight(this.x, this.y, other.x, other.y)) {
        minDist = d;
        closest = other;
      }
    }
    if (!closest) return null;
    const dx = closest.x - this.x;
    const dy = closest.y - this.y;
    const dist = Math.hypot(dx, dy);
    return { target: closest, dx: dx / dist, dy: dy / dist };
  }

  serialize(visible = true): EntityState {
    return {
      id: this.id,
      x: Math.round(this.x * 100) / 100,
      y: Math.round(this.y * 100) / 100,
      facingLeft: this.facingLeft,
      isMoving: this.isMoving,
      isDead: this.isDead,
      colorId: this.colorId,
      role: this.role,
      name: this.name,
      visible,
      isMarked: this.isMarked,
      hasItem: this.heldItem,
      hasShield: this.shieldActive,
      isBoosted: this.isBoosted,
    };
  }
}

export class SeekerBot extends ServerEntity {
  path: { x: number; y: number }[] = [];
  pathTimer = 0;
  seekState: 'patrol' | 'chase' | 'investigate' = 'patrol';
  waitTimer = 0;
  lastKnownTarget: { x: number; y: number } | null = null;
  investigateTimer = 0;
  currentTargetId: string | null = null;

  constructor(id: string, x: number, y: number) {
    super(id, x, y, 'Seeker', 'seeker');
    this.name = 'The Seeker';
  }

  think(hiders: ServerEntity[], map: GameMap, overtime = false) {
    let closest: ServerEntity | null = null;
    let minDist = Infinity;

    if (overtime) {
      for (const hider of hiders) {
        if (hider.isDead) continue;
        const d = Math.hypot(hider.x - this.x, hider.y - this.y);
        if (d < minDist) { minDist = d; closest = hider; }
      }
    } else {
      const markedTarget = hiders.find((h) => !h.isDead && h.isMarked);
      if (markedTarget) {
        closest = markedTarget;
        minDist = Math.hypot(markedTarget.x - this.x, markedTarget.y - this.y);
      } else {
        for (const hider of hiders) {
          if (hider.isDead) continue;
          const d = Math.hypot(hider.x - this.x, hider.y - this.y);
          if (d < SEEKER_VISION_RADIUS && map.checkLineOfSight(this.x, this.y, hider.x, hider.y, SEEKER_VISION_RADIUS)) {
            if (d < minDist) { minDist = d; closest = hider; }
          }
        }
      }
    }

    if (closest) {
      this.seekState = 'chase';
      this.currentTargetId = closest.id;
      this.lastKnownTarget = { x: closest.x, y: closest.y };
      this.path = map.findPath(this.x, this.y, closest.x, closest.y) || [];
      this.investigateTimer = 0;
    } else if (this.lastKnownTarget) {
      this.seekState = 'investigate';
      const distToLKP = Math.hypot(this.lastKnownTarget.x - this.x, this.lastKnownTarget.y - this.y);
      if (distToLKP < 80 || this.investigateTimer > 4) {
        this.lastKnownTarget = null;
        this.currentTargetId = null;
        this.seekState = 'patrol';
        this.investigateTimer = 0;
        this.path = [];
      } else if (this.path.length === 0) {
        this.path = map.findPath(this.x, this.y, this.lastKnownTarget.x, this.lastKnownTarget.y) || [];
      }
    } else {
      this.seekState = 'patrol';
      if (this.path.length === 0) {
        const dest = map.getRandomWalkablePos();
        this.path = map.findPath(this.x, this.y, dest.x, dest.y) || [];
      }
    }
  }

  private updateOvertimeAI(delta: number, hiders: ServerEntity[]) {
    let closest: ServerEntity | null = null;
    let minDist = Infinity;
    for (const h of hiders) {
      if (h.isDead) continue;
      const d = Math.hypot(h.x - this.x, h.y - this.y);
      if (d < minDist) { minDist = d; closest = h; }
    }
    if (!closest) { this.vx = 0; this.vy = 0; return; }

    const dx = closest.x - this.x;
    const dy = closest.y - this.y;
    if (minDist > 1) {
      this.vx = (dx / minDist) * this.speed;
      this.vy = (dy / minDist) * this.speed;
    }

    this.isMoving = true;
    if (this.vx < -0.1) this.facingLeft = true;
    if (this.vx > 0.1) this.facingLeft = false;
    this.walkCycle += delta * 15;
    this.x += this.vx * delta;
    this.y += this.vy * delta;
  }

  updateAI(delta: number, hiders: ServerEntity[], map: GameMap, overtime = false) {
    if (this.isDead) return;

    if (overtime) {
      this.updateOvertimeAI(delta, hiders);
      return;
    }

    this.waitTimer -= delta;
    this.pathTimer -= delta;

    if (this.seekState === 'investigate') {
      this.investigateTimer += delta;
    }

    const rethinkInterval = this.seekState === 'chase' ? 0.15 : this.seekState === 'investigate' ? 0.25 : 0.5;
    if (this.waitTimer <= 0 && this.pathTimer <= 0) {
      this.pathTimer = rethinkInterval;
      this.think(hiders, map);
    }

    const arrivalThreshold = Math.max(10, this.speed * delta * 1.5);

    if (this.path.length > 0) {
      const next = this.path[0];
      const tx = next.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = next.y * TILE_SIZE + TILE_SIZE / 2;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < arrivalThreshold) {
        this.path.shift();
        if (this.path.length === 0) {
          this.vx = 0;
          this.vy = 0;
          if (this.seekState === 'patrol') {
            this.waitTimer = 0.3 + Math.random() * 0.5;
          }
        }
      } else {
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
      }
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    this.update(delta, map.walls);
  }
}
