# Plan 06 — Seguridad y autorización

> **Fase:** Bloqueadores · **Depende de:** 04 · **Bloquea a:** 09
> **Esfuerzo:** ~2 h · **Riesgo:** medio (toca autenticación)

---

## Objetivo

Cerrar las puertas que hoy están abiertas. En un preview de Vercel con URL oscura eran
tolerables; en un VPS con dominio público y real son vulnerabilidades explotables.

**Este plan es obligatorio antes de apuntar el dominio público.**

---

## Por qué (evidencia)

### B6 — Cualquiera puede apagar la tienda completa 🔴

```js
// backend/src/routes/deployments.js:5-6
// Todas las rutas son públicas para el panel de control directo
// La seguridad se maneja en el frontend con contraseña

router.get("/", deploymentController.getDeployments);           // lista todo
router.put("/:id/toggle", deploymentController.toggleDeployment); // ← sin auth
router.get("/active", deploymentController.getActiveDeployment);
```

Y `middleware/deploymentCheck.js:9-13` hace que, **sin un deployment activo, todas las rutas
`/api/*` devuelvan 503**:

```js
if (!activeDeployment && process.env.NODE_ENV === "production") {
  return res.status(503).json({ message: "Servicio en mantenimiento - Implementación no activa" });
}
```

La "seguridad en el frontend" es `app/pmaa/deploy/page.tsx:37`, un hash bcrypt **embebido en el
bundle del cliente**. Un simple `curl` apaga la tienda entera:

```bash
curl -X PUT https://kaoz-sport.com/api/deployments/<id>/toggle \
  -H "Content-Type: application/json" -d '{"isActive":false}'
```

### R1 — Órdenes enumerables con datos personales 🟠

```js
// backend/src/controllers/orderController.js:162-196  → sin ninguna autorización
const searchOrder = async (req, res) => {
  const { orderNumber } = req.query;
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } });
  ...res.json({ success: true, order });   // ← devuelve customerInfo completo
```

Y los números de orden son **predecibles por diseño** (`orderService.js:7-13`):

```js
const timestamp = Date.now().toString().slice(-6);        // últimos 6 dígitos del tiempo
const random = Math.floor(Math.random() * 1000)...        // solo 1000 posibilidades
return `${prefix}-${timestamp}${random}`;                  // → "KAOZ-123456789"
```

Con ~1000 combinaciones por instante de tiempo y **cero rate limiting**, se enumeran todos los
pedidos. Cada respuesta incluye nombre, email y teléfono del cliente.

### R2 — IDOR en `GET /api/orders/:id` 🟠

```js
// backend/src/controllers/orderController.js:136-147
// Verificar que sea el dueño o admin
if (
  req.user &&              // ← si NO hay token, req.user es undefined
  order.userId &&          //   y el guard NUNCA se ejecuta
  order.userId !== req.user.id &&
  req.user.role !== "admin"
) { return res.status(403)... }
```

La ruta está montada con el middleware `optional` (`routes/orders.js:16`). Sin token,
`req.user` es `undefined` → el `&&` corta en la primera condición → **el guard se salta entero**.
Cualquiera con el UUID de un pedido de invitado lo lee completo.

### R3 — Endpoint sin ningún middleware 🟠

```js
// backend/src/routes/orders.js:13
router.put("/:orderId/whatsapp", updateOrderWhatsApp);
```

Sin `protect`, sin `optional`, sin nada. Y el controlador (`orderController.js:66-88`) devuelve el
pedido entero.

### R4 — Cero rate limiting 🟠

No existe `express-rate-limit` en `package.json` ni en los lockfiles. Verificado con grep: cero
coincidencias de `rate.limit` en `backend/src/`.

Consecuencias concretas:
- `/api/auth/login` (`routes/auth.js:13`) es brute-forceable sin límite.
- `/api/auth/register` (`routes/auth.js:12`) permite crear cuentas en masa.
- `express.json({ limit: "50mb" })` y `urlencoded({ limit: "50mb" })` (`server.js:82-83`).
- `routes/admin.js:77` → `upload.array("images", 50)` con `multer.memoryStorage()`
  (`upload.js:11`) y `fileSize: 10MB` (`upload.js:33`) = **hasta ~500 MB de buffers en RAM**
  antes de que el handler empiece, y luego conversión paralela con sharp (`upload.js:47-80`).
  Agotar la memoria de un VPS pequeño es trivial.

### R5 — CORS sin dominio real, con wildcard peligroso 🟠

```js
// backend/src/server.js:55-78
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://kaoz-ecomerce.vercel.app',
  'http://localhost:3000'
].filter(Boolean);
...
if (!origin || allowedOrigins.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin)) {
```

Dos problemas:

1. **Tu dominio real no está.** Sin `FRONTEND_URL` definida, el navegador recibe
   `No permitido por CORS`. Y el código **solo admite un origen**, así que si tienes
   `kaoz-sport.com` **y** `www.kaoz-sport.com`, el segundo falla.
2. **El regex `*.vercel.app` acepta cualquier origen de Vercel** con `credentials: true`.
   Cualquiera puede crear un proyecto gratuito en Vercel y hacer peticiones autenticadas contra
   tu API.

### R12b — Sin `NODE_ENV=production` se filtran stack traces

```js
// middleware/errorHandler.js:19-23
...(process.env.NODE_ENV === "development" && { stack: err.stack }),
```

Ya cubierto en los planes 03 y 04, pero se verifica aquí porque es parte del endurecimiento.

### Adicional — el carrito es accesible por `session-id`

`cartController.js:7,14,24`: los carritos se identifican por el header `x-session-id`, que envía
el cliente sin ninguna autenticación. Quien conozca un `session-id` ajeno puede leer y modificar
ese carrito.

---

## Decisión previa

Del índice, **D1**. El resto de este plan asume **un solo dominio**. Si tu decisión fue dos
subdominios, el paso 4 (CORS) pasa a ser la pieza central y debes implementarlo con más cuidado.

---

## Pasos

### 1. Proteger las rutas de deployments (B6)

`backend/src/routes/deployments.js`. El panel `/pmaa/deploy` seguirá funcionando porque el
`getAuthHeaders()` del frontend ya envía el token de admin
(`lib/api.ts:618-636`, clave `kaoz_admin_token`).

```js
const express = require("express");
const router = express.Router();
const deploymentController = require("../controllers/deploymentController");
const { protect, authorize } = require("../middleware/auth");

// El panel de control requiere token de admin.
// La comprobación de contraseña en el frontend es solo una comodidad de UI;
// la autorización REAL es esta.
router.use(protect, authorize("admin"));

router.get("/", deploymentController.getDeployments);
router.put("/:id/toggle", deploymentController.toggleDeployment);
router.get("/active", deploymentController.getActiveDeployment);

module.exports = router;
```

> ⚠️ **Consecuencia importante:** `server.js:35-43` registra el deployment al arrancar usando
> Prisma directamente, no a través de estas rutas. Así que el arranque **sigue funcionando**.
> Pero verifica en el paso 6 que `GET /api/deployments/active` con token devuelve datos; si esa
> tabla queda vacía y `NODE_ENV=production`, **toda la tienda devuelve 503**.

### 2. Arreglar la autorización de órdenes (R1, R2, R3)

`backend/src/controllers/orderController.js`.

**2a. `getOrder` — invertir el guard para que niegue por defecto.**

El problema es `req.user &&` al principio. La lógica correcta es: *permitir solo si eres el dueño
o admin; negar en cualquier otro caso*.

```js
const getOrder = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!order || order.isDeleted) {
      return res.status(404).json({ success: false, message: "Pedido no encontrado" });
    }

    const esAdmin = req.user?.role === "admin";
    const esDueño = req.user && order.userId && order.userId === req.user.id;

    // Un pedido de invitado (userId null) solo lo ve un admin.
    // Antes, CUALQUIER anónimo podía leerlo: req.user && ... cortaba en la primera condición.
    if (!esAdmin && !esDueño) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Error al obtener pedido:", error);
    res.status(500).json({ success: false, message: "Error al obtener pedido" });
  }
};
```

> **Esto cambia el comportamiento de la tienda.** Si hoy el checkout de invitado muestra la
> confirmación leyendo `GET /api/orders/:id` sin token, dejará de funcionar. Revisa
> `components/checkout.tsx`: si muestra la confirmación con los datos que ya tiene en memoria
> (lo habitual, porque los recibe de `POST /api/orders`), no hay problema. Si hace una lectura
> posterior, hay que ajustarlo. **Pruébalo en el smoke test del plan 09.**

**2b. `searchOrder` — exigir algo más que el número de orden.**

Un número de orden no es un secreto. Hay dos opciones:

*Opción A (recomendada): exigir el email como segundo factor.*

```js
const searchOrder = async (req, res) => {
  try {
    const { orderNumber, email } = req.query;

    if (!orderNumber || !email) {
      return res.status(400).json({
        success: false,
        message: "Se requieren el número de pedido y el email de la compra",
      });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order || order.isDeleted) {
      return res.status(404).json({ success: false, message: "Pedido no encontrado" });
    }

    // Comparación insensible a mayúsculas; el email actúa como segundo factor
    const emailPedido = (order.customerInfo?.email || "").toLowerCase().trim();
    if (emailPedido !== String(email).toLowerCase().trim()) {
      // Mismo mensaje que "no encontrado": no revelar que el número existe
      return res.status(404).json({ success: false, message: "Pedido no encontrado" });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Error al buscar pedido:", error);
    res.status(500).json({ success: false, message: "Error al buscar pedido" });
  }
};
```

*Opción B: dejar solo la búsqueda autenticada.* Cambia la ruta a `protect` y elimina el endpoint
público. Más simple, pero pierdes la consulta de pedidos sin cuenta.

Si eliges la A, actualiza el frontend que llame a este endpoint para enviar `email`.

**2c. `updateOrderWhatsApp` — proteger la ruta.**

```diff
 // backend/src/routes/orders.js
-router.put("/:orderId/whatsapp", updateOrderWhatsApp);
+router.put("/:orderId/whatsapp", protect, updateOrderWhatsApp);
```

Y en el controlador, deja de devolver el pedido entero (`orderController.js:76-80`):

```diff
     res.json({
       success: true,
       message: "WhatsApp registrado (lógica de base de datos pendiente de esquema)",
-      order,
     });
```

### 3. Añadir rate limiting (R4)

```bash
cd /var/www/kaoz/app/backend
pnpm add express-rate-limit
```

Crea `backend/src/middleware/rateLimit.js`:

```js
const rateLimit = require("express-rate-limit");

// Detrás de nginx, Express debe confiar en el proxy para leer la IP real.
// server.js:52 ya hace app.set("trust proxy", 1).

/** Login y registro: el objetivo es frenar el brute force. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 minutos
  max: 10,                            // 10 intentos por IP
  message: {
    success: false,
    message: "Demasiados intentos. Espera 15 minutos antes de volver a intentar.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,       // solo cuentan los intentos fallidos
});

/** API pública general: generoso, pero corta el abuso automatizado. */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,                // 1 minuto
  max: 120,                           // 120 peticiones por minuto por IP
  message: { success: false, message: "Demasiadas peticiones. Ve más despacio." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rutas de escritura y subida: mucho más estrictas. */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Demasiadas operaciones. Inténtalo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Búsqueda de pedidos: evita la enumeración de números de orden. */
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, message: "Demasiadas búsquedas. Inténtalo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, writeLimiter, searchLimiter };
```

Aplícalos:

```diff
 // backend/src/routes/auth.js
+const { authLimiter } = require("../middleware/rateLimit");
-router.post("/register", register);
-router.post("/login", login);
+router.post("/register", authLimiter, register);
+router.post("/login", authLimiter, login);
```

```diff
 // backend/src/routes/orders.js
+const { searchLimiter, writeLimiter } = require("../middleware/rateLimit");
-router.post("/", optional, createOrder);
+router.post("/", writeLimiter, optional, createOrder);
-router.get("/search", optional, searchOrder);
+router.get("/search", searchLimiter, optional, searchOrder);
```

Y el límite general en `server.js`, **después** del health check:

```diff
 app.use(express.json({ limit: "50mb" }));
 app.use(express.urlencoded({ limit: "50mb", extended: true }));
+
+// Límite general del API (el /health queda exento por estar declarado antes)
+const { apiLimiter } = require("./middleware/rateLimit");
+app.use("/api", apiLimiter);
```

> ⚠️ **Verifica que `/health` NO quede detrás del limitador**, o tu monitor recibirá 429 y
> pensará que el servicio está caído. Por eso `app.get("/health")` debe ir declarado **antes**
> que `app.use("/api", apiLimiter)`.

### 4. Endurecer el CORS (R5)

`backend/src/server.js:55-78`. Elimina el wildcard de Vercel y soporta varios orígenes:

```js
// Orígenes permitidos. FRONTEND_URL admite varios separados por coma.
const allowedOrigins = [
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  // Solo para desarrollo local
  "http://localhost:3000",
].filter(Boolean);

console.log("🔐 [CORS] Orígenes permitidos:", allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Sin Origin = petición de servidor a servidor (curl, health checks). Se permite.
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.warn("🚫 [CORS] Bloqueado:", origin);
    callback(new Error("No permitido por CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-session-id"],
}));
```

**Lo que se elimina y por qué:**

| Eliminado | Motivo |
|---|---|
| `'https://kaoz-ecomerce.vercel.app'` | El despliegue de Vercel se abandona |
| `/\.vercel\.app$/` | Aceptaba **cualquier** proyecto de Vercel con `credentials: true` |

Y en `backend/.env` del plan 03, permite ambos subdominios si los necesitas:

```env
FRONTEND_URL=https://kaoz-sport.com,https://www.kaoz-sport.com
```

> **Nota:** con la topología de un solo dominio recomendada, el navegador hace las peticiones al
> mismo origen y **el CORS deja de aplicarse**. Esto es una defensa en profundidad: si alguien
> intenta llamar a la API desde otro sitio, no podrá.

### 5. Añadir rate limiting también en nginx

Defensa en profundidad. nginx corta antes de que la petición llegue a Node.
El bloque completo va en el plan 08, pero la directiva clave es:

```nginx
limit_req_zone $binary_remote_addr zone=kaoz_api:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=kaoz_auth:10m rate=1r/s;
```

### 6. Revisar el resto de la superficie

**6a. Rutas sin protección — auditoría completa.** Verificado:

| Router | Protección | Estado |
|---|---|---|
| `admin.js` | `router.use(protect, authorize("admin"))` | ✅ correcto |
| `analytics.js` | `router.use(protect, authorize("admin"))` | ✅ correcto |
| `settings.js` | `router.use(protect, authorize("admin"))` | ✅ correcto (excepto `/public`) |
| `deployments.js` | ninguna | 🔴 **se arregla en el paso 1** |
| `orders.js` | Mixta | 🟠 **se arregla en el paso 2** |
| `cart.js` | `optional` en las de carrito, `protect` en `/sync` | ⚠️ ver 6b |
| `products.js`, `public.js` | Públicas a propósito | ✅ correcto |

**6b. Carrito por `session-id`.** `cartController.js:7,14,24`. El `session-id` lo genera el
cliente (`lib/api.ts:604-612`) con `Math.random().toString(36).substring(2,15)` — **no es un
secreto criptográfico**.

Mejora mínima, sin cambiar el esquema de datos:

```js
// cartController.js — generar el sessionId con CSPRNG en lugar de Math.random
const crypto = require("crypto");
// ...
// Y en el frontend (lib/api.ts:608), usar crypto.randomUUID():
```

```diff
 // frontend/lib/api.ts:604-612
 const getSessionId = () => {
   if (typeof window === 'undefined') return null
   let sessionId = localStorage.getItem('kaoz_session_id')
   if (!sessionId) {
-    sessionId = `sess_${Math.random().toString(36).substring(2, 15)}`
+    sessionId = `sess_${crypto.randomUUID()}`
     localStorage.setItem('kaoz_session_id', sessionId)
   }
   return sessionId
 }
```

`crypto.randomUUID()` está disponible en todos los navegadores modernos sobre HTTPS (y en
`http://localhost`).

**6c. Subida de archivos: bajar el límite de memoria.** `routes/admin.js:77` permite 50 imágenes
de 10 MB = ~500 MB en RAM. Redúcelo a algo razonable:

```diff
-router.post("/bulk/:sessionId/upload", upload.array("images", 50), uploadImages);
+// 20 imágenes x 10 MB = 200 MB máximo en memoria durante la subida
+router.post("/bulk/:sessionId/upload", upload.array("images", 20), uploadImages);
```

Y reduce el límite de JSON, que tampoco necesita 50 MB:

```diff
-app.use(express.json({ limit: "50mb" }));
-app.use(express.urlencoded({ limit: "50mb", extended: true }));
+app.use(express.json({ limit: "10mb" }));
+app.use(express.urlencoded({ limit: "10mb", extended: true }));
```

> Si `BulkImageUploader.tsx` sube más de 20 imágenes a la vez, ajústalo ahí también. Revisa
> `components/admin/BulkImageUploader.tsx` antes de reducir.

**6d. Desactivar la cabecera `X-Powered-By`.** Añade junto a los demás middlewares:

```js
app.disable("x-powered-by");
```

**6e. bcrypt cost 10 → 12.** En `authController.js:24` y `:189`:

```diff
-    const salt = await bcrypt.genSalt(10);
+    const salt = await bcrypt.genSalt(12);
```

> **Aviso:** esto **no** actualiza los hashes existentes. Los usuarios actuales siguen con cost 10.
> Si quieres migrarlos, hay que re-hashear en el login. Con la base nueva y un solo admin, no es
> relevante. En `scripts/create-admin.js` ya se aplica cost 12 desde el plan 03.

### 7. Reducir el ruido de logs

`server.js:61-64` registra **cada petición y su cabecera Origin**:

```js
app.use((req, res, next) => {
  console.log(`📡 [BACKEND] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});
```

Y `server.js:81` usa `morgan("dev")` (formato de desarrollo). En producción esto llena journald
rápido. Cámbialo a formato combinado y limita el log personalizado a desarrollo:

```diff
-app.use((req, res, next) => {
-  console.log(`📡 [BACKEND] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
-  next();
-});
+if (process.env.NODE_ENV !== "production") {
+  app.use((req, res, next) => {
+    console.log(`📡 [BACKEND] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
+    next();
+  });
+}
```

```diff
-app.use(morgan("dev"));
+app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
```

### 8. Quitar el `debug` de la respuesta de autenticación

`middleware/auth.js:62-69` devuelve el error interno al cliente:

```diff
       return res.status(401).json({
         success: false,
         message,
         code,
-        debug: {
-          localError: localError.message
-        }
       });
```

---

## Verificación (criterio de aceptación)

**8a. El interruptor de apagado ya NO es público:**

```bash
# Sin token → debe dar 401
curl -s -o /dev/null -w "deployments sin token: %{http_code}\n" \
  http://127.0.0.1:5010/api/deployments
# → 401

# Intentar apagar la tienda sin token → debe dar 401
curl -s -o /dev/null -w "toggle sin token: %{http_code}\n" \
  -X PUT http://127.0.0.1:5010/api/deployments/cualquier-id/toggle \
  -H "Content-Type: application/json" -d '{"isActive":false}'
# → 401

# Con token de admin → debe dar 200
TOKEN=$(curl -s -X POST http://127.0.0.1:5010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"TU_ADMIN_EMAIL","password":"TU_ADMIN_PASSWORD"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -s -o /dev/null -w "deployments con token: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" http://127.0.0.1:5010/api/deployments
# → 200
```

**8b. Las órdenes ya no se filtran:**

```bash
# Búsqueda sin email → 400
curl -s -o /dev/null -w "search sin email: %{http_code}\n" \
  "http://127.0.0.1:5010/api/orders/search?orderNumber=KAOZ-123456789"
# → 400

# Búsqueda con email equivocado → 404 (y NO revela que el pedido existe)
curl -s -o /dev/null -w "search email erroneo: %{http_code}\n" \
  "http://127.0.0.1:5010/api/orders/search?orderNumber=KAOZ-123456789&email=otro@ejemplo.com"
# → 404

# PUT whatsapp sin token → 401
curl -s -o /dev/null -w "whatsapp sin token: %{http_code}\n" \
  -X PUT http://127.0.0.1:5010/api/orders/cualquier-id/whatsapp
# → 401
```

**8c. El rate limiting funciona:**

```bash
# 20 intentos de login seguidos → debe aparecer un 429
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://127.0.0.1:5010/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"noexiste@ejemplo.com","password":"malo"}'
done
echo
# → debe haber 401 seguidos de 429
```

**8d. El CORS rechaza orígenes ajenos:**

```bash
curl -s -o /dev/null -w "origen ajeno: %{http_code}\n" \
  -H "Origin: https://atacante.vercel.app" http://127.0.0.1:5010/api/products
# → 500 (CORS lanza error) o 403, pero NUNCA 200

curl -s -o /dev/null -w "origen propio: %{http_code}\n" \
  -H "Origin: https://kaoz-sport.com" http://127.0.0.1:5010/api/products
# → 200
```

**8e. El health check sigue exento del limitador:**

```bash
for i in $(seq 1 50); do curl -s -o /dev/null http://127.0.0.1:5010/health; done
curl -s -o /dev/null -w "health tras 50 peticiones: %{http_code}\n" http://127.0.0.1:5010/health
# → 200 (NUNCA 429)
```

**Pasa el plan cuando:**
- [ ] `/api/deployments` devuelve **401** sin token y **200** con token.
- [ ] `/api/orders/search` sin `email` devuelve **400**.
- [ ] `/api/orders/search` con email incorrecto devuelve **404**.
- [ ] `PUT /api/orders/:id/whatsapp` devuelve **401** sin token.
- [ ] El bucle de 20 logins produce algún **429**.
- [ ] Un `Origin: https://algo.vercel.app` **no** recibe 200.
- [ ] `/health` responde 200 después de 50 peticiones seguidas.
- [ ] El panel `/pmaa/deploy` sigue funcionando con tu sesión de admin.
- [ ] El flujo de compra completo funciona (probarlo en el plan 09).

---

## Rollback

```bash
cd /var/www/kaoz/app
git checkout backend/src/routes/deployments.js \
             backend/src/routes/orders.js \
             backend/src/routes/auth.js \
             backend/src/controllers/orderController.js \
             backend/src/middleware/auth.js \
             backend/src/server.js
rm backend/src/middleware/rateLimit.js
```

> **Nunca revertir el paso 1 (deployments).** Es el hallazgo más grave de la auditoría.

Si el rate limiting bloquea a usuarios legítimos (por ejemplo, una oficina con IP compartida),
sube los `max` antes de desactivarlo.

---

## Trampas conocidas

**`trust proxy` y rate limiting.** `server.js:52` ya hace `app.set("trust proxy", 1)`. Sin eso,
`express-rate-limit` vería la IP de nginx (127.0.0.1) en lugar de la del cliente y **todos los
usuarios compartirían un mismo contador**. Ya está bien, pero no lo quites.

**El orden de declaración importa.** `app.get("/health")` **antes** de `app.use("/api", apiLimiter)`,
o el monitor se llevará 429. Lo mismo con el limitador de `writeLimiter` en `POST /api/orders`:
si el flujo de compra hace varias peticiones seguidas, verifica que 30 por 15 minutos sea
suficiente para una compra normal (lo es: carrito + checkout son 2-3 peticiones).

**La prueba de CORS en localhost.** En desarrollo el navegador manda
`Origin: http://localhost:3000`, que sigue estando en la lista. Si tu producción usa un dominio
distinto, no romperás el desarrollo local.

**`skipSuccessfulRequests: true` en `authLimiter`.** Solo cuentan los intentos **fallidos**. Es
deliberado: así un usuario que entra correctamente muchas veces no se bloquea a sí mismo, pero un
atacante que prueba contraseñas sí se frena. Ten en cuenta que los intentos fallidos se siguen
contando aunque el login acabe bien después.

**El frontend y la búsqueda de pedidos.** Si cambias `searchOrder` para exigir email (paso 2b),
busca en el frontend quién llama a ese endpoint y añade el parámetro. Revisa
`components/checkout.tsx` y `lib/api.ts`.
