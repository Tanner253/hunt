'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { LobbyArenaState, PlayerInput } from '@/shared/types';
import { COLORS, LOBBY_ARENA_W, LOBBY_ARENA_H } from '@/shared/constants';
import { useMobile } from '@/lib/useMobile';
import { gameAudio } from '@/lib/audio';

interface LobbyPlaygroundProps {
  playerId: string;
}

export function LobbyPlayground({ playerId }: LobbyPlaygroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arenaRef = useRef<LobbyArenaState>({ players: [], coins: [] });
  const keysRef = useRef<Record<string, boolean>>({});
  const lastScoreRef = useRef(0);
  const isMobile = useMobile();

  useEffect(() => {
    const socket = getSocket();
    const handler = (state: LobbyArenaState) => {
      const me = state.players.find((p) => p.id === playerId);
      if (me && me.score > lastScoreRef.current) {
        gameAudio.playCoinCollect();
      }
      lastScoreRef.current = me?.score || 0;
      arenaRef.current = state;
    };
    socket.on('lobby:positions', handler);
    return () => { socket.off('lobby:positions', handler); };
  }, [playerId]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        keysRef.current[e.code] = true;
      }
    };
    const up = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const interval = setInterval(() => {
      const k = keysRef.current;
      const input: PlayerInput = {
        up: !!(k['KeyW'] || k['ArrowUp']),
        down: !!(k['KeyS'] || k['ArrowDown']),
        left: !!(k['KeyA'] || k['ArrowLeft']),
        right: !!(k['KeyD'] || k['ArrowRight']),
        seq: Date.now(),
      };
      socket.emit('lobby:move', input);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const loop = () => {
      if (!running) return;
      const W = canvas.width;
      const H = canvas.height;
      const sx = W / LOBBY_ARENA_W;
      const sy = H / LOBBY_ARENA_H;
      const arena = arenaRef.current;

      ctx.fillStyle = '#111318';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = '#1E2230';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < LOBBY_ARENA_W; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x * sx, 0);
        ctx.lineTo(x * sx, H);
        ctx.stroke();
      }
      for (let y = 0; y < LOBBY_ARENA_H; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y * sy);
        ctx.lineTo(W, y * sy);
        ctx.stroke();
      }

      ctx.strokeStyle = '#2A3040';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, H - 2);

      for (const coin of arena.coins) {
        drawCoin(ctx, coin.x * sx, coin.y * sy);
      }

      for (const p of arena.players) {
        drawMiniChar(ctx, p.x * sx, p.y * sy, p, p.id === playerId);
      }

      drawScoreboard(ctx, arena.players, playerId, W);

      requestAnimationFrame(loop);
    };
    loop();
    return () => { running = false; };
  }, [playerId]);

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Lobby Arena</h3>
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 text-xs font-bold">Collect coins while you wait!</span>
          {!isMobile && (
            <span className="text-gray-600 text-xs">
              <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 text-[10px] font-mono">WASD</kbd> to move
            </span>
          )}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full"
      />
    </div>
  );
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const t = Date.now() / 400;
  const pulse = 0.85 + Math.sin(t + x * 0.01) * 0.15;
  const bob = Math.sin(t + y * 0.02) * 3;
  const r = 9 * pulse;

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = 'rgba(255,215,0,0.15)';
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#DAA520';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${Math.round(r)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 0);

  ctx.restore();
}

function drawMiniChar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  p: { colorId: string; name: string; facingLeft: boolean; isMoving: boolean; id: string; score: number },
  isMe: boolean,
) {
  const colors = COLORS[p.colorId] || COLORS['Blue'];
  ctx.save();
  ctx.translate(x, y);

  const bob = p.isMoving ? Math.abs(Math.sin(Date.now() / 80)) * 3 : 0;
  ctx.translate(0, -bob);
  if (p.facingLeft) ctx.scale(-1, 1);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, bob + 12, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.primary;
  ctx.beginPath();
  ctx.roundRect(-10, -12, 20, 24, 10);
  ctx.fill();

  ctx.fillStyle = colors.shadow;
  ctx.beginPath();
  ctx.roundRect(-10, 2, 20, 10, [0, 0, 10, 10]);
  ctx.fill();

  ctx.fillStyle = '#223847';
  ctx.beginPath();
  ctx.roundRect(2, -6, 12, 9, 4);
  ctx.fill();
  ctx.fillStyle = colors.visor;
  ctx.beginPath();
  ctx.roundRect(3, -5, 10, 7, 3);
  ctx.fill();

  if (p.facingLeft) ctx.scale(-1, 1);

  ctx.fillStyle = isMe ? '#3B82F6' : 'rgba(255,255,255,0.8)';
  ctx.font = `bold ${isMe ? 11 : 10}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(p.name, 0, -20);

  if (p.score > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`${p.score}`, 0, -30);
  }

  ctx.restore();
}

function drawScoreboard(
  ctx: CanvasRenderingContext2D,
  players: { name: string; score: number; colorId: string; id: string }[],
  playerId: string,
  canvasW: number,
) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  if (sorted.length === 0 || sorted[0].score === 0) return;

  const top3 = sorted.slice(0, 3);
  const x = canvasW - 8;
  let y = 14;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(x - 90, 4, 86, top3.length * 16 + 8, 6);
  ctx.fill();

  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'right';

  for (let i = 0; i < top3.length; i++) {
    const p = top3[i];
    const medal = i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : '\u{1F949}';
    const colors = COLORS[p.colorId] || COLORS['Blue'];

    ctx.fillStyle = p.id === playerId ? '#3B82F6' : colors.primary;
    ctx.textAlign = 'left';
    ctx.fillText(`${medal} ${p.name}`, x - 82, y);

    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'right';
    ctx.fillText(`${p.score}`, x - 8, y);

    y += 16;
  }
}
