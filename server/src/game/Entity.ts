import {
  TILE_SIZE,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  SEEKER_SPEED,
  SEEKER_VISION_RADIUS,
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
  colorId: string;
  role: 'seeker' | 'hider';
  name = '';
  facingLeft = false;
  isMoving = false;
  isDead = false;
  deathTime = 0;
  walkCycle = 0;
  pendingInput: PlayerInput | null = null;

  constructor(id: string, x: number, y: number, colorId: string, role: 'seeker' | 'hider') {
    this.id = id;
    this.x = x;
    this.y = y;
    this.colorId = colorId;
    this.role = role;
    this.speed = role === 'seeker' ? SEEKER_SPEED : PLAYER_SPEED;
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

  serialize(): EntityState {
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
    };
  }
}

export class SeekerBot extends ServerEntity {
  path: { x: number; y: number }[] = [];
  pathTimer = 0;
  seekState: 'patrol' | 'chase' = 'patrol';
  waitTimer = 0;

  constructor(id: string, x: number, y: number) {
    super(id, x, y, 'Seeker', 'seeker');
    this.name = 'The Seeker';
  }

  think(hiders: ServerEntity[], map: GameMap) {
    let closest: ServerEntity | null = null;
    let minDist = Infinity;

    for (const hider of hiders) {
      if (hider.isDead) continue;
      if (map.checkLineOfSight(this.x, this.y, hider.x, hider.y)) {
        const d = Math.hypot(hider.x - this.x, hider.y - this.y);
        if (d < minDist && d < SEEKER_VISION_RADIUS) {
          minDist = d;
          closest = hider;
        }
      }
    }

    if (closest) {
      this.seekState = 'chase';
      this.path = map.findPath(this.x, this.y, closest.x, closest.y) || [];
    } else {
      this.seekState = 'patrol';
      if (this.path.length === 0) {
        const dest = map.getRandomWalkablePos();
        this.path = map.findPath(this.x, this.y, dest.x, dest.y) || [];
      }
    }
  }

  updateAI(delta: number, hiders: ServerEntity[], map: GameMap) {
    if (this.isDead) return;

    this.waitTimer -= delta;
    this.pathTimer -= delta;

    if (this.waitTimer <= 0 && this.pathTimer <= 0) {
      this.pathTimer = 0.3 + Math.random() * 0.2;
      this.think(hiders, map);
    }

    if (this.path.length > 0) {
      const next = this.path[0];
      const tx = next.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = next.y * TILE_SIZE + TILE_SIZE / 2;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 10) {
        this.path.shift();
        if (this.path.length === 0) {
          this.vx = 0;
          this.vy = 0;
          this.waitTimer = this.seekState === 'chase' ? 0 : 1 + Math.random();
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
