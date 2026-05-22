import { brandConfig } from "@/lib/config"
import { Instagram } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    { name: 'Instagram', icon: <Instagram className="w-5 h-5" />, href: `https://instagram.com/${brandConfig.social.instagram}` },
  ]

  return (
    <footer className="bg-kaosBlack text-white pt-12 pb-8 noise border-t border-white/5 font-sans" data-purpose="site-footer">
      <div className="max-w-[1440px] mx-auto px-4 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-5">
            <img 
              alt="KAOS - Urban Streetwear Brand - Moda Urbana y Ropa Deportiva" 
              className="h-12 object-contain filter invert brightness-200 logo-shadow" 
              src="/kaozlogo1.jpeg" 
            />
            <div className="flex gap-4">
              {socialLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-kaosNeon hover:text-black transition-all duration-500 hover:-translate-y-1"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-1">
            <h4 className="font-bold text-[11px] uppercase tracking-[0.2em] mb-4 text-white/50">Comprar</h4>
            <ul className="text-xs space-y-3">
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Tienda</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Hombre</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Mujer</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Accesorios</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest text-kaosNeon/80">Nuevos Drops</button></li>
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-bold text-[11px] uppercase tracking-[0.2em] mb-4 text-white/50">KAOS</h4>
            <ul className="text-xs space-y-3">
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Nosotros</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Blog</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Atletas</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Eventos</button></li>
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-bold text-[11px] uppercase tracking-[0.2em] mb-4 text-white/50">Ayuda</h4>
            <ul className="text-xs space-y-3">
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Contacto</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Envíos</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Devoluciones</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">FAQ</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/5 flex justify-center items-center w-full">
          <a 
            href="https://untitledtechcompany.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em] hover:text-kaosNeon transition-colors text-center"
          >
            Hecho con 💜 por Untitled Tech Company
          </a>
        </div>
      </div>
    </footer>
  )
}
