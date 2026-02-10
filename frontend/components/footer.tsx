"use client"

import Image from "next/image"
import { Instagram, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { brandConfig } from "@/lib/config"

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Main */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl">
          {/* Brand + Instagram (Izquierda) */}
          <div className="space-y-6 mb-12">
            <div className="relative w-[180px] h-[56px]">
              <Image
                src="/logo/3yj.png"
                alt={brandConfig.name}
                fill
                priority
                className="object-contain"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-gray-900 p-2 rounded-xl"
                onClick={() => window.open(brandConfig.social.instagram, "_blank")}
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </Button>

              <a
                href={brandConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Síguenos en Instagram
              </a>
            </div>
          </div>

          {/* CONTACTO (Izquierda, max-width para que no se estire mucho) */}
          <div className="space-y-4 max-w-2xl">
            <h4 className="text-sm font-black uppercase tracking-wider text-white">
              CONTACTO
            </h4>

            <div className="rounded-3xl border border-gray-700 bg-gradient-to-br from-gray-950/70 to-gray-900/40 p-6 shadow-2xl">
              <div className="space-y-3">
                <p className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-300" />
                  <span className="text-gray-300">Email:</span>
                  <span className="text-gray-400">{brandConfig.contact.email}</span>
                </p>

                <p className="text-sm flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-300" />
                  <span className="text-gray-300">Tel:</span>
                  <span className="text-gray-400">{brandConfig.contact.phone}</span>
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  className="w-full bg-white text-black hover:bg-gray-200 rounded-2xl h-12 font-bold uppercase tracking-wide shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02]"
                  onClick={() => window.open(`mailto:${brandConfig.contact.email}`, "_self")}
                >
                  Escríbenos
                </Button>

                <Button
                  variant="outline"
                  className="w-full bg-white text-black hover:bg-gray-200 rounded-2xl h-12 font-bold uppercase tracking-wide shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02]"
                  onClick={() => window.open(brandConfig.social.instagram, "_blank")}
                >
                  Instagram
                </Button>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed mt-4">
                Horario de atención: Lun–Vie (9:00am – 6:00pm). Respondemos lo antes posible.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar (TODO A LA IZQUIERDA) */}
        <div className="border-t border-gray-800 pt-8 mt-12">
          <div className="flex flex-col gap-4">
            <div className="text-gray-400 text-sm font-medium">
              © 2025 {brandConfig.name}. Todos los derechos reservados.
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Hecho con</span>
              <span className="text-2xl animate-pulse">💜</span>
              <span className="text-gray-500">por</span>
              <a 
                href="https://untitledtechcompany.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors font-semibold"
              >
                Untitled Tech Company
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}