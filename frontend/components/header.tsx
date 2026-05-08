import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, User, ShoppingBag, LogOut, LayoutDashboard, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import AuthModal from "./auth-modal"

interface HeaderProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
  onSearch?: (term: string) => void
  isProductDetail?: boolean
  onBackFromProduct?: () => void
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { setIsOpen, items } = useCart()
  const { user, logout, isAdmin } = useAuth()
  const router = useRouter()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleNavClick = (key: string) => {
    if (setActiveTab) {
      setActiveTab(key)
    }
  }

  const handleUserAction = () => {
    if (user) {
      if (confirm("¿Deseas cerrar sesión?")) {
        logout()
      }
    } else {
      setIsAuthModalOpen(true)
    }
  }

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      
      {/* Top Banner */}
      <div className="bg-kaosBlack text-white text-[10px] py-2 px-4 md:px-10 flex justify-between items-center uppercase tracking-widest z-[60] relative">
        <div>ENVÍOS A TODO VENEZUELA</div>
        <div className="flex gap-6">
          {isAdmin && (
            <Link 
              href="/admin/dashboard" 
              className="flex items-center gap-1 hover:text-kaosNeon text-[10px] uppercase font-black transition-colors"
            >
              <LayoutDashboard className="w-3 h-3" />
              DASHBOARD
            </Link>
          )}
          <button className="hover:underline text-[10px] uppercase">¿NECESITAS AYUDA?</button>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 hover:text-kaosNeon text-[10px] uppercase font-black transition-colors">
                  <div className="w-2 h-2 rounded-full bg-kaosNeon animate-pulse"></div>
                  {user.user_metadata?.first_name || 'MI CUENTA'}
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 p-2 bg-white rounded-2xl shadow-2xl border-none ring-1 ring-black/5 z-[100]">
                <div className="px-4 py-3 mb-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Bienvenido</p>
                  <p className="text-xs font-bold text-black truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-gray-100" />
                {isAdmin && (
                  <DropdownMenuItem 
                    onClick={() => router.push('/admin/dashboard')}
                    className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-black" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Ir al Panel</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={logout}
                  className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1 hover:underline text-[10px] uppercase"
            >
              <User className="w-3 h-3" />
              MI CUENTA
            </button>
          )}
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <nav className="max-w-[1440px] mx-auto px-4 md:px-10 h-24 flex justify-between items-center">
          {/* Left Nav */}
          <div className="hidden lg:flex gap-8 text-[13px] font-black uppercase tracking-[0.1em] w-1/3">
            {[
              { name: "Tienda", key: "shop" },
              { name: "Hombre", key: "men" },
              { name: "Mujer", key: "women" },
              { name: "Kids", key: "kids" },
              { name: "Accesorios", key: "accessories" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`hover:text-gray-600 transition-colors ${
                  activeTab === item.key ? "text-kaosNeon" : "text-kaosBlack"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* Center Logo */}
          <div className="w-1/3 flex justify-center cursor-pointer" onClick={() => handleNavClick("home")}>
            <img 
              alt="KAOS Logo" 
              className="h-14 object-contain" 
              src="/kaozlogo1.jpeg" 
            />
          </div>

          {/* Right Nav */}
          <div className="flex items-center justify-end gap-6 w-1/3">
            <div className="hidden lg:flex gap-8 text-[13px] font-black uppercase tracking-[0.1em] mr-4">
              <button onClick={() => handleNavClick("empresas")} className="hover:text-gray-600">Empresas</button>
              <button onClick={() => handleNavClick("sale")} className="hover:text-gray-600">Nuevos</button>
            </div>
            <div className="flex gap-6">
              <button><Search className="w-6 h-6" /></button>
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-kaosNeon hover:scale-110 transition-transform">
                      <User className="w-6 h-6" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-4 p-2 bg-white rounded-2xl shadow-2xl border-none ring-1 ring-black/5 z-[100]">
                    {isAdmin && (
                      <DropdownMenuItem 
                        onClick={() => router.push('/admin/dashboard')}
                        className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-black" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ir al Panel</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={logout}
                      className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-500 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)}>
                  <User className="w-6 h-6" />
                </button>
              )}

              <button className="relative" onClick={() => setIsOpen(true)}>
                <ShoppingBag className="w-6 h-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Nav */}
      <div className="lg:hidden flex overflow-x-auto gap-6 px-4 py-4 bg-white border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider no-scrollbar">
        {[
          { name: "Hombre", key: "men" },
          { name: "Mujer", key: "women" },
          { name: "Kids", key: "kids" },
          { name: "Accesorios", key: "accessories" },
          { name: "Nuevos", key: "sale" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => handleNavClick(item.key)}
            className="whitespace-nowrap hover:text-gray-600"
          >
            {item.name}
          </button>
        ))}
      </div>
    </>
  )
}

