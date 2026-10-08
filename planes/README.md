# 📋 Planes de despliegue — KAOZ en VPS

Carpeta con los **12 planes secuenciales** para montar este e-commerce completo
(frontend + backend + PostgreSQL) en un VPS Contabo.

## 👉 Empieza aquí

**[`00-INDICE.md`](00-INDICE.md)** — orden de ejecución, dependencias, decisiones previas
y tabla de avance.

## Resumen

| # | Plan | Fase |
|---|------|------|
| 01 | Prepara el VPS y PostgreSQL | Fundación |
| 02 | Esquema Prisma y migraciones | Fundación |
| 03 | Variables de entorno y secretos | Fundación |
| 04 | Correcciones críticas del backend | Bloqueadores |
| 05 | Frontend: build y arranque | Bloqueadores |
| 06 | Seguridad y autorización | Bloqueadores |
| 07 | Imágenes y almacenamiento persistente | Bloqueadores |
| 08 | systemd, nginx y TLS | Operación |
| 09 | Despliegue y smoke test | Operación |
| 10 | Backups, monitoreo y mantenimiento | Operación |
| 11 | Limpieza y deuda técnica | Higiene |

**Esfuerzo total:** ~17 horas.

## Ejecución

Los planes son **secuenciales**. Ejecuta uno, verifica su criterio de aceptación, y pasa al
siguiente. Cada uno tiene su propio **rollback**.

```bash
# Antes de empezar, revisa las 3 decisiones del índice:
# D1. Un dominio o dos
# D2. prisma migrate o prisma db push
# D3. Cómo se ejecutan las tareas programadas
```

## Recomendaciones rápidas

- **Gestor de paquetes: pnpm.** Ambos `package-lock.json` están desincronizados y `npm ci` falla.
- **Node 20 LTS.** Es lo declarado en `engines` de ambos `package.json`.
- **Un solo dominio** (`kaoz-sport.com`). Elimina el problema de CORS por completo.
- **Los backups van fuera del servidor.** Un backup en el mismo disco no es un backup.

## ⚠️ Antes de apuntar el dominio público

Estos son los bloqueadores que, sin resolver, hacen que el sitio no funcione o sea inseguro:

1. `localhost:5010` en el bundle del cliente (plan 05)
2. `pnpm start` sirve una carpeta inexistente (plan 05)
3. `DATABASE_URL` apuntando a Supabase (plan 03)
4. Sin migraciones Prisma (plan 02)
5. Bug de `const` en `settingsService.js` (plan 04)
6. `/api/deployments/:id/toggle` sin autenticación (plan 06)

Detalle completo en el [índice](00-INDICE.md).
