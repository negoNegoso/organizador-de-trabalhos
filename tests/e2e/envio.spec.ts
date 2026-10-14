import { expect, test } from '@playwright/test';
import jpeg from 'jpeg-js';
import { clienteLogado, limparTudo, pdfDeTeste, semear, type Semente } from '../compartilhado/supabase';
import { entrar } from './ajuda';

let s: Semente;
test.beforeEach(async ({ page }) => {
  await limparTudo();
  s = await semear(await clienteLogado());
  await entrar(page);
  await page.goto(`/alunos/${s.alunos.maria}`);
  await page.getByRole('link', { name: 'Enviar arquivo' }).click();
});

const imagemJpeg = (w: number, h: number) =>
  Buffer.from(jpeg.encode({ data: Buffer.alloc(w * h * 4, 220), width: w, height: h }, 80).data);

test('PDF vai para a atividade escolhida', async ({ page }) => {
  await page.getByLabel(/Arquivos/).setInputFiles({ name: 'prova.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdfDeTeste(2)) });
  await page.getByLabel('Atividade').selectOption({ label: 'Prova 1' });
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page).toHaveURL(`/alunos/${s.alunos.maria}`);
  await expect(page.getByTestId('arquivo')).toContainText('2 página(s)', { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Prova 1' })).toBeVisible();
});

test('várias imagens viram um PDF com título livre', async ({ page }) => {
  await page.getByLabel(/Arquivos/).setInputFiles([
    { name: 'p1.jpg', mimeType: 'image/jpeg', buffer: imagemJpeg(60, 80) },
    { name: 'p2.jpg', mimeType: 'image/jpeg', buffer: imagemJpeg(80, 60) },
  ]);
  await page.getByLabel('Atividade').selectOption({ label: 'Sem atividade (título livre)' });
  await page.getByLabel('Título', { exact: true }).fill('Desenho');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByTestId('arquivo')).toContainText('Desenho', { timeout: 20_000 });
  await expect(page.getByTestId('arquivo')).toContainText('2 página(s)');
  await expect(page.getByRole('heading', { name: 'Outros' })).toBeVisible();
});

test('PDF corrompido mostra erro e não entra na fila', async ({ page }) => {
  await page.getByLabel(/Arquivos/).setInputFiles({ name: 'quebrado.pdf', mimeType: 'application/pdf', buffer: Buffer.from('não sou pdf') });
  await page.getByRole('button', { name: 'Enviar' }).click();
  // O route announcer do Next também tem role=alert: filtra pelo texto do erro.
  await expect(page.getByRole('alert').filter({ hasText: 'Não consegui ler este PDF' })).toHaveText(
    'Não consegui ler este PDF. Ele pode estar corrompido.',
  );
  await expect(page.getByText(/envio\(s\) pendente/)).toHaveCount(0);
});
