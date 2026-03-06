'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { LobbyPositionState, PlayerInput } from '@/shared/types';
import { COLORS, LOBBY_ARENA_W, LOBBY_ARENA_H } from '@/shared/constants';
import { useMobile } from '@/lib/useMobile';

interface LobbyPlaygroundProps {
  playerId: string;
}

export function LobbyPlayground({ playerId }: LobbyPlaygroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const positionsRef = useRef<LobbyPositionState[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const isMobile = useMobile();

  useEffect(() => {
    const socket = getSocket();
    const handler = (positions: LobbyPositionState[]) => {
      positionsRef.current = positions;
    };
    socket.on('lobby:positions', handler);
    return () => { socket.off('lobby:positions', handler); };
  }, []);

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
      if (input.up || input.down || input.left || input.right) {
        socket.emit('lobby:move', input);
      } else {
        socket.emit('lobby:move', { up: false, down: false, left: false, right: false, seq: Date.now() });
      }
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
      const scaleX = W / LOBBY_ARENA_W;
      const scaleY = H / LOBBY_ARENA_H;

      ctx.fillStyle = '#111318';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = '#1E2230';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < LOBBY_ARENA_W; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x * scaleX, 0);
        ctx.lineTo(x * scaleX, H);
        ctx.stroke();
      }
      for (let y = 0; y < LOBBY_ARENA_H; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y * scaleY);
        ctx.lineTo(W, y * scaleY);
        ctx.stroke();
      }

      ctx.strokeStyle = '#2A3040';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, H - 2);

      for (const p of positionsRef.current) {
        drawMiniChar(ctx, p.x * scaleX, p.y * scaleY, p, p.id === playerId);
      }

      requestAnimationFrame(loop);
    };
    loop();
    return () => { running = false; };
  }, [playerId]);

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Lobby Arena</h3>
        {!isMobile && (
          <span className="text-gray-600 text-xs">
            <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 text-[10px] font-mono">WASD</kbd> to move
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

function drawMiniChar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  p: LobbyPositionState,
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

  ctx.restore();
}
