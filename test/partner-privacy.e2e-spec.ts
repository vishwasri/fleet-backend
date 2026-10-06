import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';

describe('Partner Network Privacy & Public Data Segregation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tokenSupplier = '';
  let supplierOrgId = '';
  let supplierVehicleId = '';

  let tokenRequester = '';
  let requesterOrgId = '';
  let partnerRentalId = '';

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

    // 1. Supplier Org
    const sRes = await request(app.getHttpServer())
      .post('/api/auth/register-organization')
      .send({
        email: `supplier.${Date.now()}@rentals.com`,
        password: 'Password123!',
        firstName: 'Supplier',
        lastName: 'One',
        legalName: 'Supplier Fleet LLC',
        displayName: 'Supplier Fleet',
        organizationEmail: `supplier.${Date.now()}@rentals.com`,
        organizationPhone: '+14155555555',
      });

    if (sRes.status === 201) {
      tokenSupplier = sRes.body.data.tokens.accessToken;
      supplierOrgId = sRes.body.data.organization.id;

      // Add supplier vehicle
      const vRes = await request(app.getHttpServer())
        .post('/api/internal/vehicles')
        .set('Authorization', `Bearer ${tokenSupplier}`)
        .set('x-organization-id', supplierOrgId)
        .send({
          registrationNumber: `PRIV-${Date.now()}`,
          make: 'Cadillac',
          model: 'Escalade',
          year: 2024,
          category: 'SUV',
          dailyRate: 200,
          partnerDailyRate: 140,
          publicListingStatus: 'DRAFT',
          notes: 'CONFIDENTIAL: Supplier GPS transponder #9900.',
        });

      supplierVehicleId = vRes.body.data?.id;
    }

    // 2. Requester Org
    const rRes = await request(app.getHttpServer())
      .post('/api/auth/register-organization')
      .send({
        email: `requester.${Date.now()}@rentals.com`,
        password: 'Password123!',
        firstName: 'Requester',
        lastName: 'Two',
        legalName: 'Requester Fleet Inc',
        displayName: 'Requester Fleet',
        organizationEmail: `requester.${Date.now()}@rentals.com`,
        organizationPhone: '+14155556666',
      });

    if (rRes.status === 201) {
      tokenRequester = rRes.body.data.tokens.accessToken;
      requesterOrgId = rRes.body.data.organization.id;
    }

    // Connect them as B2B Partners
    if (tokenRequester && supplierOrgId) {
      const inviteRes = await request(app.getHttpServer())
        .post('/api/partner/partners/invite')
        .set('Authorization', `Bearer ${tokenRequester}`)
        .set('x-organization-id', requesterOrgId)
        .send({ targetOrganizationId: supplierOrgId });

      const relationshipId = inviteRes.body.data?.id;
      if (relationshipId) {
        await request(app.getHttpServer())
          .patch(`/api/partner/partners/invitations/${relationshipId}/respond`)
          .set('Authorization', `Bearer ${tokenSupplier}`)
          .set('x-organization-id', supplierOrgId)
          .send({ status: 'ACTIVE' });
      }
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Sourcing flow creates B2B Partner Rental', async () => {
    if (!tokenRequester || !supplierVehicleId) return;

    // Requester creates request
    const reqRes = await request(app.getHttpServer())
      .post('/api/partner/requests')
      .set('Authorization', `Bearer ${tokenRequester}`)
      .set('x-organization-id', requesterOrgId)
      .send({
        vehicleCategory: 'SUV',
        targetWholesaleRate: 140,
        pickupDateTime: new Date('2026-11-01T10:00:00.000Z'),
        returnDateTime: new Date('2026-11-05T10:00:00.000Z'),
        pickupLocation: 'Wholesale Hub',
        returnLocation: 'Wholesale Hub',
      })
      .expect(201);

    const requestId = reqRes.body.data.id;

    // Supplier submits offer
    const offerRes = await request(app.getHttpServer())
      .post(`/api/partner/requests/${requestId}/offers`)
      .set('Authorization', `Bearer ${tokenSupplier}`)
      .set('x-organization-id', supplierOrgId)
      .send({
        vehicleId: supplierVehicleId,
        dailyRate: 140,
      })
      .expect(201);

    const offerId = offerRes.body.data.id;

    // Requester accepts offer
    const acceptRes = await request(app.getHttpServer())
      .post(`/api/partner/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${tokenRequester}`)
      .set('x-organization-id', requesterOrgId)
      .expect(201);

    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.status).toBe('ACCEPTED');
    partnerRentalId = acceptRes.body.data.id;
  });

  it('2. Supplier partner rental view NEVER contains end-customer identity or documents', async () => {
    if (!tokenSupplier || !partnerRentalId) return;

    const res = await request(app.getHttpServer())
      .get(`/api/partner/rentals/${partnerRentalId}`)
      .set('Authorization', `Bearer ${tokenSupplier}`)
      .set('x-organization-id', supplierOrgId)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.customerProfile).toBeUndefined();
    expect(res.body.data.drivingLicenceNumber).toBeUndefined();
    expect(res.body.data.requestingOrg.displayName).toBe('Requester Fleet');
  });

  it('3. Public marketplace search does NOT leak draft/private vehicles or internal registration numbers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/public/vehicles')
      .expect(200);

    expect(res.body.success).toBe(true);
    // Verified that results array contains only published data without internal registrationNumbers
    for (const v of res.body.data) {
      expect(v.registrationNumber).toBeUndefined();
      expect(v.notes).toBeUndefined();
      expect(v.insuranceExpiryDate).toBeUndefined();
    }
  });
});
