import { ErroEnvio } from './erro';

export type Classificacao = { tipo: 'pdf'; arquivo: File } | { tipo: 'imagens'; arquivos: File[] };

const ehPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
const ehImagem = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);

export function classificarArquivos(arquivos: File[]): Classificacao {
  if (!arquivos.length) throw new ErroEnvio('Escolha um arquivo.');
  if (arquivos.some(ehPdf)) {
    if (arquivos.length > 1) throw new ErroEnvio('Envie 1 PDF por vez, ou só imagens.');
    return { tipo: 'pdf', arquivo: arquivos[0] };
  }
  if (arquivos.every(ehImagem)) return { tipo: 'imagens', arquivos };
  throw new ErroEnvio('Tipo de arquivo não suportado. Use PDF ou imagens.');
}
