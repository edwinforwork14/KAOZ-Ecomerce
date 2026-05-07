require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function registerAdmin() {
  const email = 'edwinforwork14@gmail.com';
  const password = '123456789';

  console.log(`🚀 Intentando registrar usuario en Supabase Auth: ${email}...`);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: 'Edwin',
          last_name: 'Admin',
          role: 'admin'
        }
      }
    });

    if (error) {
      console.error('❌ Error al registrar usuario:', error.message);
      return;
    }

    console.log('✅ Usuario registrado en Supabase Auth exitosamente.');
    console.log('   User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Status:', data.user.aud);
    
    if (data.session) {
      console.log('   Sesión creada (confirmación de email desactivada)');
    } else {
      console.log('   ⚠️ Confirmación de email requerida. Revisa tu bandeja de entrada o desactiva "Confirm Email" en Supabase Auth Settings.');
    }

  } catch (err) {
    console.error('💥 Error fatal:', err);
  }
}

registerAdmin();
