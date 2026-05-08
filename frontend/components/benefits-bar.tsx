import { Sun, Wind, Droplets, Leaf } from "lucide-react"

export default function BenefitsBar() {
  const benefits = [
    { 
      icon: Sun, 
      title: "PROTECCIÓN UV", 
      desc: "Cuida tu piel en cada aventura.",
      bg: "bg-white",
      textColor: "text-black",
      iconColor: "text-black"
    },
    { 
      icon: Wind, 
      title: "TECNOLOGÍA DRY-FIT", 
      desc: "Te mantiene seco, siempre.",
      bg: "bg-white",
      textColor: "text-black",
      iconColor: "text-black"
    },
    { 
      icon: Droplets, 
      title: "IMPERMEABLES", 
      desc: "Bolsos waterproof que flotan.",
      bg: "bg-white",
      textColor: "text-black",
      iconColor: "text-black"
    },
    { 
      icon: Leaf, 
      title: "DISEÑADO EN VENEZUELA", 
      desc: "Hecho para nuestro clima y nuestra gente.",
      bg: "bg-white",
      textColor: "text-black",
      iconColor: "text-black"
    },
  ]

  return (
    <section className="py-16 bg-white border-y border-gray-100" data-purpose="benefits-summary">
      <div className="max-w-[1440px] mx-auto px-4 md:px-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, idx) => (
            <div 
              key={idx} 
              className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4 group"
            >
              <div className="flex-shrink-0">
                <benefit.icon className="w-10 h-10 text-black stroke-[1.5px]" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider mb-1">{benefit.title}</h4>
                <p className="text-xs text-gray-500 font-medium leading-tight max-w-[180px]">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
