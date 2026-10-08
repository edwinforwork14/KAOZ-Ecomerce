# Plan 04 — Correcciones críticas del backend

> **Fase:** Bloqueadores · **Depende de:** 02, 03 · **Bloquea a:** 06, 09
> **Esfuerzo:** ~1,5 h · **Riesgo:** bajo

---

## Objetivo

Arreglar los defectos de código que impiden que el backend funcione correctamente en una base de
datos nueva, y añadir lo mínimo de robustez operativa (health check, arranque controlado, cierre
limpio) que un proceso de larga vida necesita y que Vercel ocultaba.

---

## Por qué (evidencia)

### B5 — Bug de `const` que rompe la base de datos vacía 🔴

```js
// backend/src/services/settingsService.js
:5   const settings = await prisma.settings.findUnique({ where: { id: "global" } });
...
:44     settings = await prisma.settings.create({ ... })   // ← asignación a un const
```

En una base **vacía** —exactamente el estado de tu VPS al principio— ocurre esto:

1. `findUnique` devuelve `null`.
2. Entra al bloque `if (!settings)` de la línea 41.
3. **La fila se crea correctamente** en la línea 44.
4. La asignación a `const` lanza `TypeError: Assignment to constant variable`.
5. El `catch` interno de la línea 78 lo traga y solo registra un log.
6. El flujo continúa a la línea 84: `!settings.orders` → **otro** `TypeError`, ahora sobre `null`.
7. El `catch` externo de la línea 117 devuelve el objeto de fallback reducido (líneas 120-130),
   **sin** `business`, `whatsapp` ni `expenseCategories`.

Resultado: la primera petición pública de la tienda sirve métodos de pago y envío de fallback.
Es un fallo silencioso y difícil de diagnosticar.

### R9 — El proceso reporta "OK" aunque la base esté caída

```js
// backend/src/server.js:32
connectDB();   // ← sin await
```

```js
// backend/src/config/database.js:21-22
console.error("❌ Error al conectar a la base de datos:", error.message);
// No salimos del proceso para permitir reintentos o manejo de errores superior
```

`connectDB` no se espera y **nunca sale del proceso**. La app empieza a escuchar y registra
`🚀 [SERVER] KAOZ API Online` aunque PostgreSQL esté apagado. Ningún supervisor lo detecta.

### No existe health endpoint

Verificado con grep: **cero** coincidencias de `/health` en el backend. La ruta comodín de
`server.js:104-109` devuelve 404. No hay nada que monitorear.

### Otras cosas que cambian de comportamiento fuera de Vercel

- `services/deploymentService.js:13` usa `execSync("git log -1 --pretty=%B")`. Sin protección:
  si git no está instalado, falta `.git`, o hay un problema de *dubious ownership*, degrada en
  silencio a `'Auto-deployment'`.
- `server.js:135-144`: el cierre limpio cierra el servidor HTTP pero **nunca llama a
  `prisma.$disconnect()`**, así que systemd acabará enviando SIGKILL y quedan conexiones colgadas.
- `server.js:9-10` dice que `node-cron` y `execSync` "no son compatibles con Vercel Serverless",
  pero **no hay ninguna protección `VERCEL` en ese código**: simplemente se ejecutaba y fallaba.
- `server.js:115` `if (process.env.VERCEL !== '1')` sí está bien: con la variable indefinida,
  `app.listen` se ejecuta. No hay que tocarlo.

---

## Pasos

### 1. Arreglar el bug de `const` (B5) — LA CORRECCIÓN MÁS IMPORTANTE

`backend/src/services/settingsService.js:5`. Cambia una palabra:

```diff
-  const settings = await prisma.settings.findUnique({
+  let settings = await prisma.settings.findUnique({
     where: { id: "global" }
   });
```

Además, en el `catch` de la línea 35, conviene que el error no se trague en silencio:

```diff
         } catch (updateErr) {
-          console.error("❌ Error en auto-reparación:", updateErr.message);
+          console.error("❌ Error en auto-reparación de settings:", updateErr.message);
         }
```

Y al final del bloque, cuando la creación falla (línea 78-80), lo correcto es **propagar** el
error en vez de continuar con `settings` en `null`:

```diff
       } catch (createError) {
         console.error("❌ Error al crear configuración inicial:", createError.message);
+        throw new Error(`No se pudo inicializar la configuración global: ${createError.message}`);
       }
```

> **Nota:** si ya ejecutaste el seed del plan 02, la fila `global` ya existe y este bug no se
> dispara. **Arréglalo igual**: es una bomba de tiempo para cualquier base vacía futura
> (por ejemplo, un entorno de staging).

### 2. Añadir un health endpoint

En `backend/src/server.js`, **antes** de las rutas de la API (línea ~89) y **antes** del
middleware `checkDeploymentActive`, para que responda aunque la app esté "en mantenimiento":

```js
// Health check — SIN autenticación y SIN pasar por checkDeploymentActive.
// Sirve para systemd, nginx y monitores externos.
const { prisma } = require("./config/database");

app.get("/health", async (req, res) => {
  const inicio = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: "healthy",
      database: "connected",
      latencyMs: Date.now() - inicio,
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
```

> **Importante:** colócalo **antes** de `app.use("/api/products", checkDeploymentActive, ...)`.
> De lo contrario, un problema con la tabla `Deployment` haría que el health check también fallara
> y no podrías distinguir "la tienda está en mantenimiento" de "la base de datos está caída".

### 3. Hacer que el arranque falle rápido si la base no responde

Sustituye la llamada de `server.js:32` por una función de arranque que espere la conexión:

```js
// backend/src/server.js — reemplaza la línea 32: connectDB();
const arrancar = async () => {
  try {
    await connectDB();
  } catch (error) {
    // En producción, morir es lo correcto: systemd reiniciará y lo verás en los logs.
    // Seguir vivo con la base caída hace que el problema sea invisible.
    if (process.env.NODE_ENV === "production") {
      console.error("❌ [ARRANQUE] Base de datos inaccesible. Abortando.");
      process.exit(1);
    }
    console.warn("⚠️ [ARRANQUE] Base de datos inaccesible. Continuando en desarrollo.");
  }
};
```

Y haz que `connectDB` **lance** en vez de tragarse el error. En `backend/src/config/database.js`:

```diff
 const connectDB = async () => {
   try {
     await prisma.$connect();
     console.log("✅ PostgreSQL via Prisma conectado");
   } catch (error) {
     console.error("❌ Error al conectar a la base de datos:", error.message);
-    // No salimos del proceso para permitir reintentos o manejo de errores superior
+    throw error;   // quien llama decide qué hacer
   }
 };
```

Finalmente, encapsula el `app.listen` dentro de `arrancar()`:

```js
if (process.env.VERCEL !== "1") {
  arrancar().then(() => {
    const server = app.listen(PORT, () => {
      console.log(`
🚀 [SERVER] KAOZ API Online
📡 [PORT] ${PORT}
🌍 [ENV] ${process.env.NODE_ENV || "development"}
❤️  [HEALTH] http://127.0.0.1:${PORT}/health
      `);
    });

    // ... el resto de server.on('error') y shutdown se mantiene igual
  });
}
```

### 4. Completar el cierre limpio (graceful shutdown)

`server.js:135-144`. Falta desconectar Prisma y cerrar conexiones:

```js
const shutdown = async (signal) => {
  console.log(`🛑 [SERVER] ${signal} recibida. Cerrando ordenadamente...`);

  // Dejar de aceptar conexiones nuevas y cerrar las keep-alive existentes
  server.closeAllConnections?.();
  server.close(async () => {
    try {
      const { prisma } = require("./config/database");
      await prisma.$disconnect();
      console.log("📡 [SERVER] Prisma desconectado. Adiós.");
      process.exit(0);
    } catch (error) {
      console.error("❌ [SERVER] Error al cerrar:", error.message);
      process.exit(1);
    }
  });

  // Red de seguridad: si algo se cuelga, no esperar indefinidamente a systemd
  setTimeout(() => {
    console.error("❌ [SERVER] Cierre forzado por timeout.");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

### 5. Capturar excepciones no manejadas

Un proceso de larga vida necesita esto. Añade al final de `server.js`, antes de
`module.exports = app`:

```js
process.on("unhandledRejection", (razon) => {
  console.error("❌ [PROCESO] Promesa rechazada sin manejar:", razon);
  // No salimos: muchas promesas "fire-and-forget" del proyecto (ej. syncZernioData)
  // no son críticas. El log queda en journald para diagnóstico.
});

process.on("uncaughtException", (error) => {
  console.error("❌ [PROCESO] Excepción no capturada:", error);
  // Aquí SÍ salimos: el estado del proceso ya no es confiable.
  process.exit(1);
});
```

### 6. Blindar la llamada a git en `deploymentService.js`

`backend/src/services/deploymentService.js:12-16`. Hoy depende de que git exista y de que el
usuario del servicio sea el dueño del repo:

```diff
       let commitMessage = '';
       try {
-        commitMessage = execSync("git log -1 --pretty=%B").toString().trim();
+        commitMessage = execSync("git log -1 --pretty=%B", {
+          cwd: __dirname,
+          timeout: 3000,
+          stdio: ["ignore", "pipe", "ignore"],  // silenciar stderr de git
+        }).toString().trim();
       } catch (gitError) {
-        console.log("⚠️ No se pudo obtener información de git");
+        // Es esperado: el repo puede desplegarse como tarball, o ser de otro dueño
+        // ("detected dubious ownership"). No es un error.
+        console.log("ℹ️ [DEPLOY] Sin metadatos de git, usando descripción por defecto");
       }
```

### 7. Verificar que `NODE_ENV=production` esté activo

Esto viene del plan 03, pero se verifica aquí porque su efecto está en este archivo:

```js
// middleware/errorHandler.js:19-23
...(process.env.NODE_ENV === "development" && { stack: err.stack }),
```

Sin `NODE_ENV=production`, cada error 500 devuelve el stack trace completo al navegador.
Confírmalo tras el despliegue (ver verificación).

### 8. Ajustar el registro de despliegues para el VPS

`server.js:35-43` registra una implementación con `version = process.env.VERCEL_GIT_COMMIT_SHA || "local-dev"`.
En el VPS eso significa que **todas** las reiniciadas reutilizan la misma versión `local-dev`, así
que la tabla `Deployment` deja de registrar nada tras el primer arranque.

Es aceptable, pero mejora el diagnóstico usando el hash corto del commit cuando exista:

```diff
 (async () => {
   try {
-    const version = process.env.VERCEL_GIT_COMMIT_SHA || "local-dev";
+    let version = "local-dev";
+    try {
+      version = require("child_process")
+        .execSync("git rev-parse --short HEAD", { cwd: __dirname, stdio: ["ignore", "pipe", "ignore"] })
+        .toString().trim() || "local-dev";
+    } catch { /* sin git: se queda "local-dev" */ }
     const environment = process.env.NODE_ENV || "development";
     await Deployment.registerDeployment(version, environment);
   } catch (error) {
     console.error("❌ Error al registrar implementación:", error.message);
   }
 })();
```

> ⚠️ **Cuidado con el middleware de mantenimiento.** `middleware/deploymentCheck.js:9-13` devuelve
> **503 en todas las rutas `/api/*`** si no existe un deployment activo y `NODE_ENV=production`.
> Ese registro lo crea este bloque. Si el registro falla, **la tienda entera devuelve 503**.
> Tras el plan 08, verifica que `GET /api/deployments/active` devuelve datos.

### 9. Bloquear el eco de errores internos

Varios controladores devuelven `error: error.message` con mensajes crudos de Prisma/PostgreSQL
al cliente. Ejemplos: `authController.js:57,116,145,170,206`; `settingsController.js:284`;
`zernioController.js:48,149,207,246,319`.

No es urgente, pero en un VPS público cada mensaje filtrado ayuda a un atacante. Revisa el
middleware de errores y aplica un patrón consistente:

```js
// middleware/errorHandler.js — idea general
const mensaje = process.env.NODE_ENV === "production"
  ? "Error interno del servidor"   // nunca filtrar el detalle
  : err.message;

res.status(err.statusCode || 500).json({
  success: false,
  message: mensaje,
  // El detalle solo en logs del servidor
});
```

Y registra el error completo con `console.error` para que quede en journald.

---

## Verificación (criterio de aceptación)

Tras aplicar los cambios y **antes** de publicar:

```bash
cd /var/www/kaoz/app/backend

# 1. El bug de const está arreglado
grep -n 'let settings' src/services/settingsService.js
# → debe encontrar la línea

# 2. El health endpoint existe
grep -n '"/health"' src/server.js

# 3. connectDB ahora lanza
grep -n 'throw error' src/config/database.js

# 4. Cierre limpio con prisma
grep -n 'prisma.\$disconnect()' src/server.js

# 5. Arranque en seco (con la base levantada)
node src/server.js &
sleep 3
curl -s http://127.0.0.1:5010/health | head -20
# → {"success":true,"status":"healthy","database":"connected",...}
kill %1
```

Prueba de fuego del health check — **debe** detectar la caída:

```bash
sudo systemctl stop postgresql
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5010/health
# → 503
sudo systemctl start postgresql
sleep 2
curl -s http://127.0.0.1:5010/health | head -5
# → "healthy" otra vez
```

Prueba del bug B5 en base vacía (opcional pero recomendado):

```bash
# Crear una base temporal vacía
sudo -u postgres createdb kaoz_test -O kaoz
DATABASE_URL="postgresql://kaoz:PASS@127.0.0.1:5432/kaoz_test?schema=public" npx prisma db push
# Arrancar el backend apuntando ahí y hacer UNA petición pública:
curl -s "http://127.0.0.1:5010/api/settings/public" | head -20
# → debe devolver configuración completa (business, whatsapp, paymentMethods),
#   NO el fallback reducido
# Limpiar
sudo -u postgres dropdb kaoz_test
```

**Pasa el plan cuando:**
- [ ] `settingsService.js` usa `let settings`.
- [ ] `GET /health` devuelve 200 con `"database":"connected"`.
- [ ] `GET /health` devuelve **503** cuando PostgreSQL está detenido.
- [ ] El arranque con la base caída **sale con código 1** en producción.
- [ ] El cierre con SIGTERM registra "Prisma desconectado" y termina en menos de 10 s.
- [ ] Las rutas protegidas siguen funcionando (el login devuelve token).

---

## Rollback

Los cambios están en archivos aislados. Para revertir todo el plan:

```bash
cd /var/www/kaoz/app
git diff --stat          # revisar qué se tocó
git checkout backend/src/server.js backend/src/config/database.js \
             backend/src/services/settingsService.js \
             backend/src/services/deploymentService.js
```

> **No reviertas el paso 1** (el `let`) bajo ninguna circunstancia. Es la corrección de un bug
> real y no tiene efectos secundarios.

---

## Trampas conocidas

**`server.closeAllConnections()` requiere Node 18.2+.** Estás en Node 20 (plan 01), así que está
disponible. El `?.` es por si alguna vez se ejecuta en una versión anterior.

**El health check y `checkDeploymentActive`.** Si colocas `/health` **después** de las rutas con
`checkDeploymentActive`, en una situación de mantenimiento el health check devolverá 503 y
systemd pensará que la app está rota. Colócalo **antes**, como indica el paso 2.

**El `unref()` del timeout de cierre.** Sin él, ese temporizador mantendría el proceso vivo 10
segundos extra en el camino exitoso. `unref()` le dice a Node que no cuente para mantener vivo
el event loop.

**No añadas `node-cron` aquí.** Aunque la dependencia esté instalada (y hoy sin usar), la decisión
del plan D3 es usar **systemd timer**. Añadirlo dentro del proceso duplicaría ejecuciones si algún
día hay más de una instancia. El plan 10 lo implementa.
