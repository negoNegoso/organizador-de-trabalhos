import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import { BUCKET, caminhoPdf } from '../../src/lib/dados/storage';
import type { Arquivo } from '../../src/lib/tipos';

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

export type Semente = {
  anoId: string;
  turmaId: string;
  atividadeId: string;
  alunos: { maria: string; joao: string };
};

async function inserir<T>(sb: SupabaseClient, tabela: string, valores: object): Promise<T> {
  const { data, error } = await sb.from(tabela).insert(valores).select('*').single();
  if (error) throw error;
  return data as T;
}

/** Ano 2026 → turma "3º A" → alunos "Maria Souza" e "João Pedro" + atividade "Prova 1". */
export async function semear(sb: SupabaseClient): Promise<Semente> {
  const ano = await inserir<{ id: string }>(sb, 'anos_letivos', { ano: 2026 });
  const turma = await inserir<{ id: string }>(sb, 'turmas', { ano_letivo_id: ano.id, nome: '3º A' });
  const maria = await inserir<{ id: string }>(sb, 'alunos', { turma_id: turma.id, nome: 'Maria Souza' });
  const joao = await inserir<{ id: string }>(sb, 'alunos', { turma_id: turma.id, nome: 'João Pedro' });
  const atividade = await inserir<{ id: string }>(sb, 'atividades', { turma_id: turma.id, nome: 'Prova 1' });
  return { anoId: ano.id, turmaId: turma.id, atividadeId: atividade.id, alunos: { maria: maria.id, joao: joao.id } };
}

export async function criarArquivo(
  sb: SupabaseClient,
  alunoId: string,
  atividadeId: string | null,
  titulo: string,
): Promise<Arquivo> {
  const id = crypto.randomUUID();
  const caminho = caminhoPdf(alunoId, id);
  const bytes = await pdfDeTeste();
  const up = await sb.storage.from(BUCKET).upload(caminho, bytes, { contentType: 'application/pdf' });
  if (up.error) throw up.error;
  return inserir<Arquivo>(sb, 'arquivos', {
    id, aluno_id: alunoId, atividade_id: atividadeId, titulo,
    storage_path: caminho, paginas: 1, tamanho_bytes: bytes.byteLength,
  });
}

export async function contarArquivosDe(alunoId: string): Promise<number> {
  const sb = await clienteLogado();
  const { count, error } = await sb.from('arquivos').select('id', { count: 'exact', head: true }).eq('aluno_id', alunoId);
  if (error) throw error;
  return count ?? 0;
}
