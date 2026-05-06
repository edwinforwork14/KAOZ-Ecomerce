"use client"

import { brandConfig } from "@/lib/config"
import { Instagram, Facebook, Twitter, Youtube, Mail, Phone, MapPin, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  // Helper para asegurar que el href sea válido
  const getSocialHref = (key: keyof typeof brandConfig.social) => {
    const username = brandConfig.social[key]
    if (!username) return "#"
    
    switch (key) {
      case 'instagram': return `https://instagram.com/${username}`
      case 'facebook': return `https://facebook.com/${username}`
      case 'twitter': return `https://twitter.com/${username}`
      default: return "#"
    }
  }

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Identity */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold tracking-tighter">{brandConfig.name.toUpperCase()}</h3>
            <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
              {brandConfig.tagline}. {brandConfig.description}
            </p>
            <div className="flex items-center gap-4">
              <Link href={getSocialHref('instagram')} target="_blank" className="hover:text-accent transition-colors"><Instagram className="w-5 h-5" /></Link>
              <Link href={getSocialHref('facebook')} target="_blank" className="hover:text-accent transition-colors"><Facebook className="w-5 h-5" /></Link>
              <Link href={getSocialHref('twitter')} target="_blank" className="hover:text-accent transition-colors"><Twitter className="w-5 h-5" /></Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-widest">Navegación</h4>
            <ul className="space-y-4 text-sm text-primary-foreground/70">
              <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-accent transition-colors">Inicio</button></li>
              <li><Link href="/" className="hover:text-accent transition-colors">Catálogo</Link></li>
              <li><Link href="/" className="hover:text-accent transition-colors">Sobre Nosotros</Link></li>
              <li><Link href="/" className="hover:text-accent transition-colors">Contacto</Link></li>
            </ul>
          </div>

          {/* Customer Support */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-widest">Soporte</h4>
            <ul className="space-y-4 text-sm text-primary-foreground/70">
              <li><Link href="/" className="hover:text-accent transition-colors">Envíos y Entregas</Link></li>
              <li><Link href="/" className="hover:text-accent transition-colors">Devoluciones</Link></li>
              <li><Link href="/" className="hover:text-accent transition-colors">Privacidad</Link></li>
              <li><Link href="/" className="hover:text-accent transition-colors">Términos</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-widest">Contacto</h4>
            <ul className="space-y-4 text-sm text-primary-foreground/70">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent shrink-0" />
                <span>{brandConfig.contact.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-accent shrink-0" />
                <span>{brandConfig.contact.phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-accent shrink-0" />
                <span className="truncate">{brandConfig.contact.email}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-primary-foreground/50">
            © {currentYear} {brandConfig.name}. Valencia, España.
          </p>
          <div className="flex items-center gap-2 text-xs text-primary-foreground/50">
            <span>Powered by</span>
            <Link 
              href="https://untitledtechcompany.io/" 
              target="_blank"
              className="font-bold text-primary-foreground/80 hover:text-accent flex items-center gap-1"
            >
              Untitled Tech Company <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}