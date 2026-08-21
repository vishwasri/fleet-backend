-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `cancellationFeeAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `cancellationReason` TEXT NULL,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `cancelledByUserId` VARCHAR(191) NULL,
    ADD COLUMN `noShowAt` DATETIME(3) NULL,
    ADD COLUMN `noShowFeeAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `refundableAmount` DECIMAL(10, 2) NULL,
    MODIFY `bookingStatus` ENUM('DRAFT', 'PENDING_APPROVAL', 'CONFIRMED', 'PICKED_UP', 'ACTIVE', 'RETURNED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE `financial_transactions` MODIFY `category` ENUM('DIRECT_RENTAL', 'MARKETPLACE_RENTAL', 'PARTNER_RENTAL', 'DEPOSIT', 'DEPOSIT_DEDUCTION', 'DEPOSIT_FORFEIT', 'EXTRA_CHARGE', 'CANCELLATION_FEE', 'NO_SHOW_FEE', 'OTHER_INCOME', 'DEPOSIT_REFUND', 'REFUND', 'FUEL', 'REPAIR', 'INSURANCE', 'CLEANING', 'FINE', 'LEASING', 'MAINTENANCE', 'OTHER_EXPENSE') NOT NULL;

-- AlterTable
ALTER TABLE `partner_rentals` ADD COLUMN `cancellationReason` TEXT NULL,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `organization_settings` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `defaultPickupInstructions` TEXT NULL,
    `defaultReturnInstructions` TEXT NULL,
    `defaultRentalAgreementText` TEXT NULL,
    `requireInspectionOnPickup` BOOLEAN NOT NULL DEFAULT false,
    `requireInspectionOnReturn` BOOLEAN NOT NULL DEFAULT true,
    `requirePartnerInspectionOnHandover` BOOLEAN NOT NULL DEFAULT false,
    `requirePartnerInspectionOnReturn` BOOLEAN NOT NULL DEFAULT true,
    `allowBookingWithUnpaidBalance` BOOLEAN NOT NULL DEFAULT true,
    `allowOverbooking` BOOLEAN NOT NULL DEFAULT false,
    `blockBookingsForExpiredInsurance` BOOLEAN NOT NULL DEFAULT true,
    `blockBookingsForExpiredRegistration` BOOLEAN NOT NULL DEFAULT true,
    `blockBookingsForExpiredRequiredDocuments` BOOLEAN NOT NULL DEFAULT false,
    `documentExpiryAlertDays` INTEGER NOT NULL DEFAULT 30,
    `defaultTaxRate` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `taxInclusive` BOOLEAN NOT NULL DEFAULT false,
    `defaultDepositType` ENUM('FIXED', 'PERCENTAGE', 'NONE') NOT NULL DEFAULT 'FIXED',
    `defaultDepositValue` DECIMAL(10, 2) NOT NULL DEFAULT 200.00,
    `defaultMileageLimitPerDay` INTEGER NULL,
    `defaultExtraMileageRate` DECIMAL(10, 2) NULL,
    `lateReturnGracePeriodMinutes` INTEGER NOT NULL DEFAULT 60,
    `defaultLateReturnRateType` ENUM('HOURLY', 'DAILY') NOT NULL DEFAULT 'HOURLY',
    `defaultLateReturnRate` DECIMAL(10, 2) NULL,
    `futureMarketplaceInstantBookingEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_settings_organizationId_key`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_documents` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `documentType` ENUM('INSURANCE', 'REGISTRATION', 'REVENUE_LICENSE', 'EMISSION_TEST', 'OTHER') NOT NULL,
    `documentNumber` VARCHAR(191) NULL,
    `issueDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `fileUrl` VARCHAR(500) NULL,
    `status` ENUM('VALID', 'EXPIRING_SOON', 'EXPIRED', 'NOT_REQUIRED') NOT NULL DEFAULT 'VALID',
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vehicle_documents_organizationId_idx`(`organizationId`),
    INDEX `vehicle_documents_vehicleId_idx`(`vehicleId`),
    INDEX `vehicle_documents_documentType_idx`(`documentType`),
    INDEX `vehicle_documents_expiryDate_idx`(`expiryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deposits` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `partnerRentalId` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'RECEIVED', 'HELD', 'PARTIALLY_DEDUCTED', 'FULLY_DEDUCTED', 'REFUNDED', 'FORFEITED') NOT NULL DEFAULT 'PENDING',
    `receivedAt` DATETIME(3) NULL,
    `refundedAt` DATETIME(3) NULL,
    `deductedAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `refundAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `paymentMethod` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `deposits_organizationId_idx`(`organizationId`),
    INDEX `deposits_bookingId_idx`(`bookingId`),
    INDEX `deposits_partnerRentalId_idx`(`partnerRentalId`),
    INDEX `deposits_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rental_extensions` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `partnerRentalId` VARCHAR(191) NULL,
    `previousReturnDateTime` DATETIME(3) NOT NULL,
    `newReturnDateTime` DATETIME(3) NOT NULL,
    `additionalDailyRate` DECIMAL(10, 2) NOT NULL,
    `additionalAmount` DECIMAL(10, 2) NOT NULL,
    `reason` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `approvedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rental_extensions_organizationId_idx`(`organizationId`),
    INDEX `rental_extensions_bookingId_idx`(`bookingId`),
    INDEX `rental_extensions_partnerRentalId_idx`(`partnerRentalId`),
    INDEX `rental_extensions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `extra_charges` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `partnerRentalId` VARCHAR(191) NULL,
    `type` ENUM('LATE_RETURN', 'EXTRA_MILEAGE', 'FUEL_SHORTAGE', 'CLEANING', 'DAMAGE', 'DELIVERY', 'COLLECTION', 'DRIVER', 'FINE', 'OTHER') NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 2) NULL DEFAULT 1.00,
    `unitAmount` DECIMAL(10, 2) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `taxAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('PENDING', 'APPROVED', 'WAIVED', 'PAID') NOT NULL DEFAULT 'PENDING',
    `chargedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdByUserId` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `attachmentUrls` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `extra_charges_organizationId_idx`(`organizationId`),
    INDEX `extra_charges_bookingId_idx`(`bookingId`),
    INDEX `extra_charges_partnerRentalId_idx`(`partnerRentalId`),
    INDEX `extra_charges_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspection_templates` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `inspectionType` ENUM('PICKUP', 'RETURN', 'HANDOVER', 'PARTNER_RETURN') NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inspection_templates_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspection_template_items` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `category` ENUM('EXTERIOR', 'INTERIOR', 'TYRES', 'FUEL', 'DOCUMENTS', 'ACCESSORIES', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `requiresPhoto` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `inspection_template_items_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_inspections` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `partnerRentalId` VARCHAR(191) NULL,
    `type` ENUM('DIRECT_PICKUP', 'DIRECT_RETURN', 'PARTNER_HANDOVER', 'PARTNER_RETURN') NOT NULL,
    `inspectedByUserId` VARCHAR(191) NOT NULL,
    `inspectionDateTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mileage` INTEGER NOT NULL,
    `fuelLevel` VARCHAR(191) NOT NULL,
    `overallCondition` VARCHAR(191) NOT NULL DEFAULT 'GOOD',
    `customerSignatureUrl` VARCHAR(500) NULL,
    `staffSignatureUrl` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vehicle_inspections_organizationId_idx`(`organizationId`),
    INDEX `vehicle_inspections_vehicleId_idx`(`vehicleId`),
    INDEX `vehicle_inspections_bookingId_idx`(`bookingId`),
    INDEX `vehicle_inspections_partnerRentalId_idx`(`partnerRentalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_inspection_items` (
    `id` VARCHAR(191) NOT NULL,
    `inspectionId` VARCHAR(191) NOT NULL,
    `templateItemId` VARCHAR(191) NULL,
    `label` VARCHAR(191) NOT NULL,
    `status` ENUM('GOOD', 'DAMAGED', 'MISSING', 'NOT_APPLICABLE') NOT NULL DEFAULT 'GOOD',
    `notes` TEXT NULL,
    `photoUrls` JSON NULL,

    INDEX `vehicle_inspection_items_inspectionId_idx`(`inspectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `previousValue` JSON NULL,
    `newValue` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_organizationId_idx`(`organizationId`),
    INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `audit_logs_actorUserId_idx`(`actorUserId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `type` ENUM('PICKUP_DUE', 'RETURN_DUE', 'RENTAL_OVERDUE', 'PAYMENT_OVERDUE', 'MAINTENANCE_DUE', 'DOCUMENT_EXPIRING', 'DOCUMENT_EXPIRED', 'PARTNER_REQUEST_RECEIVED', 'PARTNER_OFFER_RECEIVED', 'PARTNER_RENTAL_HANDOVER_DUE', 'PARTNER_SETTLEMENT_DUE', 'DEPOSIT_ACTION_REQUIRED') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_organizationId_idx`(`organizationId`),
    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_type_idx`(`type`),
    INDEX `notifications_readAt_idx`(`readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organization_settings` ADD CONSTRAINT `organization_settings_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_documents` ADD CONSTRAINT `vehicle_documents_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_documents` ADD CONSTRAINT `vehicle_documents_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposits` ADD CONSTRAINT `deposits_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposits` ADD CONSTRAINT `deposits_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposits` ADD CONSTRAINT `deposits_partnerRentalId_fkey` FOREIGN KEY (`partnerRentalId`) REFERENCES `partner_rentals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_extensions` ADD CONSTRAINT `rental_extensions_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_extensions` ADD CONSTRAINT `rental_extensions_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_extensions` ADD CONSTRAINT `rental_extensions_partnerRentalId_fkey` FOREIGN KEY (`partnerRentalId`) REFERENCES `partner_rentals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extra_charges` ADD CONSTRAINT `extra_charges_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extra_charges` ADD CONSTRAINT `extra_charges_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extra_charges` ADD CONSTRAINT `extra_charges_partnerRentalId_fkey` FOREIGN KEY (`partnerRentalId`) REFERENCES `partner_rentals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspection_templates` ADD CONSTRAINT `inspection_templates_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspection_template_items` ADD CONSTRAINT `inspection_template_items_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `inspection_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_inspections` ADD CONSTRAINT `vehicle_inspections_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_inspections` ADD CONSTRAINT `vehicle_inspections_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_inspections` ADD CONSTRAINT `vehicle_inspections_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_inspections` ADD CONSTRAINT `vehicle_inspections_partnerRentalId_fkey` FOREIGN KEY (`partnerRentalId`) REFERENCES `partner_rentals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_inspection_items` ADD CONSTRAINT `vehicle_inspection_items_inspectionId_fkey` FOREIGN KEY (`inspectionId`) REFERENCES `vehicle_inspections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
