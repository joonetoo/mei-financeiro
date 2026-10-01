/* ============================================================
   Joel Neto Filmes — Controle Financeiro
   ============================================================ */
import { createClient } from "@supabase/supabase-js";
import { mergeState, deepEq, diffState, pareceEstado } from "./sync.js";

/* ------------------------------------------------------------------ */
/* Persistência na nuvem (Supabase) — mesmo projeto do financas-casa,  */
/* linha separada (id "jnf-financeiro-v1") — dados não dependem do    */
/* Claude/Artifact.                                                    */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = "https://oikbmfdlhvqesbgnmeky.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pa2JtZmRsaHZxZXNiZ25tZWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMjUxMTgsImV4cCI6MjEwNDgwMTExOH0.VRvyNxYyvkjNaBnKAsHqfDTZxSM8pd5W9k5ElqGeeF8";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.storage = {
  // Importante: distingue "linha realmente não existe" (data null, sem
  // error) de "falha ao buscar" (error, ou exceção de rede) — os dois casos
  // NÃO podem ser tratados igual, senão uma instabilidade de rede vira
  // "banco vazio" e acaba sobrescrevendo dados reais com o estado padrão
  // (já aconteceu no financas-casa, que usa o mesmo padrão de código).
  async get(key) {
    try {
      const { data, error } = await supabase
        .from("app_data")
        .select("data, updated_at")
        .eq("id", key)
        .maybeSingle();
      if (error) return { failed: true };
      if (!data) return { value: null };
      // linha existe mas sem conteudo valido: trata como FALHA, nunca como
      // "vazio" (senao o app poderia gravar os dados-semente por cima)
      if (data.data === null || typeof data.data !== "object") return { failed: true };
      return { value: JSON.stringify(data.data), updatedAt: data.updated_at };
    } catch (e) {
      console.error("Falha ao carregar do Supabase", e);
      return { failed: true };
    }
  },
  // so a "hora da ultima gravacao" da linha (leve) — pra saber se outro
  // aparelho salvou algo desde a ultima vez que este leu
  async getStamp(key) {
    try {
      const { data, error } = await supabase
        .from("app_data")
        .select("updated_at")
        .eq("id", key)
        .maybeSingle();
      if (error) return { failed: true };
      return { updatedAt: data ? data.updated_at : null };
    } catch (e) {
      return { failed: true };
    }
  },
  // Grava SO se ninguem gravou desde `esperado` (a hora da versao que este
  // aparelho tem). Sem isso, um aparelho com dados velhos (app aberto ha
  // horas no Mac) apagava o que o outro lancou (celular). Devolve
  // {conflict:true} se a linha mudou; lanca erro se a rede falhar.
  async setIfUnchanged(key, value, esperado, novoCarimbo) {
    const parsed = JSON.parse(value);
    if (!esperado) {
      // linha ainda nao existe (primeiro uso): cria; se alguem criou antes, e conflito
      const { error } = await supabase
        .from("app_data")
        .insert({ id: key, data: parsed, updated_at: novoCarimbo });
      if (error) {
        if (error.code === "23505") return { conflict: true };
        console.error("Falha ao salvar no Supabase", error);
        throw error;
      }
      return { ok: true, updatedAt: novoCarimbo };
    }
    const { data, error } = await supabase
      .from("app_data")
      .update({ data: parsed, updated_at: novoCarimbo })
      .eq("id", key)
      .eq("updated_at", esperado)
      .select("updated_at");
    if (error) {
      console.error("Falha ao salvar no Supabase", error);
      throw error;
    }
    if (!data || data.length === 0) return { conflict: true };
    // a hora que o SERVIDOR guardou (e nao a que mandamos): e com ela que a
    // proxima gravacao vai se comparar
    return { ok: true, updatedAt: data[0].updated_at || novoCarimbo };
  },
  // Lança erro se a gravação falhar — quem chama precisa saber, senão o app
  // mostra "salvo" com a edição ainda só na memória do aparelho.
  // existe alguma linha cujo id comeca com `prefixo`? (backups, copias)
  async existeComPrefixo(prefixo) {
    const { data, error } = await supabase
      .from("app_data")
      .select("id")
      .like("id", prefixo + "%")
      .limit(1);
    if (error) throw error;
    return !!(data && data.length);
  },
  // "Cofre": tabela app_historico, onde o app so consegue ACRESCENTAR (nunca
  // mudar nem apagar). Guarda o que mudou em cada gravacao + uma foto por dia.
  async historico(linhas) {
    const { error } = await supabase.from("app_historico").insert(linhas);
    if (error) throw error;
  },
  async set(key, value) {
    const parsed = JSON.parse(value);
    const { error } = await supabase
      .from("app_data")
      .upsert({ id: key, data: parsed, updated_at: new Date().toISOString() });
    if (error) {
      console.error("Falha ao salvar no Supabase", error);
      throw error;
    }
  },
};

const MESES = [
  {k:'01', nome:'Janeiro'}, {k:'02', nome:'Fevereiro'}, {k:'03', nome:'Março'},
  {k:'04', nome:'Abril'},   {k:'05', nome:'Maio'},      {k:'06', nome:'Junho'},
  {k:'07', nome:'Julho'},   {k:'08', nome:'Agosto'},    {k:'09', nome:'Setembro'},
  {k:'10', nome:'Outubro'}, {k:'11', nome:'Novembro'},  {k:'12', nome:'Dezembro'}
];
const MES_NOME = Object.fromEntries(MESES.map(m => [m.k, m.nome]));

const NOTAS_SEED = {"2025": [{"id": "2025-n0", "empresa": "TC", "data": null, "valor": 3000.0}, {"id": "2025-n1", "empresa": "WIDE", "data": null, "valor": 1725.0}, {"id": "2025-n2", "empresa": "RESULT", "data": null, "valor": 160.0}, {"id": "2025-n3", "empresa": "WIDE", "data": null, "valor": 1255.0}, {"id": "2025-n4", "empresa": "TC", "data": null, "valor": 3000.0}, {"id": "2025-n5", "empresa": "TC", "data": null, "valor": 500.0}, {"id": "2025-n6", "empresa": "TC", "data": null, "valor": 3000.0}, {"id": "2025-n7", "empresa": "WIDE", "data": null, "valor": 1510.0}, {"id": "2025-n8", "empresa": "RESULT", "data": null, "valor": 1603.33}, {"id": "2025-n9", "empresa": "WIDE", "data": null, "valor": 1260.0}, {"id": "2025-n10", "empresa": "TC", "data": null, "valor": 3000.0}, {"id": "2025-n11", "empresa": "TC", "data": null, "valor": 1800.0}, {"id": "2025-n12", "empresa": "RESULT", "data": null, "valor": 3700.0}, {"id": "2025-n13", "empresa": "WIDE", "data": null, "valor": 2527.0}, {"id": "2025-n14", "empresa": "RESULT", "data": null, "valor": 3700.0}, {"id": "2025-n15", "empresa": "WIDE", "data": null, "valor": 1715.0}, {"id": "2025-n16", "empresa": "OUTRAS", "data": null, "valor": 840.0}, {"id": "2025-n17", "empresa": "WIDE", "data": null, "valor": 1710.0}, {"id": "2025-n18", "empresa": "RESULT", "data": null, "valor": 3700.0}, {"id": "2025-n19", "empresa": "WIDE", "data": null, "valor": 3000.0}, {"id": "2025-n20", "empresa": "RESULT", "data": null, "valor": 3700.0}, {"id": "2025-n21", "empresa": "RESULT", "data": null, "valor": 3700.0}, {"id": "2025-n22", "empresa": "WIDE", "data": null, "valor": 3000.0}, {"id": "2025-n23", "empresa": "WIDE", "data": "2025-11-10", "valor": 3000.0}, {"id": "2025-n24", "empresa": "RESULT", "data": "2025-11-10", "valor": 3700.0}, {"id": "2025-n25", "empresa": "WIDE", "data": "2025-12-01", "valor": 3000.0}, {"id": "2025-n26", "empresa": "RESULT", "data": "2025-12-01", "valor": 3700.0}, {"id": "2025-n27", "empresa": "RESULT", "data": "2025-12-31", "valor": 3700.0}, {"id": "2025-n28", "empresa": "WIDE", "data": "2025-12-31", "valor": 3000.0}], "2026": [{"id": "2026-n0", "empresa": "WIDE", "data": "2026-02-01", "valor": 3000.0}, {"id": "2026-n1", "empresa": "RESULT", "data": "2026-02-01", "valor": 3700.0}, {"id": "2026-n2", "empresa": "RESULT", "data": "2026-02-11", "valor": 1480.0}, {"id": "2026-n3", "empresa": "WIDE", "data": "2026-03-02", "valor": 3000.0}, {"id": "2026-n4", "empresa": "WAD", "data": "2026-03-03", "valor": 2325.0}, {"id": "2026-n5", "empresa": "WIDE", "data": "2026-04-05", "valor": 3000.0}, {"id": "2026-n6", "empresa": "WAD", "data": "2026-04-06", "valor": 4100.0}, {"id": "2026-n7", "empresa": "WIDE", "data": "2026-05-04", "valor": 3000.0}, {"id": "2026-n8", "empresa": "WAD", "data": "2026-05-05", "valor": 3000.0}, {"id": "2026-n9", "empresa": "FÁBIO", "data": "2026-06-01", "valor": 350.0}, {"id": "2026-n10", "empresa": "WIDE", "data": "2026-06-04", "valor": 2055.0}, {"id": "2026-n11", "empresa": "WAD", "data": "2026-06-05", "valor": 3840.0}, {"id": "2026-n12", "empresa": "FÁBIO", "data": "2026-07-03", "valor": 1610.0}, {"id": "2026-n13", "empresa": "WIDE", "data": "2026-07-03", "valor": 2260.0}, {"id": "2026-n14", "empresa": "WAD", "data": "2026-07-06", "valor": 3060.0}, {"id": "2026-n15", "empresa": "FÁBIO", "data": "2026-08-04", "valor": 2450.0}, {"id": "2026-n16", "empresa": "WIDE", "data": "2026-08-04", "valor": 2660.0}, {"id": "2026-n17", "empresa": "FÁBIO", "data": "2026-09-08", "valor": 1750.0}, {"id": "2026-n18", "empresa": "WIDE", "data": "2026-09-08", "valor": 1480.0}, {"id": "2026-n19", "empresa": "WAD", "data": "2026-09-08", "valor": 2760.0}]};

// "hoje" e o mes atual — let, porque o app fica aberto dias no celular e o
// Painel precisa virar o dia sozinho (ver refreshToday, la embaixo)
let now = new Date();
let REAL_YEAR = String(now.getFullYear());
let REAL_MONTH = String(now.getMonth()+1).padStart(2,'0');
// data LOCAL (nao toISOString, que e UTC): depois das 21h no Brasil o UTC ja
// virou o dia seguinte, e o video lancado a noite caia com a data de amanha.
function localISO(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
let TODAY_ISO = localISO(now);
function refreshToday(){
  const d = new Date();
  if(localISO(d) === TODAY_ISO) return false;
  now = d;
  REAL_YEAR = String(d.getFullYear());
  REAL_MONTH = String(d.getMonth()+1).padStart(2,'0');
  TODAY_ISO = localISO(d);
  return true;
}

function uid(prefix){
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
}

function defaultState(){
  return {
    business:{
      nomeFantasia:'Joel Neto Filmes',
      razaoSocial:'JOEL MANOEL DA CRUZ NETO',
      cnpj:'46.333.168/0001-10',
      pix:'46.333.168/0001-10',
      email:'',
      telefone:'',
      apelido:'' // como a saudacao do topo te chama (vazio = primeiro nome acima)
    },
    meiLimiteAnual: 81000,
    clients:[
      {id:'fabio', nome:'FÁBIO ORTIZ', valorPadrao:50, tipo:'fixo'},
      {id:'wad',   nome:'WAD AUDIOVISUAL', valorPadrao:40, tipo:'fixo'},
      {id:'wide',  nome:'WIDE MEDIA', valorPadrao:50, tipo:'fixo'}
    ],
    clientOrder:['fabio','wad','wide'],
    videos:{},
    notas: NOTAS_SEED,
    notasYears:['2025','2026']
  };
}

/* ---------------- storage ---------------- */
// VITE_STORAGE_KEY so existe no servidor de teste local (aponta pra uma COPIA
// dos dados); o app BETA (build --mode beta) usa a propria copia, "mei-beta";
// a versao publicada normal usa sempre a linha real.
const STORAGE_KEY =
  (import.meta.env.DEV && import.meta.env.VITE_STORAGE_KEY) ||
  (import.meta.env.MODE === 'beta' ? 'mei-beta' : 'jnf-financeiro-v1');
let state = null;
let saveTimer = null;

// hora da ultima gravacao da linha que ESTE aparelho conhece, e o conteudo
// dela ("base"). A base e o que permite juntar versoes: comparando com ela da
// pra saber o que mudou aqui e o que mudou no outro aparelho (ver sync.js).
let lastSyncedAt = null;
let baseJson = null;
// true = tem edicao feita aqui que ainda nao foi pra nuvem
let dirty = false;

// Memoria do navegador: sempre com o nome da linha junto — o app real e o
// beta moram no mesmo endereco (joonetoo.github.io) e dividiriam essas chaves.
const LS = {
  backupData: `jnf-last-backup-date:${STORAGE_KEY}`,
  fotoData: `jnf-last-foto-date:${STORAGE_KEY}`,
  outbox: `jnf-outbox:${STORAGE_KEY}:`,       // + id da aba
  histFila: `jnf-hist-fila:${STORAGE_KEY}`,
  ordem: `ritmo-ordem:${STORAGE_KEY}`,        // lista de videos virada (so tela, por aparelho)
};
const TAB_ID = uid('aba');
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem(k, v); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }

/* ---- caixa de saida: a edicao fica guardada NO APARELHO ate a nuvem confirmar ----
   Sem isso, uma edicao feita sem sinal (celular na rua) morava so na memoria
   do app: se o Android fechasse o app antes do sinal voltar, ela se perdia.
   Agora cada edicao e copiada na hora pra memoria do navegador, e so sai de la
   depois que a nuvem confirmou. Ao abrir o app, o que ficou la e reenviado
   (juntando com o que mudou na nuvem nesse meio-tempo). */
function outboxKey(){ return LS.outbox + TAB_ID; }
// a "base" (versao da nuvem) fica numa chave propria e so e regravada quando
// muda — assim cada tecla digitada copia so o estado, nao os dois
let baseNaCaixa = null;
function writeOutbox(){
  if(!state) return;
  if(baseNaCaixa !== baseJson){ lsSet(outboxKey() + ':base', baseJson || ''); baseNaCaixa = baseJson; }
  lsSet(outboxKey(), JSON.stringify({ t: Date.now(), baseAt: lastSyncedAt, state: JSON.stringify(state) }));
}
function clearOutbox(){ lsDel(outboxKey()); lsDel(outboxKey() + ':base'); baseNaCaixa = null; }
function readAllOutboxes(){
  const out = [];
  try{
    for(let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.startsWith(LS.outbox) && !k.endsWith(':base')){
        try{
          const v = JSON.parse(localStorage.getItem(k));
          if(v && v.state) out.push({k, ...v, base: localStorage.getItem(k + ':base') || null});
        }catch(e){}
      }
    }
  }catch(e){}
  return out.sort((a,b)=>a.t-b.t);
}
// apaga a caixa de outra aba so se ela nao foi regravada depois que foi lida
function apagarCaixaSeIgual(cx){
  try{
    const v = JSON.parse(localStorage.getItem(cx.k) || 'null');
    if(v && v.t !== cx.t) return;
  }catch(e){}
  lsDel(cx.k); lsDel(cx.k + ':base');
}

/* ---- cofre (app_historico): o que mudou em cada gravacao + foto diaria ----
   So acrescenta, nunca apaga. Se a rede falhar, guarda numa fila no aparelho
   e manda junto na proxima vez. Nunca atrasa nem bloqueia o salvamento. */
const APARELHO = /Android|iPhone|Mobile/i.test(navigator.userAgent) ? 'celular' : 'computador';
let histEnviando = false;
function filaHist(){ try{ return JSON.parse(lsGet(LS.histFila) || '[]'); }catch(e){ return []; } }
function registrarHistorico(linha){
  const fila = filaHist();
  fila.push({ ...linha, chave: STORAGE_KEY, aparelho: APARELHO, quando: new Date().toISOString() });
  // fila limitada (se ficar dias sem rede, as mais antigas cedem lugar)
  while(fila.length > 200) fila.shift();
  lsSet(LS.histFila, JSON.stringify(fila));
  enviarHistorico();
}
async function enviarHistorico(){
  if(histEnviando) return;
  const fila = filaHist();
  if(!fila.length) return;
  // outra aba (outra janela do app) já está enviando? deixa ela
  try{
    const tr = JSON.parse(lsGet(LS.histFila + ':trava') || 'null');
    if(tr && tr.aba !== TAB_ID && Date.now() - tr.t < 20000) return;
  }catch(e){}
  lsSet(LS.histFila + ':trava', JSON.stringify({ aba: TAB_ID, t: Date.now() }));
  histEnviando = true;
  try{
    await window.storage.historico(fila);
    const resto = filaHist().slice(fila.length); // o que entrou enquanto enviava
    lsSet(LS.histFila, JSON.stringify(resto));
  }catch(e){ /* fica na fila, vai na proxima */ }
  finally{ histEnviando = false; lsDel(LS.histFila + ':trava'); }
}
function historicoDaGravacao(antesJson, depoisJson){
  try{
    const antes = antesJson ? JSON.parse(antesJson) : null;
    const mud = diffState(antes, JSON.parse(depoisJson));
    if(!mud.length) return;
    const antesO = {}, depoisO = {};
    mud.slice(0, 60).forEach(m=>{ antesO[m.path] = m.antes ?? null; depoisO[m.path] = m.depois ?? null; });
    const resumo = mud.slice(0, 4).map(m=>m.path.replace(/^\//,'')).join(' · ') + (mud.length>4 ? ` (+${mud.length-4})` : '');
    registrarHistorico({ acao: 'salvou', resumo, antes: antesO, depois: depoisO });
  }catch(e){ console.error('historico', e); }
}

// Backup diario rotativo (7 linhas, uma por dia da semana) + foto diaria no
// cofre. Roda ao abrir E tambem com o app aberto (o Mac nunca reabre), sempre
// a partir da versao confirmada da nuvem (baseJson), nunca de algo nao salvo.
let backupRodando = false;
async function backupIfNeeded(){
  if(backupRodando || !baseJson) return;
  backupRodando = true;
  try{
    const today = localISO(new Date());
    if(lsGet(LS.backupData) !== today){
      await window.storage.set(`${STORAGE_KEY}-backup-${new Date().getDay()}`, baseJson);
      lsSet(LS.backupData, today);
    }
    if(lsGet(LS.fotoData) !== today){
      registrarHistorico({ acao: 'foto', resumo: `foto do dia ${today}`, depois: JSON.parse(baseJson) });
      lsSet(LS.fotoData, today);
    }
  }catch(e){
    console.error('Falha ao gravar backup diário', e);
  }finally{ backupRodando = false; }
}

async function loadState(){
  // busca com algumas tentativas: uma instabilidade passageira de rede não
  // pode ser confundida com "banco vazio" (ver window.storage.get acima) —
  // se continuar falhando, aborta sem NUNCA gravar nada por cima.
  let res = await window.storage.get(STORAGE_KEY);
  for(let tentativa=0; res.failed && tentativa<3; tentativa++){
    await new Promise(r=>setTimeout(r, 800*(tentativa+1)));
    res = await window.storage.get(STORAGE_KEY);
  }
  if(res.failed){
    throw new Error('load-failed');
  }
  if(res.value){
    const nuvem = JSON.parse(res.value);
    if(!pareceEstado(nuvem)) throw new Error('load-failed');
    state = nuvem;
    lastSyncedAt = res.updatedAt || null;
    baseJson = res.value;
    migrateState();
    await recuperarCaixaDeSaida(nuvem);
    backupIfNeeded();
    return;
  }
  // Linha principal nao existe. So e "primeiro uso" de verdade se tambem nao
  // houver nenhum backup/copia dela — se houver, algo esta errado (linha
  // apagada, permissao): mostra erro em vez de comecar do zero.
  let temRastro;
  try{ temRastro = await window.storage.existeComPrefixo(STORAGE_KEY + '-'); }
  catch(e){ throw new Error('load-failed'); }
  if(temRastro) throw new Error('load-failed');
  state = defaultState();
  lastSyncedAt = null;
  baseJson = null;
  await persist();
}

// Edicoes que ficaram no aparelho sem subir (app fechado sem sinal, aba que
// travou): junta com a versao da nuvem e manda de novo. Se nao der pra guardar
// a copia de seguranca, NAO abre o app (a caixa de saida fica intacta pra
// proxima tentativa) — assim nada daqui some.
let recuperadas = 0;
async function recuperarCaixaDeSaida(nuvem){
  const caixas = readAllOutboxes();
  if(!caixas.length) return;
  for(const cx of caixas){
    let local, base;
    try{ local = JSON.parse(cx.state); base = cx.base ? JSON.parse(cx.base) : null; }catch(e){ apagarCaixaSeIgual(cx); continue; }
    if(!pareceEstado(local)){ apagarCaixaSeIgual(cx); continue; }
    if(base && deepEq(local, base)) { apagarCaixaSeIgual(cx); continue; } // nao tinha nada pendente
    if(deepEq(local, state)) { apagarCaixaSeIgual(cx); continue; }        // ja esta na nuvem
    if(!base){
      // sem saber de qual versao ela partiu, nao da pra juntar com seguranca:
      // guarda a versao do aparelho a parte e fica com a da nuvem
      await guardarCopia(cx.state, 'caixa-sem-base');
      avisarConflito();
      apagarCaixaSeIgual(cx);
      continue;
    }
    const { merged, conflitos } = mergeState(base, local, state);
    if(conflitos.length){
      await guardarCopia(JSON.stringify(state), 'recuperado'); // lanca erro se falhar
      avisarConflito();
    }
    state = merged;
    migrateState();
    recuperadas++;
  }
  if(recuperadas){
    dirty = true;
    writeOutbox();
    // as caixas antigas so saem depois que a nuvem confirmar (ver flushSave)
    caixasParaLimpar = caixas.filter(c=>c.k!==outboxKey());
  }else{
    caixas.forEach(apagarCaixaSeIgual);
  }
}
let caixasParaLimpar = [];

function migrateState(){
  // ensure new fields exist if state was saved by an older version
  const d = defaultState();
  if(!state.business) state.business = d.business;
  for(const k in d.business){ if(state.business[k]===undefined) state.business[k]=d.business[k]; }
  if(state.meiLimiteAnual===undefined) state.meiLimiteAnual = d.meiLimiteAnual;
  if(!state.clients) state.clients = d.clients;
  state.clients.forEach(c=>{ if(!c.tipo) c.tipo = 'fixo'; });
  // dia em que o cliente costuma fechar (so estimativa no Painel): 0 = ultimo dia do mes
  const DIA_FECHA_PADRAO = {fabio:0, wide:4, wad:8};
  state.clients.forEach(c=>{ if(c.diaFechamento===undefined) c.diaFechamento = DIA_FECHA_PADRAO[c.id] ?? 0; });
  // CNPJ do cliente (so pra copiar na hora de emitir a nota; campo novo, so acrescenta)
  state.clients.forEach(c=>{ if(c.cnpj===undefined) c.cnpj = ''; });
  if(!state.clientOrder) state.clientOrder = state.clients.map(c=>c.id);
  if(!state.videos) state.videos = {};
  if(!state.notas) state.notas = d.notas;
  if(!state.notasYears) state.notasYears = Object.keys(state.notas).sort();
  // meta de faturamento, uma por mes ("2026-09": 6000). Campo novo, so
  // acrescenta — nada do que ja existe e alterado.
  if(!state.metas || typeof state.metas!=='object') state.metas = {[monthKey(REAL_YEAR, REAL_MONTH)]: 6000};
  // dia em que cada periodo de cobranca foi fechado (campo novo, so acrescenta)
  if(!state.fechamentos || typeof state.fechamentos!=='object') state.fechamentos = {};
  // orcamentos (2026-09-29): lista nova, so acrescenta
  if(!Array.isArray(state.orcamentos)) state.orcamentos = [];
}

// Fila serializada de gravação: só existe uma gravação em andamento por vez;
// se `state` mudar de novo enquanto ela está em voo, a próxima dispara assim
// que a atual terminar, sempre lendo o `state` mais atual. A trava `saving`
// só solta no FIM de tudo (inclusive da junção com a nuvem), pra nenhuma
// busca ou outra gravação atravessar no meio.
let saving = false;
let pendingRewrite = false;
let retryTimer = null;
// o que esta aba mandou e ainda nao teve confirmacao (resposta perdida): se a
// nuvem estiver igual a uma delas, foi esta aba mesma que gravou
let enviadasSemResposta = [];
async function flushSave(){
  if(saving){ pendingRewrite = true; return; }
  clearTimeout(retryTimer);
  if(!dirty){ if(saveMode!=='error') setSaveIndicator('saved'); return; }
  saving = true;
  let erro = false;
  try{
    for(let volta=0; dirty && volta<6; volta++){
      setSaveIndicator('saving');
      dirty = false; // edicoes feitas durante a gravacao marcam de novo (persist)
      const json = JSON.stringify(state);
      enviadasSemResposta.push(json);
      if(enviadasSemResposta.length > 20) enviadasSemResposta.shift();
      const r = await window.storage.setIfUnchanged(STORAGE_KEY, json, lastSyncedAt, new Date().toISOString());
      if(r.conflict){
        // outro aparelho gravou antes: junta as duas versoes e tenta de novo
        dirty = true;
        await juntarComNuvem();
        continue;
      }
      const antes = baseJson;
      enviadasSemResposta = [];
      lastSyncedAt = r.updatedAt;
      baseJson = json;
      historicoDaGravacao(antes, json);
    }
  }catch(e){
    console.error('Falha ao salvar', e);
    erro = true;
    dirty = true;
  }finally{
    saving = false;
  }
  if(erro || dirty){
    // a edição continua na memória E no aparelho (caixa de saída): avisa e
    // tenta de novo sozinho, até dar certo
    if(erro) setSaveIndicator('error');
    retryTimer = setTimeout(()=>{ flushSave(); }, erro ? 5000 : 300);
  }else{
    setSaveIndicator('saved');
    clearOutbox();
    caixasParaLimpar.forEach(apagarCaixaSeIgual); caixasParaLimpar = [];
  }
  if(pendingRewrite){
    pendingRewrite = false;
    if(dirty && !erro) await flushSave();
  }
}

// Outro aparelho salvou depois da versão que este tinha. Nunca grava por cima
// e não descarta nada: busca a versão da nuvem e JUNTA item a item com a daqui
// (sync.js). Só se os dois aparelhos mudaram o MESMO campo de jeitos
// diferentes, fica o daqui e o de lá é guardado numa linha à parte
// (`-conflito-`) ANTES de qualquer troca. Lança erro se a rede falhar (a
// gravação então tenta de novo, sem ter mudado nada).
async function juntarComNuvem(){
  const res = await window.storage.get(STORAGE_KEY);
  if(res.failed || !res.value) throw new Error('nuvem-indisponivel');
  const nuvem = JSON.parse(res.value);
  if(!pareceEstado(nuvem)) throw new Error('nuvem-invalida');
  if(!baseJson){
    // sem base (primeiro uso, a linha foi criada por outro aparelho nesse
    // meio-tempo): juntar "no chute" faria o estado-semente daqui ganhar da
    // nuvem. Guarda o daqui à parte e fica com a da nuvem.
    await guardarCopia(JSON.stringify(state), 'sem-base');
    avisarConflito();
    state = nuvem; migrateState();
    lastSyncedAt = res.updatedAt || null; baseJson = res.value;
    dirty = false; enviadasSemResposta = [];
    ui.toast = null;
    renderPreserveFocus();
    return;
  }
  let base = JSON.parse(baseJson);
  // uma gravação DESTA aba chegou lá, só a resposta se perdeu: a base passa a
  // ser ela (senão pareceria que "o outro aparelho" mudou)
  if(enviadasSemResposta.some(j => deepEq(nuvem, JSON.parse(j)))) base = nuvem;
  enviadasSemResposta = [];
  let { conflitos } = mergeState(base, state, nuvem);
  if(conflitos.length){
    await guardarCopia(res.value, 'outro-aparelho'); // lança erro se falhar: nada muda
    avisarConflito();
  }
  // recalcula AGORA (sem nenhum await no meio), com o `state` mais atual —
  // inclusive o que foi digitado enquanto a busca acontecia
  const { merged } = mergeState(base, state, nuvem);
  lastSyncedAt = res.updatedAt || null;
  baseJson = res.value;
  // so precisa gravar de novo se a junção tem algo que a nuvem ainda não tem
  dirty = !deepEq(merged, nuvem);
  if(deepEq(merged, state)){
    // nada novo nos dados daqui, mas o aviso de conflito precisa aparecer
    if(conflitos.length) renderQuandoPuder();
    return;
  }
  state = merged;
  migrateState();
  writeOutbox();
  // um "Desfazer" aberto apontaria pra objetos da versão antiga
  ui.toast = null;
  renderQuandoPuder();
}

// Redesenhar a tela no meio da digitação de um texto quebra acento (^ + a
// vira "^a"). Se a pessoa está num campo de texto livre, espera ela sair dele.
let renderPendente = false;
function digitandoTextoLivre(){
  const a = document.activeElement;
  if(!a || !a.dataset || !a.dataset.role) return false;
  if(a.tagName === 'TEXTAREA') return true;
  return a.tagName === 'INPUT' && a.type === 'text' && a.dataset.field !== 'valor' && a.dataset.role !== 'limite-field';
}
function renderQuandoPuder(){
  if(digitandoTextoLivre()){ renderPendente = true; return; }
  renderPendente = false;
  renderPreserveFocus();
}

async function guardarCopia(json, motivo){
  const d = new Date();
  const hora = `${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
  const idCopia = `${STORAGE_KEY}-conflito-${localISO(d)}-${hora}`;
  await window.storage.set(idCopia, json);
  registrarHistorico({ acao: 'conflito', resumo: `${motivo}: cópia guardada em ${idCopia}` });
  return idCopia;
}
function avisarConflito(){
  const d = new Date();
  ui.conflito = {quando: `${ddmm(localISO(d))} às ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
}

function persist(){
  dirty = true;
  writeOutbox();
  setSaveIndicator('saving');
  clearTimeout(saveTimer);
  return new Promise(resolve=>{
    saveTimer = setTimeout(async ()=>{
      await flushSave();
      resolve();
    }, 300);
  });
}

// Busca a versao mais nova da nuvem quando outro aparelho salvou algo — so se
// este aparelho nao tiver edicao pendente (se tiver, a gravacao junta as duas).
let puxando = false;
let ultimaPuxada = 0;
async function puxarSeMudou(){
  if(!state || dirty || saving || puxando) return;
  puxando = true;
  try{
    const s = await window.storage.getStamp(STORAGE_KEY);
    if(s.failed || !s.updatedAt) return;
    ultimaPuxada = Date.now();
    if(lastSyncedAt && Date.parse(s.updatedAt) === Date.parse(lastSyncedAt)) return;
    const res = await window.storage.get(STORAGE_KEY);
    if(res.failed || !res.value) return;
    if(dirty || saving) return; // editou enquanto buscava: a gravacao junta
    const nuvem = JSON.parse(res.value);
    if(!pareceEstado(nuvem)) return;
    state = nuvem;
    lastSyncedAt = res.updatedAt || null;
    baseJson = res.value;
    migrateState();
    ui.toast = null; // um "Desfazer" aberto apontaria pra versao antiga
    renderQuandoPuder();
  }catch(e){
    console.error('Falha ao buscar versão nova', e);
  }finally{
    puxando = false;
  }
}

// Se o app for pra segundo plano (troca de app no celular, tela apagando)
// ou a aba fechar logo depois de uma edição, dispara a gravação pendente na
// hora. SO grava se houver edicao (dirty): gravar sem editar era o que fazia
// um aparelho com dados velhos apagar o que o outro lancou. (E mesmo que o
// sistema mate o app no meio, a edicao esta na caixa de saida.)
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden' && state){
    if(dirty){ clearTimeout(saveTimer); flushSave(); }
  } else if(document.visibilityState === 'visible' && state){
    if(refreshToday()) renderPreserveFocus();
    puxarSeMudou();
    if(dirty) flushSave();
  }
});
window.addEventListener('focus', () => { puxarSeMudou(); });
// voltou a internet: manda o que estiver pendente e busca a versao nova
window.addEventListener('online', () => { if(!state) return; if(dirty) flushSave(); else puxarSeMudou(); enviarHistorico(); });
// a cada minuto: vira o dia a meia-noite, faz o backup diario com o app
// aberto e percebe quando o Mac acordou (relogio pulou) pra buscar na hora
let ultimoTique = Date.now();
setInterval(()=>{
  const agora = Date.now();
  const acordou = agora - ultimoTique > 120000;
  ultimoTique = agora;
  if(!state) return;
  if(document.visibilityState==='visible' && refreshToday()) renderPreserveFocus();
  if(renderPendente && !digitandoTextoLivre()) renderQuandoPuder();
  backupIfNeeded();
  enviarHistorico();
  if(acordou){ puxarSeMudou(); if(dirty) flushSave(); }
}, 60000);
// janela do Mac que fica aberta o dia todo sem sair da tela: confere a cada 30s
setInterval(()=>{ if(document.visibilityState==='visible') puxarSeMudou(); }, 30000);
window.addEventListener('pagehide', () => {
  if(state && dirty){
    clearTimeout(saveTimer);
    flushSave();
  }
});
// fechar a janela com algo ainda subindo: o navegador pergunta antes
window.addEventListener('beforeunload', (e) => {
  if(state && (dirty || saving)){ e.preventDefault(); e.returnValue = ''; }
});

let saveMode = 'saved';
function setSaveIndicator(mode){
  saveMode = mode;
  const el = document.getElementById('savestate');
  if(!el) return;
  if(mode==='saving'){ el.textContent='salvando…'; el.classList.add('saving'); el.classList.remove('error'); }
  else if(mode==='saved'){ el.textContent='salvo'; el.classList.remove('saving','error'); }
  else { el.textContent='erro ao salvar — verifique a conexão'; el.classList.remove('saving'); el.classList.add('error'); }
}

/* ---------------- helpers ---------------- */
function parseBRL(v){
  if(typeof v === 'number') return isNaN(v) ? 0 : v;
  let s = String(v==null?'':v).trim();
  if(s==='') return 0;
  s = s.replace(/[^0-9.,-]/g,'');
  if(s.includes(',')){
    s = s.replace(/\./g,'').replace(',', '.');
  } else if(/^-?\d{1,3}(\.\d{3})+$/.test(s)){
    // "1.500" ou "12.000" sem virgula: o ponto e de milhar (jeito brasileiro),
    // nao decimal — antes virava R$ 1,50
    s = s.replace(/\./g,'');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function fmtBRL(n){
  const num = typeof n === 'number' ? (isNaN(n)?0:n) : parseBRL(n);
  return num.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function valorDisplay(v){
  // while the person is actively typing, v is the raw string they're entering —
  // show it verbatim so we don't fight their keystrokes. Once normalized
  // (a real number), show it fully formatted as currency, comma decimals.
  return typeof v === 'string' ? v : fmtBRL(v);
}
function fmtDateBR(iso){
  if(!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function clientById(id){ return state.clients.find(c=>c.id===id); }
function monthKey(year, m){ return `${year}-${m}`; }
function initials(name){
  const parts = (name||'').trim().split(/\s+/).filter(Boolean);
  if(parts.length===0) return '?';
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0]+parts[1][0]).toUpperCase();
}
function chipClass(clientId){
  const idx = state.clientOrder.indexOf(clientId);
  return 'chip-' + (((idx<0?0:idx))%3);
}

/* ---------------- limite MEI (shared by the stats row + Faturamento hero) ---------------- */
function limiteProgress(year){
  const total = notasYearTotal(year);
  const limite = parseBRL(state.meiLimiteAnual)||81000;
  const pct = Math.min((total/limite)*100, 999);
  const pctClamped = Math.min(pct,100);
  const restante = limite - total;
  let msgClass='', msg='';
  if(pct>=100){ msgClass='danger'; msg=`Limite ultrapassado em R$ ${fmtBRL(Math.abs(restante))}. Fique atento ao desenquadramento do MEI.`; }
  else if(pct>=90){ msgClass='warn'; msg=`Faltam R$ ${fmtBRL(restante)} para o limite anual — atenção.`; }
  else { msg = `Faltam R$ ${fmtBRL(restante)} para o limite anual de R$ ${fmtBRL(limite)}.`; }
  return {total, limite, pct, pctClamped, msgClass, msg, restante};
}

/* ---------------- motion helpers ----------------
   render() rebuilds the whole #app subtree every time (see render(), below),
   so a freshly-created element has no "previous state" for a plain CSS
   transition to animate from. These helpers do a small FLIP-style shim:
   snap to the last known geometry/value with transitions off, force a
   reflow, then apply the new value with transitions back on. @keyframes-based
   entrances (.row-enter) don't need this — they always animate from their
   own `from` state on a freshly-inserted element. */
function prefersReducedMotion(){
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let sliderGeom = {};
function syncSlider(key, pillSel, activeSel){
  const pill = document.querySelector(pillSel);
  const active = document.querySelector(activeSel);
  if(!pill || !active) return;
  const target = {left:active.offsetLeft, top:active.offsetTop, width:active.offsetWidth, height:active.offsetHeight};
  const reduced = prefersReducedMotion();
  const prev = sliderGeom[key];
  // Sem geometria anterior (primeiro paint) o pill partiria de 0,0 e
  // deslizaria ate o lugar — por meio segundo ele aponta o mes errado.
  // Entao a primeira colocacao e feita sem transicao, no destino.
  const snapTo = prev || target;
  if(!reduced){
    pill.style.transition = 'none';
    pill.style.transform = `translate(${snapTo.left}px,${snapTo.top}px)`;
    pill.style.width = snapTo.width+'px'; pill.style.height = snapTo.height+'px';
    pill.offsetHeight; // force reflow so the "no transition" snap actually commits
    pill.style.transition = '';
  }
  const apply = () => {
    pill.style.opacity = '1';
    pill.style.transform = `translate(${target.left}px,${target.top}px)`;
    pill.style.width = target.width+'px'; pill.style.height = target.height+'px';
    sliderGeom[key] = target;
  };
  reduced ? apply() : requestAnimationFrame(apply);
}

// Digitar num campo de valor aciona renderPreserveFocus() (um render() completo)
// a cada tecla — sem essa guarda, a entrada escalonada das linhas replayaria a
// cada caractere digitado. Só reanima quando o "escopo" (cliente+mês, ou ano de
// notas) realmente muda.
let lastAnimatedScope = null;
function shouldAnimateRows(scopeKey){
  const changed = scopeKey !== lastAnimatedScope;
  lastAnimatedScope = scopeKey;
  return changed;
}

/* ---------------- small inline icons (rail nav + stats row) ---------------- */
function iconDoc(size=15){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>`;}
function iconGear(size=15){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1L15 3h-6l-.3 2.6a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1L9 21h6l.3-2.6a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6Z"/></svg>`;}

function getVideos(clientId, ym){
  if(!state.videos[clientId]) state.videos[clientId] = {};
  if(!state.videos[clientId][ym]) state.videos[clientId][ym] = [];
  return state.videos[clientId][ym];
}
// so leitura: nao cria mes vazio nos dados (getVideos cria — use so pra editar)
function videosDe(clientId, ym){
  return (state.videos[clientId] && state.videos[clientId][ym]) || [];
}
function monthTotal(clientId, ym){
  const rows = (state.videos[clientId] && state.videos[clientId][ym]) || [];
  return rows.reduce((s,r)=> s + (parseBRL(r.valor)), 0);
}
function clientYearTotal(clientId, year){
  let t = 0;
  MESES.forEach(m=>{ t += monthTotal(clientId, monthKey(year, m.k)); });
  return t;
}
function notasYearTotal(year){
  const rows = state.notas[year] || [];
  return rows.reduce((s,r)=> s + (parseBRL(r.valor)), 0);
}
function notasMonthlyBreakdown(year){
  const buckets = Object.fromEntries(MESES.map(m=>[m.k,0]));
  let semData = 0;
  (state.notas[year]||[]).forEach(r=>{
    if(r.data){
      const m = r.data.slice(5,7);
      if(buckets[m]!==undefined) buckets[m]+= parseBRL(r.valor);
    } else {
      semData += parseBRL(r.valor);
    }
  });
  return {buckets, semData};
}

/* ---------------- UI state (not persisted) ---------------- */
let ui = {
  screen: 'painel', // 'painel' (so leitura: graficos, meta) | 'lanc' (abas, tabelas, config)
  screenAnim: false, // true so no render logo apos trocar de tela
  metaEditing: false,
  metaYm: null, // mes do cartao da meta e do "Por cliente" (null = mes atual) — so tela, nao e salvo
  metaEditYm: null, // mes da meta que esta sendo editada
  metaDraft: '', // texto sendo digitado na meta — sobrevive a um render() no meio da digitacao
  metaFocus: false,
  orcId: null, // orcamento aberto na aba Orcamentos (null = lista) — so tela
  semanasYm: null, // mes do cartao "Semana a semana" (null = mes atual) — so tela, nao e salvo
  ordemDesc: lsGet(`ritmo-ordem:${STORAGE_KEY}`)==='desc', // true = mais recentes primeiro (so tela)
  cal: null, // calendario aberto: {tipo:'video'|'nota', client, ym, year, row, mes:'AAAA-MM'}
  fecharJanela: null, // {cid, ym, etapa:'dados'|'feito'} enquanto a janela de fechar periodo esta aberta
  confirmClose: null, // 'clientId|ym' enquanto a confirmacao de fechar periodo esta aberta
  tab: null, // clientId | 'FATURAMENTO' | 'CONFIG' | 'ORCAMENTOS'
  clientView: {}, // clientId -> {year, month}
  fatYear: REAL_YEAR,
  addingClient: false,
  addingClientTipo: 'fixo', // 'fixo' | 'esporadico'
  deleteArm: {}, // key -> timestamp, for two-step delete buttons
  toast: null,
  valuesHidden: false, // privacy toggle — device-local preference, not synced
  conflito: null, // {quando} — aviso de que os dois aparelhos mudaram o mesmo item (ver juntarComNuvem)
  pendingImport: null // {data, fileName} — set while confirming a restore, before it overwrites everything
};

const PRIVACY_KEY = 'jnf-privacy-hidden';
try{ ui.valuesHidden = localStorage.getItem(PRIVACY_KEY) === '1'; }catch(e){}
document.body.classList.toggle('privacy-on', ui.valuesHidden);

function ensureClientView(clientId){
  if(!ui.clientView[clientId]){
    // abre no periodo de cobranca aberto do cliente, nao no mes do calendario
    const ym = (state && clientById(clientId)) ? periodoAberto(clientId) : monthKey(REAL_YEAR, REAL_MONTH);
    ui.clientView[clientId] = {year: ym.slice(0,4), month: ym.slice(5,7)};
  }
  return ui.clientView[clientId];
}

function armDelete(key){
  ui.deleteArm[key] = Date.now();
  render();
  setTimeout(()=>{
    if(ui.deleteArm[key] && Date.now()-ui.deleteArm[key] >= 3800){
      delete ui.deleteArm[key];
      renderPreserveFocus();
    }
  }, 4000);
}
function isArmed(key){
  return !!(ui.deleteArm[key] && Date.now()-ui.deleteArm[key] < 4000);
}

function showToast(msg, undoFn){
  ui.toast = {msg, undoFn, id: uid('t')};
  render();
  const myId = ui.toast.id;
  setTimeout(()=>{
    if(ui.toast && ui.toast.id===myId){ ui.toast=null; renderPreserveFocus(); }
  }, 10000);
}

/* ---------------- marca Ritmo ---------------- */
// icone (versao creme aprovada em 2026-09-27) desenhado aqui mesmo, sem arquivo
// marca: notinha saindo da maquininha com o check. Parada no cabecalho (o render
// recria a tela a cada acao, a animacao reiniciaria); animada so no carregamento.
const RITMO_ICONE = `<svg viewBox="0 0 1024 1024" aria-hidden="true"><defs><linearGradient id="rtmbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4D6039"/><stop offset="1" stop-color="#27321F"/></linearGradient><linearGradient id="rtmgl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><filter id="rtmsh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-opacity=".38"/></filter></defs><rect x="100" y="100" width="824" height="824" rx="185" fill="url(#rtmbg)"/><svg x="100" y="100" width="824" height="824" viewBox="0 0 100 100"><defs>
<linearGradient id="rtmsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9CE97"/><stop offset="1" stop-color="#5F7248"/></linearGradient>
<linearGradient id="rtmpp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFDF7"/><stop offset="1" stop-color="#EFE7D3"/></linearGradient>
<filter id="rtmps" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#0b0f07" flood-opacity=".45"/></filter>
<clipPath id="rtmcl"><rect x="0" y="16" width="100" height="90"/></clipPath></defs>
<g clip-path="url(#rtmcl)"><g filter="url(#rtmps)">
<path d="M29 14h42v70l-7-4.5-7 4.5-7-4.5-7 4.5-7-4.5-7 4.5z" fill="url(#rtmpp)"/>
<rect x="36" y="24" width="20" height="3.2" rx="1.6" fill="#B9AE92"/><rect x="36" y="31" width="28" height="3.2" rx="1.6" fill="#D6CCB2"/><rect x="36" y="38" width="24" height="3.2" rx="1.6" fill="#D6CCB2"/>
</g></g>
<rect x="24" y="10" width="52" height="6" rx="3" fill="#1B2415"/><rect x="26" y="10.8" width="48" height="1.6" rx=".8" fill="#fff" opacity=".18"/>
<g style="transform-box:fill-box;transform-origin:center"><circle cx="57" cy="60" r="11" fill="url(#rtmsg)" filter="url(#rtmps)"/><circle cx="57" cy="60" r="11" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/></g>
<path d="M51.2 60.2l4.2 4.2 7.6-8.6" pathLength="1" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg><rect x="100" y="100" width="824" height="824" rx="185" fill="url(#rtmgl)"/><rect x="104" y="104" width="816" height="816" rx="181" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="5"/></svg>`;
const RITMO_ICONE_ANIM = `<svg viewBox="0 0 1024 1024" aria-hidden="true"><defs><linearGradient id="rtabg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4D6039"/><stop offset="1" stop-color="#27321F"/></linearGradient><linearGradient id="rtagl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><filter id="rtash" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-opacity=".38"/></filter></defs><rect x="100" y="100" width="824" height="824" rx="185" fill="url(#rtabg)"/><svg x="100" y="100" width="824" height="824" viewBox="0 0 100 100"><defs>
<linearGradient id="rtasg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9CE97"/><stop offset="1" stop-color="#5F7248"/></linearGradient>
<linearGradient id="rtapp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFDF7"/><stop offset="1" stop-color="#EFE7D3"/></linearGradient>
<filter id="rtaps" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#0b0f07" flood-opacity=".45"/></filter>
<clipPath id="rtacl"><rect x="0" y="16" width="100" height="90"/></clipPath></defs>
<g clip-path="url(#rtacl)"><g class="rn-paper" filter="url(#rtaps)">
<path d="M29 14h42v70l-7-4.5-7 4.5-7-4.5-7 4.5-7-4.5-7 4.5z" fill="url(#rtapp)"/>
<rect x="36" y="24" width="20" height="3.2" rx="1.6" fill="#B9AE92"/><rect x="36" y="31" width="28" height="3.2" rx="1.6" fill="#D6CCB2"/><rect x="36" y="38" width="24" height="3.2" rx="1.6" fill="#D6CCB2"/>
</g></g>
<rect x="24" y="10" width="52" height="6" rx="3" fill="#1B2415"/><rect x="26" y="10.8" width="48" height="1.6" rx=".8" fill="#fff" opacity=".18"/>
<g class="rn-circ" style="transform-box:fill-box;transform-origin:center"><circle cx="57" cy="60" r="11" fill="url(#rtasg)" filter="url(#rtaps)"/><circle cx="57" cy="60" r="11" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/></g>
<path class="rn-ck" d="M51.2 60.2l4.2 4.2 7.6-8.6" pathLength="1" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg><rect x="100" y="100" width="824" height="824" rx="185" fill="url(#rtagl)"/><rect x="104" y="104" width="816" height="816" rx="181" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="5"/></svg>`;
const BETA = import.meta.env.MODE === 'beta';

/* ---------------- rendering ---------------- */
function esc(s){
  return (s===undefined||s===null?'':String(s))
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}


/* ---------------- períodos de cobrança (fechamento por cliente) ----------------
   Cada aba de mês do cliente é o período de cobrança dele (a Wide "Setembro"
   vai de 05/09 a 04/10; a WAD fecha dia 7, 8 ou 9 — quando o Joel apertar).
   Fechar = lançar a nota do período e passar a abrir o mês seguinte.
   state.fechamentos[clientId][ym]:
     {data:'YYYY-MM-DD', notaId, valor}  -> período fechado
     {aberto:true, notaId}               -> reaberto (lembra a nota pra, ao
                                            fechar de novo, atualizar em vez de duplicar) */
function shiftYm(ym, n){
  const [y,m] = ym.split('-').map(Number);
  const d = new Date(y, m-1+n, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function ymDiff(a, b){
  const [ya,ma] = a.split('-').map(Number), [yb,mb] = b.split('-').map(Number);
  return (ya*12+ma) - (yb*12+mb);
}
function diasEntre(isoA, isoB){
  const [ya,ma,da] = isoA.split('-').map(Number), [yb,mb,db] = isoB.split('-').map(Number);
  return Math.round((new Date(yb,mb-1,db) - new Date(ya,ma-1,da)) / 86400000);
}
function fechamentoDe(cid, ym){
  const f = state.fechamentos && state.fechamentos[cid];
  return f && f[ym] ? f[ym] : null;
}
function periodoFechado(cid, ym){
  const f = fechamentoDe(cid, ym);
  return !!(f && !f.aberto && f.data);
}
// o período aberto do cliente: o mês seguinte ao último fechado; sem nenhum
// fechamento ainda, o último mês (até o atual) que tem vídeo; senão o mês atual
function periodoAberto(cid){
  const atual = monthKey(REAL_YEAR, REAL_MONTH);
  const f = (state.fechamentos && state.fechamentos[cid]) || {};
  const fechados = Object.keys(f).filter(k=>periodoFechado(cid, k)).sort();
  if(fechados.length) return shiftYm(fechados[fechados.length-1], 1);
  const vids = state.videos[cid] || {};
  const comVideo = Object.keys(vids).filter(k=>k<=atual && (vids[k]||[]).length).sort();
  return comVideo.length ? comVideo[comVideo.length-1] : atual;
}
// quando o período costuma fechar (só pra estimativa): dia 0 = último dia do
// próprio mês (Fábio); dia N = dia N do mês seguinte (Wide 4, WAD 8)
function fechamentoPrevisto(cid, ym){
  const c = clientById(cid);
  const dia = c ? (Number(c.diaFechamento)||0) : 0;
  const [y,m] = ym.split('-').map(Number);
  if(!dia) return localISO(new Date(y, m, 0));
  const lim = new Date(y, m+1, 0).getDate();
  return localISO(new Date(y, m, Math.min(dia, lim)));
}
function inicioPeriodo(cid, ym){
  const ant = fechamentoDe(cid, shiftYm(ym,-1));
  if(ant && !ant.aberto && ant.data) return ant.data;
  const datas = ((state.videos[cid]||{})[ym]||[]).map(r=>r.data).filter(Boolean).sort();
  return datas[0] || null;
}
function acharNota(id){
  if(!id) return null;
  for(const y of Object.keys(state.notas||{})){
    const idx = (state.notas[y]||[]).findIndex(n=>n.id===id);
    if(idx>=0) return {year:y, idx, nota:state.notas[y][idx]};
  }
  return null;
}
function nomeMesYm(ym, comAno){
  const [y,m] = ym.split('-');
  return MES_NOME[m].toLowerCase() + (comAno || y!==REAL_YEAR ? ` de ${y}` : '');
}

// produção do mês pela ABA em que o vídeo foi lançado (pedido do Joel em
// 2026-10-01): cada aba de mês do cliente é o período de cobrança dele, então
// um vídeo de 02/10 lançado na aba "Setembro" da WAD conta na meta de setembro
// e só passa pra outubro quando ele fechar a WAD e lançar na aba de outubro.
// (Os gráficos de dia e de semana continuam pela data do vídeo.)
function producaoDoMes(ym){
  const porCliente = {};
  state.clientOrder.forEach(cid=>{
    const rows = (state.videos[cid]||{})[ym];
    (rows||[]).forEach(r=>{
      if(!r) return;
      const e = porCliente[cid] || (porCliente[cid] = {v:0, n:0});
      e.v += parseBRL(r.valor); e.n += 1;
    });
  });
  return porCliente;
}
// clientes com vídeo na aba do mês que ainda não fecharam esse período
function abertosDoMes(ym){
  return state.clientOrder.filter(cid=>{
    const rows = (state.videos[cid]||{})[ym];
    return rows && rows.length && !periodoFechado(cid, ym);
  });
}
function nomeCurto(cid){
  const c = clientById(cid);
  return c && c.nome ? c.nome.trim().split(/\s+/)[0] : cid;
}
function listaNomes(arr){
  return arr.length<=1 ? arr.join('') : arr.slice(0,-1).join(', ') + ' e ' + arr[arr.length-1];
}
// mês mostrado no cartão da meta e no "Por cliente" — só tela, não é salvo.
// null = mês atual. Vai do mês mais antigo com aba até o mês atual.
function metaYm(){
  const atual = monthKey(REAL_YEAR, REAL_MONTH);
  let ym = ui.metaYm || atual;
  if(ym > atual) ym = atual;
  const primeiro = semanasPrimeiroYm({});
  if(ym < primeiro) ym = primeiro;
  return ym;
}

function painelCobrar(){
  const cards = state.clientOrder.map(id=>{
    const c = clientById(id);
    if(!c) return '';
    const ym = periodoAberto(id);
    const rows = (state.videos[id]||{})[ym] || [];
    const total = monthTotal(id, ym);
    const ant = fechamentoDe(id, shiftYm(ym,-1));
    const fechouHoje = ant && !ant.aberto && ant.data===TODAY_ISO;
    const prevista = fechamentoPrevisto(id, ym);
    const dias = diasEntre(TODAY_ISO, prevista);
    const aprox = Number(c.diaFechamento)||0;
    let pill;
    if(fechouHoje) pill = `<span class="pill fresh">recomeçou</span>`;
    else if(dias < 0) pill = `<span class="pill late">${plural(-dias,'dia','dias')} depois do previsto</span>`;
    else if(dias === 0) pill = `<span class="pill soon">fecha hoje</span>`;
    else if(dias <= 5) pill = `<span class="pill soon">fecha em ${plural(dias,'dia','dias')}</span>`;
    else pill = `<span class="pill ok">em andamento</span>`;
    const desde = inicioPeriodo(id, ym);
    const quando = dias>0 ? `em ${plural(dias,'dia','dias')}` : dias===0 ? 'hoje' : '';
    const rodape = fechouHoje
      ? `<span>${MES_NOME[shiftYm(ym,-1).slice(5)]} fechado hoje · nota de <b class="sensitive">R$ ${fmtBRL(parseBRL(ant.valor))}</b></span>`
      : `<span>Fecha ${aprox ? 'por volta de' : 'dia'} <b>${ddmm(prevista)}</b></span><span>${quando}</span>`;
    return `<button type="button" class="card cob" data-action="abrir-cliente" data-client="${id}">
      <span class="top"><span class="chip ${chipClass(id)}">${esc(initials(c.nome))}</span><span class="nm">${esc(c.nome)}</span>${pill}</span>
      <span class="per">Período de ${nomeMesYm(ym)}</span><span class="big sensitive">R$ ${fmtBRL(total)}</span>
      <span class="sub">${plural(rows.length,'vídeo','vídeos')}${desde ? ` · desde ${ddmm(desde)}` : ''}</span>
      <span class="close-l">${rodape}</span>
    </button>`;
  }).join('');
  const emAberto = state.clientOrder.reduce((s,id)=> s + (clientById(id) ? monthTotal(id, periodoAberto(id)) : 0), 0);
  return `<div class="sec-head"><h2>A cobrar${novoTag()}</h2><span class="sub">em aberto: <b class="sensitive">R$ ${fmtBRL(emAberto)}</b> · toque num cliente pra abrir</span></div>
    <div class="cob-row${state.clientOrder.length>3?' rola':''}">${cards}</div>`;
}

// bloco do período na aba do cliente: status + botão de fechar (com confirmação)
function periodoStatusHtml(cid, ym, total){
  const f = fechamentoDe(cid, ym);
  if(periodoFechado(cid, ym)){
    const diverge = Math.abs(parseBRL(f.valor) - total) > 0.004;
    const notaSumiu = f.notaId && !acharNota(f.notaId);
    const aviso = notaSumiu
      ? ` <b class="warn-t">A nota deste período foi apagada de Notas emitidas — reabra e feche de novo pra lançar outra.</b>`
      : diverge ? ` <b class="warn-t">O total agora é <span class="sensitive">R$ ${fmtBRL(total)}</span> — reabra e feche de novo pra atualizar a nota.</b>` : '';
    return `<div class="periodo-banner">
      <span>✓ Período fechado em ${ddmm(f.data)} · nota de <b class="sensitive">R$ ${fmtBRL(parseBRL(f.valor))}</b>${notaSumiu ? '' : ' lançada em Notas emitidas'}.${aviso}</span>
      <button type="button" data-action="reabrir-periodo" data-client="${cid}" data-ym="${ym}">Reabrir período</button>
    </div>`;
  }
  if(ym === periodoAberto(cid)){
    const c = clientById(cid);
    const desde = inicioPeriodo(cid, ym);
    const aprox = c && (Number(c.diaFechamento)||0);
    return `<div class="periodo-info"><span class="tagp aberto">período aberto</span>
      <span>${MES_NOME[ym.slice(5)]}${desde ? ` · desde ${ddmm(desde)}` : ''} · fecha ${aprox ? 'por volta de' : 'dia'} ${ddmm(fechamentoPrevisto(cid, ym))}</span></div>`;
  }
  return '';
}

/* ---------------- aparencia: claro / escuro / automatico (2026-09-29) ---------------- */
// so tela, guardado no aparelho (localStorage). O index.html aplica antes de desenhar.
const TEMA_KEY = 'ritmo-tema';
function temaAtual(){ const t = lsGet(TEMA_KEY); return t==='claro' || t==='escuro' ? t : 'auto'; }
const escuroSistema = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function aplicarTema(){
  const t = temaAtual();
  const escuro = t==='escuro' || (t==='auto' && !!(escuroSistema && escuroSistema.matches));
  document.documentElement.classList.toggle('escuro', escuro);
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = escuro ? '#171B14' : '#E8E1D0';
}
if(escuroSistema){
  const mudou = ()=>{ if(temaAtual()==='auto') aplicarTema(); };
  if(escuroSistema.addEventListener) escuroSistema.addEventListener('change', mudou);
  else if(escuroSistema.addListener) escuroSistema.addListener(mudou);
}
aplicarTema();

/* ---------------- lista virada + calendario (2026-09-29) ---------------- */
// devolve [linha, indice guardado] na ordem da tela; a ordem salva nunca muda
function ordenar(rows){
  const pares = rows.map((r,i)=>[r,i]);
  return ui.ordemDesc ? pares.reverse() : pares;
}
const ICONE_CAL = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;
function botaoData(iso, attrs){
  const txt = iso ? iso.split('-').reverse().join('/') : 'sem data';
  return `<button type="button" class="cell-date${iso?'':' vazia'}" data-action="abrir-cal" ${attrs} aria-label="Data: ${txt}. Toque pra mudar">${ICONE_CAL}<span>${txt}</span></button>`;
}
function calLinha(){
  const c = ui.cal;
  if(!c) return null;
  if(c.tipo==='video') return getVideos(c.client, c.ym).find(r=>r.id===c.row) || null;
  return (state.notas[c.year]||[]).find(r=>r.id===c.row) || null;
}
const MES_LONGO = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function calendarioHtml(){
  const linha = calLinha();
  if(!linha){ ui.cal = null; return ''; }
  const sel = linha.data || '';
  const [y, m] = ui.cal.mes.split('-').map(Number);
  const comVideo = ui.cal.tipo==='video' ? videosPorData() : {};
  const primeiro = new Date(y, m-1, 1).getDay();
  const nDias = new Date(y, m, 0).getDate();
  const total = Math.ceil((primeiro + nDias)/7)*7;
  let dias = '';
  for(let k=0; k<total; k++){
    const dt = new Date(y, m-1, 1 + k - primeiro);
    const iso = localISO(dt);
    const fora = dt.getMonth() !== m-1;
    const cls = [fora?'fora':'', iso===TODAY_ISO?'hoje':'', iso===sel?'sel':''].filter(Boolean).join(' ');
    dias += `<button type="button" class="${cls}" data-action="cal-dia" data-dia="${iso}" aria-label="${dt.getDate()} de ${MES_LONGO[dt.getMonth()]}${iso===sel?' (escolhido)':''}">${dt.getDate()}${comVideo[iso] && !fora ? '<i></i>' : ''}</button>`;
  }
  const limpar = ui.cal.tipo==='nota' && sel ? `<button type="button" data-action="cal-limpar">Sem data</button>` : '';
  return `<div class="cal-veu" data-action="cal-fechar"></div>
  <div class="cal-pop" role="dialog" aria-modal="true" aria-label="Escolher data">
    <span class="cal-alca"></span>
    <div class="cal-top"><b>${MES_LONGO[m-1]} <span>${y}</span></b>
      <div class="cal-nav"><button type="button" data-action="cal-mes" data-dir="-1" aria-label="Mês anterior">‹</button><button type="button" data-action="cal-mes" data-dir="1" aria-label="Próximo mês">›</button></div></div>
    <div class="cal-sem" aria-hidden="true"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
    <div class="cal-dias">${dias}</div>
    <div class="cal-pe">${ui.cal.tipo==='video' ? '<span class="cal-leg"><i></i>dia com vídeo</span>' : limpar || '<span></span>'}<button type="button" data-action="cal-dia" data-dia="${TODAY_ISO}">Hoje</button></div>
  </div>`;
}
// no Mac o calendario flutua perto da data tocada; no celular (CSS) sobe de baixo
function posicionarCalendario(){
  const pop = document.querySelector('.cal-pop');
  if(!pop || window.innerWidth <= 820) return;
  const c = ui.cal;
  const sel = c.tipo==='video'
    ? `.cell-date[data-tipo="video"][data-row="${c.row}"]`
    : `.cell-date[data-tipo="nota"][data-row="${c.row}"]`;
  const alvo = document.querySelector(sel);
  if(!alvo) return;
  const r = alvo.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let top = r.bottom + 8;
  if(top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 8);
  const left = Math.min(Math.max(12, r.left + r.width/2 - w/2), window.innerWidth - w - 12);
  pop.style.top = top + 'px';
  pop.style.left = left + 'px';
}

function fecharPeriodoHtml(cid, ym, rows, total){
  if(periodoFechado(cid, ym)) return '';
  return `<button class="btn gold" data-action="fechar-periodo" data-client="${cid}" data-ym="${ym}" ${rows.length===0?'disabled':''}>Fechar período</button>`;
}

// janela de fechar periodo: card de vidro no Mac, tela cheia no celular (CSS)
function janelaFecharHtml(){
  const j = ui.fecharJanela;
  if(!j) return '';
  const c = clientById(j.cid);
  if(!c) return '';
  const total = monthTotal(j.cid, j.ym);
  const f = fechamentoDe(j.cid, j.ym);
  const desde = inicioPeriodo(j.cid, j.ym);
  const faixa = `${desde ? ddmm(desde)+' a ' : ''}${ddmm(fechamentoPrevisto(j.cid, j.ym))}`;
  const campo = (rot, valor) => `<div class="fj-campo"><div class="fj-v"><span class="fj-k">${rot}</span><span class="sensitive">${esc(valor)}</span></div><button type="button" class="fj-copiar" data-action="copiar" data-copy="${esc(valor)}">Copiar</button></div>`;
  if(j.etapa==='feito'){
    const antes = f ? parseBRL(f.valor) : total;
    return `<div class="fj-veu"><div class="fj-janela" role="dialog" aria-modal="true" aria-label="Nota lançada">
      <div class="fj-topo"><h2>Nota lançada</h2><button type="button" class="fj-x" data-action="fechar-janela" aria-label="Fechar janela">✕</button></div>
      <div class="fj-ok"><b>✓ ${esc(c.nome)} · <span class="sensitive">R$ ${fmtBRL(antes)}</span></b><span>Entrou em Notas emitidas e já conta no limite MEI.</span></div>
      <span class="fj-rot">Quer guardar o relatório do mês?</span>
      <button type="button" class="btn primary" data-action="fechar-salvar-rel">Salvar relatório do mês (PDF)</button>
      <button type="button" class="btn" data-action="fechar-janela">Agora não, gero depois</button>
    </div></div>`;
  }
  const cnpj = (c.cnpj||'').trim();
  const cnpjHtml = cnpj
    ? campo('CNPJ do cliente', cnpj)
    : `<div class="fj-vazio">Este cliente ainda não tem CNPJ cadastrado. <button type="button" class="fj-link" data-action="fechar-cadastrar-cnpj">Cadastrar em Configurações</button></div>`;
  return `<div class="fj-veu"><div class="fj-janela" role="dialog" aria-modal="true" aria-label="Fechar período">
    <div class="fj-topo"><h2>Fechar período</h2><button type="button" class="fj-x" data-action="fechar-janela" aria-label="Fechar janela">✕</button></div>
    <div class="fj-cli"><span class="fj-nome">${esc(c.nome)}</span><span class="fj-faixa">${faixa}</span></div>
    <span class="fj-rot">1. Copie e cole no site da Receita</span>
    ${cnpjHtml}
    ${campo('Valor da nota', fmtBRL(total))}
    <a class="btn gold fj-receita" href="https://www.nfse.gov.br/EmissorNacional" target="_blank" rel="noopener noreferrer">2. Abrir o site da nota MEI</a>
    <span class="fj-rot">3. Depois de emitir, volte aqui</span>
    <button type="button" class="btn primary" data-action="fechar-ja-emiti" data-client="${j.cid}" data-ym="${j.ym}">Já emiti a nota</button>
    <span class="fj-dica">Sua senha nunca passa pelo Ritmo: o login é direto no site do governo.</span>
  </div></div>`;
}

/* ---------------- Painel (tela de acompanhamento, so leitura) ---------------- */
const DIA_SEMANA = ['dom','seg','ter','qua','qui','sex','sáb'];
const DIA_SEMANA_LONGO = ['segunda','terça','quarta','quinta','sexta','sábado','domingo'];
// a etiqueta "NOVO" nos blocos novos some sozinha depois desta data
const NOVO_ATE = '2026-10-31';

function addDays(iso, n){
  const [y,m,d] = iso.split('-').map(Number);
  return localISO(new Date(y, m-1, d+n));
}
function ddmm(iso){ const [,m,d] = iso.split('-'); return `${d}/${m}`; }
function plural(n, um, varios){ return `${n} ${n===1?um:varios}`; }
function fmtCurto(v){ return v%1===0 ? v.toLocaleString('pt-BR') : fmtBRL(v); }
function novoTag(){ return TODAY_ISO <= NOVO_ATE ? ' <span class="new">NOVO</span>' : ''; }

// soma dos vídeos por data (todas as abas de cliente, todos os meses).
// Um vídeo conta no dia da data escrita nele.
function videosPorData(){
  const map = {};
  state.clientOrder.forEach(cid=>{
    const meses = state.videos[cid];
    if(!meses) return;
    Object.values(meses).forEach(rows=>{
      (rows||[]).forEach(r=>{
        if(!r || !r.data) return;
        const e = map[r.data] || (map[r.data] = {v:0, n:0});
        e.v += parseBRL(r.valor);
        e.n += 1;
      });
    });
  });
  return map;
}

// meta do mes: a do proprio mes, ou (se ainda nao definida) a do ultimo mes
// anterior que tenha meta — o mes novo ja comeca com a meta do anterior.
function metaDoMes(ym){
  const metas = state.metas || {};
  if(Object.prototype.hasOwnProperty.call(metas, ym)) return parseBRL(metas[ym]) || 0;
  const anteriores = Object.keys(metas).filter(k=>k<ym).sort();
  return anteriores.length ? (parseBRL(metas[anteriores[anteriores.length-1]]) || 0) : 0;
}

function diasNoMes(year, month){ return new Date(Number(year), Number(month), 0).getDate(); }

function painelLimite(){
  const {total, limite, pctClamped, msgClass, restante} = limiteProgress(REAL_YEAR);
  const statusCls = msgClass || 'ok';
  const statusLabel = statusCls==='danger' ? 'Limite excedido' : statusCls==='warn' ? 'Atenção' : 'Tranquilo';
  // quanto do ano ja passou, em %: a marca de ritmo na barra. Barra atras
  // da marca = faturando abaixo do que o limite comportaria.
  const mesesDecorridos = parseInt(REAL_MONTH, 10);
  const pacePct = Math.min((mesesDecorridos/12)*100, 100);
  let msg;
  if(restante < 0){
    msg = `Limite ultrapassado em <b class="sensitive">R$ ${fmtBRL(Math.abs(restante))}</b>. Fique atento ao desenquadramento.`;
  } else if(total > 0){
    const projecao = (total/mesesDecorridos)*12;
    const folga = limite - projecao;
    msg = folga >= 0
      ? `No ritmo atual fecha dezembro em <b class="sensitive">R$ ${fmtBRL(projecao)}</b> — <span class="sensitive">R$ ${fmtBRL(folga)}</span> de folga.`
      : `No ritmo atual fecha dezembro em <b class="sensitive">R$ ${fmtBRL(projecao)}</b> — <span class="sensitive">R$ ${fmtBRL(Math.abs(folga))}</span> acima do limite.`;
  } else {
    msg = `Nenhuma nota lançada em ${REAL_YEAR} ainda.`;
  }
  return `<div class="card card-hero s5">
    <div class="head"><span class="label">Ainda cabe no limite de ${REAL_YEAR}</span><span class="pill ${statusCls}">${statusLabel}</span></div>
    <div class="big sensitive">R$ ${fmtBRL(Math.max(restante,0))}</div>
    <div class="bar"><div class="fill ${msgClass}" style="width:${pctClamped.toFixed(1)}%"></div><div class="pace" style="left:${pacePct.toFixed(1)}%" title="ritmo do ano"></div></div>
    <div class="foot"><span>${pctClamped.toFixed(1).replace('.',',')}% usado</span><span class="pace-t">ritmo do ano: ${pacePct.toFixed(0)}%</span></div>
    <p class="msg">${msg}</p>
  </div>`;
}

function painelMeta(ym){
  const atual = monthKey(REAL_YEAR, REAL_MONTH);
  const ehAtual = ym===atual;
  const [ano, mesK] = ym.split('-');
  const mesNome = MES_NOME[mesK].toLowerCase();
  const mesTxt = mesNome + (ano!==REAL_YEAR ? ` de ${ano}` : '');
  const fat = Object.values(producaoDoMes(ym)).reduce((s,e)=>s+e.v, 0);
  const meta = metaDoMes(ym);
  const podeVoltar = ym > semanasPrimeiroYm({});
  const seta = (dir, ok, rotulo, path)=>`<button type="button" data-action="meta-mes" data-dir="${dir}" aria-label="${rotulo}"${ok?'':' disabled'}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg></button>`;
  const nav = `<div class="msw" role="group" aria-label="Trocar mês da meta">${seta(-1, podeVoltar, 'Mês anterior', 'm15 18-6-6 6-6')}<span>${mesNome} ${ano}</span>${seta(1, !ehAtual, 'Próximo mês', 'm9 18 6-6-6-6')}</div>`;
  const head = r => `<div class="head head-meta"><span class="label">Meta de ${mesTxt}${novoTag()}</span>${nav}</div>${r ? `<div class="meta-acts">${r}</div>` : ''}`;
  // mês anterior ainda com cliente sem fechar: aviso com atalho pra ele
  let lembrete = '';
  if(ehAtual){
    const ant = shiftYm(ym, -1);
    const ab = abertosDoMes(ant);
    if(ab.length) lembrete = `<button type="button" class="meta-lembra" data-action="meta-mes" data-dir="-1">${MES_NOME[ant.split('-')[1]]} ainda recebendo: ${esc(listaNomes(ab.map(nomeCurto)))} em aberto ›</button>`;
  }
  if(ui.metaEditing){
    return `<div class="card card-meta s4">${head()}
      <form class="meta-form" data-meta-form>
        <label for="meta-in">Quanto quer faturar em ${mesTxt}?</label>
        <div class="money-in"><span>R$</span><input id="meta-in" inputmode="decimal" autocomplete="off" value="${esc(ui.metaDraft)}" placeholder="0,00"></div>
        <button class="btn-dark" type="submit">Salvar</button>
        <button class="btn-line" type="button" data-action="meta-cancel">Cancelar</button>
      </form>
    </div>`;
  }
  if(!meta){
    return `<div class="card card-meta s4">${head()}
      <div class="vrow"><span class="big sensitive">R$ ${fmtBRL(fat)}</span><span class="of">${ehAtual ? 'faturado até agora' : 'faturado no mês'}</span></div>
      <p class="msg">Defina quanto quer faturar ${ehAtual ? 'este mês' : 'em '+mesTxt} e o app mostra se você está perto ou longe.</p>
      <button class="btn-dark" style="align-self:flex-start" type="button" data-action="meta-edit">Definir meta</button>
      ${lembrete}
    </div>`;
  }
  const editBtn = `<button class="edit-btn" type="button" data-action="meta-edit" aria-label="Editar meta"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>Editar</button>`;
  const pct = fat/meta*100, falta = meta-fat;
  let pill, msg, footR, paceHtml = '';
  if(ehAtual){
    const dia = now.getDate(), dim = diasNoMes(REAL_YEAR, REAL_MONTH), left = dim-dia;
    const pace = dia/dim*100;
    paceHtml = `<div class="pace" style="left:${pace.toFixed(1)}%"></div>`;
    footR = `dia ${dia} de ${dim}`;
    if(falta <= 0){
      pill = `<span class="pill done">Meta batida</span>`;
      msg = `Você passou a meta em <b class="sensitive">R$ ${fmtBRL(-falta)}</b>. Tudo que entrar agora é extra.`;
    } else {
      // ritmo esperado conta so os dias que ja terminaram — no dia 1 de manha,
      // com R$ 0, ainda nao da pra estar "atras"
      const ritmo = (dia-1)/dim*100;
      pill = pct >= ritmo-2 ? `<span class="pill ok">No ritmo</span>` : `<span class="pill warn">Um pouco atrás</span>`;
      msg = left > 0
        ? `Faltam <b class="sensitive">R$ ${fmtBRL(falta)}</b> em ${plural(left,'dia','dias')}. Dá <b class="sensitive">R$ ${fmtBRL(falta/left)}</b> por dia.`
        : `Faltam <b class="sensitive">R$ ${fmtBRL(falta)}</b> e o mês termina hoje.`;
    }
  } else {
    // mês que já passou: segue somando enquanto algum cliente não fechou
    const ab = abertosDoMes(ym);
    footR = ab.length ? `${esc(listaNomes(ab.map(nomeCurto)))} em aberto` : 'todos os clientes fechados';
    if(falta <= 0){
      pill = `<span class="pill done">Meta batida</span>`;
      msg = `Você passou a meta de ${mesNome} em <b class="sensitive">R$ ${fmtBRL(-falta)}</b>.`;
    } else if(ab.length){
      pill = `<span class="pill ok">Ainda recebendo</span>`;
      msg = `Faltam <b class="sensitive">R$ ${fmtBRL(falta)}</b> pra meta de ${mesNome}. O que você lançar nas abas de ${mesNome} de ${esc(listaNomes(ab.map(nomeCurto)))} ainda conta aqui.`;
    } else {
      pill = `<span class="pill warn">Mês encerrado</span>`;
      msg = `Faltaram <b class="sensitive">R$ ${fmtBRL(falta)}</b> pra meta de ${mesNome}.`;
    }
  }
  return `<div class="card card-meta s4">${head(pill+editBtn)}
    <div class="vrow"><span class="big sensitive">R$ ${fmtBRL(fat)}</span><span class="of sensitive">de R$ ${fmtBRL(meta)}</span></div>
    <div class="bar"><div class="fill" style="width:${Math.min(pct,100).toFixed(1)}%"></div>${paceHtml}</div>
    <div class="foot"><span>${pct.toFixed(1).replace('.',',')}% da meta</span><span class="pace-t">${footR}</span></div>
    <p class="msg">${msg}</p>
    ${lembrete}
  </div>`;
}

function painelHoje(porData){
  const hoje = porData[TODAY_ISO] || {v:0, n:0};
  const ontem = porData[addDays(TODAY_ISO,-1)] || {v:0, n:0};
  return `<div class="card s4">
    <span class="label">Hoje${novoTag()}</span><span class="big sensitive">R$ ${fmtBRL(hoje.v)}</span>
    <p class="sub">${DIA_SEMANA[now.getDay()]}, ${ddmm(TODAY_ISO)} · ${plural(hoje.n,'vídeo','vídeos')}</p>
    <p class="sub">Ontem: <b class="sensitive">R$ ${fmtBRL(ontem.v)}</b></p>
    <button class="quick" type="button" data-action="go-lancar">+ Lançar vídeo</button>
  </div>`;
}

function painelSemana(porData){
  // semana de segunda a domingo
  const idxHoje = (now.getDay()+6)%7;
  const seg = addDays(TODAY_ISO, -idxHoje);
  const dom = addDays(seg, 6);
  const dias = [0,1,2,3,4,5,6].map(i=>{
    const e = porData[addDays(seg,i)] || {v:0, n:0};
    return {i, v:e.v, n:e.n};
  });
  const total = dias.reduce((s,d)=>s+d.v, 0);
  const n = dias.reduce((s,d)=>s+d.n, 0);
  const segPassada = addDays(seg, -7);
  let passada = 0;
  for(let i=0; i<=idxHoje; i++) passada += (porData[addDays(segPassada,i)] || {v:0}).v;
  const max = Math.max(1, ...dias.map(d=>d.v));
  const nomes = ['seg','ter','qua','qui','sex','sáb','dom'];
  const bars = dias.map(d=>{
    if(d.i > idxHoje && d.v===0){
      return `<div class="wb future"><span class="v">&nbsp;</span><div class="col"></div><span class="d">${nomes[d.i]}</span></div>`;
    }
    const h = d.v>0 ? Math.max(6, Math.round(d.v/max*80)) : 3;
    return `<div class="wb${d.i===idxHoje?' today':''}" title="R$ ${fmtBRL(d.v)}"><span class="v sensitive">${fmtCurto(d.v)}</span><div class="col" style="height:${h}px"></div><span class="d">${d.i===idxHoje?'hoje':nomes[d.i]}</span></div>`;
  }).join('');
  const intervalo = seg.slice(5,7)===dom.slice(5,7) ? `${seg.slice(8,10)} a ${ddmm(dom)}` : `${ddmm(seg)} a ${ddmm(dom)}`;
  const passadaLabel = idxHoje===6 ? 'Semana passada' : `Semana passada até ${DIA_SEMANA_LONGO[idxHoje]}`;
  return `<div class="card card-week s8">
    <div class="left"><span class="label">Esta semana${novoTag()}</span><span class="big sensitive">R$ ${fmtBRL(total)}</span>
    <p class="sub">${intervalo} · ${plural(n,'vídeo','vídeos')}</p><p class="sub">${passadaLabel}: <b class="sensitive">R$ ${fmtBRL(passada)}</b></p></div>
    <div class="wbars" role="img" aria-label="Faturamento por dia desta semana">${bars}</div>
  </div>`;
}

function painelAno(){
  const total = notasYearTotal(REAL_YEAR);
  const n = (state.notas[REAL_YEAR]||[]).length;
  const media = total / Number(REAL_MONTH); // jan ate o mes atual
  const rodape = `<div class="kv"><span>${plural(n,'nota','notas')}</span><span>média <b class="sensitive">R$ ${fmtBRL(media)}</b>/mês</span></div>`;
  // comparacao com o ano anterior inteiro (so aparece se houver notas nele)
  const anoAnt = String(Number(REAL_YEAR)-1);
  const totalAnt = notasYearTotal(anoAnt);
  let comp = '';
  if(totalAnt > 0){
    const maior = Math.max(total, totalAnt);
    const pct = Math.floor(total/totalAnt*100);
    const msg = total < totalAnt
      ? `Já é <b>${pct}%</b> de tudo que faturou em ${anoAnt} (<span class="sensitive">R$ ${fmtBRL(totalAnt)}</span>). Faltam <b class="sensitive">R$ ${fmtBRL(totalAnt-total)}</b> pra empatar.`
      : `Já passou ${anoAnt} inteiro (<span class="sensitive">R$ ${fmtBRL(totalAnt)}</span>) em <b class="sensitive">R$ ${fmtBRL(total-totalAnt)}</b>.`;
    comp = `<div class="cmp">
      <div class="row"><span>${REAL_YEAR}</span><span class="track"><i class="cur" style="width:${(total/maior*100).toFixed(1)}%"></i></span></div>
      <div class="row"><span>${anoAnt} todo</span><span class="track"><i style="width:${(totalAnt/maior*100).toFixed(1)}%"></i></span></div>
    </div>
    <p class="msg">${msg}</p>`;
  }
  return `<div class="card card-year s3">
    <span class="label">Faturado em ${REAL_YEAR}</span><span class="big sensitive">R$ ${fmtBRL(total)}</span>
    ${comp}
    ${rodape}
  </div>`;
}

function painelDiaADia(porData, ym){
  const mesNome = MES_NOME[REAL_MONTH].toLowerCase();
  const dim = diasNoMes(REAL_YEAR, REAL_MONTH), dia = now.getDate();
  const vals = [];
  for(let d=1; d<=dim; d++) vals.push((porData[`${ym}-${String(d).padStart(2,'0')}`] || {v:0}).v);
  const soma = vals.reduce((s,v)=>s+v, 0);
  const trab = vals.filter(v=>v>0).length;
  const avg = trab ? soma/trab : 0;
  const maxV = Math.max(0, ...vals);
  const melhorDia = maxV>0 ? vals.indexOf(maxV)+1 : 0;
  const step = Math.max(100, Math.ceil(maxV/2/100)*100), MAX = step*2;
  let cols = '', xs = '';
  vals.forEach((v,i)=>{
    const d = i+1;
    const dow = new Date(Number(REAL_YEAR), Number(REAL_MONTH)-1, d).getDay();
    const we = dow===0 || dow===6, fut = d>dia && v===0, tod = d===dia;
    const cls = ['dcol', we?'we':'', fut?'future':'', tod?'today':''].join(' ');
    const bar = fut ? '<i></i>' : v ? `<i style="height:${(v/MAX*100).toFixed(1)}%"></i>` : '';
    cols += `<div class="${cls}" title="${String(d).padStart(2,'0')}/${REAL_MONTH} · ${v ? 'R$ '+fmtBRL(v) : 'sem vídeo'}">${bar}</div>`;
    const key = d===1 || d%5===0 || tod;
    // no celular, um numero colado no de hoje ("24 25") se sobrepoe — esconde o vizinho
    const near = key && !tod && Math.abs(d-dia)===1;
    xs += `<span class="${key?'k':''}${tod?' t':''}${near?' near':''}">${d}</span>`;
  });
  const avgLine = avg>0 ? `<div class="avg" style="bottom:${(avg/MAX*100).toFixed(1)}%"><span class="sensitive">média R$ ${fmtBRL(avg)}</span></div>` : '';
  return `<div class="card s8">
    <div class="head"><span class="label">${MES_NOME[REAL_MONTH]} dia a dia${novoTag()}</span><span class="sub">fins de semana em cinza</span></div>
    <div class="chart" style="--dias:${dim}">
      <div class="yaxis sensitive"><span>${fmtCurto(MAX)}</span><span>${fmtCurto(step)}</span><span>0</span></div>
      <div class="plot">
        <div class="grid-l" style="bottom:50%"></div>
        <div class="days">${cols}</div>
        ${avgLine}
      </div>
      <div class="xaxis">${xs}</div>
    </div>
    <div class="stats3">
      <div><b>${trab}</b><span>${trab===1?'dia com vídeo':'dias com vídeo'}</span></div>
      <div><b class="sensitive">${trab ? 'R$ '+fmtBRL(avg) : '—'}</b><span>média por dia trabalhado</span></div>
      <div><b class="sensitive">${maxV>0 ? 'R$ '+fmtBRL(maxV) : '—'}</b><span>melhor dia${melhorDia ? ' · '+String(melhorDia).padStart(2,'0')+'/'+REAL_MONTH : ''}</span></div>
    </div>
  </div>`;
}

// primeiro mes que da pra ver em "Semana a semana": o mais antigo entre as
// abas de cliente e as datas dos videos (nunca depois do mes atual)
function semanasPrimeiroYm(porData){
  const atual = monthKey(REAL_YEAR, REAL_MONTH);
  let min = atual;
  Object.values(state.videos||{}).forEach(meses=>{
    Object.keys(meses||{}).forEach(ym=>{ if(/^\d{4}-\d{2}$/.test(ym) && ym<min) min = ym; });
  });
  Object.keys(porData).forEach(iso=>{ const ym = iso.slice(0,7); if(/^\d{4}-\d{2}$/.test(ym) && ym<min) min = ym; });
  return min;
}

// mes mostrado no cartao — so tela, nao vai pro banco. null = mes atual.
function semanasYm(porData){
  const atual = monthKey(REAL_YEAR, REAL_MONTH);
  let ym = ui.semanasYm || atual;
  if(ym > atual) ym = atual;
  const primeiro = semanasPrimeiroYm(porData);
  if(ym < primeiro) ym = primeiro;
  return ym;
}

// semanas de segunda a domingo, cortadas nas bordas do mes: a soma das
// semanas bate com o total do mes (conta pela data do video)
function painelSemanas(porData){
  const ym = semanasYm(porData);
  const [ano, mes] = ym.split('-');
  const mesNome = MES_NOME[mes];
  const atual = monthKey(REAL_YEAR, REAL_MONTH);
  const ehAtual = ym===atual;
  const dim = diasNoMes(ano, mes);
  const semanas = [];
  let cur = null;
  for(let d=1; d<=dim; d++){
    const iso = `${ym}-${String(d).padStart(2,'0')}`;
    const dow = new Date(Number(ano), Number(mes)-1, d).getDay();
    if(!cur || dow===1){ cur = {ini:d, fim:d, v:0, n:0}; semanas.push(cur); }
    cur.fim = d;
    const e = porData[iso];
    if(e){ cur.v += e.v; cur.n += e.n; }
  }
  const dia = now.getDate();
  semanas.forEach(s=>{
    s.agora = ehAtual && dia>=s.ini && dia<=s.fim;
    s.futura = ehAtual && s.ini>dia;
    s.label = s.ini===s.fim ? String(s.ini).padStart(2,'0') : `${String(s.ini).padStart(2,'0')}–${String(s.fim).padStart(2,'0')}`;
  });
  const total = semanas.reduce((s,w)=>s+w.v, 0);
  const nTotal = semanas.reduce((s,w)=>s+w.n, 0);
  // media so das semanas que ja comecaram (no mes atual as futuras nao contam)
  const contadas = semanas.filter(s=>!s.futura);
  const media = contadas.length ? total/contadas.length : 0;
  const melhor = semanas.reduce((b,s)=>s.v>(b?b.v:0) ? s : b, null);
  const maxV = Math.max(0, ...semanas.map(s=>s.v));
  const step = Math.max(100, Math.ceil(maxV/2/100)*100), MAX = step*2;
  const cols = `grid-template-columns:repeat(${semanas.length},minmax(0,1fr))`;
  const bars = semanas.map(s=>{
    if(s.futura && s.v===0) return `<div class="wk fut"><span class="v">&nbsp;</span><i></i></div>`;
    if(s.v===0) return `<div class="wk zero"><span class="v sensitive">0</span><i></i></div>`;
    return `<div class="wk${s.agora?' now':''}" title="${s.label}/${mes} · R$ ${fmtBRL(s.v)}"><span class="v sensitive">${fmtCurto(s.v)}</span><i style="height:${(s.v/MAX*100).toFixed(1)}%"></i></div>`;
  }).join('');
  const xs = semanas.map(s=>{
    const sub = s.agora ? 'esta semana' : (s.n ? plural(s.n,'vídeo','vídeos') : '&nbsp;');
    return `<div class="${s.agora?'t':''}"><b>${s.label}</b><span>${sub}</span></div>`;
  }).join('');
  // linha da media sem texto em cima (o texto cobria o valor de alguma
  // semana); a legenda fica no numero "media por semana" embaixo
  const avgLine = media>0 ? `<div class="avg" style="bottom:${(media/MAX*100).toFixed(1)}%"></div>` : '';
  const vazio = total===0 ? `<div class="wempty">Nenhum vídeo em ${mesNome.toLowerCase()}</div>` : '';
  const podeVoltar = ym > semanasPrimeiroYm(porData);
  const seta = (dir, ok, rotulo, path)=>`<button type="button" data-action="semanas-mes" data-dir="${dir}" aria-label="${rotulo}"${ok?'':' disabled'}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg></button>`;
  return `<div class="card card-semanas s12">
    <div class="head"><span class="label">Semana a semana${novoTag()}</span>
      <div class="msw" role="group" aria-label="Trocar mês">${seta(-1, podeVoltar, 'Mês anterior', 'm15 18-6-6 6-6')}<span>${mesNome} ${ano}</span>${seta(1, !ehAtual, 'Próximo mês', 'm9 18 6-6-6-6')}</div>
    </div>
    <div class="chart">
      <div class="yaxis sensitive"><span>${fmtCurto(MAX)}</span><span>${fmtCurto(step)}</span><span>0</span></div>
      <div class="plot">
        <div class="grid-l" style="bottom:50%"></div>
        <div class="weeks" style="${cols}">${bars}</div>
        ${avgLine}${vazio}
      </div>
      <div class="wxaxis" style="${cols}">${xs}</div>
    </div>
    <div class="stats3">
      <div><b class="sensitive">${total>0 ? 'R$ '+fmtBRL(total) : '—'}</b><span>total de ${mesNome.toLowerCase()}${nTotal ? ' · '+plural(nTotal,'vídeo','vídeos') : ''}</span></div>
      <div><b class="sensitive">${media>0 ? 'R$ '+fmtBRL(media) : '—'}</b><span>${media>0 ? '<i class="avg-key" aria-hidden="true"></i>' : ''}média por semana</span></div>
      <div><b class="sensitive">${melhor ? 'R$ '+fmtBRL(melhor.v) : '—'}</b><span>melhor semana${melhor ? ' · '+melhor.label+'/'+mes : ''}</span></div>
    </div>
  </div>`;
}

function painelClientes(ym){
  const mesNome = MES_NOME[ym.split('-')[1]].toLowerCase();
  const prod = producaoDoMes(ym);
  const lista = state.clientOrder.map(id=>{
    const c = clientById(id);
    if(!c) return null;
    const e = prod[id] || {v:0, n:0};
    return {id, nome:c.nome, v:e.v, n:e.n};
  }).filter(c=>c && c.v>0).sort((a,b)=>b.v-a.v);
  const head = `<div class="head"><span class="label">Por cliente em ${mesNome}${novoTag()}</span></div>`;
  if(!lista.length){
    return `<div class="card s4">${head}<p class="msg">Nenhum vídeo em ${mesNome} ainda.</p></div>`;
  }
  const tot = lista.reduce((s,c)=>s+c.v, 0), max = lista[0].v;
  const stack = lista.map(c=>`<i class="${chipClass(c.id)}" style="flex:${c.v}"></i>`).join('');
  const rows = lista.map(c=>`<div class="cl">
    <span class="chip ${chipClass(c.id)}">${esc(initials(c.nome))}</span>
    <span class="n">${esc(c.nome)}</span><span class="v sensitive">R$ ${fmtBRL(c.v)}</span>
    <span class="track"><i class="${chipClass(c.id)}" style="width:${(c.v/max*100).toFixed(1)}%"></i></span>
    <span class="meta-l">${plural(c.n,'vídeo','vídeos')} · ${(c.v/tot*100).toFixed(0)}%</span>
  </div>`).join('');
  return `<div class="card s4">${head}<div class="stack">${stack}</div><div class="clients">${rows}</div></div>`;
}

function painelNotas(){
  const {buckets} = notasMonthlyBreakdown(REAL_YEAR);
  const vals = MESES.map(m=>buckets[m.k]);
  const abrev = MESES.map(m=>m.nome.slice(0,3).toLowerCase());
  const limite = parseBRL(state.meiLimiteAnual)||81000;
  const REF = limite/12;
  const atual = Number(REAL_MONTH)-1;
  const step = Math.max(1000, Math.ceil(Math.max(REF, ...vals)*1.05/3/1000)*1000), MAX = step*3;
  const mil = v => `${(v/1000).toLocaleString('pt-BR')} mil`;
  const cols = vals.map((v,i)=>{
    const tip = `${abrev[i]} · ${v ? 'R$ '+fmtBRL(v) : 'sem nota'}`;
    if(i>atual && v===0) return `<div class="mcol future" title="${abrev[i]}"><i></i></div>`;
    if(v===0) return `<div class="mcol zero" title="${tip}"><i></i></div>`;
    return `<div class="mcol${i===atual?' cur':''}" title="${tip}"><i style="height:${(v/MAX*100).toFixed(1)}%"></i></div>`;
  }).join('');
  const xs = abrev.map((m,i)=>`<span class="${i===atual?'t':''}">${m}</span>`).join('');
  const primeiro = vals.findIndex(v=>v>0);
  let msg;
  if(primeiro<0 || primeiro>atual){
    msg = `Nenhuma nota lançada em ${REAL_YEAR} ainda.`;
  } else {
    const meses = atual-primeiro+1;
    const media = vals.slice(primeiro, atual+1).reduce((s,v)=>s+v, 0)/meses;
    const periodo = meses===1 ? `Em ${abrev[atual]}` : `Média de ${abrev[primeiro]} a ${abrev[atual]}`;
    msg = media <= REF
      ? `${periodo}: <b class="sensitive">R$ ${fmtBRL(media)}</b> por mês, abaixo da linha. Por isso o limite está tranquilo.`
      : `${periodo}: <b class="sensitive">R$ ${fmtBRL(media)}</b> por mês, acima da linha. Nesse ritmo o limite do ano aperta.`;
  }
  return `<div class="card s7">
    <div class="head"><span class="label">Notas emitidas por mês · ${REAL_YEAR}</span><span class="sub">total <b class="sensitive">R$ ${fmtBRL(notasYearTotal(REAL_YEAR))}</b></span></div>
    <div class="mchart">
      <div class="yaxis sensitive" style="height:170px"><span>${mil(MAX)}</span><span>${mil(step*2)}</span><span>${mil(step)}</span><span>0</span></div>
      <div class="mplot">
        <div class="grid-l" style="bottom:33.33%"></div><div class="grid-l" style="bottom:66.66%"></div>
        <div class="mcols">${cols}</div>
        <div class="ref" style="bottom:${(REF/MAX*100).toFixed(1)}%"><span class="sensitive">R$ ${Math.round(REF).toLocaleString('pt-BR')}/mês cabe no limite</span></div>
      </div>
      <div class="mx">${xs}</div>
    </div>
    <p class="msg">${msg}</p>
  </div>`;
}

function painelRecentes(){
  const todos = [];
  state.clientOrder.forEach(cid=>{
    const meses = state.videos[cid];
    if(!meses) return;
    Object.values(meses).forEach(rows=>(rows||[]).forEach(r=>{ if(r) todos.push({cid, r}); }));
  });
  // mais recente primeiro: pela data do vídeo e, no mesmo dia, pelo último lançado
  todos.sort((a,b)=> String(b.r.data||'').localeCompare(String(a.r.data||'')) || String(b.r.id).localeCompare(String(a.r.id)));
  const rows = todos.slice(0,6).map(({cid, r})=>{
    const c = clientById(cid);
    const sub = [r.subcliente ? esc(r.subcliente) : '', r.data ? ddmm(r.data) : 'sem data'].filter(Boolean).join(' · ');
    return `<div class="rv">
      <span class="chip ${chipClass(cid)}">${esc(initials(c ? c.nome : ''))}</span><span class="t">${esc(r.headline || 'Sem título')}</span><span class="v sensitive">R$ ${fmtBRL(parseBRL(r.valor))}</span>
      <span class="s">${sub}</span>
    </div>`;
  }).join('');
  return `<div class="card s5">
    <div class="head"><span class="label">Últimos vídeos${novoTag()}</span><button class="quick" type="button" data-action="go-lancar">Ver todos</button></div>
    ${rows ? `<div class="recent">${rows}</div>` : '<p class="msg">Nenhum vídeo lançado ainda.</p>'}
  </div>`;
}

function renderPainel(){
  const ym = monthKey(REAL_YEAR, REAL_MONTH);
  const porData = videosPorData();
  return `<div class="dash${ui.screenAnim ? ' screen-in' : ''}">
    ${painelAno()}
    ${painelLimite()}
    ${painelMeta(metaYm())}
    ${painelCobrar()}
    ${painelHoje(porData)}
    ${painelSemana(porData)}
    ${painelSemanas(porData)}
    ${painelDiaADia(porData, ym)}
    ${painelClientes(metaYm())}
    ${painelNotas()}
    ${painelRecentes()}
  </div>`;
}

function iconOrc(size=15){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h3M14 17h2"/><path d="M13.5 13.5l1.5 1.5 2.5-3"/></svg>`;}
function iconChart(size=15){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>`;}
function iconList(size=15){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`;}

/* topo (2026-09-29): marca grande + slogan a esquerda, saudacao + data a direita.
   Nome/CNPJ da empresa saem do topo (continuam no PDF e em Configuracoes). */
const DIA_LONGO = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MES_CAP = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function nomeSaudacao(){
  const b = state.business || {};
  const ap = (b.apelido||'').trim();
  if(ap) return ap;
  return ((b.nomeFantasia||'').trim().split(/\s+/)[0]) || '';
}
function topoMarcaHtml(){
  const agora = new Date();
  const h = agora.getHours();
  const oi = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = nomeSaudacao();
  const dd = String(agora.getDate()).padStart(2,'0'), mm = String(agora.getMonth()+1).padStart(2,'0');
  return `<span class="tr-ic">${RITMO_ICONE}</span>
      <span class="tr-wm">ritmo<i>.</i></span>
      <span class="tr-slo">sua produção, no ritmo certo</span>
      <span class="tr-oi">${oi}${nome ? `, <em>${esc(nome)}</em>` : ''}</span>
      <span class="tr-dt"><span class="longo">${DIA_LONGO[agora.getDay()]}, ${agora.getDate()} de ${MES_CAP[agora.getMonth()]}</span><span class="curto">${DIA_LONGO[agora.getDay()].slice(0,3)}, ${dd}/${mm}</span></span>`;
}

function saveStateHtml(){
  const cls = saveMode==='saving' ? ' saving' : saveMode==='error' ? ' error' : '';
  const txt = saveMode==='saving' ? 'salvando…' : saveMode==='error' ? 'erro ao salvar — verifique a conexão' : 'salvo';
  return `<div id="savestate" class="savestate${cls}">${txt}</div>`;
}

function render(){
  const app = document.getElementById('app');
  const painel = ui.screen==='painel';
  // secao aberta: Painel, Lancamentos (um cliente), Notas emitidas ou Configuracoes
  const secao = painel ? 'painel' : ui.tab==='FATURAMENTO' ? 'notas' : ui.tab==='CONFIG' ? 'config' : ui.tab==='ORCAMENTOS' ? 'orc' : 'lanc';
  const navBtn = (id, icone, rotulo, curto) => `<button type="button" class="${secao===id?'active':''}" data-action="switch-screen" data-screen="${id}" aria-pressed="${secao===id}" aria-label="${rotulo}">${icone}${curto ? `<span class="nv-longo">${rotulo}</span><span class="nv-curto">${curto}</span>` : `<span>${rotulo}</span>`}</button>`;
  const ae = document.activeElement;
  const metaSel = ae && ae.id==='meta-in' ? [ae.selectionStart, ae.selectionEnd] : null;
  app.innerHTML = `
    ${BETA ? '<div class="faixa-beta">VERSÃO DE TESTE · os dados daqui são uma cópia</div>' : ''}
    <div class="topbar tr">
      ${topoMarcaHtml()}
      <div class="screen-nav" role="group" aria-label="Tela">
        <span class="screen-nav-pill"></span>
        ${navBtn('painel', iconChart(), 'Painel')}
        ${navBtn('lanc', iconList(), 'Lançamentos')}
        ${navBtn('orc', iconOrc(15), 'Orçamentos')}
        ${navBtn('notas', iconDoc(15), 'Notas emitidas', 'Notas')}
        ${navBtn('config', iconGear(15), 'Configurações', 'Config.')}
      </div>
      <div class="topbar-right">
        <button class="privacy-toggle ${ui.valuesHidden?'active':''}" type="button" data-action="toggle-privacy" aria-pressed="${ui.valuesHidden}" aria-label="${ui.valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}" title="${ui.valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}">
          <svg class="icon-eye" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ui.valuesHidden?'hidden':''}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="icon-eye-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ui.valuesHidden?'':'hidden'}><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.9 21.9 0 0 1-3.22 4.44M1 1l22 22"/></svg>
        </button>
      </div>
      ${saveStateHtml()}
    </div>
    ${ui.conflito ? renderConflito() : ''}
    ${painel ? renderPainel() : `
    <div class="layout${ui.screenAnim ? ' screen-in' : ''}">
      ${secao==='lanc' ? renderRail() : ''}
      <div class="main${secao==='lanc' || secao==='orc' ? ' main-lc' : ''}">${renderMain()}</div>
    </div>`}
    ${ui.toast ? renderToast() : ''}
    ${ui.fecharJanela ? janelaFecharHtml() : ''}
    ${ui.cal ? calendarioHtml() : ''}
  `;
  ui.screenAnim = false;
  attachHandlers();
  posicionarCalendario();
  if(metaSel && ui.metaEditing){
    const metaIn = document.getElementById('meta-in');
    if(metaIn){ metaIn.focus(); try{ metaIn.setSelectionRange(metaSel[0], metaSel[1]); }catch(e){} }
  }
}

function renderRail(){
  let html = '<div class="rail">';
  html += `<div class="rail-slide-pill"></div>`;
  html += `<div class="rail-group-label">Clientes</div>`;
  state.clientOrder.forEach(id=>{
    const c = clientById(id);
    if(!c) return;
    const active = ui.tab===id;
    html += `<button class="tab-btn ${active?'active':''}" data-action="switch-tab" data-tab="${id}">
      <span class="tab-chip ${chipClass(id)}">${esc(initials(c.nome))}</span>
      <span class="tab-label">${esc(c.nome)}</span>
    </button>`;
  });
  html += `<div class="rail-divider"></div>`;

  if(ui.addingClient){
    const isEsp = ui.addingClientTipo==='esporadico';
    html += `<div class="rail-add-form">
      <div class="tipo-toggle">
        <button class="${!isEsp?'active':''}" data-action="set-new-client-tipo" data-tipo="fixo">Cliente fixo</button>
        <button class="${isEsp?'active':''}" data-action="set-new-client-tipo" data-tipo="esporadico">Esporádico</button>
      </div>
      <input type="text" id="new-client-name" value="${esc(ui.newClientName||'')}" placeholder="${isEsp?'Nome da aba (ex: Clientes avulsos)':'Nome do cliente'}" autofocus>
      ${isEsp ? `<div class="tipo-hint">Cada lançamento nessa aba tem seu próprio campo de cliente, descrição e valor em branco.</div>` : `
      <div class="row">
        <input type="text" inputmode="decimal" id="new-client-valor" value="${esc(ui.newClientValor||'')}" placeholder="Valor padrão (R$)" style="width:110px;">
      </div>`}
      <div class="row">
        <button data-action="confirm-add-client">Criar aba</button>
        <button class="ghost" data-action="cancel-add-client">Cancelar</button>
      </div>
    </div>`;
  } else {
    html += `<button class="rail-add" data-action="start-add-client">+ Nova aba de cliente</button>`;
  }
  html += '</div>';
  return html;
}

function renderMain(){
  if(ui.tab==='FATURAMENTO') return renderFaturamento();
  if(ui.tab==='CONFIG') return renderConfig();
  if(ui.tab==='ORCAMENTOS') return renderOrcamentos();
  return renderClientPanel(ui.tab);
}

function renderConflito(){
  return `<div class="conflito-banner" role="alert">
    <span><b>O mesmo item foi mudado aqui e em outro aparelho</b> (${esc(ui.conflito.quando)}). Juntei tudo e, nesse item, ficou o que você fez neste aparelho.
    A versão do outro aparelho ficou guardada à parte — nada foi perdido.</span>
    <button type="button" data-action="conflito-ok">Entendi</button>
  </div>`;
}

function renderToast(){
  return `<div class="toast">
    <span>${esc(ui.toast.msg)}</span>
    ${ui.toast.undoFn ? '<button data-action="toast-undo">Desfazer</button>' : ''}
  </div>`;
}

function attachHandlers(){
  const app = document.getElementById('app');
  if(!app) return;
  const fileInput = document.getElementById('import-file');
  if(fileInput) fileInput.onchange = onImportFile;
  if(ui.addingClient){
    // volta pro campo em que a pessoa estava, com o cursor no fim (uma
    // atualizacao de tela no meio da digitacao nao embaralha o texto)
    const alvo = document.getElementById(ui.newClientFoco || 'new-client-name');
    if(alvo && document.activeElement !== alvo){
      alvo.focus();
      const n = alvo.value.length;
      try{ alvo.setSelectionRange(n, n); }catch(e){}
    }
  }
  autoResizeTextareas();

  if(ui.metaEditing && ui.metaFocus){
    // foco + seleciona o valor so na hora de abrir a edicao — num render()
    // qualquer no meio da digitacao, selecionar tudo apagaria o que vem depois
    ui.metaFocus = false;
    const metaIn = document.getElementById('meta-in');
    if(metaIn){ metaIn.focus(); metaIn.select(); }
  }

  requestAnimationFrame(syncAllSliders);
}

function syncAllSliders(){
  syncSlider('screen-nav', '.screen-nav-pill', '.screen-nav button.active');
  if(ui.screen!=='lanc') return;
  syncSlider('rail', '.rail-slide-pill', '.rail .tab-btn.active');
  scrollActiveTabIntoView();
  if(ui.tab && ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG' && ui.tab!=='ORCAMENTOS'){
    syncSlider('months-'+ui.tab, '.month-slide-pill', '.months .month-pill.active');
    scrollActiveMonthIntoView();
  }
}

// Numa tela estreita a tira de meses nao cabe inteira, e ela abre sempre
// em Janeiro — o mes selecionado fica fora de vista.
function scrollActiveMonthIntoView(){
  const strip = document.querySelector('.months');
  const active = document.querySelector('.months .month-pill.active');
  if(!strip || !active) return;
  if(strip.scrollWidth <= strip.clientWidth) return;
  const alvo = active.offsetLeft - (strip.clientWidth - active.offsetWidth)/2;
  strip.scrollTo({left: Math.max(alvo, 0), behavior: prefersReducedMotion() ? 'auto' : 'smooth'});
}

// No celular as abas viram uma fila que desliza de lado — a aba aberta pode
// ficar fora da tela (ex.: WIDE MEDIA, a terceira). Traz ela pra vista.
function scrollActiveTabIntoView(){
  const rail = document.querySelector('.rail');
  const active = document.querySelector('.rail .tab-btn.active');
  if(!rail || !active) return;
  if(rail.scrollWidth <= rail.clientWidth) return;
  const vis = active.offsetLeft >= rail.scrollLeft && active.offsetLeft + active.offsetWidth <= rail.scrollLeft + rail.clientWidth;
  if(vis) return;
  rail.scrollTo({left: Math.max(active.offsetLeft - 14, 0), behavior: 'auto'});
}

function autoResizeTextareas(){
  document.querySelectorAll('textarea.esp-textarea').forEach(t=>{
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 'px';
  });
}

function attachStaticHandlers(){
  const app = document.getElementById('app');
  if(!app) return;
  // addEventListener (not the onxxx property) is required here — Chrome does
  // not wire up the "onfocusout" IDL property the way it does onclick/oninput,
  // so assigning app.onfocusout silently does nothing.
  app.addEventListener('input', onAppInput);
  app.addEventListener('click', onAppClick);
  app.addEventListener('focusout', onAppFocusOut);
  app.addEventListener('submit', onAppSubmit);
}

/* ---------------- client panel ---------------- */
function renderClientPanel(clientId){
  const c = clientById(clientId);
  if(!c){ return '<div class="empty-hint">Selecione uma aba.</div>'; }
  const view = ensureClientView(clientId);
  const ym = monthKey(view.year, view.month);
  const rows = videosDe(clientId, ym);
  const total = monthTotal(clientId, ym);

  // meses em minigrafico (2026-09-29, opcao B): altura = quanto faturou no mes
  const totaisMes = MESES.map(m=>monthTotal(clientId, monthKey(view.year, m.k)));
  const maiorMes = Math.max(...totaisMes, 0);
  let monthsHtml = '<div class="months lc-bars"><div class="month-slide-pill"></div>';
  MESES.forEach((m, mi)=>{
    const k = monthKey(view.year, m.k);
    const has = (state.videos[clientId] && state.videos[clientId][k] && state.videos[clientId][k].length>0);
    const active = m.k===view.month;
    const fechado = periodoFechado(clientId, k);
    const aberto = !fechado && k===periodoAberto(clientId);
    const v = totaisMes[mi];
    const alt = v>0 && maiorMes>0 ? Math.max(8, Math.round(v/maiorMes*100)) : 0;
    const dica = `${m.nome}: R$ ${fmtBRL(v)}${has?` · ${state.videos[clientId][k].length} lançamentos`:''}${fechado?' · período fechado':aberto?' · período aberto':''}`;
    monthsHtml += `<button class="month-pill ${active?'active':''} ${has?'has-data':''} ${fechado?'closed':''} ${aberto?'open-p':''}"
      data-action="switch-month" data-client="${clientId}" data-month="${m.k}" title="${dica}" aria-label="${dica}">
      <span class="lc-col"><span class="lc-bar" style="height:${alt}%"></span></span><span class="lc-m">${m.nome.slice(0,3)}</span>
    </button>`;
  });
  monthsHtml += '</div>';

  const isEsp = c.tipo==='esporadico';
  const animateRows = shouldAnimateRows('client:'+clientId+':'+ym);

  let rowsHtml = '';
  if(rows.length===0){
    rowsHtml = `<div class="empty-hint">Nenhum ${isEsp?'lançamento':'vídeo'} em ${MES_NOME[view.month]} de ${view.year} ainda.</div>`;
  } else if(isEsp){
    rowsHtml = `<div class="esp-cards">`;
    ordenar(rows).forEach(([r])=>{
      rowsHtml += `<div class="esp-card ${animateRows?'row-enter':''}" data-row="${r.id}">
        <textarea class="esp-textarea" rows="2" placeholder="Escreva aqui: cliente, o que foi feito, quantos vídeos etc."
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="headline">${esc(r.headline)}</textarea>
        <div class="esp-card-foot">
          <div class="valor-wrap"><span class="valor-prefix">R$</span><input class="cell-input valor sensitive" type="text" inputmode="decimal" value="${esc(valorDisplay(r.valor))}"
            data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="valor" placeholder="0,00"></div>
          <button class="icon-btn" title="Excluir lançamento" data-action="delete-video" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}">✕</button>
        </div>
      </div>`;
    });
    rowsHtml += `</div>`;
  } else {
    rowsHtml = `<div class="table-wrap"><table class="ledger">
      <thead><tr>
        <th class="num">Nº</th><th>Vídeo</th><th>Cliente</th>
        <th class="data">Data</th><th class="valor">Valor</th><th class="acao"></th>
      </tr></thead><tbody>`;
    ordenar(rows).forEach(([r,i])=>{
      rowsHtml += `<tr data-row="${r.id}" class="${animateRows?'row-enter':''}">
        <td class="num">${i+1}</td>
        <td class="video"><input class="cell-input" type="text" value="${esc(r.headline)}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="headline" placeholder="Nome do vídeo"></td>
        <td class="cliente"><input class="cell-input" type="text" value="${esc(r.subcliente)}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="subcliente" placeholder="Cliente final"></td>
        <td class="data">${botaoData(r.data, `data-tipo="video" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}"`)}</td>
        <td class="valor"><div class="valor-wrap"><span class="valor-prefix">R$</span><input class="cell-input valor sensitive" type="text" inputmode="decimal" value="${esc(valorDisplay(r.valor))}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="valor"></div></td>
        <td class="acao"><button class="icon-btn" title="Excluir vídeo" data-action="delete-video" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}">✕</button></td>
      </tr>`;
    });
    rowsHtml += `</tbody></table></div>`;
  }

  const addBtn = `<button class="add-row-btn${ui.ordemDesc?' add-topo':''}" data-action="add-video" data-client="${clientId}" data-ym="${ym}">+ ${isEsp?'adicionar lançamento':'adicionar vídeo'}</button>`;
  const desdeP = inicioPeriodo(clientId, ym);
  const mesNome = MES_NOME[view.month];
  return `
    <div class="lc-card lc-head">
      <div class="lc-cli">
        <span class="lc-chip ${chipClass(clientId)}">${esc(initials(c.nome))}</span>
        <div class="lc-nome"><div class="panel-title">${esc(c.nome)}${isEsp?' <span class="tipo-badge">esporádico</span>':''}</div></div>
        <div class="year-switch lc-ano">
          <button data-action="year-step" data-client="${clientId}" data-dir="-1" aria-label="Ano anterior">‹</button>
          <span>${view.year}</span>
          <button data-action="year-step" data-client="${clientId}" data-dir="1" aria-label="Próximo ano">›</button>
        </div>
      </div>
      ${periodoStatusHtml(clientId, ym, total)}
    </div>
    <div class="lc-stats">
      <div class="lc-st lc-st-g"><small>Neste período</small><b class="sensitive">R$ ${fmtBRL(total)}</b><span>${mesNome}${desdeP ? ` · desde ${ddmm(desdeP)}` : ''}</span></div>
      <div class="lc-st lc-st-l"><small>No ano</small><b class="sensitive">R$ ${fmtBRL(clientYearTotal(clientId, view.year))}</b><span>${view.year}</span></div>
      <div class="lc-st lc-st-s"><small>Lançamentos</small><b>${rows.length}</b><span>${isEsp?'no período':'vídeos no período'}</span></div>
    </div>
    <div class="lc-card lc-meses">
      <div class="lc-mh"><small>Meses de ${view.year}</small><span>altura = quanto faturou</span></div>
      ${monthsHtml}
    </div>
    <div class="lc-card lc-lista">
      <div class="lc-mh"><small>${isEsp?'Lançamentos':'Vídeos'} de ${mesNome.toLowerCase()}</small><span>total <b class="sensitive">R$ ${fmtBRL(total)}</b></span></div>
      <div class="action-bar action-top">
        <button class="btn primary" data-action="gerar-pdf" data-client="${clientId}" data-ym="${ym}" ${rows.length===0?'disabled':''}>Gerar relatório PDF</button>
        ${fecharPeriodoHtml(clientId, ym, rows, total)}
        ${rows.length>1 ? `<button type="button" class="ordem-btn${ui.ordemDesc?' desc':''}" data-action="virar-lista" aria-pressed="${ui.ordemDesc}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>${ui.ordemDesc?'Mais recentes primeiro':'Mais antigos primeiro'}</button>` : ''}
      </div>
      ${ui.ordemDesc ? addBtn : ''}
      ${rowsHtml}
      <div class="table-foot">
        ${ui.ordemDesc ? '<span></span>' : addBtn}
        <div class="month-total">Total do período: <b class="sensitive">R$ ${fmtBRL(total)}</b></div>
      </div>
    </div>
  `;
}

/* ---------------- faturamento / limite MEI ---------------- */
function renderFaturamento(){
  const year = ui.fatYear;
  const {total, msgClass, msg} = limiteProgress(year);

  const rows = (state.notas[year]||[]).slice().sort((a,b)=>{
    if(!a.data && !b.data) return 0;
    if(!a.data) return 1;
    if(!b.data) return -1;
    return a.data.localeCompare(b.data);
  });

  const empresaOptions = state.clients.map(c=>`<option value="${esc(c.nome)}">`).join('');
  const animateRows = shouldAnimateRows('notas:'+year);

  let rowsHtml;
  if(rows.length===0){
    rowsHtml = `<div class="empty-hint">Nenhuma nota lançada em ${year} ainda.</div>`;
  } else {
    rowsHtml = `<div class="table-wrap"><table class="ledger">
      <thead><tr><th>Empresa</th><th class="data">Data</th><th class="valor">Valor</th><th class="acao"></th></tr></thead>
      <tbody>`;
    rows.forEach(r=>{
      rowsHtml += `<tr class="${animateRows?'row-enter':''}">
        <td><input class="cell-input" type="text" list="empresa-list" value="${esc(r.empresa)}"
          data-role="nota-field" data-year="${year}" data-row="${r.id}" data-field="empresa"></td>
        <td>${botaoData(r.data, `data-tipo="nota" data-year="${year}" data-row="${r.id}"`)}</td>
        <td><div class="valor-wrap"><span class="valor-prefix">R$</span><input class="cell-input valor sensitive" type="text" inputmode="decimal" value="${esc(valorDisplay(r.valor))}"
          data-role="nota-field" data-year="${year}" data-row="${r.id}" data-field="valor"></div></td>
        <td class="acao"><button class="icon-btn" title="Excluir nota" data-action="delete-nota" data-year="${year}" data-row="${r.id}">✕</button></td>
      </tr>`;
    });
    rowsHtml += `</tbody></table></div>
    <datalist id="empresa-list">${empresaOptions}</datalist>`;
  }

  // o medidor e o grafico por mes ficam no Painel; aqui fica o que se edita
  return `
    <div class="panel-head">
      <div class="panel-title">Notas emitidas</div>
      <div class="nt-anos">
        <div class="year-switch lc-ano">
          <button data-action="fat-year-step" data-dir="-1" aria-label="Ano anterior">‹</button>
          <span>${year}</span>
          <button data-action="fat-year-step" data-dir="1" aria-label="Próximo ano">›</button>
        </div>
        <button type="button" class="nt-novo" data-action="fat-add-year"><span aria-hidden="true">+</span> Novo ano</button>
      </div>
    </div>

    <div class="notas-resumo">
      <div class="gauge-msg ${msgClass}"><b class="sensitive">R$ ${fmtBRL(total)}</b> faturado em ${year}. <span class="sensitive">${msg}</span></div>
      <div class="hero-limit">
        limite anual (MEI): R$
        <input class="sensitive" type="text" inputmode="decimal" value="${esc(valorDisplay(state.meiLimiteAnual))}" data-role="limite-field">
      </div>
    </div>

    ${rowsHtml}
    <div class="table-foot">
      <button class="add-row-btn" data-action="add-nota" data-year="${year}">+ adicionar nota</button>
      <div class="month-total">Total ${year}: <b class="sensitive">R$ ${fmtBRL(total)}</b></div>
    </div>
  `;
}

/* ---------------- configurações ---------------- */
function renderConfig(){
  const b = state.business;
  let clientsHtml = '';
  state.clientOrder.forEach(id=>{
    const c = clientById(id);
    if(!c) return;
    const armed = isArmed('client-'+id);
    const isEsp = c.tipo==='esporadico';
    clientsHtml += `<div class="client-mgmt-row">
      <div class="client-avatar ${chipClass(id)}">${esc(initials(c.nome))}</div>
      <input type="text" value="${esc(c.nome)}" data-role="client-field" data-client="${id}" data-field="nome">
      ${isEsp
        ? `<span class="tipo-badge" title="Cliente esporádico, sem valor padrão a cada lançamento">esporádico</span>`
        : `<input class="sensitive" type="text" inputmode="decimal" value="${esc(valorDisplay(c.valorPadrao))}" title="Valor padrão por vídeo" data-role="client-field" data-client="${id}" data-field="valorPadrao">`}
      <button class="btn small danger-step ${armed?'confirming':''}" data-action="delete-client" data-client="${id}">
        ${armed?'Confirmar exclusão':'Excluir aba'}
      </button>
    </div>`;
  });

  return `
    <div class="panel-head"><div class="panel-title">Configurações</div></div>

    <div class="section-title">Dados da empresa (para o relatório em PDF)</div>
    <div class="form-grid">
      <div class="field"><label>Nome fantasia</label>
        <input type="text" value="${esc(b.nomeFantasia)}" data-role="business-field" data-field="nomeFantasia"></div>
      <div class="field"><label>Como te chamar (saudação do topo)</label>
        <input type="text" value="${esc(b.apelido||'')}" placeholder="${esc(nomeSaudacao()||'Seu nome')}" data-role="business-field" data-field="apelido"></div>
      <div class="field"><label>Razão social</label>
        <input type="text" value="${esc(b.razaoSocial)}" data-role="business-field" data-field="razaoSocial"></div>
      <div class="field"><label>CNPJ</label>
        <input class="sensitive" type="text" value="${esc(b.cnpj)}" data-role="business-field" data-field="cnpj"></div>
      <div class="field"><label>Chave Pix</label>
        <input class="sensitive" type="text" value="${esc(b.pix)}" data-role="business-field" data-field="pix"></div>
      <div class="field"><label>E-mail (opcional)</label>
        <input type="text" value="${esc(b.email)}" data-role="business-field" data-field="email"></div>
      <div class="field"><label>Telefone (opcional)</label>
        <input type="text" value="${esc(b.telefone)}" data-role="business-field" data-field="telefone"></div>
    </div>

    <div class="section-title">Limite anual do MEI</div>
    <div class="field" style="max-width:220px;">
      <label>Valor do limite (R$)</label>
      <input class="sensitive" type="text" inputmode="decimal" value="${esc(valorDisplay(state.meiLimiteAnual))}" data-role="limite-field">
    </div>

    <div class="section-title">Abas de clientes</div>
    <div>${clientsHtml || '<div class="empty-hint">Nenhuma aba de cliente cadastrada.</div>'}</div>

    <div class="section-title">Quando cada cliente costuma fechar</div>
    <p style="color:var(--ink-soft);font-size:13px;max-width:60ch;margin:0 0 6px;">
      Só pra estimativa no Painel. O fechamento de verdade é quando você aperta “Fechar período” e depois “Já emiti a nota”.
    </p>
    <div>${state.clientOrder.map(id=>{
      const c = clientById(id);
      if(!c) return '';
      const dia = Number(c.diaFechamento)||0;
      const opts = ['<option value="0"'+(dia===0?' selected':'')+'>último dia do mês</option>']
        .concat(Array.from({length:31},(_,i)=>`<option value="${i+1}"${dia===i+1?' selected':''}>dia ${i+1} do mês seguinte</option>`)).join('');
      return `<div class="client-mgmt-row fecha-row">
        <div class="client-avatar ${chipClass(id)}">${esc(initials(c.nome))}</div>
        <span class="fecha-nome">${esc(c.nome)}</span>
        <select data-role="client-fecha" data-client="${id}" aria-label="Quando ${esc(c.nome)} costuma fechar">${opts}</select>
      </div>`;
    }).join('')}</div>

    <div class="section-title">Aparência</div>
    <div class="tema-seg" role="group" aria-label="Aparência">
      ${[['claro','Claro','<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'],
         ['escuro','Escuro','<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'],
         ['auto','Automático','<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5z" fill="currentColor"/>']]
        .map(([v,t,p])=>`<button type="button" class="${temaAtual()===v?'on':''}" data-action="set-tema" data-tema="${v}" aria-pressed="${temaAtual()===v}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>${t}</button>`).join('')}
    </div>
    <p style="color:var(--ink-soft);font-size:13px;max-width:60ch;margin:0 0 6px;">
      Automático segue o Mac e o celular: escuro quando o aparelho está no modo escuro. Fica guardado em cada aparelho e não mexe nos seus dados.
    </p>

    <div class="section-title">CNPJ dos clientes</div>
    <p style="color:var(--ink-soft);font-size:13px;max-width:60ch;margin:0 0 6px;">
      Só pra você copiar e colar no site da Receita na hora de emitir a nota. Fica guardado junto com o cadastro do cliente.
    </p>
    <div>${state.clientOrder.map(id=>{
      const c = clientById(id);
      if(!c) return '';
      return `<div class="client-mgmt-row fecha-row">
        <div class="client-avatar ${chipClass(id)}">${esc(initials(c.nome))}</div>
        <span class="fecha-nome">${esc(c.nome)}</span>
        <input class="sensitive cnpj-in" type="text" inputmode="numeric" autocomplete="off" placeholder="00.000.000/0001-00" value="${esc(c.cnpj||'')}" data-role="client-cnpj" data-client="${id}" aria-label="CNPJ de ${esc(c.nome)}">
      </div>`;
    }).join('')}</div>

    <div class="section-title">Backup</div>
    <p style="color:var(--ink-soft);font-size:13px;max-width:60ch;">
      Seus dados ficam salvos automaticamente na nuvem (Supabase). Ainda assim, é uma boa ideia baixar uma cópia de tempos em tempos.
    </p>
    <div class="backup-row">
      <button class="btn" data-action="export-backup">Baixar backup (.json)</button>
      <button class="btn" data-action="trigger-import">Restaurar backup</button>
      <input type="file" id="import-file" class="hidden-file" accept="application/json">
    </div>
    ${ui.pendingImport ? `
      <div class="import-confirm">
        <p style="color:var(--danger);font-weight:600;margin:12px 0 8px;">
          Substituir TODOS os dados atuais pelo arquivo "${esc(ui.pendingImport.fileName)}"? Logo depois dá pra desfazer por 10 segundos.
        </p>
        <button class="btn danger-step confirming" data-action="confirm-import">Sim, substituir tudo</button>
        <button class="btn" data-action="cancel-import">Cancelar</button>
      </div>
    ` : ''}
  `;
}

/* ---------------- focus-preserving render ---------------- */
function renderPreserveFocus(){
  const active = document.activeElement;
  let restore = null;
  if(active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA' || active.tagName==='SELECT') && active.dataset.role){
    restore = {
      role: active.dataset.role, client: active.dataset.client, year: active.dataset.year,
      ym: active.dataset.ym, row: active.dataset.row, field: active.dataset.field,
      selStart: active.selectionStart, selEnd: active.selectionEnd
    };
  }
  render();
  if(restore){
    let sel = `[data-role="${restore.role}"]`;
    if(restore.client) sel += `[data-client="${restore.client}"]`;
    if(restore.year) sel += `[data-year="${restore.year}"]`;
    if(restore.ym) sel += `[data-ym="${restore.ym}"]`;
    if(restore.row) sel += `[data-row="${restore.row}"]`;
    if(restore.field) sel += `[data-field="${restore.field}"]`;
    const el = document.querySelector(sel);
    if(el){
      el.focus();
      if(typeof restore.selStart==='number' && (el.tagName==='TEXTAREA' || el.type==='text' || el.type==='search')){
        try{ el.setSelectionRange(restore.selStart, restore.selEnd); }catch(e){}
      }
    }
  }
}

/* ---------------- input handling ---------------- */
function onAppInput(e){
  try{
    onAppInputInner(e);
  }catch(err){
    console.error(err);
  }
}

function onAppInputInner(e){
  const t = e.target;
  if(t.dataset && (t.dataset.role==='orc' || t.dataset.role==='orc-item')){ orcCampo(t); return; }
  if(t.id==='meta-in'){ ui.metaDraft = t.value; return; }
  if(t.id==='new-client-name'){ ui.newClientName = t.value; ui.newClientFoco = t.id; return; }
  if(t.id==='new-client-valor'){ ui.newClientValor = t.value; ui.newClientFoco = t.id; return; }
  const role = t.dataset.role;
  if(!role) return;

  // IMPORTANT: re-rendering (rebuilding the DOM) on every keystroke breaks
  // accent/dead-key composition in free-text fields — the OS is mid-way
  // through composing a character like "â" (^ then a) when the input element
  // gets replaced, so the dead key gets committed as a literal "^" and the
  // "a" lands separately, producing "L^amego" instead of "Lâmego". So we only
  // re-render live while typing in fields that actually drive a number shown
  // elsewhere on screen (a total, a gauge, a chart) — free-text fields just
  // update the data and save, letting the browser's own input element (and
  // its composition state) stay untouched.

  if(role==='video-field'){
    const rows = getVideos(t.dataset.client, t.dataset.ym);
    const row = rows.find(r=>r.id===t.dataset.row);
    if(!row) return;
    // keep the raw text the person is typing (don't coerce to a number here) —
    // parsing on every keystroke rewrites the field mid-typing and swallows
    // things like a trailing decimal point. Numbers are coerced wherever totals
    // are calculated instead.
    row[t.dataset.field] = t.value;
    persist();
    if(t.dataset.field==='valor') renderPreserveFocus();
  } else if(role==='nota-field'){
    const rows = state.notas[t.dataset.year] || [];
    const row = rows.find(r=>r.id===t.dataset.row);
    if(!row) return;
    if(t.dataset.field==='valor') row.valor = t.value;
    else if(t.dataset.field==='data') row.data = t.value || null;
    else row.empresa = t.value;
    persist();
    if(t.dataset.field==='valor' || t.dataset.field==='data') renderPreserveFocus();
  } else if(role==='business-field'){
    state.business[t.dataset.field] = t.value;
    persist();
    // topbar shows nomeFantasia/cnpj live — patch just those two text nodes
    // directly instead of a full render, so the field being typed in is
    // never touched.
    if(t.dataset.field==='apelido' || t.dataset.field==='nomeFantasia'){
      const em = document.querySelector('.topbar .tr-oi em');
      if(em) em.textContent = nomeSaudacao();
    }
    if(t.dataset.field==='nomeFantasia'){
      const h1 = document.querySelector('.topbar .brand h1');
      if(h1) h1.textContent = t.value || 'Minha empresa';
    } else if(t.dataset.field==='cnpj'){
      const sub = document.querySelector('.topbar .brand .sub');
      if(sub) sub.textContent = `CNPJ ${t.value || '—'}`;
    }
  } else if(role==='client-field'){
    const c = clientById(t.dataset.client);
    if(!c) return;
    if(t.dataset.field==='valorPadrao') c.valorPadrao = t.value;
    else c.nome = t.value;
    persist();
    // rail tab label shows the client name live — patch just that span.
    if(t.dataset.field==='nome'){
      const railLabel = document.querySelector(`.rail .tab-btn[data-tab="${t.dataset.client}"] .tab-label`);
      if(railLabel) railLabel.textContent = t.value;
      const railChip = document.querySelector(`.rail .tab-btn[data-tab="${t.dataset.client}"] .tab-chip`);
      if(railChip) railChip.textContent = initials(t.value);
    }
  } else if(role==='client-cnpj'){
    const c = clientById(t.dataset.client);
    if(!c) return;
    c.cnpj = t.value;
    persist();
  } else if(role==='client-fecha'){
    const c = clientById(t.dataset.client);
    if(!c) return;
    c.diaFechamento = Number(t.value) || 0;
    persist();
  } else if(role==='limite-field'){
    state.meiLimiteAnual = t.value;
    persist();
    renderPreserveFocus();
  }
}

/* ---------------- normalize numbers when leaving a field ---------------- */
function onAppFocusOut(e){
  if(renderPendente) setTimeout(()=>{ if(renderPendente && !digitandoTextoLivre()) renderQuandoPuder(); }, 0);
  const t = e.target;
  if(!t || !t.dataset || !t.dataset.role) return;
  const role = t.dataset.role;
  let formatted = null;
  let antes, depois;

  if(role==='video-field' && t.dataset.field==='valor'){
    const rows = getVideos(t.dataset.client, t.dataset.ym);
    const row = rows.find(r=>r.id===t.dataset.row);
    if(!row) return;
    antes = row.valor;
    row.valor = parseBRL(row.valor);
    depois = row.valor;
    formatted = fmtBRL(row.valor);
  } else if(role==='nota-field' && t.dataset.field==='valor'){
    const rows = state.notas[t.dataset.year] || [];
    const row = rows.find(r=>r.id===t.dataset.row);
    if(!row) return;
    antes = row.valor;
    row.valor = parseBRL(row.valor);
    depois = row.valor;
    formatted = fmtBRL(row.valor);
  } else if(role==='client-field' && t.dataset.field==='valorPadrao'){
    const c = clientById(t.dataset.client);
    if(!c) return;
    antes = c.valorPadrao;
    c.valorPadrao = parseBRL(c.valorPadrao);
    depois = c.valorPadrao;
    formatted = fmtBRL(c.valorPadrao);
  } else if(role==='limite-field'){
    antes = state.meiLimiteAnual;
    state.meiLimiteAnual = parseBRL(state.meiLimiteAnual)||81000;
    depois = state.meiLimiteAnual;
    formatted = fmtBRL(state.meiLimiteAnual);
  } else {
    return;
  }

  // Totals, the gauge, etc. are already up to date — every keystroke re-renders
  // them via onAppInput. Here we only need to tidy up this one field's display
  // ("30" -> "30,00"), so we edit its value directly instead of doing a full
  // render(). A full render() at this exact moment (while a click elsewhere may
  // already be mid-flight, e.g. switching tabs) can replace the DOM out from
  // under that click and make it silently do nothing.
  t.value = formatted;
  // so arrumou a exibicao ("30" -> "30,00")? nao conta como edicao nem grava
  if(antes !== depois) persist();
}

/* ---------------- click handling ---------------- */
function onAppClick(e){
  try{
    onAppClickInner(e);
  }catch(err){
    console.error(err);
    showToast('Algo deu errado nessa ação. Nada foi perdido — tente de novo.');
  }
}

function onAppClickInner(e){
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const action = btn.dataset.action;

  if(action.startsWith('orc-')){ orcAcao(action, btn); return; }
  if(action==='toggle-privacy'){
    ui.valuesHidden = !ui.valuesHidden;
    document.body.classList.toggle('privacy-on', ui.valuesHidden);
    try{ localStorage.setItem(PRIVACY_KEY, ui.valuesHidden ? '1' : '0'); }catch(e){}
    render();
  }
  else if(action==='switch-screen'){
    const alvo = btn.dataset.screen;
    const clienteValido = id => id && id!=='FATURAMENTO' && id!=='CONFIG' && id!=='ORCAMENTOS' && clientById(id);
    if(alvo==='painel'){
      if(ui.screen==='painel') return;
      ui.screen = 'painel';
    } else {
      let tab;
      if(alvo==='notas') tab = 'FATURAMENTO';
      else if(alvo==='config') tab = 'CONFIG';
      else if(alvo==='orc') tab = 'ORCAMENTOS';
      else tab = clienteValido(ui.tab) ? ui.tab : (clienteValido(ui.ultimoCliente) ? ui.ultimoCliente : (state.clientOrder.find(clienteValido) || 'FATURAMENTO'));
      if(ui.screen==='lanc' && ui.tab===tab) return;
      ui.screen = 'lanc';
      ui.confirmClose = null;
      ui.tab = tab;
      if(clienteValido(tab)) ensureClientView(tab);
    }
    ui.screenAnim = true;
    ui.metaEditing = false;
    render();
    window.scrollTo({top:0});
  }
  else if(action==='go-lancar'){
    // atalho do Painel: abre Lançamentos numa aba de cliente, no mês atual
    if(!ui.tab || ui.tab==='FATURAMENTO' || ui.tab==='CONFIG' || ui.tab==='ORCAMENTOS') ui.tab = state.clientOrder[0] || 'FATURAMENTO';
    if(ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG' && ui.tab!=='ORCAMENTOS') ensureClientView(ui.tab);
    ui.screen = 'lanc';
    ui.screenAnim = true;
    ui.metaEditing = false;
    render();
    window.scrollTo({top:0});
  }
  else if(action==='semanas-mes'){
    // so troca o mes mostrado no cartao "Semana a semana" — nada e salvo
    const porData = videosPorData();
    const alvo = shiftYm(semanasYm(porData), Number(btn.dataset.dir)||0);
    ui.semanasYm = alvo===monthKey(REAL_YEAR, REAL_MONTH) ? null : alvo;
    render();
  }
  else if(action==='meta-mes'){
    // so troca o mes mostrado no cartao da meta — nada e salvo
    const alvo = shiftYm(metaYm(), Number(btn.dataset.dir)||0);
    ui.metaYm = alvo===monthKey(REAL_YEAR, REAL_MONTH) ? null : alvo;
    ui.metaEditing = false;
    render();
  }
  else if(action==='meta-edit'){
    ui.metaEditYm = metaYm();
    const meta = metaDoMes(ui.metaEditYm);
    ui.metaDraft = meta ? fmtBRL(meta) : '';
    ui.metaEditing = true;
    ui.metaFocus = true;
    render();
  }
  else if(action==='meta-cancel'){
    ui.metaEditing = false;
    render();
  }
  else if(action==='switch-tab'){
    ui.confirmClose = null;
    ui.tab = btn.dataset.tab;
    ui.ultimoCliente = ui.tab;
    if(ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG' && ui.tab!=='ORCAMENTOS') ensureClientView(ui.tab);
    render();
  }
  else if(action==='switch-month'){
    ui.confirmClose = null;
    ensureClientView(btn.dataset.client).month = btn.dataset.month;
    render();
  }
  else if(action==='year-step'){
    const v = ensureClientView(btn.dataset.client);
    v.year = String(Number(v.year) + Number(btn.dataset.dir));
    render();
  }
  else if(action==='fat-year-step'){
    // so troca o ano mostrado — o ano so entra nos dados quando ganhar uma nota
    ui.fatYear = String(Number(ui.fatYear) + Number(btn.dataset.dir));
    render();
  }
  else if(action==='fat-add-year'){
    const years = state.notasYears.map(Number);
    const y = String(Math.max(...years, Number(REAL_YEAR)) + 1);
    if(!state.notas[y]) state.notas[y] = [];
    state.notasYears.push(y); state.notasYears.sort();
    ui.fatYear = y;
    persist();
    render();
  }
  else if(action==='add-video'){
    refreshToday();
    const client = btn.dataset.client, ym = btn.dataset.ym;
    const rows = getVideos(client, ym);
    const c = clientById(client);
    // data de hoje sempre que for o periodo aberto ou um mes vizinho (a Wide
    // "Setembro" recebe video ate 04/10) — so um mes distante (lancando
    // historico) comeca no dia 1 daquele mes
    const perto = ym===periodoAberto(client) || Math.abs(ymDiff(ym, monthKey(REAL_YEAR, REAL_MONTH)))<=1;
    const defaultData = perto ? TODAY_ISO : (ym + '-01');
    if(c && c.tipo==='esporadico'){
      // esporádico: cada lançamento é de um cliente diferente, então tudo
      // começa em branco — nada de repetir o último cliente/valor aqui.
      rows.push({
        id: uid('v'),
        headline: '',
        subcliente: '',
        data: defaultData,
        valor: ''
      });
    } else {
      const last = rows[rows.length-1];
      rows.push({
        id: uid('v'),
        headline: `Vídeo ${rows.length+1}`,
        subcliente: last ? last.subcliente : '',
        data: defaultData,
        valor: last ? last.valor : (c ? c.valorPadrao : 0)
      });
    }
    persist();
    render();
  }
  else if(action==='delete-video'){
    const client = btn.dataset.client, ym = btn.dataset.ym, id = btn.dataset.row;
    const rows = getVideos(client, ym);
    const idx = rows.findIndex(r=>r.id===id);
    if(idx<0) return;
    const [removed] = rows.splice(idx,1);
    persist();
    render();
    showToast('Vídeo excluído.', ()=>{
      const atual = getVideos(client, ym);
      if(atual.some(r=>r.id===removed.id)) return;
      atual.splice(Math.min(idx, atual.length),0,removed);
      persist();
      render();
    });
  }
  else if(action==='add-nota'){
    refreshToday();
    const year = btn.dataset.year;
    if(!state.notas[year]) state.notas[year] = [];
    if(!state.notasYears.includes(year)){ state.notasYears.push(year); state.notasYears.sort(); }
    const isCurrentYear = year === REAL_YEAR;
    state.notas[year].push({
      id: uid('n'),
      empresa: '',
      data: isCurrentYear ? TODAY_ISO : (year + '-01-01'),
      valor: 0
    });
    persist();
    render();
  }
  else if(action==='delete-nota'){
    const year = btn.dataset.year, id = btn.dataset.row;
    const rows = state.notas[year] || [];
    const idx = rows.findIndex(r=>r.id===id);
    if(idx<0) return;
    const [removed] = rows.splice(idx,1);
    persist();
    render();
    showToast('Nota excluída.', ()=>{
      if(!state.notas[year]) state.notas[year] = [];
      const atual = state.notas[year];
      if(atual.some(r=>r.id===removed.id)) return;
      atual.splice(Math.min(idx, atual.length),0,removed);
      persist();
      render();
    });
  }
  else if(action==='gerar-pdf'){
    generatePDF(btn.dataset.client, btn.dataset.ym);
  }
  else if(action==='fechar-periodo'){
    if(periodoFechado(btn.dataset.client, btn.dataset.ym)) return;
    ui.fecharJanela = {cid: btn.dataset.client, ym: btn.dataset.ym, etapa: 'dados'};
    render();
  }
  else if(action==='set-tema'){
    lsSet(TEMA_KEY, btn.dataset.tema);
    aplicarTema();
    render();
  }
  else if(action==='virar-lista'){
    ui.ordemDesc = !ui.ordemDesc;
    lsSet(LS.ordem, ui.ordemDesc ? 'desc' : 'asc');
    render();
  }
  else if(action==='abrir-cal'){
    const d = btn.dataset;
    ui.cal = {tipo: d.tipo, client: d.client, ym: d.ym, year: d.year, row: d.row, mes: ''};
    const linha = calLinha();
    if(!linha){ ui.cal = null; return; }
    ui.cal.mes = (linha.data || TODAY_ISO).slice(0,7);
    render();
  }
  else if(action==='cal-mes'){
    if(!ui.cal) return;
    ui.cal.mes = shiftYm(ui.cal.mes, Number(btn.dataset.dir));
    render();
  }
  else if(action==='cal-fechar'){
    ui.cal = null;
    render();
  }
  else if(action==='cal-dia' || action==='cal-limpar'){
    const linha = calLinha();
    if(linha){
      linha.data = action==='cal-limpar' ? null : btn.dataset.dia;
      persist();
    }
    ui.cal = null;
    render();
  }
  else if(action==='fechar-janela'){
    ui.fecharJanela = null;
    render();
  }
  else if(action==='fechar-cadastrar-cnpj'){
    ui.fecharJanela = null;
    ui.screen = 'lanc'; ui.tab = 'CONFIG'; ui.screenAnim = true;
    render();
  }
  else if(action==='copiar'){
    const v = btn.dataset.copy || '';
    const ok = ()=>{ btn.textContent = 'Copiado'; btn.classList.add('ok'); setTimeout(()=>{ btn.textContent = 'Copiar'; btn.classList.remove('ok'); }, 1500); };
    try{ navigator.clipboard.writeText(v).then(ok, ()=>copiarManual(v, ok)); }catch(e){ copiarManual(v, ok); }
  }
  else if(action==='fechar-salvar-rel'){
    const j = ui.fecharJanela;
    ui.fecharJanela = null;
    render();
    if(j) generatePDF(j.cid, j.ym);
  }
  else if(action==='fechar-ja-emiti'){
    refreshToday();
    const client = btn.dataset.client, ym = btn.dataset.ym;
    const c = clientById(client);
    if(!c || periodoFechado(client, ym)){ ui.fecharJanela = null; render(); return; }
    ui.fecharJanela = {cid: client, ym, etapa: 'feito'};
    const total = monthTotal(client, ym);
    if(!state.fechamentos[client]) state.fechamentos[client] = {};
    const antes = state.fechamentos[client][ym]; // undefined, ou {aberto:true, notaId} se foi reaberto
    const antiga = antes && antes.aberto ? acharNota(antes.notaId) : null;
    let notaId, desfazerNota;
    if(antiga){
      // reaberto e fechado de novo: atualiza a mesma nota, nao duplica
      const {valor, data} = antiga.nota;
      antiga.nota.valor = total;
      antiga.nota.data = TODAY_ISO;
      notaId = antiga.nota.id;
      desfazerNota = ()=>{ const n = acharNota(notaId); if(n){ n.nota.valor = valor; n.nota.data = data; } };
    } else {
      // a nota entra no ano em que foi emitida (hoje), que e o que conta pro limite do MEI
      const year = TODAY_ISO.slice(0,4);
      if(!state.notas[year]) state.notas[year] = [];
      if(!state.notasYears.includes(year)){ state.notasYears.push(year); state.notasYears.sort(); }
      notaId = uid('n');
      state.notas[year].push({id: notaId, empresa: c.nome, data: TODAY_ISO, valor: total});
      desfazerNota = ()=>{ const n = acharNota(notaId); if(n) state.notas[n.year].splice(n.idx, 1); };
    }
    state.fechamentos[client][ym] = {data: TODAY_ISO, notaId, valor: total};
    const view = ensureClientView(client);
    const prox = shiftYm(ym, 1);
    view.year = prox.slice(0,4); view.month = prox.slice(5,7);
    persist();
    render();
    showToast(`${c.nome}: ${nomeMesYm(ym)} fechado · nota de R$ ${fmtBRL(total)} lançada.`, ()=>{
      ui.fecharJanela = null;
      desfazerNota();
      if(antes===undefined) delete state.fechamentos[client][ym];
      else state.fechamentos[client][ym] = antes;
      view.year = ym.slice(0,4); view.month = ym.slice(5,7);
      persist();
      render();
    });
  }
  else if(action==='reabrir-periodo'){
    const client = btn.dataset.client, ym = btn.dataset.ym;
    const f = fechamentoDe(client, ym);
    if(!f || f.aberto) return;
    state.fechamentos[client][ym] = {aberto: true, notaId: f.notaId};
    persist();
    render();
    showToast(`Período reaberto. A nota de R$ ${fmtBRL(parseBRL(f.valor))} continua em Notas emitidas — ao fechar de novo, ela é atualizada.`, ()=>{
      state.fechamentos[client][ym] = f;
      persist();
      render();
    });
  }
  else if(action==='abrir-cliente'){
    const client = btn.dataset.client;
    if(!clientById(client)) return;
    ui.tab = client;
    const ym = periodoAberto(client);
    const view = ensureClientView(client);
    view.year = ym.slice(0,4); view.month = ym.slice(5,7);
    ui.screen = 'lanc';
    ui.screenAnim = true;
    ui.metaEditing = false;
    render();
    window.scrollTo({top:0});
  }
  else if(action==='start-add-client'){
    ui.addingClient = true;
    ui.newClientName = ''; ui.newClientValor = ''; ui.newClientFoco = null;
    ui.addingClientTipo = 'fixo';
    render();
  }
  else if(action==='cancel-add-client'){
    ui.addingClient = false;
    ui.addingClientTipo = 'fixo';
    render();
  }
  else if(action==='set-new-client-tipo'){
    ui.addingClientTipo = btn.dataset.tipo;
    render();
  }
  else if(action==='confirm-add-client'){
    const nameEl = document.getElementById('new-client-name');
    const valorEl = document.getElementById('new-client-valor');
    const name = (nameEl.value||'').trim();
    if(!name){ nameEl.focus(); return; }
    const id = uid('c');
    const tipo = ui.addingClientTipo==='esporadico' ? 'esporadico' : 'fixo';
    state.clients.push({id, nome:name, valorPadrao: valorEl ? parseBRL(valorEl.value) : 0, tipo, diaFechamento: 0});
    state.clientOrder.push(id);
    ui.addingClient = false;
    ui.newClientName = ''; ui.newClientValor = ''; ui.newClientFoco = null;
    ui.addingClientTipo = 'fixo';
    ui.tab = id;
    ensureClientView(id);
    persist();
    render();
  }
  else if(action==='delete-client'){
    const id = btn.dataset.client;
    const key = 'client-'+id;
    if(!isArmed(key)){
      armDelete(key);
      return;
    }
    delete ui.deleteArm[key];
    const clientIdx = state.clients.findIndex(c=>c.id===id);
    const removedClient = state.clients[clientIdx];
    const orderIdx = state.clientOrder.indexOf(id);
    const removedVideos = state.videos[id];
    const removedFech = state.fechamentos[id];
    const previousTab = ui.tab;
    state.clients = state.clients.filter(c=>c.id!==id);
    state.clientOrder = state.clientOrder.filter(cid=>cid!==id);
    delete state.videos[id];
    delete state.fechamentos[id];
    if(ui.tab===id) ui.tab = state.clientOrder[0] || 'FATURAMENTO';
    persist();
    render();
    if(removedClient){
      showToast(`Cliente "${removedClient.nome}" excluído.`, () => {
        if(clientById(id)) return;
        state.clients.splice(Math.min(clientIdx, state.clients.length), 0, removedClient);
        if(!state.clientOrder.includes(id)) state.clientOrder.splice(Math.min(orderIdx, state.clientOrder.length), 0, id);
        if(removedVideos !== undefined) state.videos[id] = removedVideos;
        if(removedFech !== undefined) state.fechamentos[id] = removedFech;
        ui.tab = previousTab === id ? id : previousTab;
        persist();
        render();
      });
    }
  }
  else if(action==='export-backup'){
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-joel-neto-filmes-${TODAY_ISO}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  else if(action==='trigger-import'){
    document.getElementById('import-file').click();
  }
  else if(action==='confirm-import'){
    if(!ui.pendingImport) return;
    const antes = state;
    state = ui.pendingImport.data;
    migrateState();
    ui.pendingImport = null;
    persist();
    render();
    showToast('Backup restaurado.', ()=>{
      state = antes;
      persist();
      render();
    });
  }
  else if(action==='cancel-import'){
    ui.pendingImport = null;
    render();
  }
  else if(action==='conflito-ok'){
    ui.conflito = null;
    render();
  }
  else if(action==='toast-undo'){
    const fn = ui.toast && ui.toast.undoFn;
    ui.toast = null;
    if(fn) fn();
    render();
  }
}

function onAppSubmit(e){
  const form = e.target.closest('[data-meta-form]');
  if(!form) return;
  e.preventDefault();
  try{
    // vazio ou zero = mes sem meta (volta o botao "Definir meta do mes")
    const v = parseBRL(ui.metaDraft);
    if(!state.metas || typeof state.metas!=='object') state.metas = {};
    state.metas[ui.metaEditYm || monthKey(REAL_YEAR, REAL_MONTH)] = v > 0 ? Math.round(v*100)/100 : 0;
    ui.metaEditing = false;
    persist();
    render();
  }catch(err){
    console.error(err);
    showToast('Algo deu errado nessa ação. Nada foi perdido — tente de novo.');
  }
}

function onImportFile(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(!parsed.clients || !parsed.business){ throw new Error('formato inválido'); }
      // não aplica na hora — pede confirmação, já que isso substitui TODOS os
      // dados atuais (notas, vídeos, clientes) sem volta.
      ui.pendingImport = {data: parsed, fileName: file.name};
      render();
    }catch(err){
      showToast('Não consegui ler esse arquivo. Confira se é um backup válido (.json).');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ---------------- PDF report ---------------- */
// Esc fecha a janela de fechar periodo
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && ui.cal){ ui.cal = null; render(); return; }
  if(e.key==='Escape' && ui.fecharJanela){ ui.fecharJanela = null; render(); }
});

// plano B da copia (navegadores que recusam clipboard): seleciona por um campo escondido
function copiarManual(v, ok){
  try{
    const t = document.createElement('textarea');
    t.value = v; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    const feito = document.execCommand('copy');
    document.body.removeChild(t);
    if(feito) ok();
  }catch(e){}
}

/* ================================================================
   ORÇAMENTOS + calculadora "Quanto cobrar?" (2026-09-29)
   Mockup aprovado: https://claude.ai/artifact/RA5LryQDxU3TWvUWSSrNZw
   Dados: state.orcamentos (lista NOVA, so acrescenta; cada orcamento
   e itens tem id, entao a mescla de dois aparelhos junta item a item).
   O texto automatico NAO e gravado: so vira dado quando o Joel edita
   (textoEditado). Campos guardam o que foi digitado; numeros so sao
   convertidos na hora de calcular.
   ================================================================ */
const ORC_PISO = 40; // nunca abaixo do menor valor que ele ja cobra de um fixo
const ORC_NIVEIS = [
  {k:'simples',  nome:'Simples',  sub:'cortes + troca de câmera', t:'1h'},
  {k:'medio',    nome:'Médio',    sub:'+ imagens de apoio',       t:'1h15'},
  {k:'completo', nome:'Completo', sub:'+ lettering, trilha',      t:'1h45'},
];
const ORC_EXTRAS = [
  {k:'leg',    nome:'Legendas',                     min:15, inc:'Legendas'},
  {k:'duas',   nome:'Versão vertical e horizontal', min:10, inc:'Versão vertical e horizontal'},
  {k:'motion', nome:'Motion',                       min:20, inc:'Motion / animação'},
  {k:'trilha', nome:'Trilha e som',                 min:10, inc:'Trilha e ajuste de som'},
];
const ORC_STATUS = {rascunho:'rascunho', enviado:'enviado', aprovado:'aprovado'};

// hora real hoje: media do valor por video dos clientes fixos ÷ 1h15 de trabalho
function orcHoraReal(){
  const fixos = state.clients.filter(c=>c.tipo!=='esporadico').map(c=>parseBRL(c.valorPadrao)).filter(v=>v>0);
  if(!fixos.length) return 43;
  const media = fixos.reduce((s,v)=>s+v,0)/fixos.length;
  return Math.round(media/1.25);
}
function orcMediaFixos(){
  const fixos = state.clients.filter(c=>c.tipo!=='esporadico').map(c=>parseBRL(c.valorPadrao)).filter(v=>v>0);
  return fixos.length ? Math.round(fixos.reduce((s,v)=>s+v,0)/fixos.length) : 0;
}
// entende "1h30", "1:30", "1h", "45min", "90" (minutos), "1,5" (horas)
function orcTempo(v){
  v = String(v||'').toLowerCase().replace(/\s/g,''); if(!v) return 0; let m;
  if((m = v.match(/^(\d+)[h:](\d{1,2})?(min|m)?$/))) return +m[1] + (m[2] ? +m[2]/60 : 0);
  if((m = v.match(/^(\d+)(min|m)$/))) return +m[1]/60;
  const n = parseFloat(v.replace(',','.')); if(isNaN(n)) return 0;
  return n > 10 ? n/60 : n;
}
function orcFmtT(h){
  let hh = Math.floor(h+1e-9), mm = Math.round((h-hh)*60);
  if(mm===60){ hh++; mm=0; }
  return (hh ? hh+'h' : '') + (mm ? (hh ? String(mm).padStart(2,'0') : mm+'min') : '') || '0min';
}
function orcProximoNumero(){
  const ano = TODAY_ISO.slice(0,4);
  let max = 0;
  (state.orcamentos||[]).forEach(o=>{
    const m = String(o.numero||'').match(/^ORC-(\d{4})-(\d+)$/);
    if(m && m[1]===ano) max = Math.max(max, +m[2]);
  });
  return `ORC-${ano}-${String(max+1).padStart(3,'0')}`;
}
function orcNovo(){
  return {
    id: uid('o'), numero: orcProximoNumero(), data: TODAY_ISO, status: 'rascunho',
    cliente: '', projeto: '',
    itens: [{id: uid('i'), descricao: 'Edição de vídeo', qtd: '1', valor: ''}],
    descTipo: 'pc', descValor: '0', usarTotalManual: false, totalManual: '',
    texto: '', textoEditado: false, prazo: '7 dias úteis', validade: '15 dias',
    pag: {pix: true, pixDesc: '0', cartao: true, parc: '3', sinal: false},
    calc: {modo:'freela', qtd:'1', duracao:'', nivel:'simples', tempo:'1h', extras:['leg'], hora:String(orcHoraReal()), adic:30, prazo:'1'},
  };
}
function orcAtual(){ return (state.orcamentos||[]).find(o=>o.id===ui.orcId) || null; }

function orcCalcular(o){
  const c = o.calc || {};
  const freela = c.modo !== 'fixo';
  const q = Math.max(1, parseInt(c.qtd,10) || 1);
  const t = orcTempo(c.tempo) || 1;
  const H = parseBRL(c.hora) || orcHoraReal();
  const extMin = ORC_EXTRAS.filter(x=>(c.extras||[]).includes(x.k)).reduce((s,x)=>s+x.min, 0);
  const tt = t + extMin/60;
  const adic = freela ? (Number(c.adic)||0)/100 : 0;
  const pz = Number(c.prazo) || 1;
  const volMax = freela ? 0.08 : 0.12;
  const vol = q>=20 ? volMax : q>=10 ? volMax/2 : 0;
  const hora = H*(1+adic);
  const r5 = v => Math.round(v/5)*5;
  const cheio = Math.max(ORC_PISO, r5(hora*tt*pz));
  const justo = Math.max(ORC_PISO, r5(hora*tt*pz*(1-vol)));
  const min = Math.max(ORC_PISO, r5(H*tt*(1-vol)));
  const folga = r5(justo*1.15);
  return {freela, q, t, H, extMin, tt, adic, pz, vol, hora, cheio, justo, min, folga};
}
function orcTotais(o){
  const soma = (o.itens||[]).reduce((s,it)=> s + (parseInt(it.qtd,10)||0) * parseBRL(it.valor), 0);
  const dv = parseBRL(o.descValor);
  const desc = o.descTipo==='pc' ? soma*dv/100 : dv;
  const manual = o.usarTotalManual && String(o.totalManual||'').trim() !== '';
  const total = manual ? parseBRL(o.totalManual) : Math.max(0, soma - desc);
  const pixPc = parseBRL(o.pag && o.pag.pixDesc);
  return {soma, dv, desc: manual ? 0 : desc, total, manual, pix: total*(1-pixPc/100), pixPc};
}
function orcTextoPadrao(o){
  const q = (o.itens||[]).reduce((s,it)=>s+(parseInt(it.qtd,10)||0),0) || 1;
  const inc = ['Edição e cortes']
    .concat(ORC_EXTRAS.filter(x=>((o.calc&&o.calc.extras)||[]).includes(x.k)).map(x=>x.inc))
    .concat(['1 rodada de ajustes pequenos (correções de texto, troca de trecho)']);
  const proj = (o.projeto||'').trim();
  return `Olá, tudo bem? Obrigado pelo contato!\n\nSegue o orçamento para a edição de ${q} vídeo${q>1?'s':''}${proj ? ` do projeto ${proj}` : ''}.\n\nO que está incluso:\n${inc.map(x=>'• '+x).join('\n')}\n\nPrazo de entrega: ${o.prazo||'a combinar'}. Posso entregar em lotes, pra você ir aprovando enquanto sigo com os próximos.\n\nAjustes além da rodada inclusa, ou mudanças depois de aprovado, são orçados à parte.\n\nEste orçamento vale por ${o.validade||'15 dias'}. Qualquer dúvida, fico à disposição!`;
}
function orcTexto(o){ return o.textoEditado ? (o.texto||'') : orcTextoPadrao(o); }

/* ---------- tela ---------- */
function renderOrcamentos(){
  if(!Array.isArray(state.orcamentos)) state.orcamentos = [];
  const o = orcAtual();
  return o ? orcEditorHtml(o) : orcListaHtml();
}
function orcStatusChip(s){ return `<span class="oc-st oc-st-${s}">${ORC_STATUS[s]||s}</span>`; }
function orcListaHtml(){
  const lista = state.orcamentos.slice().sort((a,b)=> (b.data||'').localeCompare(a.data||'') || String(b.numero).localeCompare(String(a.numero)));
  const linhas = lista.map(o=>{
    const t = orcTotais(o);
    return `<button type="button" class="oc-linha" data-action="orc-abrir" data-id="${o.id}">
      <span class="oc-l-txt"><b>${esc(o.cliente||'Sem nome')}</b><small>${esc(o.projeto||'—')} · ${esc(o.numero)} · ${ddmm(o.data)}</small></span>
      <span class="oc-l-v sensitive">R$ ${fmtBRL(t.total)}</span>${orcStatusChip(o.status)}
    </button>`;
  }).join('');
  return `<div class="lc-card oc-head">
      <div class="lc-mh"><small>Orçamentos</small><span>${lista.length ? plural(lista.length,'orçamento','orçamentos') : ''}</span></div>
      <p class="oc-intro">Monte o preço na calculadora, preencha o orçamento e baixe o PDF pra mandar pro cliente.</p>
      <button type="button" class="btn primary oc-novo" data-action="orc-novo">+ Novo orçamento</button>
    </div>
    <div class="lc-card">
      <div class="lc-mh"><small>Feitos</small></div>
      ${linhas ? `<div class="oc-lista">${linhas}</div>` : `<div class="empty-hint">Nenhum orçamento ainda. Toque em “+ Novo orçamento” pra começar.</div>`}
    </div>`;
}
function orcSeg(grupo, opcoes, atual){
  return `<div class="oc-seg" role="group">${opcoes.map(([v,rot,sub])=>`<button type="button" class="${String(atual)===String(v)?'on':''}" data-action="orc-calc-set" data-f="${grupo}" data-v="${v}" aria-pressed="${String(atual)===String(v)}">${rot}${sub?`<small>${sub}</small>`:''}</button>`).join('')}</div>`;
}
function orcCalcOut(o){
  const r = orcCalcular(o);
  return {
    f1: `R$ ${fmtBRL(r.min)}`, f2: `R$ ${fmtBRL(r.justo)}`, f3: `R$ ${fmtBRL(r.folga)}`,
    expl: `Sua hora real: <b>R$ ${fmtBRL(r.H)}</b>${r.freela ? ` + ${Math.round(r.adic*100)}% de hora extra = <b>R$ ${fmtBRL(r.hora)}/h</b>` : ''}. Cada vídeo leva <b>${orcFmtT(r.tt)}</b>${r.extMin ? ' (com os extras)' : ''}${r.pz>1 ? ', prazo apertado' : ''}${r.vol ? `, desconto de <b>${Math.round(r.vol*100)}%</b> por serem ${r.q} vídeos (já está nesses preços; no orçamento ele aparece separado)` : ''}.<br>Pacote no preço justo: <b>R$ ${fmtBRL(r.justo*r.q)}</b> · <b>${orcFmtT(r.tt*r.q)}</b> de trabalho${r.freela ? ` (fora do seu horário: uns ${Math.ceil(r.tt*r.q/3)} dias de 3h extras)` : ''}.<br><span class="oc-fraco">O mínimo é a sua hora real, sem adicional. Nenhuma faixa fica abaixo de R$ ${fmtBRL(ORC_PISO)} por vídeo.</span>`
  };
}
function orcEditorHtml(o){
  const c = o.calc;
  const out = orcCalcOut(o);
  const t = orcTotais(o);
  const refs = state.clientOrder.map(id=>clientById(id)).filter(cl=>cl && cl.tipo!=='esporadico' && parseBRL(cl.valorPadrao)>0)
    .map(cl=>`<span>${esc(cl.nome.split(' ')[0].charAt(0)+cl.nome.split(' ')[0].slice(1).toLowerCase())} R$ ${fmtCurto(parseBRL(cl.valorPadrao))}</span>`).join('');
  const inp = (f, val, extra='') => `<input type="text" data-role="orc" data-field="${f}" value="${esc(val??'')}" ${extra}>`;
  const itens = (o.itens||[]).map(it=>`<div class="oc-item">
      <div class="oc-i-d"><label>Descrição</label><input type="text" data-role="orc-item" data-row="${it.id}" data-field="descricao" value="${esc(it.descricao||'')}"></div>
      <div class="oc-i-q"><label>Qtd</label><input type="text" inputmode="numeric" data-role="orc-item" data-row="${it.id}" data-field="qtd" value="${esc(it.qtd??'')}"></div>
      <div class="oc-i-v"><label>Valor un.</label><input class="sensitive" type="text" inputmode="decimal" data-role="orc-item" data-row="${it.id}" data-field="valor" value="${esc(it.valor??'')}" placeholder="0,00"></div>
      <button type="button" class="oc-x" data-action="orc-item-del" data-row="${it.id}" aria-label="Tirar item">✕</button>
      <div class="oc-i-sub sensitive" data-sub="${it.id}">R$ ${fmtBRL((parseInt(it.qtd,10)||0)*parseBRL(it.valor))}</div>
    </div>`).join('');
  const armed = isArmed('orc-'+o.id);
  return `<div class="oc-grid">
   <div class="oc-col">
    <div class="lc-card oc-topo">
      <button type="button" class="oc-voltar" data-action="orc-voltar">‹ Orçamentos</button>
      <div class="oc-num"><b>${esc(o.numero)}</b><span>${ddmm(o.data)}</span></div>
      ${orcSegStatus(o.status)}
      <div class="oc-topo-acoes">
        ${o.status!=='aprovado' ? `<button type="button" class="btn gold" data-action="orc-aprovar">Aprovado: criar aba do cliente</button>` : ''}
        <button type="button" class="btn ${armed?'danger-step confirming':'danger-step'}" data-action="orc-excluir">${armed?'Toque de novo pra excluir':'Excluir'}</button>
      </div>
    </div>

    <div class="lc-card oc-calc">
      <div class="lc-mh"><small>Quanto cobrar? · calculadora</small></div>
      <div><label>Que tipo de trabalho é?</label>${orcSeg('modo', [['freela','Freela pontual'],['fixo','Cliente fixo novo']], c.modo)}</div>
      <div class="oc-two"><div><label>Quantos vídeos</label>${inp('calc.qtd', c.qtd, 'inputmode="numeric"')}</div><div><label>Duração final de cada um</label>${inp('calc.duracao', c.duracao, 'placeholder="ex.: 4 min"')}</div></div>
      <div><label>Nível do vídeo (já sugere o tempo)</label>${orcSeg('nivel', ORC_NIVEIS.map(n=>[n.k,n.nome,n.sub]), c.nivel)}</div>
      <div><label>Tempo de edição por vídeo</label>${inp('calc.tempo', c.tempo, 'placeholder="ex.: 1h, 1h30, 45min" style="max-width:170px"')}</div>
      <div><label>Extras (somam tempo)</label><div class="oc-chips">${ORC_EXTRAS.map(x=>`<button type="button" class="${(c.extras||[]).includes(x.k)?'on':''}" data-action="orc-extra" data-k="${x.k}" aria-pressed="${(c.extras||[]).includes(x.k)}">${x.nome} +${x.min}min</button>`).join('')}</div></div>
      <div><label>Sua hora real hoje</label><div class="oc-hora"><span>R$</span>${inp('calc.hora', c.hora, 'inputmode="decimal" class="sensitive" style="max-width:96px"')}<span class="oc-fraco">média dos fixos: R$ ${fmtCurto(orcMediaFixos())} por vídeo ÷ 1h15</span></div></div>
      ${c.modo!=='fixo' ? `<div><label>Adicional de hora extra (sai do seu descanso)</label>${orcSeg('adic', [[20,'+20%'],[30,'+30%'],[50,'+50%']], c.adic)}</div>` : ''}
      <div><label>Prazo</label>${orcSeg('prazo', [['1','Espalhado'],['1.15','Apertado'],['1.3','Urgente']], c.prazo)}</div>
      <div class="oc-faixas"><div><small>Mínimo</small><b class="sensitive" id="oc-f1">${out.f1}</b><span>por vídeo</span></div><div class="meio"><small>Justo</small><b class="sensitive" id="oc-f2">${out.f2}</b><span>por vídeo</span></div><div><small>Com folga</small><b class="sensitive" id="oc-f3">${out.f3}</b><span>por vídeo</span></div></div>
      <div class="oc-expl sensitive" id="oc-expl">${out.expl}</div>
      ${refs ? `<div class="oc-ref"><span>Você cobra hoje:</span>${refs}</div>` : ''}
      <button type="button" class="oc-usar" data-action="orc-usar">Usar o preço justo no orçamento ↓</button>
    </div>

    <div class="lc-card">
      <div class="lc-mh"><small>Para quem</small></div>
      <div class="oc-two"><div><label>Cliente</label>${inp('cliente', o.cliente, 'placeholder="Nome da pessoa ou empresa"')}</div><div><label>Projeto</label>${inp('projeto', o.projeto, 'placeholder="ex.: Treinamento em vídeo"')}</div></div>
    </div>

    <div class="lc-card">
      <div class="lc-mh"><small>O que vai ser feito</small></div>
      <div class="oc-itens">${itens}</div>
      <button type="button" class="add-row-btn oc-add" data-action="orc-item-add">+ adicionar item</button>
      <div class="oc-tot">
        <div class="oc-tl"><span>Soma dos itens</span><b class="sensitive" id="oc-soma">R$ ${fmtBRL(t.soma)}</b></div>
        <div class="oc-tl"><span>Desconto</span><span class="oc-desc"><span class="oc-dm">${['pc','rs'].map(v=>`<button type="button" class="${o.descTipo===v?'on':''}" data-action="orc-desc-tipo" data-v="${v}">${v==='pc'?'%':'R$'}</button>`).join('')}</span>${inp('descValor', o.descValor, 'inputmode="decimal" class="sensitive" style="width:84px"')}</span></div>
        <label class="oc-chk"><input type="checkbox" data-role="orc" data-field="usarTotalManual" ${o.usarTotalManual?'checked':''}> Quero digitar o valor final eu mesmo</label>
        ${o.usarTotalManual ? inp('totalManual', o.totalManual, 'inputmode="decimal" class="sensitive" placeholder="Valor final"') : ''}
        <div class="oc-tl oc-big"><span>Total</span><b class="sensitive" id="oc-tot">R$ ${fmtBRL(t.total)}</b></div>
      </div>
    </div>

    <div class="lc-card">
      <div class="lc-mh"><small>Texto e condições</small>${o.textoEditado ? `<button type="button" class="oc-link" data-action="orc-texto-auto">voltar pro texto automático</button>` : ''}</div>
      <div><label>Mensagem ${o.textoEditado ? '(editada por você)' : '(se monta sozinha; dá pra editar)'}</label><textarea data-role="orc" data-field="texto" rows="12">${esc(orcTexto(o))}</textarea></div>
      <div class="oc-two"><div><label>Prazo de entrega</label>${inp('prazo', o.prazo)}</div><div><label>Validade</label>${inp('validade', o.validade)}</div></div>
    </div>

    <div class="lc-card">
      <div class="lc-mh"><small>Forma de pagamento</small></div>
      <label class="oc-chk"><input type="checkbox" data-role="orc" data-field="pag.pix" ${o.pag.pix?'checked':''}> Pix à vista</label>
      <div class="oc-two oc-sub"><div><label>Desconto extra no Pix (%)</label>${inp('pag.pixDesc', o.pag.pixDesc, 'inputmode="decimal" placeholder="0"')}</div><div></div></div>
      <label class="oc-chk"><input type="checkbox" data-role="orc" data-field="pag.cartao" ${o.pag.cartao?'checked':''}> Cartão de crédito parcelado</label>
      <div class="oc-two oc-sub"><div><label>Em até quantas vezes</label>${inp('pag.parc', o.pag.parc, 'inputmode="numeric"')}</div><div class="oc-fraco" style="align-self:end">com acréscimo da taxa da maquininha</div></div>
      <label class="oc-chk"><input type="checkbox" data-role="orc" data-field="pag.sinal" ${o.pag.sinal?'checked':''}> 50% pra começar e 50% na entrega</label>
    </div>

    <div class="oc-acoes">
      <button type="button" class="btn primary" data-action="orc-pdf">Baixar PDF</button>
    </div>
   </div>
   <div class="oc-prev-col"><div class="oc-prev-rot">Prévia do PDF</div><div class="oc-folha" id="oc-folha">${orcFolhaHtml(o)}</div></div>
  </div>`;
}
function orcSegStatus(s){
  return `<div class="oc-seg oc-seg-st" role="group" aria-label="Situação">${Object.keys(ORC_STATUS).map(k=>`<button type="button" class="${s===k?'on':''}" data-action="orc-status" data-v="${k}" aria-pressed="${s===k}">${ORC_STATUS[k].charAt(0).toUpperCase()+ORC_STATUS[k].slice(1)}</button>`).join('')}</div>`;
}
function orcFolhaHtml(o){
  const b = state.business || {};
  const t = orcTotais(o);
  const linhas = (o.itens||[]).map(it=>`<tr><td>${esc(it.descricao||'')}</td><td class="r">${esc(it.qtd||'')}</td><td class="r">R$ ${fmtBRL(parseBRL(it.valor))}</td><td class="r">R$ ${fmtBRL((parseInt(it.qtd,10)||0)*parseBRL(it.valor))}</td></tr>`).join('');
  const pag = [];
  if(o.pag.pix) pag.push(`<div><small>Pix à vista</small><b>R$ ${fmtBRL(t.pix)}</b>${t.pixPc>0?`<span>com ${String(o.pag.pixDesc).replace('.',',')}% de desconto extra</span>`:''}</div>`);
  if(o.pag.cartao) pag.push(`<div><small>Cartão de crédito</small><b>em até ${Math.max(1,parseInt(o.pag.parc,10)||1)}x</b><span>com acréscimo da taxa da maquininha</span></div>`);
  const contato = [b.cnpj?`CNPJ ${b.cnpj}`:'', b.email||'', b.telefone||''].filter(Boolean).map(esc).join(' · ');
  return `<div class="of-top"><div class="of-marca">${RITMO_ICONE}<div><div class="of-nome">${esc(b.nomeFantasia||'')}</div><div class="of-cnpj">${contato}</div></div></div><div class="of-tit"><b>Orçamento</b><span>${esc(o.numero)} · ${fmtDateBR(o.data)}</span></div></div>
   <div class="of-para"><div><small>Para</small><b>${esc(o.cliente||'—')}</b></div><div style="text-align:right"><small>Projeto</small><b>${esc(o.projeto||'—')}</b></div></div>
   <div class="of-txt">${esc(orcTexto(o))}</div>
   <table class="of-t"><thead><tr><th>Descrição</th><th class="r">Qtd</th><th class="r">Valor un.</th><th class="r">Subtotal</th></tr></thead><tbody>${linhas}</tbody></table>
   <div class="of-total"><div class="l"><span>Soma</span><span>R$ ${fmtBRL(t.soma)}</span></div>${t.desc>0?`<div class="l"><span>Desconto${o.descTipo==='pc'?` (${String(o.descValor).replace('.',',')}%)`:''}</span><span>− R$ ${fmtBRL(t.desc)}</span></div>`:''}<div class="big"><span>Total</span><b>R$ ${fmtBRL(t.total)}</b></div></div>
   ${pag.length ? `<div class="of-pag"><small class="of-pt">Forma de pagamento</small><div class="of-pg">${pag.join('')}</div>${o.pag.sinal?'<div class="of-ps">50% na aprovação para iniciar e 50% na entrega.</div>':''}</div>` : ''}
   <div class="of-pe"><span>ritmo. · sua produção, no ritmo certo</span><span>${esc(b.nomeFantasia||'')}</span></div>`;
}
// depois de digitar: atualiza so os numeros, a previa e o texto automatico (sem redesenhar a tela)
function orcAtualizarAoVivo(){
  const o = orcAtual(); if(!o) return;
  const out = orcCalcOut(o);
  const set = (id, h) => { const el = document.getElementById(id); if(el) el.innerHTML = h; };
  set('oc-f1', out.f1); set('oc-f2', out.f2); set('oc-f3', out.f3); set('oc-expl', out.expl);
  const t = orcTotais(o);
  set('oc-soma', `R$ ${fmtBRL(t.soma)}`); set('oc-tot', `R$ ${fmtBRL(t.total)}`);
  (o.itens||[]).forEach(it=>{ const el = document.querySelector(`[data-sub="${it.id}"]`); if(el) el.textContent = `R$ ${fmtBRL((parseInt(it.qtd,10)||0)*parseBRL(it.valor))}`; });
  const ta = document.querySelector('textarea[data-role="orc"][data-field="texto"]');
  if(ta && !o.textoEditado && document.activeElement!==ta) ta.value = orcTextoPadrao(o);
  set('oc-folha', orcFolhaHtml(o));
}
// grava o que foi digitado num campo do orcamento
function orcCampo(t){
  const o = orcAtual(); if(!o) return false;
  const f = t.dataset.field;
  const v = t.type==='checkbox' ? t.checked : t.value;
  if(t.dataset.role==='orc-item'){
    const it = (o.itens||[]).find(x=>x.id===t.dataset.row); if(!it) return false;
    it[f] = v;
  } else if(f==='texto'){
    o.texto = v; o.textoEditado = true;
  } else if(f.startsWith('calc.')){
    o.calc[f.slice(5)] = v;
  } else if(f.startsWith('pag.')){
    o.pag[f.slice(4)] = v;
  } else {
    o[f] = v;
  }
  persist();
  if(t.type==='checkbox' && f==='usarTotalManual'){ renderPreserveFocus(); return true; }
  orcAtualizarAoVivo();
  return true;
}
function orcAcao(action, btn){
  if(action==='orc-novo'){
    if(!Array.isArray(state.orcamentos)) state.orcamentos = [];
    const o = orcNovo();
    state.orcamentos.push(o);
    ui.orcId = o.id;
    persist(); render(); window.scrollTo({top:0});
    return true;
  }
  if(action==='orc-abrir'){ ui.orcId = btn.dataset.id; render(); window.scrollTo({top:0}); return true; }
  if(action==='orc-voltar'){ ui.orcId = null; render(); window.scrollTo({top:0}); return true; }
  const o = orcAtual(); if(!o) return action.startsWith('orc-');
  if(action==='orc-status'){ o.status = btn.dataset.v; persist(); render(); return true; }
  if(action==='orc-calc-set'){
    const f = btn.dataset.f, v = btn.dataset.v;
    o.calc[f] = f==='adic' ? Number(v) : v;
    if(f==='nivel'){ const n = ORC_NIVEIS.find(x=>x.k===v); if(n) o.calc.tempo = n.t; }
    persist(); render(); return true;
  }
  if(action==='orc-extra'){
    const k = btn.dataset.k; const ex = o.calc.extras || (o.calc.extras = []);
    const i = ex.indexOf(k); if(i>=0) ex.splice(i,1); else ex.push(k);
    persist(); render(); return true;
  }
  if(action==='orc-usar'){
    const r = orcCalcular(o);
    const nivel = (ORC_NIVEIS.find(n=>n.k===o.calc.nivel)||ORC_NIVEIS[0]).nome.toLowerCase();
    const dur = String(o.calc.duracao||'').trim();
    o.itens = [{id: uid('i'), descricao: `Edição de vídeo (${dur ? dur+', ' : ''}${nivel})`, qtd: String(r.q), valor: fmtBRL(r.cheio)}];
    o.descTipo = 'pc'; o.descValor = r.vol ? String(Math.round(r.vol*100)) : '0';
    o.usarTotalManual = false;
    persist(); render();
    showToast(`Preço justo aplicado: ${r.q} × R$ ${fmtBRL(r.cheio)}${r.vol ? ` com ${Math.round(r.vol*100)}% de desconto` : ''}.`);
    return true;
  }
  if(action==='orc-item-add'){
    o.itens.push({id: uid('i'), descricao: '', qtd: '1', valor: ''});
    persist(); render(); return true;
  }
  if(action==='orc-item-del'){
    const idx = o.itens.findIndex(x=>x.id===btn.dataset.row); if(idx<0) return true;
    const [tirado] = o.itens.splice(idx,1);
    persist(); render();
    showToast('Item tirado do orçamento.', ()=>{ if(!o.itens.some(x=>x.id===tirado.id)) o.itens.splice(Math.min(idx,o.itens.length),0,tirado); persist(); render(); });
    return true;
  }
  if(action==='orc-desc-tipo'){ o.descTipo = btn.dataset.v; persist(); render(); return true; }
  if(action==='orc-texto-auto'){ o.textoEditado = false; o.texto = ''; persist(); render(); return true; }
  if(action==='orc-pdf'){ orcGerarPDF(o); if(o.status==='rascunho'){ o.status='enviado'; persist(); render(); } return true; }
  if(action==='orc-aprovar'){
    const nome = (o.cliente||'').trim();
    if(!nome){ showToast('Escreva o nome do cliente antes de aprovar.'); return true; }
    const antesStatus = o.status;
    const existente = state.clients.find(c=>c.nome.trim().toLowerCase()===nome.toLowerCase());
    let criado = null;
    const t = orcTotais(o);
    const qtdTotal = o.itens.reduce((s,it)=>s+(parseInt(it.qtd,10)||0),0) || 1;
    const porVideo = Math.round(t.total/qtdTotal*100)/100;
    if(!existente){
      criado = {id: uid('c'), nome: nome.toUpperCase(), valorPadrao: porVideo, tipo: 'fixo', diaFechamento: 0, cnpj: ''};
      state.clients.push(criado); state.clientOrder.push(criado.id);
    }
    o.status = 'aprovado';
    o.clienteId = existente ? existente.id : criado.id;
    persist();
    ui.screen = 'lanc'; ui.tab = o.clienteId; ensureClientView(o.clienteId); ui.screenAnim = true;
    render(); window.scrollTo({top:0});
    showToast(existente ? `Aprovado! Aberta a aba de ${existente.nome}.` : `Aprovado! Criei a aba ${criado.nome} com R$ ${fmtBRL(porVideo)} por vídeo.`, ()=>{
      o.status = antesStatus; delete o.clienteId;
      if(criado){
        const vids = state.videos[criado.id];
        const temVideo = vids && Object.values(vids).some(r=>r && r.length);
        if(!temVideo){
          const i = state.clients.findIndex(c=>c.id===criado.id); if(i>=0) state.clients.splice(i,1);
          const j = state.clientOrder.indexOf(criado.id); if(j>=0) state.clientOrder.splice(j,1);
          if(vids) delete state.videos[criado.id];
        }
      }
      ui.screen = 'lanc'; ui.tab = 'ORCAMENTOS'; ui.orcId = o.id;
      persist(); render();
    });
    return true;
  }
  if(action==='orc-excluir'){
    const key = 'orc-'+o.id;
    if(!isArmed(key)){ armDelete(key); render(); return true; }
    delete ui.deleteArm[key];
    const idx = state.orcamentos.findIndex(x=>x.id===o.id);
    const [tirado] = state.orcamentos.splice(idx,1);
    ui.orcId = null; persist(); render();
    showToast(`Orçamento ${tirado.numero} excluído.`, ()=>{
      if(!state.orcamentos.some(x=>x.id===tirado.id)) state.orcamentos.splice(Math.min(idx,state.orcamentos.length),0,tirado);
      ui.orcId = tirado.id; persist(); render();
    });
    return true;
  }
  return action.startsWith('orc-');
}

/* ---------- PDF do orcamento (jsPDF, mesma cara da previa) ---------- */
function orcGerarPDF(o){
  if(!window.jspdf || !window.jspdf.jsPDF){
    showToast('Não consegui carregar o gerador de PDF. Verifique sua conexão com a internet e tente de novo.');
    return;
  }
  const b = state.business || {};
  const t = orcTotais(o);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt', format:'a4'});
  const W = doc.internal.pageSize.getWidth(), Hp = doc.internal.pageSize.getHeight();
  const mx = 48; let y = 54;
  const OLIVA=[46,57,37], TINTA=[33,29,24], SUAVE=[106,99,86], CREME=[246,241,229], LINHA=[226,218,198];
  const novaPagSe = h => { if(y + h > Hp - 60){ doc.addPage(); y = 54; } };
  // marca: quadradinho oliva com a notinha
  doc.setFillColor(...OLIVA); doc.roundedRect(mx, y-22, 30, 30, 7, 7, 'F');
  doc.setFillColor(251,248,241); doc.rect(mx+9, y-17, 12, 18, 'F');
  doc.setFillColor(164,189,130); doc.circle(mx+19, y-3, 4.2, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(...TINTA);
  doc.text(b.nomeFantasia || '', mx+40, y-6);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...SUAVE);
  doc.text([b.cnpj?`CNPJ ${b.cnpj}`:'', b.email||'', b.telefone||''].filter(Boolean).join('  ·  '), mx+40, y+7);
  doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.setTextColor(...OLIVA);
  doc.text('Orçamento', W-mx, y-4, {align:'right'});
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...SUAVE);
  doc.text(`${o.numero} · ${fmtDateBR(o.data)}`, W-mx, y+9, {align:'right'});
  y += 22; doc.setDrawColor(...OLIVA); doc.setLineWidth(1.4); doc.line(mx, y, W-mx, y); y += 18;
  // para / projeto
  doc.setFillColor(...CREME); doc.roundedRect(mx, y, W-2*mx, 40, 6, 6, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(122,115,98);
  doc.text('PARA', mx+12, y+14); doc.text('PROJETO', W-mx-12, y+14, {align:'right'});
  doc.setFontSize(11); doc.setTextColor(...TINTA);
  doc.text(o.cliente||'—', mx+12, y+29); doc.text(o.projeto||'—', W-mx-12, y+29, {align:'right'});
  y += 58;
  // texto
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(58,52,42);
  const linhasTxt = doc.splitTextToSize(orcTexto(o), W-2*mx);
  linhasTxt.forEach(l=>{ novaPagSe(13); doc.text(l, mx, y); y += 13; });
  y += 8;
  // itens
  doc.autoTable({
    startY: y, margin: {left: mx, right: mx},
    head: [['Descrição','Qtd','Valor un.','Subtotal']],
    body: (o.itens||[]).map(it=>[it.descricao||'', String(it.qtd||''), 'R$ '+fmtBRL(parseBRL(it.valor)), 'R$ '+fmtBRL((parseInt(it.qtd,10)||0)*parseBRL(it.valor))]),
    styles: {font:'helvetica', fontSize:9.5, textColor:TINTA, cellPadding:6, lineColor:[240,234,220], lineWidth:0.5},
    headStyles: {fillColor:OLIVA, textColor:[244,238,221], fontStyle:'bold'},
    columnStyles: {1:{halign:'right', cellWidth:40}, 2:{halign:'right', cellWidth:80}, 3:{halign:'right', cellWidth:86}},
  });
  y = doc.lastAutoTable.finalY + 16;
  // totais
  novaPagSe(90);
  const xL = W/2 + 20;
  doc.setFontSize(9.5); doc.setTextColor(...SUAVE);
  doc.text('Soma', xL, y); doc.text('R$ '+fmtBRL(t.soma), W-mx, y, {align:'right'}); y += 15;
  if(t.desc>0){ doc.text(`Desconto${o.descTipo==='pc'?` (${String(o.descValor).replace('.',',')}%)`:''}`, xL, y); doc.text('- R$ '+fmtBRL(t.desc), W-mx, y, {align:'right'}); y += 15; }
  doc.setFillColor(...OLIVA); doc.roundedRect(xL-10, y-4, W-mx-xL+10, 32, 6, 6, 'F');
  doc.setTextColor(244,238,221); doc.setFontSize(10); doc.text('Total', xL, y+16);
  doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text('R$ '+fmtBRL(t.total), W-mx-10, y+17, {align:'right'});
  y += 48;
  // pagamento
  const pag = [];
  if(o.pag.pix) pag.push(['PIX À VISTA', 'R$ '+fmtBRL(t.pix), t.pixPc>0 ? `com ${String(o.pag.pixDesc).replace('.',',')}% de desconto extra` : '']);
  if(o.pag.cartao) pag.push(['CARTÃO DE CRÉDITO', `em até ${Math.max(1,parseInt(o.pag.parc,10)||1)}x`, 'com acréscimo da taxa da maquininha']);
  if(pag.length){
    novaPagSe(90);
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(122,115,98);
    doc.text('FORMA DE PAGAMENTO', mx, y); y += 8;
    const bw = (W-2*mx-12)/2;
    pag.forEach((p,i)=>{
      const x = mx + i*(bw+12);
      doc.setDrawColor(...LINHA); doc.setLineWidth(0.8); doc.roundedRect(x, y, bw, 46, 6, 6, 'S');
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(122,115,98); doc.text(p[0], x+10, y+13);
      doc.setFontSize(11.5); doc.setTextColor(...TINTA); doc.text(p[1], x+10, y+28);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...SUAVE); if(p[2]) doc.text(p[2], x+10, y+40);
    });
    y += 56;
    if(o.pag.sinal){ doc.setFillColor(...CREME); doc.roundedRect(mx, y, W-2*mx, 22, 5, 5, 'F'); doc.setFontSize(9); doc.setTextColor(58,52,42); doc.text('50% na aprovação para iniciar e 50% na entrega.', mx+10, y+14); y += 30; }
  }
  // rodape em todas as paginas
  const n = doc.internal.getNumberOfPages();
  for(let p=1;p<=n;p++){
    doc.setPage(p);
    doc.setDrawColor(...LINHA); doc.setLineWidth(0.6); doc.line(mx, Hp-44, W-mx, Hp-44);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(122,115,98);
    doc.text('ritmo. · sua produção, no ritmo certo', mx, Hp-30);
    doc.text(b.nomeFantasia||'', W-mx, Hp-30, {align:'right'});
  }
  const nomeArq = `Orçamento ${o.numero}${o.cliente ? ' - '+o.cliente : ''}.pdf`.replace(/[\\/:*?"<>|]/g,'-');
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nomeArq;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 60000);
}

function generatePDF(clientId, ym){
  const c = clientById(clientId);
  if(!c) return;
  const rows = videosDe(clientId, ym);
  if(rows.length===0) return;
  const [year, m] = ym.split('-');
  const mesNome = MES_NOME[m];
  const b = state.business;

  if(!window.jspdf || !window.jspdf.jsPDF){
    showToast('Não consegui carregar o gerador de PDF. Verifique sua conexão com a internet e tente de novo.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt', format:'a4'});
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  doc.setFont('helvetica','bold');
  doc.setFontSize(18);
  doc.setTextColor(33,29,24);
  doc.text(b.nomeFantasia || 'Relatório', marginX, 50);

  doc.setFont('helvetica','normal');
  doc.setFontSize(9.5);
  doc.setTextColor(110,103,92);
  let infoY = 68;
  if(b.razaoSocial){ doc.text(b.razaoSocial, marginX, infoY); infoY += 13; }
  if(b.cnpj){ doc.text(`CNPJ: ${b.cnpj}`, marginX, infoY); infoY += 13; }
  if(b.pix){ doc.text(`Chave Pix: ${b.pix}`, marginX, infoY); infoY += 13; }
  if(b.email){ doc.text(b.email, marginX, infoY); infoY += 13; }
  if(b.telefone){ doc.text(b.telefone, marginX, infoY); infoY += 13; }

  doc.setDrawColor(231,226,216);
  doc.line(marginX, infoY+4, pageWidth-marginX, infoY+4);

  doc.setFont('helvetica','bold');
  doc.setFontSize(13);
  doc.setTextColor(33,29,24);
  doc.text(`Relatório mensal — ${c.nome}`, marginX, infoY+26);
  doc.setFont('helvetica','normal');
  doc.setFontSize(10.5);
  doc.setTextColor(110,103,92);
  doc.text(`${mesNome} de ${year}`, marginX, infoY+42);

  const isEsp = c.tipo==='esporadico';
  const total = rows.reduce((s,r)=> s + (parseBRL(r.valor)), 0);
  const body = isEsp
    ? rows.map((r,i)=>[
        String(i+1),
        r.headline || '',
        'R$ ' + fmtBRL(r.valor)
      ])
    : rows.map((r,i)=>[
        String(i+1),
        r.headline || '',
        r.subcliente || '',
        fmtDateBR(r.data),
        'R$ ' + fmtBRL(r.valor)
      ]);

  doc.autoTable({
    startY: infoY + 56,
    margin: {left: marginX, right: marginX},
    head: [isEsp ? ['Nº','Descrição','Valor'] : ['Nº','Vídeo','Cliente','Data','Valor']],
    body: body,
    styles: { font:'helvetica', fontSize:9.5, textColor:[33,29,24], cellPadding:6, lineColor:[236,231,221], lineWidth:0.5 },
    headStyles: { fillColor:[33,29,24], textColor:[255,255,255], fontStyle:'bold' },
    alternateRowStyles: { fillColor:[246,242,233] },
    columnStyles: isEsp ? {
      0:{cellWidth:28},
      2:{cellWidth:80, halign:'right'}
    } : {
      0:{cellWidth:28},
      3:{cellWidth:70},
      4:{cellWidth:80, halign:'right'}
    },
    foot: isEsp ? [['','Total', 'R$ ' + fmtBRL(total)]] : [['','','','Total', 'R$ ' + fmtBRL(total)]],
    footStyles: { fillColor:[220,227,205], textColor:[33,29,24], fontStyle:'bold', halign:'right' }
  });

  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setTextColor(148,140,127);
  doc.text(isEsp ? `${rows.length} lançamento(s) neste mês.` : `${rows.length} vídeo(s) editado(s) neste mês.`, marginX, finalY);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, marginX, finalY+13);

  const filename = `${mesNome} - ${year} - ${c.nome}.pdf`;

  // Not using doc.save() here — jsPDF's own bundled FileSaver sniffs for
  // Safari and opens the PDF in a new window itself before the save dialog,
  // which is exactly the extra preview window we don't want. Building the
  // blob URL and downloading it ourselves, with nothing else triggered on
  // the same click, is what makes Safari go straight to "where do you want
  // to save this" using the filename below.
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 60000);
}

/* ---------------- boot ---------------- */
/* Esqueleto do app (sem nenhum dado) + aviso quando nao da pra carregar.
   Aparece se a busca demorar e, se falhar, ganha o cartao "sem internet"
   por cima. Nada aqui grava: o app so comeca a salvar depois de carregar. */
function esqueletoHtml(){
  const sk = (w, h, extra='') => `<span class="off-sk" style="width:${w};height:${h}px;${extra}"></span>`;
  const cartao = t => `<div class="off-card"><span class="off-lbl">${t}</span>${sk('60%', 32)}${sk('88%', 10)}${sk('46%', 10)}</div>`;
  const linha = w => `<div class="off-linha">${sk('12px', 12, 'border-radius:50%;flex:0 0 auto')}${sk(w, 12)}${sk('84px', 12, 'margin-left:auto;flex:0 0 auto')}</div>`;
  const nav = (ic, t, on) => `<span class="${on?'on':''}">${ic}<span>${t}</span></span>`;
  return `<div class="off-app" aria-hidden="true">
    <div class="off-topo">
      <div class="off-marca"><span class="off-mic">${RITMO_ICONE_ANIM}</span><div><span class="tr-wm">ritmo<i>.</i></span><span class="tr-slo">sua produção, no ritmo certo</span></div></div>
      <div class="off-nav">${nav(iconChart(), 'Painel', true)}${nav(iconList(), 'Lançamentos')}${nav(iconOrc(15), 'Orçamentos')}${nav(iconDoc(15), 'Notas emitidas')}${nav(iconGear(15), 'Configurações')}</div>
    </div>
    <div class="off-grade">${cartao('Faturado no ano')}${cartao('Limite MEI')}${cartao('Meta do mês')}</div>
    <div class="off-card off-largo"><span class="off-lbl">A cobrar</span>${linha('38%')}${linha('30%')}${linha('44%')}</div>
  </div>`;
}
function mostrarEsqueleto(){
  document.getElementById('app').innerHTML = esqueletoHtml();
}
function mostrarSemConexao(){
  const offline = navigator.onLine === false;
  const titulo = offline ? 'Ops, sem internet no momento' : 'Não consegui buscar seus dados';
  const texto = offline
    ? 'O Ritmo abriu, mas precisa da internet pra trazer seus vídeos e valores. Tá tudo guardado na nuvem, nada se perdeu.'
    : 'Pode ser a internet ou o servidor. Seus dados estão guardados na nuvem e, por segurança, nada é salvo até carregar certinho.';
  const barras = ['#B98A2B', '#6A6DB0', '#71884C', '#B98A2B'].map((c, i) => `<i style="background:${c};animation-delay:${i*.12}s"></i>`).join('');
  const wifi = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 8.8a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16.2a5 5 0 0 1 6 0"/><circle cx="12" cy="19.6" r=".9" fill="currentColor"/><path d="M3 3l18 18" stroke="#C4453A"/></svg>`;
  document.getElementById('app').innerHTML = esqueletoHtml() + `
    <div class="off-veu"></div>
    <div class="off-aviso" role="alertdialog" aria-labelledby="off-t" aria-describedby="off-x">
      <span class="off-alca"></span>
      <span class="off-icone">${RITMO_ICONE_ANIM}<span class="off-selo">${wifi}</span></span>
      <h2 id="off-t">${titulo}</h2>
      <p id="off-x">${texto}</p>
      <button type="button" class="off-btn" onclick="location.reload()">Tentar de novo</button>
      <span class="off-dica"><span class="off-barras">${barras}</span>Assim que a internet voltar, eu carrego sozinho.</span>
    </div>`;
  // volta sozinho: quando o aparelho avisa que a rede voltou, e a cada 15s
  // uma espiada na nuvem (so leitura). So recarrega se os dados vierem de
  // verdade — linha ausente ou estranha continua no aviso, sem ficar em loop.
  if(avisoArmado) return;
  avisoArmado = true;
  let recarregando = false;
  const recarregar = () => { if(!recarregando && !appCarregado){ recarregando = true; location.reload(); } };
  const espiar = async () => {
    if(recarregando || appCarregado || navigator.onLine === false) return;
    const r = await window.storage.get(STORAGE_KEY);
    if(r.failed || !r.value) return;
    try{ if(pareceEstado(JSON.parse(r.value))) recarregar(); }catch(e){}
  };
  window.addEventListener('online', () => setTimeout(espiar, 800));
  setInterval(espiar, 15000);
}

// guarda o esqueleto do app no aparelho pra ele abrir sem internet
// (so no app publicado; em teste local nao)
function registrarEsqueletoOffline(){
  if(!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

let appCarregado = false, avisoArmado = false;
async function boot(){
  registrarEsqueletoOffline();
  // o aparelho ja sabe que esta sem rede: aviso na hora (a busca na nuvem
  // tenta varias vezes e levaria ~30s pra desistir). Nada e lido nem gravado.
  if(navigator.onLine === false){ mostrarSemConexao(); return; }
  // se a busca demorar, mostra o esqueleto piscando em vez da tela vazia;
  // se passar de 10s, o aviso sobe por cima (a busca continua por tras e,
  // se der certo, o app abre normalmente)
  const esq = setTimeout(mostrarEsqueleto, 500);
  const lento = setTimeout(mostrarSemConexao, 10000);
  try{
    await loadState();
  }catch(e){
    clearTimeout(esq); clearTimeout(lento);
    mostrarSemConexao();
    return;
  }
  clearTimeout(esq); clearTimeout(lento);
  appCarregado = true;
  ui.tab = state.clientOrder[0] || 'FATURAMENTO';
  if(ui.tab && ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG' && ui.tab!=='ORCAMENTOS') ensureClientView(ui.tab);
  render();
  attachStaticHandlers();
  // edições que tinham ficado no aparelho sem subir: manda agora
  if(recuperadas) showToast('Recuperei alterações que não tinham chegado na nuvem — já estou enviando.');
  if(dirty) flushSave();
  enviarHistorico();
  // a fonte (Manrope; Urbanist so no logo) pode chegar depois do primeiro desenho e
  // mudar a largura dos botoes — reposiciona as pilulas quando ela carregar
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(()=>{ sliderGeom = {}; requestAnimationFrame(syncAllSliders); });
  }

  // The sliding-pill/gauge/bar geometry is computed from live layout
  // (offsetLeft/offsetWidth) at render time, so it goes stale if the window
  // is resized or a phone is rotated without anything else re-rendering —
  // re-sync it (snapped, no animation) whenever that happens.
  let resizeTimer = null;
  window.addEventListener('resize', ()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>{
      sliderGeom = {};
      requestAnimationFrame(syncAllSliders);
    }, 150);
  });
}
boot();
