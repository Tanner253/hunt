import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/shared/types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    }) as TypedSocket;
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
