import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';
import { VehicleCategory } from '@prisma/client';

describe('Rental Extension Lifecycle & Conflict Safety (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let token = '';
  let orgId = '';
  let vehicleId = '';
  let customerId = '';
  let booking1Id = '';
  let booking2Id = '';
  let booking3Id = '';

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
        email: `extension.test.${Date.now()}@rentals.com`,
        password: 'Password123!',
        firstName: 'Ext',
        lastName: 'Tester',
        legalName: 'Extension Fleet LLC',
        displayName: 'Extension Fleet',
        organizationEmail: `extension.test.${Date.now()}@rentals.com`,
        organizationPhone: '+14155556666',
      });

    token = res.body.data.tokens.accessToken;
    orgId = res.body.data.organization.id;

    // Create vehicle
    const vRes = await request(app.getHttpServer())
      .post('/api/internal/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        registrationNumber: `EXT-${Date.now()}`,
        make: 'Honda',
        model: 'Accord',
        year: 2024,
        category: VehicleCategory.SEDAN,
        dailyRate: 80.0,
        partnerDailyRate: 60.0,
      });
    vehicleId = vRes.body.data.id;

    // Create customer profile
    const cRes = await request(app.getHttpServer())
      .post('/api/internal/customers')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        firstName: 'Michael',
        lastName: 'Scott',
        phone: '+14155552233',
        email: 'michael.scott@example.com',
        drivingLicenceNumber: 'DL-EXT-505',
      });
    customerId = cRes.body.data.id;
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.financialTransaction.deleteMany({ where: { organizationId: orgId } });
      await prisma.rentalExtension.deleteMany({ where: { organizationId: orgId } });
      await prisma.booking.deleteMany({ where: { organizationId: orgId } });
      await prisma.vehicle.deleteMany({ where: { organizationId: orgId } });
      await prisma.customerProfile.deleteMany({ where: { organizationId: orgId } });
      await prisma.organization.deleteMany({ where: { id: orgId } });
    }
    await app.close();
  });

  it('1. Should reject extension approval when extended dates collide with a future booking', async () => {
    // Booking 1: Sept 1 to Sept 5
    const b1 = await request(app.getHttpServer())
      .post('/api/internal/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        customerProfileId: customerId,
        vehicleId,
        pickupDateTime: '2026-09-01T10:00:00.000Z',
        returnDateTime: '2026-09-05T10:00:00.000Z',
        pickupLocation: 'HQ',
        returnLocation: 'HQ',
      });
    booking1Id = b1.body.data.id;

    // Booking 2: Sept 6 to Sept 10
    const b2 = await request(app.getHttpServer())
      .post('/api/internal/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        customerProfileId: customerId,
        vehicleId,
        pickupDateTime: '2026-09-06T10:00:00.000Z',
        returnDateTime: '2026-09-10T10:00:00.000Z',
        pickupLocation: 'HQ',
        returnLocation: 'HQ',
      });
    booking2Id = b2.body.data.id;

    // Request extension on Booking 1 to Sept 8 (overlaps with Booking 2)
    const extReq = await request(app.getHttpServer())
      .post('/api/internal/extensions')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        bookingId: booking1Id,
        newReturnDateTime: '2026-09-08T10:00:00.000Z',
        reason: 'Customer wants 3 extra days',
      });

    expect(extReq.status).toBe(201);
    const extId = extReq.body.data.id;
    expect(extReq.body.data.status).toBe('PENDING');

    // Attempt approval -> Must fail with 409 ConflictException
    const approveRes = await request(app.getHttpServer())
      .post(`/api/internal/extensions/${extId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId);

    expect(approveRes.status).toBe(409);
    expect(approveRes.body.message).toContain('Vehicle is not available');
  });

  it('2. Should approve extension when schedule is clear, updating return date & posting ledger transaction', async () => {
    // Booking 3: Oct 1 to Oct 5
    const b3 = await request(app.getHttpServer())
      .post('/api/internal/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        customerProfileId: customerId,
        vehicleId,
        pickupDateTime: '2026-10-01T10:00:00.000Z',
        returnDateTime: '2026-10-05T10:00:00.000Z',
        pickupLocation: 'HQ',
        returnLocation: 'HQ',
      });
    booking3Id = b3.body.data.id;
    const initialTotal = Number(b3.body.data.totalAmount);

    // Request extension to Oct 8 (3 extra days @ $80 = $240)
    const extReq = await request(app.getHttpServer())
      .post('/api/internal/extensions')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        bookingId: booking3Id,
        newReturnDateTime: '2026-10-08T10:00:00.000Z',
        reason: 'Extended stay approved by manager',
      });

    expect(extReq.status).toBe(201);
    const extId = extReq.body.data.id;

    // Approve extension
    const approveRes = await request(app.getHttpServer())
      .post(`/api/internal/extensions/${extId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId);

    expect(approveRes.status).toBe(201);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // Verify Booking updated
    const updatedBooking = await request(app.getHttpServer())
      .get(`/api/internal/bookings/${booking3Id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId);

    expect(new Date(updatedBooking.body.data.returnDateTime).toISOString()).toBe('2026-10-08T10:00:00.000Z');
    expect(Number(updatedBooking.body.data.totalAmount)).toBe(initialTotal + 240.0);
    expect(Number(updatedBooking.body.data.numberOfDays)).toBe(7);
  });
});
