import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial FoodSave data...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Create a Kitchen Donor (Central Kitchen, Bangalore / Indiranagar)
  const kitchen = await prisma.organization.upsert({
    where: { email: 'kitchen@foodsave.org' },
    update: {},
    create: {
      name: 'Apex Central Institutional Kitchen',
      email: 'kitchen@foodsave.org',
      passwordHash,
      type: 'KITCHEN',
      latitude: 12.9716,
      longitude: 77.5946,
      address: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038',
      contactPhone: '+91 98765 43210',
      capacityKg: 500,
    },
  });

  // 2. Create Food Processor Donor
  const processor = await prisma.organization.upsert({
    where: { email: 'processor@foodsave.org' },
    update: {},
    create: {
      name: 'FreshHarvest Bakery & Prep Facility',
      email: 'processor@foodsave.org',
      passwordHash,
      type: 'FOOD_PROCESSOR',
      latitude: 12.9783,
      longitude: 77.6408,
      address: 'HAL 2nd Stage, Bengaluru, Karnataka 560008',
      contactPhone: '+91 98765 43211',
      capacityKg: 300,
    },
  });

  // 3. Create NGO Receiver 1 (Close proximity ~ 3.5 km)
  const ngo1 = await prisma.organization.upsert({
    where: { email: 'robinhood@foodsave.org' },
    update: {},
    create: {
      name: 'Robin Hood Army - East Bengaluru Chapter',
      email: 'robinhood@foodsave.org',
      passwordHash,
      type: 'NGO',
      latitude: 12.9698,
      longitude: 77.6205,
      address: 'Domlur Community Center, Bengaluru, Karnataka 560071',
      contactPhone: '+91 98765 11111',
      capacityKg: 250,
    },
  });

  // 4. Create NGO Receiver 2 (Medium proximity ~ 7 km)
  const ngo2 = await prisma.organization.upsert({
    where: { email: 'feedingindia@foodsave.org' },
    update: {},
    create: {
      name: 'Feeding India Community Hub',
      email: 'feedingindia@foodsave.org',
      passwordHash,
      type: 'NGO',
      latitude: 12.9352,
      longitude: 77.6245,
      address: 'Koramangala 4th Block, Bengaluru, Karnataka 560034',
      contactPhone: '+91 98765 22222',
      capacityKg: 400,
    },
  });

  // 5. Create Logistics Partner
  const logistics = await prisma.organization.upsert({
    where: { email: 'logistics@foodsave.org' },
    update: {},
    create: {
      name: 'EcoRoute Electric Food Resupply Fleet',
      email: 'logistics@foodsave.org',
      passwordHash,
      type: 'LOGISTICS',
      latitude: 12.9555,
      longitude: 77.6101,
      address: 'Ashok Nagar, Bengaluru, Karnataka 560025',
      contactPhone: '+91 98765 33333',
      capacityKg: 800,
    },
  });

  // 6. Create initial active surplus listings
  const now = new Date();
  
  // Critical urgency: 1.5 hours remaining
  const listing1 = await prisma.surplusListing.create({
    data: {
      donorId: kitchen.id,
      title: 'Cooked Vegetable Biryani & Dal Makhani',
      foodCategory: 'cooked grains',
      quantityKg: 45.0,
      preparedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      safeUntil: new Date(now.getTime() + 1.5 * 60 * 60 * 1000),
      storageCondition: 'HOT',
      status: 'AVAILABLE',
      notes: 'Kept in thermal insulated stainless containers. Ready for immediate pickup.',
    },
  });

  // Moderate urgency: 3.5 hours remaining
  const listing2 = await prisma.surplusListing.create({
    data: {
      donorId: processor.id,
      title: 'Freshly Baked Whole Wheat Loaves & Buns',
      foodCategory: 'baked',
      quantityKg: 30.0,
      preparedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      safeUntil: new Date(now.getTime() + 3.5 * 60 * 60 * 1000),
      storageCondition: 'ROOM_TEMP',
      status: 'AVAILABLE',
      notes: 'Packaged in clean food-grade crates.',
    },
  });

  // Past delivered listing for ESG metric demonstration
  const deliveredListing = await prisma.surplusListing.create({
    data: {
      donorId: kitchen.id,
      title: 'Paneer Butter Masala & Steamed Basmati Rice',
      foodCategory: 'cooked grains',
      quantityKg: 80.0,
      preparedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      safeUntil: new Date(now.getTime() - 42 * 60 * 60 * 1000),
      storageCondition: 'CHILLED',
      status: 'CLAIMED',
      notes: 'Successfully redistributed.',
    },
  });

  await prisma.claimRequest.create({
    data: {
      listingId: deliveredListing.id,
      recipientId: ngo1.id,
      status: 'DELIVERED',
      pickupOtp: '582914',
      qrCodeToken: 'FS-DELIVERED-TEST01',
    },
  });

  // Add historical waste logs for AI forecasting demonstration
  for (let i = 14; i >= 1; i--) {
    const logDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const planned = Math.round((280 + Math.sin(i) * 30 + Math.random() * 20) * 10) / 10;
    const discarded = Math.round((planned * (0.05 + Math.random() * 0.08)) * 10) / 10;
    const consumed = Math.round((planned - discarded) * 10) / 10;

    await prisma.wasteLog.create({
      data: {
        kitchenId: kitchen.id,
        date: logDate,
        plannedKg: planned,
        actualConsumedKg: consumed,
        discardedKg: discarded,
        discardReason: i % 3 === 0 ? 'overproduction' : 'plate waste',
        mealType: 'lunch',
        attendanceCount: Math.round(planned / 0.38),
      },
    });
  }

  console.log('Seed completed successfully!');
  console.log('Sample Logins:');
  console.log('- Kitchen Donor: kitchen@foodsave.org / password123');
  console.log('- NGO Receiver:  robinhood@foodsave.org / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
