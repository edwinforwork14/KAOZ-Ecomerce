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
          <div className="bg-gray-900 border-b border-gray-800">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-2 ring-white/20">
                  <Image
                    src="/Kaoz.jpg"
                    alt={brandConfig.name}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white leading-tight">{brandConfig.name}</h1>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Panel Admin</p>
                </div>
              </Link>

              {/* Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all"
              >
                <div className={`transition-all duration-300 ${isOpen ? 'rotate-180 scale-0' : 'rotate-0 scale-100'}`}>
                  <Menu className="h-5 w-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className={`transition-all duration-300 ${isOpen ? 'rotate-0 scale-100' : '-rotate-180 scale-0'}`}>
                  <X className="h-5 w-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          <div 
            className={`
              fixed inset-x-0 top-[64px] bottom-0 z-40
              bg-gray-900
              transition-all duration-300 ease-out
              ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
            `}
          >
            <div className="h-full flex flex-col">
              {/* User Info */}
              <div className="px-4 py-5 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-xl ring-2 ring-white/20"
                      style={{ 
                        background: `linear-gradient(135deg, ${brandConfig.colors.secondary} 0%, ${brandConfig.colors.primary} 100%)`
                      }}
                    >
                      <span className="text-white">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-white truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-white/50 truncate">{user?.email}</p>
                  </div>
                  <span 
                    className="px-3 py-1.5 text-xs rounded-full font-semibold uppercase tracking-wide"
                    style={{ 
                      background: `linear-gradient(135deg, ${brandConfig.colors.secondary} 0%, ${brandConfig.colors.primary} 100%)`,
                      color: 'white'
                    }}
                  >
                    Admin
                  </span>
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
                          flex items-center gap-4 px-4 py-3.5 rounded-2xl
                          transition-all duration-200
                          ${isActive
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                            : 'text-white/70 hover:bg-white/10 hover:text-white active:bg-white/20'
                          }
                        `}
                        style={{
                          animationDelay: `${index * 50}ms`
                        }}
                      >
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center
                          ${isActive ? 'bg-white/20' : 'bg-white/10'}
                        `}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="flex-1 font-medium text-[15px]">{item.title}</span>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-white shadow-lg" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </nav>

              {/* Footer Actions */}
              <div className="px-3 py-4 border-t border-white/10 space-y-2">
                <Link 
                  href="/"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Home className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Ver Tienda</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Cerrar Sesión</span>
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
        bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950
        text-white border-r border-white/5
        transition-all duration-300 ease-out
        ${isCollapsed ? 'w-[88px]' : 'w-72'}
        flex-col flex-shrink-0
        overflow-hidden
      `}
    >
      {/* Header with Logo */}
      <div className={`
        relative p-5 border-b border-white/5 flex-shrink-0
        ${isCollapsed ? 'px-4' : ''}
      `}>
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50" />
        
        <div className="relative flex items-center justify-between">
          <Link 
            href="/" 
            className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}
          >
            <div className="relative w-11 h-11 flex-shrink-0 rounded-xl overflow-hidden ring-2 ring-white/10 transition-transform hover:scale-105 duration-300">
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
                <h1 className="text-lg font-bold whitespace-nowrap bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {brandConfig.name}
                </h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest whitespace-nowrap">
                  Panel de Control
                </p>
              </div>
            )}
          </Link>

          <button
            onClick={toggleCollapse}
            className={`
              flex items-center justify-center w-8 h-8 rounded-lg 
              bg-white/5 hover:bg-white/10 
              transition-all duration-300 hover:scale-110 flex-shrink-0
              ${isCollapsed ? 'absolute -right-4 top-1/2 -translate-y-1/2 bg-gray-800 shadow-xl border border-white/10' : ''}
            `}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* User info */}
      <div className={`p-4 border-b border-white/5 flex-shrink-0 ${isCollapsed ? 'px-3' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="relative group">
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center font-semibold shadow-lg transition-all duration-300 group-hover:scale-105 flex-shrink-0 ring-2 ring-white/10"
              style={{ 
                background: `linear-gradient(135deg, ${brandConfig.colors.secondary} 0%, ${brandConfig.colors.primary} 100%)`
              }}
            >
              <span className="text-sm text-white">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-in slide-in-from-left-2 duration-300 overflow-hidden">
              <p className="text-sm font-semibold truncate text-white/90">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-white/40 truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.title}>
            {!isCollapsed && (
              <h3 className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {group.title}
              </h3>
            )}
            {isCollapsed && (
              <div className="w-8 h-px bg-white/10 mx-auto mb-3" />
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
                          w-full flex items-center px-3 py-2.5 rounded-xl
                          transition-all duration-200
                          ${isCollapsed ? 'justify-center' : 'gap-3'}
                          ${isChildActive
                            ? 'bg-white/10 text-white'
                            : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                          }
                        `}
                      >
                        <div className={`
                          w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                          ${isChildActive ? 'bg-white/10' : 'bg-transparent'}
                        `}>
                          <Icon className="h-[18px] w-[18px]" />
                        </div>
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left text-sm font-medium">{item.title}</span>
                            <ChevronDown className={`
                              h-4 w-4 transition-transform duration-200
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
                          <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-3">
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon
                              const isChildItemActive = isActiveRoute(child.href)

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href!}
                                  className={`
                                    flex items-center gap-3 px-3 py-2 rounded-lg
                                    transition-all duration-200
                                    ${isChildItemActive
                                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                                    }
                                  `}
                                >
                                  <ChildIcon className="h-4 w-4" />
                                  <span className="text-sm">{child.title}</span>
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {isCollapsed && (
                        <div className="absolute left-full ml-2 top-0 hidden group-hover:block z-50">
                          <div className="bg-gray-800 rounded-xl shadow-2xl border border-white/10 py-2 min-w-[160px]">
                            <div className="px-3 py-1.5 text-xs font-semibold text-white/50 uppercase tracking-wider">
                              {item.title}
                            </div>
                            {item.children?.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href!}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                              >
                                <child.icon className="h-4 w-4" />
                                {child.title}
                              </Link>
                            ))}
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
                        flex items-center px-3 py-2.5 rounded-xl
                        transition-all duration-200
                        ${isCollapsed ? 'justify-center' : 'gap-3'}
                        ${isActive
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                          : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                        }
                      `}
                    >
                      <div className={`
                        w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                        transition-all duration-200
                        ${isActive ? 'bg-white/20' : 'bg-transparent group-hover:bg-white/5'}
                      `}>
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium whitespace-nowrap">{item.title}</span>
                          {item.badge && (
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${item.badgeColor} text-white`}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>

                    {isCollapsed && (
                      <div
                        className={`
                          absolute left-full ml-3 top-1/2 -translate-y-1/2
                          px-3 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg
                          opacity-0 group-hover:opacity-100 pointer-events-none
                          transition-all duration-200 whitespace-nowrap shadow-xl
                          border border-white/10 z-50
                          translate-x-2 group-hover:translate-x-0
                        `}
                      >
                        {item.title}
                        {item.badge && (
                          <span className={`ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-gray-800" />
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
      <div className={`p-3 border-t border-white/5 space-y-2 flex-shrink-0 ${isCollapsed ? 'px-2' : ''}`}>
        <div className="relative group">
          <Link 
            href="/" 
            className={`
              flex items-center px-3 py-2.5 rounded-xl
              bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/15
              transition-all duration-300
              ${isCollapsed ? 'justify-center' : 'gap-3'}
            `}
          >
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Home className="h-[18px] w-[18px]" />
            </div>
            {!isCollapsed && <span className="text-sm font-medium text-white/80">Ver Tienda</span>}
          </Link>

          {isCollapsed && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-xl border border-white/10 z-50 translate-x-2 group-hover:translate-x-0">
              Ver Tienda
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-gray-800" />
            </div>
          )}
        </div>

        <div className="relative group">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center px-3 py-2.5 rounded-xl
              bg-red-500/10 hover:bg-red-500/20 
              text-red-400 hover:text-red-300
              transition-all duration-300
              ${isCollapsed ? 'justify-center' : 'gap-3'}
            `}
          >
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <LogOut className="h-[18px] w-[18px]" />
            </div>
            {!isCollapsed && <span className="text-sm font-medium">Cerrar Sesión</span>}
          </button>

          {isCollapsed && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-xl border border-white/10 z-50 translate-x-2 group-hover:translate-x-0">
              Cerrar Sesión
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-gray-800" />
            </div>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between text-[11px] text-white/30">
            <span>© 2025 {brandConfig.name}</span>
            <span className="px-2 py-0.5 bg-white/5 rounded-md">v2.0.0</span>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </aside>
  )
}