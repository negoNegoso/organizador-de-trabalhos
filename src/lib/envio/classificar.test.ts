import { expect, it } from 'vitest';
import { classificarArquivos } from './classificar';

const arquivo = (nome: string, tipo: string) => new File([new Uint8Array([1])], nome, { type: tipo });

it('um PDF', () => {
  const pdf = arquivo('a.pdf', 'application/pdf');
  expect(classificarArquivos([pdf])).toEqual({ tipo: 'pdf', arquivo: pdf });
});

it('várias imagens, inclusive HEIC sem tipo', () => {
  const lista = [arquivo('1.jpg', 'image/jpeg'), arquivo('2.HEIC', '')];
  expect(classificarArquivos(lista)).toEqual({ tipo: 'imagens', arquivos: lista });
});

it('mensagens claras para combinações inválidas', () => {
  expect(() => classificarArquivos([])).toThrow('Escolha um arquivo.');
  expect(() => classificarArquivos([arquivo('a.pdf', 'application/pdf'), arquivo('b.jpg', 'image/jpeg')])).toThrow(
    'Envie 1 PDF por vez, ou só imagens.',
  );
  expect(() => classificarArquivos([arquivo('a.docx', 'application/msword')])).toThrow(
    'Tipo de arquivo não suportado. Use PDF ou imagens.',
  );
});
