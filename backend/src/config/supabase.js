const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ [SUPABASE] ¡ATENCIÓN! Faltan credenciales críticas.");
} else {
  if (!supabaseUrl.includes(".supabase.co")) {
    console.error("❌ [SUPABASE] ERROR CRÍTICO: La URL configurada no parece ser de Supabase. Revisa las variables en Railway.");
    console.error(`👉 URL actual: "${supabaseUrl}"`);
  }
  console.log(`📡 [SUPABASE] Usando URL: "${supabaseUrl}"`);
  console.log(`🔑 [SUPABASE] Key detectada: ${supabaseKey.substring(0, 10)}...`);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  realtime: {
    transport: WebSocket,
  },
});

module.exports = { supabase };
