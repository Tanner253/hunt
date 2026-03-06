'use client';

import { useState } from 'react';
import { ROADMAP_PHASES, RoadmapGrid } from './RoadmapGrid';

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
        <RoadmapGrid />
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
