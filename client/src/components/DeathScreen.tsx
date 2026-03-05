'use client';

import { useState, useEffect } from 'react';

interface DeathScreenProps {
  visible: boolean;
}

export function DeathScreen({ visible }: DeathScreenProps) {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<'shake' | 'text' | 'fade'>('shake');

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }
    setShow(true);
    setPhase('shake');
    const t1 = setTimeout(() => setPhase('text'), 400);
    const t2 = setTimeout(() => setPhase('fade'), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  if (!show) return null;

  return (
    <div
      className={`absolute inset-0 z-30 flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
        phase === 'fade' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Red vignette flash */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          phase === 'shake' ? 'opacity-60' : 'opacity-0'
        }`}
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(200,0,0,0.6) 100%)',
        }}
      />

      {/* Eliminated text */}
      {phase !== 'shake' && (
        <div className="animate-scale-in text-center">
          <h1
            className="text-6xl md:text-8xl font-black text-red-500 tracking-tighter"
            style={{ textShadow: '0 0 40px rgba(200,0,0,0.5), 0 4px 20px rgba(0,0,0,0.8)' }}
          >
            ELIMINATED
          </h1>
          <p className="text-gray-400 text-xl mt-2 font-semibold">The Seeker got you</p>
        </div>
      )}
    </div>
  );
}
