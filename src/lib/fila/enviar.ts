import type { SupabaseClient } from '@supabase/supabase-js';
import { BUCKET, caminhoMiniatura, caminhoPdf } from '../dados/storage';
import type { ItemFila } from './fila';
import type { Enviar } from './processar';

/**
 * Idempotente: usa o id do item como id do arquivo, faz upsert no Storage
 * e trata "linha já existe" (23505) como sucesso.
 */
export function criarEnviar(sb: SupabaseClient): Enviar {
  return async (item: ItemFila) => {
    const bucket = sb.storage.from(BUCKET);
    const caminho = caminhoPdf(item.alunoId, item.id);
    const caminhos = [caminho];

    const pdf = await bucket.upload(caminho, item.pdf, { contentType: 'application/pdf', upsert: true });
    if (pdf.error) throw new Error(pdf.error.message);

    if (item.miniatura) {
      const thumb = caminhoMiniatura(caminho);
      const r = await bucket.upload(thumb, item.miniatura, { contentType: 'image/jpeg', upsert: true });
      if (r.error) throw new Error(r.error.message);
      caminhos.push(thumb);
    }

    const { error } = await sb.from('arquivos').insert({
      id: item.id,
      aluno_id: item.alunoId,
      atividade_id: item.atividadeId,
      titulo: item.titulo,
      storage_path: caminho,
      paginas: item.paginas,
      tamanho_bytes: item.pdf.byteLength + (item.miniatura?.byteLength ?? 0),
      tem_miniatura: !!item.miniatura,
    });
    if (!error || error.code === '23505') return;

    await bucket.remove(caminhos);
    throw new Error(error.code === '23503' ? 'O aluno ou a atividade foi apagado.' : error.message);
  };
}
