import { expect, it } from 'vitest';
import { normalizar } from './busca';

it('remove acentos, baixa caixa e junta espaços', () => {
  expect(normalizar('  JOÃO   Conceição ')).toBe('joao conceicao');
});
