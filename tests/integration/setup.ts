import { config } from 'dotenv';
import { beforeAll } from 'vitest';

config({ path: '.env.local' });

beforeAll(async () => {
  const { garantirUsuario } = await import('../compartilhado/supabase');
  await garantirUsuario();
});
