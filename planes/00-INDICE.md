# Planes de despliegue — KAOZ E-commerce en VPS Contabo

> **Objetivo final:** tener frontend (Next.js), backend (Express) y base de datos (PostgreSQL)
> funcionando en **un solo VPS Contabo**, con dominio, HTTPS, backups y monitoreo.
>
> **Origen de estos planes:** auditoría de estructura hecha sobre el repo actual.
> Cada plan cita archivo y línea reales del proyecto.

---

## Cómo usar esta carpeta

Los planes están **numerados y son secuenciales**. Ejecuta **uno por uno**, en orden.

Reglas:

1. No saltes al siguiente plan hasta que el **criterio de verificación** del actual pase.
2. Cada plan tiene su propio **rollback** por si algo sale mal.
3. Cada plan es independiente en contenido: no necesitas recordar el anterior para leerlo.
4. Marca el estado en la tabla de abajo a medida que avanzas.

---

## Tabla de ejecución

| # | Plan | Fase | Depende de | Bloquea a | Esfuerzo | Estado |
|---|------|------|-----------|-----------|----------|--------|
| 01 | [Preparar VPS y PostgreSQL](01-preparar-vps-y-postgresql.md) | Fundación | — | Todo | 2 h | ⬜ |
| 02 | [Esquema Prisma y migraciones](02-esquema-prisma-y-migraciones.md) | Fundación | 01 | 04, 09 | 1 h | ⬜ |
| 03 | [Variables de entorno y secretos](03-variables-de-entorno-y-secretos.md) | Fundación | 01 | 04, 05, 08, 09 | 1 h | ⬜ |
| 04 | [Correcciones críticas del backend](04-correcciones-criticas-backend.md) | Bloqueadores | 02, 03 | 09 | 1,5 h | ⬜ |
| 05 | [Frontend: build y arranque](05-frontend-build-y-arranque.md) | Bloqueadores | 03 | 09 | 1,5 h | ⬜ |
| 06 | [Seguridad y autorización](06-seguridad-y-autorizacion.md) | Bloqueadores | 04 | 09 | 2 h | ⬜ |
| 07 | [Imágenes y almacenamiento persistente](07-imagenes-y-almacenamiento-persistente.md) | Bloqueadores | 04 | 08, 09 | 1 h | ⬜ |
| 08 | [systemd, nginx y TLS](08-systemd-nginx-y-tls.md) | Operación | 03, 07 | 09 | 2 h | ⬜ |
| 09 | [Despliegue, puesta en marcha y smoke test](09-despliegue-y-smoke-test.md) | Operación | 01–08 | 10 | 2 h | ⬜ |
| 10 | [Backups, monitoreo y mantenimiento](10-backups-monitoreo-y-mantenimiento.md) | Operación | 09 | — | 1,5 h | ⬜ |
| 11 | [Limpieza y deuda técnica](11-limpieza-y-deuda-tecnica.md) | Higiene | 09 | — | 1,5 h | ⬜ |

**Esfuerzo total estimado:** ~17 horas de trabajo efectivo.

---

## Las 3 decisiones que debes tomar antes de empezar

Estas decisiones cambian el contenido de varios planes. Resuélvelas primero.

### D1. ¿Cómo se llama el dominio y cómo se reparte?

**Recomendado: un solo dominio.** Un dominio simplifica todo y **elimina el problema de CORS**.

```
https://kaoz-sport.com/          → Next.js  :3000
https://kaoz-sport.com/api/*     → Express  :5010
https://kaoz-sport.com/uploads/* → Express  :5010
```

Alternativa (dos subdominios, más compleja, requiere mantener CORS):
```
https://kaoz-sport.com    → Next.js :3000
https://api.kaoz-sport.com → Express :5010
```

> Si eliges dos subdominios, el plan 06 se vuelve **obligatorio y crítico** porque el CORS
> pasa a ser la única puerta entre frontend y backend.

### D2. ¿Cómo se crea el esquema de la base de datos?

Las tres opciones del plan 02. **Recomendado: `prisma migrate`** (migraciones versionadas).
La alternativa rápida es `prisma db push`, válida para un solo desarrollador pero sin historial.

### D3. ¿Cómo se ejecutan las tareas programadas?

Hoy **no se ejecuta ninguna**: `node-cron` está instalado pero sin usar, y no hay cron de Vercel.

| Tarea | Hoy | Necesita |
|---|---|---|
| Tasa BCV / Euro | Solo manual desde el admin | Diario |
| Vencimiento de etiqueta "Nuevo" | Solo manual desde el admin | Diario |
| Sync de Instagram (Zernio) | Perezoso, al visitar la web | Cada hora |

**Recomendado:** *systemd timer* (no PM2, no `node-cron` dentro del proceso) porque no depende
de que la app esté viva y no duplica ejecuciones. Detalle en el plan 10.

---

## Estado real del proyecto (resumen de la auditoría)

### ✅ Ya está bien — no lo toques

- `backend/src/config/storage.js` **ya está escrito para Contabo**: usa `__dirname`, guarda en
  `backend/uploads/products` y sirve `/uploads`.
- **El build de producción funciona.** Verificado: compila en 105 s, 18 rutas, exit 0.
- **Todas las páginas se prerenderizan estáticas** — el build no necesita el backend levantado.
- `prisma/schema.prisma` es válido (`prisma validate` → OK).
- `orderService.js` usa `prisma.$transaction` correctamente, con decremento atómico de stock.
- `routes/admin.js`, `analytics.js` y `settings.js` están bien protegidos con
  `router.use(protect, authorize("admin"))`.
- El backend **ya no usa Supabase** en runtime: JWT local + disco local.

### 🔴 Bloqueadores duros (no arranca sin esto)

| ID | Problema | Plan |
|----|----------|------|
| B1 | `localhost:5010` horneado en 7 chunks del bundle del cliente | 05 |
| B2 | `pnpm start` ejecuta `serve out` y `out/` no existe nunca | 05 |
| B3 | `DATABASE_URL`/`DIRECT_URL` apuntan al pooler de Supabase | 03 |
| B4 | No existe `prisma/migrations` y hay 3 esquemas contradictorios | 02 |
| B5 | `settingsService.js:44` asigna a un `const` → rompe la BD vacía | 04 |
| B6 | `PUT /api/deployments/:id/toggle` sin autenticación apaga la tienda | 06 |

### 🟠 Riesgos serios

| ID | Problema | Plan |
|----|----------|------|
| R1 | Órdenes enumerables vía `/api/orders/search` (PII expuesta) | 06 |
| R2 | IDOR en `GET /api/orders/:id` con middleware `optional` | 06 |
| R3 | `PUT /api/orders/:orderId/whatsapp` sin ningún middleware | 06 |
| R4 | Cero rate limiting; login brute-forceable; OOM trivial | 06 |
| R5 | CORS sin dominio real + wildcard `*.vercel.app` con `credentials` | 06 |
| R6 | API key de Zernio en 6 archivos versionados; passwords admin en claro | 03 |
| R7 | Cliente Prisma generado solo para Windows/RHEL, no para Debian | 01, 02 |
| R8 | `uploads/` en `.gitignore` → un redeploy borra las imágenes | 07 |
| R9 | Sin health endpoint; `connectDB()` no se espera ni sale si falla | 04 |
| R10 | Sitemap estático y congelado; apunta a rutas que no existen | 05 |
| R11 | Ambos `package-lock.json` desincronizados → `npm ci` falla | 11 |
| R12 | Sin `NODE_ENV=production` se filtran stack traces; sin `JWT_EXPIRE` hay tokens eternos | 03, 04 |

---

## Faltantes de infraestructura (no existen en el repo)

Buscado y **no encontrado**: `Dockerfile`, `docker-compose.yml`, `ecosystem.config.js` (PM2),
unidad `systemd`, vhost de nginx, script de backup, `.env.example` útil.

Los planes 01, 08 y 10 crean todo esto desde cero.

---

## Decisiones ya tomadas en estos planes

| Tema | Decisión | Motivo |
|------|----------|--------|
| Gestor de paquetes | **pnpm** (`pnpm@9.15.0`) | Es el declarado en ambos `package.json` y el único lockfile en sync |
| Versión de Node | **20 LTS** | Declarado en `engines` de ambos `package.json` |
| Runtime del backend | **systemd** (no PM2) | Menos dependencias, arranque al boot, logs a journald |
| Tareas programadas | **systemd timer** | No depende de que la app esté viva, no duplica |
| Base de datos | **PostgreSQL local en `127.0.0.1`** | No expuesta a internet |
| TLS | **nginx + Let's Encrypt (certbot)** | Gratis, renovación automática |
| Imágenes | **Disco local, fuera del directorio de release** | `storage.js` ya lo soporta vía `__dirname` + variable |

---

## Orden mental de las fases

```
FASE 1 — FUNDACIÓN (planes 01-03)
  El servidor y la base de datos existen y son correctos.
  Todavía el e-commerce NO funciona. Es normal.

FASE 2 — BLOQUEADORES (planes 04-07)
  Se arregla el código para que pueda correr fuera de Vercel.
  Todavía NO hay nada publicado.

FASE 3 — OPERACIÓN (planes 08-10)
  El e-commerce queda público, con HTTPS, proceso supervisado y backups.

FASE 4 — HIGIENE (plan 11)
  Se borra la basura de la etapa Vercel/Supabase.
```

---

## Registro de avance

Usa esta sección para anotar fechas y notas al ejecutar cada plan.

| Fecha | Plan | Resultado / notas |
|-------|------|-------------------|
| | | |
