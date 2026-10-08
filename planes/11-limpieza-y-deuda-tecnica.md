# Plan 11 — Limpieza y deuda técnica

> **Fase:** Higiene · **Depende de:** 09 · **Bloquea a:** nada
> **Esfuerzo:** ~1,5 h · **Riesgo:** bajo

---

## Objetivo

Borrar todo lo que quedó de las etapas Vercel, Supabase y MongoDB. Reduce la superficie de ataque,
elimina confusión y hace que el repositorio refleje lo que realmente se despliega.

**Este plan NO es urgente para que el e-commerce funcione.** Hazlo después de que el sitio esté
público y estable. Pero **los pasos 1 y 2 (secretos) sí son urgentes.**

---

## Por qué

### R6 — Secretos en archivos versionados 🔴 URGENTE

| Secreto | Dónde | Estado |
|---|---|---|
| API key de Zernio `sk_03cd34ed...` | **6 archivos** en `backend/scratch/` | Versionado |
| Password admin `kaozadmin2024` | `scratch/reset-admin.js:10`, `scratch/test-login.js:7` | Versionado |
| Password admin `123456789` | `scripts/create-admin.js:8-9` | Versionado (ya parametrizado en el plan 03) |

La carpeta `backend/scratch/` tiene **27 archivos trackeados** que se copian al VPS en cada
despliegue. Muchos apuntan a la base de datos de producción vía `DATABASE_URL`.

### R11 — Ambos `package-lock.json` están desincronizados

Verificado con node:

| Archivo | Estado |
|---|---|
| `frontend/package-lock.json` | Tiene `@supabase/ssr` y `@supabase/supabase-js` **de más** → `npm ci` falla |
| `backend/package-lock.json` | **21 referencias** a supabase, y **falta `uuid`** (que `package.json` sí requiere) → `npm ci` falla |
| `frontend/pnpm-lock.yaml` | ✅ En sync |
| `backend/pnpm-lock.yaml` | ✅ En sync |

Además, tener los dos gestores produce este warning en cada build:

```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles...
```

### Archivos muertos

| Archivo | Tamaño | Problema |
|---|---|---|
| `frontend/app/admin/products/bulk/page_old.tsx` | **88.830 bytes** | Versión antigua; no crea ruta y nadie la importa |
| `frontend/components/CatalogLayout.tsx` | 4 KB | **Huérfano**: ningún archivo lo importa |
| `frontend/app/globals copy.css` | 6,7 KB | Copia con espacio en el nombre |
| `backend/temp-db.js` | 299 B | Volcado de diagnóstico, versionado |
| `backend/scratch/` (27 archivos) | — | Scripts de la etapa anterior |
| `backend/vercel.json` | 619 B | Config de Vercel, inútil en el VPS |
| `backend/scripts/seed.js` | 16,5 KB | Fósil de Mongoose (ya borrado en el plan 02) |
| `frontend/scripts/*.js` | — | Scripts de la etapa Supabase |

### Fuga del helper de fallback (ya resuelto en el plan 05)

Los tres sitios que usaban `NEXT_PUBLIC_BACKEND_URL` sin fallback ya se corrigieron. Queda
unificar todo en `lib/config.ts` para que no se repita.

### Deuda técnica registrada, no resuelta

| Tema | Estado | Nota |
|---|---|---|
| `typescript.ignoreBuildErrors: true` | ⚠️ | Permite desplegar código que no compila |
| `eslint.ignoreDuringBuilds: true` | ⚠️ | Permite desplegar código con errores de lint |
| `serve` en `devDependencies` | 🗑️ | Sin uso tras el plan 05 |
| `node-cron` en `dependencies` | 🗑️ | Sin uso; el plan 10 usa systemd timers |
| `express-validator` | ⚠️ | ¿Se usa? Verificar |
| `uuid` | ⚠️ | ¿Se usa? El código usa `crypto.randomUUID()` |
| Rutas `/product/:id` y `/catalog/...` | ❌ | Nunca existieron en esta rama |

---

## Pasos

### 1. 🔴 URGENTE — Rotar los secretos expuestos

**Hazlo antes que nada más en este plan.** (Ya cubierto en el plan 03, paso 1; se repite aquí
porque es lo más importante de este documento.)

```bash
# 1a. Zernio: revocar en su panel y generar una nueva.
#     La nueva va en la tabla Settings, NO en el código:
#     /admin/settings → integración Zernio
#     (el servicio la lee de settings.zernioConfig.apiKey, no de variables de entorno)

# 1b. Supabase: si el proyecto ayggkoznacivhatgtcjq existe, eliminarlo.

# 1c. Confirmar que no queda ningún secreto vivo en el código
cd /var/www/kaoz/app
grep -rn 'sk_03cd34ed' --include='*.js' . | grep -v node_modules
grep -rn 'kaozadmin2024' --include='*.js' . | grep -v node_modules
grep -rn '123456789' --include='*.js' --include='*.json' . | grep -v node_modules | grep -v package-lock
```

### 2. 🔴 Limpiar el historial de git (los secretos siguen ahí)

**Rotar no basta**: los secretos siguen en el historial y cualquiera con acceso al repo los
encuentra. Si el repositorio es **privado**, el riesgo es bajo y puedes saltarte este paso. Si es
**público**, es obligatorio.

```bash
# Instalar git-filter-repo (mucho más seguro y rápido que filter-branch)
pip3 install git-filter-repo
# o: sudo apt install git-filter-repo

cd /var/www/kaoz/app
git clone --mirror https://github.com/edwinforwork14/KAOZ-Ecomerce.git /tmp/kaoz-purge
cd /tmp/kaoz-purge

# Eliminar la carpeta scratch y el archivo temporal del historial completo
git filter-repo --path backend/scratch --path backend/temp-db.js --invert-paths

# Verificar
git log --all --oneline | head
git log --all --full-history -- 'backend/scratch/*' | head   # → vacío

# Forzar el push (reescribe el historial)
git push --force --all
git push --force --tags
```

> ⚠️ **Esto reescribe el historial.** Cualquier otra persona con el repo clonado tendrá que
> volver a clonarlo. Y los secretos **siguen siendo válidos hasta que los revoques** — el paso 1
> es el que de verdad importa.

### 3. Eliminar `backend/scratch/` por completo

```bash
cd /var/www/kaoz/app
rm -rf backend/scratch
git add -A backend/scratch
git commit -m "Eliminar carpeta scratch (27 archivos de diagnóstico con secretos)"
```

Verifica antes que no haya nada útil. Los más relevantes:

| Archivo | ¿Reemplazado? |
|---|---|
| `check-db.js` | ✅ Por `/health` y `prisma studio` |
| `test-order-flow.js` | ✅ Por el smoke test del plan 09 |
| `promote-admin.js` | ✅ Por `scripts/create-admin.js` |
| `setup-admin.js` | ✅ Por `prisma/seed.js` (plan 02) |
| `check-products.js` | ✅ Por el panel de admin |
| `scrape-bcv.js`, `test-*-api.js` | ✅ Por `services/exchangeRateService.js` |

Si alguno te resulta útil para diagnóstico, **muévelo a `backend/scripts/diagnostics/` y quítale
los secretos** antes de borrar `scratch/`.

### 4. Eliminar la configuración de Vercel

```bash
cd /var/www/kaoz/app

git rm backend/vercel.json
rm -rf .vercel frontend/.vercel backend/.vercel 2>/dev/null

git commit -m "Eliminar configuración de Vercel"
```

Y los restos en el código:

**`server.js:9-10`** — el comentario ya no aplica:

```diff
-// Notas: node-cron y execSync (git) no son compatibles con Vercel Serverless
-// Las tareas programadas deben configurarse en el panel de Vercel (Cron Jobs)
+// Despliegue: VPS Contabo con systemd + nginx.
+// Las tareas programadas se ejecutan con systemd timers (ver plan 10).
```

**`server.js:37` y `:115`** — los guards `VERCEL` se pueden conservar (no estorban) o limpiar:

```diff
-    const version = process.env.VERCEL_GIT_COMMIT_SHA || "local-dev";
+    const version = "local-dev";   // sobrescrito por el bloque de git del plan 04
```

```diff
-// Solo iniciar con app.listen si no estamos en Vercel Serverless
-if (process.env.VERCEL !== '1') {
+// Arranque del servidor HTTP
+if (true) {
```

> **Recomendación:** deja el guard `VERCEL` tal cual si quieres conservar la posibilidad de volver
> a Vercel. Es una línea inofensiva. Pero **sí quita el comentario obsoleto**.

### 5. Eliminar los lockfiles de npm (R11)

```bash
cd /var/www/kaoz/app
git rm backend/package-lock.json frontend/package-lock.json
git commit -m "Eliminar package-lock.json (el proyecto usa pnpm)"
```

Y añádelos a `.gitignore` para que no vuelvan:

```gitignore
# .gitignore raíz — añadir
package-lock.json
```

Ahora el build dejará de emitir el warning de "multiple lockfiles".

> **Antes de borrarlos**, confirma que pnpm sí está en sync:
> ```bash
> cd backend && pnpm install --frozen-lockfile   # debe pasar sin cambios
> cd ../frontend && pnpm install --frozen-lockfile
> ```

### 6. Unificar la configuración del backend en `lib/config.ts`

Del plan 05, paso 3. Si aún no lo hiciste, consolida los helpers:

```ts
// frontend/lib/config.ts — añadir al final
export const getBackendUrl = () =>
  (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5010").replace(/\/$/, "");

export const getApiUrl = () => `${getBackendUrl()}/api`;
```

Y busca cualquier uso restante de las variables en crudo:

```bash
cd /var/www/kaoz/app/frontend
grep -rn 'process.env.NEXT_PUBLIC_BACKEND_URL' --include='*.ts' --include='*.tsx' \
  app components contexts lib
```

Actualiza `lib/api.ts:3` y `lib/actions/ecommerce.ts:5` para usar `getBackendUrl()` y así tener
un único punto de verdad.

### 7. Eliminar archivos muertos del frontend

```bash
cd /var/www/kaoz/app

# 88 KB de código muerto
git rm frontend/app/admin/products/bulk/page_old.tsx

# Componente huérfano (verificado: ningún archivo lo importa)
git rm frontend/components/CatalogLayout.tsx

# Copia con espacio en el nombre
git rm "frontend/app/globals copy.css"

# Scripts de la etapa Supabase
git rm frontend/scripts/fix-permissions.js \
       frontend/scripts/fix-schema-and-seed.js \
       frontend/scripts/add-constraints.js \
       frontend/scripts/check-cart-columns.js \
       frontend/scripts/check-category-columns.js \
       frontend/scripts/check-columns.js \
       frontend/scripts/check-constraints.js \
       frontend/scripts/check-image-columns.js \
       frontend/scripts/check-size-columns.js \
       frontend/scripts/check-variant-columns.js \
       frontend/scripts/list-db-tables.js \
       frontend/scripts/list-db-tables.ts

git commit -m "Eliminar archivos muertos y scripts obsoletos"
```

> **Verifica que `page_old.tsx` y `CatalogLayout.tsx` no se importan antes de borrarlos:**
> ```bash
> grep -rn 'page_old\|CatalogLayout' --include='*.tsx' --include='*.ts' frontend/app frontend/components
> ```
> Debe salir vacío (o solo la definición del propio archivo).

### 8. Eliminar dependencias sin uso

**`serve`** (frontend) — sin uso tras cambiar `start` a `next start`:

```bash
cd /var/www/kaoz/app/frontend
pnpm remove serve
```

**`node-cron`** (backend) — el plan 10 usa systemd timers:

```bash
cd /var/www/kaoz/app/backend
pnpm remove node-cron
```

Verifica antes si alguna dependencia sospechosa se usa de verdad:

```bash
# uuid — el código usa crypto.randomUUID() nativo de Node
grep -rn 'require.*uuid\|from .uuid.' src/ || echo "uuid NO se usa"

# express-validator
grep -rn 'express-validator' src/ || echo "express-validator NO se usa"
```

Si no se usan:

```bash
pnpm remove uuid express-validator
```

Confirma que el backend sigue arrancando tras cada eliminación:

```bash
node -e "require('./src/server.js')" &
sleep 3 && curl -s http://127.0.0.1:5010/health | head -3 && kill %1
```

### 9. Revisar los paquetes de Supabase en el frontend

`frontend/package-lock.json` tenía `@supabase/ssr` y `@supabase/supabase-js` de más (ya borrado en
el paso 5). Confirma que tampoco están en `node_modules` ni en `package.json`:

```bash
cd /var/www/kaoz/app/frontend
grep -i supabase package.json || echo "✅ Sin Supabase en package.json"
grep -rn 'supabase' --include='*.ts' --include='*.tsx' app components contexts lib hooks \
  || echo "✅ Sin código de Supabase"
```

### 10. Consolidar la deuda técnica en un documento

Crea `frontend/DEUDA-TECNICA.md` (o donde prefieras) para no perder de vista lo que **no** se
resolvió:

```markdown
# Deuda técnica conocida

## Pendiente del despliegue
- [ ] `typescript.ignoreBuildErrors: true` en next.config.mjs — permite desplegar sin typecheck
- [ ] `eslint.ignoreDuringBuilds: true` — permite desplegar con errores de lint
- [ ] Las rutas `/product/[id]` y `/catalog/category/[slug]` no existen (el sitemap ya no las anuncia)
- [ ] Fotos de producto sin optimización (`images.unoptimized: true`)
- [ ] Sin tests del frontend

## Funcionalidad pendiente
- [ ] `PUT /api/orders/:orderId/whatsapp` — la lógica de base de datos está sin implementar
      (comentario en orderController.js:70)
- [ ] Subida de comprobantes de pago (`payment_proof` existe en el SQL viejo, no en Prisma)
- [ ] Sin notificaciones automáticas por WhatsApp (dependía de webhooks de Supabase)

## Riesgos asumidos
- El token JWT vive en localStorage (vulnerable a XSS). Migrar a cookie httpOnly sería lo ideal.
- El carrito se identifica por `x-session-id` del cliente, no por autenticación.
- Sin tests de integración del backend contra una base real.
```

---

## Verificación (criterio de aceptación)

```bash
cd /var/www/kaoz/app

echo "=== SECRETOS ==="
grep -rn 'sk_03cd34ed\|kaozadmin2024' --include='*.js' --include='*.ts' . \
  | grep -v node_modules | grep -v '.next'
# → SIN SALIDA

echo "=== ARCHIVOS MUERTOS ==="
ls backend/scratch 2>&1                         # → No such file
ls backend/vercel.json 2>&1                     # → No such file
ls frontend/app/admin/products/bulk/page_old.tsx 2>&1   # → No such file
ls "frontend/app/globals copy.css" 2>&1         # → No such file
ls backend/temp-db.js 2>&1                      # → No such file
ls backend/scripts/seed.js 2>&1                 # → No such file
ls supabase_schema.sql seed_supabase.sql 2>&1   # → No such file

echo "=== LOCKFILES ==="
ls package-lock.json backend/package-lock.json frontend/package-lock.json 2>&1
# → No such file (los tres)
ls backend/pnpm-lock.yaml frontend/pnpm-lock.yaml
# → existen

echo "=== DEPENDENCIAS ==="
grep -q '"serve"' frontend/package.json && echo "❌ serve sigue" || echo "✅ serve eliminado"
grep -q '"node-cron"' backend/package.json && echo "❌ node-cron sigue" || echo "✅ node-cron eliminado"
grep -qi supabase frontend/package.json && echo "❌ supabase sigue" || echo "✅ sin supabase"

echo "=== EL SITIO SIGUE FUNCIONANDO ==="
curl -s https://kaoz-sport.com/health | head -3
curl -s -o /dev/null -w "home: %{http_code}\n" https://kaoz-sport.com/
curl -s -o /dev/null -w "admin: %{http_code}\n" https://kaoz-sport.com/admin/dashboard
```

Y **recompila tras la limpieza**, porque el plan toca dependencias:

```bash
cd /var/www/kaoz/app/backend && pnpm install --frozen-lockfile
cd ../frontend && pnpm install --frozen-lockfile
rm -rf .next
NODE_OPTIONS="--max-old-space-size=1536" pnpm build

# La verificación que nunca se salta
grep -rl 'localhost:5010' .next/static/chunks/ | wc -l   # → 0

sudo systemctl restart kaoz-backend kaoz-frontend
sleep 8
curl -s https://kaoz-sport.com/health
```

**Pasa el plan cuando:**
- [ ] No queda ningún secreto conocido en el código.
- [ ] `backend/scratch/` no existe.
- [ ] No existe ningún `package-lock.json`.
- [ ] No existen `vercel.json`, `page_old.tsx`, `globals copy.css`, `CatalogLayout.tsx`.
- [ ] `serve`, `node-cron` y Supabase ya no están en los `package.json`.
- [ ] El build vuelve a pasar **sin el warning de múltiples lockfiles**.
- [ ] `grep -rl 'localhost:5010' .next/static/chunks/ | wc -l` sigue dando **0**.
- [ ] El e-commerce sigue funcionando tras reiniciar.
- [ ] Existe un documento con la deuda técnica pendiente.

---

## Rollback

Todo son borrados versionados en git, así que se revierte con git:

```bash
cd /var/www/kaoz/app
git log --oneline -10
git revert <commit_de_limpieza>
```

Si borraste algo que sí necesitabas:

```bash
# Recuperar un archivo de un commit anterior
git checkout <commit_anterior> -- backend/scratch/check-db.js
```

**Si rompes dependencias:**

```bash
cd /var/www/kaoz/app/backend
git checkout HEAD~1 -- package.json
pnpm install
sudo systemctl restart kaoz-backend
sudo journalctl -u kaoz-backend -n 30 --no-pager
```

---

## Trampas conocidas

**Rotar antes de borrar.** Borrar `backend/scratch/` **no invalida** la API key de Zernio. El paso
1 (rotar) es el que importa; el paso 2 (limpiar historial) es higiene.

**El repo es privado, pero…** Si el repositorio solo lo ves tú, el riesgo del historial es bajo y
puedes saltarte el paso 2. Si en algún momento lo haces público —o si le das acceso a un
colaborador— el historial queda expuesto. **Cuando dudes, rota los secretos.**

**`git filter-repo` reescribe todo.** Avisa a cualquier colaborador. Y hazlo sobre un **clon
mirror**, nunca sobre tu copia de trabajo, o perderás el remoto configurado.

**No borres `frontend/scripts/` entero sin revisar.** Algunos scripts de diagnóstico pueden
resultarte útiles durante la puesta en marcha. Los del paso 7 ya están reemplazados por
`prisma studio` y el smoke test, pero consérvalos hasta que el sitio lleve una semana estable si
prefieres ir sobre seguro.

**El `page_old.tsx` de 88 KB.** Aunque no crea una ruta (Next.js solo enruta `page.tsx`), **sí se
incluye en el build** como módulo no referenciado. Borrarlo acelera un poco la compilación.

**Después de tocar dependencias, SIEMPRE recompila.** El frontend tiene las variables
`NEXT_PUBLIC_*` incrustadas en el bundle. Un `pnpm install` que cambie `node_modules` no las
altera, pero es buena práctica recompilar y volver a ejecutar el `grep` de localhost antes de
reiniciar. Es la comprobación de 1 segundo que evita el fallo más grave del despliegue.

---

## Lista final — el e-commerce está listo cuando…

Repasa esto una última vez. Todo debe estar marcado:

**Infraestructura**
- [ ] VPS con Ubuntu, Node 20, pnpm 9.15, PostgreSQL, nginx, certbot
- [ ] Firewall con solo 22/80/443; 3000 y 5010 en `127.0.0.1`
- [ ] DNS apuntando al VPS y certificado TLS con renovación automática

**Base de datos**
- [ ] Esquema versionado en `prisma/migrations`
- [ ] Datos iniciales cargados (admin, categorías, settings)
- [ ] Sin esquemas contradictorios (`supabase_schema.sql` eliminado)

**Aplicación**
- [ ] `localhost:5010` **NO** aparece en el bundle del cliente (verificado con grep)
- [ ] `pnpm start` usa `next start -H 127.0.0.1`
- [ ] `/health` responde y detecta la caída de la base de datos
- [ ] El bug de `const` en `settingsService.js` está corregido

**Seguridad**
- [ ] `/api/deployments/:id/toggle` requiere token de admin
- [ ] La búsqueda de órdenes exige email
- [ ] `GET /api/orders/:id` deniega por defecto
- [ ] Rate limiting en el backend y en nginx
- [ ] CORS sin wildcard de Vercel
- [ ] Secretos rotados (Zernio, Supabase, passwords admin)
- [ ] Stack traces no expuestos (`NODE_ENV=production`)

**Operación**
- [ ] Servicios systemd habilitados y resistentes a reinicio
- [ ] Backup diario **con copia fuera del servidor** y restauración probada
- [ ] Monitoreo con alertas reales
- [ ] Los 4 timers de tareas programadas activos

**Funcional**
- [ ] Compra completa probada de principio a fin
- [ ] Pedido visible en el panel de administración
- [ ] Producto creado con imagen desde el panel, imagen visible
- [ ] Stock descontado correctamente

Si todo está marcado: **el e-commerce está listo. 🎉**
