import {
  PrismaClient,
  AccountType,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ALL_TABLES = [
  'reviews',
  'marketplace_booking_requests',
  'marketplace_search_locations',
  'marketplace_listings',
  'message_logs',
  'message_templates',
  'payouts',
  'payment_provider_transactions',
  'payments',
  'financial_transactions',
  'vehicle_inspection_items',
  'vehicle_inspections',
  'inspection_template_items',
  'inspection_templates',
  'extra_charges',
  'rental_extensions',
  'deposits',
  'vehicle_documents',
  'notifications',
  'audit_logs',
  'partner_rentals',
  'partner_offers',
  'partner_requests',
  'partner_relationships',
  'vehicle_blocks',
  'maintenance_records',
  'bookings',
  'customer_profiles',
  'marketplace_customer_profiles',
  'vehicles',
  'branch_locations',
  'vehicle_models',
  'vehicle_makes',
  'vehicle_categories',
  'organization_settings',
  'organization_members',
  'organizations',
  'otp_verifications',
  'users',
];

async function main() {
  console.log('🌱 Clearing existing database data in cloud...');

  // Disable FK checks and truncate all tables
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  for (const table of ALL_TABLES) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
    } catch {
      // Table might not exist or already be empty, continue safely
    }
  }
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('🧹 All database tables cleared successfully.');

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

  console.log('✅ Real-world database reset & initialized successfully:');
  console.log(`   - 10 Vehicle Categories created`);
  console.log(`   - SaaS Platform Super Admin created: ${platformAdmin.email}`);
  console.log(`   - All tenants, bookings, vehicles, and test users cleared.`);
}

main()
  .catch((e) => {
    console.error('❌ Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
