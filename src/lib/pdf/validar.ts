import { PDFDocument } from 'pdf-lib';
import { ErroEnvio } from '../envio/erro';

export const LIMITE_PDF = 20 * 1024 * 1024;

export async function validarPdf(bytes: Uint8Array): Promise<{ paginas: number }> {
  if (bytes.byteLength > LIMITE_PDF) throw new ErroEnvio('PDF maior que 20 MB.');
  let paginas = 0;
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    paginas = doc.getPageCount();
  } catch {
    paginas = 0;
  }
  if (paginas < 1) throw new ErroEnvio('Não consegui ler este PDF. Ele pode estar corrompido.');
  return { paginas };
}
