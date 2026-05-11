const request = require('supertest');
process.env.VERCEL = '1'; // Previene que server.js haga app.listen()
const app = require('../src/server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe("Flujo Crítico E-Commerce (E2E)", () => {
  let token;
  let testUser = {
    firstName: "Test",
    lastName: "QA",
    email: `test_qa_${Date.now()}@kaoz.com`,
    password: "Password123!",
    phone: "1234567890"
  };

  afterAll(async () => {
    // Limpieza
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test_qa_' } }
    });
    await prisma.$disconnect();
  });

  it("1. Registro de Usuario (Crea cuenta y devuelve JWT)", async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
      
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    
    // Guardamos el token para las siguientes pruebas
    token = res.body.token;
  });

  it("2. Login de Usuario (Verifica credenciales)", async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
      
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
  });

  it("3. Verificación de Perfil (/api/auth/me) con JWT Local", async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
      
    // Este test valida que el middleware auth.js funciona bien y no usa Supabase!
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it("4. Carga de Productos Básica", async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
