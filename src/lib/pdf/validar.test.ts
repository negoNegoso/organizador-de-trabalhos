import { PDFDocument } from 'pdf-lib';
import { expect, it } from 'vitest';
import { ErroEnvio } from '../envio/erro';
import { LIMITE_PDF, validarPdf } from './validar';

it('conta as páginas de um PDF válido', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.addPage();
  doc.addPage();
  expect(await validarPdf(await doc.save())).toEqual({ paginas: 3 });
});

it('recusa algo que não é PDF com mensagem clara', async () => {
  const lixo = new TextEncoder().encode('isto não é um pdf');
  await expect(validarPdf(lixo)).rejects.toThrow(ErroEnvio);
  await expect(validarPdf(lixo)).rejects.toThrow('Não consegui ler este PDF. Ele pode estar corrompido.');
});

it('recusa PDF truncado', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const bytes = await doc.save();
  await expect(validarPdf(bytes.slice(0, 40))).rejects.toThrow(ErroEnvio);
});

it('recusa acima de 20 MB sem tentar ler', async () => {
  await expect(validarPdf(new Uint8Array(LIMITE_PDF + 1))).rejects.toThrow('PDF maior que 20 MB.');
});
