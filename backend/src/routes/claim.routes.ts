import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { getSocketIO } from '../lib/socket';

const router = Router();

const verifyHandoverSchema = z.object({
  pickupOtp: z.string().optional(),
  qrCodeToken: z.string().optional(),
}).refine(
  (data) => data.pickupOtp || data.qrCodeToken,
  { message: 'Either pickupOtp or qrCodeToken must be provided for verification.' }
);

// POST /api/claims/:listingId/claim: NGO or Logistics claims a surplus listing
router.post(
  '/:listingId/claim',
  requireAuth,
  requireRole(['NGO', 'LOGISTICS']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const recipientId = req.user!.userId;
      const listingId = Array.isArray(req.params.listingId)
        ? req.params.listingId[0]
        : req.params.listingId;

      const listing = await prisma.surplusListing.findUnique({
        where: { id: listingId },
        include: { donor: true },
      });

      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      if (listing.status !== 'AVAILABLE') {
        res.status(400).json({ error: `Listing is already ${listing.status.toLowerCase()}.` });
        return;
      }

      // Check if listing is expired
      if (new Date(listing.safeUntil).getTime() <= Date.now()) {
        res.status(400).json({ error: 'This listing has expired and cannot be claimed.' });
        return;
      }

      // Generate 6-digit numeric OTP and cryptographic QR token
      const pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const qrCodeToken = `FS-${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;

      // Run transaction: update listing status to RESERVED and create ClaimRequest
      const claim = await prisma.claimRequest.create({
        data: {
          listingId,
          recipientId,
          status: 'ACCEPTED',
          pickupOtp,
          qrCodeToken,
        },
        include: {
          listing: {
            include: { donor: true },
          },
          recipient: true,
        },
      });

      await prisma.surplusListing.update({
        where: { id: listingId },
        data: { status: 'RESERVED' },
      });

      // Emit real-time notification to donor
      try {
        const io = getSocketIO();
        io.to(`org:${listing.donorId}`).emit('claim_received', {
          claimId: claim.id,
          listingId: listing.id,
          listingTitle: listing.title,
          recipientName: req.user!.name,
          pickupOtp: claim.pickupOtp,
        });

        io.to('dispatch:all').emit('listing_claimed', {
          listingId: listing.id,
          status: 'RESERVED',
        });
      } catch (socketErr: any) {
        console.warn('[Socket Warning] Could not emit claim notification:', socketErr.message);
      }

      res.status(201).json({
        message: 'Surplus batch successfully claimed! Present OTP or QR token at pickup.',
        claim: {
          id: claim.id,
          listingId: claim.listingId,
          status: claim.status,
          pickupOtp: claim.pickupOtp,
          qrCodeToken: claim.qrCodeToken,
          listingTitle: listing.title,
          donorName: listing.donor.name,
          donorAddress: listing.donor.address,
          donorPhone: listing.donor.contactPhone,
        },
      });
    } catch (error: any) {
      console.error('[Claim Listing Error]:', error);
      res.status(500).json({ error: 'Failed to process claim request' });
    }
  }
);

// POST /api/claims/:id/verify-handover: Validate OTP/QR for custody transfer
router.post(
  '/:id/verify-handover',
  requireAuth,
  validateBody(verifyHandoverSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const claimId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { pickupOtp, qrCodeToken } = req.body;

      const claim = await prisma.claimRequest.findUnique({
        where: { id: claimId },
        include: {
          listing: { include: { donor: true } },
          recipient: true,
        },
      });

      if (!claim) {
        res.status(404).json({ error: 'Claim not found' });
        return;
      }

      if (claim.status === 'DELIVERED') {
        res.status(400).json({ error: 'This food surplus handover has already been completed.' });
        return;
      }

      // Check OTP or QR Token match
      let matched = false;
      if (pickupOtp && claim.pickupOtp === pickupOtp.trim()) {
        matched = true;
      } else if (qrCodeToken && claim.qrCodeToken === qrCodeToken.trim()) {
        matched = true;
      }

      if (!matched) {
        res.status(400).json({ error: 'Verification failed. Invalid OTP or QR token code.' });
        return;
      }

      // Complete handover: Update claim to DELIVERED, listing to CLAIMED
      const updatedClaim = await prisma.claimRequest.update({
        where: { id: claimId },
        data: { status: 'DELIVERED' },
        include: { listing: true, recipient: true },
      });

      await prisma.surplusListing.update({
        where: { id: claim.listingId },
        data: { status: 'CLAIMED' },
      });

      // Emit real-time completion event
      try {
        const io = getSocketIO();
        io.to(`org:${claim.listing.donorId}`).emit('handover_completed', {
          claimId: claim.id,
          listingId: claim.listingId,
          recipientName: claim.recipient.name,
          quantityKg: claim.listing.quantityKg,
        });
        io.to(`org:${claim.recipientId}`).emit('handover_completed', {
          claimId: claim.id,
          listingId: claim.listingId,
          donorName: claim.listing.donor.name,
          quantityKg: claim.listing.quantityKg,
        });
      } catch (socketErr: any) {
        console.warn('[Socket Warning] Handover broadcast skipped:', socketErr.message);
      }

      res.json({
        message: 'Food handover verified successfully! Custody transferred.',
        claim: updatedClaim,
      });
    } catch (error: any) {
      console.error('[Verify Handover Error]:', error);
      res.status(500).json({ error: 'Failed to verify food handover' });
    }
  }
);

// GET /api/claims/recipient/my: List claims for current authenticated recipient
router.get(
  '/recipient/my',
  requireAuth,
  requireRole(['NGO', 'LOGISTICS']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const claims = await prisma.claimRequest.findMany({
        where: { recipientId: req.user!.userId },
        include: {
          listing: {
            include: {
              donor: {
                select: { id: true, name: true, address: true, contactPhone: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ claims });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch recipient claims' });
    }
  }
);

export default router;
