import { config } from 'dotenv';

export default async function globalSetup() {
  config({ path: '.env.local' });
  const { garantirUsuario } = await import('../compartilhado/supabase');
  await garantirUsuario();
}
