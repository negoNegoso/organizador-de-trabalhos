const CACHE = 'organizador-v1';
const BANCO = 'organizador-compartilhados';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('arquivos', { autoIncrement: true });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function guardar(itens) {
  const db = await abrirBanco();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('arquivos', 'readwrite');
    const store = tx.objectStore('arquivos');
    store.clear();
    for (const item of itens) store.add(item);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // "Compartilhar" do Android: guarda os arquivos e abre a tela de escolha do aluno.
  if (event.request.method === 'POST' && url.pathname === '/compartilhar') {
    event.respondWith(
      (async () => {
        const form = await event.request.formData();
        const arquivos = form.getAll('arquivos').filter((f) => typeof f !== 'string');
        const itens = await Promise.all(
          arquivos.map(async (f) => ({ nome: f.name, tipo: f.type, dados: await f.arrayBuffer() })),
        );
        await guardar(itens);
        return Response.redirect('/compartilhar', 303);
      })(),
    );
    return;
  }

  // OpenCV (~10 MB): baixa uma vez e guarda.
  if (event.request.method === 'GET' && url.pathname === '/opencv/opencv.js') {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const salvo = await cache.match(event.request);
        if (salvo) return salvo;
        const resposta = await fetch(event.request);
        if (resposta.ok) await cache.put(event.request, resposta.clone());
        return resposta;
      }),
    );
  }
});
