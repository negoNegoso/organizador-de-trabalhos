import { describe, expect, it } from 'vitest';
import { abaAtiva, acaoDoBotao, barraVisivel } from './navegacao';

describe('abaAtiva', () => {
  it.each([
    ['/', 'inicio'],
    ['/turmas', 'turmas'],
    ['/turmas/t1', 'turmas'],
    ['/anos/a1', 'turmas'],
    ['/alunos/al1', 'turmas'],
    ['/alunos/al1/enviar', 'turmas'],
    ['/buscar', 'buscar'],
    ['/mais', 'mais'],
    ['/lote', null],
    ['/compartilhar', null],
  ])('%s → %s', (rota, aba) => {
    expect(abaAtiva(rota)).toBe(aba);
  });
});

describe('barraVisivel', () => {
  it('some no scanner em tela cheia', () => {
    expect(barraVisivel('/alunos/al1/escanear')).toBe(false);
    expect(barraVisivel('/lote/at1')).toBe(false);
  });
  it('aparece nas demais', () => {
    for (const r of ['/', '/lote', '/turmas/t1', '/alunos/al1', '/alunos/al1/enviar', '/mais']) {
      expect(barraVisivel(r)).toBe(true);
    }
  });
});

describe('acaoDoBotao', () => {
  it('na pasta do aluno (ou no envio dele) abre a câmera dele', () => {
    expect(acaoDoBotao('/alunos/al1')).toEqual({ tipo: 'ir', href: '/alunos/al1/escanear' });
    expect(acaoDoBotao('/alunos/al1/enviar')).toEqual({ tipo: 'ir', href: '/alunos/al1/escanear' });
  });
  it('na turma abre o lote da turma', () => {
    expect(acaoDoBotao('/turmas/t1')).toEqual({ tipo: 'lote-turma', turmaId: 't1' });
  });
  it.each(['/', '/turmas', '/buscar', '/mais', '/anos/a1', '/lote', '/compartilhar'])('em %s abre o menu', (rota) => {
    expect(acaoDoBotao(rota)).toEqual({ tipo: 'menu' });
  });
});
