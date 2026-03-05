'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { EntityState } from '@/shared/types';

interface KillEntry {
  id: string;
  victimName: string;
  timestamp: number;
  leaving: boolean;
}

interface KillFeedProps {
  entities: EntityState[];
}

export function KillFeed({ entities }: KillFeedProps) {
  const [kills, setKills] = useState<KillEntry[]>([]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (data: { victimId: string }) => {
      const victim = entities.find((e) => e.id === data.victimId);
      const name = victim?.name || 'Unknown';
      const entry: KillEntry = {
        id: `${data.victimId}-${Date.now()}`,
        victimName: name,
        timestamp: Date.now(),
        leaving: false,
      };
      setKills((prev) => [...prev.slice(-4), entry]);

      setTimeout(() => {
        setKills((prev) => prev.map((k) => (k.id === entry.id ? { ...k, leaving: true } : k)));
      }, 3500);
      setTimeout(() => {
        setKills((prev) => prev.filter((k) => k.id !== entry.id));
      }, 4000);
    };
    socket.on('game:kill', handler);
    return () => { socket.off('game:kill', handler); };
  }, [entities]);

  if (kills.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 flex flex-col gap-2 z-20 pointer-events-none">
      {kills.map((kill) => (
        <div
          key={kill.id}
          className={kill.leaving ? 'animate-slide-out-right' : 'animate-slide-in-right'}
        >
          <div className="bg-black/70 backdrop-blur-sm border border-red-900/40 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-red-500 text-lg">&#x1F480;</span>
            <span className="text-gray-300 text-sm">
              <span className="text-red-400 font-bold">Seeker</span>
              {' '}eliminated{' '}
              <span className="text-white font-bold">{kill.victimName}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
