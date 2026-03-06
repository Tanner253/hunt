'use client';

import { useState, useEffect } from 'react';

const CA = 'GCeqAE3zchJM1AeLim9e3QzVEtwG3bAqFM9foLeMpump';

export function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem('solvivors-welcome');
    if (!seen) setOpen(true);
  }, []);

  const dismiss = () => {
    setOpen(false);
    sessionStorage.setItem('solvivors-welcome', '1');
  };

  const copyCA = async () => {
    try {
      await navigator.clipboard.writeText(CA);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = CA;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={dismiss}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl shadow-purple-900/20 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#00FFA3] via-[#03E1FF] to-[#DC1FFF]" />

        <div className="px-8 py-8">
          {/* Ticker */}
          <div className="text-center mb-6">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-1">
              <span
                className="inline-block"
                style={{
                  background: 'linear-gradient(135deg, #00FFA3, #03E1FF, #DC1FFF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                $SOL
              </span>
              <span className="text-white">vivors</span>
            </h2>
            <p className="text-gray-500 text-sm font-bold tracking-widest uppercase">On Solana</p>
          </div>

          {/* Description */}
          <div className="space-y-3 mb-6 text-sm text-gray-400 leading-relaxed">
            <p>
              <span className="text-white font-bold">SOLvivors</span> is a multiplayer survival game.
              You and other players spawn into a map and get <span className="text-yellow-400 font-bold">15 seconds to hide</span> before
              an AI Seeker is unleashed.
            </p>
            <p>
              Stay out of its line of sight, pick up <span className="text-green-400 font-bold">items</span> like
              stink bombs, speed boosts, and shields to survive.
              The <span className="text-red-400 font-bold">last player standing wins</span>.
            </p>
            <p>
              Vote on maps, use emotes, and climb the leaderboard. Free to play in your browser.
            </p>
          </div>

          {/* CA Box */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 mb-6">
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Contract Address</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-purple-300 font-mono break-all select-all leading-relaxed">{CA}</code>
              <button
                onClick={copyCA}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  copied
                    ? 'bg-green-900/60 text-green-400 border border-green-700/50'
                    : 'bg-purple-900/40 text-purple-300 border border-purple-700/50 hover:bg-purple-900/60'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Enter button */}
          <button
            onClick={dismiss}
            className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-[0.98] hover:shadow-[0_0_30px_rgba(3,225,255,0.2)]"
            style={{
              background: 'linear-gradient(135deg, #00FFA3, #03E1FF, #DC1FFF)',
            }}
          >
            ENTER SOLvivors
          </button>

          <p className="text-center text-gray-700 text-xs mt-3">Click outside or press the button to continue</p>
        </div>
      </div>
    </div>
  );
}
