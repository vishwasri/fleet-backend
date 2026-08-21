import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';
import { VehicleCategory } from '@prisma/client';

describe('Multi-Tenant Organization Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tokenOrgA = '';
  let orgAId = '';
  let vehicleOrgAId = '';

  let tokenOrgB = '';
  let orgBId = '';

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

    // Register Org A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register-organization')
      .send({
        email: `tenant.a.${Date.now()}@rentals.com`,
        password: 'Password123!',
        firstName: 'Tenant',
        lastName: 'A',
        legalName: 'Tenant A Rentals LLC',
        displayName: 'Tenant A',
        organizationEmail: `tenant.a.${Date.now()}@rentals.com`,
        organizationPhone: '+14155551111',
      });

    if (resA.status === 201) {
      tokenOrgA = resA.body.data.tokens.accessToken;
      orgAId = resA.body.data.organization.id;

      // Create vehicle in Org A
      const vRes = await request(app.getHttpServer())
        .post('/api/internal/vehicles')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-organization-id', orgAId)
        .send({
          registrationNumber: `ISO-${Date.now()}`,
          make: 'Audi',
          model: 'A6',
          year: 2024,
          category: VehicleCategory.SEDAN,
          dailyRate: 110,
          partnerDailyRate: 80,
        });

      vehicleOrgAId = vRes.body.data?.id;
    }

    // Register Org B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register-organization')
      .send({
        email: `tenant.b.${Date.now()}@rentals.com`,
        password: 'Password123!',
        firstName: 'Tenant',
        lastName: 'B',
        legalName: 'Tenant B Rentals LLC',
        displayName: 'Tenant B',
        organizationEmail: `tenant.b.${Date.now()}@rentals.com`,
        organizationPhone: '+14155552222',
      });

    if (resB.status === 201) {
      tokenOrgB = resB.body.data.tokens.accessToken;
      orgBId = resB.body.data.organization.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('Org B CANNOT access Org A vehicle through internal API', async () => {
    if (!tokenOrgB || !vehicleOrgAId) return;

    // Org B queries Org A's vehicle with Org B's token & org header
    const res = await request(app.getHttpServer())
      .get(`/api/internal/vehicles/${vehicleOrgAId}`)
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .set('x-organization-id', orgBId);

    expect(res.status).toBe(404);
  });

  it('Org B CANNOT pass Org A x-organization-id header to impersonate', async () => {
    if (!tokenOrgB || !orgAId) return;

    // Org B attempts to use Org A's header
    const res = await request(app.getHttpServer())
      .get('/api/internal/vehicles')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .set('x-organization-id', orgAId);

    expect(res.status).toBe(403);
  });
});
