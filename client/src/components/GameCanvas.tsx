'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { drawGame, initMapRendering, cleanupProjectileTrails } from '@/lib/renderer';
import { GameState, EntityState, PlayerInput, GameOverData, ChatMessage } from '@/shared/types';
import { TICK_RATE } from '@/shared/constants';
import { getMapById, MAP_POOL } from '@/shared/maps';
import { useMobile } from '@/lib/useMobile';
import { gameAudio } from '@/lib/audio';
import { HUD } from './HUD';
import { EmoteWheel } from './EmoteWheel';
import { KillFeed } from './KillFeed';
import { DeathScreen } from './DeathScreen';
import { MobileControls } from './MobileControls';
import { InGameChat } from './InGameChat';

interface Props {
  playerId: string;
  mapId?: string;
  isSpectating?: boolean;
  onGameOver: (data: GameOverData) => void;
}

export function GameCanvas({ playerId, mapId, isSpectating, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{ current: GameState | null; previous: GameState | null; lastUpdate: number }>({
    current: null, previous: null, lastUpdate: 0,
  });
  const keysRef = useRef<Record<string, boolean>>({});
  const joystickRef = useRef({ dx: 0, dy: 0 });
  const bloodRef = useRef<{ x: number; y: number; r: number }[]>([]);
  const cameraRef = useRef({ x: 0, y: 0 });
  const emotesRef = useRef<Map<string, string>>(new Map());
  const chatBubblesRef = useRef<Map<string, string>>(new Map());
  const lastPhaseRef = useRef<string>('');
  const lastHasItemRef = useRef(false);
  const footstepTimer = useRef(0);
  const [showEmoteWheel, setShowEmoteWheel] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isDead, setIsDead] = useState(false);
  const [stinkToast, setStinkToast] = useState<string | null>(null);
  const spectateTargetRef = useRef<string | null>(null);
  const [spectateName, setSpectateName] = useState<string | null>(null);
  const isMobile = useMobile();
  const chatOpenRef = useRef(false);
  const isDeadRef = useRef(false);

  useEffect(() => { chatOpenRef.current = showChat; }, [showChat]);

  useEffect(() => {
    const mapDef = mapId ? getMapById(mapId) : undefined;
    initMapRendering(mapDef?.grid || MAP_POOL[0].grid);
    gameAudio.init();
    const socket = getSocket();

    const onState = (state: GameState) => {
      stateRef.current.previous = stateRef.current.current;
      stateRef.current.current = state;
      stateRef.current.lastUpdate = performance.now();
      setGameState(state);

      const me = state.entities.find((e) => e.id === playerId);
      if (me?.isDead && !isDeadRef.current) {
        isDeadRef.current = true;
        setIsDead(true);
        gameAudio.playDeath();
        // Auto-spectate: pick first alive hider, or seeker
        const alive = state.entities.filter((e) => !e.isDead && e.id !== playerId);
        if (alive.length > 0) {
          spectateTargetRef.current = alive[0].id;
          setSpectateName(alive[0].name || alive[0].role);
        }
      }
      // Keep spectate target valid (if target died, switch)
      if (isDeadRef.current && spectateTargetRef.current) {
        const target = state.entities.find((e) => e.id === spectateTargetRef.current);
        if (!target || (target.isDead && target.role !== 'seeker')) {
          const alive = state.entities.filter((e) => !e.isDead || e.role === 'seeker');
          if (alive.length > 0) {
            spectateTargetRef.current = alive[0].id;
            setSpectateName(alive[0].name || alive[0].role);
          }
        }
      }

      // Switch music based on game phase
      const phaseKey = state.phase === 'hunting'
        ? (state.timer <= 0 ? 'overtime' : 'hunting')
        : state.phase;
      if (phaseKey !== lastPhaseRef.current && state.phase !== 'over') {
        lastPhaseRef.current = phaseKey;
        if (phaseKey === 'hiding') gameAudio.playTrack('hiding');
        else if (phaseKey === 'hunting') gameAudio.playTrack('hunting');
        else if (phaseKey === 'overtime') gameAudio.playTrack('overtime');
      }

      // Detect seeker proximity for chase music overlay
      if (me && !me.isDead && state.phase === 'hunting') {
        const seeker = state.entities.find((e) => e.role === 'seeker' && e.visible);
        if (seeker) {
          const dist = Math.hypot(seeker.x - me.x, seeker.y - me.y);
          if (dist < 400) gameAudio.playTrack('chase');
          else if (lastPhaseRef.current !== 'overtime') gameAudio.playTrack(state.timer <= 0 ? 'overtime' : 'hunting');
        }
      }

      if (me?.hasItem && !lastHasItemRef.current) gameAudio.playPowerUp();
      lastHasItemRef.current = !!me?.hasItem;
    };
    const onKill = (data: { victimId: string; x: number; y: number }) => {
      for (let i = 0; i < 5; i++) {
        bloodRef.current.push({
          x: data.x + (Math.random() - 0.5) * 30,
          y: data.y + (Math.random() - 0.5) * 30,
          r: 5 + Math.random() * 10,
        });
      }
      gameAudio.playDeath();
    };
    const onEmote = (data: { playerId: string; emoteId: string }) => {
      emotesRef.current.set(data.playerId, data.emoteId);
      setTimeout(() => emotesRef.current.delete(data.playerId), 3000);
      gameAudio.playEmote();
    };
    const onMarked = (data: { markerId: string; victimId: string; victimName: string }) => {
      gameAudio.playMarked();
      if (data.victimId === playerId) {
        setStinkToast('You\'ve been stink bombed! The Seeker can smell you!');
        setTimeout(() => setStinkToast(null), 4000);
      }
    };
    const onShieldBreak = (data: { playerId: string }) => {
      if (data.playerId === playerId) {
        setStinkToast('Your shield absorbed a hit!');
        setTimeout(() => setStinkToast(null), 3000);
      }
      gameAudio.playMarked();
    };
    const onChat = (msg: ChatMessage) => {
      chatBubblesRef.current.set(msg.senderId, msg.text);
      const text = msg.text;
      setTimeout(() => {
        if (chatBubblesRef.current.get(msg.senderId) === text) {
          chatBubblesRef.current.delete(msg.senderId);
        }
      }, 4000);
    };

    socket.on('game:state', onState);
    socket.on('game:kill', onKill);
    socket.on('game:emote', onEmote);
    socket.on('game:over', onGameOver);
    socket.on('game:marked', onMarked);
    socket.on('game:shield-break' as any, onShieldBreak);
    socket.on('lobby:chat', onChat);

    return () => {
      socket.off('game:state', onState);
      socket.off('game:kill', onKill);
      socket.off('game:emote', onEmote);
      socket.off('game:over', onGameOver);
      socket.off('game:marked', onMarked);
      socket.off('game:shield-break' as any, onShieldBreak);
      socket.off('lobby:chat', onChat);
      gameAudio.stopMusic();
    };
  }, [onGameOver, playerId, isDead, mapId]);

  const cycleSpectateTarget = useCallback((dir: 1 | -1) => {
    const state = stateRef.current.current;
    if (!state) return;
    const candidates = state.entities.filter((e) => (!e.isDead || e.role === 'seeker') && e.id !== playerId);
    if (candidates.length === 0) return;
    const curIdx = candidates.findIndex((e) => e.id === spectateTargetRef.current);
    const next = (curIdx + dir + candidates.length) % candidates.length;
    spectateTargetRef.current = candidates[next].id;
    setSpectateName(candidates[next].name || candidates[next].role);
  }, [playerId]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Enter') {
        e.preventDefault();
        if (!chatOpenRef.current) setShowChat(true);
        return;
      }
      if (e.code === 'Escape' && chatOpenRef.current) {
        e.preventDefault();
        setShowChat(false);
        return;
      }
      if (chatOpenRef.current) return;
      keysRef.current[e.code] = true;

      if (isDeadRef.current) {
        if (e.code === 'KeyE' || e.code === 'KeyQ') {
          cycleSpectateTarget(e.code === 'KeyE' ? 1 : -1);
          return;
        }
      } else {
        if (e.code === 'KeyE') setShowEmoteWheel((p) => !p);
        if (e.code === 'Space') {
          e.preventDefault();
          getSocket().emit('game:use-item');
          gameAudio.playStinkBomb();
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    if (isSpectating) return;
    const socket = getSocket();
    const interval = setInterval(() => {
      const k = keysRef.current;
      const j = joystickRef.current;
      const hasJoystick = Math.abs(j.dx) > 0.01 || Math.abs(j.dy) > 0.01;
      const input: PlayerInput = {
        up: hasJoystick ? j.dy < -0.3 : !!(k['KeyW'] || k['ArrowUp']),
        down: hasJoystick ? j.dy > 0.3 : !!(k['KeyS'] || k['ArrowDown']),
        left: hasJoystick ? j.dx < -0.3 : !!(k['KeyA'] || k['ArrowLeft']),
        right: hasJoystick ? j.dx > 0.3 : !!(k['KeyD'] || k['ArrowRight']),
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
        const viewId = (isDeadRef.current && spectateTargetRef.current) ? spectateTargetRef.current : playerId;
        const viewTarget = ents.find((e) => e.id === viewId) || ents.find((e) => e.id === playerId);
        if (viewTarget) {
          cameraRef.current.x += (viewTarget.x - canvas.width / 2 - cameraRef.current.x) * 0.1;
          cameraRef.current.y += (viewTarget.y - canvas.height / 2 - cameraRef.current.y) * 0.1;

          const now = performance.now();
          if (viewTarget.isMoving && !viewTarget.isDead && now - footstepTimer.current > 220) {
            footstepTimer.current = now;
            gameAudio.playFootstep();
          }
        }
        const projs = state.projectiles || [];
        cleanupProjectileTrails(new Set(projs.map((p) => p.id)));
        drawGame(
          ctx, shadowCanvas, shadowCtx,
          minimapRef.current, minimapRef.current.getContext('2d')!,
          cameraRef.current, ents, viewId,
          bloodRef.current, canvas.width, canvas.height,
          emotesRef.current,
          state.powerUps || [],
          chatBubblesRef.current,
          projs,
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

  const handleJoystick = useCallback((dx: number, dy: number) => {
    joystickRef.current = { dx, dy };
  }, []);

  const handleUseItem = useCallback(() => {
    getSocket().emit('game:use-item');
    gameAudio.playStinkBomb();
  }, []);

  const me = gameState?.entities.find((e) => e.id === playerId);
  const hasItem = me?.hasItem || null;
  const hasShield = me?.hasShield || false;
  const isBoosted = me?.isBoosted || false;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden touch-none"
      onTouchMove={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="block touch-none" />
      <canvas
        ref={minimapRef}
        className="absolute top-4 left-4 rounded-xl border border-gray-700 shadow-lg bg-gray-900/80 z-10"
        width={200}
        height={112}
      />
      <HUD gameState={gameState} hasItem={hasItem} hasShield={hasShield} isBoosted={isBoosted} />
      <KillFeed />
      <DeathScreen visible={isDead} />

      {isDead && spectateName && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-6 sm:px-8 py-3 rounded-2xl border border-gray-700/50 flex items-center gap-4 sm:gap-6 z-20">
          <button
            onClick={() => cycleSpectateTarget(-1)}
            className="text-white font-bold hover:text-blue-400 active:text-blue-400 transition-colors text-lg p-2"
          >
            {!isMobile && <kbd className="bg-gray-800 px-2 py-0.5 rounded text-xs mr-1 border border-gray-700">Q</kbd>}
            &#8592;
          </button>
          <div className="text-center">
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] block">Spectating</span>
            <span className="text-white font-bold text-sm">{spectateName}</span>
          </div>
          <button
            onClick={() => cycleSpectateTarget(1)}
            className="text-white font-bold hover:text-blue-400 active:text-blue-400 transition-colors text-lg p-2"
          >
            &#8594;
            {!isMobile && <kbd className="bg-gray-800 px-2 py-0.5 rounded text-xs ml-1 border border-gray-700">E</kbd>}
          </button>
        </div>
      )}

      {stinkToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce">
          <div className="bg-green-900/90 border-2 border-green-400 text-green-200 px-6 py-3 rounded-xl shadow-lg shadow-green-900/50 flex items-center gap-3 text-sm font-bold">
            <span className="text-2xl">{'\u{1F4A8}'}</span>
            {stinkToast}
            <span className="text-2xl">{'\u{1F4A8}'}</span>
          </div>
        </div>
      )}

      <InGameChat open={showChat} onClose={() => setShowChat(false)} />

      {isMobile && !isSpectating && !isDead && (
        <MobileControls
          onJoystickInput={handleJoystick}
          onEmotePress={() => setShowEmoteWheel((p) => !p)}
          onChatPress={() => setShowChat((p) => !p)}
          onUseItem={handleUseItem}
          hasItem={hasItem}
        />
      )}

      {isSpectating && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-6 sm:px-8 py-3 rounded-2xl border border-gray-700/50 flex items-center gap-4 sm:gap-6 z-20">
          <button
            onClick={() => getSocket().emit('spectate:switch', 'prev')}
            className="text-white font-bold hover:text-blue-400 active:text-blue-400 transition-colors text-lg p-2"
          >
            &#8592; Prev
          </button>
          <div className="text-center">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">Spectating</span>
          </div>
          <button
            onClick={() => getSocket().emit('spectate:switch', 'next')}
            className="text-white font-bold hover:text-blue-400 active:text-blue-400 transition-colors text-lg p-2"
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
