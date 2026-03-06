'use client';

import { useState } from 'react';

const CA = 'GCeqAE3zchJM1AeLim9e3QzVEtwG3bAqFM9foLeMpump';

export function CopyCA({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback for older browsers */
      const ta = document.createElement('textarea');
      ta.value = CA;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
        copied
          ? 'bg-green-900/60 text-green-400 border border-green-700/50'
          : 'bg-gray-900/80 text-gray-400 border border-gray-700/50 hover:border-purple-500/50 hover:text-purple-300'
      } ${className}`}
      title={CA}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          CA
        </>
      )}
    </button>
  );
}
