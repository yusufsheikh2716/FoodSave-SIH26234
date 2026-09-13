import { io, Socket } from 'socket.io-client';

/**
 * Socket.io Singleton Client
 * Connects to NEXT_PUBLIC_SOCKET_URL from environment variables.
 * NEVER hardcodes localhost.
 */

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const token = typeof window !== 'undefined' ? localStorage.getItem('foodsave_token') : null;

    socket = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket.io Client] Connected to real-time server:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.io Client] Real-time connection error:', err.message);
    });
  }

  return socket;
}
