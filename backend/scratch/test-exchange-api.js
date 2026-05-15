const testAPI = async () => {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        
        console.log("📡 Probando conexión con API dolarvzla...");
        
        const response = await fetch(
            "https://api.dolarvzla.com/public/exchange-rate",
            {
                method: "GET",
                headers: {
                    "x-dolarvzla-key": "39bedc1d3c0c0b60fea4fc556a9936952de5673c00dd24c3b97b96fea2b1c2c1",
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Status Code:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Error en la respuesta:", errorText);
            return;
        }

        const data = await response.json();
        console.log("✅ Datos recibidos:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("❌ Error crítico:", error.message);
    }
};

testAPI();
