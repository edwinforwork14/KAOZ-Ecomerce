# Plan 01 — Preparar el VPS y PostgreSQL

> **Fase:** Fundación · **Depende de:** nada · **Bloquea a:** todos
> **Esfuerzo:** ~2 h · **Riesgo:** bajo

---

## Objetivo

Dejar el VPS Contabo listo para alojar todo: usuario de despliegue, Node 20, pnpm, PostgreSQL
local, nginx, firewall y certificados TLS. Al terminar este plan **nada del e-commerce está
publicado todavía** — solo existe la infraestructura.

---

## Por qué

Hoy no existe **ninguna** pieza de infraestructura en el repo. Buscado y no encontrado:
`Dockerfile`, `docker-compose.yml`, `ecosystem.config.js`, unidad systemd, vhost de nginx,
`.env.example` útil. Todo se crea desde cero.

Además hay una incompatibilidad confirmada de plataforma:

> El cliente Prisma generado actualmente contiene **solo** `query_engine-windows.dll.node` y
> `libquery_engine-rhel-openssl-3.0.x.so.node` (verificado en `node_modules/.prisma/client/`).
> **No hay engine para Debian/Ubuntu.** Copiar `node_modules` al VPS no funcionará.

Por eso este plan fija las versiones correctas desde el principio.

---

## Decisión previa obligatoria

Antes de tocar el servidor, confirma el **Plan D1** del índice: **un dominio o dos**.
Estos planes asumen **un solo dominio** (`kaoz-sport.com`) con nginx repartiendo `/api` y
`/uploads` al backend. Si eliges dos subdominios, ajusta el proyecto 6 del paso 8.

---

## Requisitos previos

- VPS Contabo con **Ubuntu 22.04 o 24.04 LTS** (estos planes asumen Ubuntu).
- Acceso SSH como `root` la primera vez.
- Un dominio con acceso a su panel DNS.
- Mínimo recomendado: **4 GB de RAM / 2 vCPU**. Con 2 GB el build de Next.js (`next build`)
  puede quedarse sin memoria — ver "Nota sobre memoria" al final.

---

## Pasos

### 1. Actualizar el sistema y crear el usuario de despliegue

No ejecutes la aplicación como `root`.

```bash
ssh root@TU_IP

apt update && apt upgrade -y
apt install -y curl git build-essential ca-certificates gnupg ufw

# Usuario de despliegue
adduser --disabled-password --gecos "" kaoz
usermod -aG sudo kaoz

# Copiar tu llave SSH al nuevo usuario
rsync --archive --chown=kaoz:kaoz ~/.ssh /home/kaoz

# Probar en OTRA terminal antes de cerrar esta sesión
ssh kaoz@TU_IP
```

### 2. Instalar Node.js 20 LTS

Ambos `package.json` declaran `"engines": { "node": "20.x" }`. No instales Node 24: aunque
funciona en local, el proyecto está fijado a 20.

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node --version   # debe decir v20.x
npm --version
```

### 3. Activar pnpm con corepack

El proyecto usa `pnpm@9.15.0` (declarado en `packageManager` en ambos `package.json`), y es el
**único lockfile que está en sync**. El `package-lock.json` de ambos lados está desincronizado
y `npm ci` fallaría (plan 11).

```bash
sudo corepack enable
corepack prepare pnpm@9.15.0 --activate

pnpm --version   # debe decir 9.15.0
```

### 4. Instalar PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib

sudo systemctl enable --now postgresql
sudo systemctl status postgresql   # debe estar "active (running)"

psql --version
```

### 5. Crear la base de datos, el rol y los permisos

> **Importante:** en PostgreSQL 15+ el esquema `public` ya no da permisos de escritura por
> defecto. Si omites el `GRANT`, `prisma migrate` fallará con *"permission denied for schema
> public"*. Este paso es obligatorio en Ubuntu 24.04.

Genera una contraseña fuerte y guárdala — la necesitas en el plan 03:

```bash
openssl rand -base64 32
```

```bash
sudo -u postgres psql
```

Dentro de `psql` (reemplaza `TU_PASSWORD_FUERTE`):

```sql
CREATE ROLE kaoz WITH LOGIN PASSWORD 'TU_PASSWORD_FUERTE';
CREATE DATABASE kaoz OWNER kaoz;

\c kaoz
GRANT ALL ON SCHEMA public TO kaoz;
ALTER SCHEMA public OWNER TO kaoz;

-- Verificación
\l
\du
\q
```

Prueba la conexión con el usuario real:

```bash
psql "postgresql://kaoz:TU_PASSWORD_FUERTE@127.0.0.1:5432/kaoz" -c "SELECT current_user, current_database();"
```

### 6. Confirmar que PostgreSQL NO está expuesto a internet

Por defecto escucha en `localhost`, que es lo correcto. Verifícalo:

```bash
sudo ss -tlnp | grep 5432
# Debe mostrar 127.0.0.1:5432  (NO 0.0.0.0:5432 ni :::5432)
```

Si aparece `0.0.0.0`, edita `/etc/postgresql/*/main/postgresql.conf` y pon
`listen_addresses = 'localhost'`, luego `sudo systemctl restart postgresql`.

### 7. Configurar el firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Los puertos **3000** (Next.js) y **5010** (Express) **no se abren nunca**. nginx los alcanza por
`127.0.0.1`. Esto también evita que alguien falsifique `X-Forwarded-For`,
que `server.js:52` guarda en `ProductView.ip`.

### 8. Instalar nginx y certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable --now nginx
```

Crea el vhost base (el contenido completo está en el **plan 08**, aquí solo dejamos nginx vivo):

```bash
sudo mkdir -p /var/www/certbot
sudo ufw status
```

### 9. Crear las carpetas persistentes

Las imágenes **no pueden vivir dentro del directorio del release** o un redeploy las borra
(riesgo R8, ver plan 07). Se crean aquí, fuera del código:

```bash
sudo mkdir -p /var/lib/kaoz/uploads/products
sudo mkdir -p /var/backups/kaoz
sudo mkdir -p /var/www/kaoz            # aquí vivirá el código

sudo chown -R kaoz:kaoz /var/lib/kaoz /var/backups/kaoz /var/www/kaoz
```

### 10. Apuntar el DNS

En el panel de tu proveedor de dominio, crea:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `@` | `TU_IP` |
| A | `www` | `TU_IP` |

Espera la propagación y confirma:

```bash
dig +short kaoz-sport.com
# debe devolver TU_IP
```

> **No sigas hasta que el DNS resuelva.** El plan 08 usa certbot, y Let's Encrypt **falla** si
> el dominio todavía no apunta al servidor.

### 11. Ajustar la zona horaria y swap

Las fechas de pedidos se registran con `now()`; una zona horaria incorrecta desordena reportes.

```bash
sudo timedatectl set-timezone America/Caracas
timedatectl

# Swap de 2 GB (recomendado si el VPS tiene 4 GB o menos)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

---

## Verificación (criterio de aceptación)

Ejecuta todo esto y confirma cada salida:

```bash
node --version                 # v20.x
pnpm --version                 # 9.15.0
psql --version                 # PostgreSQL 14/15/16
sudo systemctl is-active postgresql nginx   # active / active
sudo ufw status                             # 22, 80, 443 abiertos
dig +short kaoz-sport.com                   # TU_IP
sudo ss -tlnp | grep 5432                   # solo 127.0.0.1
ls -ld /var/lib/kaoz/uploads /var/backups/kaoz
free -h                                     # swap presente
```

**Pasa el plan cuando:**
- [ ] Entras por SSH como `kaoz` (no root) sin contraseña.
- [ ] `node --version` dice v20.x y `pnpm --version` dice 9.15.0.
- [ ] Te conectas a `kaoz` con `psql` usando la contraseña real.
- [ ] PostgreSQL escucha **solo** en `127.0.0.1`.
- [ ] `dig` del dominio devuelve la IP del VPS.
- [ ] nginx responde en el puerto 80 (verás la página por defecto).

---

## Rollback

Este plan solo **añade** cosas; nada del e-commerce depende aún de él.

- Si algo sale mal con el usuario: `sudo deluser --remove-home kaoz`.
- Si PostgreSQL queda mal configurado: `sudo apt purge --autoremove postgresql*` y reinstalar.
- Si el DNS está mal: corrige el registro A y espera; no requiere tocar el servidor.
- El firewall se desactiva con `sudo ufw disable` (solo temporalmente).

---

## Notas y trampas conocidas

**Sobre memoria.** El build de Next.js de este proyecto consume bastante. En un VPS de 2 GB
puede morir con *"JavaScript heap out of memory"*. Si es tu caso, al hacer el build en el plan 09
usa `NODE_OPTIONS="--max-old-space-size=1536" pnpm build`. Con 4 GB no hay problema.

**Sobre `openssl`.** Prisma necesita un engine compilado para la versión de OpenSSL del sistema.
Comprueba cuál tienes:

```bash
openssl version
```

- Ubuntu 22.04 / 24.04 → OpenSSL 3.0 → target `debian-openssl-3.0.x`.
- Ubuntu 20.04 → OpenSSL 1.1 → target `debian-openssl-1.1.x`.

Lo usarás en el plan 02 para corregir `binaryTargets` en `prisma/schema.prisma`.

**Sobre el DNS y el correo.** Si más adelante quieres enviar correos desde el dominio, no
reutilices este VPS para eso: Contabo tiene rangos con mala reputación. Usa un servicio externo.

**No instales Docker.** Los planes 08 y 10 usan systemd + nginx directamente. Menos capas, menos
consumo de RAM, y el proyecto no trae ningún `Dockerfile`.
