import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { validateBody } from '../middleware/validate';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Rate limiting on auth routes to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  type: z.enum(['KITCHEN', 'FOOD_PROCESSOR', 'NGO', 'LOGISTICS']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(3, 'Address is required'),
  contactPhone: z.string().min(7, 'Valid contact phone is required'),
  capacityKg: z.number().positive().optional().default(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        name,
        email,
        password,
        type,
        latitude,
        longitude,
        address,
        contactPhone,
        capacityKg,
      } = req.body;

      const existing = await prisma.organization.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existing) {
        res.status(409).json({ error: 'An organization with this email already exists.' });
        return;
      }

      // bcrypt with cost factor 12 as requested in SIH spec
      const passwordHash = await bcrypt.hash(password, 12);

      const org = await prisma.organization.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          type,
          latitude,
          longitude,
          address,
          contactPhone,
          capacityKg: capacityKg || 100,
        },
      });

      const token = jwt.sign(
        {
          userId: org.id,
          email: org.email,
          orgType: org.type,
          name: org.name,
        },
        process.env.JWT_SECRET || 'dev-secret-not-for-production',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Organization registered successfully',
        token,
        user: {
          id: org.id,
          name: org.name,
          email: org.email,
          type: org.type,
          latitude: org.latitude,
          longitude: org.longitude,
          address: org.address,
          capacityKg: org.capacityKg,
        },
      });
    } catch (error: any) {
      console.error('[Auth Register Error]:', error);
      res.status(500).json({ error: 'Failed to register organization' });
    }
  }
);

router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const org = await prisma.organization.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!org) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const isValid = await bcrypt.compare(password, org.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const token = jwt.sign(
        {
          userId: org.id,
          email: org.email,
          orgType: org.type,
          name: org.name,
        },
        process.env.JWT_SECRET || 'dev-secret-not-for-production',
        { expiresIn: '7d' }
      );

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: org.id,
          name: org.name,
          email: org.email,
          type: org.type,
          latitude: org.latitude,
          longitude: org.longitude,
          address: org.address,
          capacityKg: org.capacityKg,
        },
      });
    } catch (error: any) {
      console.error('[Auth Login Error]:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  }
);

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        latitude: true,
        longitude: true,
        address: true,
        contactPhone: true,
        capacityKg: true,
        createdAt: true,
      },
    });

    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json({ user: org });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
