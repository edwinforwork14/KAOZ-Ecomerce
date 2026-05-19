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
  Bell,
  Search,
  ExternalLink,
  Banknote,
  Instagram,
  Image as ImageIcon
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { brandConfig } from "@/lib/config"
import { cn } from "@/lib/utils"

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
    title: "OPERACIONES",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard
      },
      {
        title: "Pedidos",
        href: "/admin/orders",
        icon: ShoppingCart,
        badge: "NUEVO",
        badgeColor: "bg-kaosNeon text-black"
      },
      {
        title: "Gastos",
        href: "/admin/expenses",
        icon: Banknote
      }
    ]
  },
  {
    title: "CATÁLOGO",
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
    title: "CLIENTES",
    items: [
      {
        title: "Base de Datos",
        href: "/admin/customers",
        icon: Users
      }
    ]
  },
  {
    title: "SISTEMA",
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
            title: "Exchange",
            href: "/admin/settings?tab=exchange",
            icon: DollarSign
          },
          {
            title: "Gastos",
            href: "/admin/settings?tab=gastos",
            icon: Banknote
          },
          {
            title: "Identidad",
            href: "/admin/settings?tab=business",
            icon: Building2
          },
          {
            title: "Instagram",
            href: "/admin/settings?tab=zernio",
            icon: Instagram
          },
          {
            title: "Nuevo Drop",
            href: "/admin/settings?tab=lifestyle",
            icon: ImageIcon
          }
        ]
      }
    ]
  }
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

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const toggleCollapse = () => {
    if (!isMobile) setIsCollapsed(!isCollapsed)
  }

  const toggleSubmenu = (title: string) => {
    setExpandedMenus(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    )
  }

  const isActiveRoute = (href?: string) => {
    if (!href) return false
    const [itemPath, itemQuery] = href.split('?')
    const currentTab = searchParams.get('tab')
    if (pathname !== itemPath) return false
    if (itemQuery) {
      const itemTab = new URLSearchParams(itemQuery).get('tab')
      return currentTab === itemTab
    }
    return !currentTab || currentTab === 'general'
  }

  const isParentActive = (children?: MenuItem[]) => {
    if (!children) return false
    return children.some(child => isActiveRoute(child.href))
  }

  // Common Nav Item Component for reusability
  const NavItem = ({ item, isChild = false }: { item: MenuItem, isChild?: boolean }) => {
    const Icon = item.icon
    const isActive = isActiveRoute(item.href)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedMenus.includes(item.title)
    const isChildActive = isParentActive(item.children)

    if (hasChildren) {
      return (
        <div key={item.title} className="mb-1">
          <button
            onClick={() => !isCollapsed && toggleSubmenu(item.title)}
            className={cn(
              "w-full flex items-center transition-all duration-300",
              isCollapsed ? "justify-center py-4" : "px-4 py-3 gap-3",
              isChildActive ? "text-white font-bold" : "text-neutral-400 hover:text-white"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", isChildActive ? "text-kaosNeon" : "text-neutral-400")} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left text-[10px] font-black uppercase tracking-widest">{item.title}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", isExpanded && "rotate-180")} />
              </>
            )}
          </button>
          {!isCollapsed && isExpanded && (
            <div className="ml-9 border-l border-white/5 space-y-1 py-2">
              {item.children?.map(child => (
                <NavItem key={child.href} item={child} isChild />
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        href={item.href!}
        className={cn(
          "relative flex items-center transition-all duration-300",
          isCollapsed ? "justify-center py-4" : cn(isChild ? "px-4 py-2" : "px-4 py-3", "gap-3"),
          isActive 
            ? "text-white bg-white/10 font-bold border-l-2 border-kaosNeon" 
            : "text-neutral-400 hover:text-white hover:bg-white/5 font-bold"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-kaosNeon" : "text-neutral-400")} />
        {!isCollapsed && (
          <>
            <span className={cn("flex-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap", isChild && "text-[9px]")}>
              {item.title}
            </span>
            {item.badge && (
              <span className={cn("px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter", item.badgeColor)}>
                {item.badge}
              </span>
            )}
          </>
        )}
        {isCollapsed && isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-kaosNeon" />
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Trigger */}
      {isMobile && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-3 bg-black text-white border border-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-[#0B0C0E] border-r border-neutral-900 flex flex-col transition-all duration-500 ease-in-out lg:relative",
          isCollapsed ? "w-20" : "w-64",
          isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        )}
      >
        {/* Mobile Header */}
        {isMobile && (
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <span className="text-xl font-black uppercase tracking-tighter text-white">KAOS</span>
            <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* Branding & Profile Header */}
        <div className={cn("flex flex-col border-b border-white/5", isCollapsed ? "p-4" : "p-8")}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="relative w-8 h-8 bg-kaosNeon flex items-center justify-center font-black text-black">
                  K
               </div>
               {!isCollapsed && (
                 <div className="flex flex-col">
                   <span className="text-sm font-black uppercase tracking-tighter text-white">KAOS CONTROL</span>
                   <span className="text-[8px] font-black text-kaosNeon uppercase tracking-widest">SISTEMA v2.5</span>
                 </div>
               )}
            </div>
            {!isCollapsed && !isMobile && (
              <button onClick={toggleCollapse} className="text-white/20 hover:text-white transition-colors">
                 <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Premium Profile Section */}
          <div className={cn(
            "flex items-center gap-4 bg-white/[0.02] p-4 border border-white/5 hover:border-white/[0.08] transition-all group cursor-pointer",
            isCollapsed && "justify-center p-2"
          )}>
            <div className="relative">
              <div className="w-10 h-10 bg-white/10 flex items-center justify-center font-black text-white text-xs border border-white/10 group-hover:border-neutral-500 transition-colors">
                 {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-kaosNeon border-2 border-[#0B0C0E] rounded-full"></div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-[11px] font-black text-white uppercase tracking-tight truncate">{user?.firstName} {user?.lastName}</span>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest truncate">ADMINISTRADOR</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-6">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="mb-8">
              {!isCollapsed && (
                <h3 className="px-8 mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
                  {group.title}
                </h3>
              )}
              <div className="space-y-0">
                {group.items.map(item => (
                  <NavItem key={item.title} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Action Footer */}
        <div className="p-4 border-t border-white/5 space-y-2">
           <button 
             onClick={handleLogout}
             className={cn(
               "w-full flex items-center transition-all duration-300",
               isCollapsed ? "justify-center py-4" : "px-4 py-3 gap-3",
               "text-neutral-400 hover:text-red-500 bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
             )}
           >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Cerrar Sesión</span>}
           </button>
           
           {!isCollapsed && (
             <Link href="/" className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:text-white text-neutral-400 transition-all group">
                <div className="flex items-center gap-3 text-white/40 group-hover:text-white">
                   <ExternalLink className="h-3 w-3" />
                   <span className="text-[9px] font-black uppercase tracking-widest">Ver Tienda</span>
                 </div>
                <div className="w-1 h-1 bg-kaosNeon rounded-full animate-pulse"></div>
             </Link>
           )}
        </div>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 1px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
        `}</style>
      </aside>
      
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}