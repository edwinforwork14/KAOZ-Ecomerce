# Plan 08 — systemd, nginx y TLS

> **Fase:** Operación · **Depende de:** 03, 07 · **Bloquea a:** 09
> **Esfuerzo:** ~2 h · **Riesgo:** medio (es donde el sitio se vuelve público)

---

## Objetivo

Convertir dos procesos Node sueltos en **servicios gestionados** (arrancan al boot, se reinician
si fallan, tienen logs centralizados) y poner **nginx con HTTPS** delante de todo, sirviendo
frontend, API e imágenes bajo un mismo dominio.

---

## Por qué

Hoy **no existe ningún artefacto de operación** en el repositorio. Buscado y no encontrado:
`Dockerfile`, `docker-compose.yml`, `ecosystem.config.js` (PM2), unidad systemd, vhost nginx.

Sin esto:
- Los procesos no arrancan al reiniciar el VPS.
- Si el backend muere a las 3 de la mañana, nadie lo levanta.
- No hay HTTPS.
- Los puertos 3000 y 5010 quedarían expuestos a internet.

---

## Decisión aplicada (D1 del índice)

**Un solo dominio.** nginx reparte:

```
https://kaoz-sport.com/api/*     → 127.0.0.1:5010  (Express)
https://kaoz-sport.com/uploads/* → 127.0.0.1:5010  (imágenes)
https://kaoz-sport.com/*         → 127.0.0.1:3000  (Next.js)
```

**Beneficio principal:** el navegador hace todas las peticiones al **mismo origen**, así que el
**CORS deja de aplicarse por completo**. Todo el riesgo R5 queda neutralizado por diseño, no por
configuración.

> Si elegiste dos subdominios, reemplaza el `server_name` y añade un bloque para
> `api.kaoz-sport.com` que apunte solo a `:5010`. El resto no cambia. Pero entonces el CORS del
> plan 06 pasa a ser crítico.

---

## Prerrequisitos

- Plan 01 completado (nginx instalado, DNS resolviendo, usuario `kaoz`, carpetas creadas).
- Plan 03 completado (los `.env` existen).
- Plan 07 completado (cambios en `storage.js` y `server.js`).

Verifica el DNS antes de empezar. **Let's Encrypt falla si el dominio no apunta ya al servidor:**

```bash
dig +short kaoz-sport.com     # debe devolver la IP del VPS
dig +short www.kaoz-sport.com
```

---

## Pasos

### 1. Crear el servicio systemd del backend

```bash
sudo nano /etc/systemd/system/kaoz-backend.service
```

```ini
[Unit]
Description=KAOZ API (Express + Prisma)
Documentation=https://kaoz-sport.com
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=kaoz
Group=kaoz

# Directorio de trabajo: el backend usa __dirname, así que no es crítico,
# pero fijarlo hace que los logs y las rutas relativas sean predecibles.
WorkingDirectory=/var/www/kaoz/app/backend

# Cargar variables de entorno desde el archivo
EnvironmentFile=/var/www/kaoz/app/backend/.env

# Arranque
ExecStart=/usr/bin/node src/server.js

# Reinicio automático
Restart=always
RestartSec=5
StartLimitBurst=5
StartLimitIntervalSec=60

# Cierre limpio: el plan 04 implementa el manejador de SIGTERM.
# Si en 20 s no terminó, systemd envía SIGKILL.
KillSignal=SIGTERM
TimeoutStopSec=20

# Endurecimiento
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
# ProtectSystem=strict hace todo el sistema de archivos de solo lectura,
# así que hay que permitir explícitamente las rutas donde se escribe:
ReadWritePaths=/var/lib/kaoz
ReadWritePaths=/var/www/kaoz/app/backend

# Logs a journald
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kaoz-backend

[Install]
WantedBy=multi-user.target
```

> **Ojo con `ProtectSystem=strict`.** Hace que `/usr`, `/boot` y `/etc` sean de solo lectura, y
> **todo el resto también**, salvo lo declarado en `ReadWritePaths`. Sin la línea de
> `/var/lib/kaoz`, las subidas de imágenes fallarían con `EROFS: read-only file system`.
> Ambas líneas son necesarias.

### 2. Crear el servicio systemd del frontend

```bash
sudo nano /etc/systemd/system/kaoz-frontend.service
```

```ini
[Unit]
Description=KAOZ Frontend (Next.js)
After=network.target kaoz-backend.service
Wants=kaoz-backend.service

[Service]
Type=simple
User=kaoz
Group=kaoz
WorkingDirectory=/var/www/kaoz/app/frontend

EnvironmentFile=/var/www/kaoz/app/frontend/.env.production
Environment=NODE_ENV=production

# Aumentar el heap por si acaso (el build es lo que más consume, no el runtime)
Environment=NODE_OPTIONS=--max-old-space-size=1024

# -H 127.0.0.1 viene del package.json (plan 05) y es obligatorio:
# impide que el puerto 3000 sea accesible desde internet saltándose nginx.
ExecStart=/usr/bin/pnpm start

Restart=always
RestartSec=5
StartLimitBurst=5

KillSignal=SIGTERM
TimeoutStopSec=20

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/kaoz/app/frontend/.next

StandardOutput=journal
StandardError=journal
SyslogIdentifier=kaoz-frontend

[Install]
WantedBy=multi-user.target
```

> **`ExecStart=/usr/bin/pnpm`** — localiza la ruta real con `which pnpm`. Si corepack la instaló
> en otro sitio, ajusta la línea. Si prefieres no depender de pnpm en runtime, usa
> `/usr/bin/node node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1`.

### 3. Recargar systemd y arrancar los servicios

```bash
sudo systemctl daemon-reload

sudo systemctl enable kaoz-backend kaoz-frontend
sudo systemctl start kaoz-backend
sleep 3
sudo systemctl start kaoz-frontend
sleep 3

# Estado
sudo systemctl status kaoz-backend --no-pager
sudo systemctl status kaoz-frontend --no-pager

# Logs en vivo
sudo journalctl -u kaoz-backend -f
# (Ctrl+C para salir)
```

Prueba local antes de tocar nginx:

```bash
curl -s http://127.0.0.1:5010/health
# → {"success":true,"status":"healthy","database":"connected",...}

curl -s -o /dev/null -w "frontend: %{http_code}\n" http://127.0.0.1:3000/
# → 200
```

> **Si el frontend falla con "Could not find a production build"**, es que compilaste como `kaoz`
> pero desde otro directorio. Recompila: `cd /var/www/kaoz/app/frontend && pnpm build`.

### 4. Crear el vhost de nginx

```bash
sudo nano /etc/nginx/sites-available/kaoz
```

```nginx
# ==========================================================
# KAOZ — vhost principal
# Un solo dominio: nginx reparte /api y /uploads al backend (5010)
# y todo lo demás al frontend (3000). El navegador ve un único origen.
# ==========================================================

# Zonas de rate limiting (defensa en profundidad del plan 06)
limit_req_zone $binary_remote_addr zone=kaoz_api:10m  rate=20r/s;
limit_req_zone $binary_remote_addr zone=kaoz_auth:10m rate=1r/s;
limit_conn_zone $binary_remote_addr zone=kaoz_conn:10m;

server {
    listen 80;
    listen [::]:80;
    server_name kaoz-sport.com www.kaoz-sport.com;

    # Certbot usará esto para el desafío HTTP-01
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Todo lo demás va a HTTPS (lo activa certbot en el paso 7)
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name kaoz-sport.com www.kaoz-sport.com;

    # --- TLS (certbot rellena estas líneas en el paso 7) ---
    ssl_certificate     /etc/letsencrypt/live/kaoz-sport.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kaoz-sport.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # --- Cabeceras de seguridad ---
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # --- Límites generales ---
    client_max_body_size 12M;      # coherente con el límite de 10MB de multer (upload.js:33)
    limit_conn kaoz_conn 20;

    # --- Logs ---
    access_log /var/log/nginx/kaoz.access.log;
    error_log  /var/log/nginx/kaoz.error.log;

    # ======================================================
    # 1. AUTENTICACIÓN — límite estricto (anti brute-force)
    # ======================================================
    location ~ ^/api/auth/(login|register)$ {
        limit_req zone=kaoz_auth burst=5 nodelay;
        limit_req_status 429;

        proxy_pass http://127.0.0.1:5010;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection        "";
    }

    # ======================================================
    # 2. API — va al backend Express
    # ======================================================
    location /api/ {
        limit_req zone=kaoz_api burst=40 nodelay;
        limit_req_status 429;

        proxy_pass http://127.0.0.1:5010;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;   # por si hay websockets
        proxy_set_header Connection        "";

        # El backend tiene llamadas salientes (BCV, Zernio). Un poco de margen.
        proxy_connect_timeout 10s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;

        # Las subidas pueden tardar: no cortar antes de tiempo
        proxy_request_buffering off;
    }

    # ======================================================
    # 3. HEALTH — sin rate limiting (lo usa el monitoreo del plan 10)
    # ======================================================
    location = /health {
        proxy_pass http://127.0.0.1:5010/health;
        proxy_set_header Host $host;
        access_log off;
    }

    # ======================================================
    # 4. IMÁGENES — nginx las sirve directo desde disco
    #    (más rápido que pasar por Node, y libera al backend)
    # ======================================================
    location /uploads/ {
        alias /var/lib/kaoz/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    # Alias heredado del backend (server.js monta /images también)
    location /images/ {
        alias /var/lib/kaoz/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    # ======================================================
    # 5. FRONTEND — todo lo demás va a Next.js
    # ======================================================
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
    }

    # ======================================================
    # 6. ESTÁTICOS DE NEXT.JS — caché larga e inmutable
    # ======================================================
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
```

> **Sobre `location ~ ^/api/auth/(login|register)$`:** va **antes** que `location /api/` porque
> nginx evalúa primero las coincidencias por expresión regular. Así el login tiene un límite mucho
> más estricto (1 req/s con ráfaga de 5) que el resto del API.

> **Sobre `location = /health`:** el `=` fuerza coincidencia exacta, y va **antes** de `location /`.
> Esto hace que tu monitor nunca reciba un 429.

### 5. Activar el vhost

```bash
# Deshabilitar el sitio por defecto
sudo rm -f /etc/nginx/sites-enabled/default

# Activar el nuestro
sudo ln -sf /etc/nginx/sites-available/kaoz /etc/nginx/sites-enabled/kaoz

# Probar la sintaxis ANTES de recargar
sudo nginx -t
```

> ⚠️ **Aún no recargues.** El bloque `server` de HTTPS referencia certificados que todavía no
> existen, así que `nginx -t` fallará con:
> *"cannot load certificate ... No such file or directory"*.
> **Esto es esperado.** Ve al paso 6.

### 6. Obtener el certificado TLS

Hay que hacerlo en dos tiempos porque el vhost ya apunta a certificados inexistentes.

**6a. Vhost temporal solo HTTP:**

```bash
sudo mv /etc/nginx/sites-enabled/kaoz /etc/nginx/sites-enabled/kaoz.disabled

sudo tee /etc/nginx/sites-available/kaoz-temp > /dev/null <<'EOF'
server {
    listen 80;
    server_name kaoz-sport.com www.kaoz-sport.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "OK"; }
}
EOF

sudo ln -sf /etc/nginx/sites-available/kaoz-temp /etc/nginx/sites-enabled/kaoz-temp
sudo nginx -t && sudo systemctl reload nginx

# Confirmar que el desafío es alcanzable
curl -s http://kaoz-sport.com/.well-known/acme-challenge/test -o /dev/null -w "%{http_code}\n"
# → 404 es correcto (el archivo no existe, pero la ruta responde)
```

**6b. Pedir el certificado:**

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d kaoz-sport.com -d www.kaoz-sport.com \
  --email TU_CORREO@ejemplo.com \
  --agree-tos --no-eff-email
```

Debe terminar con *"Successfully received certificate"* y los archivos en
`/etc/letsencrypt/live/kaoz-sport.com/`.

**6c. Restaurar el vhost real:**

```bash
sudo rm -f /etc/nginx/sites-enabled/kaoz-temp /etc/nginx/sites-available/kaoz-temp
sudo ln -sf /etc/nginx/sites-available/kaoz /etc/nginx/sites-enabled/kaoz

sudo nginx -t      # ahora SÍ debe pasar
sudo systemctl reload nginx
```

**6d. Verificar la renovación automática.** Certbot instala un temporizador de systemd:

```bash
systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

### 7. Verificación final de conectividad

```bash
# Frontend por HTTPS
curl -s -o /dev/null -w "home:    %{http_code}\n" https://kaoz-sport.com/
curl -s -o /dev/null -w "login:   %{http_code}\n" https://kaoz-sport.com/auth/login
curl -s -o /dev/null -w "admin:   %{http_code}\n" https://kaoz-sport.com/admin/dashboard

# API por el mismo dominio (el CORS ya no aplica)
curl -s -o /dev/null -w "api:     %{http_code}\n" https://kaoz-sport.com/api/products
curl -s -o /dev/null -w "health:  %{http_code}\n" https://kaoz-sport.com/health

# Redirección de HTTP a HTTPS
curl -s -o /dev/null -w "http->https: %{http_code}\n" http://kaoz-sport.com/
# → 301

# El certificado es válido
curl -sI https://kaoz-sport.com/ | grep -i strict-transport
```

---

## Verificación (criterio de aceptación)

```bash
# 1. Los servicios están habilitados y corriendo
sudo systemctl is-enabled kaoz-backend kaoz-frontend   # → enabled enabled
sudo systemctl is-active  kaoz-backend kaoz-frontend   # → active active

# 2. Sobreviven a un reinicio (prueba real)
sudo reboot
# (esperar ~30 s y volver a entrar por SSH)
sudo systemctl is-active kaoz-backend kaoz-frontend    # → active active
curl -s https://kaoz-sport.com/health

# 3. Los puertos internos NO están expuestos
sudo ss -tlnp | grep -E ':(3000|5010)'
# → debe mostrar 127.0.0.1:3000 y 127.0.0.1:5010 (NUNCA 0.0.0.0)

# 4. Desde fuera, esos puertos están cerrados
curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 http://TU_IP:3000/
# → 000 (timeout) o "connection refused"

# 5. El firewall sigue correcto
sudo ufw status

# 6. El reinicio automático funciona
sudo systemctl kill -s SIGKILL kaoz-backend
sleep 8
sudo systemctl is-active kaoz-backend   # → active (systemd lo reinició)
sudo journalctl -u kaoz-backend -n 5 --no-pager

# 7. TLS válido y renovación automática
echo | openssl s_client -servername kaoz-sport.com -connect kaoz-sport.com:443 2>/dev/null \
  | openssl x509 -noout -dates
systemctl list-timers | grep certbot

# 8. Rate limiting de nginx activo
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code} " -X POST https://kaoz-sport.com/api/auth/login \
    -H "Content-Type: application/json" -d '{"email":"x@x.com","password":"malo"}'
done; echo
# → debe aparecer algún 429
```

**Pasa el plan cuando:**
- [ ] Ambos servicios están `enabled` y `active`.
- [ ] El sitio sigue funcionando **después de reiniciar el VPS**.
- [ ] `ss -tlnp` muestra `127.0.0.1:3000` y `127.0.0.1:5010`, nunca `0.0.0.0`.
- [ ] `http://kaoz-sport.com` redirige a HTTPS con **301**.
- [ ] El certificado es válido y `certbot renew --dry-run` pasa.
- [ ] Matar el backend con SIGKILL hace que systemd lo levante solo.
- [ ] El bucle de logins produce algún **429**.
- [ ] `https://kaoz-sport.com/api/products` responde 200.

---

## Rollback

**Si nginx queda roto y el sitio no carga:**

```bash
# Volver al sitio por defecto de nginx
sudo rm -f /etc/nginx/sites-enabled/kaoz
sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**Si un servicio no arranca:**

```bash
sudo systemctl stop kaoz-backend
sudo journalctl -u kaoz-backend -n 50 --no-pager   # ver el error real
```

**Si el hash de reinicio entra en bucle** (`StartLimitBurst` superado):

```bash
sudo systemctl reset-failed kaoz-backend
sudo systemctl start kaoz-backend
```

**Deshacer los servicios por completo:**

```bash
sudo systemctl disable --now kaoz-backend kaoz-frontend
sudo rm /etc/systemd/system/kaoz-backend.service /etc/systemd/system/kaoz-frontend.service
sudo systemctl daemon-reload
```

---

## Trampas conocidas

**`ProtectSystem=strict` es la causa más probable de fallos.** Si el backend arranca pero las
subidas fallan, o Prisma no puede escribir temporales, revisa los `ReadWritePaths`. Añade
temporalmente `ProtectSystem=false` para diagnosticar, y vuelve a ponerlo después.

**Los logs de journald se pierden al reiniciar.** Por defecto journald no es persistente. Actívalo
para poder investigar caídas pasadas:

```bash
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo systemctl restart systemd-journald
```

Y limita el tamaño para que no llene el disco:

```bash
sudo journalctl --vacuum-size=500M
# En /etc/systemd/journald.conf:
# SystemMaxUse=500M
```

**`certbot --nginx` vs `certonly --webroot`.** Estos pasos usan `certonly --webroot` porque es
más predecible y **no reescribe tu vhost**. `certbot --nginx` modificaría el archivo a su gusto y
perderías los bloques de rate limiting y las cabeceras de seguridad.

**`www` y el certificado.** El certificado cubre `kaoz-sport.com` y `www.kaoz-sport.com` porque
ambos se pasaron con `-d`. Si añades otro subdominio después, hay que volver a emitir:

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d kaoz-sport.com -d www.kaoz-sport.com -d nuevo.kaoz-sport.com \
  --expand
```

**El `EnvironmentFile` y los comentarios.** systemd lee `EnvironmentFile` línea a línea. Los
comentarios con `#` están permitidos, pero **no uses comillas raras ni espacios alrededor del `=`**
en el `.env`. El formato `CLAVE=valor` sin espacios es el más seguro.

**`pnpm start` y `NODE_ENV`.** El `Environment=NODE_ENV=production` del servicio garantiza que
Next.js arranque en modo producción aunque el `.env.production` no lo declare. Es una red de
seguridad, no un sustituto: el valor que importa de verdad es el que estaba presente durante
`next build`.
