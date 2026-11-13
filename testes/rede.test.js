// Testes do limite de tempo dos pedidos à nuvem (src/rede.js).
// Nenhum pedido de verdade sai daqui: o "fetch" é de mentira. Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limiteDoPedido, criarFetchComLimite, comLimite, LIMITE_LEITURA_MS, LIMITE_GRAVACAO_MS } from '../src/rede.js';

const DADOS = 'https://exemplo.invalid/rest/v1/app_data?id=eq.linha-de-teste';
const LOGIN = 'https://exemplo.invalid/auth/v1/token?grant_type=refresh_token';

// um fetch de mentira que nunca responde — só desiste se for cancelado
function fetchPendurado(registro = {}){
  return (input, init) => new Promise((_, rej) => {
    registro.chamado = true; registro.init = init;
    const s = init && init.signal;
    if(!s) return; // sem sinal: pendurado pra sempre
    if(s.aborted) return rej(s.reason);
    s.addEventListener('abort', () => rej(s.reason));
  });
}

test('limiteDoPedido: 15 s pra ler, 25 s pra gravar, e login sem prazo', () => {
  assert.equal(LIMITE_LEITURA_MS, 15000);
  assert.equal(LIMITE_GRAVACAO_MS, 25000);
  assert.equal(limiteDoPedido(DADOS, 'GET'), 15000);
  assert.equal(limiteDoPedido(DADOS, undefined), 15000);
  assert.equal(limiteDoPedido(DADOS, 'head'), 15000);
  assert.equal(limiteDoPedido(DADOS, 'POST'), 25000);
  assert.equal(limiteDoPedido(DADOS, 'PATCH'), 25000);
  assert.equal(limiteDoPedido(LOGIN, 'POST'), 0, 'login e renovação da sessão passam direto');
  assert.equal(limiteDoPedido('', 'GET'), 0);
});

test('pedido pendurado é cancelado no prazo e vira erro comum (AbortError)', async () => {
  const f = criarFetchComLimite(fetchPendurado(), () => 30);
  const t0 = Date.now();
  await assert.rejects(f(DADOS, { method: 'PATCH' }), e => e.name === 'AbortError');
  assert.ok(Date.now() - t0 < 1000, 'não fica esperando pra sempre');
});

test('pedido que responde a tempo passa normalmente, com os mesmos dados do pedido', async () => {
  let visto;
  const base = async (input, init) => { visto = { input, init }; return { ok: true, status: 200 }; };
  const f = criarFetchComLimite(base, () => 1000);
  const r = await f(DADOS, { method: 'POST', headers: { a: '1' }, body: '{}' });
  assert.deepEqual(r, { ok: true, status: 200 });
  assert.equal(visto.input, DADOS);
  assert.equal(visto.init.method, 'POST');
  assert.deepEqual(visto.init.headers, { a: '1' });
  assert.equal(visto.init.body, '{}');
  assert.ok(visto.init.signal instanceof AbortSignal);
});

test('erro de rede comum continua sendo o mesmo erro', async () => {
  const erro = new TypeError('Failed to fetch');
  const f = criarFetchComLimite(async () => { throw erro; }, () => 1000);
  await assert.rejects(f(DADOS, { method: 'GET' }), e => e === erro);
});

test('pedido de login não ganha prazo nem sinal: passa exatamente como veio', async () => {
  const reg = {};
  const init = { method: 'POST', body: 'x' };
  const base = async (input, i) => { reg.input = input; reg.init = i; return 'ok'; };
  const f = criarFetchComLimite(base);
  assert.equal(await f(LOGIN, init), 'ok');
  assert.equal(reg.input, LOGIN);
  assert.equal(reg.init, init, 'o mesmo objeto, sem mexer');
});

test('quem pediu também pode cancelar (o sinal de fora continua valendo)', async () => {
  const f = criarFetchComLimite(fetchPendurado(), () => 5000);
  const ctrl = new AbortController();
  const p = f(DADOS, { method: 'GET', signal: ctrl.signal });
  ctrl.abort();
  await assert.rejects(p, e => e.name === 'AbortError');
});

test('comLimite: promessa que não responde vira erro "tempo-esgotado"', async () => {
  await assert.rejects(comLimite(new Promise(() => {}), 20), e => e.message === 'tempo-esgotado');
});

test('comLimite: resposta a tempo passa; erro a tempo continua o mesmo erro', async () => {
  assert.equal(await comLimite(Promise.resolve(7), 50), 7);
  assert.deepEqual(await comLimite({ then: ok => ok({ data: 1, error: null }) }, 50), { data: 1, error: null }, 'aceita o "quase-promessa" do Supabase');
  const erro = new Error('x');
  await assert.rejects(comLimite(Promise.reject(erro), 50), e => e === erro);
});

test('comLimite: promessa que falha DEPOIS do prazo não vira erro solto', async () => {
  let falhar;
  const lenta = new Promise((_, rej) => { falhar = rej; });
  await assert.rejects(comLimite(lenta, 10), e => e.message === 'tempo-esgotado');
  falhar(new Error('tarde demais'));
  await new Promise(r => setTimeout(r, 20)); // se virasse erro solto, o node derrubaria o teste aqui
});
