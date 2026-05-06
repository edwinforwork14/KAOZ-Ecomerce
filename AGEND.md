# 🚀 Agenda de Refactorización: Yenfit E-commerce Speed-Run

## 📊 Resumen del Descubrimiento (Auto-Discovery)
- **Stack Actual:** Next.js 15 (App Router) + Express/MongoDB (Legacy).
- **Meta:** Migración completa a Next.js Server Actions + Supabase (PostgreSQL).
- **Reto:** Migrar modelos complejos de variantes de productos y gestión de stock.

## Fase 1: Infraestructura y Base de Datos (Día 1) - ✅ COMPLETADA
- [x] **Análisis de Modelos:** Identificación de esquemas Mongoose realizada.
- [x] **DDL SQL:** `supabase_schema.sql` ejecutado en Supabase.
- [x] **Setup de Cliente:** Helpers de Supabase configurados en `frontend/utils/supabase`.
- [x] **Script de Migración:** Creado (Omitido por el usuario, se empezará con base de datos limpia).

## Fase 2: Backend Core & Auth (Día 2)
- [ ] **Auth Migration:** Reemplazar JWT manual por Supabase Auth en `middleware.ts`. `(Skill: supabase-postgres-best-practices)`
- [ ] **Server Actions - Productos:** Implementar `getProducts`, `getProductBySlug` con filtros SQL. `(Skill: nodejs-backend-patterns, sql-optimization)`
- [ ] **Server Actions - Admin:** Refactorizar creación/edición de productos con manejo de variantes y stock. `(Skill: nodejs-backend-patterns)`
- [ ] **Optimización:** Implementar revalidación de caché (`revalidatePath`) en acciones críticas. `(Skill: postgresql-optimization)`

## Fase 3: Frontend Evolution & UI (Día 3)
- [ ] **Modernización UI:** Aplicar Glassmorphism y micro-animaciones (Framer Motion) en Product Cards. `(Skill: flutter-animations, ui-components)`
- [ ] **Componentes de Variante:** Rediseñar el selector de color y talla para mayor velocidad. `(Skill: shadcn, tailwind-css-patterns)`
- [ ] **Dashboard Admin:** Actualizar tablas de pedidos para usar consultas directas de Supabase. `(Skill: nextjs, build-dashboard)`

## Fase 4: Lógica de Negocio (Día 4)
- [ ] **Checkout Flow:** Refactorizar `createOrder` para manejar transacciones SQL (Order + Items).
- [ ] **Notificaciones:** Integrar Webhooks de Supabase para envíos automáticos de WhatsApp.
- [ ] **Inventario:** Lógica de decremento de stock atómica en PostgreSQL.

## Fase 5: QA & Launch (Día 5)
- [ ] **Pruebas RLS:** Verificar que los usuarios solo accedan a sus propios pedidos. `(Skill: supabase-postgres-best-practices)`
- [ ] **SEO & Meta:** Implementar Metadata API dinámica para productos. `(Skill: seo-audit, copywriting)`
- [ ] **Vercel Deploy:** Configurar variables de entorno y lanzar. `(Skill: server-management)`

---

## 🛠️ Herramientas y Skills del Proyecto

### 🌍 Global Skills (General & Meta)
- **Copywriting:** `.agents/skills/copywriting` - Mejora de textos y conversión.
- **GitHub Actions:** `.agents/skills/github-actions-docs` - Automatización de CI/CD.
- **PostgreSQL/SQL Opt:** `.agents/skills/postgresql-optimization`, `sql-optimization` - Tuning de queries.
- **Supabase Best Practices:** `.agents/skills/supabase-postgres-best-practices` - Implementación core.
- **SEO Audit:** `.agents/skills/seo-audit` - Optimización para motores de búsqueda.
- **TS Expert/Advanced:** `.agents/skills/typescript-expert`, `typescript-advanced-types` - Tipado estricto.

### ⚙️ Backend Skills (`/backend`)
- **Node.js Patterns:** `backend/.agents/skills/nodejs-backend-patterns` - Arquitectura Express/Fastify.
- **Build Dashboard:** `backend/.agents/skills/build-dashboard` - Generación de reportes HTML.
- **Zustand:** `backend/.agents/skills/zustand` - Gestión de estado (Json-render adapter).

### 🎨 Frontend Skills (`/frontend`)
- **Next.js & Patterns:** `.agents/skills/nextjs`, `nextjs-app-router-patterns` - Server Actions, App Router.
- **UI & Shadcn:** `frontend/.agents/skills/ui-components`, `shadcn` - Componentes premium y RAD.
- **Tailwind Patterns:** `frontend/.agents/skills/tailwind-css-patterns` - Estilizado consistente.
- **Animations:** `.agents/skills/flutter-animations` - Micro-interacciones y Framer Motion.
- **SPA Navigation:** `frontend/.agents/skills/spa-navigation` - Arquitectura de navegación instantánea.