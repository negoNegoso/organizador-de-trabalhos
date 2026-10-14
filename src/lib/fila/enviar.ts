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

    const limparEFalhar = async (mensagem: string): Promise<never> => {
      await bucket.remove(caminhos);
      throw new Error(mensagem);
    };

    const pdf = await bucket.upload(caminho, item.pdf, { contentType: 'application/pdf', upsert: true });
    if (pdf.error) return limparEFalhar(pdf.error.message);

    if (item.miniatura) {
      const thumb = caminhoMiniatura(caminho);
      caminhos.push(thumb);
      const r = await bucket.upload(thumb, item.miniatura, { contentType: 'image/jpeg', upsert: true });
      if (r.error) return limparEFalhar(r.error.message);
    }

    const gravar = (atividadeId: string | null) =>
      sb.from('arquivos').insert({
        id: item.id,
        aluno_id: item.alunoId,
        atividade_id: atividadeId,
        titulo: item.titulo,
        storage_path: caminho,
        paginas: item.paginas,
        tamanho_bytes: item.pdf.byteLength + (item.miniatura?.byteLength ?? 0),
        tem_miniatura: !!item.miniatura,
      });

    let { error } = await gravar(item.atividadeId);
    // A atividade foi apagada: o trabalho vai para "Outros".
    if (error?.code === '23503' && item.atividadeId) ({ error } = await gravar(null));
    if (!error || error.code === '23505') return;

    // Só rejeição definitiva do banco apaga os objetos; erro de rede é curado pelo retry (upsert).
    if (error.code === '23503') return limparEFalhar('O aluno foi apagado.');
    if (rejeicaoDefinitiva(error.code)) return limparEFalhar(error.message);
    throw new Error(error.message);
  };
}

/** Erros do Postgres de dados inválidos (22xxx) ou de integridade (23xxx). */
function rejeicaoDefinitiva(code: string | undefined): boolean {
  return !!code && /^(22|23)[0-9A-Z]{3}$/.test(code);
}
