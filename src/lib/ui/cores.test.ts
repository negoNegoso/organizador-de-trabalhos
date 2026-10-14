import { describe, expect, it } from 'vitest';
import { CORES, ESTILO_COR, ehCor, sugerirCor } from './cores';

describe('paleta', () => {
  it('tem 8 cores na ordem da spec, todas com estilo', () => {
    expect(CORES).toEqual(['azul', 'verde', 'laranja', 'roxo', 'rosa', 'ciano', 'ambar', 'vermelho']);
    for (const c of CORES) expect(ESTILO_COR[c].forte).toMatch(/^bg-/);
  });
  it('ehCor reconhece só cores da paleta', () => {
    expect(ehCor('roxo')).toBe(true);
    expect(ehCor('preto')).toBe(false);
  });
});

describe('sugerirCor', () => {
  it('sem turmas sugere a primeira', () => {
    expect(sugerirCor([])).toBe('azul');
  });
  it('sugere a primeira ainda não usada', () => {
    expect(sugerirCor(['azul', 'verde', 'roxo'])).toBe('laranja');
  });
  it('com todas usadas, sugere a menos usada (empate pela ordem da paleta)', () => {
    expect(sugerirCor([...CORES, 'azul', 'laranja'])).toBe('verde');
  });
});
