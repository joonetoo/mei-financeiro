/* ============================================================
   Limite de tempo nos pedidos à nuvem
   ------------------------------------------------------------
   Com sinal ruim, um pedido pode ficar "pendurado" por minutos sem dar certo
   nem errado. Enquanto isso o app ficava em "salvando…" e a sincronização
   travava. Aqui cada pedido ganha um prazo: estourou, vira um erro comum
   (o app avisa e tenta de novo sozinho, como em qualquer falha de rede).

   Só os pedidos de DADOS (/rest/v1/) têm prazo. Os de login (/auth/v1/)
   passam direto, do jeito que sempre foi.
   ============================================================ */

export const LIMITE_LEITURA_MS = 15000;
export const LIMITE_GRAVACAO_MS = 25000;
// rede de seguranca por fora do pedido (ver comLimite): um pouco maior, pra
// quem desiste primeiro ser sempre o pedido em si
export const FOLGA_MS = 2000;

// quanto tempo esse pedido pode levar (0 = sem prazo)
export function limiteDoPedido(url, metodo){
  if(!String(url || '').includes('/rest/v1/')) return 0;
  const m = String(metodo || 'GET').toUpperCase();
  return (m === 'GET' || m === 'HEAD') ? LIMITE_LEITURA_MS : LIMITE_GRAVACAO_MS;
}

// Um `fetch` igual ao do navegador, so que cancela o pedido quando o prazo
// estoura. O cancelamento sai como "AbortError" de proposito: e o tipo de
// erro que a biblioteca do Supabase NAO tenta repetir por conta propria
// (quem repete e o app, no ritmo dele).
export function criarFetchComLimite(fetchBase, limiteDe = limiteDoPedido){
  return (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || String(input);
    const metodo = (init && init.method) || (input && typeof input === 'object' && input.method) || 'GET';
    const ms = limiteDe(url, metodo);
    if(!ms) return fetchBase(input, init);
    const ctrl = new AbortController();
    const deFora = init && init.signal;
    const repassar = () => ctrl.abort(deFora.reason);
    if(deFora){
      if(deFora.aborted) ctrl.abort(deFora.reason);
      else deFora.addEventListener('abort', repassar, { once: true });
    }
    const relogio = setTimeout(() => ctrl.abort(), ms);
    const limpar = () => { clearTimeout(relogio); if(deFora) deFora.removeEventListener('abort', repassar); };
    return fetchBase(input, { ...(init || {}), signal: ctrl.signal })
      .then(r => { limpar(); return r; }, e => { limpar(); throw e; });
  };
}

// Rede de seguranca por fora: se a promessa nao responder em `ms`, desiste
// com erro. Cobre o que acontece ANTES do pedido sair (ex.: a renovacao do
// login travada), que o prazo do fetch nao alcanca.
export function comLimite(promessa, ms){
  const p = Promise.resolve(promessa);
  p.catch(() => {}); // se ela falhar depois do prazo, ninguem mais esta ouvindo
  let relogio;
  const prazo = new Promise((_, rej) => { relogio = setTimeout(() => rej(new Error('tempo-esgotado')), ms); });
  return Promise.race([p, prazo]).finally(() => clearTimeout(relogio));
}
