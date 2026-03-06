'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { gameAudio } from '@/lib/audio';
import { LobbyBrowser } from '@/components/LobbyBrowser';
import { AudioToggle } from '@/components/AudioToggle';
import { CopyCA } from '@/components/CopyCA';
import { WelcomePopup } from '@/components/WelcomePopup';
import { BetaBanner } from '@/components/BetaBanner';

export default function HomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('hunt-player-name');
    if (saved) setPlayerName(saved);
    const socket = getSocket();
    socket.connect();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    if (socket.connected) setConnected(true);

    socket.on('lobby:list', (lobbies) => {
      const total = lobbies.reduce(
        (sum: number, l: { players: unknown[]; spectators: number }) => sum + l.players.length + l.spectators,
        0,
      );
      setOnlineCount(total);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('lobby:list');
    };
  }, []);

  const handleJoinLobby = (lobbyId: string) => {
    if (!playerName.trim()) return;
    localStorage.setItem('hunt-player-name', playerName.trim());
    router.push(`/game/${lobbyId}`);
  };

  useEffect(() => {
    const onInteract = () => {
      gameAudio.init();
      gameAudio.playLobbyMusic();
      window.removeEventListener('click', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
    window.addEventListener('click', onInteract);
    window.addEventListener('keydown', onInteract);
    return () => {
      window.removeEventListener('click', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Top nav */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3">
        <div className="text-sm font-black tracking-tight">
          <span
            style={{
              background: 'linear-gradient(135deg, #00FFA3, #03E1FF, #DC1FFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SOL
          </span>
          <span className="text-gray-400">vivors</span>
        </div>
        <CopyCA />
      </div>

      {/* Animated grid background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(3,225,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(3,225,255,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            animation: 'grid-pulse 4s ease-in-out infinite',
          }}
        />
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + Math.random() * 4,
              height: 4 + Math.random() * 4,
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#00FFA3', '#03E1FF', '#DC1FFF', '#9945FF', '#14F195'][i % 5],
              opacity: 0,
              animation: `float-up ${8 + Math.random() * 12}s linear ${Math.random() * 10}s infinite`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-950" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none">
              <span
                className="inline-block"
                style={{
                  background: 'linear-gradient(135deg, #00FFA3, #03E1FF, #DC1FFF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 40px rgba(3,225,255,0.3)) drop-shadow(0 0 80px rgba(220,31,255,0.15))',
                }}
              >
                SOL
              </span>
              <span
                style={{
                  color: '#E2E8F0',
                  textShadow: '0 0 40px rgba(226,232,240,0.15)',
                }}
              >
                vivors
              </span>
            </h1>
          </div>

          <p className="text-lg text-gray-500 font-bold tracking-[0.2em] uppercase mb-4">
            Last one standing wins
          </p>

          <div className="flex items-center justify-center gap-4">
            <div
              className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 ${
                connected ? 'bg-green-900/60 text-green-400' : 'bg-red-900/60 text-red-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'LIVE' : 'CONNECTING...'}
            </div>
            {onlineCount > 0 && (
              <div className="px-3 py-1 rounded-full text-sm font-bold bg-blue-900/40 text-blue-400">
                {onlineCount} online
              </div>
            )}
          </div>
        </div>

        {/* Name input */}
        <div className="max-w-md mx-auto mb-10">
          <label className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] block mb-2">
            Enter your name
          </label>
          <div className="relative">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="What should we call you?"
              maxLength={20}
              className="w-full bg-gray-900/80 text-white px-5 py-4 rounded-2xl border border-gray-800 focus:border-cyan-500/50 outline-none text-lg font-bold placeholder:text-gray-700 transition-colors"
            />
            {playerName.trim() && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-xl">&#10003;</div>
            )}
          </div>
        </div>

        {!playerName.trim() ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 opacity-20">&#x1F3AE;</div>
            <p className="text-gray-600 text-lg">Enter a name above to see available lobbies</p>
          </div>
        ) : !connected ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Connecting to server...</p>
          </div>
        ) : (
          <LobbyBrowser onJoinLobby={handleJoinLobby} />
        )}

        {/* How to play */}
        <div className="mt-16 grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: '\u{1F3C3}', title: 'HIDE', desc: '15 seconds to find a spot before the Seeker hunts', color: 'text-yellow-400' },
            { icon: '\u{1F440}', title: 'SURVIVE', desc: 'Stay out of the AI Seeker\'s line of sight', color: 'text-red-400' },
            { icon: '\u{1F3C6}', title: 'WIN', desc: 'Last player standing takes the crown', color: 'text-green-400' },
          ].map((step) => (
            <div key={step.title} className="bg-gray-900/40 border border-gray-800/60 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-2">{step.icon}</div>
              <h3 className={`font-black text-lg ${step.color} mb-1`}>{step.title}</h3>
              <p className="text-gray-500 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-gray-700 text-sm">
          <kbd className="bg-gray-900 px-2 py-1 rounded text-gray-500 border border-gray-800">WASD</kbd>
          {' '}to move &middot;{' '}
          <kbd className="bg-gray-900 px-2 py-1 rounded text-gray-500 border border-gray-800">E</kbd>
          {' '}for emotes
        </div>

        <BetaBanner />
      </div>

      <AudioToggle />
      <WelcomePopup />
    </div>
  );
}
