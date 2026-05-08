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
    <footer className="bg-kaosBlack text-white pt-24 pb-12 noise border-t border-white/5 font-sans" data-purpose="site-footer">
      <div className="max-w-[1440px] mx-auto px-4 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-16 mb-24">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-10">
            <img 
              alt="KAOS Logo White" 
              className="h-14 object-contain filter invert brightness-200 logo-shadow" 
              src="/kaozlogo1.jpeg" 
            />
            <p className="text-[13px] text-gray-400 leading-relaxed max-w-sm font-medium">
              Somos una marca de ropa deportiva y casual que va contigo a todas partes. No hay nada a lo que no nos adaptemos, por eso te invitamos a ser parte de nuestros KAOS
            </p>
            <div className="flex gap-4">
              {socialLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-kaosNeon hover:text-black transition-all duration-500 hover:-translate-y-1"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-1">
            <h4 className="font-bold text-[11px] uppercase tracking-[0.2em] mb-8 text-white/50">Comprar</h4>
            <ul className="text-xs space-y-5">
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Tienda</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Hombre</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Mujer</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Accesorios</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest text-kaosNeon/80">Nuevos Drops</button></li>
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-bold text-[11px] uppercase tracking-[0.2em] mb-8 text-white/50">KAOS</h4>
            <ul className="text-xs space-y-5">
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Nosotros</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Blog</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Atletas</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Eventos</button></li>
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-bold text-[11px] uppercase tracking-[0.2em] mb-8 text-white/50">Ayuda</h4>
            <ul className="text-xs space-y-5">
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Contacto</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Envíos</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">Devoluciones</button></li>
              <li><button className="hover:text-kaosNeon transition-colors font-bold uppercase tracking-widest">FAQ</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em]">
            © {currentYear} {brandConfig.name}. STRICTLY ENGINEERED IN VENEZUELA.
          </p>
          <div className="flex gap-10 text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em]">
            <button className="hover:text-white transition-colors">Términos</button>
            <button className="hover:text-white transition-colors">Privacidad</button>
          </div>
        </div>
      </div>
    </footer>
  )
}
