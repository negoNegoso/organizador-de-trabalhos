import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { gerarFolha } from './fixtures/gerarFolha';

export const VIDEO_FALSO = 'tests/e2e/fixtures/folha.y4m';

export default async function globalSetup() {
  config({ path: '.env.local' });
  const { garantirUsuario } = await import('../compartilhado/supabase');
  await garantirUsuario();
  if (!existsSync(VIDEO_FALSO)) gerarFolha(VIDEO_FALSO);
}
