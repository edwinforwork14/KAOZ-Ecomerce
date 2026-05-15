const { updateFromAPI, getCurrentRate } = require("../src/services/exchangeRateService");

const verifySync = async () => {
    try {
        console.log("🔄 Iniciando sincronización de tasas...");
        const result = await updateFromAPI();
        
        if (result.success) {
            console.log("✅ Sincronización exitosa!");
            console.log("Tasas actuales:", result.current);
            
            const current = await getCurrentRate();
            console.log("Tasa en DB:", current);
        } else {
            console.error("❌ Fallo en la sincronización:", result.message);
        }
    } catch (error) {
        console.error("❌ Error durante la verificación:", error.message);
    }
};

verifySync();
