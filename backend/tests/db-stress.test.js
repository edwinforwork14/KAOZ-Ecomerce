const { PrismaClient } = require('@prisma/client');

// Force new instance to test connection pooling directly without relying on the global instance
const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
});

describe("Prisma Connection Pool Stress Test", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Debe manejar 50 consultas simultáneas sin agotar el pool", async () => {
    const start = Date.now();
    
    // Disparamos 50 promesas en paralelo para simular tráfico pesado.
    // Usaremos findFirst en lugar de findMany(take:1) por simplicidad, pero ambos sirven.
    const promises = Array.from({ length: 50 }).map(() => 
      prisma.product.findFirst({
        select: { id: true }
      })
    );

    const results = await Promise.allSettled(promises);
    
    const failed = results.filter(r => r.status === 'rejected');
    const end = Date.now();

    console.log(`Stress test completado en ${end - start}ms`);
    
    if (failed.length > 0) {
      console.error(`Fallo en ${failed.length} de 50 consultas:`, failed[0].reason);
    }
    
    expect(failed.length).toBe(0);
  }, 30000); // 30s timeout
});
