import { Lock } from "lucide-react"

export default function NewsletterSection() {
  return (
    <section className="max-w-[1440px] mx-auto px-4 md:px-10 py-20" data-purpose="newsletter-signup">
      <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[400px] border border-gray-100">
        {/* Family Photo Side */}
        <div className="md:w-1/2 relative">
          <img 
            alt="KAOS Placeholder" 
            className="w-full h-full object-cover" 
            src="/placeholder.svg" 
          />
          <div className="absolute inset-0 border-[16px] border-kaosNeon rounded-[40px] pointer-events-none opacity-20"></div>
        </div>
        
        {/* Form Side */}
        <div className="md:w-1/2 p-12 md:p-20 flex flex-col justify-center">
          <h2 className="text-5xl font-black uppercase mb-6">Únete al kaos</h2>
          <p className="text-sm text-gray-600 mb-10 max-w-sm">
            Recibe lanzamientos exclusivos, beneficios y contenido que te inspira a vivir sin límites.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 mb-6" onSubmit={(e) => e.preventDefault()}>
            <input 
              className="flex-grow border-gray-200 focus:ring-kaosBlack focus:border-kaosBlack rounded-md px-6 py-4" 
              placeholder="Tu email" 
              type="email" 
            />
            <button 
              className="bg-kaosNeon text-black font-bold uppercase tracking-widest px-8 py-4 whitespace-nowrap hover:bg-black hover:text-white transition-colors rounded-md text-xs" 
              type="submit"
            >
              Quiero estar en el kaos
            </button>
          </form>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <Lock className="w-3 h-3" />
            Sin spam. Solo lo bueno.
          </div>
          {/* KAOS watermark */}
          <div className="mt-8 opacity-10">
            <img 
              alt="KAOS Watermark" 
              className="h-20 object-contain ml-auto" 
              src="/placeholder.svg" 
            />
          </div>
        </div>
      </div>
    </section>
  )
}
