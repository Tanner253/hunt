'use client';

import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { ChatMessage } from '@/shared/types';

interface InGameChatProps {
  open: boolean;
  onClose: () => void;
}

export function InGameChat({ open, onClose }: InGameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = getSocket();
    const handler = (message: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-49), message]);
    };
    socket.on('lobby:chat', handler);
    return () => { socket.off('lobby:chat', handler); };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !open) return;
      if (e.key === 'Escape' && open) { onClose(); e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const send = () => {
    if (!input.trim()) return;
    getSocket().emit('lobby:chat', input.trim());
    setInput('');
  };

  return (
    <div className={`absolute bottom-4 left-4 z-20 transition-all duration-200 ${open ? 'w-80' : 'w-64'}`}>
      {/* Message display - always visible when there are recent messages */}
      <div className={`mb-2 flex flex-col gap-0.5 ${open ? 'max-h-48' : 'max-h-24'} overflow-hidden`}>
        {messages.slice(open ? -15 : -3).map((msg) => (
          <div
            key={msg.id}
            className={`text-sm px-2 py-0.5 rounded ${
              open ? 'bg-black/60' : 'bg-black/40'
            }`}
          >
            <span className="text-blue-400 font-bold">{msg.senderName}</span>
            <span className="text-gray-500 mx-1">&middot;</span>
            <span className="text-gray-300">{msg.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      {open && (
        <div className="flex gap-2 animate-scale-in" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { send(); e.preventDefault(); }
              e.stopPropagation();
            }}
            onKeyUp={(e) => e.stopPropagation()}
            placeholder="Type a message..."
            maxLength={200}
            className="flex-1 bg-black/70 backdrop-blur text-white px-3 py-2 rounded-xl border border-white/10 focus:border-blue-500/50 outline-none text-sm placeholder:text-gray-600"
          />
          <button
            onClick={send}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
          >
            Send
          </button>
        </div>
      )}

      {/* Toggle button (desktop) */}
      {!open && (
        <button
          onClick={onClose}
          className="hidden md:block text-gray-600 hover:text-gray-400 text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Press T to chat
        </button>
      )}
    </div>
  );
}
