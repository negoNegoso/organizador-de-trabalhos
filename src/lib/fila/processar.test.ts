import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import { abrirFila, novoItem } from './fila';
import { processarFila } from './processar';

it('remove só o que foi enviado e mantém o que falhou com o erro', async () => {
  const fila = await abrirFila(`teste-${crypto.randomUUID()}`);
  const ok = { ...novoItem({ alunoId: 'a', atividadeId: null, titulo: 'ok' }, new Uint8Array([1]), null, 1), criadoEm: 1 };
  const ruim = { ...novoItem({ alunoId: 'b', atividadeId: null, titulo: 'ruim' }, new Uint8Array([2]), null, 1), criadoEm: 2 };
  await fila.adicionar(ok);
  await fila.adicionar(ruim);
  const aoMudar = vi.fn();

  const r = await processarFila(
    fila,
    async (item) => {
      if (item.titulo === 'ruim') throw new Error('Failed to fetch');
    },
    aoMudar,
  );

  expect(r).toEqual({ enviados: 1, falhas: 1 });
  const restantes = await fila.listar();
  expect(restantes.map((i) => i.titulo)).toEqual(['ruim']);
  expect(restantes[0]).toMatchObject({ tentativas: 1, ultimoErro: 'Failed to fetch' });
  expect(aoMudar).toHaveBeenCalledTimes(2);
});
