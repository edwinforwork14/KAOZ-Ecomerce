# Plan 10 — Backups, monitoreo y mantenimiento

> **Fase:** Operación · **Depende de:** 09 · **Bloquea a:** nada
> **Esfuerzo:** ~1,5 h · **Riesgo:** bajo

---

## Objetivo

Que el e-commerce **no se pierda** y que te enteres de los problemas antes que tus clientes.

Tres piezas: backups automáticos, health checks, y tareas programadas.

---

## Por qué

### No existe ningún backup

Hoy **la base de datos y las imágenes solo viven en un único VPS**. Si Contabo tiene un fallo de
disco, si borras algo por error, o si una migración sale mal, **se pierde todo**: productos,
pedidos, clientes e imágenes.

Verificado: no hay script de backup, ni cron, ni copia externa en todo el repositorio.

### No existe nada que avise de una caída

El plan 04 añadió `/health`, pero **nadie lo consulta**. Si el backend se cae a las 3 de la mañana,
systemd lo reinicia (plan 08) — pero si es PostgreSQL el que se cae, o si el disco se llena, nadie
se entera hasta que un cliente escribe.

### Las tareas programadas no se ejecutan

`node-cron` está instalado en `package.json` pero **no se usa en ningún sitio**: la única mención
es un comentario en `server.js:9-10` que dice que las tareas deben ir en el panel de Vercel. Y
`vercel.json` **no tiene la clave `crons`**. Así que hoy **nada se ejecuta**.

Tres tareas necesitan periodicidad:

| Tarea | Endpoint | Hoy | Frecuencia deseada |
|---|---|---|---|
| Tasa BCV / Euro | `POST /api/settings/exchange-rate/update` | Solo manual | Diaria |
| Vencimiento de etiqueta "Nuevo" | `POST /api/settings/products/update-new-status` | Solo manual | Diaria |
| Sync de Instagram (Zernio) | `POST /api/settings/zernio/sync` | Perezoso, al visitar la web | Cada hora |

> ⚠️ **Problema a resolver:** los tres endpoints están detrás de
> `router.use(protect, authorize("admin"))` (`routes/settings.js:29`). Un `curl` desde un cron
> **no tiene token** y recibirá 401. El paso 4 resuelve esto.

---

## Decisión aplicada (D3 del índice)

**systemd timer**, no `node-cron` dentro del proceso.

Motivos:
- No depende de que la app esté viva (si el backend está caído, la tarea aún puede reintentarse).
- **No se duplica** si algún día hay más de una instancia del backend.
- Los logs van a journald, igual que el resto.
- Es exactamente para lo que systemd está diseñado.

---

## Parte 1 — Backups

### 1.1 Script de backup completo

Respaldar **solo la base de datos no es suficiente**: un `pg_dump` restaurado sin
`/var/lib/kaoz/uploads` deja todos los productos con imágenes rotas, porque la base guarda URLs
que apuntan a archivos.

```bash
sudo nano /usr/local/bin/kaoz-backup.sh
```

```bash
#!/usr/bin/env bash
# ==========================================================
# KAOZ — Backup completo (base de datos + imágenes)
# ==========================================================
set -euo pipefail

BACKUP_DIR=/var/backups/kaoz
APP_DIR=/var/www/kaoz/app
UPLOADS_DIR=/var/lib/kaoz/uploads
RETENCION_DIAS=14
FECHA=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Cargar DATABASE_URL desde el .env del backend
set -a
source "$APP_DIR/backend/.env"
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL no está definida" >&2
  exit 1
fi

echo "🔄 Backup KAOZ iniciado: $FECHA"

# --- 1. Base de datos (formato custom: comprimido y restaurable selectivamente) ---
DB_FILE="$BACKUP_DIR/kaoz-db-$FECHA.dump"
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --file="$DB_FILE"

echo "✅ Base de datos: $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

# --- 2. Imágenes ---
IMG_FILE="$BACKUP_DIR/kaoz-uploads-$FECHA.tar.gz"
tar -czf "$IMG_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")" 2>/dev/null

echo "✅ Imágenes: $IMG_FILE ($(du -h "$IMG_FILE" | cut -f1))"

# --- 3. Variables de entorno (contienen el JWT_SECRET; tratar con cuidado) ---
ENV_FILE="$BACKUP_DIR/kaoz-env-$FECHA.tar.gz"
tar -czf "$ENV_FILE" \
  -C "$APP_DIR" backend/.env frontend/.env.production 2>/dev/null
chmod 600 "$ENV_FILE"

echo "✅ Entorno: $ENV_FILE"

# --- 4. Verificar que el dump es legible ---
if pg_restore --list "$DB_FILE" > /dev/null 2>&1; then
  TABLAS=$(pg_restore --list "$DB_FILE" | grep -c 'TABLE DATA' || true)
  echo "✅ Dump verificado: $TABLAS tablas con datos"
else
  echo "❌ EL DUMP ESTÁ CORRUPTO" >&2
  exit 1
fi

# --- 5. Limpiar backups antiguos ---
find "$BACKUP_DIR" -name 'kaoz-*' -type f -mtime +$RETENCION_DIAS -delete
echo "🧹 Backups de más de $RETENCION_DIAS días eliminados"

# --- 6. Resumen ---
echo "📊 Ocupación actual:"
du -sh "$BACKUP_DIR"
ls -lht "$BACKUP_DIR" | head -8

echo "🎉 Backup completado"
```

```bash
sudo chmod 700 /usr/local/bin/kaoz-backup.sh
sudo chown root:root /usr/local/bin/kaoz-backup.sh
```

> **`chmod 700` y `chown root`:** el script contiene `kaoz-env-*.tar.gz` con el `JWT_SECRET`.
> Solo root debe poder ejecutarlo.

**Prueba inmediata:**

```bash
sudo /usr/local/bin/kaoz-backup.sh
```

### 1.2 Programar el backup diario

```bash
sudo nano /etc/systemd/system/kaoz-backup.service
```

```ini
[Unit]
Description=KAOZ — Backup de base de datos e imágenes
After=postgresql.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/kaoz-backup.sh
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kaoz-backup
```

```bash
sudo nano /etc/systemd/system/kaoz-backup.timer
```

```ini
[Unit]
Description=KAOZ — Ejecutar backup diariamente

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kaoz-backup.timer

# Verificar
systemctl list-timers | grep kaoz
sudo systemctl start kaoz-backup.service
sudo journalctl -u kaoz-backup -n 30 --no-pager
```

> **`Persistent=true`** hace que, si el VPS estaba apagado a las 3:30, el backup se ejecute al
> arrancar. **`RandomizedDelaySec=300`** evita que coincida exactamente con el backup de otro
> servicio.

### 1.3 Copia FUERA del servidor — imprescindible

Un backup en el mismo disco **no protege contra un fallo de disco**. Este paso no es opcional.

**Opción recomendada: `rclone` a un almacenamiento externo** (Backblaze B2, S3, Google Drive,
o incluso otro VPS).

```bash
curl https://rclone.org/install.sh | sudo bash
rclone config       # asistente interactivo: crear un remoto llamado "kaoz-backup"
```

Añade al final de `kaoz-backup.sh`, antes del resumen:

```bash
# --- 7. Sincronizar fuera del servidor ---
if command -v rclone > /dev/null 2>&1; then
  rclone sync "$BACKUP_DIR" kaoz-backup:kaoz/ \
    --transfers 4 \
    --checkers 8 \
    --log-level INFO
  echo "☁️  Sincronizado con almacenamiento externo"
else
  echo "⚠️  rclone no instalado: el backup NO está fuera del servidor"
fi
```

**Alternativa simple si tienes otro equipo con SSH:**

```bash
# Al final del script
rsync -avz -e ssh "$BACKUP_DIR/" usuario@otro-host:/ruta/backups/kaoz/
```

**Alternativa mínima — descarga manual periódica:**

```bash
# Desde tu máquina local, una vez a la semana
scp -r kaoz@TU_IP:/var/backups/kaoz ./backup-kaoz-$(date +%Y%m%d)
```

### 1.4 Probar la restauración — no te saltes esto

Un backup que nunca se ha restaurado **no es un backup**. Hazlo en una base de prueba:

```bash
# 1. Crear base temporal
sudo -u postgres createdb kaoz_restore_test -O kaoz

# 2. Restaurar el último dump
ULTIMO=$(ls -t /var/backups/kaoz/kaoz-db-*.dump | head -1)
echo "Restaurando: $ULTIMO"

pg_restore \
  --dbname="postgresql://kaoz:TU_PASSWORD@127.0.0.1:5432/kaoz_restore_test" \
  --no-owner --no-acl \
  "$ULTIMO"

# 3. Verificar que los datos están
psql "postgresql://kaoz:TU_PASSWORD@127.0.0.1:5432/kaoz_restore_test" -c '
  SELECT
    (SELECT COUNT(*) FROM "Product")  AS productos,
    (SELECT COUNT(*) FROM "Category") AS categorias,
    (SELECT COUNT(*) FROM "Order")    AS pedidos,
    (SELECT COUNT(*) FROM "User")     AS usuarios;
'

# 4. Verificar las imágenes
tar -tzf "$(ls -t /var/backups/kaoz/kaoz-uploads-*.tar.gz | head -1)" | head

# 5. Limpiar
sudo -u postgres dropdb kaoz_restore_test
echo "✅ Restauración verificada"
```

Haz esta prueba **ahora** y **una vez al mes**.

---

## Parte 2 — Monitoreo

### 2.1 Verificación de servicios con systemd

systemd ya reinicia los servicios (plan 08). Añade una alerta cuando lo haga:

```bash
sudo nano /etc/systemd/system/kaoz-healthcheck.service
```

```ini
[Unit]
Description=KAOZ — Verificación de salud

[Service]
Type=oneshot
ExecStart=/usr/local/bin/kaoz-healthcheck.sh
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kaoz-health
```

```bash
sudo nano /usr/local/bin/kaoz-healthcheck.sh
```

```bash
#!/usr/bin/env bash
# Verifica los servicios y el disco. Registra avisos en journald.
set -uo pipefail

PROBLEMAS=0

# --- 1. Servicios activos ---
for svc in kaoz-backend kaoz-frontend postgresql nginx; do
  if systemctl is-active --quiet "$svc"; then
    echo "✅ $svc activo"
  else
    echo "❌ $svc CAÍDO"
    PROBLEMAS=$((PROBLEMAS + 1))
  fi
done

# --- 2. Health endpoint ---
if curl -sf --max-time 10 http://127.0.0.1:5010/health > /dev/null; then
  echo "✅ Health endpoint OK"
else
  echo "❌ Health endpoint NO responde"
  PROBLEMAS=$((PROBLEMAS + 1))
fi

# --- 3. Frontend ---
if curl -sf --max-time 10 -o /dev/null http://127.0.0.1:3000/; then
  echo "✅ Frontend OK"
else
  echo "❌ Frontend NO responde"
  PROBLEMAS=$((PROBLEMAS + 1))
fi

# --- 4. Disco ---
USO_DISCO=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$USO_DISCO" -gt 85 ]; then
  echo "⚠️  DISCO AL $USO_DISCO% — revisar"
  PROBLEMAS=$((PROBLEMAS + 1))
else
  echo "✅ Disco al $USO_DISCO%"
fi

# --- 5. Memoria ---
MEM_LIBRE=$(free | awk '/^Mem:/ {printf "%.0f", $7/$2*100}')
if [ "$MEM_LIBRE" -lt 10 ]; then
  echo "⚠️  MEMORIA LIBRE AL $MEM_LIBRE%"
  PROBLEMAS=$((PROBLEMAS + 1))
else
  echo "✅ Memoria libre al $MEM_LIBRE%"
fi

# --- 6. Certificado TLS (avisar si quedan menos de 14 días) ---
DIAS_CERT=$(echo | openssl s_client -servername kaoz-sport.com -connect kaoz-sport.com:443 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null \
  | cut -d= -f2 \
  | xargs -I{} date -d {} +%s 2>/dev/null \
  | awk -v ahora="$(date +%s)" '{printf "%.0f", ($1-ahora)/86400}')

if [ -n "${DIAS_CERT:-}" ]; then
  if [ "$DIAS_CERT" -lt 14 ]; then
    echo "⚠️  CERTIFICADO TLS EXPIRA EN $DIAS_CERT DÍAS"
    PROBLEMAS=$((PROBLEMAS + 1))
  else
    echo "✅ Certificado TLS válido ($DIAS_CERT días)"
  fi
fi

echo "─────────────────────────────"
if [ "$PROBLEMAS" -eq 0 ]; then
  echo "🟢 Todo en orden"
else
  echo "🔴 $PROBLEMAS problema(s) detectado(s)"
fi

exit 0
```

```bash
sudo chmod +x /usr/local/bin/kaoz-healthcheck.sh
```

Programar cada 5 minutos:

```bash
sudo nano /etc/systemd/system/kaoz-healthcheck.timer
```

```ini
[Unit]
Description=KAOZ — Verificación de salud cada 5 minutos

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kaoz-healthcheck.timer
```

### 2.2 Alertas reales por correo o WhatsApp

Un `journalctl` que nadie lee no avisa de nada. La forma más simple de recibir alertas reales:

```bash
sudo nano /usr/local/bin/kaoz-alert.sh
```

```bash
#!/usr/bin/env bash
# Envía una alerta usando el mecanismo que prefieras.
# Descomenta UNA de las opciones.
set -uo pipefail

ASUNTO="$1"
CUERPO="$2"

# --- Opción A: correo con msmtp ---
# echo -e "Subject: $ASUNTO\n\n$CUERPO" | msmtp tu-correo@ejemplo.com

# --- Opción B: webhook (Discord, Slack, Telegram) ---
# curl -s -X POST "$WEBHOOK_URL" \
#   -H 'Content-Type: application/json' \
#   -d "{\"content\":\"🚨 **$ASUNTO**\n$CUERPO\"}"

# --- Opción C: WhatsApp vía CallMeBot (gratis, personal) ---
# curl -s "https://api.callmebot.com/whatsapp.php?phone=584128494887&text=$(printf '%s' "🚨 $ASUNTO - $CUERPO" | jq -sRr @uri)&apikey=TU_APIKEY"

# --- Opción D: log local (por defecto) ---
logger -t kaoz-alert "$ASUNTO — $CUERPO"
echo "🚨 $ASUNTO — $CUERPO"
```

Y modifica `kaoz-healthcheck.sh` para que llame a la alerta cuando haya problemas. Sustituye el
bloque final:

```bash
echo "─────────────────────────────"
if [ "$PROBLEMAS" -eq 0 ]; then
  echo "🟢 Todo en orden"
else
  echo "🔴 $PROBLEMAS problema(s) detectado(s)"
fi

# === NUEVO: alertar solo si hay problemas ===
# El archivo de estado evita repetir la misma alerta cada 5 minutos
ESTADO=/var/lib/kaoz/.health_estado
mkdir -p "$(dirname "$ESTADO")"

if [ "$PROBLEMAS" -eq 0 ]; then
  if [ -f "$ESTADO" ]; then
    /usr/local/bin/kaoz-alert.sh "KAOZ recuperado" "Todos los servicios volvieron a la normalidad."
    rm -f "$ESTADO"
  fi
else
  ULTIMA=$(cat "$ESTADO" 2>/dev/null || echo 0)
  AHORA=$(date +%s)
  # Alertar como máximo cada hora
  if [ $((AHORA - ULTIMA)) -gt 3600 ]; then
    /usr/local/bin/kaoz-alert.sh "KAOZ: $PROBLEMAS problema(s)" "$(tail -20 /var/log/syslog 2>/dev/null || echo 'Ver journalctl -u kaoz-health')"
    echo "$AHORA" > "$ESTADO"
  fi
fi

exit 0
```

> **La lógica de "alertar solo al cambiar de estado"** es importante: sin ella recibirías una
> alerta cada 5 minutos mientras el problema persista, y acabarías ignorándolas todas.

**Opción externa recomendada:** un servicio gratuito de monitoreo (UptimeRobot, BetterStack,
Healthchecks.io) apuntando a `https://kaoz-sport.com/health` te avisa **aunque el VPS esté
completamente caído** — cosa que un script dentro del propio servidor no puede hacer.

### 2.3 Rotación de logs

journald sin límite llena el disco:

```bash
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
Storage=persistent
SystemMaxUse=500M
SystemMaxFileSize=50M
MaxRetentionSec=1month
```

```bash
sudo systemctl restart systemd-journald
```

Logs de nginx:

```bash
sudo nano /etc/logrotate.d/kaoz
```

```
/var/log/nginx/kaoz.*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
```

---

## Parte 3 — Tareas programadas

### 3.1 Resolver el problema del token

Los endpoints de mantenimiento están detrás de `protect, authorize("admin")`. Un `curl` sin
credenciales recibe 401.

**Solución recomendada: token de servicio dedicado.**

**3a. Crear un usuario de servicio.** En el seed o a mano:

```bash
cd /var/www/kaoz/app/backend
node -e "
require('dotenv').config();
const {PrismaClient}=require('@prisma/client');
const bcrypt=require('bcryptjs');
const crypto=require('crypto');
const p=new PrismaClient();
(async()=>{
  const email='cron@kaoz.internal';
  const password=process.env.CRON_PASSWORD || crypto.randomBytes(32).toString('hex');
  const hashed=await bcrypt.hash(password,12);
  await p.user.upsert({
    where:{email},
    update:{role:'admin',isActive:true,password:hashed},
    create:{id:crypto.randomUUID(),firstName:'Cron',lastName:'Service',email,password:hashed,role:'admin',isActive:true}
  });
  console.log('✅ Usuario de servicio creado:', email);
  console.log('🔑 Password:', password);
  await p.\$disconnect();
})();
"
```

Guarda la contraseña en un archivo solo para root:

```bash
sudo tee /etc/kaoz-cron.env > /dev/null <<'EOF'
KAOZ_URL=https://kaoz-sport.com
KAOZ_CRON_EMAIL=cron@kaoz.internal
KAOZ_CRON_PASSWORD=PON_LA_PASSWORD_GENERADA
EOF
sudo chmod 600 /etc/kaoz-cron.env
```

**3b. Script de tareas programadas:**

```bash
sudo nano /usr/local/bin/kaoz-cron.sh
```

```bash
#!/usr/bin/env bash
# ==========================================================
# KAOZ — Tareas programadas
# Uso: kaoz-cron.sh [exchange-rate|new-status|zernio|all]
# ==========================================================
set -uo pipefail

set -a
source /etc/kaoz-cron.env
set +a

TAREA="${1:-all}"

# --- Obtener token ---
TOKEN=$(curl -s -X POST "$KAOZ_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$KAOZ_CRON_EMAIL\",\"password\":\"$KAOZ_CRON_PASSWORD\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ No se pudo autenticar el usuario de servicio" >&2
  /usr/local/bin/kaoz-alert.sh "KAOZ cron: fallo de autenticación" "El usuario $KAOZ_CRON_EMAIL no pudo obtener token."
  exit 1
fi

ejecutar() {
  local nombre="$1" endpoint="$2"
  echo "▶️  $nombre..."
  local respuesta
  respuesta=$(curl -s -X POST "$KAOZ_URL$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --max-time 60)

  if echo "$respuesta" | grep -q '"success":true'; then
    echo "✅ $nombre OK"
  else
    echo "❌ $nombre FALLÓ: $(echo "$respuesta" | head -c 200)"
  fi
}

# --- Ejecutar según la tarea ---
case "$TAREA" in
  exchange-rate)
    ejecutar "Actualizar tasa BCV" "/api/settings/exchange-rate/update"
    ;;
  new-status)
    ejecutar "Expirar etiqueta Nuevo" "/api/settings/products/update-new-status"
    ;;
  zernio)
    ejecutar "Sync Instagram" "/api/settings/zernio/sync"
    ;;
  all)
    ejecutar "Actualizar tasa BCV" "/api/settings/exchange-rate/update"
    ejecutar "Expirar etiqueta Nuevo" "/api/settings/products/update-new-status"
    ejecutar "Sync Instagram" "/api/settings/zernio/sync"
    ;;
  *)
    echo "Uso: $0 [exchange-rate|new-status|zernio|all]" >&2
    exit 1
    ;;
esac

echo "🎉 Tareas completadas"
```

```bash
sudo chmod 700 /usr/local/bin/kaoz-cron.sh
```

> **`chmod 700`** porque contiene credenciales vía `kaoz-cron.env`.

**3c. Probar antes de programar:**

```bash
sudo /usr/local/bin/kaoz-cron.sh exchange-rate
# → ✅ Actualizar tasa BCV OK
```

### 3.2 Programar las tres tareas

**Tasa de cambio — diaria a las 9:00** (el BCV publica por la mañana):

```bash
sudo tee /etc/systemd/system/kaoz-cron-exchange.service > /dev/null <<'EOF'
[Unit]
Description=KAOZ — Actualizar tasa de cambio BCV
After=network.target kaoz-backend.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/kaoz-cron.sh exchange-rate
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kaoz-cron
EOF

sudo tee /etc/systemd/system/kaoz-cron-exchange.timer > /dev/null <<'EOF'
[Unit]
Description=KAOZ — Tasa BCV diariamente

[Timer]
OnCalendar=*-*-* 09:00:00
Persistent=true
RandomizedDelaySec=120

[Install]
WantedBy=timers.target
EOF
```

**Etiqueta "Nuevo" — diaria a las 00:30:**

```bash
sudo tee /etc/systemd/system/kaoz-cron-newstatus.service > /dev/null <<'EOF'
[Unit]
Description=KAOZ — Expirar etiqueta Nuevo
After=network.target kaoz-backend.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/kaoz-cron.sh new-status
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kaoz-cron
EOF

sudo tee /etc/systemd/system/kaoz-cron-newstatus.timer > /dev/null <<'EOF'
[Unit]
Description=KAOZ — Etiqueta Nuevo diariamente

[Timer]
OnCalendar=*-*-* 00:30:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
```

**Instagram — cada 6 horas:**

```bash
sudo tee /etc/systemd/system/kaoz-cron-zernio.service > /dev/null <<'EOF'
[Unit]
Description=KAOZ — Sincronizar feed de Instagram
After=network.target kaoz-backend.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/kaoz-cron.sh zernio
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kaoz-cron
EOF

sudo tee /etc/systemd/system/kaoz-cron-zernio.timer > /dev/null <<'EOF'
[Unit]
Description=KAOZ — Instagram cada 6 horas

[Timer]
OnCalendar=*-*-* 00,06,12,18:15:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF
```

**Activar todo:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now \
  kaoz-cron-exchange.timer \
  kaoz-cron-newstatus.timer \
  kaoz-cron-zernio.timer

# Verificar que están programados
systemctl list-timers 'kaoz-*' --all

# Ejecutar uno a mano para probar
sudo systemctl start kaoz-cron-exchange.service
sudo journalctl -u kaoz-cron -n 20 --no-pager
```

---

## Verificación (criterio de aceptación)

```bash
echo "=== BACKUPS ==="
sudo /usr/local/bin/kaoz-backup.sh
ls -lh /var/backups/kaoz/
# → 3 archivos: kaoz-db-*.dump, kaoz-uploads-*.tar.gz, kaoz-env-*.tar.gz

# El dump es restaurable
ULTIMO=$(ls -t /var/backups/kaoz/kaoz-db-*.dump | head -1)
pg_restore --list "$ULTIMO" | grep -c 'TABLE DATA'
# → debe ser > 0

# Los permisos del backup de entorno son restrictivos
ls -l /var/backups/kaoz/kaoz-env-*.tar.gz
# → -rw------- root root

echo "=== TIMERS ==="
systemctl list-timers 'kaoz-*' --all | head
# → 4 timers: backup, healthcheck, exchange, newstatus, zernio

echo "=== TAREAS ==="
sudo /usr/local/bin/kaoz-cron.sh all
# → los tres ✅

echo "=== MONITOREO ==="
sudo /usr/local/bin/kaoz-healthcheck.sh
# → 🟢 Todo en orden

echo "=== LOGS ==="
sudo journalctl -u kaoz-backup -n 5 --no-pager
sudo journalctl -u kaoz-health -n 5 --no-pager
sudo journalctl -u kaoz-cron -n 5 --no-pager
```

**Prueba de restauración completa** (paso 1.4):

```bash
sudo -u postgres createdb kaoz_restore_test -O kaoz
pg_restore --dbname="postgresql://kaoz:PASS@127.0.0.1:5432/kaoz_restore_test" \
  --no-owner --no-acl "$(ls -t /var/backups/kaoz/kaoz-db-*.dump | head -1)"
psql "postgresql://kaoz:PASS@127.0.0.1:5432/kaoz_restore_test" -c \
  'SELECT COUNT(*) FROM "Product";'
sudo -u postgres dropdb kaoz_restore_test
```

**Pasa el plan cuando:**
- [ ] El script de backup corre sin errores y crea los 3 archivos.
- [ ] `pg_restore --list` valida el dump.
- [ ] Se ejecutó **una restauración de prueba** con éxito.
- [ ] El backup se sincroniza **fuera del servidor** (rclone, rsync o descarga manual).
- [ ] Los 4 timers aparecen en `systemctl list-timers`.
- [ ] `kaoz-cron.sh all` completa las tres tareas.
- [ ] `kaoz-healthcheck.sh` reporta "Todo en orden".
- [ ] Las alertas llegan a algún sitio real (correo, webhook o mensaje).
- [ ] Hay un monitor **externo** apuntando a `/health`.
- [ ] journald está limitado a 500 MB.

---

## Rollback

**Desactivar los timers:**

```bash
sudo systemctl disable --now \
  kaoz-backup.timer kaoz-healthcheck.timer \
  kaoz-cron-exchange.timer kaoz-cron-newstatus.timer kaoz-cron-zernio.timer
```

**Si un backup llena el disco:**

```bash
du -sh /var/backups/kaoz
# Reducir la retención en kaoz-backup.sh (RETENCION_DIAS) o limpiar manualmente:
sudo find /var/backups/kaoz -type f -mtime +3 -delete
```

**Si las tareas fallan por autenticación:** revisa `/etc/kaoz-cron.env` y confirma que el usuario
`cron@kaoz.internal` existe con `role = 'admin'`:

```bash
psql "$DATABASE_URL" -c "SELECT email, role, \"isActive\" FROM \"User\" WHERE email='cron@kaoz.internal';"
```

---

## Trampas conocidas

**Un backup en el mismo disco no es un backup.** El paso 1.3 no es opcional. Si el disco del VPS
muere, `/var/backups/kaoz` muere con él.

**El backup de imágenes puede crecer mucho.** Si tienes miles de productos con imágenes, el
`tar.gz` diario se vuelve pesado. Alternativas: hacerlo semanal en lugar de diario, o usar
`rclone sync` incremental (que solo sube lo que cambió) en vez de `tar`.

**`source` del `.env` en bash.** `kaoz-backup.sh` hace `source "$APP_DIR/backend/.env"`. Si el
`.env` tiene valores con espacios **sin comillas**, bash fallará. Asegúrate de que todos los
valores estén entre comillas dobles o no contengan espacios.

**El usuario de servicio y `JWT_SECRET`.** El token del cron se firma con el mismo `JWT_SECRET`. Si
lo rotas, el cron seguirá funcionando (pide un token nuevo en cada ejecución). No hay nada que
actualizar. ✅

**`OnCalendar` y zona horaria.** Los timers usan la zona horaria del sistema. Si en el plan 01
pusiste `America/Caracas`, las 9:00 son las 9:00 de Venezuela. Verifica con:

```bash
timedatectl
systemctl list-timers 'kaoz-*'
```

**La tentación de usar `node-cron`.** Ya está instalado en `package.json`, así que es tentador.
Pero ejecutaría las tareas **dentro** del proceso del backend: si el backend está caído, la tarea
no corre; y si algún día hay dos instancias, se ejecuta dos veces. Los timers de systemd no tienen
ninguno de esos problemas. La dependencia `node-cron` se puede eliminar (plan 11).
