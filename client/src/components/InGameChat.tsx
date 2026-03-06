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
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setInput('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  const sendAndClose = () => {
    if (input.trim()) {
      getSocket().emit('lobby:chat', input.trim());
    }
    setInput('');
    onClose();
  };

  return (
    <div ref={containerRef} className={`absolute bottom-4 left-4 z-20 transition-all duration-150 ${open ? 'w-80' : 'w-64'}`}>
      <div className={`mb-1 flex flex-col gap-0.5 ${open ? 'max-h-48' : 'max-h-20'} overflow-hidden`}>
        {messages.slice(open ? -15 : -3).map((msg) => (
          <div
            key={msg.id}
            className={`text-sm px-2 py-0.5 rounded ${open ? 'bg-black/60' : 'bg-black/40'}`}
          >
            <span className="text-blue-400 font-bold">{msg.senderName}</span>
            <span className="text-gray-500 mx-1">&middot;</span>
            <span className="text-gray-300">{msg.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {open && (
        <div className="flex gap-2 animate-scale-in">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); sendAndClose(); }
              if (e.key === 'Escape') { e.preventDefault(); onClose(); }
              e.stopPropagation();
            }}
            onKeyUp={(e) => e.stopPropagation()}
            placeholder="Type a message... (Enter to send)"
            maxLength={200}
            className="flex-1 bg-black/70 backdrop-blur text-white px-3 py-2 rounded-xl border border-white/10 focus:border-blue-500/50 outline-none text-sm placeholder:text-gray-600"
          />
        </div>
      )}

      {!open && (
        <span className="hidden md:block text-gray-600 text-xs font-bold uppercase tracking-wider">
          Enter to chat
        </span>
      )}
    </div>
  );
}
