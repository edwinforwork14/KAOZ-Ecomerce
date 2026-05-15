const testDolarAPI = async () => {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        
        console.log("📡 Probando conexión con ve.dolarapi.com...");
        
        const response = await fetch("https://ve.dolarapi.com/v1/dolares");

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

testDolarAPI();
