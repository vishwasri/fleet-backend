import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';
import { VehicleCategory } from '@prisma/client';

describe('Booking Conflict Prevention & Availability Engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let token = '';
  let orgId = '';
  let vehicleId = '';
  let customerId = '';

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
        email: `conflict.test.${Date.now()}@rentals.com`,
        password: 'Password123!',
        firstName: 'Conflict',
        lastName: 'Tester',
        legalName: 'Conflict Test Rentals LLC',
        displayName: 'Conflict Test',
        organizationEmail: `conflict.test.${Date.now()}@rentals.com`,
        organizationPhone: '+14155553333',
      });

    if (res.status === 201) {
      token = res.body.data.tokens.accessToken;
      orgId = res.body.data.organization.id;

      // Create vehicle
      const vRes = await request(app.getHttpServer())
        .post('/api/internal/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .set('x-organization-id', orgId)
        .send({
          registrationNumber: `CONF-${Date.now()}`,
          make: 'BMW',
          model: '330i',
          year: 2024,
          category: VehicleCategory.SEDAN,
          dailyRate: 130,
          partnerDailyRate: 90,
        });

      vehicleId = vRes.body.data?.id;

      // Create customer
      const cRes = await request(app.getHttpServer())
        .post('/api/internal/customers')
        .set('Authorization', `Bearer ${token}`)
        .set('x-organization-id', orgId)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+14155554444',
          email: `john.doe.${Date.now()}@example.com`,
          drivingLicenceNumber: 'DL-CONF-1234',
        });

      customerId = cRes.body.data?.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const pickupDate = new Date('2026-10-01T10:00:00.000Z');
  const returnDate = new Date('2026-10-05T10:00:00.000Z');

  it('1. Successfully books vehicle for non-conflicting date window', async () => {
    if (!token || !vehicleId || !customerId) return;

    const res = await request(app.getHttpServer())
      .post('/api/internal/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        customerProfileId: customerId,
        vehicleId,
        pickupDateTime: pickupDate,
        returnDateTime: returnDate,
        pickupLocation: 'Airport Desk',
        returnLocation: 'Airport Desk',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingNumber).toBeDefined();
  });

  it('2. REJECTS overlapping direct booking with 409 Conflict', async () => {
    if (!token || !vehicleId || !customerId) return;

    // Overlaps 2026-10-03 to 2026-10-07
    const overlappingPickup = new Date('2026-10-03T10:00:00.000Z');
    const overlappingReturn = new Date('2026-10-07T10:00:00.000Z');

    const res = await request(app.getHttpServer())
      .post('/api/internal/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        customerProfileId: customerId,
        vehicleId,
        pickupDateTime: overlappingPickup,
        returnDateTime: overlappingReturn,
        pickupLocation: 'Airport Desk',
        returnLocation: 'Airport Desk',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Vehicle is not available');
  });

  it('3. REJECTS vehicle blocking period that collides with existing booking', async () => {
    if (!token || !vehicleId) return;

    const res = await request(app.getHttpServer())
      .post('/api/internal/blocks')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        vehicleId,
        reason: 'MAINTENANCE',
        startDateTime: new Date('2026-10-02T00:00:00.000Z'),
        endDateTime: new Date('2026-10-04T00:00:00.000Z'),
        notes: 'Attempted block over active booking',
      });

    expect(res.status).toBe(409);
  });
});
