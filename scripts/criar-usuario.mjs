import { createClient } from '@supabase/supabase-js';

const [email, senha] = process.argv.slice(2);
if (!email || !senha) {
  console.error('Uso: npm run usuario -- <email> <senha>');
  process.exit(1);
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Usuário ${email} criado.`);
