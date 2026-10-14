import { expect, it } from 'vitest';
import { caminhoMiniatura, caminhoPdf, caminhosDoArquivo } from './storage';

it('monta caminhos de PDF e miniatura', () => {
  expect(caminhoPdf('al', 'arq')).toBe('al/arq.pdf');
  expect(caminhoMiniatura('al/arq.pdf')).toBe('al/arq.thumb.jpg');
});

it('lista os objetos de um arquivo conforme a miniatura', () => {
  expect(caminhosDoArquivo({ storage_path: 'al/a.pdf', tem_miniatura: true })).toEqual(['al/a.pdf', 'al/a.thumb.jpg']);
  expect(caminhosDoArquivo({ storage_path: 'al/a.pdf', tem_miniatura: false })).toEqual(['al/a.pdf']);
});
