# Plan 03 — Variables de entorno y secretos

> **Fase:** Fundación · **Depende de:** 01 · **Bloquea a:** 04, 05, 08, 09
> **Esfuerzo:** ~1 h · **Riesgo:** medio (toca credenciales)

---

## Objetivo

Definir **todas** las variables que el código realmente lee, rotar los secretos que están
expuestos en el repositorio, y crear un `.env.example` que sí sirva como plantilla.

---

## Por qué (evidencia)

### El `.env.example` actual es basura de una etapa abandonada

`backend/.env.example` tiene **3 líneas** y contiene **solo** las dos variables de Supabase:

```env
# Supabase (New)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...AcVK6bmuyipCan331C54WG7Pm5DbX5L05aRGnlp82jg
```

Dos problemas graves:

1. **El backend ya no lee ninguna variable de Supabase.** Verificado: `grep process.env` sobre
   `backend/src/` no encuentra `SUPABASE_URL` ni `SUPABASE_SERVICE_ROLE_KEY` en ningún sitio.
   El comentario en `middleware/auth.js:30` dice explícitamente *"Validación LOCAL (bcrypt + JWT,
   sin Supabase Auth)"*.
2. **Ese JWT parece un `service_role` real** (decodificable: `ref: ayggkoznacivhatgtcjq`,
   `role: service_role`). Está sin cifrar en el árbol de trabajo.

Y **ninguna de las 8 variables que sí se usan** está documentada.

### El `.env.example` ni siquiera llega al VPS

```bash
git ls-files --error-unmatch backend/.env.example
# → error: pathspec 'backend/.env.example' did not match any file(s) known to git
```

La regla `.env*` del `.gitignore` raíz (línea 20) se lo traga. Un `git clone` limpio en el VPS
**no tiene plantilla ninguna**.

### Secretos en archivos versionados (R6)

| Secreto | Dónde | Estado |
|---|---|---|
| API key de Zernio `sk_03cd34ed...` | **6 archivos** en `backend/scratch/` | Versionado (27 archivos trackeados) |
| Password admin `kaozadmin2024` | `backend/scratch/reset-admin.js:10`, `test-login.js:7` | Versionado |
| Password admin `123456789` | `backend/scripts/create-admin.js:8-9` | Versionado |

### Variables no documentadas que rompen cosas si faltan (R12)

| Variable | Se lee en | Si falta |
|---|---|---|
| `JWT_SECRET` | `middleware/auth.js:31,102`; `authController.js:6` | `jwt.sign` lanza excepción → login da 500 y todas las rutas protegidas dan 401 |
| `JWT_EXPIRE` | `authController.js:7` | `expiresIn` queda `undefined` → **tokens que nunca expiran** |
| `NODE_ENV` | `server.js:38,120`; `database.js:5`; `errorHandler.js:22`; `deploymentCheck.js:9` | `errorHandler.js:22` filtra `err.stack` en cada error 500 |
| `FRONTEND_URL` | `server.js:56` | El CORS bloquea tu dominio real |
| `PUBLIC_BASE_URL` | `config/storage.js:15` | El API devuelve URLs de imagen relativas → imágenes rotas |

---

## Inventario completo de variables

### Backend (`backend/.env`)

| Variable | Obligatoria | Ejemplo / valor |
|---|---|---|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `5010` |
| `DATABASE_URL` | ✅ | `postgresql://kaoz:PASS@127.0.0.1:5432/kaoz?schema=public` |
| `JWT_SECRET` | ✅ | 64 bytes aleatorios |
| `JWT_EXPIRE` | ✅ | `30d` |
| `FRONTEND_URL` | ✅ | `https://kaoz-sport.com` |
| `PUBLIC_BASE_URL` | ✅ | `https://kaoz-sport.com` |
| `ADMIN_EMAIL` | ✅ (seed) | tu correo real |
| `ADMIN_PASSWORD` | ✅ (seed) | mínimo 12 caracteres |
| `ADMIN_FIRSTNAME` / `ADMIN_LASTNAME` | ⬜ | `Edwin` / `Admin` |

> **`DIRECT_URL` ya no es necesaria** si aplicaste el paso 3a del plan 02 (borrar `directUrl` de
> `schema.prisma`). Si decidiste conservarla, debe tener **el mismo valor** que `DATABASE_URL`.

### Frontend (`frontend/.env.production`)

| Variable | Obligatoria | Ejemplo | Nota |
|---|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | ✅ **crítica** | `https://kaoz-sport.com` | Sin `/` final. Se incrusta en el build (B1) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://kaoz-sport.com` | Usada en `app/layout.tsx:18`, `sitemap.ts:3`, `jsonld.tsx:3` |
| `NEXT_PUBLIC_API_URL` | ✅ | `https://kaoz-sport.com/api` | Usada **solo** por `app/pmaa/deploy/page.tsx:54,82` |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | ⬜ | `abc123...` | Search Console |
| `NEXT_PUBLIC_PINTEREST_VERIFICATION` | ⬜ | `...` | Pinterest |

> ⚠️ **`NEXT_PUBLIC_API_URL` es una variable distinta y fácil de olvidar.** Si solo defines
> `NEXT_PUBLIC_BACKEND_URL`, el panel `/pmaa/deploy` seguirá llamando a `localhost:5010`
> (tiene fallback propio en línea 54 y 82). Define **las dos**.

---

## Pasos

### 1. Rotar los secretos expuestos — HAZLO PRIMERO

Estos secretos están en el repositorio. Asume que están comprometidos.

**1a. Zernio.** Entra al panel de Zernio, revoca la key `sk_03cd34edf5935d98fc4a323c1c81a058b5585995e1c0918238cd3ca919fbb06f`
y genera una nueva. La nueva **no va en el código**: va en la tabla `Settings`
(`settings.zernioConfig.apiKey`), que es donde el servicio la busca de verdad
(`services/zernioService.js:140`, `controllers/zernioController.js:89`).

**1b. Supabase.** Si el proyecto Supabase `ayggkoznacivhatgtcjq` todavía existe, **elimínalo o
rota su `service_role`**. Ya no lo usas.

**1c. Contraseñas de admin.** `kaozadmin2024` y `123456789` deben considerarse quemadas. La cuenta
`edwinforwork14@gmail.com` se va a recrear con contraseña nueva en el plan 09.

### 2. Generar los secretos nuevos

```bash
# JWT_SECRET — 64 bytes
openssl rand -base64 64 | tr -d '\n'; echo

# Otra opción equivalente
openssl rand -hex 48
```

Anota el resultado. **Nunca lo commitees.**

Para la contraseña de PostgreSQL, reutiliza la que generaste en el plan 01, paso 5.

### 3. Crear `backend/.env` en el VPS

```bash
cd /var/www/kaoz/app/backend
nano .env
```

```env
# ==========================================================
# KAOZ — Backend · Producción (VPS Contabo)
# ==========================================================

# --- Entorno ---
NODE_ENV=production
PORT=5010

# --- Base de datos (PostgreSQL local) ---
# Sin ?pgbouncer=true: ese flag es exclusivo del pooler de Supabase
DATABASE_URL="postgresql://kaoz:TU_PASSWORD_FUERTE@127.0.0.1:5432/kaoz?schema=public"

# --- Autenticación (JWT local, bcrypt) ---
JWT_SECRET=TU_JWT_SECRET_DE_64_BYTES
JWT_EXPIRE=30d

# --- Orígenes y URLs públicas ---
# OJO: server.js:55-78 solo acepta UN origen. Si tienes www y sin www, ver plan 06.
FRONTEND_URL=https://kaoz-sport.com
PUBLIC_BASE_URL=https://kaoz-sport.com

# --- Seed del administrador (solo se usa al ejecutar el seed) ---
ADMIN_EMAIL=tu-correo-real@dominio.com
ADMIN_PASSWORD=UNA_PASSWORD_LARGA_Y_UNICA
ADMIN_FIRSTNAME=Edwin
ADMIN_LASTNAME=Admin
```

Protege el archivo:

```bash
chmod 600 .env
ls -l .env    # debe ser -rw------- 1 kaoz kaoz
```

### 4. Crear `frontend/.env.production` en el VPS

> ⚠️ **Debe existir ANTES de `next build`.** Al ser `NEXT_PUBLIC_*`, el valor se **incrusta en
> el bundle del cliente**. Si lo defines después de compilar, no sirve de nada. Esta es la causa
> raíz del bloqueador B1.

```bash
cd /var/www/kaoz/app/frontend
nano .env.production
```

```env
# ==========================================================
# KAOZ — Frontend · Producción (VPS Contabo)
# ==========================================================
# ATENCIÓN: estas variables se INCRUSTAN EN EL BUILD.
# Cambiarlas exige volver a ejecutar `next build`.

# API base. Sin barra final.
# Usa el MISMO dominio que el frontend: nginx reparte /api y /uploads al backend,
# así el navegador hace peticiones al mismo origen y el CORS deja de importar.
NEXT_PUBLIC_BACKEND_URL=https://kaoz-sport.com

# Ruta completa del API. La usa app/pmaa/deploy/page.tsx
NEXT_PUBLIC_API_URL=https://kaoz-sport.com/api

# URL canónica del sitio (metadataBase, sitemap, JSON-LD)
NEXT_PUBLIC_SITE_URL=https://kaoz-sport.com

# Opcionales — verificación de buscadores
# NEXT_PUBLIC_GOOGLE_VERIFICATION=
# NEXT_PUBLIC_PINTEREST_VERIFICATION=
```

```bash
chmod 600 .env.production
```

> **No uses una ruta relativa vacía** (`NEXT_PUBLIC_BACKEND_URL=""`). El código hace
> `process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5010"`, y una cadena vacía es
> *falsy* → caería otra vez al fallback de localhost.

### 5. Reescribir `backend/.env.example` y desbloquearlo de git

Primero, saca el patrón `.env.example` de la regla `.env*` del `.gitignore` raíz
(actualmente en la línea 20):

```bash
cd /var/www/kaoz/app
nano .gitignore
```

Localiza la línea `.env*` y añade debajo:

```gitignore
!.env.example
!**/.env.example
```

Ahora sustituye `backend/.env.example` por una plantilla real:

```bash
nano backend/.env.example
```

```env
# ==========================================================
# KAOZ — Backend · Plantilla de variables de entorno
# Copiar a .env y rellenar. NUNCA commitear el .env real.
# ==========================================================

# --- Entorno ---
NODE_ENV=production
PORT=5010

# --- Base de datos (PostgreSQL) ---
DATABASE_URL="postgresql://usuario:password@127.0.0.1:5432/kaoz?schema=public"

# --- Autenticación ---
# Generar con: openssl rand -base64 64
JWT_SECRET=
JWT_EXPIRE=30d

# --- Orígenes y URLs públicas ---
FRONTEND_URL=https://tu-dominio.com
PUBLIC_BASE_URL=https://tu-dominio.com

# --- Seed del administrador (solo para `pnpm seed`) ---
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_FIRSTNAME=Admin
ADMIN_LASTNAME=KAOZ
```

Verifica que git ahora sí lo rastrea:

```bash
git check-ignore -v backend/.env.example   # no debe devolver nada
git status --short                          # debe aparecer como archivo nuevo
```

### 6. Reescribir `frontend/.env.example`

El frontend **no tiene** `.env.example`. Créalo:

```bash
nano frontend/.env.example
```

```env
# ==========================================================
# KAOZ — Frontend · Plantilla de variables de entorno
# Las variables NEXT_PUBLIC_* se INCRUSTAN EN EL BUILD.
# Cambiarlas exige volver a ejecutar `next build`.
# ==========================================================

NEXT_PUBLIC_BACKEND_URL=https://tu-dominio.com
NEXT_PUBLIC_API_URL=https://tu-dominio.com/api
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com

# NEXT_PUBLIC_GOOGLE_VERIFICATION=
# NEXT_PUBLIC_PINTEREST_VERIFICATION=
```

### 7. Eliminar el `frontend/.env.local` obsoleto

Solo contiene las dos variables muertas de Supabase:

```bash
cat /var/www/kaoz/app/frontend/.env.local
# NEXT_PUBLIC_SUPABASE_URL=https://ayggkoznacivhatgtcjq.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_90o_zoJtlyi_NXB23Ld88Q_JLW3-OWA
```

En el VPS **no lo crees**. Ya está en `.gitignore` (`frontend/.gitignore:2`), así que no viaja.
Si lo tienes en tu máquina local, bórralo para no confundirte.

### 8. Parametrizar `backend/scripts/create-admin.js`

Actualmente tiene credenciales en claro (`create-admin.js:8-9`). Reescríbelo:

```js
// backend/scripts/create-admin.js
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const firstName = process.env.ADMIN_FIRSTNAME || "Admin";
  const lastName = process.env.ADMIN_LASTNAME || "KAOZ";

  if (!email || !password) {
    console.error("❌ Define ADMIN_EMAIL y ADMIN_PASSWORD en el entorno.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("❌ ADMIN_PASSWORD debe tener al menos 12 caracteres.");
    process.exit(1);
  }

  console.log(`🚀 Creando/actualizando admin: ${email}`);

  try {
    const hashedPassword = await bcrypt.hash(password, 12); // cost 12, no 10

    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hashedPassword, role: "admin", isActive: true },
      create: {
        id: crypto.randomUUID(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "admin",
        isActive: true,
      },
    });

    console.log("✅ Admin listo:");
    console.log(`   ID:    ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role:  ${user.role}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
```

### 9. Actualizar `.gitignore` del backend

Asegúrate de que `backend/.gitignore` cubre lo importante:

```gitignore
node_modules/
.env
.env.local
.env.production
uploads/
*.log
```

> **Ojo con `uploads/`:** sigue ignorado a propósito (los archivos no van en git). Pero eso
> significa que un `git clone` limpio **no crea la carpeta**. El plan 07 resuelve esto apuntando
> `uploads` a `/var/lib/kaoz/uploads`.

### 10. Commitear los cambios de configuración

```bash
cd /var/www/kaoz/app
git add .gitignore backend/.env.example frontend/.env.example \
        backend/scripts/create-admin.js frontend/.env.local
git commit -m "Plantillas de entorno reales + admin parametrizado + .gitignore"
git push origin migrate/remove-supabase
```

**Nunca** hagas `git add backend/.env` ni `frontend/.env.production`. Confirma antes de cada push:

```bash
git status --short | grep -E '\.env$|\.env\.production$'
# No debe devolver nada
```

---

## Verificación (criterio de aceptación)

```bash
cd /var/www/kaoz/app

# 1. Los .env existen y están protegidos
ls -l backend/.env frontend/.env.production
# → -rw------- ambos

# 2. Los .env NO están en git
git status --short | grep -E '\.env$|\.env\.production$'
# → sin salida

# 3. Las plantillas SÍ están en git
git ls-files | grep env.example
# → backend/.env.example
# → frontend/.env.example

# 4. Ninguna variable obligatoria está vacía
grep -E '^(NODE_ENV|PORT|DATABASE_URL|JWT_SECRET|JWT_EXPIRE|FRONTEND_URL|PUBLIC_BASE_URL)=' backend/.env | grep -c '=$'
# → debe dar 0

grep -E '^(NEXT_PUBLIC_BACKEND_URL|NEXT_PUBLIC_API_URL|NEXT_PUBLIC_SITE_URL)=' frontend/.env.production | grep -c '=$'
# → debe dar 0

# 5. JWT_SECRET tiene longitud suficiente
grep '^JWT_SECRET=' backend/.env | cut -d= -f2- | wc -c
# → debe ser > 40

# 6. No hay secretos viejos en archivos versionados
grep -rn 'sk_03cd34ed' --include='*.js' . | grep -v node_modules
# → solo en backend/scratch/ (se borra en el plan 11)

# 7. La base de datos conecta con las credenciales del .env
cd backend && node -e "
require('dotenv').config();
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.\$queryRaw\`SELECT 1 as ok\`.then(r=>console.log('✅ DB OK:',r))
 .catch(e=>{console.error('❌ DB FALLO:',e.message);process.exit(1)})
 .finally(()=>p.\$disconnect());
"
```

**Pasa el plan cuando:**
- [ ] `backend/.env` y `frontend/.env.production` existen con permisos `600`.
- [ ] Ninguno de los dos aparece en `git status`.
- [ ] Existen `backend/.env.example` y `frontend/.env.example`, **trackeados por git**.
- [ ] La prueba de conexión a la base de datos dice `✅ DB OK`.
- [ ] La API key de Zernio fue rotada y la de Supabase revocada.
- [ ] `JWT_SECRET` es aleatorio y tiene más de 40 caracteres.

---

## Rollback

**Si rompes el `.env`:**
```bash
cp backend/.env.example backend/.env
nano backend/.env    # rellenar de nuevo
```

**Si rotas un secreto y algo deja de funcionar:** vuelve a generar uno nuevo; no hay vuelta atrás
con la rotación (ese es el punto de rotar).

**Si `git push` accidentalmente incluye un `.env`:**
```bash
# 1. Quitar del índice (mantiene el archivo en disco)
git rm --cached backend/.env

# 2. Añadir al .gitignore si no está
echo ".env" >> backend/.gitignore
git commit -m "Quitar .env del control de versiones"
git push

# 3. ROTAR EL SECRETO INMEDIATAMENTE. Sigue en el historial de git.
```

---

## Trampas conocidas

**`.env.production` vs `.env.local`.** Next.js carga ambos, pero `.env.local` tiene **prioridad
sobre** `.env.production`. Si dejas un `.env.local` viejo con los valores de Supabase, ganará él.
**Asegúrate de que no existe en el VPS.**

**Comillas en `DATABASE_URL`.** Si la contraseña de PostgreSQL contiene caracteres especiales
(`@`, `:`, `/`, `#`), deben ir codificados en porcentaje. Lo más simple: genera una contraseña
**solo alfanumérica** en el plan 01, paso 5, y evitas el problema entero.

**`PUBLIC_BASE_URL` y las imágenes.** `config/storage.js:49-56` devuelve
`${PUBLIC_BASE_URL}/uploads/products/<archivo>` cuando la variable está definida, y
`/uploads/products/<archivo>` cuando no lo está. Con el esquema de un solo dominio, ambas formas
funcionan, pero **definirla es más explícito** y evita depender de `lib/api.ts:11-17`
(`cleanImageUrl`) para arreglar la ruta en el cliente.

**El `JWT_SECRET` invalida todas las sesiones.** Al cambiarlo, todos los tokens emitidos antes
dejan de valer. Es lo deseado ahora (la base es nueva), pero tenlo en cuenta si algún día lo rotas
en caliente: todos los admins tendrán que volver a entrar.
