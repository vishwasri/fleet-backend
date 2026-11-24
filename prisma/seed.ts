import {
  PrismaClient,
  AccountType,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initializing Fleet Multi-Tenant Real-World Database...');

  // Clean existing data in reverse order of foreign keys
  await prisma.review.deleteMany();
  await prisma.marketplaceBookingRequest.deleteMany();
  await prisma.marketplaceSearchLocation.deleteMany();
  await prisma.marketplaceListing.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.paymentProviderTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.financialTransaction.deleteMany();
  await prisma.vehicleInspectionItem.deleteMany();
  await prisma.vehicleInspection.deleteMany();
  await prisma.inspectionTemplateItem.deleteMany();
  await prisma.inspectionTemplate.deleteMany();
  await prisma.extraCharge.deleteMany();
  await prisma.rentalExtension.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.vehicleDocument.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.partnerRental.deleteMany();
  await prisma.partnerOffer.deleteMany();
  await prisma.partnerRequest.deleteMany();
  await prisma.partnerRelationship.deleteMany();
  await prisma.vehicleBlock.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.marketplaceCustomerProfile.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.vehicleCategory.deleteMany();
  await prisma.organizationSettings.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // ==========================================
  // 0. CREATE VEHICLE CATEGORIES (Dynamic DB)
  // ==========================================
  console.log('Creating vehicle categories in database...');
  const defaultCategories = [
    { name: 'Bike', slug: 'bike', description: 'Motorcycles, scooters, and 2-wheelers', icon: 'two_wheeler', displayOrder: 1 },
    { name: 'Tuk', slug: 'tuk', description: 'Three-wheeler auto rickshaws', icon: 'electric_rickshaw', displayOrder: 2 },
    { name: 'Mini van', slug: 'mini-van', description: 'Compact passenger & cargo mini vans', icon: 'airport_shuttle', displayOrder: 3 },
    { name: 'Hatchback', slug: 'hatchback', description: 'Compact city hatchbacks', icon: 'directions_car', displayOrder: 4 },
    { name: 'Sedan', slug: 'sedan', description: 'Standard 4-door passenger sedans', icon: 'directions_car', displayOrder: 5 },
    { name: 'SUV', slug: 'suv', description: 'Sport utility vehicles & 4x4s', icon: 'directions_car', displayOrder: 6 },
    { name: 'Luxury', slug: 'luxury', description: 'Premium executive & luxury cars', icon: 'star', displayOrder: 7 },
    { name: 'Electric', slug: 'electric', description: 'All-electric zero-emission vehicles', icon: 'electric_car', displayOrder: 8 },
    { name: 'Van', slug: 'van', description: 'Full-size passenger and cargo vans', icon: 'airport_shuttle', displayOrder: 9 },
    { name: 'Sports', slug: 'sports', description: 'Sports cars & performance coupes', icon: 'sports_motorsports', displayOrder: 10 },
  ];

  for (const cat of defaultCategories) {
    await prisma.vehicleCategory.create({
      data: cat,
    });
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('Fleet2026!Secure', saltRounds);

  // ==========================================
  // 1. CREATE SUPER ADMIN PLATFORM OPERATOR
  // ==========================================
  console.log('Creating SaaS Platform Admin user...');
  const platformAdmin = await prisma.user.create({
    data: {
      email: 'admin@fleetplatform.internal',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+94779990000',
      accountType: AccountType.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('✅ Real-world database initialized successfully:');
  console.log(`   - 10 Vehicle Categories created`);
  console.log(`   - SaaS Platform Super Admin created: ${platformAdmin.email}`);
  console.log(`   - No dummy tenants, vehicles, or bookings. Pure real database.`);
}

main()
  .catch((e) => {
    console.error('❌ Error initializing database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
