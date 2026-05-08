import { brandConfig } from "@/lib/config"
import { Instagram } from "lucide-react"

export default function InstagramFeed() {
  const images = [
    { pos: "29% 73%" },
    { pos: "39% 73%" },
    { pos: "50% 73%" },
    { pos: "61% 73%" },
    { pos: "72% 73%" },
    { pos: "83% 73%" },
    { pos: "94% 73%" },
  ]

  return (
    <section className="max-w-[1440px] mx-auto px-4 md:px-10 py-10" data-purpose="instagram-feed">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 flex items-center justify-center border-2 border-black rounded-xl">
          <Instagram className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-black text-sm lowercase tracking-tight">@kaos.vzla</h3>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Síguenos en Instagram</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {images.map((img, idx) => (
          <div key={idx} className="aspect-square overflow-hidden bg-gray-100 rounded-lg">
            <img 
              alt={`IG ${idx + 1}`} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
              src="https://lh3.googleusercontent.com/aida/ADBb0uj46qIOice25s0wgyOd-LWnDeeM714ClVTSkgFmiKINOqICN7ryrVzJXi2KnKtRTHVlW5O0MkHLfZhKcKbseqUF-wGctwnzRG9UdCxQ1zsGgHlTpyhKmVSpUm59_pY0tI0hB3fV03rfoM8-dI7r12Kfc4fDKJAMJTbh6sRJXS-GojAuprxcm2ab8PL3d0xbnenw4N5lZONHF3_7vha7rinJjOF0N5POrpaHCf5EOiY_jvlK3dkpRJZBIAWybkiOBl045I3DXqosiGg" 
              style={{ objectPosition: img.pos }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

