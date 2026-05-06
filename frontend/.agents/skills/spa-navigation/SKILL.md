---
name: spa-ecommerce-navigation
description: Patrones y lógica para implementar navegación de alto rendimiento tipo Single Page Application (SPA) en plantillas de e-commerce con Next.js.
---

# 🚀 Arquitectura de Navegación SPA E-commerce

Esta web utiliza un patrón de navegación de **Página Única (SPA)** dentro de `app/page.tsx` para ofrecer una experiencia de usuario ultra rápida, fluida y con micro-interacciones premium.

## 🧠 Concepto Core
En lugar de navegar entre archivos físicos de Next.js (que causan recargas de página), la aplicación utiliza un **Estado Maestro** (`activeTab`) que decide qué componente renderizar en tiempo real.

## 🛠️ Implementación Técnica

### 1. El Estado Maestro (`app/page.tsx`)
El componente `Home` actúa como el orquestador global:

```tsx
const [activeTab, setActiveTab] = useState("home");
```

### 2. Flujo de Comunicación
1.  **Header:** Recibe la función `setActiveTab`. Al hacer clic en un enlace, ejecuta la función en lugar de usar un `<Link>` tradicional.
2.  **Home:** Detecta el cambio de estado y dispara un re-renderizado instantáneo.
3.  **Renderizado Condicional:** Se utiliza una función `renderContent()` con un `switch` para devolver el componente correspondiente.

```tsx
const renderContent = () => {
  switch (activeTab) {
    case "home": return <Hero />;
    case "products": return <FeaturedProducts showAll={true} />;
    default: return <Hero />;
  }
};
```

## ✨ Beneficios Premium
- **Zero Latency:** No hay espera de servidor entre secciones.
- **Micro-animaciones:** Permite usar `framer-motion` para transiciones suaves entre el Inicio y el Catálogo.
- **Estado Persistente:** El carrito de compras y la sesión de usuario no se reinician, ya que técnicamente nunca abandonamos la página.

## ⚠️ Guía de Mantenimiento
- **Nuevas Secciones:** Para añadir una sección (ej: "Ofertas"), simplemente añade un nuevo `case` en el switch de `page.tsx` y el botón correspondiente en el `Header.tsx`.
- **SEO:** Para mejorar el SEO en modo SPA, se recomienda actualizar el `document.title` dinámicamente mediante un `useEffect` que escuche al `activeTab`.
- **Navegación del Navegador:** Si se desea que el botón "Atrás" funcione, se debe integrar el estado con `window.history.pushState`.

---
*Desarrollado para el ecosistema KAOZ E-commerce.*
