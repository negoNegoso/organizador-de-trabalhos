import { expect, it } from 'vitest';
import type { AnoLetivo } from '../tipos';
import { escolherAno } from './ano';

const a2025: AnoLetivo = { id: 'a25', ano: 2025, arquivado: false };
const a2026: AnoLetivo = { id: 'a26', ano: 2026, arquivado: false };
const a2027arq: AnoLetivo = { id: 'a27', ano: 2027, arquivado: true };

it('usa o ano do cookie quando existe', () => {
  expect(escolherAno([a2026, a2025], 'a25')).toBe(a2025);
});

it('cookie de ano apagado cai no mais recente não arquivado', () => {
  expect(escolherAno([a2027arq, a2026, a2025], 'sumiu')).toBe(a2026);
});

it('sem cookie usa o mais recente não arquivado, mesmo fora de ordem', () => {
  expect(escolherAno([a2025, a2026], undefined)).toBe(a2026);
});

it('todos arquivados usa o mais recente', () => {
  const v: AnoLetivo = { id: 'v', ano: 2020, arquivado: true };
  expect(escolherAno([v, a2027arq], undefined)).toBe(a2027arq);
});

it('sem anos devolve null', () => {
  expect(escolherAno([], 'x')).toBeNull();
});
