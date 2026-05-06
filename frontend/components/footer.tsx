"use client"

import { brandConfig } from "@/lib/config"
import Link from "next/link"

export default function Footer() {
  const currentYear = new Date().getFullYear()

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
    <footer className="bg-surface-container-lowest border-t border-outline-variant/30 text-on-surface">
      {/* Top Technical Bar */}
      <div className="border-b border-outline-variant/30 py-4 px-gutter md:px-margin bg-surface-container flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-tertiary animate-pulse"></div>
          <span className="font-mono-data text-[10px] text-on-surface-variant uppercase tracking-widest">
            System_Status: <span className="text-tertiary">Nominal</span> // Uptime: 99.98%
          </span>
        </div>
        <div className="font-mono-data text-[10px] text-on-surface-variant uppercase tracking-widest hidden sm:block">
          Protocol: HTTPS_V2 // Port: 443 // Session_Active
        </div>
      </div>

      <div className="container mx-auto px-gutter md:px-margin py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-24">
          {/* Brand Identity */}
          <div className="space-y-8">
            <h3 className="font-display text-h2 text-on-background uppercase tracking-tight leading-none">
              {brandConfig.name.toUpperCase()}
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-widest leading-relaxed max-w-xs opacity-70">
              {brandConfig.tagline}. {brandConfig.description}
            </p>
            <div className="flex items-center gap-6">
              <Link href={getSocialHref('instagram')} target="_blank" className="text-on-surface-variant hover:text-tertiary transition-colors">
                <span className="material-symbols-outlined text-xl">camera_alt</span>
              </Link>
              <Link href={getSocialHref('facebook')} target="_blank" className="text-on-surface-variant hover:text-tertiary transition-colors">
                <span className="material-symbols-outlined text-xl">facebook</span>
              </Link>
              <Link href={getSocialHref('twitter')} target="_blank" className="text-on-surface-variant hover:text-tertiary transition-colors">
                <span className="material-symbols-outlined text-xl">alternate_email</span>
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-8">
            <h4 className="font-mono-data text-label-caps text-on-background uppercase">Navigation_Tree</h4>
            <ul className="space-y-4 font-body-sm text-xs text-on-surface-variant uppercase tracking-widest">
              <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-tertiary transition-colors">Return_Home</button></li>
              <li><Link href="/" className="hover:text-tertiary transition-colors">Asset_Grid</Link></li>
              <li><Link href="/" className="hover:text-tertiary transition-colors">Protocol_About</Link></li>
              <li><Link href="/" className="hover:text-tertiary transition-colors">Contact_Endpoint</Link></li>
            </ul>
          </div>

          {/* Customer Support */}
          <div className="space-y-8">
            <h4 className="font-mono-data text-label-caps text-on-background uppercase">Support_Protocol</h4>
            <ul className="space-y-4 font-body-sm text-xs text-on-surface-variant uppercase tracking-widest">
              <li><Link href="/" className="hover:text-tertiary transition-colors">Logistics_Policy</Link></li>
              <li><Link href="/" className="hover:text-tertiary transition-colors">Asset_Returns</Link></li>
              <li><Link href="/" className="hover:text-tertiary transition-colors">Privacy_Layer</Link></li>
              <li><Link href="/" className="hover:text-tertiary transition-colors">Terms_of_Service</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <h4 className="font-mono-data text-label-caps text-on-background uppercase">Hardware_Node</h4>
            <ul className="space-y-6 font-body-sm text-xs text-on-surface-variant uppercase tracking-widest">
              <li className="flex items-start gap-4">
                <span className="material-symbols-outlined text-tertiary text-lg">location_on</span>
                <span className="leading-relaxed opacity-70">{brandConfig.contact.address}</span>
              </li>
              <li className="flex items-center gap-4">
                <span className="material-symbols-outlined text-tertiary text-lg">call</span>
                <span className="opacity-70">{brandConfig.contact.phone}</span>
              </li>
              <li className="flex items-center gap-4">
                <span className="material-symbols-outlined text-tertiary text-lg">mail</span>
                <span className="truncate opacity-70">{brandConfig.contact.email}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-24 pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="font-mono-data text-[10px] text-on-surface-variant uppercase tracking-widest opacity-50">
            © {currentYear} {brandConfig.name}. KAOS_URBAN_ATHLETICS // VALENCIA_NODE_01
          </p>
          <div className="flex items-center gap-3 font-mono-data text-[10px] text-on-surface-variant uppercase tracking-widest">
            <span className="opacity-50">System_Engineered_by:</span>
            <Link 
              href="https://untitledtechcompany.io/" 
              target="_blank"
              className="font-bold text-on-background hover:text-tertiary transition-colors"
            >
              Untitled_Tech_Co.
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
