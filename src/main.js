/* ============================================================
   Joel Neto Filmes — Controle Financeiro
   ============================================================ */
import { createClient } from "@supabase/supabase-js";

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
        .select("data")
        .eq("id", key)
        .maybeSingle();
      if (error) return { failed: true };
      if (!data) return { value: null };
      return { value: JSON.stringify(data.data) };
    } catch (e) {
      console.error("Falha ao carregar do Supabase", e);
      return { failed: true };
    }
  },
  // Lança erro se a gravação falhar — quem chama precisa saber, senão o app
  // mostra "salvo" com a edição ainda só na memória do aparelho.
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

// Backup diário rotativo: 1x por dia (por dia da semana, até 7 "fotos"
// recentes num id separado), sempre a partir de uma leitura que já deu
// certo — assim, se o salvamento principal algum dia sobrescrever algo
// errado, ainda dá pra puxar manualmente um desses backups no Supabase.
const BACKUP_DATE_FLAG = 'jnf-last-backup-date';
async function backupIfNeeded(goodStateJson) {
  try {
    const today = localISO(new Date());
    if (localStorage.getItem(BACKUP_DATE_FLAG) === today) return;
    const weekday = new Date().getDay();
    await window.storage.set(`${STORAGE_KEY}-backup-${weekday}`, goodStateJson);
    localStorage.setItem(BACKUP_DATE_FLAG, today);
  } catch (e) {
    console.error('Falha ao gravar backup diário', e);
  }
}

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
      telefone:''
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
// dos dados); a versao publicada nao define essa variavel e usa a linha real.
const STORAGE_KEY = (import.meta.env.DEV && import.meta.env.VITE_STORAGE_KEY) || 'jnf-financeiro-v1';
let state = null;
let saveTimer = null;

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
    state = JSON.parse(res.value);
    migrateState();
    backupIfNeeded(res.value);
    return;
  }
  state = defaultState();
  await persist();
}

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
  if(!state.clientOrder) state.clientOrder = state.clients.map(c=>c.id);
  if(!state.videos) state.videos = {};
  if(!state.notas) state.notas = d.notas;
  if(!state.notasYears) state.notasYears = Object.keys(state.notas).sort();
  // meta de faturamento, uma por mes ("2026-09": 6000). Campo novo, so
  // acrescenta — nada do que ja existe e alterado.
  if(!state.metas || typeof state.metas!=='object') state.metas = {[monthKey(REAL_YEAR, REAL_MONTH)]: 6000};
  // dia em que cada periodo de cobranca foi fechado (campo novo, so acrescenta)
  if(!state.fechamentos || typeof state.fechamentos!=='object') state.fechamentos = {};
}

// Fila serializada de gravação: sem isso, uma gravação em voo mais lenta
// (rede instável) pode terminar DEPOIS de uma mais nova e sobrescrever uma
// edição recente com uma mais velha. Só existe uma gravação em andamento por
// vez; se `state` mudar de novo enquanto ela está em voo, a próxima dispara
// assim que a atual terminar, sempre lendo o `state` mais atual.
let saving = false;
let pendingRewrite = false;
let retryTimer = null;
async function flushSave(){
  if(saving){ pendingRewrite = true; return; }
  saving = true;
  clearTimeout(retryTimer);
  setSaveIndicator('saving');
  try{
    await window.storage.set(STORAGE_KEY, JSON.stringify(state), false);
    setSaveIndicator('saved');
  }catch(e){
    // a edição continua na memória: avisa e tenta de novo sozinho, até dar certo
    setSaveIndicator('error');
    retryTimer = setTimeout(()=>{ flushSave(); }, 5000);
  }
  saving = false;
  if(pendingRewrite){
    pendingRewrite = false;
    await flushSave();
  }
}

function persist(){
  setSaveIndicator('saving');
  clearTimeout(saveTimer);
  return new Promise(resolve=>{
    saveTimer = setTimeout(async ()=>{
      await flushSave();
      resolve();
    }, 300);
  });
}

// Se o app for pra segundo plano (troca de app no celular, tela apagando)
// ou a aba fechar logo depois de uma edição, dispara a gravação pendente na
// hora — reduz a janela em que a última edição poderia se perder por causa
// do debounce de 300ms.
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden' && state){
    clearTimeout(saveTimer);
    flushSave();
  } else if(document.visibilityState === 'visible' && state && refreshToday()){
    renderPreserveFocus();
  }
});
// app aberto na tela durante a meia-noite (computador): vira o dia tambem
setInterval(()=>{ if(state && document.visibilityState==='visible' && refreshToday()) renderPreserveFocus(); }, 60000);
window.addEventListener('pagehide', () => {
  if(state){
    clearTimeout(saveTimer);
    flushSave();
  }
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
  metaDraft: '', // texto sendo digitado na meta — sobrevive a um render() no meio da digitacao
  metaFocus: false,
  semanasYm: null, // mes do cartao "Semana a semana" (null = mes atual) — so tela, nao e salvo
  confirmClose: null, // 'clientId|ym' enquanto a confirmacao de fechar periodo esta aberta
  tab: null, // clientId | 'FATURAMENTO' | 'CONFIG'
  clientView: {}, // clientId -> {year, month}
  fatYear: REAL_YEAR,
  addingClient: false,
  addingClientTipo: 'fixo', // 'fixo' | 'esporadico'
  deleteArm: {}, // key -> timestamp, for two-step delete buttons
  toast: null,
  valuesHidden: false, // privacy toggle — device-local preference, not synced
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
      render();
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
    if(ui.toast && ui.toast.id===myId){ ui.toast=null; render(); }
  }, 10000);
}

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

// produção por data do vídeo (a meta e o "por cliente" do Painel contam assim:
// fechar um cliente mais cedo ou mais tarde não mexe na meta)
function producaoDoMes(ym){
  const porCliente = {};
  state.clientOrder.forEach(cid=>{
    const meses = state.videos[cid];
    if(!meses) return;
    Object.values(meses).forEach(rows=>(rows||[]).forEach(r=>{
      if(!r || !r.data || r.data.slice(0,7)!==ym) return;
      const e = porCliente[cid] || (porCliente[cid] = {v:0, n:0});
      e.v += parseBRL(r.valor); e.n += 1;
    }));
  });
  return porCliente;
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
    <div class="cob-row">${cards}</div>`;
}

// bloco do período na aba do cliente: status + botão de fechar (com confirmação)
function periodoStatusHtml(cid, ym, total){
  const f = fechamentoDe(cid, ym);
  if(periodoFechado(cid, ym)){
    const diverge = Math.abs(parseBRL(f.valor) - total) > 0.004;
    return `<div class="periodo-banner">
      <span>✓ Período fechado em ${ddmm(f.data)} · nota de <b class="sensitive">R$ ${fmtBRL(parseBRL(f.valor))}</b> lançada em Notas emitidas.${diverge ? ` <b class="warn-t">O total agora é <span class="sensitive">R$ ${fmtBRL(total)}</span> — reabra e feche de novo pra atualizar a nota.</b>` : ''}</span>
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

function fecharPeriodoHtml(cid, ym, rows, total){
  if(periodoFechado(cid, ym)) return '';
  const c = clientById(cid);
  const key = cid+'|'+ym;
  if(ui.confirmClose !== key){
    return `<button class="btn gold" data-action="fechar-periodo" data-client="${cid}" data-ym="${ym}" ${rows.length===0?'disabled':''}>Fechar período e lançar nota</button>`;
  }
  const datas = rows.map(r=>r.data).filter(Boolean).sort();
  const faixa = datas.length ? ` (de ${ddmm(datas[0])} a ${ddmm(datas[datas.length-1])})` : '';
  const f = fechamentoDe(cid, ym);
  const antiga = f && f.aberto ? acharNota(f.notaId) : null;
  const linhaNota = antiga
    ? `Atualiza a nota lançada antes (<span class="sensitive">R$ ${fmtBRL(parseBRL(antiga.nota.valor))}</span> em ${antiga.nota.data ? ddmm(antiga.nota.data) : 'sem data'}) pra <b class="sensitive">R$ ${fmtBRL(total)}</b>, com a data de hoje — sem duplicar`
    : `Lança a nota de <b class="sensitive">R$ ${fmtBRL(total)}</b> com a data de hoje, ${ddmm(TODAY_ISO)}, em Notas emitidas`;
  return `<div class="confirm-fechar">
    <div class="cf-title">Fechar o período de ${nomeMesYm(ym)} de ${esc(c ? c.nome : '')}?</div>
    <ul>
      <li><b>${plural(rows.length,'vídeo','vídeos')} · <span class="sensitive">R$ ${fmtBRL(total)}</span></b>${faixa}</li>
      <li>${linhaNota}</li>
      <li>Marca ${nomeMesYm(ym)} como fechado ✓ e os próximos vídeos vão pra <b>${nomeMesYm(shiftYm(ym,1))}</b></li>
    </ul>
    <div class="cf-actions">
      <button class="btn gold" data-action="fechar-confirm" data-client="${cid}" data-ym="${ym}">Fechar e lançar nota</button>
      <button class="btn" data-action="fechar-cancel">Cancelar</button>
    </div>
  </div>`;
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
  const mesNome = MES_NOME[REAL_MONTH].toLowerCase();
  const fat = Object.values(producaoDoMes(ym)).reduce((s,e)=>s+e.v, 0);
  const meta = metaDoMes(ym);
  const head = r => `<div class="head"><span class="label">Meta de ${mesNome}${novoTag()}</span>${r||''}</div>`;
  if(ui.metaEditing){
    return `<div class="card card-meta s4">${head()}
      <form class="meta-form" data-meta-form>
        <label for="meta-in">Quanto quer faturar em ${mesNome}?</label>
        <div class="money-in"><span>R$</span><input id="meta-in" inputmode="decimal" autocomplete="off" value="${esc(ui.metaDraft)}" placeholder="0,00"></div>
        <button class="btn-dark" type="submit">Salvar</button>
        <button class="btn-line" type="button" data-action="meta-cancel">Cancelar</button>
      </form>
    </div>`;
  }
  if(!meta){
    return `<div class="card card-meta s4">${head()}
      <div class="vrow"><span class="big sensitive">R$ ${fmtBRL(fat)}</span><span class="of">faturado até agora</span></div>
      <p class="msg">Defina quanto quer faturar este mês e o app mostra se você está perto ou longe.</p>
      <button class="btn-dark" style="align-self:flex-start" type="button" data-action="meta-edit">Definir meta do mês</button>
    </div>`;
  }
  const dia = now.getDate(), dim = diasNoMes(REAL_YEAR, REAL_MONTH);
  const pct = fat/meta*100, pace = dia/dim*100, falta = meta-fat, left = dim-dia;
  let pill, msg;
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
  const editBtn = `<button class="edit-btn" type="button" data-action="meta-edit" aria-label="Editar meta"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>Editar</button>`;
  return `<div class="card card-meta s4">${head(`<span class="head-r">${pill}${editBtn}</span>`)}
    <div class="vrow"><span class="big sensitive">R$ ${fmtBRL(fat)}</span><span class="of sensitive">de R$ ${fmtBRL(meta)}</span></div>
    <div class="bar"><div class="fill" style="width:${Math.min(pct,100).toFixed(1)}%"></div><div class="pace" style="left:${pace.toFixed(1)}%"></div></div>
    <div class="foot"><span>${pct.toFixed(1).replace('.',',')}% da meta</span><span class="pace-t">dia ${dia} de ${dim}</span></div>
    <p class="msg">${msg}</p>
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
  const mesNome = MES_NOME[REAL_MONTH].toLowerCase();
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
    ${painelMeta(ym)}
    ${painelCobrar()}
    ${painelHoje(porData)}
    ${painelSemana(porData)}
    ${painelDiaADia(porData, ym)}
    ${painelClientes(ym)}
    ${painelSemanas(porData)}
    ${painelNotas()}
    ${painelRecentes()}
  </div>`;
}

function iconChart(size=15){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>`;}
function iconList(size=15){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`;}

function saveStateHtml(){
  const cls = saveMode==='saving' ? ' saving' : saveMode==='error' ? ' error' : '';
  const txt = saveMode==='saving' ? 'salvando…' : saveMode==='error' ? 'erro ao salvar — verifique a conexão' : 'salvo';
  return `<div id="savestate" class="savestate${cls}">${txt}</div>`;
}

function render(){
  const app = document.getElementById('app');
  const painel = ui.screen==='painel';
  const ae = document.activeElement;
  const metaSel = ae && ae.id==='meta-in' ? [ae.selectionStart, ae.selectionEnd] : null;
  app.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <h1>${esc(state.business.nomeFantasia||'Minha empresa')}</h1>
        <div class="sub sensitive">CNPJ ${esc(state.business.cnpj||'—')}</div>
      </div>
      <div class="screen-nav" role="group" aria-label="Tela">
        <span class="screen-nav-pill"></span>
        <button type="button" class="${painel?'active':''}" data-action="switch-screen" data-screen="painel" aria-pressed="${painel}">${iconChart()}Painel</button>
        <button type="button" class="${painel?'':'active'}" data-action="switch-screen" data-screen="lanc" aria-pressed="${!painel}">${iconList()}Lançamentos</button>
      </div>
      <div class="topbar-right">
        <button class="privacy-toggle ${ui.valuesHidden?'active':''}" type="button" data-action="toggle-privacy" aria-pressed="${ui.valuesHidden}" aria-label="${ui.valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}">
          <svg class="icon-eye" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ui.valuesHidden?'hidden':''}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="icon-eye-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ui.valuesHidden?'':'hidden'}><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.9 21.9 0 0 1-3.22 4.44M1 1l22 22"/></svg>
          <span>${ui.valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}</span>
        </button>
      </div>
      ${saveStateHtml()}
    </div>
    ${painel ? renderPainel() : `
    <div class="layout${ui.screenAnim ? ' screen-in' : ''}">
      ${renderRail()}
      <div class="main">${renderMain()}</div>
    </div>`}
    ${ui.toast ? renderToast() : ''}
  `;
  ui.screenAnim = false;
  attachHandlers();
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
  html += `<div class="rail-group-label">Outros</div>`;
  html += `<button class="tab-btn ${ui.tab==='FATURAMENTO'?'active':''}" data-action="switch-tab" data-tab="FATURAMENTO">
    <span class="tab-chip">${iconDoc(14)}</span>
    <span class="tab-label">Notas emitidas</span>
  </button>`;
  html += `<button class="tab-btn ${ui.tab==='CONFIG'?'active':''}" data-action="switch-tab" data-tab="CONFIG">
    <span class="tab-chip">${iconGear(14)}</span>
    <span class="tab-label">Configurações</span>
  </button>`;

  if(ui.addingClient){
    const isEsp = ui.addingClientTipo==='esporadico';
    html += `<div class="rail-add-form">
      <div class="tipo-toggle">
        <button class="${!isEsp?'active':''}" data-action="set-new-client-tipo" data-tipo="fixo">Cliente fixo</button>
        <button class="${isEsp?'active':''}" data-action="set-new-client-tipo" data-tipo="esporadico">Esporádico</button>
      </div>
      <input type="text" id="new-client-name" placeholder="${isEsp?'Nome da aba (ex: Clientes avulsos)':'Nome do cliente'}" autofocus>
      ${isEsp ? `<div class="tipo-hint">Cada lançamento nessa aba tem seu próprio campo de cliente, descrição e valor em branco.</div>` : `
      <div class="row">
        <input type="text" inputmode="decimal" id="new-client-valor" placeholder="Valor padrão (R$)" style="width:110px;">
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
  return renderClientPanel(ui.tab);
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
    const nameInput = document.getElementById('new-client-name');
    if(nameInput) nameInput.focus();
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
  if(ui.tab && ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG'){
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
  const rows = getVideos(clientId, ym);
  const total = monthTotal(clientId, ym);

  let monthsHtml = '<div class="months"><div class="month-slide-pill"></div>';
  MESES.forEach(m=>{
    const k = monthKey(view.year, m.k);
    const has = (state.videos[clientId] && state.videos[clientId][k] && state.videos[clientId][k].length>0);
    const active = m.k===view.month;
    const fechado = periodoFechado(clientId, k);
    const aberto = !fechado && k===periodoAberto(clientId);
    monthsHtml += `<button class="month-pill ${active?'active':''} ${has?'has-data':''} ${fechado?'closed':''} ${aberto?'open-p':''}"
      data-action="switch-month" data-client="${clientId}" data-month="${m.k}" ${fechado?'title="período fechado"':aberto?'title="período aberto"':''}>
      ${m.nome.slice(0,3)}${has?`<span class="count">${state.videos[clientId][k].length}</span>`:''}
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
    rows.forEach(r=>{
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
    rows.forEach((r,i)=>{
      rowsHtml += `<tr data-row="${r.id}" class="${animateRows?'row-enter':''}">
        <td class="num">${i+1}</td>
        <td class="video"><input class="cell-input" type="text" value="${esc(r.headline)}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="headline" placeholder="Nome do vídeo"></td>
        <td class="cliente"><input class="cell-input" type="text" value="${esc(r.subcliente)}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="subcliente" placeholder="Cliente final"></td>
        <td class="data"><input class="cell-input" type="date" value="${esc(r.data)}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="data"></td>
        <td class="valor"><div class="valor-wrap"><span class="valor-prefix">R$</span><input class="cell-input valor sensitive" type="text" inputmode="decimal" value="${esc(valorDisplay(r.valor))}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="valor"></div></td>
        <td class="acao"><button class="icon-btn" title="Excluir vídeo" data-action="delete-video" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}">✕</button></td>
      </tr>`;
    });
    rowsHtml += `</tbody></table></div>`;
  }

  return `
    <div class="panel-head">
      <div class="panel-title">${esc(c.nome)}${isEsp?' <span class="tipo-badge">esporádico</span>':''}</div>
      <div class="panel-head-right">
        <div class="mini-stats">
          <div class="mini-stat"><div class="v sensitive">R$ ${fmtBRL(total)}</div><div class="l">neste período</div></div>
          <div class="mini-stat"><div class="v sensitive">R$ ${fmtBRL(clientYearTotal(clientId, view.year))}</div><div class="l">no ano</div></div>
          <div class="mini-stat"><div class="v">${rows.length}</div><div class="l">lançamentos</div></div>
        </div>
        <div class="year-switch">
          <button data-action="year-step" data-client="${clientId}" data-dir="-1">‹</button>
          <span>${view.year}</span>
          <button data-action="year-step" data-client="${clientId}" data-dir="1">›</button>
        </div>
      </div>
    </div>
    ${monthsHtml}
    ${periodoStatusHtml(clientId, ym, total)}
    ${rowsHtml}
    <div class="table-foot">
      <button class="add-row-btn" data-action="add-video" data-client="${clientId}" data-ym="${ym}">+ ${isEsp?'adicionar lançamento':'adicionar vídeo'}</button>
      <div class="month-total">Total do período: <b class="sensitive">R$ ${fmtBRL(total)}</b></div>
    </div>
    <div class="action-bar">
      <button class="btn primary" data-action="gerar-pdf" data-client="${clientId}" data-ym="${ym}" ${rows.length===0?'disabled':''}>Gerar relatório PDF</button>
      ${fecharPeriodoHtml(clientId, ym, rows, total)}
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
        <td><input class="cell-input" type="date" value="${esc(r.data||'')}"
          data-role="nota-field" data-year="${year}" data-row="${r.id}" data-field="data"></td>
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
      <div class="year-switch">
        <button data-action="fat-year-step" data-dir="-1">‹</button>
        <span>${year}</span>
        <button data-action="fat-year-step" data-dir="1">›</button>
        <button class="btn small" style="margin-left:8px;" data-action="fat-add-year">+ novo ano</button>
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
      Só pra estimativa no Painel. O fechamento de verdade é quando você aperta “Fechar período e lançar nota”.
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
          Substituir TODOS os dados atuais pelo arquivo "${esc(ui.pendingImport.fileName)}"? Não dá pra desfazer.
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
  if(active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA') && active.dataset.role){
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
      if(typeof restore.selStart==='number' && (el.tagName==='TEXTAREA' || el.type==='text')){
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
  if(t.id==='meta-in'){ ui.metaDraft = t.value; return; }
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
  const t = e.target;
  if(!t || !t.dataset || !t.dataset.role) return;
  const role = t.dataset.role;
  let formatted = null;

  if(role==='video-field' && t.dataset.field==='valor'){
    const rows = getVideos(t.dataset.client, t.dataset.ym);
    const row = rows.find(r=>r.id===t.dataset.row);
    if(!row) return;
    row.valor = parseBRL(row.valor);
    formatted = fmtBRL(row.valor);
  } else if(role==='nota-field' && t.dataset.field==='valor'){
    const rows = state.notas[t.dataset.year] || [];
    const row = rows.find(r=>r.id===t.dataset.row);
    if(!row) return;
    row.valor = parseBRL(row.valor);
    formatted = fmtBRL(row.valor);
  } else if(role==='client-field' && t.dataset.field==='valorPadrao'){
    const c = clientById(t.dataset.client);
    if(!c) return;
    c.valorPadrao = parseBRL(c.valorPadrao);
    formatted = fmtBRL(c.valorPadrao);
  } else if(role==='limite-field'){
    state.meiLimiteAnual = parseBRL(state.meiLimiteAnual)||81000;
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
  persist();
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

  if(action==='toggle-privacy'){
    ui.valuesHidden = !ui.valuesHidden;
    document.body.classList.toggle('privacy-on', ui.valuesHidden);
    try{ localStorage.setItem(PRIVACY_KEY, ui.valuesHidden ? '1' : '0'); }catch(e){}
    render();
  }
  else if(action==='switch-screen'){
    const alvo = btn.dataset.screen==='lanc' ? 'lanc' : 'painel';
    if(alvo===ui.screen) return;
    ui.screen = alvo;
    ui.screenAnim = true;
    ui.metaEditing = false;
    render();
    window.scrollTo({top:0});
  }
  else if(action==='go-lancar'){
    // atalho do Painel: abre Lançamentos numa aba de cliente, no mês atual
    if(!ui.tab || ui.tab==='FATURAMENTO' || ui.tab==='CONFIG') ui.tab = state.clientOrder[0] || 'FATURAMENTO';
    if(ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG') ensureClientView(ui.tab);
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
  else if(action==='meta-edit'){
    const meta = metaDoMes(monthKey(REAL_YEAR, REAL_MONTH));
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
    if(ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG') ensureClientView(ui.tab);
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
    let y = String(Number(ui.fatYear) + Number(btn.dataset.dir));
    if(!state.notas[y]) state.notas[y] = [];
    if(!state.notasYears.includes(y)){ state.notasYears.push(y); state.notasYears.sort(); }
    ui.fatYear = y;
    persist();
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
      rows.splice(idx,0,removed);
      persist();
      render();
    });
  }
  else if(action==='add-nota'){
    const year = btn.dataset.year;
    if(!state.notas[year]) state.notas[year] = [];
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
      rows.splice(idx,0,removed);
      persist();
      render();
    });
  }
  else if(action==='gerar-pdf'){
    generatePDF(btn.dataset.client, btn.dataset.ym);
  }
  else if(action==='fechar-periodo'){
    ui.confirmClose = btn.dataset.client+'|'+btn.dataset.ym;
    render();
  }
  else if(action==='fechar-cancel'){
    ui.confirmClose = null;
    render();
  }
  else if(action==='fechar-confirm'){
    const client = btn.dataset.client, ym = btn.dataset.ym;
    ui.confirmClose = null;
    const c = clientById(client);
    if(!c || periodoFechado(client, ym)){ render(); return; }
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
        state.clients.splice(Math.min(clientIdx, state.clients.length), 0, removedClient);
        state.clientOrder.splice(Math.min(orderIdx, state.clientOrder.length), 0, id);
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
    state = ui.pendingImport.data;
    migrateState();
    ui.pendingImport = null;
    persist();
    render();
    showToast('Backup restaurado com sucesso.');
  }
  else if(action==='cancel-import'){
    ui.pendingImport = null;
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
    state.metas[monthKey(REAL_YEAR, REAL_MONTH)] = v > 0 ? Math.round(v*100)/100 : 0;
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
function generatePDF(clientId, ym){
  const c = clientById(clientId);
  if(!c) return;
  const rows = getVideos(clientId, ym);
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
async function boot(){
  try{
    await loadState();
  }catch(e){
    document.getElementById('app').innerHTML =
      '<div style="max-width:420px;margin:80px auto;padding:24px;text-align:center;font-family:sans-serif;color:#333">' +
      'Não foi possível carregar seus dados. Verifique sua internet e recarregue a página — ' +
      'por segurança, nada será salvo até conseguir carregar corretamente.' +
      '<div style="margin-top:16px"><button onclick="location.reload()" style="padding:10px 22px;border-radius:999px;border:none;background:#1B263B;color:#fff;font-weight:700;cursor:pointer">Tentar de novo</button></div>' +
      '</div>';
    return;
  }
  ui.tab = state.clientOrder[0] || 'FATURAMENTO';
  if(ui.tab && ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG') ensureClientView(ui.tab);
  render();
  attachStaticHandlers();
  // a fonte (Fraunces/Public Sans) pode chegar depois do primeiro desenho e
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
