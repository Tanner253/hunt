import { TILE_SIZE, VISION_RADIUS } from '../shared/constants';

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Segment {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
}

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export class GameMap {
  grid: number[][] = [];
  reachable: boolean[][] = [];
  walls: Wall[] = [];
  shadowSegments: Segment[] = [];
  cols: number;
  rows: number;
  mapWidth: number;
  mapHeight: number;

  constructor(mapGrid: string[]) {
    this.rows = mapGrid.length;
    this.cols = mapGrid[0].length;
    this.mapWidth = this.cols * TILE_SIZE;
    this.mapHeight = this.rows * TILE_SIZE;
    this.parse(mapGrid);
    this.computeReachable();
  }

  private parse(mapGrid: string[]) {
    const visited: boolean[][] = Array(this.rows)
      .fill(0)
      .map(() => Array(this.cols).fill(false));

    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x] = mapGrid[y][x] === '#' ? 1 : 0;
      }
    }

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x] === 1 && !visited[y][x]) {
          let w = 1;
          while (x + w < this.cols && this.grid[y][x + w] === 1 && !visited[y][x + w]) w++;
          let h = 1;
          let valid = true;
          while (y + h < this.rows && valid) {
            for (let i = 0; i < w; i++) {
              if (this.grid[y + h][x + i] !== 1 || visited[y + h][x + i]) {
                valid = false;
                break;
              }
            }
            if (valid) h++;
          }
          for (let i = 0; i < h; i++)
            for (let j = 0; j < w; j++) visited[y + i][x + j] = true;
          this.walls.push({ x: x * TILE_SIZE, y: y * TILE_SIZE, w: w * TILE_SIZE, h: h * TILE_SIZE });
        }
      }
    }

    this.buildShadowSegments();
  }

  private buildShadowSegments() {
    for (let y = 0; y <= this.rows; y++) {
      let cTop: { x1: number; y: number; x2: number } | null = null;
      let cBot: { x1: number; y: number; x2: number } | null = null;
      for (let x = 0; x <= this.cols; x++) {
        const isW = y < this.rows && x < this.cols && this.grid[y][x] === 1;
        const isWA = y > 0 && x < this.cols && this.grid[y - 1][x] === 1;
        if (isW && !isWA) {
          if (!cTop) cTop = { x1: x, y, x2: x + 1 };
          else cTop.x2 = x + 1;
        } else if (cTop) {
          this.shadowSegments.push({
            p1: { x: cTop.x1 * TILE_SIZE, y: cTop.y * TILE_SIZE },
            p2: { x: cTop.x2 * TILE_SIZE, y: cTop.y * TILE_SIZE },
          });
          cTop = null;
        }
        if (!isW && isWA) {
          if (!cBot) cBot = { x1: x, y, x2: x + 1 };
          else cBot.x2 = x + 1;
        } else if (cBot) {
          this.shadowSegments.push({
            p1: { x: cBot.x2 * TILE_SIZE, y: cBot.y * TILE_SIZE },
            p2: { x: cBot.x1 * TILE_SIZE, y: cBot.y * TILE_SIZE },
          });
          cBot = null;
        }
      }
    }

    for (let x = 0; x <= this.cols; x++) {
      let cL: { x: number; y1: number; y2: number } | null = null;
      let cR: { x: number; y1: number; y2: number } | null = null;
      for (let y = 0; y <= this.rows; y++) {
        const isW = y < this.rows && x < this.cols && this.grid[y][x] === 1;
        const isWL = y < this.rows && x > 0 && this.grid[y][x - 1] === 1;
        if (isW && !isWL) {
          if (!cL) cL = { x, y1: y, y2: y + 1 };
          else cL.y2 = y + 1;
        } else if (cL) {
          this.shadowSegments.push({
            p1: { x: cL.x * TILE_SIZE, y: cL.y2 * TILE_SIZE },
            p2: { x: cL.x * TILE_SIZE, y: cL.y1 * TILE_SIZE },
          });
          cL = null;
        }
        if (!isW && isWL) {
          if (!cR) cR = { x, y1: y, y2: y + 1 };
          else cR.y2 = y + 1;
        } else if (cR) {
          this.shadowSegments.push({
            p1: { x: cR.x * TILE_SIZE, y: cR.y1 * TILE_SIZE },
            p2: { x: cR.x * TILE_SIZE, y: cR.y2 * TILE_SIZE },
          });
          cR = null;
        }
      }
    }
  }

  private computeReachable() {
    this.reachable = Array(this.rows).fill(0).map(() => Array(this.cols).fill(false));

    const regions: { x: number; y: number }[][] = [];
    const visited: boolean[][] = Array(this.rows).fill(0).map(() => Array(this.cols).fill(false));
    const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x] === 1 || visited[y][x]) continue;
        const region: { x: number; y: number }[] = [];
        const stack = [{ x, y }];
        visited[y][x] = true;
        while (stack.length > 0) {
          const cell = stack.pop()!;
          region.push(cell);
          for (const d of dirs) {
            const nx = cell.x + d.x;
            const ny = cell.y + d.y;
            if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
            if (this.grid[ny][nx] === 1 || visited[ny][nx]) continue;
            visited[ny][nx] = true;
            stack.push({ x: nx, y: ny });
          }
        }
        regions.push(region);
      }
    }

    let largest = regions[0] || [];
    for (const r of regions) {
      if (r.length > largest.length) largest = r;
    }
    for (const cell of largest) {
      this.reachable[cell.y][cell.x] = true;
    }
  }

  checkLineOfSight(x1: number, y1: number, x2: number, y2: number, maxRange?: number): boolean {
    const range = maxRange ?? VISION_RADIUS;
    if (Math.hypot(x2 - x1, y2 - y1) > range) return false;
    for (const w of this.walls) {
      if (this.lineRectIntersect(x1, y1, x2, y2, w.x, w.y, w.w, w.h)) return false;
    }
    return true;
  }

  private lineRectIntersect(x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return (
      this.lineLine(x1, y1, x2, y2, rx, ry, rx, ry + rh) ||
      this.lineLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
      this.lineLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
      this.lineLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh) ||
      (x1 > rx && x1 < rx + rw && y1 > ry && y1 < ry + rh) ||
      (x2 > rx && x2 < rx + rw && y2 > ry && y2 < ry + rh)
    );
  }

  private lineLine(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;
    const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    return uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1;
  }

  findPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] | null {
    const sx = Math.floor(startX / TILE_SIZE);
    const sy = Math.floor(startY / TILE_SIZE);
    const ex = Math.floor(endX / TILE_SIZE);
    const ey = Math.floor(endY / TILE_SIZE);

    if (sx < 0 || sx >= this.cols || sy < 0 || sy >= this.rows) return null;
    if (ex < 0 || ex >= this.cols || ey < 0 || ey >= this.rows) return null;
    if (!this.reachable[ey][ex] || !this.reachable[sy][sx]) return null;

    const openList: PathNode[] = [];
    const closed = new Set<string>();
    const start: PathNode = { x: sx, y: sy, g: 0, h: Math.hypot(ex - sx, ey - sy), f: 0, parent: null };
    start.f = start.h;
    openList.push(start);

    const dirs = [
      { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
      { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
    ];

    let iters = 0;
    while (openList.length > 0 && iters < 2000) {
      iters++;
      let lowestIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[lowestIdx].f) lowestIdx = i;
      }
      const current = openList.splice(lowestIdx, 1)[0];

      if (current.x === ex && current.y === ey) {
        const path: { x: number; y: number }[] = [];
        let c: PathNode | null = current;
        while (c?.parent) {
          path.push({ x: c.x, y: c.y });
          c = c.parent;
        }
        return path.reverse();
      }

      closed.add(`${current.x},${current.y}`);
      for (const d of dirs) {
        const nx = current.x + d.x;
        const ny = current.y + d.y;
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows || this.grid[ny][nx] === 1) continue;
        if (Math.abs(d.x) === 1 && Math.abs(d.y) === 1) {
          if (this.grid[current.y][nx] === 1 || this.grid[ny][current.x] === 1) continue;
        }
        if (closed.has(`${nx},${ny}`)) continue;
        const g = current.g + (d.x !== 0 && d.y !== 0 ? 1.414 : 1);
        const existing = openList.find((n) => n.x === nx && n.y === ny);
        if (!existing) {
          const h = Math.hypot(ex - nx, ey - ny);
          openList.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
        } else if (g < existing.g) {
          existing.parent = current;
          existing.g = g;
          existing.f = g + existing.h;
        }
      }
    }
    return null;
  }

  getRandomWalkablePos(): { x: number; y: number } {
    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * this.cols);
      y = Math.floor(Math.random() * this.rows);
    } while (!this.reachable[y][x]);
    return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
  }
}
