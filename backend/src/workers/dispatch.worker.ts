import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { matchSurplusToNGOs } from '../services/matching.service';
import { getSocketIO } from '../lib/socket';

export interface DispatchJobData {
  listingId: string;
}

const QUEUE_NAME = 'surplus-dispatch-queue';

// BullMQ Queue instance
export const dispatchQueue = new Queue<DispatchJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * BullMQ Worker: Processes async matching and dispatches real-time alerts
 */
export function initDispatchWorker(): Worker<DispatchJobData> {
  const worker = new Worker<DispatchJobData>(
    QUEUE_NAME,
    async (job: Job<DispatchJobData>) => {
      const { listingId } = job.data;
      console.log(`[BullMQ Worker] Processing dispatch for listing: ${listingId}`);

      const listing = await prisma.surplusListing.findUnique({
        where: { id: listingId },
        include: { donor: true },
      });

      if (!listing || listing.status !== 'AVAILABLE') {
        console.log(`[BullMQ Worker] Listing ${listingId} not available or deleted. Skipping.`);
        return { matched: 0 };
      }

      // Compute dynamic urgency matches within 15 km
      const matches = await matchSurplusToNGOs(listing);
      console.log(`[BullMQ Worker] Found ${matches.length} candidate NGO matches for listing ${listingId}`);

      try {
        const io = getSocketIO();

        // 1. Broadcast to general dispatch feed for NGO live maps
        io.to('dispatch:all').emit('new_surplus_alert', {
          listing: {
            id: listing.id,
            title: listing.title,
            foodCategory: listing.foodCategory,
            quantityKg: listing.quantityKg,
            safeUntil: listing.safeUntil,
            storageCondition: listing.storageCondition,
            donorName: listing.donor.name,
            donorLocation: {
              latitude: listing.donor.latitude,
              longitude: listing.donor.longitude,
              address: listing.donor.address,
            },
          },
        });

        // 2. Direct broadcast to top-matched NGOs (targeted alert)
        for (const match of matches.slice(0, 5)) {
          io.to(`org:${match.ngo.id}`).emit('targeted_surplus_match', {
            listingId: listing.id,
            listingTitle: listing.title,
            foodCategory: listing.foodCategory,
            quantityKg: listing.quantityKg,
            safeUntil: listing.safeUntil,
            distanceKm: match.distanceKm,
            urgencyScore: match.matchScore,
            donorName: listing.donor.name,
          });
        }
      } catch (socketError: any) {
        console.warn('[BullMQ Worker] Socket.io broadcast skipped (server may not have initialized IO):', socketError.message);
      }

      return { matched: matches.length };
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[BullMQ Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
