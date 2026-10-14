import type { SupabaseClient } from '@supabase/supabase-js';

export const BUCKET = 'trabalhos';

export const caminhoPdf = (alunoId: string, arquivoId: string) => `${alunoId}/${arquivoId}.pdf`;
export const caminhoMiniatura = (caminhoDoPdf: string) => caminhoDoPdf.replace(/\.pdf$/, '.thumb.jpg');

export function caminhosDoArquivo(a: { storage_path: string; tem_miniatura: boolean }): string[] {
  return a.tem_miniatura ? [a.storage_path, caminhoMiniatura(a.storage_path)] : [a.storage_path];
}

export async function removerObjetos(sb: SupabaseClient, caminhos: string[]): Promise<void> {
  for (let i = 0; i < caminhos.length; i += 100) {
    const { error } = await sb.storage.from(BUCKET).remove(caminhos.slice(i, i + 100));
    if (error) throw new Error(error.message);
  }
}
