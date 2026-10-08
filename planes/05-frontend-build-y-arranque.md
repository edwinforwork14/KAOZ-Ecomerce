# Plan 05 — Frontend: build y arranque

> **Fase:** Bloqueadores · **Depende de:** 03 · **Bloquea a:** 09
> **Esfuerzo:** ~1,5 h · **Riesgo:** bajo

---

## Objetivo

Conseguir que el frontend **compile con la URL correcta del backend** y **arranque como servidor
Node real**, en vez de intentar servir una carpeta estática que nunca se genera.

---

## Por qué (evidencia)

### B1 — `localhost:5010` está horneado en el bundle del cliente 🔴

`NEXT_PUBLIC_BACKEND_URL` no estaba definida en ningún archivo del proyecto, así que el build usó
el fallback. Lo confirmé **ejecutando el build real e inspeccionando el bundle compilado**:

```
🚀 KAOS API initialized with BACKEND_URL: http://localhost:5010
Chunks del cliente que contienen "localhost:5010": 7
  .next/static/chunks/3163-398fa2fdfc4fc53e.js
  .next/static/chunks/4348-df1f006ba7557299.js
  .next/static/chunks/app/layout-790c6c9c4e55d01e.js   ← layout raíz
  .next/static/chunks/app/admin/layout-5c4559bdd8bc8254.js
  .next/static/chunks/app/auth/login/page-ff9a16173cfcbe70.js
  ...
```

Los navegadores de tus clientes intentarán llamar a **su propia máquina**. La tienda no carga.

**Y hay 3 sitios que lo usan SIN fallback**, que producirían la cadena literal `undefined/api/...`:

- `components/admin/ProductVariantEditor.tsx:102`
- `components/admin/BulkImageUploader.tsx:244`
- `app/admin/products/page.tsx:269`

Además `app/pmaa/deploy/page.tsx:54,82` usa una variable **diferente**, `NEXT_PUBLIC_API_URL`.

### B2 — `pnpm start` apunta a un directorio que no existe 🔴

```json
// frontend/package.json:13
"start": "serve out -p 3000"
```

Verificado: **`out/` no existe**, y nunca existirá, porque `next.config.mjs` **no** tiene
`output: 'export'`. `serve out` serviría una carpeta vacía. Debe ser `next start`.

### R10 — El sitemap se congela en el build y apunta a rutas inexistentes 🟠

`app/sitemap.ts` es una ruta de Next que se genera de forma **estática** durante el build. Lo
verifiqué en la salida del build:

```xml
<!-- .next/server/app/sitemap.xml.body — contenido real generado -->
<urlset ...>
  <url><loc>https://kaoz-sport.com</loc>...</url>
  <url><loc>https://kaoz-sport.com/checkout</loc>...</url>
</urlset>
```

Solo **2 URLs**, porque el backend no era alcanzable durante el build
(`Error fetching products for sitemap: ECONNREFUSED`). Y el sitemap queda congelado así hasta el
próximo build.

Peor: emite URLs para rutas **que no existen**. Verifiqué las carpetas reales de `app/`:

| URL en el sitemap | ¿Existe la ruta? |
|---|---|
| `/` | ✅ `app/page.tsx` |
| `/checkout` | ✅ `app/checkout/page.tsx` |
| `/product/:id` | ❌ **no existe** (`app/product/` no está) |
| `/catalog/category/:slug` | ❌ **no existe** (`app/catalog/` no está) |

El proyecto tiene **16 rutas** en total. `ProductDetail` se renderiza **dentro** de
`app/page.tsx` (línea 14), no como página propia. `components/CatalogLayout.tsx` está huérfano:
ningún archivo lo importa.

Además, el segundo `fetch` del sitemap (`sitemap.ts:48`) llama a `${backendUrl}/api/categories`,
pero **esa ruta no existe**. Las rutas reales son `/api/public/categories` y `/api/products`.
Siempre da 404.

---

## Pasos

### 1. Verificar que existe `frontend/.env.production`

Requisito del plan 03. **Sin esto no sigas**: el build quedaría con localhost otra vez.

```bash
cd /var/www/kaoz/app/frontend
ls -l .env.production
grep -E 'NEXT_PUBLIC_(BACKEND_URL|API_URL|SITE_URL)' .env.production
```

Debe mostrar los tres valores con tu dominio real.

### 2. Corregir el script `start` (B2)

`frontend/package.json`. Es la corrección de una línea:

```diff
   "scripts": {
     "build": "next build",
     "dev": "next dev",
     "lint": "next lint",
-    "start": "serve out -p 3000"
+    "start": "next start -p 3000 -H 127.0.0.1"
   },
```

Dos detalles importantes del cambio:

- **`next start`** en lugar de `serve out`: la app es renderizada por servidor, no exportada.
- **`-H 127.0.0.1`**: escucha **solo** en local loopback. nginx es quien habla con internet.
  Sin esto, Next.js escucharía en `0.0.0.0:3000` y alguien podría saltarse nginx y el HTTPS.

La dependencia `serve` queda sin uso. Quítala de `devDependencies` (o déjala; se limpia en el
plan 11).

### 3. Añadir los sitios que usan la variable sin fallback

Para que nunca más aparezca `undefined/api/...` en la interfaz, define un valor por defecto
coherente en los tres archivos.

**`components/admin/ProductVariantEditor.tsx:102`**

```diff
-      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/temp-upload`, {
+      const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
+      const response = await fetch(`${backendUrl}/api/admin/temp-upload`, {
```

**`components/admin/BulkImageUploader.tsx:244`**

```diff
-        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/bulk/${sessionId}/assets/${encodeURIComponent(image.id)}`, {
+        const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
+        await fetch(`${backendUrl}/api/admin/bulk/${sessionId}/assets/${encodeURIComponent(image.id)}`, {
```

**`app/admin/products/page.tsx:269`**

```diff
-      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/temp-upload`, {
+      const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
+      const response = await fetch(`${backendUrl}/api/admin/temp-upload`, {
```

> **Mejor aún:** crear `lib/config.ts` con un único helper y usarlo en los tres sitios. Ya existe
> `lib/config.ts` con `brandConfig`, así que puedes añadir ahí:

```ts
// lib/config.ts — añadir al final
export const getBackendUrl = () =>
  (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5010").replace(/\/$/, "");

export const getApiUrl = () => `${getBackendUrl()}/api`;
```

Y en los tres archivos: `import { getBackendUrl } from "@/lib/config"`.
Esto además unifica `NEXT_PUBLIC_BACKEND_URL` y `NEXT_PUBLIC_API_URL` en un solo lugar.

### 4. Unificar `NEXT_PUBLIC_API_URL` en el panel de deployments

`app/pmaa/deploy/page.tsx:54,82`. Hoy usa una variable distinta del resto:

```diff
-      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010/api"
+      const API_URL = getApiUrl()
```

Con el helper del paso 3. Recuerda añadir el import.

### 5. Arreglar el sitemap (R10)

Tres problemas en `app/sitemap.ts`: rutas inexistentes, endpoint equivocado y contenido congelado.

**5a. Corregir el endpoint de categorías** (línea 48). `/api/categories` no existe:

```diff
   try {
     const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5010").replace(/\/$/, "")
-    const response = await fetch(`${backendUrl}/api/categories`, {
+    const response = await fetch(`${backendUrl}/api/public/categories`, {
       signal: AbortSignal.timeout(5000),
     })
```

**5b. Quitar las rutas que no existen.** Mientras no exista `app/product/[id]` ni
`app/catalog/category/[slug]`, incluirlas hace que Google reciba 404 y penalice el sitio.
Sustituye la generación de `productRoutes` y `categoryRoutes` por una constante vacía, con una
nota para cuando se implementen:

```ts
// TODO: reactivar cuando existan las rutas app/product/[id] y app/catalog/category/[slug].
// Hoy el sitemap NO debe anunciarlas: devolverían 404 y perjudican el SEO.
const productRoutes: MetadataRoute.Sitemap = [];
const categoryRoutes: MetadataRoute.Sitemap = [];
```

O, mejor, deja las llamadas al backend pero **sin emitir URLs** hasta que las rutas existan.
Lo importante es no anunciar páginas que no se pueden visitar.

**5c. Hacer el sitemap dinámico.** Para que no se congele con el contenido del día del build,
añade al principio del archivo:

```ts
// Regenerar en cada petición en lugar de congelar el resultado del build.
// Sin esto, los productos nuevos no aparecen hasta el próximo despliegue.
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

**5d. (Opcional) Dar prioridad al sitemap en el build.** Si prefieres que sí se genere en build
con datos reales, el backend debe estar levantado durante `pnpm build`. Con `force-dynamic` ya no
hace falta; se documenta aquí por si lo prefieres.

### 6. Revisar `next.config.mjs`

El archivo está prácticamente bien. Dos observaciones:

```js
// next.config.mjs
eslint:     { ignoreDuringBuilds: true },   // ⚠️ permite subir código con errores de lint
typescript: { ignoreBuildErrors: true },    // ⚠️ permite subir código que no compila
images:     { unoptimized: true },          // ✅ correcto para VPS: no hace falta el optimizador
```

**No los cambies ahora**: ponerlos en `false` probablemente rompería el build, porque el proyecto
nunca se ha validado con TypeScript estricto. Queda como deuda en el plan 11.

Añade `output: 'standalone'` solo si más adelante quieres un despliegue mínimo. **Con systemd
ejecutando desde el repo completo no es necesario**, y `standalone` cambia la estructura de rutas
(`server.js` generado en `.next/standalone`), lo que complicaría el plan 08. **Déjalo sin tocar.**

### 7. Añadir el silenciado del warning de lockfiles

El build emite este warning porque hay varios `package-lock.json`/`pnpm-lock.yaml` en el árbol:

```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles and selected the directory of C:\Users\Edwin\pnpm-lock.yaml
```

No rompe nada, pero conviene fijarlo. En `next.config.mjs`:

```js
const nextConfig = {
  // Fija la raíz del proyecto: evita que Next.js la infiera mal por lockfiles sobrantes
  outputFileTracingRoot: __dirname,
  // ...resto igual
}
```

En ESM (`next.config.mjs`) usa la ruta explícita:

```js
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  outputFileTracingRoot: __dirname,
  // ...
}
```

La causa de fondo (los lockfiles duplicados) se elimina en el plan 11.

### 8. Revisar el `metadataBase`

`app/layout.tsx:18,28`:

```ts
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kaoz-sport.com"
...
metadataBase: new URL(siteUrl),
```

Con `NEXT_PUBLIC_SITE_URL` definida en `.env.production` (paso 1 del plan 03) queda correcto.
Verifica que tu dominio real coincida con ese fallback; si tu dominio final es otro, el fallback
importa poco porque la variable lo sobrescribe — pero si alguien compila sin el `.env.production`,
las etiquetas canónicas apuntarán a `kaoz-sport.com`.

### 9. Verificar el conteo de referencias a localhost

Antes del build definitivo, confirma que no queda ninguna referencia problemática:

```bash
cd /var/www/kaoz/app/frontend
grep -rn 'localhost:5010' --include='*.ts' --include='*.tsx' \
  app components contexts lib | grep -v node_modules
```

Las 6 coincidencias que verás son **fallbacks**, y eso está bien: existen para el desarrollo local.
Lo que importa es que `.env.production` esté presente durante el build.

---

## Verificación (criterio de aceptación)

Haz un build **de prueba** y confirma que ya no hay localhost en el bundle.

```bash
cd /var/www/kaoz/app/frontend

# 1. El .env.production está en su sitio
cat .env.production | grep NEXT_PUBLIC_BACKEND_URL

# 2. Build de prueba
NODE_OPTIONS="--max-old-space-size=1536" pnpm build

# 3. LA PRUEBA DEFINITIVA: ¿quedó localhost horneado?
grep -rl 'localhost:5010' .next/static/chunks/ 2>/dev/null | wc -l
# → DEBE DAR 0

# 4. ¿Aparece tu dominio real en el bundle?
grep -rl 'kaoz-sport.com' .next/static/chunks/ 2>/dev/null | wc -l
# → debe ser > 0

# 5. El script start es correcto
grep '"start"' package.json
# → "start": "next start -p 3000 -H 127.0.0.1"

# 6. Arranque real
pnpm start &
sleep 5
curl -s -o /dev/null -w "home: %{http_code}\n" http://127.0.0.1:3000/
curl -s -o /dev/null -w "login: %{http_code}\n" http://127.0.0.1:3000/auth/login
curl -s -o /dev/null -w "admin: %{http_code}\n" http://127.0.0.1:3000/admin/dashboard
curl -s -o /dev/null -w "sitemap: %{http_code}\n" http://127.0.0.1:3000/sitemap.xml
kill %1

# 7. El sitemap ya no anuncia rutas inexistentes
curl -s http://127.0.0.1:3000/sitemap.xml | grep -c '/product/'
# → DEBE DAR 0
```

**Pasa el plan cuando:**
- [ ] `grep -rl 'localhost:5010' .next/static/chunks/ | wc -l` da **0**. ← la más importante
- [ ] Tu dominio real aparece en los chunks del cliente.
- [ ] `pnpm start` arranca y responde 200 en `/`, `/auth/login` y `/admin/dashboard`.
- [ ] El sitemap ya no contiene `/product/` ni `/catalog/`.
- [ ] `next.config.mjs` tiene `outputFileTracingRoot`.

---

## Rollback

```bash
cd /var/www/kaoz/app
git checkout frontend/package.json frontend/app/sitemap.ts frontend/next.config.mjs
git checkout frontend/components/admin/ProductVariantEditor.tsx \
             frontend/components/admin/BulkImageUploader.tsx \
             frontend/app/admin/products/page.tsx \
             frontend/app/pmaa/deploy/page.tsx
rm -rf frontend/.next
```

Si el build falla por memoria:

```bash
NODE_OPTIONS="--max-old-space-size=1536" pnpm build
# o subir el swap (plan 01, paso 11)
```

---

## Trampas conocidas

**El orden es sagrado.** `.env.production` → `next build` → `next start`.
Si compilas y *luego* creas el `.env.production`, el bundle ya tiene localhost dentro y
**el arranque no lo arregla**. Tienes que volver a compilar. Este es el error más fácil de cometer
en todo el despliegue.

**No borres los fallbacks a localhost del código.** Son útiles para desarrollar en tu máquina.
El problema nunca fue que existieran, sino que la variable no estuviera definida en el build.

**`-H 127.0.0.1` es importante.** Sin él, Node escucha en todas las interfaces. En un VPS con
IP pública eso significa que `http://TU_IP:3000` sería accesible sin HTTPS y sin pasar por nginx.

**El sitemap dinámico y el rendimiento.** Con `force-dynamic`, cada petición a `/sitemap.xml`
consulta el backend. Es irrelevante: los buscadores lo piden pocas veces al día. Si prefieres
ahorrarte esa consulta, usa `export const revalidate = 3600` (una hora) en lugar de `0`.

**Las rutas que faltan no son un bug de despliegue.** El sitio es una SPA de una sola página
(`app/page.tsx`) con el detalle de producto renderizado dentro. `/product/:id` y
`/catalog/category/:slug` **nunca existieron en esta rama**. Si las quieres, es una tarea de
desarrollo aparte, no un arreglo de despliegue.
