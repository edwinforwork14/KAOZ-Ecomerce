"use client"
//components/instagram-feed.tsx
import { Instagram } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function InstagramFeed() {
  return (
    <section className="py-16 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Instagram className="h-8 w-8 mr-3 text-orange-500" />
            <h2 className="text-3xl md:text-4xl font-bold">#YFLIFESTYLE</h2>
          </div>
          <p className="text-lg text-gray-300">Únete a nuestra comunidad y comparte tu estilo YF</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/placeholder.svg?height=300&width=300"
              alt="YF Lifestyle"
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300 cursor-pointer"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/placeholder.svg?height=300&width=300"
              alt="YF Lifestyle"
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300 cursor-pointer"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/placeholder.svg?height=300&width=300"
              alt="YF Lifestyle"
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300 cursor-pointer"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/placeholder.svg?height=300&width=300"
              alt="YF Lifestyle"
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300 cursor-pointer"
            />
          </div>
        </div>

        <div className="text-center">
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105">
            <Instagram className="h-5 w-5 mr-2" />
            Síguenos en Instagram
          </Button>
        </div>
      </div>
    </section>
  )
}
