import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';
import { VehicleCategory } from '@prisma/client';

describe('Operational Workflow: Inspections, Deposits, Extra Charges, Returns (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let token = '';
  let orgId = '';
  let vehicleId = '';
  let customerId = '';
  let bookingId = '';
  let depositId = '';

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
        email: `ops.flow.${Date.now()}@rentals.com`,
        password: 'Password123!',
        firstName: 'Ops',
        lastName: 'Manager',
        legalName: 'Ops Flow Fleet LLC',
        displayName: 'Ops Flow Fleet',
        organizationEmail: `ops.flow.${Date.now()}@rentals.com`,
        organizationPhone: '+14155554444',
      });

    token = res.body.data.tokens.accessToken;
    orgId = res.body.data.organization.id;

    // Create vehicle
    const vRes = await request(app.getHttpServer())
      .post('/api/internal/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        registrationNumber: `OPS-${Date.now()}`,
        make: 'Audi',
        model: 'Q5',
        year: 2024,
        category: VehicleCategory.SUV,
        dailyRate: 110.0,
        partnerDailyRate: 85.0,
        mileage: 20000,
      });
    vehicleId = vRes.body.data.id;

    // Create customer profile
    const cRes = await request(app.getHttpServer())
      .post('/api/internal/customers')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        firstName: 'Robert',
        lastName: 'Taylor',
        phone: '+14155559988',
        email: 'robert.taylor@example.com',
        drivingLicenceNumber: 'DL-OPS-991',
      });
    customerId = cRes.body.data.id;
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.financialTransaction.deleteMany({ where: { organizationId: orgId } });
      await prisma.vehicleInspectionItem.deleteMany();
      await prisma.vehicleInspection.deleteMany({ where: { organizationId: orgId } });
      await prisma.extraCharge.deleteMany({ where: { organizationId: orgId } });
      await prisma.deposit.deleteMany({ where: { organizationId: orgId } });
      await prisma.booking.deleteMany({ where: { organizationId: orgId } });
      await prisma.vehicle.deleteMany({ where: { organizationId: orgId } });
      await prisma.customerProfile.deleteMany({ where: { organizationId: orgId } });
      await prisma.organization.deleteMany({ where: { id: orgId } });
    }
    await app.close();
  });

  it('1. Should create booking with a security deposit', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/internal/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        customerProfileId: customerId,
        vehicleId,
        pickupDateTime: '2026-10-01T10:00:00.000Z',
        returnDateTime: '2026-10-05T10:00:00.000Z',
        pickupLocation: 'Main Office',
        returnLocation: 'Main Office',
        depositAmount: 300.0,
      });

    expect(res.status).toBe(201);
    bookingId = res.body.data.id;
    expect(res.body.data.bookingStatus).toBe('CONFIRMED');

    // Verify Deposit was created
    const depRes = await request(app.getHttpServer())
      .get(`/api/internal/deposits?bookingId=${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId);

    expect(depRes.status).toBe(200);
    expect(depRes.body.data.length).toBe(1);
    depositId = depRes.body.data[0].id;
    expect(depRes.body.data[0].status).toBe('PENDING');
    expect(Number(depRes.body.data[0].amount)).toBe(300.0);
  });

  it('2. Should mark deposit received', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/internal/deposits/${depositId}/received`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        paymentMethod: 'CREDIT_CARD_AUTH',
        reference: 'AUTH-PRE-8811',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('RECEIVED');
  });

  it('3. Should record pickup inspection checklist and update vehicle status', async () => {
    const inspRes = await request(app.getHttpServer())
      .post('/api/internal/inspections')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        vehicleId,
        bookingId,
        type: 'DIRECT_PICKUP',
        mileage: 20050,
        fuelLevel: 'FULL',
        overallCondition: 'EXCELLENT',
        customerSignatureUrl: 'https://storage.fleet.app/sig/cust-1.png',
        items: [
          { label: 'Front Bumper', status: 'GOOD' },
          { label: 'Tires & Brakes', status: 'GOOD' },
        ],
      });

    expect(inspRes.status).toBe(201);
    expect(inspRes.body.data.items.length).toBe(2);

    // Handover pickup
    const pickupRes = await request(app.getHttpServer())
      .post(`/api/internal/bookings/${bookingId}/pickup`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        pickupMileage: 20050,
        pickupFuelLevel: 'FULL',
      });

    expect(pickupRes.status).toBe(201);
    expect(pickupRes.body.data.bookingStatus).toBe('PICKED_UP');
  });

  it('4. Should create and approve extra charge (cleaning incident)', async () => {
    const chargeRes = await request(app.getHttpServer())
      .post('/api/internal/extra-charges')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        bookingId,
        type: 'CLEANING',
        description: 'Seat stain deep extraction',
        amount: 80.0,
      });

    expect(chargeRes.status).toBe(201);
    const chargeId = chargeRes.body.data.id;
    expect(chargeRes.body.data.status).toBe('PENDING');

    // Approve charge
    const approveRes = await request(app.getHttpServer())
      .post(`/api/internal/extra-charges/${chargeId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId);

    expect(approveRes.status).toBe(201);
    expect(approveRes.body.data.status).toBe('APPROVED');
  });

  it('5. Should record return inspection and complete booking', async () => {
    const retInspRes = await request(app.getHttpServer())
      .post('/api/internal/inspections')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        vehicleId,
        bookingId,
        type: 'DIRECT_RETURN',
        mileage: 20450,
        fuelLevel: 'FULL',
        overallCondition: 'GOOD',
        items: [
          { label: 'Front Bumper', status: 'GOOD' },
          { label: 'Interior Seats', status: 'DAMAGED', notes: 'Spill stain' },
        ],
      });

    expect(retInspRes.status).toBe(201);

    const retRes = await request(app.getHttpServer())
      .post(`/api/internal/bookings/${bookingId}/return`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        returnMileage: 20450,
        returnFuelLevel: 'FULL',
        notes: 'Returned on time',
      });

    expect(retRes.status).toBe(201);
    expect(retRes.body.data.bookingStatus).toBe('COMPLETED');
  });

  it('6. Should deduct cleaning fee from deposit and refund remaining balance', async () => {
    // Deduct $80 for cleaning
    const deductRes = await request(app.getHttpServer())
      .post(`/api/internal/deposits/${depositId}/deduct`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        amount: 80.0,
        reason: 'Seat stain deep extraction fee',
      });

    expect(deductRes.status).toBe(201);
    expect(Number(deductRes.body.data.deductedAmount)).toBe(80.0);
    expect(deductRes.body.data.status).toBe('PARTIALLY_DEDUCTED');

    // Refund remaining $220
    const refundRes = await request(app.getHttpServer())
      .post(`/api/internal/deposits/${depositId}/refund`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        notes: 'Refunded remaining deposit of $220 to customer card',
      });

    expect(refundRes.status).toBe(201);
    expect(Number(refundRes.body.data.refundAmount)).toBe(220.0);
    expect(refundRes.body.data.status).toBe('REFUNDED');
  });
});
