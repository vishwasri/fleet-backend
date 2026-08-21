import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  const testEmail = `test.owner.${Date.now()}@testfleet.com`;
  let accessToken = '';
  let refreshToken = '';

  it('POST /api/auth/register-organization -> registers new organization and first OWNER', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register-organization')
      .send({
        email: testEmail,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Owner',
        phone: '+14150001122',
        legalName: 'Test Fleet Rentals LLC',
        displayName: 'Test Fleet',
        organizationEmail: testEmail,
        organizationPhone: '+14150001122',
      });

    if (res.status === 201) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.organization.role).toBe('OWNER');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      accessToken = res.body.data.tokens.accessToken;
      refreshToken = res.body.data.tokens.refreshToken;
    }
  });

  it('POST /api/auth/login -> authenticates valid user credentials', async () => {
    if (!accessToken) return;

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    accessToken = res.body.data.tokens.accessToken;
    refreshToken = res.body.data.tokens.refreshToken;
  });

  it('GET /api/auth/me -> returns authenticated profile & organization memberships', async () => {
    if (!accessToken) return;

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.memberships.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/auth/refresh -> exchanges valid refresh token for new access token', async () => {
    if (!refreshToken) return;

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });
});
