# Plan 02 — Esquema Prisma y migraciones

> **Fase:** Fundación · **Depende de:** 01 · **Bloquea a:** 04, 09
> **Esfuerzo:** ~1 h · **Riesgo:** medio (es el plan que toca la base de datos)

---

## Objetivo

Que el esquema de la base de datos se cree de forma **reproducible y versionada**, y eliminar los
tres esquemas contradictorios que hoy conviven en el repositorio.

---

## Por qué (evidencia)

`backend/prisma/` contiene **únicamente** `schema.prisma`. No existe carpeta `migrations/`, y
`package.json` no tiene script `migrate` ni `db push`. **Hoy no hay forma documentada ni repetible
de crear el esquema en una base nueva.**

Y hay **tres definiciones de esquema que se contradicen**:

| Artefacto | Nombres de tabla | ¿Compatible con Prisma? |
|---|---|---|
| `backend/prisma/schema.prisma` ← **la verdad** | `"Product"`, `"Category"` (PascalCase) | ✅ |
| `supabase_schema.sql` | `products`, `categories` (snake_case) | ❌ |
| `seed_supabase.sql` | snake_case | ❌ |
| `frontend/scripts/fix-schema-and-seed.js` | `"Product"`, `"Category"` (PascalCase) | ⚠️ casi |

Confirmado que la base real usa PascalCase: `frontend/scripts/fix-schema-and-seed.js:18-29` ejecuta
`ALTER TABLE "Category"`, `ALTER TABLE "Product"`, etc.

**Tres inconsistencias concretas:**

1. `supabase_schema.sql:86` declara `user_id UUID REFERENCES auth.users(id)`, y `:125-142` activa
   **RLS con `auth.uid()`**. Un PostgreSQL stock **no tiene esquema `auth` ni esa función** →
   ese archivo **no se puede ejecutar** en tu VPS. Fallará en la línea 86.
2. `seed_supabase.sql:14` inserta en `products (name, slug, ...)` y `:25` en
   `product_images (..., "order")`. **Ninguna de esas columnas existe** ni siquiera en
   `supabase_schema.sql`. Ese archivo **nunca funcionó**.
3. `fix-schema-and-seed.js:23` hace `ALTER TABLE "Product" ADD COLUMN "slug"`, pero **`Product`
   no tiene campo `slug` en `schema.prisma`**. Si lo ejecutas, `prisma db push` querrá borrar esa
   columna y entrarán en conflicto permanente.

Además, `backend/scripts/seed.js` es un **fósil de Mongoose**: hace `require("mongoose")` y
`require("../src/models/User")`, pero ni mongoose está en `package.json` ni existe `src/models/`.
Sus líneas 37-39 hacen `deleteMany({})` — si alguien lo "arregla" por error, **borra los datos**.

Y la config de Prisma arrastra dos restos de Supabase/Vercel:

```prisma
binaryTargets = ["native", "rhel-openssl-3.0.x"]   // schema.prisma:3  ← rhel = Amazon Linux
url           = env("DATABASE_URL")                 // schema.prisma:9
directUrl     = env("DIRECT_URL")                   // schema.prisma:10 ← pooler de Supabase
```

`directUrl` es un artefacto del pooler: en un PostgreSQL local no aporta nada, y si en el VPS
defines solo `DATABASE_URL`, **el cliente Prisma no inicializa** y falla en la primera query con
`Environment variable not found: DIRECT_URL`.

---

## Decisión obligatoria (D2 del índice)

| Opción | Cuándo usarla | Contras |
|---|---|---|
| **A. `prisma migrate`** ✅ recomendado | Quieres historial versionado y despliegues repetibles | Un paso más de configuración inicial |
| **B. `prisma db push`** | Un solo desarrollador, sin ganas de migraciones | Sin historial; puede borrar columnas sin avisar |
| C. SQL manual | — | ❌ Descartada: los archivos SQL actuales son incompatibles |

**Los pasos de abajo usan la opción A.** Al final hay un apéndice con la opción B.

---

## Pasos

### 1. Clonar el repositorio en el VPS

```bash
sudo -u kaoz -i
mkdir -p /var/www/kaoz && cd /var/www/kaoz
git clone https://github.com/edwinforwork14/KAOZ-Ecomerce.git app
cd app
```

> Estás en la rama `migrate/remove-supabase`. Es la correcta — contiene el commit
> `dbad67b "Remove Supabase dependency: local disk storage + local-only JWT auth"`.
> **No cambies a `main`.**

### 2. Instalar dependencias y generar el cliente en el servidor

El `prisma generate` **debe** ejecutarse en el VPS. Es el paso que arregla R7.

```bash
cd /var/www/kaoz/app/backend
pnpm install --frozen-lockfile

# Verificación: ahora sí debe existir un engine para Linux/Debian
ls node_modules/.prisma/client/ | grep -i '\.so\.node'
```

### 3. Corregir `prisma/schema.prisma`

Edita `backend/prisma/schema.prisma`:

**3a. Quitar `directUrl`** (línea 10). En un PostgreSQL local no aporta nada:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

> Si prefieres conservarlo, entonces en el plan 03 pon `DIRECT_URL` **con el mismo valor** que
> `DATABASE_URL`. Pero borrarlo es más simple y elimina un modo de fallo.

**3b. Corregir `binaryTargets`** (línea 3). Añade el target de Debian y quita el de Amazon Linux:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
  engineType    = "library"
}
```

Usa `debian-openssl-1.1.x` si en el plan 01 `openssl version` te devolvió 1.1 (Ubuntu 20.04).

### 4. Crear el archivo `.env` mínimo para Prisma

Prisma CLI lee `DATABASE_URL` del entorno. Créalo ahora (el `.env` completo es el plan 03):

```bash
cd /var/www/kaoz/app/backend
cp .env.example .env   # ← ojo: el .env.example actual es basura de Supabase, se reescribe en el plan 03
nano .env
```

```env
DATABASE_URL="postgresql://kaoz:TU_PASSWORD_FUERTE@127.0.0.1:5432/kaoz?schema=public"
```

> **Nota:** sin `?pgbouncer=true`. Ese flag es exclusivo del pooler de Supabase y en local
> desactiva las prepared statements sin ningún motivo.

Prueba la conexión antes de generar migraciones:

```bash
npx prisma db pull --print | head -20   # solo lectura, confirma conectividad
# o más directo:
psql "$DATABASE_URL" -c "\dt"           # debe decir "Did not find any relations" (BD vacía)
```

### 5. Generar la migración inicial

Con la base **vacía**, esto crea el SQL del esquema completo y lo aplica:

```bash
npx prisma migrate dev --name init
```

Esto hace tres cosas:
1. Crea `backend/prisma/migrations/<timestamp>_init/migration.sql`.
2. Aplica el SQL a la base `kaoz`.
3. Regenera el cliente.

Verifica que se creó todo:

```bash
ls prisma/migrations/
psql "$DATABASE_URL" -c "\dt"
```

Debes ver **16 tablas** en PascalCase: `User`, `Category`, `Product`, `ProductImage`,
`ProductVariant`, `ProductSize`, `Order`, `OrderItem`, `Cart`, `CartItem`, `ExchangeRate`,
`Settings`, `CartHistory`, `ProductView`, `Deployment`, `BulkUploadSession`, `Expense`.

### 6. Versionar la migración

```bash
cd /var/www/kaoz/app
git add backend/prisma/migrations backend/prisma/schema.prisma
git commit -m "Migraciones Prisma versionadas + targets Linux + quitar directUrl"
git push origin migrate/remove-supabase
```

> Esto es lo que hace que el despliegue sea repetible. A partir de ahora, en cada despliegue se
> usará `prisma migrate deploy`, que es **idempotente** y no borra datos.

### 7. Añadir los scripts que faltan a `backend/package.json`

```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "prisma:generate": "prisma generate",
  "prisma:migrate:deploy": "prisma migrate deploy",
  "prisma:migrate:status": "prisma migrate status",
  "prisma:studio": "prisma studio",
  "create-admin": "node scripts/create-admin.js",
  "postinstall": "prisma generate",
  "test": "jest --setupFilesAfterEnv=./tests/setup.js --detectOpenHandles --forceExit"
}
```

### 8. Eliminar los esquemas y seeds incompatibles

Estos archivos **no deben llegar al servidor** ni confundir a nadie:

```bash
cd /var/www/kaoz/app

git rm supabase_schema.sql seed_supabase.sql
git rm frontend/scripts/fix-schema-and-seed.js
git rm frontend/scripts/add-constraints.js
git rm backend/scripts/seed.js          # fósil de Mongoose, además es destructivo
git rm backend/temp-db.js

git commit -m "Eliminar esquemas y seeds obsoletos de Supabase/MongoDB"
git push origin migrate/remove-supabase
```

> **No borres** `frontend/scripts/*.js` que solo consultan la base
> (`check-columns.js`, `list-db-tables.js`, etc.) hasta el plan 11 — algunos son útiles como
> diagnóstico durante la puesta en marcha.

### 9. Crear el script de datos iniciales (seed) que sí funciona

Como el seed de Mongoose está roto y el de Supabase es incompatible, se necesita uno nuevo.
Crea `backend/prisma/seed.js`:

```js
// backend/prisma/seed.js
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function main() {
  // --- 1. Usuario administrador (credenciales por variable de entorno) ---
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Faltan ADMIN_EMAIL y ADMIN_PASSWORD. Defínelos en el entorno antes de correr el seed."
    );
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD debe tener al menos 12 caracteres.");
  }

  const hashed = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "admin", isActive: true, password: hashed },
    create: {
      id: crypto.randomUUID(),
      firstName: process.env.ADMIN_FIRSTNAME || "Admin",
      lastName: process.env.ADMIN_LASTNAME || "KAOZ",
      email,
      password: hashed,
      role: "admin",
      isActive: true,
    },
  });
  console.log(`✅ Admin listo: ${admin.email}`);

  // --- 2. Categorías base ---
  const categorias = [
    ["Hombre", "men", "Colección para hombres"],
    ["Mujer", "women", "Colección para mujeres"],
    ["Kids", "kids", "Colección infantil"],
    ["Accesorios", "accessories", "Accesorios y complementos"],
  ];

  for (const [name, slug, description] of categorias) {
    await prisma.category.upsert({
      where: { slug_parentId: { slug, parentId: null } },
      update: { name, description },
      create: {
        id: crypto.randomUUID(),
        name,
        slug,
        description,
        level: 0,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${categorias.length} categorías listas`);

  // --- 3. Settings global ---
  // settingsService.js las auto-repara, pero crearlas aquí evita el bug B5 en el primer arranque.
  await prisma.settings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      newProductDuration: 30,
      currency: { symbol: "$", code: "USD", showBsPrice: true },
      orders: { prefix: "KAOZ", allowDelete: false },
      business: { name: "KAOZ Urban Athletics", email: "contacto@kaoz.com" },
      whatsapp: { number: "584128494887", defaultMessage: "Hola! Me interesa este producto: " },
      paymentMethods: [
        { id: "whatsapp", name: "WhatsApp Pay / Transferencia", isActive: true, icon: "whatsapp" },
        { id: "zelle", name: "Zelle", isActive: true, icon: "zelle" },
      ],
      shippingMethods: [
        { id: "standard", name: "Envío Estándar", isActive: true, type: "standard", additionalCost: 5 },
        { id: "pickup", name: "Retiro en Tienda", isActive: true, type: "pickup", additionalCost: 0 },
      ],
      expenseCategories: [
        "Marketing", "Sueldos", "Logística", "Suministros", "Alquiler", "Impuestos", "Otros",
      ],
    },
  });
  console.log("✅ Settings global listo");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

> **Nota:** el `upsert` de `Category` usa `slug_parentId`, que corresponde a
> `@@unique([slug, parentId])` en `schema.prisma:51`. Si Prisma se queja del nombre del
> selector, ejecuta `npx prisma generate` y revisa el nombre exacto con `prisma studio`.

Registra el seed en `package.json`:

```json
"prisma": {
  "seed": "node prisma/seed.js"
}
```

Y añade el script `"seed": "node prisma/seed.js"` a `scripts`.

---

## Verificación (criterio de aceptación)

```bash
cd /var/www/kaoz/app/backend

# 1. El esquema está aplicado
npx prisma migrate status
# → "Database schema is up to date!"

# 2. Las tablas existen y son PascalCase
psql "$DATABASE_URL" -c "\dt"

# 3. El esquema de Prisma y la base coinciden (sin drift)
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma
# → "No difference detected."

# 4. El cliente tiene engine Linux
ls node_modules/.prisma/client/ | grep '\.so\.node'

# 5. Los archivos obsoletos ya no están
ls ../../supabase_schema.sql 2>&1   # debe decir "No such file"
```

**Pasa el plan cuando:**
- [ ] `prisma migrate status` dice "up to date".
- [ ] Existen las 16 tablas en PascalCase.
- [ ] `prisma migrate diff` dice "No difference detected" (sin drift).
- [ ] Existe `backend/prisma/migrations/<timestamp>_init/migration.sql` y está commiteado.
- [ ] Existe `backend/prisma/seed.js` y **no** existe `backend/scripts/seed.js`.
- [ ] `supabase_schema.sql` y `seed_supabase.sql` fueron eliminados del repo.
- [ ] Existe un engine `.so.node` en `node_modules/.prisma/client/`.

---

## Rollback

**Si la migración sale mal con la base vacía** (lo más fácil — no hay datos que perder):

```bash
npx prisma migrate reset --force   # borra todo y reaplica desde cero
```

**Si necesitas volver a la versión anterior del esquema:**

```bash
git revert HEAD
npx prisma migrate resolve --rolled-back <nombre_de_la_migracion>
```

**Si Prisma no conecta en absoluto:**

```bash
# Confirmar que el problema es Prisma y no PostgreSQL
psql "$DATABASE_URL" -c "SELECT 1;"
# Si esto funciona, el problema está en el .env o en el engine
npx prisma generate --force
```

---

## Apéndice — Opción B: `prisma db push` (sin migraciones)

Si prefieres la vía rápida y eres el único desarrollador:

```bash
cd /var/www/kaoz/app/backend
npx prisma db push          # crea/actualiza el esquema
npx prisma db push --accept-data-loss   # solo si pide confirmación explícita
```

**Contras a tener presentes:**
- No queda historial de cambios.
- Puede **borrar columnas con datos** sin preguntar.
- En cada despliegue debes recordar ejecutarlo a mano.
- Si algún día entras un segundo desarrollador, tendrás que migrar a `prisma migrate` de todas formas.

Si eliges esta opción, **sáltate los pasos 5 y 6** y añade `"prisma:push": "prisma db push"` a los
scripts.

---

## Trampas conocidas

**El `_prisma_migrations`.** Aunque hagas `prisma db push`, Prisma puede crear la tabla
`_prisma_migrations`. Es normal y no interfiere. No la borres.

**Nombres de constraint en PascalCase.** Prisma crea constraints como
`"Category_slug_parentId_key"`. Si ejecutas SQL manual, **cita siempre los identificadores** con
comillas dobles o PostgreSQL los pasará a minúsculas y no encontrará las tablas.

**No ejecutes `frontend/scripts/*.js` contra la base nueva.** Usan
`ssl: { rejectUnauthorized: false }` (línea 8 de `fix-schema-and-seed.js`), que era necesario para
Supabase. Un PostgreSQL local **no tiene SSL activado**, y esa opción provoca el error
*"The server does not support SSL connections"*. Están siendo eliminados justamente por eso.

**El seed es idempotente.** Puedes ejecutarlo varias veces sin duplicar datos gracias a los
`upsert`. Úsalo siempre, nunca `create`.
