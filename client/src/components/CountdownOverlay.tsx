'use client';

import { useState, useEffect } from 'react';

interface CountdownOverlayProps {
  count: number | null;
}

export function CountdownOverlay({ count }: CountdownOverlayProps) {
  const [displayCount, setDisplayCount] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (count === null) {
      setDisplayCount(null);
      return;
    }
    setDisplayCount(count);
    setAnimKey((k) => k + 1);
  }, [count]);

  if (displayCount === null) return null;

  const isGo = displayCount <= 0;
  const color = displayCount <= 1 ? '#C51111' : displayCount <= 3 ? '#F5F557' : '#FFFFFF';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
      <div key={animKey} className="animate-countdown-pop text-center">
        {isGo ? (
          <>
            <h1
              className="text-8xl md:text-[10rem] font-black tracking-tighter"
              style={{ color: '#4ADE80', textShadow: '0 0 80px rgba(74,222,128,0.4)' }}
            >
              GO!
            </h1>
          </>
        ) : (
          <>
            <div
              className="text-[10rem] md:text-[14rem] font-black leading-none"
              style={{ color, textShadow: `0 0 80px ${color}40` }}
            >
              {displayCount}
            </div>
            <p className="text-gray-400 text-xl font-bold uppercase tracking-[0.3em] mt-2">
              Get Ready
            </p>
          </>
        )}
      </div>
    </div>
  );
}
