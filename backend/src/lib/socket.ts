import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

let io: Server | null = null;

export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    orgType: string;
    email: string;
  };
}

export function initSocketServer(server: HttpServer): Server {
  const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow same origin, configured frontend origin, or dev fallback
        if (!origin || origin === allowedOrigin || allowedOrigin === '*') {
          callback(null, true);
        } else {
          // Flexible for staging/preview deployments
          callback(null, true);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket Auth Middleware (optional or soft auth for room joins)
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
        socket.user = decoded;
      } catch (err) {
        console.warn('[Socket.io] Invalid token provided in handshake, continuing as guest');
      }
    }
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}, org: ${socket.user?.userId || 'anonymous'}`);

    // Join organization specific room if authenticated
    if (socket.user?.userId) {
      socket.join(`org:${socket.user.userId}`);
      socket.join(`role:${socket.user.orgType}`);
    }

    // Client can join a specific geofence/region room or listings channel
    socket.on('join_dispatch_feed', () => {
      socket.join('dispatch:all');
      console.log(`[Socket.io] ${socket.id} joined dispatch:all`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketIO(): Server {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocketServer first.');
  }
  return io;
}
