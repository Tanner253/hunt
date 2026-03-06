import { TILE_SIZE, VISION_RADIUS, COLORS, EMOTES } from '@/shared/constants';
import { EntityState, PowerUpState } from '@/shared/types';

interface Wall { x: number; y: number; w: number; h: number }
interface Segment { p1: { x: number; y: number }; p2: { x: number; y: number } }

let walls: Wall[] = [];
let shadowSegments: Segment[] = [];
let grid: number[][] = [];
let mapWidth = 0;
let mapHeight = 0;

export function initMapRendering(mapGrid: string[]) {
  const rows = mapGrid.length;
  const cols = mapGrid[0].length;
  mapWidth = cols * TILE_SIZE;
  mapHeight = rows * TILE_SIZE;
  walls = [];
  shadowSegments = [];
  grid = [];

  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) grid[y][x] = mapGrid[y][x] === '#' ? 1 : 0;
  }

  const visited: boolean[][] = Array(rows).fill(0).map(() => Array(cols).fill(false));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === 1 && !visited[y][x]) {
        let w = 1;
        while (x + w < cols && grid[y][x + w] === 1 && !visited[y][x + w]) w++;
        let h = 1;
        let valid = true;
        while (y + h < rows && valid) {
          for (let i = 0; i < w; i++) {
            if (grid[y + h][x + i] !== 1 || visited[y + h][x + i]) { valid = false; break; }
          }
          if (valid) h++;
        }
        for (let i = 0; i < h; i++)
          for (let j = 0; j < w; j++) visited[y + i][x + j] = true;
        walls.push({ x: x * TILE_SIZE, y: y * TILE_SIZE, w: w * TILE_SIZE, h: h * TILE_SIZE });
      }
    }
  }

  buildShadowSegments(rows, cols);
}

function buildShadowSegments(rows: number, cols: number) {
  for (let y = 0; y <= rows; y++) {
    let cT: { x1: number; y: number; x2: number } | null = null;
    let cB: { x1: number; y: number; x2: number } | null = null;
    for (let x = 0; x <= cols; x++) {
      const isW = y < rows && x < cols && grid[y][x] === 1;
      const isA = y > 0 && x < cols && grid[y - 1][x] === 1;
      if (isW && !isA) { if (!cT) cT = { x1: x, y, x2: x + 1 }; else cT.x2 = x + 1; }
      else if (cT) { shadowSegments.push({ p1: { x: cT.x1 * TILE_SIZE, y: cT.y * TILE_SIZE }, p2: { x: cT.x2 * TILE_SIZE, y: cT.y * TILE_SIZE } }); cT = null; }
      if (!isW && isA) { if (!cB) cB = { x1: x, y, x2: x + 1 }; else cB.x2 = x + 1; }
      else if (cB) { shadowSegments.push({ p1: { x: cB.x2 * TILE_SIZE, y: cB.y * TILE_SIZE }, p2: { x: cB.x1 * TILE_SIZE, y: cB.y * TILE_SIZE } }); cB = null; }
    }
  }
  for (let x = 0; x <= cols; x++) {
    let cL: { x: number; y1: number; y2: number } | null = null;
    let cR: { x: number; y1: number; y2: number } | null = null;
    for (let y = 0; y <= rows; y++) {
      const isW = y < rows && x < cols && grid[y][x] === 1;
      const isL = y < rows && x > 0 && grid[y][x - 1] === 1;
      if (isW && !isL) { if (!cL) cL = { x, y1: y, y2: y + 1 }; else cL.y2 = y + 1; }
      else if (cL) { shadowSegments.push({ p1: { x: cL.x * TILE_SIZE, y: cL.y2 * TILE_SIZE }, p2: { x: cL.x * TILE_SIZE, y: cL.y1 * TILE_SIZE } }); cL = null; }
      if (!isW && isL) { if (!cR) cR = { x, y1: y, y2: y + 1 }; else cR.y2 = y + 1; }
      else if (cR) { shadowSegments.push({ p1: { x: cR.x * TILE_SIZE, y: cR.y1 * TILE_SIZE }, p2: { x: cR.x * TILE_SIZE, y: cR.y2 * TILE_SIZE } }); cR = null; }
    }
  }
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  shadowCanvas: HTMLCanvasElement,
  shadowCtx: CanvasRenderingContext2D,
  minimapCanvas: HTMLCanvasElement,
  minimapCtx: CanvasRenderingContext2D,
  camera: { x: number; y: number },
  entities: EntityState[],
  playerId: string,
  bloodDecals: { x: number; y: number; r: number }[],
  W: number, H: number,
  activeEmotes: Map<string, string>,
  powerUps: PowerUpState[],
) {
  const player = entities.find(e => e.id === playerId);
  if (!player) return;

  ctx.fillStyle = '#1A1E24';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  ctx.strokeStyle = '#22272E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const sx = Math.floor(camera.x / TILE_SIZE) * TILE_SIZE;
  const sy = Math.floor(camera.y / TILE_SIZE) * TILE_SIZE;
  for (let x = sx; x < camera.x + W; x += TILE_SIZE) { ctx.moveTo(x, camera.y); ctx.lineTo(x, camera.y + H); }
  for (let y = sy; y < camera.y + H; y += TILE_SIZE) { ctx.moveTo(camera.x, y); ctx.lineTo(camera.x + W, y); }
  ctx.stroke();

  ctx.fillStyle = '#8B0000';
  for (const b of bloodDecals) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }

  for (const pu of powerUps) drawPowerUp(ctx, pu);

  const visibleEntities = entities.filter(e => e.visible);
  const sorted = [...visibleEntities].sort((a, b) => a.y - b.y);
  for (const e of sorted) drawEntity(ctx, e, activeEmotes.get(e.id));

  for (const w of walls) {
    if (w.x + w.w < camera.x || w.x > camera.x + W || w.y + w.h < camera.y || w.y > camera.y + H) continue;
    ctx.fillStyle = '#2A2F3D';
    ctx.strokeStyle = '#4A5568';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.rect(w.x, w.y, w.w, w.h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3A4153';
    ctx.fillRect(w.x, w.y, w.w, 10);
  }
  ctx.restore();

  drawShadows(shadowCtx, shadowCanvas, camera, player, W, H);
  ctx.drawImage(shadowCanvas, 0, 0);

  const vg = ctx.createRadialGradient(W / 2, H / 2, H / 3, W / 2, H / 2, H);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  drawMinimap(minimapCtx, minimapCanvas, entities, player);
}

function drawShadows(
  sCtx: CanvasRenderingContext2D, sCanvas: HTMLCanvasElement,
  camera: { x: number; y: number }, player: EntityState, W: number, H: number,
) {
  sCtx.clearRect(0, 0, W, H);
  sCtx.fillStyle = 'rgba(0,5,15,0.98)';
  sCtx.fillRect(0, 0, W, H);
  const cx = player.x - camera.x;
  const cy = player.y - camera.y;
  sCtx.globalCompositeOperation = 'destination-out';
  const grad = sCtx.createRadialGradient(cx, cy, 0, cx, cy, VISION_RADIUS);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.7, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.beginPath();
  sCtx.arc(cx, cy, VISION_RADIUS, 0, Math.PI * 2);
  sCtx.fill();

  sCtx.globalCompositeOperation = 'source-over';
  sCtx.fillStyle = 'rgba(0,5,15,0.98)';
  for (const seg of shadowSegments) {
    const minX = Math.min(seg.p1.x, seg.p2.x);
    const maxX = Math.max(seg.p1.x, seg.p2.x);
    const minY = Math.min(seg.p1.y, seg.p2.y);
    const maxY = Math.max(seg.p1.y, seg.p2.y);
    if (maxX < camera.x - VISION_RADIUS || minX > camera.x + W + VISION_RADIUS ||
        maxY < camera.y - VISION_RADIUS || minY > camera.y + H + VISION_RADIUS) continue;
    const dx = seg.p2.x - seg.p1.x, dy = seg.p2.y - seg.p1.y;
    const nx = -dy, ny = dx;
    const midX = (seg.p1.x + seg.p2.x) / 2, midY = (seg.p1.y + seg.p2.y) / 2;
    if (nx * (midX - player.x) + ny * (midY - player.y) >= 0) continue;

    let sp1x = seg.p1.x - camera.x, sp1y = seg.p1.y - camera.y;
    let sp2x = seg.p2.x - camera.x, sp2y = seg.p2.y - camera.y;
    const splx = player.x - camera.x, sply = player.y - camera.y;
    const ep1x = sp1x + (sp1x - splx) * 50, ep1y = sp1y + (sp1y - sply) * 50;
    const ep2x = sp2x + (sp2x - splx) * 50, ep2y = sp2y + (sp2y - sply) * 50;
    const pdx = sp2x - sp1x, pdy = sp2y - sp1y;
    const pLen = Math.hypot(pdx, pdy);
    if (pLen > 0) { const px = pdx / pLen, py = pdy / pLen; sp1x -= px; sp1y -= py; sp2x += px; sp2y += py; }

    sCtx.beginPath();
    sCtx.moveTo(sp1x, sp1y);
    sCtx.lineTo(sp2x, sp2y);
    sCtx.lineTo(ep2x, ep2y);
    sCtx.lineTo(ep1x, ep1y);
    sCtx.fill();
  }
}

function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUpState) {
  ctx.save();
  ctx.translate(pu.x, pu.y);
  const pulse = 0.8 + Math.sin(Date.now() / 300) * 0.2;
  const r = 14 * pulse;

  ctx.shadowColor = '#22CC44';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#22CC44';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u{1F4A8}', 0, 0);
  ctx.restore();
}

const PR = 20;

function drawEntity(ctx: CanvasRenderingContext2D, e: EntityState, emoteId?: string) {
  if (e.isDead) return;
  const colors = COLORS[e.colorId] || COLORS['Blue'];
  ctx.save();
  ctx.translate(e.x, e.y);
  const bob = e.isMoving ? Math.abs(Math.sin(Date.now() / 67)) * 4 : 0;
  ctx.translate(0, -bob);
  if (e.facingLeft) ctx.scale(-1, 1);

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, bob + PR - 2, PR, PR / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.shadow;
  ctx.beginPath();
  ctx.roundRect(-PR - 6, -PR / 2, 12, PR + 5, 6);
  ctx.fill();

  ctx.fillStyle = colors.primary;
  ctx.beginPath();
  ctx.roundRect(-PR + 2, -PR, PR * 2 - 4, PR * 2, PR);
  ctx.fill();

  ctx.fillStyle = colors.shadow;
  ctx.beginPath();
  ctx.roundRect(-PR + 2, 0, PR * 2 - 4, PR, [0, 0, PR, PR]);
  ctx.fill();

  ctx.fillStyle = '#223847';
  ctx.beginPath();
  ctx.roundRect(4, -PR / 2 - 2, 18, 14, 7);
  ctx.fill();
  ctx.fillStyle = colors.visor;
  ctx.beginPath();
  ctx.roundRect(6, -PR / 2, 14, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(14, -PR / 2 + 3, 4, 2, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  if (e.facingLeft) ctx.scale(-1, 1);

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  const name = e.name || e.colorId;
  const tw = ctx.measureText(name).width;
  ctx.fillRect(-tw / 2 - 4, -PR - 22, tw + 8, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, 0, -PR - 10);

  if (e.isMarked) {
    const t = Date.now() / 400;
    ctx.globalAlpha = 0.3 + Math.sin(t) * 0.15;
    ctx.fillStyle = '#44DD22';
    for (let i = 0; i < 5; i++) {
      const angle = t + i * (Math.PI * 2 / 5);
      const ox = Math.cos(angle) * 22;
      const oy = Math.sin(angle) * 16 - 5;
      ctx.beginPath();
      ctx.arc(ox, oy, 8 + Math.sin(t + i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (e.hasItem) {
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u{1F4A8}', PR + 12, -PR + 4);
  }

  if (emoteId) {
    const emote = EMOTES.find(em => em.id === emoteId);
    if (emote) {
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(emote.emoji, 0, -PR - 30);
    }
  }
  ctx.restore();
}

function drawMinimap(
  mCtx: CanvasRenderingContext2D, mCanvas: HTMLCanvasElement,
  entities: EntityState[], player: EntityState,
) {
  mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
  const sx = mCanvas.width / mapWidth;
  const sy = mCanvas.height / mapHeight;
  mCtx.fillStyle = 'rgba(74,85,104,0.7)';
  for (const w of walls) mCtx.fillRect(w.x * sx, w.y * sy, w.w * sx, w.h * sy);
  mCtx.fillStyle = 'rgba(255,255,255,0.1)';
  mCtx.beginPath();
  mCtx.arc(player.x * sx, player.y * sy, VISION_RADIUS * sx, 0, Math.PI * 2);
  mCtx.fill();

  for (const e of entities) {
    if (e.isDead) continue;
    if (e.id === player.id) {
      mCtx.fillStyle = '#3B82F6';
    } else if (e.role === 'seeker') {
      mCtx.fillStyle = e.visible ? '#EF4444' : 'rgba(239,68,68,0.3)';
    } else {
      mCtx.fillStyle = e.visible ? '#10B981' : 'rgba(16,185,129,0.35)';
    }
    const dotSize = e.id === player.id ? 4 : e.visible ? 3 : 2;
    mCtx.beginPath();
    mCtx.arc(e.x * sx, e.y * sy, dotSize, 0, Math.PI * 2);
    mCtx.fill();
  }
}
