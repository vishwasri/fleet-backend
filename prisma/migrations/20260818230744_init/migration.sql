-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `accountType` ENUM('BUSINESS_USER', 'CUSTOMER', 'PLATFORM_ADMIN') NOT NULL DEFAULT 'BUSINESS_USER',
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `emailVerifiedAt` DATETIME(3) NULL,
    `phoneVerifiedAt` DATETIME(3) NULL,
    `refreshTokenHash` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizations` (
    `id` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `logoUrl` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `marketplaceStatus` ENUM('PRIVATE', 'PENDING_REVIEW', 'PUBLISHED', 'SUSPENDED') NOT NULL DEFAULT 'PRIVATE',
    `acceptsOnlineBookings` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_members` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'STAFF', 'VIEWER') NOT NULL DEFAULT 'STAFF',
    `status` ENUM('ACTIVE', 'INVITED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `organization_members_userId_idx`(`userId`),
    INDEX `organization_members_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `organization_members_organizationId_userId_key`(`organizationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `registrationNumber` VARCHAR(191) NOT NULL,
    `make` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `category` ENUM('SEDAN', 'SUV', 'HATCHBACK', 'COUPE', 'CONVERTIBLE', 'VAN', 'TRUCK', 'LUXURY', 'ELECTRIC', 'OTHER') NOT NULL,
    `dailyRate` DECIMAL(10, 2) NOT NULL,
    `partnerDailyRate` DECIMAL(10, 2) NOT NULL,
    `mileage` INTEGER NOT NULL DEFAULT 0,
    `fuelType` ENUM('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'OTHER') NOT NULL DEFAULT 'PETROL',
    `transmission` ENUM('AUTOMATIC', 'MANUAL') NOT NULL DEFAULT 'AUTOMATIC',
    `seats` INTEGER NOT NULL DEFAULT 5,
    `status` ENUM('AVAILABLE', 'DIRECT_RENTAL', 'PARTNER_RENTAL', 'MAINTENANCE', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
    `publicListingStatus` ENUM('DRAFT', 'PUBLISHED', 'UNLISTED') NOT NULL DEFAULT 'DRAFT',
    `publicTitle` VARCHAR(191) NULL,
    `publicDescription` TEXT NULL,
    `publicPhotos` JSON NULL,
    `marketplaceDailyRate` DECIMAL(10, 2) NULL,
    `minimumRentalDays` INTEGER NULL DEFAULT 1,
    `insuranceExpiryDate` DATETIME(3) NULL,
    `registrationExpiryDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `privatePhotos` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vehicles_organizationId_idx`(`organizationId`),
    INDEX `vehicles_status_idx`(`status`),
    INDEX `vehicles_publicListingStatus_idx`(`publicListingStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `drivingLicenceNumber` VARCHAR(191) NOT NULL,
    `licenceExpiryDate` DATETIME(3) NULL,
    `documents` JSON NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_profiles_organizationId_idx`(`organizationId`),
    INDEX `customer_profiles_phone_idx`(`phone`),
    INDEX `customer_profiles_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketplace_customer_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `preferredContactMethod` VARCHAR(191) NULL,
    `savedDrivers` JSON NULL,
    `preferences` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `marketplace_customer_profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `customerProfileId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `bookingSource` ENUM('INTERNAL', 'MARKETPLACE', 'PARTNER') NOT NULL DEFAULT 'INTERNAL',
    `bookingNumber` VARCHAR(191) NOT NULL,
    `pickupDateTime` DATETIME(3) NOT NULL,
    `returnDateTime` DATETIME(3) NOT NULL,
    `pickupLocation` VARCHAR(191) NOT NULL,
    `returnLocation` VARCHAR(191) NOT NULL,
    `dailyRate` DECIMAL(10, 2) NOT NULL,
    `numberOfDays` INTEGER NOT NULL,
    `discountAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `depositAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `paidAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `balanceAmount` DECIMAL(10, 2) NOT NULL,
    `paymentStatus` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'OVERDUE') NOT NULL DEFAULT 'UNPAID',
    `bookingStatus` ENUM('DRAFT', 'PENDING_APPROVAL', 'CONFIRMED', 'PICKED_UP', 'ACTIVE', 'RETURNED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    `notes` TEXT NULL,
    `pickupMileage` INTEGER NULL,
    `returnMileage` INTEGER NULL,
    `pickupFuelLevel` VARCHAR(191) NULL,
    `returnFuelLevel` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_bookingNumber_key`(`bookingNumber`),
    INDEX `bookings_organizationId_idx`(`organizationId`),
    INDEX `bookings_vehicleId_idx`(`vehicleId`),
    INDEX `bookings_customerProfileId_idx`(`customerProfileId`),
    INDEX `bookings_bookingStatus_idx`(`bookingStatus`),
    INDEX `bookings_pickupDateTime_returnDateTime_idx`(`pickupDateTime`, `returnDateTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_records` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `completedDate` DATETIME(3) NULL,
    `cost` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `notes` TEXT NULL,
    `attachments` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `maintenance_records_organizationId_idx`(`organizationId`),
    INDEX `maintenance_records_vehicleId_idx`(`vehicleId`),
    INDEX `maintenance_records_scheduledDate_idx`(`scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_blocks` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `reason` ENUM('MAINTENANCE', 'OWNER_USE', 'OTHER') NOT NULL DEFAULT 'MAINTENANCE',
    `startDateTime` DATETIME(3) NOT NULL,
    `endDateTime` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vehicle_blocks_organizationId_idx`(`organizationId`),
    INDEX `vehicle_blocks_vehicleId_idx`(`vehicleId`),
    INDEX `vehicle_blocks_startDateTime_endDateTime_idx`(`startDateTime`, `endDateTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_relationships` (
    `id` VARCHAR(191) NOT NULL,
    `requestingOrganizationId` VARCHAR(191) NOT NULL,
    `supplyingOrganizationId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'DECLINED', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    `invitedByOrganizationId` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `partner_relationships_requestingOrganizationId_idx`(`requestingOrganizationId`),
    INDEX `partner_relationships_supplyingOrganizationId_idx`(`supplyingOrganizationId`),
    UNIQUE INDEX `partner_relationships_requestingOrganizationId_supplyingOrga_key`(`requestingOrganizationId`, `supplyingOrganizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_requests` (
    `id` VARCHAR(191) NOT NULL,
    `requestingOrganizationId` VARCHAR(191) NOT NULL,
    `vehicleCategory` ENUM('SEDAN', 'SUV', 'HATCHBACK', 'COUPE', 'CONVERTIBLE', 'VAN', 'TRUCK', 'LUXURY', 'ELECTRIC', 'OTHER') NOT NULL,
    `targetWholesaleRate` DECIMAL(10, 2) NOT NULL,
    `pickupDateTime` DATETIME(3) NOT NULL,
    `returnDateTime` DATETIME(3) NOT NULL,
    `pickupLocation` VARCHAR(191) NOT NULL,
    `returnLocation` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `status` ENUM('OPEN', 'OFFERS_RECEIVED', 'FULFILLED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `partner_requests_requestingOrganizationId_idx`(`requestingOrganizationId`),
    INDEX `partner_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_offers` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `supplyingOrganizationId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `dailyRate` DECIMAL(10, 2) NOT NULL,
    `depositAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `validUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `partner_offers_requestId_idx`(`requestId`),
    INDEX `partner_offers_supplyingOrganizationId_idx`(`supplyingOrganizationId`),
    INDEX `partner_offers_vehicleId_idx`(`vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_rentals` (
    `id` VARCHAR(191) NOT NULL,
    `supplyingOrganizationId` VARCHAR(191) NOT NULL,
    `requestingOrganizationId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NULL,
    `partnerDailyRate` DECIMAL(10, 2) NOT NULL,
    `numberOfDays` INTEGER NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `depositAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `paidAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `balanceAmount` DECIMAL(10, 2) NOT NULL,
    `paymentStatus` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'OVERDUE') NOT NULL DEFAULT 'UNPAID',
    `status` ENUM('ACCEPTED', 'HANDED_OVER', 'ACTIVE', 'RETURNED', 'SETTLED', 'CANCELLED') NOT NULL DEFAULT 'ACCEPTED',
    `handoverDateTime` DATETIME(3) NOT NULL,
    `returnDateTime` DATETIME(3) NOT NULL,
    `pickupLocation` VARCHAR(191) NOT NULL,
    `returnLocation` VARCHAR(191) NOT NULL,
    `handoverMileage` INTEGER NULL,
    `returnMileage` INTEGER NULL,
    `handoverFuelLevel` VARCHAR(191) NULL,
    `returnFuelLevel` VARCHAR(191) NULL,
    `handoverPhotos` JSON NULL,
    `returnPhotos` JSON NULL,
    `damageNotes` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `partner_rentals_supplyingOrganizationId_idx`(`supplyingOrganizationId`),
    INDEX `partner_rentals_requestingOrganizationId_idx`(`requestingOrganizationId`),
    INDEX `partner_rentals_vehicleId_idx`(`vehicleId`),
    INDEX `partner_rentals_status_idx`(`status`),
    INDEX `partner_rentals_handoverDateTime_returnDateTime_idx`(`handoverDateTime`, `returnDateTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `partnerRentalId` VARCHAR(191) NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `category` ENUM('DIRECT_RENTAL', 'MARKETPLACE_RENTAL', 'PARTNER_RENTAL', 'DEPOSIT', 'REFUND', 'OTHER_INCOME', 'FUEL', 'REPAIR', 'INSURANCE', 'CLEANING', 'FINE', 'LEASING', 'MAINTENANCE', 'OTHER_EXPENSE') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `transactionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paymentMethod` VARCHAR(191) NOT NULL DEFAULT 'CASH',
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `attachmentUrl` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `financial_transactions_organizationId_idx`(`organizationId`),
    INDEX `financial_transactions_vehicleId_idx`(`vehicleId`),
    INDEX `financial_transactions_bookingId_idx`(`bookingId`),
    INDEX `financial_transactions_partnerRentalId_idx`(`partnerRentalId`),
    INDEX `financial_transactions_type_category_idx`(`type`, `category`),
    INDEX `financial_transactions_transactionDate_idx`(`transactionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `partnerRentalId` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `paymentMethod` VARCHAR(191) NOT NULL,
    `transactionReference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payments_organizationId_idx`(`organizationId`),
    INDEX `payments_bookingId_idx`(`bookingId`),
    INDEX `payments_partnerRentalId_idx`(`partnerRentalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_provider_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerTransactionId` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payment_provider_transactions_paymentId_idx`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payouts` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payouts_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_templates` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `channel` ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,
    `subject` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `variables` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `message_templates_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_logs` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `customerProfileId` VARCHAR(191) NULL,
    `partnerRentalId` VARCHAR(191) NULL,
    `channel` ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('QUEUED', 'SENT', 'DELIVERED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `providerMessageId` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `message_logs_organizationId_idx`(`organizationId`),
    INDEX `message_logs_bookingId_idx`(`bookingId`),
    INDEX `message_logs_customerProfileId_idx`(`customerProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketplace_listings` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UNLISTED') NOT NULL DEFAULT 'DRAFT',
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `publicPhotos` JSON NULL,
    `dailyRate` DECIMAL(10, 2) NOT NULL,
    `terms` TEXT NULL,
    `cancellationPolicy` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `marketplace_listings_vehicleId_key`(`vehicleId`),
    INDEX `marketplace_listings_organizationId_idx`(`organizationId`),
    INDEX `marketplace_listings_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketplace_search_locations` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'USA',
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `radiusKm` INTEGER NOT NULL DEFAULT 50,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `marketplace_search_locations_organizationId_idx`(`organizationId`),
    INDEX `marketplace_search_locations_city_idx`(`city`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketplace_booking_requests` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `pickupDateTime` DATETIME(3) NOT NULL,
    `returnDateTime` DATETIME(3) NOT NULL,
    `quotedPrice` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONFIRMED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `marketplace_booking_requests_userId_idx`(`userId`),
    INDEX `marketplace_booking_requests_listingId_idx`(`listingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reviews_organizationId_idx`(`organizationId`),
    INDEX `reviews_vehicleId_idx`(`vehicleId`),
    INDEX `reviews_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_profiles` ADD CONSTRAINT `customer_profiles_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_customer_profiles` ADD CONSTRAINT `marketplace_customer_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_customerProfileId_fkey` FOREIGN KEY (`customerProfileId`) REFERENCES `customer_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_blocks` ADD CONSTRAINT `vehicle_blocks_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_blocks` ADD CONSTRAINT `vehicle_blocks_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_relationships` ADD CONSTRAINT `partner_relationships_requestingOrganizationId_fkey` FOREIGN KEY (`requestingOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_relationships` ADD CONSTRAINT `partner_relationships_supplyingOrganizationId_fkey` FOREIGN KEY (`supplyingOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_requests` ADD CONSTRAINT `partner_requests_requestingOrganizationId_fkey` FOREIGN KEY (`requestingOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_offers` ADD CONSTRAINT `partner_offers_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `partner_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_offers` ADD CONSTRAINT `partner_offers_supplyingOrganizationId_fkey` FOREIGN KEY (`supplyingOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_offers` ADD CONSTRAINT `partner_offers_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_rentals` ADD CONSTRAINT `partner_rentals_supplyingOrganizationId_fkey` FOREIGN KEY (`supplyingOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_rentals` ADD CONSTRAINT `partner_rentals_requestingOrganizationId_fkey` FOREIGN KEY (`requestingOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_rentals` ADD CONSTRAINT `partner_rentals_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_rentals` ADD CONSTRAINT `partner_rentals_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `partner_offers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_partnerRentalId_fkey` FOREIGN KEY (`partnerRentalId`) REFERENCES `partner_rentals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_partnerRentalId_fkey` FOREIGN KEY (`partnerRentalId`) REFERENCES `partner_rentals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_provider_transactions` ADD CONSTRAINT `payment_provider_transactions_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payouts` ADD CONSTRAINT `payouts_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_customerProfileId_fkey` FOREIGN KEY (`customerProfileId`) REFERENCES `customer_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_partnerRentalId_fkey` FOREIGN KEY (`partnerRentalId`) REFERENCES `partner_rentals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_listings` ADD CONSTRAINT `marketplace_listings_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_listings` ADD CONSTRAINT `marketplace_listings_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_search_locations` ADD CONSTRAINT `marketplace_search_locations_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_booking_requests` ADD CONSTRAINT `marketplace_booking_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_booking_requests` ADD CONSTRAINT `marketplace_booking_requests_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `marketplace_listings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
