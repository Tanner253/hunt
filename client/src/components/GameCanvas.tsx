'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { drawGame, initMapRendering } from '@/lib/renderer';
import { GameState, EntityState, PlayerInput, GameOverData } from '@/shared/types';
import { MAP_DEFAULT, TICK_RATE } from '@/shared/constants';
import { HUD } from './HUD';
import { EmoteWheel } from './EmoteWheel';
import { KillFeed } from './KillFeed';
import { DeathScreen } from './DeathScreen';

interface Props {
  playerId: string;
  isSpectating?: boolean;
  onGameOver: (data: GameOverData) => void;
}

export function GameCanvas({ playerId, isSpectating, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{ current: GameState | null; previous: GameState | null; lastUpdate: number }>({
    current: null, previous: null, lastUpdate: 0,
  });
  const keysRef = useRef<Record<string, boolean>>({});
  const bloodRef = useRef<{ x: number; y: number; r: number }[]>([]);
  const cameraRef = useRef({ x: 0, y: 0 });
  const emotesRef = useRef<Map<string, string>>(new Map());
  const [showEmoteWheel, setShowEmoteWheel] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [entities, setEntities] = useState<EntityState[]>([]);
  const [isDead, setIsDead] = useState(false);

  useEffect(() => {
    initMapRendering(MAP_DEFAULT);
    const socket = getSocket();

    const onState = (state: GameState) => {
      stateRef.current.previous = stateRef.current.current;
      stateRef.current.current = state;
      stateRef.current.lastUpdate = performance.now();
      setGameState(state);
      setEntities(state.entities);

      const me = state.entities.find((e) => e.id === playerId);
      if (me?.isDead && !isDead) setIsDead(true);
    };
    const onKill = (data: { victimId: string; x: number; y: number }) => {
      for (let i = 0; i < 5; i++) {
        bloodRef.current.push({
          x: data.x + (Math.random() - 0.5) * 30,
          y: data.y + (Math.random() - 0.5) * 30,
          r: 5 + Math.random() * 10,
        });
      }
    };
    const onEmote = (data: { playerId: string; emoteId: string }) => {
      emotesRef.current.set(data.playerId, data.emoteId);
      setTimeout(() => emotesRef.current.delete(data.playerId), 3000);
    };

    socket.on('game:state', onState);
    socket.on('game:kill', onKill);
    socket.on('game:emote', onEmote);
    socket.on('game:over', onGameOver);

    return () => {
      socket.off('game:state', onState);
      socket.off('game:kill', onKill);
      socket.off('game:emote', onEmote);
      socket.off('game:over', onGameOver);
    };
  }, [onGameOver, playerId, isDead]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyE') setShowEmoteWheel((p) => !p);
    };
    const up = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    if (isSpectating) return;
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
      socket.emit('game:input', input);
    }, 1000 / TICK_RATE);
    return () => clearInterval(interval);
  }, [isSpectating]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const shadowCanvas = document.createElement('canvas');
    const shadowCtx = shadowCanvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      shadowCanvas.width = canvas.width;
      shadowCanvas.height = canvas.height;
    };
    resize();
    window.addEventListener('resize', resize);

    let running = true;
    const loop = () => {
      if (!running) return;
      const state = stateRef.current.current;
      if (state && minimapRef.current) {
        const ents = interpolate(stateRef.current.previous, state, stateRef.current.lastUpdate);
        const me = ents.find((e) => e.id === playerId);
        if (me) {
          cameraRef.current.x += (me.x - canvas.width / 2 - cameraRef.current.x) * 0.1;
          cameraRef.current.y += (me.y - canvas.height / 2 - cameraRef.current.y) * 0.1;
        }
        drawGame(
          ctx, shadowCanvas, shadowCtx,
          minimapRef.current, minimapRef.current.getContext('2d')!,
          cameraRef.current, ents, playerId,
          bloodRef.current, canvas.width, canvas.height,
          emotesRef.current,
        );
      }
      requestAnimationFrame(loop);
    };
    loop();

    return () => { running = false; window.removeEventListener('resize', resize); };
  }, [playerId]);

  const handleEmote = useCallback((emoteId: string) => {
    getSocket().emit('game:emote', emoteId);
    setShowEmoteWheel(false);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <canvas ref={canvasRef} className="block" />
      <canvas
        ref={minimapRef}
        className="absolute top-4 left-4 rounded-xl border border-gray-700 shadow-lg bg-gray-900/80 z-10"
        width={200}
        height={112}
      />
      <HUD gameState={gameState} />
      <KillFeed entities={entities} />
      <DeathScreen visible={isDead} />

      {isSpectating && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-8 py-3 rounded-2xl border border-gray-700/50 flex items-center gap-6 z-20">
          <button
            onClick={() => getSocket().emit('spectate:switch', 'prev')}
            className="text-white font-bold hover:text-blue-400 transition-colors text-lg"
          >
            &#8592; Prev
          </button>
          <div className="text-center">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">Spectating</span>
          </div>
          <button
            onClick={() => getSocket().emit('spectate:switch', 'next')}
            className="text-white font-bold hover:text-blue-400 transition-colors text-lg"
          >
            Next &#8594;
          </button>
        </div>
      )}
      {showEmoteWheel && <EmoteWheel onSelect={handleEmote} onClose={() => setShowEmoteWheel(false)} />}
    </div>
  );
}

function interpolate(prev: GameState | null, curr: GameState | null, lastUpdate: number): EntityState[] {
  if (!curr) return [];
  if (!prev) return curr.entities;
  const t = Math.min((performance.now() - lastUpdate) / (1000 / TICK_RATE), 1);
  return curr.entities.map((entity) => {
    const p = prev.entities.find((e) => e.id === entity.id);
    if (!p) return entity;
    return { ...entity, x: p.x + (entity.x - p.x) * t, y: p.y + (entity.y - p.y) * t };
  });
}
