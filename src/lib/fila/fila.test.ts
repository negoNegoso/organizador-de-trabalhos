import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { abrirFila, novoItem } from './fila';

const destino = { alunoId: 'al', atividadeId: null, titulo: 'T' };
const banco = () => `teste-${crypto.randomUUID()}`;

it('guarda e lista em ordem de criação, preservando os bytes', async () => {
  const fila = await abrirFila(banco());
  const a = { ...novoItem(destino, new Uint8Array([1, 2, 3]), null, 1), criadoEm: 2 };
  const b = { ...novoItem(destino, new Uint8Array([9]), new Uint8Array([7]), 2), criadoEm: 1 };
  await fila.adicionar(a);
  await fila.adicionar(b);
  const itens = await fila.listar();
  expect(itens.map((i) => i.id)).toEqual([b.id, a.id]);
  expect(Array.from(itens[1].pdf)).toEqual([1, 2, 3]);
  expect(Array.from(itens[0].miniatura!)).toEqual([7]);
});

it('registra falha e remove', async () => {
  const fila = await abrirFila(banco());
  const item = novoItem(destino, new Uint8Array([1]), null, 1);
  await fila.adicionar(item);
  await fila.registrarFalha(item.id, 'sem rede');
  expect((await fila.listar())[0]).toMatchObject({ tentativas: 1, ultimoErro: 'sem rede' });
  await fila.remover(item.id);
  expect(await fila.listar()).toEqual([]);
});

it('novoItem gera id único e começa sem tentativas', () => {
  const a = novoItem(destino, new Uint8Array(), null, 1);
  const b = novoItem(destino, new Uint8Array(), null, 1);
  expect(a.id).not.toBe(b.id);
  expect(a).toMatchObject({ ...destino, paginas: 1, tentativas: 0, ultimoErro: null });
});
