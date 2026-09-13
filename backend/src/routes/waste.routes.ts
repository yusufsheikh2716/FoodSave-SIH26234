import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { mlBridge } from '../services/ml-bridge.service';

const router = Router();

const createWasteLogSchema = z.object({
  date: z.string().datetime().optional(),
  plannedKg: z.number().positive(),
  actualConsumedKg: z.number().nonnegative(),
  discardedKg: z.number().nonnegative(),
  discardReason: z.string().optional(),
  mealType: z.string().optional(),
  attendanceCount: z.number().int().positive().optional(),
});

const predictPrepSchema = z.object({
  expectedAttendanceCount: z.number().int().positive(),
  dayOfWeek: z.string(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  isHolidayOrEvent: z.boolean().default(false),
  historicalMealCounts: z.array(z.number()).optional().default([]),
});

const predictShelfLifeSchema = z.object({
  foodCategory: z.string().min(1),
  ambientTempC: z.number(),
  initialPrepTime: z.string().datetime().optional(),
});

// POST /api/waste-logs: Record daily waste log for institutional kitchen
router.post(
  '/',
  requireAuth,
  requireRole(['KITCHEN', 'FOOD_PROCESSOR']),
  validateBody(createWasteLogSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const kitchenId = req.user!.userId;
      const {
        date,
        plannedKg,
        actualConsumedKg,
        discardedKg,
        discardReason,
        mealType,
        attendanceCount,
      } = req.body;

      const log = await prisma.wasteLog.create({
        data: {
          kitchenId,
          date: date ? new Date(date) : new Date(),
          plannedKg,
          actualConsumedKg,
          discardedKg,
          discardReason,
          mealType,
          attendanceCount,
        },
      });

      res.status(201).json({
        message: 'Waste log recorded successfully',
        log,
      });
    } catch (error: any) {
      console.error('[Create Waste Log Error]:', error);
      res.status(500).json({ error: 'Failed to record waste log' });
    }
  }
);

// GET /api/waste-logs: Fetch kitchen's waste log history
router.get(
  '/',
  requireAuth,
  requireRole(['KITCHEN', 'FOOD_PROCESSOR']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const kitchenId = req.user!.userId;
      const logs = await prisma.wasteLog.findMany({
        where: { kitchenId },
        orderBy: { date: 'desc' },
        take: 60,
      });

      // Calculate waste percentage trend
      const enrichedLogs = logs.map((log) => ({
        ...log,
        wastePercentage:
          log.plannedKg > 0 ? Math.round((log.discardedKg / log.plannedKg) * 1000) / 10 : 0,
      }));

      res.json({ logs: enrichedLogs });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch waste logs' });
    }
  }
);

// POST /api/waste-logs/predict-prep: Proxy to Python ML service for prep forecast
router.post(
  '/predict-prep',
  requireAuth,
  validateBody(predictPrepSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        expectedAttendanceCount,
        dayOfWeek,
        mealType,
        isHolidayOrEvent,
        historicalMealCounts,
      } = req.body;

      // If no historical meal counts were passed, grab recent counts from waste logs
      let history = historicalMealCounts;
      if (!history || history.length === 0) {
        const recentLogs = await prisma.wasteLog.findMany({
          where: { kitchenId: req.user!.userId },
          orderBy: { date: 'desc' },
          take: 30,
          select: { attendanceCount: true },
        });
        history = recentLogs
          .map((l) => l.attendanceCount)
          .filter((c): c is number => c !== null);
      }

      const prediction = await mlBridge.predictMealPrep({
        expectedAttendanceCount,
        dayOfWeek,
        mealType,
        isHolidayOrEvent,
        historicalMealCounts: history,
      });

      res.json(prediction);
    } catch (error: any) {
      console.error('[Predict Prep Error]:', error);
      res.status(500).json({ error: 'Failed to generate prep forecast' });
    }
  }
);

// POST /api/waste-logs/predict-shelf-life: Proxy to Python ML service for shelf life
router.post(
  '/predict-shelf-life',
  validateBody(predictShelfLifeSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { foodCategory, ambientTempC, initialPrepTime } = req.body;

      const prediction = await mlBridge.predictShelfLife({
        foodCategory,
        ambientTempC,
        initialPrepTime,
      });

      res.json(prediction);
    } catch (error: any) {
      console.error('[Predict Shelf Life Error]:', error);
      res.status(500).json({ error: 'Failed to generate shelf-life prediction' });
    }
  }
);

export default router;
