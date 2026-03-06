'use client';

export const ROADMAP_PHASES = [
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

export function RoadmapGrid({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <div className={`grid ${compact ? 'grid-cols-2' : 'sm:grid-cols-2'} gap-3`}>
        {ROADMAP_PHASES.map((phase, idx) => (
          <div
            key={phase.phase}
            className={`relative rounded-xl border border-gray-800/60 ${compact ? 'p-3' : 'p-4'} overflow-hidden`}
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

            <div className={`flex items-center gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: phase.color,
                  boxShadow: idx === 0 ? `0 0 8px ${phase.glow}` : 'none',
                  animation: idx === 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                }}
              />
              <span className="text-[10px] font-black tracking-widest text-gray-500">
                {phase.phase}
              </span>
              <span
                className="text-[10px] font-black tracking-wider"
                style={{ color: phase.color }}
              >
                {phase.label}
              </span>
            </div>

            <ul className={compact ? 'space-y-1' : 'space-y-1.5'}>
              {phase.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[11px]">
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
    </>
  );
}
