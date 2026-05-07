export default function LifestyleSection() {
  const items = [
    { name: "Acuarela", position: "36% 61%" },
    { name: "Quotes", position: "55% 61%" },
    { name: "Funky & Colorido", position: "74% 61%" },
    { name: "Con Flow", position: "92% 61%" },
  ]

  return (
    <section className="max-w-[1440px] mx-auto px-4 md:px-10 py-20" data-purpose="brand-lifestyle-section">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side Content */}
        <div className="lg:col-span-3">
          <h2 className="text-5xl font-bold leading-tight mb-4 tracking-tight">La vibra<br />Venezolana</h2>
          <p 
            className="text-kaosNeon text-3xl mb-6 tracking-wide"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            CON FLOW Y HUMOR
          </p>
          <p className="text-sm text-gray-600 mb-8 leading-relaxed font-medium">
            Estampados acuarela, frases que nos representan y colores que transmiten nuestra energía.
          </p>
          <button className="bg-black text-white px-10 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg">
            Ver La Vibra
          </button>
        </div>
        
        {/* Right Side Gallery */}
        <div className="lg:col-span-9">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((item, idx) => (
              <div key={idx} className="space-y-3">
                <div className="rounded-xl overflow-hidden aspect-[4/6]">
                  <img 
                    alt={item.name} 
                    className="w-full h-full object-cover" 
                    src="https://lh3.googleusercontent.com/aida/ADBb0uj46qIOice25s0wgyOd-LWnDeeM714ClVTSkgFmiKINOqICN7ryrVzJXi2KnKtRTHVlW5O0MkHLfZhKcKbseqUF-wGctwnzRG9UdCxQ1zsGgHlTpyhKmVSpUm59_pY0tI0hB3fV03rfoM8-dI7r12Kfc4fDKJAMJTbh6sRJXS-GojAuprxcm2ab8PL3d0xbnenw4N5lZONHF3_7vha7rinJjOF0N5POrpaHCf5EOiY_jvlK3dkpRJZBIAWybkiOBl045I3DXqosiGg" 
                    style={{ objectPosition: item.position }}
                  />
                </div>
                <p className="text-center text-[10px] font-bold text-gray-500 uppercase">{item.name}</p>
              </div>
            ))}
          </div>
          {/* Dots Nav */}
          <div className="flex justify-center gap-2 mt-8">
            <span className="w-2 h-2 rounded-full bg-kaosNeon"></span>
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} className="w-2 h-2 rounded-full bg-black/20"></span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
