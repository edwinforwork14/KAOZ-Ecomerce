"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronDown,
  Settings,
  FolderTree,
  CreditCard,
  Truck,
  DollarSign,
  Building2,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { brandConfig } from "@/lib/config"

interface MenuItem {
  title: string
  href?: string
  icon: any
  badge?: string
  badgeColor?: string
  children?: MenuItem[]
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    title: "Principal",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard
      }
    ]
  },
  {
    title: "Catálogo",
    items: [
      {
        title: "Productos",
        href: "/admin/products",
        icon: Package
      },
      {
        title: "Categorías",
        href: "/admin/categories",
        icon: FolderTree
      }
    ]
  },
  {
    title: "Ventas",
    items: [
      {
        title: "Pedidos",
        href: "/admin/orders",
        icon: ShoppingCart,
      },
      {
        title: "Clientes",
        href: "/admin/customers",
        icon: Users
      }
    ]
  },
  {
    title: "Reportes",
    items: [
      {
        title: "Análisis",
        href: "/admin/analytics",
        icon: BarChart3
      }
    ]
  },
  {
    title: "Configuración",
    items: [
      {
        title: "Ajustes",
        icon: Settings,
        children: [
          {
            title: "General",
            href: "/admin/settings",
            icon: Building2
          },
          {
            title: "Pagos",
            href: "/admin/settings?tab=payment",
            icon: CreditCard
          },
          {
            title: "Envíos",
            href: "/admin/settings?tab=shipping",
            icon: Truck
          },
          {
            title: "Tasa de Cambio",
            href: "/admin/settings?tab=exchange",
            icon: DollarSign
          }
        ]
      }
    ]
  }
]

// Flat menu for mobile
const flatMenuItems = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Productos", href: "/admin/products", icon: Package },
  { title: "Categorías", href: "/admin/categories", icon: FolderTree },
  { title: "Pedidos", href: "/admin/orders", icon: ShoppingCart },
  { title: "Clientes", href: "/admin/customers", icon: Users },
  { title: "Análisis", href: "/admin/analytics", icon: BarChart3 },
  { title: "Configuración", href: "/admin/settings", icon: Settings }
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Ajustes"])

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) {
        setIsCollapsed(false)
        setIsOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    }
  }, [pathname, isMobile])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const toggleCollapse = () => {
    if (!isMobile) {
      setIsCollapsed(!isCollapsed)
    }
  }

  const toggleSubmenu = (title: string) => {
    setExpandedMenus(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }

  // Función mejorada para comparar rutas CON query params
  const isActiveRoute = (href?: string) => {
    if (!href) return false
    
    // Separar ruta y query params
    const [itemPath, itemQuery] = href.split('?')
    const currentPath = pathname
    const currentTab = searchParams.get('tab')
    
    // Si las rutas base no coinciden, no es activo
    if (currentPath !== itemPath) return false
    
    // Si el item tiene query params, deben coincidir exactamente
    if (itemQuery) {
      const itemTab = new URLSearchParams(itemQuery).get('tab')
      return currentTab === itemTab
    }
    
    // Si el item no tiene query params, solo es activo si no hay tab o tab=general
    return !currentTab || currentTab === 'general'
  }

  const isParentActive = (children?: MenuItem[]) => {
    if (!children) return false
    return children.some(child => isActiveRoute(child.href))
  }

  // Mobile Header
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50">
          <div className="bg-white border-b border-black/10">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3">
                <div className="relative w-10 h-10 overflow-hidden ring-1 ring-black/5">
                  <Image
                    src="/Kaoz.jpg"
                    alt={brandConfig.name}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <h1 className="text-base font-black text-black leading-tight tracking-tighter">{brandConfig.name}</h1>
                  <p className="text-[10px] text-black/50 uppercase tracking-[0.2em]">Panel Admin</p>
                </div>
              </Link>

              {/* Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-10 h-10 flex items-center justify-center bg-black/5 hover:bg-black/10 transition-all border border-black/5"
              >
                <div className={`transition-all duration-300 ${isOpen ? 'rotate-180 scale-0' : 'rotate-0 scale-100'}`}>
                  <Menu className="h-5 w-5 text-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className={`transition-all duration-300 ${isOpen ? 'rotate-0 scale-100' : '-rotate-180 scale-0'}`}>
                  <X className="h-5 w-5 text-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          <div 
            className={`
              fixed inset-x-0 top-[64px] bottom-0 z-40
              bg-white
              transition-all duration-300 ease-out
              ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
            `}
          >
            <div className="h-full flex flex-col">
              {/* User Info */}
              <div className="px-4 py-5 border-b border-black/10">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div 
                      className="w-14 h-14 bg-black/5 border border-black/10 flex items-center justify-center font-bold text-lg"
                    >
                      <span className="text-black">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-black uppercase tracking-tight truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-black/50 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 overflow-y-auto">
                <div className="space-y-1">
                  {flatMenuItems.map((item, index) => {
                    const Icon = item.icon
                    const isActive = isActiveRoute(item.href)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          flex items-center gap-4 px-4 py-3 border transition-all duration-200
                          ${isActive
                            ? 'bg-kaosNeon text-black border-kaosNeon font-black'
                            : 'text-black/70 border-transparent hover:border-black/10 hover:text-black font-bold'
                          }
                        `}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1 text-xs uppercase tracking-widest">{item.title}</span>
                      </Link>
                    )
                  })}
                </div>
              </nav>

              {/* Footer Actions */}
              <div className="px-3 py-4 border-t border-black/10 space-y-2">
                <Link 
                  href="/"
                  className="flex items-center gap-4 px-4 py-3 bg-black/5 hover:bg-black/10 text-black transition-all border border-black/5 font-bold"
                >
                  <Home className="h-5 w-5" />
                  <span className="text-xs uppercase tracking-widest">Ver Tienda</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 transition-all border border-red-500/10 font-bold"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-xs uppercase tracking-widest">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-16 lg:hidden" />
      </>
    )
  }

  // Desktop Sidebar
  return (
    <aside
      className={`
        hidden lg:flex
        sticky top-0 h-screen
        bg-white text-black border-r border-black/5
        transition-all duration-300 ease-out
        ${isCollapsed ? 'w-[80px]' : 'w-64'}
        flex-col flex-shrink-0
        overflow-hidden
      `}
    >
      {/* Header with Logo */}
      <div className={`
        relative p-5 border-b border-black/5 flex-shrink-0
        ${isCollapsed ? 'px-4' : ''}
      `}>
        <div className="relative flex items-center justify-between">
          <Link 
            href="/" 
            className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}
          >
            <div className="relative w-10 h-10 flex-shrink-0 border border-black/5 transition-transform hover:scale-105 duration-300">
              <Image
                src="/Kaoz.jpg"
                alt={brandConfig.name}
                fill
                className="object-contain"
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="animate-in slide-in-from-left-2 duration-300 overflow-hidden">
                <h1 className="text-xl font-black whitespace-nowrap tracking-tighter">
                  {brandConfig.name}
                </h1>
                <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] whitespace-nowrap font-bold">
                  Admin Panel
                </p>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="flex items-center justify-center w-8 h-8 bg-black/5 hover:bg-black/10 transition-all border border-black/5"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="mx-auto my-4 flex items-center justify-center w-10 h-10 bg-black/5 hover:bg-black/10 transition-all border border-black/5"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* User info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-black/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-xs"
            >
              <span>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0 animate-in slide-in-from-left-2 duration-300 overflow-hidden">
              <p className="text-xs font-black uppercase tracking-tight truncate text-black">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-black/30 truncate uppercase tracking-widest font-bold">{user?.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.title}>
            {!isCollapsed && (
              <h3 className="px-3 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-black/20">
                {group.title}
              </h3>
            )}
            
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = isActiveRoute(item.href)
                const hasChildren = item.children && item.children.length > 0
                const isExpanded = expandedMenus.includes(item.title)
                const isChildActive = isParentActive(item.children)

                if (hasChildren) {
                  return (
                    <div key={item.title}>
                      <button
                        onClick={() => !isCollapsed && toggleSubmenu(item.title)}
                        className={`
                          w-full flex items-center py-2.5 transition-all duration-200
                          ${isCollapsed ? 'justify-center' : 'px-3 gap-3'}
                          ${isChildActive
                            ? 'text-black font-black'
                            : 'text-black/40 hover:text-black font-bold'
                          }
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left text-[10px] font-black uppercase tracking-[0.1em]">{item.title}</span>
                            <ChevronDown className={`
                              h-3 w-3 transition-transform duration-200
                              ${isExpanded ? 'rotate-180' : ''}
                            `} />
                          </>
                        )}
                      </button>

                      {!isCollapsed && (
                        <div className={`
                          overflow-hidden transition-all duration-300 ease-out
                          ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                        `}>
                          <div className="ml-3 mt-1 space-y-1 border-l border-black/5 pl-3">
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon
                              const isChildItemActive = isActiveRoute(child.href)

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href!}
                                  className={`
                                    flex items-center gap-3 py-2 px-3 transition-all duration-200 border
                                    ${isChildItemActive
                                      ? 'bg-kaosNeon text-black border-kaosNeon font-black'
                                      : 'text-black/30 border-transparent hover:text-black hover:border-black/10 font-bold'
                                    }
                                  `}
                                >
                                  <ChildIcon className="h-3 w-3" />
                                  <span className="text-[9px] font-black uppercase tracking-[0.1em]">{child.title}</span>
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div key={item.href} className="relative group">
                    <Link
                      href={item.href!}
                      className={`
                        flex items-center py-2.5 transition-all duration-200 border
                        ${isCollapsed ? 'justify-center border-transparent' : 'px-3 gap-3'}
                        ${isActive
                          ? 'bg-kaosNeon text-black border-kaosNeon font-black'
                          : 'text-black/40 border-transparent hover:text-black hover:border-black/10 font-bold'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap">{item.title}</span>
                          {item.badge && (
                            <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-none ${item.badgeColor} text-white`}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>

                    {isCollapsed && (isActive ? (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-kaosNeon" />
                    ) : null)}

                    {isCollapsed && (
                      <div
                        className={`
                          absolute left-full ml-3 top-1/2 -translate-y-1/2
                          px-3 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest
                          opacity-0 group-hover:opacity-100 pointer-events-none
                          transition-all duration-200 whitespace-nowrap shadow-2xl
                          border border-white/10 z-50
                          translate-x-2 group-hover:translate-x-0
                        `}
                      >
                        {item.title}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-black" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className={`p-3 border-t border-black/5 space-y-2 flex-shrink-0 ${isCollapsed ? 'px-2' : ''}`}>
        <Link 
          href="/" 
          className={`
            flex items-center py-2.5 bg-black/5 hover:bg-black/10 transition-all border border-black/5
            ${isCollapsed ? 'justify-center' : 'px-3 gap-3'}
          `}
        >
          <Home className="h-4 w-4" />
          {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest text-black/80">Ver Tienda</span>}
        </Link>

        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center py-2.5 bg-red-500/5 hover:bg-red-500/10 
            text-red-600 hover:text-red-700 transition-all border border-red-500/10
            ${isCollapsed ? 'justify-center' : 'px-3 gap-3'}
          `}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest font-bold">Cerrar Sesión</span>}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-4 border-t border-black/5 flex-shrink-0">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-black/20">
            <span>© 2025 {brandConfig.name}</span>
            <span className="px-1.5 py-0.5 bg-black/5 border border-black/5">v2.1.0</span>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </aside>
  )
}