import { expect, test, type Page } from '@playwright/test';
import { clienteLogado, criarArquivo, limparTudo, semear } from '../compartilhado/supabase';
import { entrar } from './ajuda';

const TOTAL = 30;

async function semearPendentes(page: Page, alunoId: string) {
  await page.evaluate(
    ({ alunoId, total }) =>
      new Promise<void>((resolve, reject) => {
        const abrir = indexedDB.open('organizador');
        abrir.onerror = () => reject(abrir.error);
        abrir.onsuccess = () => {
          const db = abrir.result;
          const tx = db.transaction('fila', 'readwrite');
          for (let i = 0; i < total; i++) {
            tx.objectStore('fila').put({
              id: crypto.randomUUID(),
              alunoId,
              atividadeId: null,
              titulo: `Pendente ${i + 1}`,
              paginas: 1,
              pdf: new Uint8Array([37, 80, 68, 70]),
              miniatura: null,
              criadoEm: Date.now() + i,
              tentativas: 0,
              ultimoErro: null,
            });
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { alunoId, total: TOTAL },
  );
}

test('muitos pendentes: faixa expandida mantém o cabeçalho visível e não cobre o fim da página', async ({ page }) => {
  await limparTudo();
  const sb = await clienteLogado();
  const s = await semear(sb);
  for (let i = 1; i <= 8; i++) await criarArquivo(sb, s.alunos.maria, null, `Arquivo ${i}`);

  // O envio nunca termina, então os itens continuam pendentes.
  await page.route('**/storage/v1/object/**', (r) => r.abort());
  await entrar(page);
  await semearPendentes(page, s.alunos.maria);
  await page.reload();

  const faixa = page.getByRole('status').filter({ hasText: 'envio(s) pendente(s)' });
  await expect(faixa).toBeVisible();
  const alternar = faixa.getByRole('button', { name: /envio\(s\) pendente\(s\)/ });
  const tentar = faixa.getByRole('button', { name: 'Tentar de novo' });
  await alternar.click();
  await expect(faixa.getByRole('button', { name: 'Descartar' }).first()).toBeVisible();
  await expect(alternar).toBeInViewport();
  await expect(tentar).toBeInViewport();
  await alternar.click();

  await page.goto(`/alunos/${s.alunos.maria}`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const ultimo = page.getByTestId('arquivo').last().getByRole('button', { name: 'Ações do arquivo' });
  await ultimo.scrollIntoViewIfNeeded();
  await expect(ultimo).toBeInViewport();
  // O cartão inteiro termina acima da faixa colapsada (nada fica por baixo dela).
  const cartao = await page.getByTestId('arquivo').last().boundingBox();
  const topoFaixa = await faixa.boundingBox();
  expect(cartao!.y + cartao!.height).toBeLessThanOrEqual(topoFaixa!.y);
  await ultimo.click();
  await expect(page.getByRole('dialog', { name: /Arquivo/ })).toBeVisible();
});
