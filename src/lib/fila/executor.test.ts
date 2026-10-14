import { expect, it } from 'vitest';
import { criarExecutorUnico } from './executor';

function controlavel() {
  const liberar: Array<() => void> = [];
  let execucoes = 0;
  const fn = () => {
    execucoes++;
    return new Promise<void>((r) => liberar.push(r));
  };
  return { fn, liberar, vezes: () => execucoes };
}

it('uma chamada durante a execução gera exatamente uma execução extra', async () => {
  const c = controlavel();
  const rodar = criarExecutorUnico(c.fn);
  const p = rodar();
  rodar();
  expect(c.vezes()).toBe(1);
  c.liberar[0]();
  await new Promise((r) => setTimeout(r, 0));
  expect(c.vezes()).toBe(2);
  c.liberar[1]();
  await p;
  expect(c.vezes()).toBe(2);
});

it('várias chamadas durante a execução colapsam em uma só', async () => {
  const c = controlavel();
  const rodar = criarExecutorUnico(c.fn);
  const p = rodar();
  rodar();
  rodar();
  rodar();
  c.liberar[0]();
  await new Promise((r) => setTimeout(r, 0));
  c.liberar[1]();
  await p;
  expect(c.vezes()).toBe(2);
});

it('sem chamadas extras, executa uma vez e permite nova execução depois', async () => {
  const c = controlavel();
  const rodar = criarExecutorUnico(c.fn);
  const p = rodar();
  c.liberar[0]();
  await p;
  const p2 = rodar();
  c.liberar[1]();
  await p2;
  expect(c.vezes()).toBe(2);
});
