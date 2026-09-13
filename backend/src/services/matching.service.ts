import { Organization, SurplusListing } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ESG_CONSTANTS } from '../lib/constants';

export interface MatchedNGO {
  ngo: Organization;
  distanceKm: number;
  remainingShelfLifeHours: number;
  matchScore: number;
}

/**
 * Calculates Great Circle distance between two points in kilometers using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Round to 2 decimal places
}

/**
 * Dynamic Urgency Matching Algorithm
 * 
 * Formula specified in SIH requirements:
 * Score = (NGO_Capacity_Weight) / (Distance_km * 1.2 + Remaining_Shelf_Life_Hours)
 * 
 * Where:
 * - NGO_Capacity_Weight = Math.min(ngo.capacityKg / listing.quantityKg, 3.0) normalized weight
 * - Distance_km * 1.2 weights physical logistics lag
 * - Remaining_Shelf_Life_Hours provides urgency multiplier (shorter shelf life -> higher score)
 */
export async function matchSurplusToNGOs(
  listing: SurplusListing & { donor?: Organization | null },
  maxRadiusKm: number = ESG_CONSTANTS.MATCHING_MAX_RADIUS_KM
): Promise<MatchedNGO[]> {
  const now = new Date();
  const safeUntil = new Date(listing.safeUntil);

  // Remaining shelf life in hours
  const remainingShelfLifeHours = Math.max(
    0.1,
    (safeUntil.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  // If expired, no matching
  if (remainingShelfLifeHours <= 0) {
    return [];
  }

  // Get donor location
  let donorLat = 0;
  let donorLon = 0;

  if (listing.donor) {
    donorLat = listing.donor.latitude;
    donorLon = listing.donor.longitude;
  } else {
    const donor = await prisma.organization.findUnique({
      where: { id: listing.donorId },
    });
    if (!donor) return [];
    donorLat = donor.latitude;
    donorLon = donor.longitude;
  }

  // Find candidate recipient organizations (NGOs and LOGISTICS)
  const candidateOrgs = await prisma.organization.findMany({
    where: {
      type: { in: ['NGO', 'LOGISTICS'] },
    },
  });

  const matches: MatchedNGO[] = [];

  for (const org of candidateOrgs) {
    const distanceKm = calculateHaversineDistance(
      donorLat,
      donorLon,
      org.latitude,
      org.longitude
    );

    // Skip if outside maximum radius
    if (distanceKm > maxRadiusKm) {
      continue;
    }

    // Capacity weight: Ratio of NGO capacity to listing quantity, clamped between 0.5 and 5.0
    const capacityWeight = Math.min(
      Math.max(org.capacityKg / Math.max(listing.quantityKg, 1), 0.5),
      5.0
    );

    // Prompt Formula: Score = (NGO_Capacity_Weight) / (Distance_km * 1.2 + Remaining_Shelf_Life_Hours)
    const denominator = distanceKm * 1.2 + remainingShelfLifeHours;
    const matchScore = Math.round((capacityWeight / Math.max(denominator, 0.1)) * 100) / 100;

    matches.push({
      ngo: org,
      distanceKm,
      remainingShelfLifeHours: Math.round(remainingShelfLifeHours * 10) / 10,
      matchScore,
    });
  }

  // Sort descending by match score
  matches.sort((a, b) => b.matchScore - a.matchScore);

  return matches;
}
