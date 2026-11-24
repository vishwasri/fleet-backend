-- CreateTable: otp_verifications
CREATE TABLE IF NOT EXISTS `otp_verifications` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `otpHash` VARCHAR(255) NOT NULL,
    `purpose` VARCHAR(191) NOT NULL DEFAULT 'LOGIN',
    `expiresAt` DATETIME(3) NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_verifications_phone_purpose_idx`(`phone`, `purpose`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: branch_locations
CREATE TABLE IF NOT EXISTS `branch_locations` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `isAirportHub` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `branch_locations_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: vehicle_makes
CREATE TABLE IF NOT EXISTS `vehicle_makes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vehicle_makes_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: vehicle_models
CREATE TABLE IF NOT EXISTS `vehicle_models` (
    `id` VARCHAR(191) NOT NULL,
    `makeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `defaultSeats` INTEGER NULL DEFAULT 5,
    `defaultFuel` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `vehicle_models_makeId_idx`(`makeId`),
    UNIQUE INDEX `vehicle_models_makeId_name_key`(`makeId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: vehicle_categories
CREATE TABLE IF NOT EXISTS `vehicle_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vehicle_categories_name_key`(`name`),
    UNIQUE INDEX `vehicle_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: users
ALTER TABLE `users`
    ADD COLUMN IF NOT EXISTS `phoneVerifiedAt` DATETIME(3) NULL;

-- AlterTable: organizations
ALTER TABLE `organizations`
    ADD COLUMN IF NOT EXISTS `slug` VARCHAR(191) NULL,
    ADD COLUMN IF NOT EXISTS `status` ENUM('ACTIVE', 'PENDING_SETUP', 'SUSPENDED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS `subscriptionPlan` ENUM('FREE_TRIAL', 'STARTER', 'PRO', 'ENTERPRISE') NOT NULL DEFAULT 'STARTER',
    ADD COLUMN IF NOT EXISTS `maxVehicles` INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN IF NOT EXISTS `maxMembers` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS `billingCycle` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY',
    ADD COLUMN IF NOT EXISTS `planExpiresAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `businessRegNumber` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `taxId` VARCHAR(100) NULL;

-- AlterTable: vehicles
ALTER TABLE `vehicles`
    MODIFY COLUMN `category` VARCHAR(191) NOT NULL,
    ADD COLUMN IF NOT EXISTS `color` VARCHAR(191) NULL DEFAULT 'White',
    ADD COLUMN IF NOT EXISTS `hubLocation` VARCHAR(191) NULL,
    ADD COLUMN IF NOT EXISTS `branchLocationId` VARCHAR(191) NULL,
    ADD COLUMN IF NOT EXISTS `rentalDurationType` VARCHAR(191) NOT NULL DEFAULT 'BOTH',
    ADD COLUMN IF NOT EXISTS `driverAvailability` VARCHAR(191) NOT NULL DEFAULT 'BOTH',
    ADD COLUMN IF NOT EXISTS `dailyMileageLimit` INTEGER NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS `dailyExcessMileageFee` DECIMAL(10, 2) NULL DEFAULT 85.00,
    ADD COLUMN IF NOT EXISTS `monthlyRate` DECIMAL(10, 2) NULL,
    ADD COLUMN IF NOT EXISTS `monthlyMileageLimit` INTEGER NULL DEFAULT 3000,
    ADD COLUMN IF NOT EXISTS `monthlyExcessMileageFee` DECIMAL(10, 2) NULL DEFAULT 75.00,
    ADD COLUMN IF NOT EXISTS `securityDeposit` DECIMAL(10, 2) NULL DEFAULT 50000.00,
    ADD COLUMN IF NOT EXISTS `privatePhotos` JSON NULL;

-- AlterTable: customer_profiles
ALTER TABLE `customer_profiles`
    ADD COLUMN IF NOT EXISTS `nationalIdNumber` VARCHAR(191) NULL,
    ADD COLUMN IF NOT EXISTS `emergencyContact` VARCHAR(191) NULL,
    ADD COLUMN IF NOT EXISTS `avatarUrl` VARCHAR(191) NULL,
    ADD COLUMN IF NOT EXISTS `rating` DECIMAL(3, 2) NULL DEFAULT 5.00,
    ADD COLUMN IF NOT EXISTS `isBlacklisted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS `blacklistReason` TEXT NULL;

-- AlterTable: partner_requests
ALTER TABLE `partner_requests`
    MODIFY COLUMN `vehicleCategory` VARCHAR(191) NOT NULL;
