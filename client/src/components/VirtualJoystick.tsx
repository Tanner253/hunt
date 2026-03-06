'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface VirtualJoystickProps {
  onInput: (dx: number, dy: number) => void;
}

export function VirtualJoystick({ onInput }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const RADIUS = 50;

  const handleStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect) return;
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setActive(true);
    updateKnob(touch.clientX, touch.clientY);
  }, []);

  const updateKnob = useCallback((cx: number, cy: number) => {
    const dx = cx - centerRef.current.x;
    const dy = cy - centerRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, RADIUS);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clamped;
    const ny = Math.sin(angle) * clamped;
    setKnobPos({ x: nx, y: ny });
    onInput(clamped > 5 ? nx / RADIUS : 0, clamped > 5 ? ny / RADIUS : 0);
  }, [onInput]);

  useEffect(() => {
    const handleMove = (e: TouchEvent) => {
      if (touchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchIdRef.current) {
          e.preventDefault();
          updateKnob(touch.clientX, touch.clientY);
          break;
        }
      }
    };
    const handleEnd = (e: TouchEvent) => {
      if (touchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null;
          setActive(false);
          setKnobPos({ x: 0, y: 0 });
          onInput(0, 0);
          break;
        }
      }
    };
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);
    return () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [onInput, updateKnob]);

  return (
    <div
      ref={baseRef}
      onTouchStart={handleStart}
      className="absolute bottom-8 left-8 z-30 touch-none select-none"
    >
      {/* Base ring */}
      <div
        className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-opacity ${
          active ? 'border-white/30 bg-white/5' : 'border-white/15 bg-white/[0.02]'
        }`}
      >
        {/* Knob */}
        <div
          className={`w-14 h-14 rounded-full transition-colors ${
            active ? 'bg-white/30' : 'bg-white/15'
          }`}
          style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
        />
      </div>
    </div>
  );
}
