import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { Search, User, ShoppingBag } from "lucide-react"

interface HeaderProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
  onSearch?: (term: string) => void
  isProductDetail?: boolean
  onBackFromProduct?: () => void
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { setIsOpen, items } = useCart()
  const { user } = useAuth()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleNavClick = (key: string) => {
    if (setActiveTab) {
      setActiveTab(key)
    }
  }

  return (
    <>
      {/* Top Banner */}
      <div className="bg-kaosBlack text-white text-[10px] py-2 px-4 md:px-10 flex justify-between items-center uppercase tracking-widest z-[60] relative">
        <div>ENVÍOS A TODO VENEZUELA</div>
        <div className="flex gap-6">
          <button className="hover:underline text-[10px] uppercase">¿NECESITAS AYUDA?</button>
          <button className="flex items-center gap-1 hover:underline text-[10px] uppercase">
            <User className="w-3 h-3" />
            MI CUENTA
          </button>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <nav className="max-w-[1440px] mx-auto px-4 md:px-10 h-20 flex justify-between items-center">
          {/* Left Nav */}
          <div className="hidden lg:flex gap-6 text-xs font-bold uppercase tracking-wider w-1/3">
            {[
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
              className="h-10 object-contain" 
              src="https://lh3.googleusercontent.com/aida/ADBb0uj46qIOice25s0wgyOd-LWnDeeM714ClVTSkgFmiKINOqICN7ryrVzJXi2KnKtRTHVlW5O0MkHLfZhKcKbseqUF-wGctwnzRG9UdCxQ1zsGgHlTpyhKmVSpUm59_pY0tI0hB3fV03rfoM8-dI7r12Kfc4fDKJAMJTbh6sRJXS-GojAuprxcm2ab8PL3d0xbnenw4N5lZONHF3_7vha7rinJjOF0N5POrpaHCf5EOiY_jvlK3dkpRJZBIAWybkiOBl045I3DXqosiGg" 
              style={{ objectPosition: "50% 2.3%" }}
            />
          </div>

          {/* Right Nav */}
          <div className="flex items-center justify-end gap-6 w-1/3">
            <div className="hidden lg:flex gap-6 text-xs font-bold uppercase tracking-wider mr-4">
              <button onClick={() => handleNavClick("empresas")} className="hover:text-gray-600">Empresas</button>
              <button onClick={() => handleNavClick("sale")} className="hover:text-gray-600">Nuevos</button>
            </div>
            <div className="flex gap-4">
              <button><Search className="w-6 h-6" /></button>
              <button><User className="w-6 h-6" /></button>
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

      {/* Mobile Nav (Simplified for now, similar to template) */}
      <div className="lg:hidden flex overflow-x-auto gap-6 px-4 py-3 bg-white border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider no-scrollbar">
        {[
          { name: "Hombre", key: "men" },
          { name: "Mujer", key: "women" },
          { name: "Kids", key: "kids" },
          { name: "Accesorios", key: "accessories" },
          { name: "Empresas", key: "empresas" },
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

