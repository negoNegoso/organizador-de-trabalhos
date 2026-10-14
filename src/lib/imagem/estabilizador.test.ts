import { describe, expect, it } from 'vitest';
import type { Cantos } from './tipos';
import { Estabilizador } from './estabilizador';

const c = (d = 0): Cantos => [{ x: d, y: d }, { x: 100 + d, y: d }, { x: 100 + d, y: 100 + d }, { x: d, y: 100 + d }];

describe('Estabilizador', () => {
  it('só dispara após 1 s parado', () => {
    const e = new Estabilizador(5, 1000);
    expect(e.atualizar(c(), 0)).toBe(false);
    expect(e.atualizar(c(1), 500)).toBe(false);
    expect(e.atualizar(c(2), 1000)).toBe(true);
  });

  it('movimento grande reinicia a contagem; sem folha não dispara', () => {
    const e = new Estabilizador(5, 1000);
    e.atualizar(c(), 0);
    expect(e.atualizar(c(20), 900)).toBe(false);
    expect(e.atualizar(c(20), 1500)).toBe(false);
    expect(e.atualizar(c(20), 1900)).toBe(true);
    expect(e.atualizar(null, 2000)).toBe(false);
  });

  it('depois de capturar, só rearma quando a folha some ou muda de lugar', () => {
    const e = new Estabilizador(5, 1000);
    e.atualizar(c(), 0);
    expect(e.atualizar(c(), 1000)).toBe(true);
    e.reiniciar();
    expect(e.atualizar(c(), 5000)).toBe(false);
    e.atualizar(null, 6000);
    e.atualizar(c(), 6100);
    expect(e.atualizar(c(), 7100)).toBe(true);
    e.reiniciar();
    e.atualizar(c(50), 8000);
    expect(e.atualizar(c(50), 9000)).toBe(true);
  });
});
