import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { guardarCompartilhados, lerCompartilhados, limparCompartilhados } from './compartilhar';

it('guarda, lê como File e limpa', async () => {
  const banco = `teste-${crypto.randomUUID()}`;
  await guardarCompartilhados(
    [
      { nome: 'a.pdf', tipo: 'application/pdf', dados: new Uint8Array([1, 2]).buffer },
      { nome: 'b.jpg', tipo: 'image/jpeg', dados: new Uint8Array([3]).buffer },
    ],
    banco,
  );
  const arquivos = await lerCompartilhados(banco);
  expect(arquivos.map((f) => [f.name, f.type, f.size])).toEqual([['a.pdf', 'application/pdf', 2], ['b.jpg', 'image/jpeg', 1]]);
  await limparCompartilhados(banco);
  expect(await lerCompartilhados(banco)).toEqual([]);
});
