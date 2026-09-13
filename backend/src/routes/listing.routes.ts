import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { dispatchQueue } from '../workers/dispatch.worker';
import { calculateHaversineDistance } from '../services/matching.service';
import { ESG_CONSTANTS } from '../lib/constants';

const router = Router();

const createListingSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  foodCategory: z.string().min(2, 'Food category is required'),
  quantityKg: z.number().positive('Quantity must be greater than 0'),
  preparedAt: z.string().datetime('Valid preparedAt ISO timestamp is required'),
  safeUntil: z.string().datetime('Valid safeUntil ISO timestamp is required'),
  storageCondition: z.enum(['ROOM_TEMP', 'CHILLED', 'HOT']).default('ROOM_TEMP'),
  notes: z.string().optional(),
});

const activeQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  maxDistanceKm: z.coerce.number().positive().optional().default(15),
  category: z.string().optional(),
});

// POST /api/listings: Create surplus batch + trigger BullMQ match task
router.post(
  '/',
  requireAuth,
  requireRole(['KITCHEN', 'FOOD_PROCESSOR']),
  validateBody(createListingSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const donorId = req.user!.userId;
      const {
        title,
        foodCategory,
        quantityKg,
        preparedAt,
        safeUntil,
        storageCondition,
        notes,
      } = req.body;

      // Validate that safeUntil is in the future
      const safeDate = new Date(safeUntil);
      if (safeDate.getTime() <= Date.now()) {
        res.status(400).json({ error: 'Safe until timestamp must be in the future.' });
        return;
      }

      const listing = await prisma.surplusListing.create({
        data: {
          donorId,
          title,
          foodCategory,
          quantityKg,
          preparedAt: new Date(preparedAt),
          safeUntil: safeDate,
          storageCondition,
          notes,
          status: 'AVAILABLE',
        },
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              contactPhone: true,
            },
          },
        },
      });

      // Trigger BullMQ asynchronous matching and dispatch task
      try {
        await dispatchQueue.add('dispatch-listing', { listingId: listing.id });
      } catch (queueError: any) {
        console.warn('[Queue Warning] BullMQ queue add skipped or Redis offline:', queueError.message);
      }

      res.status(201).json({
        message: 'Surplus listing created and queued for NGO matching',
        listing,
      });
    } catch (error: any) {
      console.error('[Create Listing Error]:', error);
      res.status(500).json({ error: 'Failed to create surplus listing' });
    }
  }
);

// GET /api/listings/active: Fetch active listings with proximity filters
router.get(
  '/active',
  validateQuery(activeQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { latitude, longitude, maxDistanceKm, category } = req.query as any;
      const now = new Date();

      const whereClause: any = {
        status: 'AVAILABLE',
        safeUntil: { gt: now },
      };

      if (category) {
        whereClause.foodCategory = { contains: category, mode: 'insensitive' };
      }

      const listings = await prisma.surplusListing.findMany({
        where: whereClause,
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              contactPhone: true,
            },
          },
        },
        orderBy: { safeUntil: 'asc' }, // Most urgent first
      });

      // Augment with remaining shelf-life hours, distance, and urgency color tier
      const enriched = listings
        .map((item) => {
          const remainingHours = Math.max(
            0,
            (new Date(item.safeUntil).getTime() - now.getTime()) / (1000 * 60 * 60)
          );

          let distanceKm: number | null = null;
          if (latitude !== undefined && longitude !== undefined) {
            distanceKm = calculateHaversineDistance(
              Number(latitude),
              Number(longitude),
              item.donor.latitude,
              item.donor.longitude
            );
          }

          // Urgency categorization:
          // RED: < 2h (Critical)
          // AMBER: 2 - 5h (Moderate)
          // GREEN: > 5h (Stable)
          const urgency: 'CRITICAL' | 'MODERATE' | 'STABLE' =
            remainingHours <= ESG_CONSTANTS.URGENCY_THRESHOLDS.CRITICAL_HOURS
              ? 'CRITICAL'
              : remainingHours <= ESG_CONSTANTS.URGENCY_THRESHOLDS.MODERATE_HOURS
              ? 'MODERATE'
              : 'STABLE';

          const urgencyColor =
            urgency === 'CRITICAL' ? '#EF4444' : urgency === 'MODERATE' ? '#F59E0B' : '#10B981';

          return {
            ...item,
            remainingShelfLifeHours: Math.round(remainingHours * 10) / 10,
            distanceKm,
            urgency,
            urgencyColor,
          };
        })
        .filter((item) => {
          if (latitude !== undefined && longitude !== undefined && maxDistanceKm) {
            return item.distanceKm !== null && item.distanceKm <= Number(maxDistanceKm);
          }
          return true;
        });

      res.json({
        total: enriched.length,
        listings: enriched,
      });
    } catch (error: any) {
      console.error('[Get Active Listings Error]:', error);
      res.status(500).json({ error: 'Failed to fetch active surplus listings' });
    }
  }
);

// GET /api/listings/donor/my: Listings created by the authenticated donor
router.get(
  '/donor/my',
  requireAuth,
  requireRole(['KITCHEN', 'FOOD_PROCESSOR']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const donorId = req.user!.userId;
      const listings = await prisma.surplusListing.findMany({
        where: { donorId },
        include: {
          claims: {
            include: {
              recipient: {
                select: { id: true, name: true, contactPhone: true, type: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ listings });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch donor listings' });
    }
  }
);

// GET /api/listings/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const listing = await prisma.surplusListing.findUnique({
      where: { id },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            contactPhone: true,
          },
        },
        claims: {
          include: {
            recipient: {
              select: { id: true, name: true, contactPhone: true, type: true },
            },
          },
        },
      },
    });

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    res.json({ listing });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

export default router;
