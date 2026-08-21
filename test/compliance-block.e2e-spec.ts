import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';
import { DocumentType, VehicleCategory } from '@prisma/client';

describe('Compliance Blocking on Expired Vehicle Documents (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let token = '';
  let orgId = '';
  let vehicleId = '';
  let customerId = '';
  let docId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Register organization
    const res = await request(app.getHttpServer())
      .post('/api/auth/register-organization')
      .send({
        email: `compliance.test.${Date.now()}@rentals.com`,
        password: 'Password123!',
        firstName: 'Compliance',
        lastName: 'Officer',
        legalName: 'Compliance Test Rentals LLC',
        displayName: 'Compliance Rentals',
        organizationEmail: `compliance.test.${Date.now()}@rentals.com`,
        organizationPhone: '+14155557777',
      });

    token = res.body.data.tokens.accessToken;
    orgId = res.body.data.organization.id;

    // Enable compliance blocking in settings
    await request(app.getHttpServer())
      .patch('/api/internal/settings')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        blockBookingsForExpiredInsurance: true,
      });

    // Create vehicle
    const vRes = await request(app.getHttpServer())
      .post('/api/internal/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        registrationNumber: `COMP-${Date.now()}`,
        make: 'Mercedes',
        model: 'C300',
        year: 2023,
        category: VehicleCategory.SEDAN,
        dailyRate: 95.0,
        partnerDailyRate: 70.0,
      });
    vehicleId = vRes.body.data.id;

    // Create customer profile
    const cRes = await request(app.getHttpServer())
      .post('/api/internal/customers')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        firstName: 'Emily',
        lastName: 'Watson',
        phone: '+14155551122',
        email: 'emily.watson@example.com',
        drivingLicenceNumber: 'DL-COMP-101',
      });
    customerId = cRes.body.data.id;

    // Add EXPIRED Insurance document
    const docRes = await request(app.getHttpServer())
      .post('/api/internal/vehicle-documents')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        vehicleId,
        documentType: DocumentType.INSURANCE,
        documentNumber: 'POL-EXPIRED-999',
        expiryDate: '2024-01-01T00:00:00.000Z', // In the past
      });
    docId = docRes.body.data.id;
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.vehicleDocument.deleteMany({ where: { organizationId: orgId } });
      await prisma.booking.deleteMany({ where: { organizationId: orgId } });
      await prisma.vehicle.deleteMany({ where: { organizationId: orgId } });
      await prisma.customerProfile.deleteMany({ where: { organizationId: orgId } });
      await prisma.organization.deleteMany({ where: { id: orgId } });
    }
    await app.close();
  });

  it('1. Should reject booking creation when vehicle insurance is expired', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/internal/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        customerProfileId: customerId,
        vehicleId,
        pickupDateTime: '2026-11-01T10:00:00.000Z',
        returnDateTime: '2026-11-05T10:00:00.000Z',
        pickupLocation: 'Airport',
        returnLocation: 'Airport',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('EXPIRED INSURANCE');
  });

  it('2. Should allow booking creation after insurance is updated to valid future date', async () => {
    // Update document with future expiry date
    await request(app.getHttpServer())
      .patch(`/api/internal/vehicle-documents/${docId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        expiryDate: '2027-12-31T00:00:00.000Z',
      });

    const res = await request(app.getHttpServer())
      .post('/api/internal/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        customerProfileId: customerId,
        vehicleId,
        pickupDateTime: '2026-11-01T10:00:00.000Z',
        returnDateTime: '2026-11-05T10:00:00.000Z',
        pickupLocation: 'Airport',
        returnLocation: 'Airport',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.bookingStatus).toBe('CONFIRMED');
  });
});
