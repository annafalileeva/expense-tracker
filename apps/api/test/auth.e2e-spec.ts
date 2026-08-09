import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Тест требует поднятой БД: npm run db:up && npm run db:migrate
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userAEmail = `user-a-${randomUUID()}@example.com`;
  const userBEmail = `user-b-${randomUUID()}@example.com`;
  const password = 'correct-password-123';

  let userAId: string;
  let userBId: string;
  let userAToken: string;
  let userBToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // onDelete: Cascade на Category/Expense — удаления пользователей достаточно.
    await prisma.user.deleteMany({ where: { email: { in: [userAEmail, userBEmail] } } });
    await app.close();
  });

  it('POST /api/auth/register создаёт пользователя и не отдаёт passwordHash', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Пользователь А', email: userAEmail, password })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ email: userAEmail, name: 'Пользователь А' });
    expect(response.body.user.passwordHash).toBeUndefined();

    userAId = response.body.user.id;
    userAToken = response.body.accessToken;
  });

  it('POST /api/auth/register с занятым email → 409', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Дубликат', email: userAEmail, password })
      .expect(409);
  });

  it('POST /api/auth/login с неверным паролем → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userAEmail, password: 'wrong-password' })
      .expect(401);
  });

  it('POST /api/auth/login с верным паролем → 200 + accessToken', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userAEmail, password })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.id).toBe(userAId);
  });

  it('GET /api/auth/me без токена → 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me с токеном → 200 и текущий пользователь', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ id: userAId, email: userAEmail });
  });

  it('GET /api/expenses без токена → 401', async () => {
    await request(app.getHttpServer()).get('/api/expenses').expect(401);
  });

  it('POST /api/expenses с лишним полем userId в теле → 400 (forbidNonWhitelisted)', async () => {
    await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ amount: 10, spentAt: new Date().toISOString(), userId: userAId })
      .expect(400);
  });

  it('чужой расход недоступен: 404 у второго пользователя', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/expenses')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ amount: 42.5, spentAt: new Date().toISOString() })
      .expect(201);

    const expenseId = createResponse.body.id;

    const registerB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Пользователь Б', email: userBEmail, password })
      .expect(201);

    userBId = registerB.body.user.id;
    userBToken = registerB.body.accessToken;
    expect(userBId).not.toBe(userAId);

    await request(app.getHttpServer())
      .get(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);
  });
});
