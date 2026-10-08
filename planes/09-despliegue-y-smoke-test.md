# Plan 09 — Despliegue, puesta en marcha y smoke test

> **Fase:** Operación · **Depende de:** 01–08 · **Bloquea a:** 10
> **Esfuerzo:** ~2 h · **Riesgo:** medio

---

## Objetivo

Ejecutar el despliegue completo de principio a fin de forma **repetible**, crear el administrador,
cargar los datos iniciales, y verificar con un **smoke test** que el e-commerce funciona de verdad
— incluido el flujo de compra completo.

Este es el plan donde el e-commerce queda realmente operativo. **Solo se ejecuta una vez** que los
planes 01 a 08 estén completos.

---

## Prerrequisitos (verifícalos todos antes de empezar)

```bash
# 1. Infraestructura
node --version | grep v20
pnpm --version | grep 9.15
sudo systemctl is-active postgresql nginx
dig +short kaoz-sport.com

# 2. Base de datos con esquema
cd /var/www/kaoz/app/backend
npx prisma migrate status      # → "Database schema is up to date!"

# 3. Variables de entorno
ls -l backend/.env frontend/.env.production
grep -c '=$' backend/.env                       # → 0 (ninguna vacía)

# 4. Código sin los bloqueadores
grep -q 'let settings' src/services/settingsService.js && echo "✅ B5 arreglado"
grep -q '"/health"' src/server.js && echo "✅ health check presente"
grep -q 'protect, authorize' /var/www/kaoz/app/backend/src/routes/deployments.js && echo "✅ B6 arreglado"
grep -q 'next start' /var/www/kaoz/app/frontend/package.json && echo "✅ B2 arreglado"
```

Si algo falla aquí, **vuelve al plan correspondiente**. No continúes.

---

## Paso a paso

### 1. Actualizar el código a la última versión

```bash
cd /var/www/kaoz/app
sudo systemctl stop kaoz-frontend kaoz-backend

git fetch origin
git checkout migrate/remove-supabase
git pull origin migrate/remove-supabase

git log --oneline -8    # revisar que están tus commits de los planes 02-07
```

### 2. Instalar dependencias del backend

```bash
cd /var/www/kaoz/app/backend
pnpm install --frozen-lockfile

# Confirmar que hay engine Linux
ls node_modules/.prisma/client/ | grep '\.so\.node'
```

> Si `pnpm install` modificara el lockfile, `--frozen-lockfile` lo impediría y daría error.
> Eso significa que hay una dependencia nueva sin registrar — revisa `package.json`.

### 3. Aplicar migraciones a la base de datos

```bash
npx prisma migrate deploy    # idempotente: no borra datos
npx prisma generate

# Verificar
npx prisma migrate status
psql "$DATABASE_URL" -c "\dt" | head -20
```

### 4. Sembrar la base de datos

```bash
cd /var/www/kaoz/app/backend
pnpm seed
```

Debe imprimir:
```
✅ Admin listo: tu-correo@dominio.com
✅ 4 categorías listas
✅ Settings global listo
```

> Si el `seed` falla con *"Faltan ADMIN_EMAIL y ADMIN_PASSWORD"*, revisa el `.env`.
> Si falla con *"Environment variable not found: DIRECT_URL"*, no aplicaste el paso 3a del plan 02.

### 5. Compilar el frontend — **EL PASO MÁS CRÍTICO**

```bash
cd /var/www/kaoz/app/frontend

# Confirmar que el .env.production está presente ANTES del build
cat .env.production | grep NEXT_PUBLIC_BACKEND_URL

# Limpiar build anterior si lo hay
rm -rf .next

# Compilar
NODE_OPTIONS="--max-old-space-size=1536" pnpm build
```

Debe terminar con algo así:

```
✓ Compiled successfully
✓ Generating static pages (18/18)
Route (app)                              Size     First Load JS
┌ ○ /                                    30.5 kB  228 kB
├ ○ /admin/dashboard                     ...
└ ○ /sitemap.xml                         ...

○  (Static)  prerendered as static content
```

**Verificación inmediata e ineludible — comprueba que no quedó localhost:**

```bash
grep -rl 'localhost:5010' .next/static/chunks/ 2>/dev/null | wc -l
```

> # ⚠️ DEBE DAR **0**
>
> Si da más de 0, el `NEXT_PUBLIC_BACKEND_URL` no estaba presente durante el build.
> **Detente y revisa el paso 1 del plan 05.** No arranques el frontend: los navegadores de tus
> clientes llamarían a su propio `localhost`.

### 6. Arrancar los servicios

```bash
sudo systemctl start kaoz-backend
sleep 3
sudo systemctl start kaoz-frontend
sleep 5

sudo systemctl status kaoz-backend --no-pager | head -12
sudo systemctl status kaoz-frontend --no-pager | head -12
```

### 7. Que el backend registre el deployment

> ⚠️ **Esto es crítico.** `middleware/deploymentCheck.js:9-13` devuelve **503 en TODAS las rutas
> `/api/*`** si `NODE_ENV=production` y no hay un deployment activo en la base de datos.
> Si este paso falla, **la tienda entera aparece como "en mantenimiento"**.

El registro ocurre en `server.js:35-43` al arrancar. Verifícalo:

```bash
psql "$DATABASE_URL" -c 'SELECT version, "isActive", environment FROM "Deployment";'
```

Debe haber **al menos una fila con `isActive = true`**.

Si la tabla está vacía, créala a mano:

```bash
psql "$DATABASE_URL" -c "
INSERT INTO \"Deployment\" (id, version, \"isActive\", \"deployedAt\", environment, \"createdAt\", \"updatedAt\")
VALUES (gen_random_uuid(), 'manual-$(date +%s)', true, NOW(), 'production', NOW(), NOW());
"
```

Y confirma que la API responde:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://kaoz-sport.com/api/products
# → 200 (si da 503, es este problema)
```

---

## Smoke test — verificación funcional completa

Ejecuta **todo** esto. No te salte ninguno.

### A. Infraestructura básica

```bash
echo "=== A. Infraestructura ==="
curl -s https://kaoz-sport.com/health | head -20
echo
curl -s -o /dev/null -w "home:       %{http_code}\n" https://kaoz-sport.com/
curl -s -o /dev/null -w "checkout:   %{http_code}\n" https://kaoz-sport.com/checkout
curl -s -o /dev/null -w "login:      %{http_code}\n" https://kaoz-sport.com/auth/login
curl -s -o /dev/null -w "register:   %{http_code}\n" https://kaoz-sport.com/auth/register
curl -s -o /dev/null -w "admin:      %{http_code}\n" https://kaoz-sport.com/admin/dashboard
curl -s -o /dev/null -w "pmaa:       %{http_code}\n" https://kaoz-sport.com/pmaa/deploy
curl -s -o /dev/null -w "sitemap:    %{http_code}\n" https://kaoz-sport.com/sitemap.xml
curl -s -o /dev/null -w "robots:     %{http_code}\n" https://kaoz-sport.com/robots.txt
```

Esperado: `/health` con `"healthy"`, todo lo demás **200** (o 307 si redirige).

### B. API pública

```bash
echo "=== B. API publica ==="
curl -s "https://kaoz-sport.com/api/products?limit=3" | head -c 300; echo
curl -s "https://kaoz-sport.com/api/products/featured" | head -c 200; echo
curl -s "https://kaoz-sport.com/api/public/categories" | head -c 300; echo
curl -s "https://kaoz-sport.com/api/settings/public" | head -c 400; echo
```

Esperado: JSON con `"success": true` y datos reales (no el fallback reducido del bug B5).

### C. Autenticación

```bash
echo "=== C. Autenticacion ==="

# 3a. Login correcto
TOKEN=$(curl -s -X POST https://kaoz-sport.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"TU_ADMIN_EMAIL","password":"TU_ADMIN_PASSWORD"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then echo "✅ Login OK, token de ${#TOKEN} caracteres"; else echo "❌ Login FALLO"; fi

# 3b. El token tiene expiración (R12 — sin JWT_EXPIRE no la tendría)
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | grep -o '"exp":[0-9]*' \
  && echo "✅ El token tiene exp" || echo "❌ El token NO expira nunca"

# 3c. Login incorrecto
curl -s -o /dev/null -w "login malo: %{http_code}\n" -X POST https://kaoz-sport.com/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"no@existe.com","password":"malo"}'
# → 401

# 3d. Ruta protegida sin token
curl -s -o /dev/null -w "admin sin token: %{http_code}\n" https://kaoz-sport.com/api/admin/orders
# → 401

# 3e. Ruta protegida con token
curl -s -o /dev/null -w "admin con token: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" https://kaoz-sport.com/api/admin/orders
# → 200

# 3f. El interruptor de apagado está cerrado (B6)
curl -s -o /dev/null -w "toggle sin token: %{http_code}\n" \
  -X PUT https://kaoz-sport.com/api/deployments/x/toggle \
  -H "Content-Type: application/json" -d '{"isActive":false}'
# → 401  ← SI DA 200, LA TIENDA ES APAGABLE POR CUALQUIERA
```

### D. Stack de errores no expuesto (R12)

```bash
echo "=== D. Fuga de informacion ==="

# Forzar un error y comprobar que NO llega el stack trace
curl -s "https://kaoz-sport.com/api/products/id-que-no-existe" \
  | grep -iE 'at |prisma|node_modules|\.js:[0-9]+' \
  && echo "❌ FUGA: se está filtrando el stack" \
  || echo "✅ Sin fuga de stack"

# Confirmar NODE_ENV
sudo journalctl -u kaoz-backend -n 30 --no-pager | grep -i 'ENV'
# → 🌍 [ENV] production
```

### E. Persistencia de imágenes

```bash
echo "=== E. Imagenes ==="
ls -la /var/lib/kaoz/uploads/products/ | head
psql "$DATABASE_URL" -c 'SELECT url FROM "ProductImage" LIMIT 3;'
```

Esperado: URLs **absolutas** con `https://kaoz-sport.com/uploads/products/...`.

### F. Prueba de reinicio (el e-commerce debe sobrevivir)

```bash
echo "=== F. Reinicio ==="
sudo reboot
```

Espera ~40 segundos, vuelve a entrar por SSH y ejecuta:

```bash
sudo systemctl is-active kaoz-backend kaoz-frontend    # → active active
curl -s https://kaoz-sport.com/health | head -5
curl -s -o /dev/null -w "home tras reboot: %{http_code}\n" https://kaoz-sport.com/
```

### G. Prueba manual en el navegador — **NO OMITIR**

El smoke test por `curl` no cubre el JavaScript del cliente ni el flujo de compra. Hazlo a mano:

**G1 — Tienda pública**
1. Abrir `https://kaoz-sport.com/` en una **ventana de incógnito**.
2. Abrir DevTools → pestaña **Network** → recargar.
3. **Verificar que ninguna petición va a `localhost`.** Filtra por "localhost": debe salir vacío.
   Las peticiones deben ir a `kaoz-sport.com/api/...`.
4. Comprobar que los productos cargan y las imágenes se ven.

**G2 — Carrito**
5. Añadir un producto al carrito.
6. Verificar que el contador del carrito se actualiza.
7. Recargar: el carrito debe persistir.

**G3 — Compra completa (el flujo más importante)**
8. Ir a `/checkout`.
9. Rellenar los datos del cliente.
10. Seleccionar método de envío y de pago.
11. **Completar el pedido.**
12. Verificar que aparece la confirmación con el número de pedido.

> ⚠️ **Aquí puede aparecer el efecto del paso 2a del plan 06.** Si endureciste
> `GET /api/orders/:id` y el checkout lee la confirmación con esa llamada, dará **403**.
> Si esto ocurre: el checkout debe mostrar la confirmación con los datos que ya recibió de
> `POST /api/orders` (que devuelve el pedido completo en la respuesta).
> Revisa `components/checkout.tsx` y ajusta esa lectura.

**G4 — Panel de administración**
13. Entrar en `/auth/login` con el admin nuevo.
14. Ir a `/admin/orders`: **el pedido de G3 debe aparecer**.
15. Abrir el pedido y confirmar que los datos son correctos.
16. Ir a `/admin/products`.
17. **Crear un producto de prueba** con al menos una imagen.
18. Verificar que la imagen se sube y se ve.
19. Confirmar el archivo en disco:
    ```bash
    ls -la /var/lib/kaoz/uploads/products/ | tail -3
    ```
20. Verificar la URL absoluta en la base:
    ```bash
    psql "$DATABASE_URL" -c 'SELECT url FROM "ProductImage" ORDER BY "id" DESC LIMIT 1;'
    ```
21. Ir a `/admin/settings` y guardar un cambio (para probar el bug B5 en marcha).
22. Verificar que el **stock se descontó** tras la compra de G3:
    ```bash
    psql "$DATABASE_URL" -c 'SELECT size, stock FROM "ProductSize" LIMIT 5;'
    ```

**G5 — Panel de deployments**
23. Abrir `/pmaa/deploy`. Introducir la contraseña.
24. Verificar que **la lista de deployments carga** (antes daba 401; ahora con token de admin
    debería funcionar). Si falla, revisa el paso 1 del plan 06.

**G6 — SEO**
25. Abrir `https://kaoz-sport.com/sitemap.xml`.
26. Confirmar que **no** contiene `/product/` ni `/catalog/` (plan 05, paso 5b).
27. Abrir el código fuente de la home y verificar que las etiquetas `og:` y `canonical` apuntan
    a `https://kaoz-sport.com` (no a `localhost` ni a `kaoz-sport.com` equivocado).

---

## Criterio de aceptación final

**Pasa el plan cuando:**
- [ ] `grep -rl 'localhost:5010' .next/static/chunks/ | wc -l` da **0**.
- [ ] Existe al menos una fila con `isActive = true` en la tabla `Deployment`.
- [ ] `https://kaoz-sport.com/health` devuelve `"healthy"`.
- [ ] Todas las rutas de la sección A devuelven 200.
- [ ] El login devuelve un token **con campo `exp`**.
- [ ] `/api/admin/orders` da **401** sin token y **200** con token.
- [ ] `PUT /api/deployments/:id/toggle` da **401** sin token.
- [ ] No hay stack traces en las respuestas de error.
- [ ] Las URLs de imagen en la base son **absolutas**.
- [ ] El sitio funciona **después de reiniciar el VPS**.
- [ ] El navegador **no hace ninguna petición a `localhost`**.
- [ ] Se completó una **compra de verdad** de principio a fin.
- [ ] El pedido aparece en `/admin/orders`.
- [ ] Se **subió un producto con imagen** desde el panel y la imagen se ve.
- [ ] El stock se descontó correctamente tras la compra.

---

## Rollback

**Si el despliegue sale mal y quieres volver a la versión anterior:**

```bash
cd /var/www/kaoz/app
sudo systemctl stop kaoz-frontend kaoz-backend

git log --oneline -10
git checkout <commit_anterior>

cd backend && pnpm install --frozen-lockfile && npx prisma generate
cd ../frontend && rm -rf .next && NODE_OPTIONS="--max-old-space-size=1536" pnpm build

sudo systemctl start kaoz-backend kaoz-frontend
```

> **Las migraciones no se revierten solas.** `prisma migrate deploy` solo avanza. Si una migración
> dañó datos, hay que restaurar el backup (plan 10) o escribir un SQL de reversión a mano.

**Si solo el frontend está roto:** el backend sigue sirviendo `/api` y `/uploads`, así que los
datos están a salvo. Puedes volver a compilar sin tocar la base.

**Si el botón de emergencia hace falta:** existe el panel `/pmaa/deploy`, que puede desactivar los
deployments y poner la tienda en modo mantenimiento (503). Es la red de seguridad diseñada en el
proyecto.

---

## Plantilla de despliegue para el futuro

Guarda esto como `deploy.sh` para los siguientes despliegues:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/kaoz/app
echo "🚀 Desplegando KAOZ $(date '+%Y-%m-%d %H:%M:%S')"

cd "$APP_DIR"
git fetch origin
git checkout migrate/remove-supabase
git pull origin migrate/remove-supabase
echo "📦 Commit: $(git rev-parse --short HEAD)"

# 1. Backend
cd "$APP_DIR/backend"
pnpm install --frozen-lockfile
npx prisma migrate deploy
npx prisma generate
echo "✅ Backend listo"

# 2. Frontend
cd "$APP_DIR/frontend"
rm -rf .next
NODE_OPTIONS="--max-old-space-size=1536" pnpm build

# 3. La verificación que nunca se debe saltar
LOCALHOST_REFS=$(grep -rl 'localhost:5010' .next/static/chunks/ 2>/dev/null | wc -l)
if [ "$LOCALHOST_REFS" -ne 0 ]; then
  echo "❌ ABORTADO: $LOCALHOST_REFS chunks contienen localhost:5010."
  echo "   Falta frontend/.env.production o no se recargó durante el build."
  exit 1
fi
echo "✅ Bundle limpio (sin localhost)"

# 4. Reiniciar
sudo systemctl restart kaoz-backend
sleep 3
sudo systemctl restart kaoz-frontend
sleep 5

# 5. Verificación post-despliegue
if curl -sf http://127.0.0.1:5010/health > /dev/null; then
  echo "✅ Backend saludable"
else
  echo "❌ Backend NO responde. Revisando logs:"
  sudo journalctl -u kaoz-backend -n 30 --no-pager
  exit 1
fi

if curl -sf -o /dev/null http://127.0.0.1:3000/; then
  echo "✅ Frontend responde"
else
  echo "❌ Frontend NO responde. Revisando logs:"
  sudo journalctl -u kaoz-frontend -n 30 --no-pager
  exit 1
fi

echo "🎉 Despliegue completado"
```

```bash
chmod +x /var/www/kaoz/app/deploy.sh
```

> **La comprobación de `localhost` dentro de `deploy.sh` es la pieza más valiosa.** Es el error más
> fácil de cometer y el más difícil de detectar: el sitio se ve bien en el servidor y roto en el
> navegador de todos los clientes. Este `grep` lo detecta en un segundo.

---

## Trampas conocidas

**El orden build → restart.** Si reinicias el frontend **antes** de que el build termine, seguirá
sirviendo el bundle viejo (o dará 404 si borraste `.next`). El script de arriba lo hace en orden.

**`prisma generate` después de `migrate deploy`.** `migrate deploy` puede dejar el cliente
desactualizado si el esquema cambió. El script ejecuta ambos, en ese orden.

**El 503 de mantenimiento.** Si tras desplegar todo da 503, **casi siempre** es la tabla
`Deployment` vacía (paso 7). Es el fallo más confuso del proyecto porque el backend está
perfectamente sano.

**El checkout y el endurecimiento de órdenes.** Es el único cambio del plan 06 que puede romper
una funcionalidad existente. Pruébalo explícitamente en G3.

**Las sesiones de admin en localStorage.** El token vive en `localStorage` con la clave
`kaoz_admin_token` (`lib/api.ts:618`). Si rotaste `JWT_SECRET` (plan 03), **todos los tokens
antiguos dejan de valer** y hay que volver a entrar. Es lo esperado tras el despliegue inicial.

**Los permisos de `/var/lib/kaoz`.** Si las subidas fallan con `EACCES`, revisa
`sudo chown -R kaoz:kaoz /var/lib/kaoz` (plan 07, paso 4) **y** el `ReadWritePaths` del servicio
systemd (plan 08, paso 1).
