import {
  PrismaClient,
  AccountType,
  UserStatus,
  OrgRole,
  MemberStatus,
  MarketplaceStatus,
  FuelType,
  TransmissionType,
  VehicleStatus,
  PublicListingStatus,
  BookingSource,
  BookingStatus,
  PaymentStatus,
  TransactionType,
  TransactionCategory,
  MaintenanceStatus,
  VehicleBlockReason,
  PartnerRelationshipStatus,
  PartnerRequestStatus,
  PartnerOfferStatus,
  PartnerRentalStatus,
  MessageChannel,
  InspectionType,
  InspectionCategory,
  VehicleInspectionType,
  InspectionItemStatus,
  DepositStatus,
  DepositType,
  LateReturnRateType,
  DocumentType,
  DocumentStatus,
  ExtraChargeType,
  ExtraChargeStatus,
  NotificationType,
  NotificationPriority,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Fleet Multi-Tenant Database with Operational Features...');

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
  // 1. CREATE USERS
  // ==========================================
  console.log('Creating users...');
  const ownerApex = await prisma.user.create({
    data: {
      email: 'owner@apexrentals.com',
      passwordHash,
      firstName: 'Alexander',
      lastName: 'Pierce',
      phone: '+14155550101',
      accountType: AccountType.BUSINESS_USER,
      status: UserStatus.ACTIVE,
    },
  });

  const staffApex = await prisma.user.create({
    data: {
      email: 'staff@apexrentals.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      phone: '+14155550102',
      accountType: AccountType.BUSINESS_USER,
      status: UserStatus.ACTIVE,
    },
  });

  const ownerMetro = await prisma.user.create({
    data: {
      email: 'owner@metrofleet.com',
      passwordHash,
      firstName: 'Marcus',
      lastName: 'Vance',
      phone: '+12135550201',
      accountType: AccountType.BUSINESS_USER,
      status: UserStatus.ACTIVE,
    },
  });

  const staffMetro = await prisma.user.create({
    data: {
      email: 'staff@metrofleet.com',
      passwordHash,
      firstName: 'Elena',
      lastName: 'Rostova',
      phone: '+12135550202',
      accountType: AccountType.BUSINESS_USER,
      status: UserStatus.ACTIVE,
    },
  });

  const platformAdmin = await prisma.user.create({
    data: {
      email: 'admin@fleetplatform.internal',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      accountType: AccountType.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // ==========================================
  // 2. CREATE ORGANIZATIONS & SETTINGS
  // ==========================================
  console.log('Creating organizations & settings...');
  const apexOrg = await prisma.organization.create({
    data: {
      legalName: 'Apex Premium Fleet Rentals LLC',
      displayName: 'Apex Rentals',
      email: 'contact@apexrentals.com',
      phone: '+14155550100',
      address: '1000 Airport Blvd, Los Angeles, CA 90045',
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      logoUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400',
      description: 'Premier luxury & EV rentals serving Greater Los Angeles and LAX airport.',
      marketplaceStatus: MarketplaceStatus.PUBLISHED,
      acceptsOnlineBookings: true,
      settings: {
        create: {
          currency: 'USD',
          timezone: 'America/Los_Angeles',
          defaultPickupInstructions: 'Meet representative at LAX Terminal 2 curbside pickup zone.',
          defaultReturnInstructions: 'Park in designated Apex Return Bays and drop key in lockbox #4.',
          requireInspectionOnPickup: true,
          requireInspectionOnReturn: true,
          requirePartnerInspectionOnHandover: true,
          requirePartnerInspectionOnReturn: true,
          blockBookingsForExpiredInsurance: true,
          blockBookingsForExpiredRegistration: true,
          blockBookingsForExpiredRequiredDocuments: true,
          documentExpiryAlertDays: 30,
          defaultTaxRate: new Prisma.Decimal(8.5),
          taxInclusive: false,
          defaultDepositType: DepositType.FIXED,
          defaultDepositValue: new Prisma.Decimal(300.0),
          defaultMileageLimitPerDay: 200,
          defaultExtraMileageRate: new Prisma.Decimal(0.35),
          lateReturnGracePeriodMinutes: 60,
          defaultLateReturnRateType: LateReturnRateType.HOURLY,
          defaultLateReturnRate: new Prisma.Decimal(30.0),
        },
      },
    },
  });

  const metroOrg = await prisma.organization.create({
    data: {
      legalName: 'Metro Fleet Logistics & Rentals Inc',
      displayName: 'Metro Fleet',
      email: 'ops@metrofleet.com',
      phone: '+12135550200',
      address: '450 S Grand Ave, Downtown Los Angeles, CA 90071',
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      logoUrl: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?w=400',
      description: 'High-availability commercial and economy fleet provider in DTLA.',
      marketplaceStatus: MarketplaceStatus.PRIVATE,
      acceptsOnlineBookings: false,
      settings: {
        create: {
          currency: 'USD',
          timezone: 'America/Los_Angeles',
          requireInspectionOnPickup: false,
          requireInspectionOnReturn: true,
          blockBookingsForExpiredInsurance: true,
          blockBookingsForExpiredRegistration: true,
          defaultTaxRate: new Prisma.Decimal(9.5),
          taxInclusive: false,
          defaultDepositType: DepositType.FIXED,
          defaultDepositValue: new Prisma.Decimal(250.0),
        },
      },
    },
  });

  // Memberships
  await prisma.organizationMember.createMany({
    data: [
      { organizationId: apexOrg.id, userId: ownerApex.id, role: OrgRole.OWNER },
      { organizationId: apexOrg.id, userId: staffApex.id, role: OrgRole.STAFF },
      { organizationId: metroOrg.id, userId: ownerMetro.id, role: OrgRole.OWNER },
      { organizationId: metroOrg.id, userId: staffMetro.id, role: OrgRole.STAFF },
    ],
  });

  // ==========================================
  // 3. INSPECTION TEMPLATES
  // ==========================================
  console.log('Creating inspection checklist templates...');
  const pickupTemplate = await prisma.inspectionTemplate.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Comprehensive Pickup Inspection',
      inspectionType: InspectionType.PICKUP,
      isDefault: true,
      items: {
        create: [
          { label: 'Front & Rear Bumper Condition', category: InspectionCategory.EXTERIOR, requiresPhoto: true, sortOrder: 1 },
          { label: 'Windshield, Mirrors & Glass', category: InspectionCategory.EXTERIOR, requiresPhoto: false, sortOrder: 2 },
          { label: 'Tire Tread Depth & Pressure', category: InspectionCategory.TYRES, requiresPhoto: false, sortOrder: 3 },
          { label: 'Dashboard Lights & Fuel / Battery Level', category: InspectionCategory.FUEL, requiresPhoto: true, sortOrder: 4 },
          { label: 'Interior Seats & Upholstery Cleanliness', category: InspectionCategory.INTERIOR, requiresPhoto: false, sortOrder: 5 },
          { label: 'Spare Tire, Jack & Tool Kit', category: InspectionCategory.ACCESSORIES, requiresPhoto: false, sortOrder: 6 },
          { label: 'Registration & Insurance Card in Glove Box', category: InspectionCategory.DOCUMENTS, requiresPhoto: false, sortOrder: 7 },
        ],
      },
    },
  });

  const returnTemplate = await prisma.inspectionTemplate.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Standard Return Inspection',
      inspectionType: InspectionType.RETURN,
      isDefault: true,
      items: {
        create: [
          { label: 'Exterior Body Scratches / Dents', category: InspectionCategory.EXTERIOR, requiresPhoto: true, sortOrder: 1 },
          { label: 'Return Fuel / Charge Level vs Pickup', category: InspectionCategory.FUEL, requiresPhoto: true, sortOrder: 2 },
          { label: 'Return Mileage Recording', category: InspectionCategory.OTHER, requiresPhoto: true, sortOrder: 3 },
          { label: 'Interior Cleanliness & Odor', category: InspectionCategory.INTERIOR, requiresPhoto: false, sortOrder: 4 },
          { label: 'Keys, Toll Tag & Accessories Returned', category: InspectionCategory.ACCESSORIES, requiresPhoto: false, sortOrder: 5 },
        ],
      },
    },
  });

  // ==========================================
  // 3.5 CREATE BRANCH LOCATIONS & DEPOTS
  // ==========================================
  console.log('Creating branch locations and parking depots...');
  const apexBranches = [
    { name: 'Colombo Fort Central Depot', code: 'CMB-FORT', city: 'Colombo', address: 'No 45, Lotus Road, Colombo Fort', isAirportHub: false },
    { name: 'BIA Airport Terminal 1 (Katunayake)', code: 'BIA-T1', city: 'Katunayake', address: 'Arrivals Terminal 1 Outer Ring, BIA', isAirportHub: true },
    { name: 'BIA Airport Terminal 2 (Katunayake)', code: 'BIA-T2', city: 'Katunayake', address: 'Terminal 2 Commercial Bay, BIA', isAirportHub: true },
    { name: 'Colombo City West (Bambalapitiya)', code: 'CMB-WEST', city: 'Colombo', address: '220 Galle Road, Bambalapitiya', isAirportHub: false },
    { name: 'Kandy City Central Depot', code: 'KDY-CENTRAL', city: 'Kandy', address: '12 Dalada Veediya, Kandy', isAirportHub: false },
  ];

  for (const b of apexBranches) {
    await prisma.branchLocation.create({
      data: {
        ...b,
        organizationId: apexOrg.id,
      },
    });
  }

  const metroBranches = [
    { name: 'Downtown LA Central Hub', code: 'DTLA-01', city: 'Los Angeles', address: '450 S Grand Ave, Los Angeles, CA', isAirportHub: false },
    { name: 'LAX Airport Depot', code: 'LAX-DEPOT', city: 'Los Angeles', address: '9800 Airport Blvd, Los Angeles, CA', isAirportHub: true },
  ];

  for (const b of metroBranches) {
    await prisma.branchLocation.create({
      data: {
        ...b,
        organizationId: metroOrg.id,
      },
    });
  }

  // ==========================================
  // 4. CREATE VEHICLES & DOCUMENTS
  // ==========================================
  console.log('Creating fleet vehicles and compliance documents...');
  const now = new Date();
  const futureYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const nextMonth = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  const modelY = await prisma.vehicle.create({
    data: {
      organizationId: apexOrg.id,
      registrationNumber: '7XYZ890',
      make: 'Tesla',
      model: 'Model Y Long Range',
      year: 2024,
      category: 'SUV',
      dailyRate: new Prisma.Decimal(125.0),
      partnerDailyRate: new Prisma.Decimal(90.0),
      marketplaceDailyRate: new Prisma.Decimal(135.0),
      mileage: 14200,
      fuelType: FuelType.ELECTRIC,
      transmission: TransmissionType.AUTOMATIC,
      seats: 5,
      status: VehicleStatus.AVAILABLE,
      publicListingStatus: PublicListingStatus.PUBLISHED,
      publicTitle: '2024 Tesla Model Y Long Range AWD',
      publicDescription: 'Enjoy 330 miles of EPA range, Autopilot, and premium connectivity.',
      insuranceExpiryDate: futureYear,
      registrationExpiryDate: futureYear,
      documents: {
        create: [
          {
            organizationId: apexOrg.id,
            documentType: DocumentType.INSURANCE,
            documentNumber: 'POL-TESLA-8822',
            issueDate: new Date('2025-01-01'),
            expiryDate: futureYear,
            status: DocumentStatus.VALID,
            fileUrl: 'https://storage.fleet.app/docs/apex/tesla-insurance.pdf',
            notes: 'Geico Commercial Fleet $1M Combined Single Limit',
          },
          {
            organizationId: apexOrg.id,
            documentType: DocumentType.REGISTRATION,
            documentNumber: 'CA-REG-99104',
            issueDate: new Date('2025-01-01'),
            expiryDate: futureYear,
            status: DocumentStatus.VALID,
            fileUrl: 'https://storage.fleet.app/docs/apex/tesla-reg.pdf',
          },
        ],
      },
    },
  });

  const bmwM3 = await prisma.vehicle.create({
    data: {
      organizationId: apexOrg.id,
      registrationNumber: '8BMW333',
      make: 'BMW',
      model: 'M3 Competition',
      year: 2024,
      category: 'Luxury',
      dailyRate: new Prisma.Decimal(220.0),
      partnerDailyRate: new Prisma.Decimal(165.0),
      marketplaceDailyRate: new Prisma.Decimal(240.0),
      mileage: 8500,
      fuelType: FuelType.PETROL,
      transmission: TransmissionType.AUTOMATIC,
      seats: 5,
      status: VehicleStatus.AVAILABLE,
      publicListingStatus: PublicListingStatus.PUBLISHED,
      publicTitle: '2024 BMW M3 Competition 503HP',
      publicDescription: 'High-performance luxury sports sedan with carbon trim.',
      insuranceExpiryDate: nextMonth, // Expiring soon
      registrationExpiryDate: futureYear,
      documents: {
        create: [
          {
            organizationId: apexOrg.id,
            documentType: DocumentType.INSURANCE,
            documentNumber: 'POL-BMW-4491',
            issueDate: new Date('2024-09-01'),
            expiryDate: nextMonth,
            status: DocumentStatus.EXPIRING_SOON,
            notes: 'Policy renewal notice issued',
          },
        ],
      },
    },
  });

  const camry = await prisma.vehicle.create({
    data: {
      organizationId: metroOrg.id,
      registrationNumber: '6ABC123',
      make: 'Toyota',
      model: 'Camry SE',
      year: 2023,
      category: 'Sedan',
      dailyRate: new Prisma.Decimal(65.0),
      partnerDailyRate: new Prisma.Decimal(45.0),
      mileage: 38000,
      fuelType: FuelType.PETROL,
      transmission: TransmissionType.AUTOMATIC,
      seats: 5,
      status: VehicleStatus.AVAILABLE,
      insuranceExpiryDate: futureYear,
      registrationExpiryDate: futureYear,
    },
  });

  // ==========================================
  // 5. CUSTOMERS & DIRECT BOOKINGS
  // ==========================================
  console.log('Creating customer profiles, bookings, and deposits...');
  const customer1 = await prisma.customerProfile.create({
    data: {
      organizationId: apexOrg.id,
      firstName: 'David',
      lastName: 'Miller',
      phone: '+14155558899',
      email: 'david.miller@gmail.com',
      address: '742 Evergreen Terrace, Pasadena, CA 91101',
      drivingLicenceNumber: 'D88991234-CA',
      licenceExpiryDate: new Date('2028-10-15'),
      notes: 'VIP customer, preferred EV renter.',
    },
  });

  const booking1 = await prisma.booking.create({
    data: {
      organizationId: apexOrg.id,
      customerProfileId: customer1.id,
      vehicleId: modelY.id,
      bookingSource: BookingSource.INTERNAL,
      bookingNumber: 'DIR-2026-10001',
      pickupDateTime: new Date('2026-09-01T10:00:00.000Z'),
      returnDateTime: new Date('2026-09-05T10:00:00.000Z'),
      pickupLocation: 'LAX Airport Terminal 2',
      returnLocation: 'LAX Airport Terminal 2',
      dailyRate: new Prisma.Decimal(125.0),
      numberOfDays: 4,
      subtotal: new Prisma.Decimal(500.0),
      discountAmount: new Prisma.Decimal(0.0),
      depositAmount: new Prisma.Decimal(300.0),
      totalAmount: new Prisma.Decimal(500.0),
      paidAmount: new Prisma.Decimal(500.0),
      balanceAmount: new Prisma.Decimal(0.0),
      paymentStatus: PaymentStatus.PAID,
      bookingStatus: BookingStatus.CONFIRMED,
      notes: 'Flight UA821 arriving at 9:30 AM',
    },
  });

  // Dedicated Deposit for booking1
  const deposit1 = await prisma.deposit.create({
    data: {
      organizationId: apexOrg.id,
      bookingId: booking1.id,
      amount: new Prisma.Decimal(300.0),
      currency: 'USD',
      status: DepositStatus.RECEIVED,
      receivedAt: new Date('2026-09-01T10:00:00.000Z'),
      paymentMethod: 'CREDIT_CARD_AUTH',
      reference: 'AUTH-PRE-9921',
      notes: 'Pre-authorized security deposit held on Visa ending in 4242',
    },
  });

  // ==========================================
  // 6. B2B PARTNER NETWORK & RENTALS
  // ==========================================
  console.log('Establishing B2B partner network...');
  await prisma.partnerRelationship.create({
    data: {
      requestingOrganizationId: apexOrg.id,
      supplyingOrganizationId: metroOrg.id,
      status: PartnerRelationshipStatus.ACTIVE,
      invitedByOrganizationId: apexOrg.id,
      notes: 'B2B fleet cross-supply partner agreement active.',
    },
  });

  // Partner Request
  const partnerReq = await prisma.partnerRequest.create({
    data: {
      requestingOrganizationId: apexOrg.id,
      vehicleCategory: 'Sedan',
      targetWholesaleRate: new Prisma.Decimal(50.0),
      pickupDateTime: new Date('2026-09-10T09:00:00.000Z'),
      returnDateTime: new Date('2026-09-14T09:00:00.000Z'),
      pickupLocation: 'Downtown LA Hub',
      returnLocation: 'Downtown LA Hub',
      notes: 'Need clean sedan for corporate client overflow.',
      status: PartnerRequestStatus.FULFILLED,
    },
  });

  const partnerOffer = await prisma.partnerOffer.create({
    data: {
      requestId: partnerReq.id,
      supplyingOrganizationId: metroOrg.id,
      vehicleId: camry.id,
      dailyRate: new Prisma.Decimal(45.0),
      depositAmount: new Prisma.Decimal(200.0),
      totalAmount: new Prisma.Decimal(180.0),
      status: PartnerOfferStatus.ACCEPTED,
      notes: 'Camry SE ready with full tank and clean interior.',
    },
  });

  const partnerRental = await prisma.partnerRental.create({
    data: {
      supplyingOrganizationId: metroOrg.id,
      requestingOrganizationId: apexOrg.id,
      vehicleId: camry.id,
      offerId: partnerOffer.id,
      partnerDailyRate: new Prisma.Decimal(45.0),
      numberOfDays: 4,
      subtotal: new Prisma.Decimal(180.0),
      depositAmount: new Prisma.Decimal(200.0),
      totalAmount: new Prisma.Decimal(180.0),
      paidAmount: new Prisma.Decimal(180.0),
      balanceAmount: new Prisma.Decimal(0.0),
      paymentStatus: PaymentStatus.PAID,
      status: PartnerRentalStatus.ACCEPTED,
      handoverDateTime: new Date('2026-09-10T09:00:00.000Z'),
      returnDateTime: new Date('2026-09-14T09:00:00.000Z'),
      pickupLocation: 'Downtown LA Hub',
      returnLocation: 'Downtown LA Hub',
    },
  });

  // ==========================================
  // 7. NOTIFICATIONS & AUDIT LOGS
  // ==========================================
  console.log('Creating in-app notifications and audit logs...');
  await prisma.notification.createMany({
    data: [
      {
        organizationId: apexOrg.id,
        type: NotificationType.DOCUMENT_EXPIRING,
        title: 'Insurance Expiring Soon: 2024 BMW M3',
        body: 'Policy #POL-BMW-4491 expires within 30 days. Please renew to prevent booking blocks.',
        entityType: 'VehicleDocument',
        priority: NotificationPriority.HIGH,
      },
      {
        organizationId: apexOrg.id,
        type: NotificationType.PICKUP_DUE,
        title: 'Pickup Due: Booking #DIR-2026-10001',
        body: 'David Miller scheduled for pickup at LAX Airport Terminal 2.',
        entityType: 'Booking',
        entityId: booking1.id,
        priority: NotificationPriority.NORMAL,
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      organizationId: apexOrg.id,
      actorUserId: ownerApex.id,
      action: 'SEED_INITIAL_CONFIG',
      entityType: 'OrganizationSettings',
      entityId: apexOrg.id,
      newValue: JSON.stringify({ status: 'CONFIGURED' }),
    },
  });

  console.log('✅ Seed completed successfully with full operational models!');
  console.log('----------------------------------------------------');
  console.log('🏢 Apex Rentals (PUBLISHED):');
  console.log('   Owner: owner@apexrentals.com | Pass: Fleet2026!Secure');
  console.log('   Staff: staff@apexrentals.com | Pass: Fleet2026!Secure');
  console.log('🏢 Metro Fleet (PRIVATE):');
  console.log('   Owner: owner@metrofleet.com  | Pass: Fleet2026!Secure');
  console.log('   Staff: staff@metrofleet.com  | Pass: Fleet2026!Secure');
  console.log('👑 Platform Admin:');
  console.log('   Email: admin@fleetplatform.internal | Pass: Fleet2026!Secure');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
