import { Sun, Wind, Droplets, Leaf } from "lucide-react"

export default function BenefitsBar() {
  const benefits = [
    { icon: Sun, title: "PROTECCIÓN UV", desc: "Cuida tu piel en cada aventura." },
    { icon: Wind, title: "TECNOLOGÍA DRY-FIT", desc: "Te mantiene seco, siempre." },
    { icon: Droplets, title: "IMPERMEABLES", desc: "Bolsos waterproof que flotan." },
    { icon: Leaf, title: "DISEÑADO EN VENEZUELA", desc: "Hecho para nuestro clima y nuestra gente." },
  ]

  return (
    <section className="bg-white border-y border-gray-100 py-14" data-purpose="benefits-summary">
      <div className="max-w-[1600px] mx-auto px-4 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-5">
              <div className="flex-shrink-0">
                <benefit.icon className="w-8 h-8 text-black" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-[13px] font-black uppercase tracking-tight mb-1">{benefit.title}</h4>
                <p className="text-[11px] text-gray-500 font-medium leading-tight">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
