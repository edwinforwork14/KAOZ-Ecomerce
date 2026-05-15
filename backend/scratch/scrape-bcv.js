const scrapeBCV = async () => {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        
        console.log("📡 Intentando obtener tasa directamente del BCV...");
        
        const response = await fetch("https://www.bcv.org.ve/", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        if (!response.ok) {
            console.error("❌ Error al acceder al BCV:", response.status);
            return;
        }

        const html = await response.text();
        
        // Buscar el contenedor del dólar
        // El BCV usa estructuras como <div id="dolar"> <strong> 36,50 </strong> </div>
        const dolarRegex = /<div id="dolar"[\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/i;
        const euroRegex = /<div id="euro"[\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/i;
        
        const dolarMatch = html.match(dolarRegex);
        const euroMatch = html.match(euroRegex);
        
        if (dolarMatch) {
            const usd = dolarMatch[1].replace(',', '.').trim();
            const eur = euroMatch ? euroMatch[1].replace(',', '.').trim() : usd;
            
            console.log("✅ Tasas encontradas:");
            console.log("USD:", usd);
            console.log("EUR:", eur);
        } else {
            console.log("❌ No se pudo encontrar la tasa en el HTML. Puede que la estructura haya cambiado.");
            // Imprimir una parte del HTML para depurar si es necesario
            // console.log(html.substring(0, 1000));
        }

    } catch (error) {
        console.error("❌ Error crítico:", error.message);
    }
};

scrapeBCV();
