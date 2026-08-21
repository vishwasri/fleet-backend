import { Test, TestingModule } from '@nestjs/testing';
import { VehicleDocumentsService } from './vehicle-documents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AuditLogService } from '../audit/audit-log.service';
import { DocumentStatus, DocumentType } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

describe('VehicleDocumentsService', () => {
  let service: VehicleDocumentsService;
  let prismaMock: any;
  let settingsMock: any;

  beforeEach(async () => {
    prismaMock = {
      vehicle: {
        findFirst: jest.fn(),
      },
    };

    settingsMock = {
      getSettings: jest.fn().mockResolvedValue({
        blockBookingsForExpiredInsurance: true,
        blockBookingsForExpiredRegistration: true,
        blockBookingsForExpiredRequiredDocuments: false,
        documentExpiryAlertDays: 30,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleDocumentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SettingsService, useValue: settingsMock },
        { provide: AuditLogService, useValue: { logEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get<VehicleDocumentsService>(VehicleDocumentsService);
  });

  it('should classify expired, expiring soon, and valid document statuses', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const soonDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    const farDate = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);

    expect(service.calculateDocumentStatus(pastDate, 30)).toBe(DocumentStatus.EXPIRED);
    expect(service.calculateDocumentStatus(soonDate, 30)).toBe(DocumentStatus.EXPIRING_SOON);
    expect(service.calculateDocumentStatus(farDate, 30)).toBe(DocumentStatus.VALID);
  });

  it('should block vehicle when insurance is expired under active compliance policy', async () => {
    const pastDate = new Date(Date.now() - 100000);
    prismaMock.vehicle.findFirst.mockResolvedValue({
      id: 'v-1',
      make: 'Tesla',
      model: 'Model Y',
      registrationNumber: '7XYZ890',
      documents: [
        {
          documentType: DocumentType.INSURANCE,
          expiryDate: pastDate,
          isArchived: false,
        },
      ],
    });

    await expect(service.assertVehicleCompliant('org-1', 'v-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('should pass compliance check when documents are valid', async () => {
    const futureDate = new Date(Date.now() + 1000000000);
    prismaMock.vehicle.findFirst.mockResolvedValue({
      id: 'v-1',
      make: 'Tesla',
      model: 'Model Y',
      registrationNumber: '7XYZ890',
      documents: [
        {
          documentType: DocumentType.INSURANCE,
          expiryDate: futureDate,
          isArchived: false,
        },
        {
          documentType: DocumentType.REGISTRATION,
          expiryDate: futureDate,
          isArchived: false,
        },
      ],
    });

    await expect(service.assertVehicleCompliant('org-1', 'v-1')).resolves.not.toThrow();
  });
});
