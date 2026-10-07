/* Service worker do Meu Orçamento: deixa o app abrir mesmo com internet ruim.
   Estratégia "rede primeiro": sempre tenta a versão nova; se a rede falhar, usa a última cópia guardada.
   Só mexe em arquivos do próprio site; Firebase e outros endereços vão direto para a rede (nunca guardamos dados de usuário aqui). */
const VERSAO = 'orcamento-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(r).then(res => { if (res.ok) { const copia = res.clone(); caches.open(VERSAO).then(c => c.put(r, copia)); } return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('./')))
  );
});
