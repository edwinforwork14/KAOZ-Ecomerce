import { Sun, Wind, Droplets, Leaf, Truck, ShieldCheck, Zap, Globe } from "lucide-react"

export default function BenefitsBar() {
  const benefits = [
    { 
      icon: Truck, 
      title: "ENVÍOS NACIONALES", 
      desc: "Llegamos a cada rincón de Venezuela en 48h.",
      bg: "bg-black",
      textColor: "text-white",
      iconColor: "text-kaosNeon"
    },
    { 
      icon: ShieldCheck, 
      title: "CALIDAD PRO", 
      desc: "Testeado por atletas de alto rendimiento.",
      bg: "bg-gray-100",
      textColor: "text-black",
      iconColor: "text-black"
    },
    { 
      icon: Zap, 
      title: "PAGO RÁPIDO", 
      desc: "Múltiples métodos de pago integrados.",
      bg: "bg-kaosNeon",
      textColor: "text-black",
      iconColor: "text-black"
    },
    { 
      icon: Globe, 
      title: "CULTURA URBANA", 
      desc: "Inspirado en el asfalto y el sol caribeño.",
      bg: "bg-gray-50",
      textColor: "text-black",
      iconColor: "text-gray-400"
    },
  ]

  return (
    <section className="py-20 bg-white" data-purpose="benefits-summary">
      <div className="max-w-full mx-auto px-4 md:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, idx) => (
            <div 
              key={idx} 
              className={`${benefit.bg} ${benefit.textColor} p-8 rounded-[32px] min-h-[220px] flex flex-col justify-between group cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-sm hover:shadow-xl`}
            >
              <benefit.icon className={`w-10 h-10 ${benefit.iconColor}`} strokeWidth={1.5} />
              <div>
                <h4 className="text-xl font-black uppercase mb-1 tracking-tighter">{benefit.title}</h4>
                <p className="text-sm opacity-70 font-medium leading-tight">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
