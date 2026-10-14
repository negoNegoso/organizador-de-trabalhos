import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

export const EMAIL = process.env.TEST_EMAIL ?? 'professora@teste.local';
export const SENHA = process.env.TEST_PASSWORD ?? 'senha-de-teste-123';

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

export function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, opcoes);
}

export async function garantirUsuario(): Promise<void> {
  const { error } = await admin().auth.admin.createUser({ email: EMAIL, password: SENHA, email_confirm: true });
  if (error && error.code !== 'email_exists' && !/already/i.test(error.message)) throw error;
}

export async function clienteLogado(): Promise<SupabaseClient> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, opcoes);
  const { error } = await sb.auth.signInWithPassword({ email: EMAIL, password: SENHA });
  if (error) throw error;
  return sb;
}

export async function limparTudo(): Promise<void> {
  const a = admin();
  const vazio = await a.storage.emptyBucket('trabalhos');
  if (vazio.error) throw vazio.error;
  const { error } = await a.from('anos_letivos').delete().not('id', 'is', null);
  if (error) throw error;
}

export async function pdfDeTeste(paginas = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) doc.addPage([595.28, 841.89]).drawText(`Pagina ${i + 1}`, { x: 50, y: 750 });
  return doc.save();
}
