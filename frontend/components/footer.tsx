import { brandConfig } from "@/lib/config"
import { Instagram, Facebook, Twitter, MessageCircle } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    { name: 'Instagram', icon: <Instagram className="w-5 h-5" />, href: `https://instagram.com/${brandConfig.social.instagram}` },
    { name: 'TikTok', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 448 512"><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"></path></svg>, href: '#' },
    { name: 'Facebook', icon: <Facebook className="w-5 h-5" />, href: `https://facebook.com/${brandConfig.social.facebook}` },
    { name: 'WhatsApp', icon: <MessageCircle className="w-5 h-5" />, href: `https://wa.me/${brandConfig.contact.whatsapp}` },
  ]

  return (
    <footer className="bg-kaosBlack text-white pt-20 pb-10" data-purpose="site-footer">
      <div className="max-w-[1440px] mx-auto px-4 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-20">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <img 
              alt="KAOS Logo White" 
              className="h-10 mb-8 filter invert brightness-200" 
              src="https://lh3.googleusercontent.com/aida/ADBb0uj46qIOice25s0wgyOd-LWnDeeM714ClVTSkgFmiKINOqICN7ryrVzJXi2KnKtRTHVlW5O0MkHLfZhKcKbseqUF-wGctwnzRG9UdCxQ1zsGgHlTpyhKmVSpUm59_pY0tI0hB3fV03rfoM8-dI7r12Kfc4fDKJAMJTbh6sRJXS-GojAuprxcm2ab8PL3d0xbnenw4N5lZONHF3_7vha7rinJjOF0N5POrpaHCf5EOiY_jvlK3dkpRJZBIAWybkiOBl045I3DXqosiGg" 
              style={{ objectPosition: "15% 91.5%" }}
            />
            <p className="text-xs text-gray-400 leading-relaxed mb-8 max-w-sm">
              {brandConfig.description}
            </p>
            <div className="flex gap-6">
              {socialLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-kaosNeon transition-colors"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-1">
            <h4 className="font-bold text-sm uppercase mb-6">Comprar</h4>
            <ul className="text-xs text-gray-400 space-y-4">
              <li><button className="hover:text-white transition-colors">Hombre</button></li>
              <li><button className="hover:text-white transition-colors">Mujer</button></li>
              <li><button className="hover:text-white transition-colors">Kids</button></li>
              <li><button className="hover:text-white transition-colors">Accesorios</button></li>
              <li><button className="hover:text-white transition-colors">Nuevos Drops</button></li>
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-bold text-sm uppercase mb-6">KAOS</h4>
            <ul className="text-xs text-gray-400 space-y-4">
              <li><button className="hover:text-white transition-colors">Nosotros</button></li>
              <li><button className="hover:text-white transition-colors">Blog</button></li>
              <li><button className="hover:text-white transition-colors">Atletas</button></li>
              <li><button className="hover:text-white transition-colors">Eventos</button></li>
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-bold text-sm uppercase mb-6">Ayuda</h4>
            <ul className="text-xs text-gray-400 space-y-4">
              <li><button className="hover:text-white transition-colors">Contacto</button></li>
              <li><button className="hover:text-white transition-colors">Envíos</button></li>
              <li><button className="hover:text-white transition-colors">Devoluciones</button></li>
              <li><button className="hover:text-white transition-colors">Preguntas Frecuentes</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            © {currentYear} {brandConfig.name}. DISEÑADO EN VENEZUELA.
          </p>
          <div className="flex gap-8 text-[10px] text-gray-500 uppercase tracking-widest">
            <button className="hover:text-white transition-colors">Términos y Condiciones</button>
            <button className="hover:text-white transition-colors">Privacidad</button>
          </div>
        </div>
      </div>
    </footer>
  )
}
