'use client';

import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { ChatMessage } from '@/shared/types';

interface ChatPanelProps {
  lobbyId: string;
}

export function ChatPanel({ lobbyId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();
    const handler = (message: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-49), message]);
    };
    socket.on('lobby:chat', handler);
    return () => { socket.off('lobby:chat', handler); };
  }, [lobbyId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    getSocket().emit('lobby:chat', input.trim());
    setInput('');
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl flex flex-col h-64 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Chat</h3>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
        {messages.length === 0 && (
          <p className="text-gray-700 text-sm text-center py-8">No messages yet — say hello!</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            <span className="text-blue-400 font-bold">{msg.senderName}</span>
            <span className="text-gray-600 mx-1">&middot;</span>
            <span className="text-gray-400">{msg.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          maxLength={200}
          className="flex-1 bg-gray-800/60 text-white px-4 py-2.5 rounded-xl border border-gray-700/50 focus:border-blue-500/50 outline-none text-sm placeholder:text-gray-700 transition-colors"
        />
        <button
          onClick={send}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95"
        >
          Send
        </button>
      </div>
    </div>
  );
}
