import { expect, test } from '@playwright/test';

test('manifesto declara instalação e share target', async ({ request }) => {
  const r = await request.get('/manifest.webmanifest');
  expect(r.ok()).toBe(true);
  const m = await r.json();
  expect(m.display).toBe('standalone');
  expect(m.share_target).toMatchObject({ action: '/compartilhar', method: 'POST' });
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toContain('512x512');
});

test('service worker e OpenCV são públicos', async ({ request }) => {
  expect((await request.get('/sw.js')).status()).toBe(200);
  expect((await request.get('/opencv/opencv.js', { maxRedirects: 0 })).status()).toBe(200);
});
