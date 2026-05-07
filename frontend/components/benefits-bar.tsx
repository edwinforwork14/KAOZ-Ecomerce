export default function BenefitsBar() {
  const benefits = [
    {
      title: "Protección UV",
      description: "Cuida tu piel en cada aventura.",
      image: "https://lh3.googleusercontent.com/aida/ADBb0uj46qIOice25s0wgyOd-LWnDeeM714ClVTSkgFmiKINOqICN7ryrVzJXi2KnKtRTHVlW5O0MkHLfZhKcKbseqUF-wGctwnzRG9UdCxQ1zsGgHlTpyhKmVSpUm59_pY0tI0hB3fV03rfoM8-dI7r12Kfc4fDKJAMJTbh6sRJXS-GojAuprxcm2ab8PL3d0xbnenw4N5lZONHF3_7vha7rinJjOF0N5POrpaHCf5EOiY_jvlK3dkpRJZBIAWybkiOBl045I3DXqosiGg",
      position: "8% 48.5%"
    },
    {
      title: "Tecnología Dry-Fit",
      description: "Te mantiene seco, siempre.",
      image: "https://lh3.googleusercontent.com/aida/ADBb0uj46qIOice25s0wgyOd-LWnDeeM714ClVTSkgFmiKINOqICN7ryrVzJXi2KnKtRTHVlW5O0MkHLfZhKcKbseqUF-wGctwnzRG9UdCxQ1zsGgHlTpyhKmVSpUm59_pY0tI0hB3fV03rfoM8-dI7r12Kfc4fDKJAMJTbh6sRJXS-GojAuprxcm2ab8PL3d0xbnenw4N5lZONHF3_7vha7rinJjOF0N5POrpaHCf5EOiY_jvlK3dkpRJZBIAWybkiOBl045I3DXqosiGg",
      position: "33% 48.5%"
    },
    {
      title: "Impermeables",
      description: "Bolsos waterproof que flotan.",
      image: "https://lh3.googleusercontent.com/aida/ADBb0uj46qIOice25s0wgyOd-LWnDeeM714ClVTSkgFmiKINOqICN7ryrVzJXi2KnKtRTHVlW5O0MkHLfZhKcKbseqUF-wGctwnzRG9UdCxQ1zsGgHlTpyhKmVSpUm59_pY0tI0hB3fV03rfoM8-dI7r12Kfc4fDKJAMJTbh6sRJXS-GojAuprxcm2ab8PL3d0xbnenw4N5lZONHF3_7vha7rinJjOF0N5POrpaHCf5EOiY_jvlK3dkpRJZBIAWybkiOBl045I3DXqosiGg",
      position: "58% 48.5%"
    },
    {
      title: "Diseñado en Venezuela",
      description: "Hecho para nuestro clima y nuestra gente.",
      image: "https://lh3.googleusercontent.com/aida/ADBb0uj46qIOice25s0wgyOd-LWnDeeM714ClVTSkgFmiKINOqICN7ryrVzJXi2KnKtRTHVlW5O0MkHLfZhKcKbseqUF-wGctwnzRG9UdCxQ1zsGgHlTpyhKmVSpUm59_pY0tI0hB3fV03rfoM8-dI7r12Kfc4fDKJAMJTbh6sRJXS-GojAuprxcm2ab8PL3d0xbnenw4N5lZONHF3_7vha7rinJjOF0N5POrpaHCf5EOiY_jvlK3dkpRJZBIAWybkiOBl045I3DXqosiGg",
      position: "83% 48.5%",
      border: true
    }
  ]

  return (
    <section className="max-w-[1440px] mx-auto px-4 md:px-10 py-10 border-y border-gray-200" data-purpose="benefits-summary">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {benefits.map((benefit, idx) => (
          <div key={idx} className={`flex items-center gap-4 ${benefit.border ? 'border-l-0 md:border-l border-gray-200 md:pl-8' : ''}`}>
            <div className="w-12 h-12 flex-shrink-0">
              <img 
                alt={benefit.title} 
                className="w-full h-full object-contain" 
                src={benefit.image} 
                style={{ objectPosition: benefit.position }}
              />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase">{benefit.title}</h4>
              <p className="text-[9px] text-gray-500 leading-tight">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
