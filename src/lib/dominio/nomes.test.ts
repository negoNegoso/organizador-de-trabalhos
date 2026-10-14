import { describe, expect, it } from 'vitest';
import { limparNome, parseNomes } from './nomes';

describe('limparNome', () => {
  it('apara e junta espaços internos', () => {
    expect(limparNome('  Maria   Souza ')).toBe('Maria Souza');
  });
});

describe('parseNomes', () => {
  it('ignora linhas vazias e conta repetidos', () => {
    expect(parseNomes('Maria Souza\n\n  João Pedro \nmaria souza\r\nAna')).toEqual({
      novos: ['Maria Souza', 'João Pedro', 'Ana'],
      ignorados: 1,
    });
  });

  it('ignora quem já está na turma, sem diferenciar acento', () => {
    expect(parseNomes('Joao Pedro\nBia', ['João Pedro'])).toEqual({ novos: ['Bia'], ignorados: 1 });
  });

  it('texto vazio não gera nada', () => {
    expect(parseNomes('  \n \n')).toEqual({ novos: [], ignorados: 0 });
  });
});
