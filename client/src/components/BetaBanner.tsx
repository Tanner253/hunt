'use client';

import { useState } from 'react';

const ROADMAP_PHASES = [
  {
    phase: 'NOW',
    label: 'OPEN BETA',
    color: '#00FFA3',
    glow: 'rgba(0,255,163,0.3)',
    items: [
      'Free-to-play multiplayer',
      'AI Seeker with overtime rage',
      '6 unique maps + map voting',
      'Items: Stink Bomb, Speed Boost, Shield',
      'Emotes, in-game chat, spectating',
    ],
  },
  {
    phase: 'Q2 2026',
    label: 'GAME MODES',
    color: '#03E1FF',
    glow: 'rgba(3,225,255,0.3)',
    items: [
      'Infection — killed players become seekers',
      'Prop Hunt — disguise as map objects',
      'Blitz — 60s micro-rounds, tiny maps',
      'Tag Team — squad survival (2v2v2)',
      'Custom lobbies & private matches',
    ],
  },
  {
    phase: 'Q3 2026',
    label: 'SOCIAL & COMMS',
    color: '#9945FF',
    glow: 'rgba(153,69,255,0.3)',
    items: [
      'Proximity voice chat',
      'Player profiles & stat tracking',
      'Season rankings & leaderboards',
      'Clans & friend lists',
      'Replay system & kill highlights',
    ],
  },
  {
    phase: 'Q4 2026',
    label: '$SOL WAGERING',
    color: '#DC1FFF',
    glow: 'rgba(220,31,255,0.3)',
    items: [
      'Phantom wallet integration',
      'Wager SOL on your own survival',
      'Spectator betting on match outcomes',
      'Prize pools & tournament mode',
      'On-chain leaderboard payouts',
    ],
  },
];

export function BetaBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative mt-12 mb-4">
      {/* Beta tag strip */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full group cursor-pointer"
      >
        <div
          className="relative overflow-hidden rounded-2xl border border-gray-800/80"
          style={{
            background: 'linear-gradient(135deg, rgba(0,255,163,0.05), rgba(3,225,255,0.05), rgba(220,31,255,0.05))',
          }}
        >
          {/* Animated shimmer */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(3,225,255,0.08), transparent)',
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          />

          <div className="relative px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="px-2.5 py-1 rounded-md text-xs font-black tracking-widest"
                style={{
                  background: 'linear-gradient(135deg, #00FFA3, #03E1FF)',
                  color: '#0a0a0a',
                }}
              >
                BETA
              </span>
              <span className="text-sm font-bold text-gray-300">
                Early access is <span className="text-green-400">LIVE</span> —
                <span className="text-gray-500 ml-1">see what&apos;s coming next</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-bold uppercase tracking-wider hidden sm:inline">
                Roadmap
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {/* Expanded roadmap */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${
          expanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {ROADMAP_PHASES.map((phase, idx) => (
            <div
              key={phase.phase}
              className="relative rounded-xl border border-gray-800/60 p-4 overflow-hidden"
              style={{
                background: `linear-gradient(160deg, ${phase.color}08, transparent 60%)`,
              }}
            >
              {idx === 0 && (
                <div
                  className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-20"
                  style={{ background: `radial-gradient(circle at top right, ${phase.color}, transparent)` }}
                />
              )}

              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: phase.color,
                    boxShadow: idx === 0 ? `0 0 8px ${phase.glow}` : 'none',
                    animation: idx === 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                  }}
                />
                <span className="text-xs font-black tracking-widest text-gray-500">
                  {phase.phase}
                </span>
                <span
                  className="text-xs font-black tracking-wider"
                  style={{ color: phase.color }}
                >
                  {phase.label}
                </span>
              </div>

              <ul className="space-y-1.5">
                {phase.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs">
                    <span
                      className="mt-1 w-1 h-1 rounded-full shrink-0"
                      style={{ backgroundColor: phase.color, opacity: 0.6 }}
                    />
                    <span className="text-gray-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-3 text-center py-3 rounded-xl border border-gray-800/40"
          style={{
            background: 'linear-gradient(135deg, rgba(220,31,255,0.03), rgba(153,69,255,0.03))',
          }}
        >
          <p className="text-xs text-gray-600">
            <span className="font-bold text-gray-500">$SOLvivors</span>
            {' '}is building the first wager-to-play survival game on Solana.
            <span className="text-gray-500 ml-1">This is just the beginning.</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
