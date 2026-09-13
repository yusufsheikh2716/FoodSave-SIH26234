import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ESG_CONSTANTS } from '../lib/constants';

const router = Router();

// GET /api/analytics/esg-summary: Calculate total kg rescued, CO2 avoided, meals provided
router.get('/esg-summary', async (req: Request, res: Response): Promise<void> => {
  try {
    // Rescued food = Listings that have been claimed and delivered
    const claimedListings = await prisma.surplusListing.findMany({
      where: {
        status: { in: ['CLAIMED', 'RESERVED'] },
      },
      select: {
        id: true,
        quantityKg: true,
        foodCategory: true,
        createdAt: true,
        status: true,
        claims: {
          select: { status: true },
        },
      },
    });

    // Delivered listings count towards official ESG avoided footprint
    const deliveredListings = claimedListings.filter(
      (l) => l.status === 'CLAIMED' || l.claims.some((c) => c.status === 'DELIVERED')
    );

    const totalKgRescued = deliveredListings.reduce((sum, item) => sum + item.quantityKg, 0);

    // ESG Calculation using the SINGLE shared constant (IPCC/FAO standard)
    const co2AvoidedKg = Math.round(totalKgRescued * ESG_CONSTANTS.CO2_FACTOR_KG_PER_KG * 10) / 10;
    
    // Meals provided = kg / 0.4 (prompt requirement)
    const mealsProvided = Math.round(totalKgRescued / ESG_CONSTANTS.KG_PER_MEAL);

    // Financial / economic value rescued
    const estimatedValueSaved = Math.round(totalKgRescued * ESG_CONSTANTS.VALUE_PER_KG);

    // Active counts
    const [activeListingsCount, totalDonorsCount, totalNgosCount] = await Promise.all([
      prisma.surplusListing.count({
        where: {
          status: 'AVAILABLE',
          safeUntil: { gt: new Date() },
        },
      }),
      prisma.organization.count({
        where: { type: { in: ['KITCHEN', 'FOOD_PROCESSOR'] } },
      }),
      prisma.organization.count({
        where: { type: { in: ['NGO', 'LOGISTICS'] } },
      }),
    ]);

    // Breakdown by food category
    const categoryBreakdown: Record<string, number> = {};
    for (const item of deliveredListings) {
      categoryBreakdown[item.foodCategory] =
        (categoryBreakdown[item.foodCategory] || 0) + item.quantityKg;
    }

    res.json({
      summary: {
        totalKgRescued: Math.round(totalKgRescued * 10) / 10,
        co2AvoidedKg,
        mealsProvided,
        estimatedValueSaved,
        activeListingsCount,
        totalDonorsCount,
        totalNgosCount,
      },
      // Expose conversion constants explicitly so frontend NEVER hardcodes its own copy
      constants: {
        co2FactorKgPerKg: ESG_CONSTANTS.CO2_FACTOR_KG_PER_KG,
        kgPerMeal: ESG_CONSTANTS.KG_PER_MEAL,
        citation: 'IPCC Climate Change & Land Special Report & FAO Food Wastage Footprint',
      },
      categoryBreakdown,
    });
  } catch (error: any) {
    console.error('[ESG Summary Error]:', error);
    res.status(500).json({ error: 'Failed to generate ESG analytics summary' });
  }
});

export default router;
