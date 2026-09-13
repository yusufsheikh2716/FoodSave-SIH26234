import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import listingRoutes from './routes/listing.routes';
import claimRoutes from './routes/claim.routes';
import analyticsRoutes from './routes/analytics.routes';
import wasteRoutes from './routes/waste.routes';
import { initSocketServer } from './lib/socket';
import { initDispatchWorker } from './workers/dispatch.worker';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

// CORS setup: Reads dynamically from FRONTEND_ORIGIN, supports comma-separated lists for previews
const allowedOrigins = FRONTEND_ORIGIN.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow Vercel preview deploys or local development
      if (origin.endsWith('.vercel.app') || origin.includes('localhost')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/hackathon demo
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Socket.io real-time engine
initSocketServer(server);

// Initialize BullMQ worker for background dispatch
try {
  initDispatchWorker();
  console.log('[Worker] BullMQ dispatch worker initialized');
} catch (workerErr: any) {
  console.warn('[Worker] BullMQ worker startup warning:', workerErr.message);
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'foodsave-backend',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
    corsOrigin: FRONTEND_ORIGIN,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/waste-logs', wasteRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected internal error occurred',
  });
});

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🌱 FoodSave Backend API running on port ${PORT}`);
  console.log(`📡 Socket.io Engine attached`);
  console.log(`🔗 Allowed Frontend Origin: ${FRONTEND_ORIGIN}`);
  console.log(`🧠 Connected to ML Microservice: ${process.env.ML_SERVICE_URL || 'http://localhost:8000'}`);
  console.log(`===================================================`);
});

export default app;
