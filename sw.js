/* ============================================================
   Ritmo sem internet (nivel 1)
   ------------------------------------------------------------
   Guarda uma copia do "esqueleto" do app (pagina, codigo, visual, icones)
   pra ele abrir mesmo sem conexao. NUNCA guarda dados: pedidos pro banco
   (Supabase) passam direto, sem copia nenhuma.

   - Pagina (index.html): sempre busca a versao nova primeiro; a copia so
     entra quando a rede falha. Assim cada publicacao chega na hora.
   - Arquivos do app (/assets com nome que muda a cada versao, icones):
     usa a copia se tiver, senao busca e guarda.
   - Fontes do Google e o jsPDF: usa a copia e atualiza por tras.
   O real (/mei-financeiro/) e o beta (/mei-beta/) moram no mesmo endereco,
   entao o nome da copia leva a pasta de cada um.
   ============================================================ */
const VERSAO = 1;
const ESCOPO = new URL(self.registration.scope).pathname;
const PREFIXO = 'ritmo-esqueleto:' + ESCOPO + ':';
const CACHE = PREFIXO + VERSAO;
const PAGINA = new URL('./', self.registration.scope).href;

// pega os arquivos que a pagina usa (script/css/icones) pra guardar junto
function arquivosDaPagina(html){
  const urls = new Set();
  const re = /(?:src|href)="([^"]+)"/g;
  let m;
  while((m = re.exec(html))){
    const u = new URL(m[1], PAGINA);
    if(u.origin === self.location.origin && u.pathname.startsWith(ESCOPO)) urls.add(u.href);
  }
  return [...urls];
}

async function guardarPagina(resp){
  const cache = await caches.open(CACHE);
  const html = await resp.clone().text();
  await cache.put(PAGINA, resp.clone());
  const usados = arquivosDaPagina(html);
  // arquivos novos desta versao
  await Promise.all(usados.map(async u => {
    if(await cache.match(u)) return;
    try{ const r = await fetch(u, { cache: 'no-cache' }); if(r.ok) await cache.put(u, r); }catch(e){}
  }));
  // arquivos de versoes antigas que a pagina nao usa mais
  for(const req of await cache.keys()){
    const u = new URL(req.url);
    if(u.origin === self.location.origin && u.pathname.startsWith(ESCOPO + 'assets/') && !usados.includes(u.href)) await cache.delete(req);
  }
}

self.addEventListener('install', ev => {
  ev.waitUntil((async () => {
    try{
      const r = await fetch(PAGINA, { cache: 'no-cache' });
      if(r.ok) await guardarPagina(r);
    }catch(e){}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    for(const k of await caches.keys()) if(k.startsWith(PREFIXO) && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

function ehDeFora(u){
  return u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'cdnjs.cloudflare.com';
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if(req.method !== 'GET') return;
  const u = new URL(req.url);

  // app da apuracao (pasta eleicoes/) e separado: tem a propria copia, o Ritmo nao mexe
  if(u.origin === self.location.origin && u.pathname.startsWith(ESCOPO + 'eleicoes/')) return;

  // a pagina: rede primeiro, copia so sem conexao
  if(req.mode === 'navigate' && u.origin === self.location.origin && u.pathname.startsWith(ESCOPO)){
    ev.respondWith((async () => {
      try{
        const r = await fetch(req);
        if(r.ok) ev.waitUntil(guardarPagina(r.clone()).catch(() => {}));
        return r;
      }catch(e){
        const c = await caches.match(PAGINA, { cacheName: CACHE });
        if(c) return c;
        throw e;
      }
    })());
    return;
  }

  if(u.origin === self.location.origin && u.pathname.endsWith('/sw.js')) return;

  // codigo e visual do app (/assets): o nome muda a cada versao, entao a
  // copia nunca fica velha
  if(u.origin === self.location.origin && u.pathname.startsWith(ESCOPO + 'assets/')){
    ev.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const c = await cache.match(req);
      if(c) return c;
      const r = await fetch(req);
      if(r.ok) cache.put(req, r.clone()).catch(() => {});
      return r;
    })());
    return;
  }

  // icones, manifest, fontes e jsPDF: copia na hora, atualiza por tras
  if((u.origin === self.location.origin && u.pathname.startsWith(ESCOPO)) || ehDeFora(u)){
    ev.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const c = await cache.match(req);
      const rede = fetch(req).then(r => { if(r.ok || r.type === 'opaque') cache.put(req, r.clone()).catch(() => {}); return r; });
      if(c){ ev.waitUntil(rede.catch(() => {})); return c; }
      return rede;
    })());
  }
  // todo o resto (Supabase, dados) passa direto: nada de copia
});
