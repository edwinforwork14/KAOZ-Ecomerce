# Plan 07 — Imágenes y almacenamiento persistente

> **Fase:** Bloqueadores · **Depende de:** 04 · **Bloquea a:** 08, 09
> **Esfuerzo:** ~1 h · **Riesgo:** bajo

---

## Objetivo

Garantizar que las imágenes de los productos **sobrevivan a los despliegues** y que el frontend
las muestre correctamente, sin depender de que `NEXT_PUBLIC_BACKEND_URL` esté bien configurada
para arreglar la ruta en el cliente.

---

## Por qué (evidencia)

### Lo bueno: la capa de almacenamiento ya está escrita para un VPS ✅

`backend/src/config/storage.js:4-11` — esto **ya migró** de Supabase Storage a disco local:

```js
/**
 * Capa de almacenamiento de imágenes en disco local (Contabo VPS).
 * Reemplaza a Supabase Storage. Guarda los archivos en <repo>/uploads/products
 * y sirven a través de las rutas estáticas /uploads y /images definidas en server.js.
 */
const UPLOADS_ROOT = path.join(__dirname, "../../uploads");
const PRODUCTS_DIR = path.join(UPLOADS_ROOT, "products");
```

Usa `__dirname`, **no** `process.cwd()`. Verificado con grep: **cero** coincidencias de
`process.cwd()` en `backend/src/`. Esto significa que **el directorio de trabajo del proceso no
importa** — funciona igual desde systemd, desde una terminal o desde cualquier otro sitio.
Es exactamente lo que se necesita.

### Lo malo: `uploads/` está en `.gitignore` 🟠

```gitignore
# backend/.gitignore:3
uploads/
```

Consecuencia concreta: un `git clone` limpio en el VPS **no crea la carpeta**, y la crea de forma
perezosa `storage.js:38`. Pero el problema real es otro:

> **Si el despliegue reemplaza el directorio de la aplicación** (un `rsync --delete`, un
> `git clean -fdx`, una carpeta de release nueva por versión), **todas las imágenes de producto
> se pierden** mientras la base de datos sigue apuntando a URLs que ya no existen.

### Las URLs pueden salir relativas 🟠

```js
// backend/src/config/storage.js:49-56
const getPublicUrl = (filePath) => {
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const cleanPath = filePath.replace(/^\/+/, "");
  if (PUBLIC_BASE_URL) {
    return `${PUBLIC_BASE_URL}/uploads/products/${cleanPath}`;
  }
  return `/uploads/products/${cleanPath}`;   // ← fallback relativo
};
```

Sin `PUBLIC_BASE_URL`, el API devuelve `/uploads/products/archivo.webp`. El frontend está en otro
origen, así que `<img src="/uploads/...">` se resolvería contra el **host del frontend**.

Hoy eso lo salva `lib/api.ts:11-17`:

```ts
export const cleanImageUrl = (url: string) => {
  if (!url) return "/placeholder.svg"
  if (url.startsWith('http')) return url
  const base = BACKEND_URL.replace(/\/$/, '');
  if (url.startsWith('/')) return `${base}${url}`
  return `${base}/uploads/${url}`
}
```

Pero eso depende de que **cada** componente use `cleanImageUrl`. Mejor que las URLs ya vengan
absolutas desde el servidor.

### Imágenes antiguas de Supabase 🟡

`storage.js:75-78` ignora deliberadamente las URLs absolutas que no son locales:

```js
} else if (/^https?:\/\//i.test(filePath)) {
  // URL externa o de Supabase antigua: no tocar archivos locales
  continue;
}
```

Si en la base hubiera filas con URLs `https://...supabase.co/...` de la etapa anterior, esas
imágenes darán 404 tras la migración y sus archivos nunca se limpiarán. Con una base nueva (que es
el plan) no aplica, pero queda documentado por si importas datos.

---

## Decisión aplicada

Del índice: las imágenes viven en **`/var/lib/kaoz/uploads`**, fuera del directorio del release.
La carpeta ya se creó en el plan 01, paso 9.

---

## Pasos

### 1. Hacer configurable la ruta de uploads

`storage.js` hoy deriva la ruta de `__dirname`, así que siempre apunta dentro del repo. Hay que
permitir sobreescribirla.

`backend/src/config/storage.js`. Sustituye las líneas 10-11:

```diff
-const UPLOADS_ROOT = path.join(__dirname, "../../uploads");
-const PRODUCTS_DIR = path.join(UPLOADS_ROOT, "products");
+// Ruta de uploads. Configurable para poder sacarla del directorio del release:
+// si vive dentro del repo, un redespliegue con rsync --delete borra las imágenes.
+// Fallback: <repo>/uploads (útil en desarrollo).
+const UPLOADS_ROOT = process.env.UPLOADS_DIR
+  ? path.resolve(process.env.UPLOADS_DIR)
+  : path.join(__dirname, "../../uploads");
+
+const PRODUCTS_DIR = path.join(UPLOADS_ROOT, "products");
```

> **Nota:** se usa `path.resolve` para aceptar rutas relativas y absolutas. En el VPS será una
> ruta absoluta (`/var/lib/kaoz/uploads`).

### 2. Servir los archivos desde la ruta configurable

`backend/src/server.js:86-87` también deriva de `__dirname`. Hay que alinearlo:

```diff
-// Servir archivos estáticos (las imágenes se guardan en /uploads del VPS)
-app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
-app.use("/images", express.static(path.join(__dirname, "../uploads")));
+// Servir archivos estáticos (las imágenes se guardan fuera del release; ver config/storage.js)
+const { PRODUCTS_DIR } = require("./config/storage");
+const UPLOADS_ROOT = path.dirname(PRODUCTS_DIR);
+
+app.use("/uploads", express.static(UPLOADS_ROOT, {
+  maxAge: "30d",                 // las imágenes de producto no cambian
+  immutable: true,
+  fallthrough: true,             // dejar pasar al 404 de Express si no existe
+}));
+
+// Alias heredado. Se mantiene por compatibilidad con URLs antiguas.
+app.use("/images", express.static(UPLOADS_ROOT, { maxAge: "30d", immutable: true }));
```

> **Sobre `immutable: true`:** los nombres de archivo son únicos
> (`upload.js:49-50`: `product-${Date.now()}-${Math.random()*1e9}.webp`), así que nunca se
> sobrescribe un archivo con el mismo nombre. Cachear agresivamente es seguro y **ahorra mucho
> ancho de banda del VPS**.

### 3. Añadir `UPLOADS_DIR` a las variables de entorno

En `backend/.env` (plan 03), añade:

```env
# Ruta de imágenes, FUERA del directorio del release.
# Un redespliegue no debe tocar esta carpeta.
UPLOADS_DIR=/var/lib/kaoz/uploads
```

Y en `backend/.env.example`:

```env
# Ruta absoluta donde se guardan las imágenes de producto.
# IMPORTANTE: fuera del directorio del código, para que sobrevivan a los despliegues.
UPLOADS_DIR=/var/lib/kaoz/uploads
```

### 4. Verificar permisos y crear la estructura

La carpeta ya existe del plan 01, pero confirma que el usuario del servicio puede escribir:

```bash
sudo mkdir -p /var/lib/kaoz/uploads/products
sudo chown -R kaoz:kaoz /var/lib/kaoz
sudo chmod 755 /var/lib/kaoz /var/lib/kaoz/uploads /var/lib/kaoz/uploads/products

ls -ld /var/lib/kaoz/uploads/products
# → drwxr-xr-x kaoz kaoz
```

### 5. Establecer `PUBLIC_BASE_URL`

Ya está en el plan 03, pero se verifica aquí porque su efecto está en este archivo:

```bash
grep '^PUBLIC_BASE_URL=' /var/www/kaoz/app/backend/.env
# → PUBLIC_BASE_URL=https://kaoz-sport.com
```

Con el esquema de un solo dominio, esto hace que las URLs de imagen salgan **absolutas**:
`https://kaoz-sport.com/uploads/products/product-123.webp`.

### 6. Confirmar la ruta estática en nginx

El vhost completo está en el plan 08. La pieza que importa aquí:

```nginx
# Las imágenes las sirve directamente el backend (Express) desde /var/lib/kaoz/uploads
location /uploads/ {
    proxy_pass http://127.0.0.1:5010;
    proxy_set_header Host $host;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

> **Mejora opcional (rendimiento).** Servir archivos estáticos a través de Node consume CPU y
> memoria del proceso. nginx puede servirlos directamente desde el disco:

```nginx
location /uploads/ {
    alias /var/lib/kaoz/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

Esto es **más rápido y libera al backend**. La única condición es que el usuario `www-data`
(con el que corre nginx) pueda leer la carpeta. Como está en modo `755`, sí puede. Se implementa
en el plan 08.

### 7. Migrar las imágenes existentes (si las hay)

Si tienes archivos en `backend/uploads/products/` de tu desarrollo local:

```bash
# Desde tu máquina local, subir lo que exista
scp -r "C:\Users\Edwin\Desktop\KAOZ-Ecomerce\KAOZ\backend\uploads\products\*" \
    kaoz@TU_IP:/var/lib/kaoz/uploads/products/
```

Y en el VPS, ajustar permisos:

```bash
sudo chown -R kaoz:kaoz /var/lib/kaoz/uploads
ls -la /var/lib/kaoz/uploads/products/ | head
```

> **Con la base de datos nueva** (que es el plan), las imágenes se subirán desde el panel de
> admin y aparecerán directamente en la carpeta correcta. Solo haz este paso si vas a importar
> productos existentes.

### 8. Añadir limpieza de huérfanos (opcional, recomendado)

Con el tiempo quedan archivos de productos borrados. Un script de mantenimiento:

```bash
nano /var/www/kaoz/app/backend/scripts/clean-orphan-images.js
```

```js
// Lista archivos en disco que ya no están referenciados en la base de datos.
// NO borra nada: solo informa. Añade --delete para eliminar de verdad.
require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const PRODUCTS_DIR = path.join(
  process.env.UPLOADS_DIR || path.join(__dirname, "../uploads"),
  "products"
);

async function main() {
  const borrar = process.argv.includes("--delete");

  const imagenes = await prisma.productImage.findMany({ select: { url: true } });
  const enUso = new Set(
    imagenes
      .map((i) => (i.url || "").split("/uploads/products/")[1])
      .filter(Boolean)
      .map((p) => p.split("?")[0])
  );

  const enDisco = await fs.readdir(PRODUCTS_DIR).catch(() => []);
  const huerfanos = enDisco.filter((f) => !enUso.has(f) && f !== "bulk");

  console.log(`📊 En uso: ${enUso.size} | En disco: ${enDisco.length} | Huérfanos: ${huerfanos.length}`);

  if (huerfanos.length && !borrar) {
    console.log("\nPrimeros 20 huérfanos (usa --delete para eliminarlos):");
    huerfanos.slice(0, 20).forEach((f) => console.log(`  ${f}`));
  }

  if (borrar) {
    for (const f of huerfanos) {
      await fs.unlink(path.join(PRODUCTS_DIR, f)).catch(() => {});
    }
    console.log(`🗑️  ${huerfanos.length} archivos eliminados.`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

Añade el script a `package.json`: `"clean:images": "node scripts/clean-orphan-images.js"`.

---

## Verificación (criterio de aceptación)

```bash
cd /var/www/kaoz/app/backend

# 1. La ruta es configurable
grep -n 'UPLOADS_DIR' src/config/storage.js src/server.js

# 2. La variable está definida
grep '^UPLOADS_DIR=' .env

# 3. Los permisos son correctos
ls -ld /var/lib/kaoz/uploads/products

# 4. Arrancar y confirmar la ruta efectiva
node -e "
require('dotenv').config();
const { PRODUCTS_DIR, getPublicUrl } = require('./src/config/storage');
console.log('PRODUCTS_DIR:', PRODUCTS_DIR);
console.log('URL ejemplo :', getPublicUrl('product-123.webp'));
console.log('URL absoluta:', getPublicUrl('https://otro.com/x.webp'));
"
# → PRODUCTS_DIR: /var/lib/kaoz/uploads/products
# → URL ejemplo : https://kaoz-sport.com/uploads/products/product-123.webp   ← ABSOLUTA
# → URL absoluta: https://otro.com/x.webp                                    ← sin tocar
```

**Prueba de persistencia — la más importante del plan:**

```bash
# 1. Crear un archivo de prueba
echo "prueba" | sudo -u kaoz tee /var/lib/kaoz/uploads/products/prueba-persistencia.txt

# 2. Simular un redespliegue que borra el directorio del código
cd /var/www/kaoz/app
ls backend/uploads/ 2>&1
# → no existe dentro del repo (está correctamente fuera)

# 3. El archivo sigue en su sitio
ls -la /var/lib/kaoz/uploads/products/prueba-persistencia.txt
# → existe

# Limpiar
sudo rm /var/lib/kaoz/uploads/products/prueba-persistencia.txt
```

**Prueba de subida real** (después del plan 08, con la app corriendo):

1. Entrar en `https://kaoz-sport.com/admin/products` como admin.
2. Subir una imagen de producto.
3. Confirmar que aparece en `/var/lib/kaoz/uploads/products/`:

```bash
ls -la /var/lib/kaoz/uploads/products/ | tail -5
# → debe aparecer product-<timestamp>-<random>.webp
```

4. Confirmar que la URL guardada en la base es absoluta:

```bash
psql "$DATABASE_URL" -c 'SELECT url FROM "ProductImage" ORDER BY "id" DESC LIMIT 3;'
# → https://kaoz-sport.com/uploads/products/product-....webp
```

5. Confirmar que la imagen se ve en el navegador.

**Pasa el plan cuando:**
- [ ] `PRODUCTS_DIR` apunta a `/var/lib/kaoz/uploads/products`.
- [ ] `getPublicUrl('archivo.webp')` devuelve una URL **absoluta** con tu dominio.
- [ ] Una subida desde el panel de admin crea el archivo en `/var/lib/kaoz/uploads/products/`.
- [ ] La URL en la base de datos es absoluta y la imagen se ve en el navegador.
- [ ] El archivo de prueba sobrevive a un `git clean -fdx` dentro del repo.

---

## Rollback

```bash
cd /var/www/kaoz/app
git checkout backend/src/config/storage.js backend/src/server.js
```

Y quita `UPLOADS_DIR` del `.env`. La app vuelve a usar `backend/uploads/`.

> **Consecuencia del rollback:** volverás a la situación en la que un redespliegue borra las
> imágenes. Los archivos que ya estén en `/var/lib/kaoz/uploads` no se moverán solos:

```bash
cp -r /var/lib/kaoz/uploads/products/* /var/www/kaoz/app/backend/uploads/products/
```

---

## Trampas conocidas

**`path.resolve` vs `path.join`.** Si `UPLOADS_DIR` es una ruta relativa, `path.resolve` la
resuelve contra el directorio de trabajo actual, que en systemd es el que declare
`WorkingDirectory`. **Usa siempre una ruta absoluta** en el `.env` y eliminas esa ambigüedad.

**La guarda de path traversal.** `storage.js:33-36` comprueba:

```js
if (!absolutePath.startsWith(PRODUCTS_DIR)) {
  throw new Error("Ruta de archivo inválida");
}
```

Es un `startsWith`, que técnicamente aceptaría una carpeta hermana llamada `products-evil`. En la
práctica **no es explotable** porque los nombres los genera siempre el servidor
(`upload.js:49-50`). No es urgente, pero si quieres cerrarlo del todo, sustituye por:

```js
const relativo = path.relative(PRODUCTS_DIR, absolutePath);
if (relativo.startsWith("..") || path.isAbsolute(relativo)) {
  throw new Error("Ruta de archivo inválida");
}
```

**Los archivos temporales de la carga masiva.** `bulkProductService` guarda en
`bulk/<sessionId>/<archivo>.webp`. Eso está **dentro** de `PRODUCTS_DIR`, así que se beneficia del
cambio automáticamente. El script de limpieza del paso 8 excluye la carpeta `bulk`
deliberadamente — las sesiones en curso no deben borrarse.

**Backups de imágenes.** `/var/lib/kaoz/uploads` debe entrar en el backup. El plan 10 lo cubre:
el script de backup incluye tanto el `pg_dump` como un `tar` de esta carpeta. **Una base de datos
restaurada sin las imágenes está rota.**
