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
  async set(key, value) {
    try {
      const parsed = JSON.parse(value);
      const { error } = await supabase
        .from("app_data")
        .upsert({ id: key, data: parsed, updated_at: new Date().toISOString() });
      if (error) console.error("Falha ao salvar no Supabase", error);
    } catch (e) {
      console.error("Falha ao salvar no Supabase", e);
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
    const today = new Date().toISOString().slice(0, 10);
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

const now = new Date();
const REAL_YEAR = String(now.getFullYear());
const REAL_MONTH = String(now.getMonth()+1).padStart(2,'0');
const TODAY_ISO = now.toISOString().slice(0,10);

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
const STORAGE_KEY = 'jnf-financeiro-v1';
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
  if(!state.clientOrder) state.clientOrder = state.clients.map(c=>c.id);
  if(!state.videos) state.videos = {};
  if(!state.notas) state.notas = d.notas;
  if(!state.notasYears) state.notasYears = Object.keys(state.notas).sort();
}

// Fila serializada de gravação: sem isso, uma gravação em voo mais lenta
// (rede instável) pode terminar DEPOIS de uma mais nova e sobrescrever uma
// edição recente com uma mais velha. Só existe uma gravação em andamento por
// vez; se `state` mudar de novo enquanto ela está em voo, a próxima dispara
// assim que a atual terminar, sempre lendo o `state` mais atual.
let saving = false;
let pendingRewrite = false;
async function flushSave(){
  if(saving){ pendingRewrite = true; return; }
  saving = true;
  setSaveIndicator('saving');
  try{
    await window.storage.set(STORAGE_KEY, JSON.stringify(state), false);
    setSaveIndicator('saved');
  }catch(e){
    setSaveIndicator('error');
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
  }
});
window.addEventListener('pagehide', () => {
  if(state){
    clearTimeout(saveTimer);
    flushSave();
  }
});

function setSaveIndicator(mode){
  const el = document.getElementById('savestate');
  if(!el) return;
  if(mode==='saving'){ el.textContent='salvando…'; el.classList.add('saving'); }
  else if(mode==='saved'){ el.textContent='salvo'; el.classList.remove('saving'); }
  else { el.textContent='erro ao salvar — verifique a conexão'; el.classList.remove('saving'); }
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

let lastGaugeOffset = null;
function syncGauge(){
  const circle = document.querySelector('.gauge-ring-fill');
  if(!circle) return;
  const circumference = 376.99; // 2*PI*60, matches the SVG circle's r=60
  const {pctClamped} = limiteProgress(ui.fatYear);
  const target = (circumference * (1 - pctClamped/100)).toFixed(1);
  const reduced = prefersReducedMotion();
  if(lastGaugeOffset===null) lastGaugeOffset = circumference;
  if(!reduced){
    circle.style.transition = 'none';
    circle.setAttribute('stroke-dashoffset', lastGaugeOffset);
    circle.getBoundingClientRect();
    circle.style.transition = '';
  }
  const apply = () => { circle.setAttribute('stroke-dashoffset', target); lastGaugeOffset = target; };
  reduced ? apply() : requestAnimationFrame(apply);
}

let lastBarWidths = {};
function syncBars(){
  document.querySelectorAll('.mbar-fill[data-target]').forEach((el,i)=>{
    const target = el.getAttribute('data-target');
    const reduced = prefersReducedMotion();
    const prev = lastBarWidths[i];
    if(prev!==undefined && !reduced){
      el.style.transition = 'none';
      el.style.width = prev+'%';
      el.getBoundingClientRect();
      el.style.transition = '';
    }
    const apply = () => { el.style.width = target+'%'; lastBarWidths[i]=target; };
    reduced ? apply() : requestAnimationFrame(apply);
  });
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
function iconGauge(size=15){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 1 0-9-9"/><path d="M12 12l4-4"/></svg>`;}
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
    ui.clientView[clientId] = {year: REAL_YEAR, month: REAL_MONTH};
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

function todosClientesMesTotal(ym){
  return state.clientOrder.reduce((s, id) => s + monthTotal(id, ym), 0);
}

function renderStatsRow(){
  const ymAtual = monthKey(REAL_YEAR, REAL_MONTH);
  const totalMesAtual = todosClientesMesTotal(ymAtual);
  const {total, limite, pctClamped, msgClass, restante} = limiteProgress(REAL_YEAR);
  const statusCls = msgClass || 'ok';
  const statusLabel = statusCls==='danger' ? 'Limite excedido' : statusCls==='warn' ? 'Atenção' : 'Tranquilo';

  // quanto do ano ja passou, em %: a marca de ritmo na barra. Barra atras
  // da marca = faturando abaixo do que o limite comportaria.
  const mesesDecorridos = parseInt(REAL_MONTH, 10);
  const pacePct = Math.min((mesesDecorridos/12)*100, 100);

  let msg;
  if(restante < 0){
    msg = `Limite ultrapassado em <b>R$ ${fmtBRL(Math.abs(restante))}</b>. Fique atento ao desenquadramento.`;
  } else if(total > 0){
    const projecao = (total/mesesDecorridos)*12;
    const folga = limite - projecao;
    msg = folga >= 0
      ? `No ritmo atual fecha dezembro em <b class="sensitive">R$ ${fmtBRL(projecao)}</b> — R$ ${fmtBRL(folga)} de folga.`
      : `No ritmo atual fecha dezembro em <b class="sensitive">R$ ${fmtBRL(projecao)}</b> — R$ ${fmtBRL(Math.abs(folga))} acima do limite.`;
  } else {
    msg = `Nenhuma nota lançada em ${REAL_YEAR} ainda.`;
  }

  return `
    <div class="stats-row">
      <div class="stat-hero">
        <div class="stat-hero-head">
          <div class="stat-label">Ainda cabe no limite de ${REAL_YEAR}</div>
          <span class="stat-pill ${statusCls}">${statusLabel}</span>
        </div>
        <div class="stat-hero-value sensitive">R$ ${fmtBRL(Math.max(restante,0))}</div>
        <div class="limit-bar">
          <div class="limit-fill ${msgClass}" style="width:${pctClamped.toFixed(1)}%"></div>
          <div class="limit-pace" style="left:${pacePct.toFixed(1)}%" title="ritmo do ano"></div>
        </div>
        <div class="limit-foot">
          <span>${pctClamped.toFixed(1).replace('.',',')}% usado</span>
          <span class="pace">ritmo do ano: ${pacePct.toFixed(0)}%</span>
        </div>
        <div class="stat-hero-msg">${msg}</div>
      </div>
      <div class="stat-side">
        <div class="stat-card-sm">
          <div class="stat-label">${MES_NOME[REAL_MONTH]}</div>
          <div class="stat-value sensitive">R$ ${fmtBRL(totalMesAtual)}</div>
        </div>
        <div class="stat-card-sm">
          <div class="stat-label">Faturado em ${REAL_YEAR}</div>
          <div class="stat-value sensitive">R$ ${fmtBRL(total)}</div>
        </div>
      </div>
    </div>
  `;
}

function render(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <h1>${esc(state.business.nomeFantasia||'Minha empresa')}</h1>
        <div class="sub sensitive">CNPJ ${esc(state.business.cnpj||'—')}</div>
      </div>
      <div class="topbar-right">
        <button class="privacy-toggle ${ui.valuesHidden?'active':''}" type="button" data-action="toggle-privacy" aria-pressed="${ui.valuesHidden}">
          <svg class="icon-eye" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ui.valuesHidden?'hidden':''}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="icon-eye-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ui.valuesHidden?'':'hidden'}><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.9 21.9 0 0 1-3.22 4.44M1 1l22 22"/></svg>
          <span>${ui.valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}</span>
        </button>
      </div>
      <div id="savestate" class="savestate">salvo</div>
    </div>
    ${renderStatsRow()}
    <div class="layout">
      ${renderRail()}
      <div class="main">${renderMain()}</div>
    </div>
    ${ui.toast ? renderToast() : ''}
  `;
  attachHandlers();
}

function renderRail(){
  let html = '<div class="rail">';
  html += `<div class="rail-slide-pill"></div>`;
  html += `<div class="rail-group-label">Clientes</div>`;
  state.clientOrder.forEach(id=>{
    const c = clientById(id);
    if(!c) return;
    const active = ui.tab===id;
    const total = clientYearTotal(id, ensureClientView(id).year);
    html += `<button class="tab-btn ${active?'active':''}" data-action="switch-tab" data-tab="${id}">
      <span class="tab-chip ${chipClass(id)}">${esc(initials(c.nome))}</span>
      <span class="tab-label">${esc(c.nome)}</span>
      <span class="tag sensitive">R$ ${fmtBRL(total)}</span>
    </button>`;
  });
  html += `<div class="rail-divider"></div>`;
  html += `<div class="rail-group-label">Visão geral</div>`;
  html += `<button class="tab-btn ${ui.tab==='FATURAMENTO'?'active':''}" data-action="switch-tab" data-tab="FATURAMENTO">
    <span class="tab-chip">${iconGauge(14)}</span>
    <span class="tab-label">Faturamento &amp; Limite MEI</span>
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

  requestAnimationFrame(()=>{
    syncSlider('rail', '.rail-slide-pill', '.rail .tab-btn.active');
    if(ui.tab && ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG'){
      syncSlider('months-'+ui.tab, '.month-slide-pill', '.months .month-pill.active');
      scrollActiveMonthIntoView();
    }
    if(ui.tab==='FATURAMENTO'){
      syncGauge();
      syncBars();
    }
  });
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
}

/* ---------------- client panel ---------------- */
function renderClientPanel(clientId){
  const c = clientById(clientId);
  if(!c){ return '<div class="empty-hint">Selecione uma aba.</div>'; }
  const view = ensureClientView(clientId);
  const ym = monthKey(view.year, view.month);
  const rows = getVideos(clientId, ym);
  const total = monthTotal(clientId, ym);
  const yearTotal = clientYearTotal(clientId, view.year);

  let monthsHtml = '<div class="months"><div class="month-slide-pill"></div>';
  MESES.forEach(m=>{
    const k = monthKey(view.year, m.k);
    const has = (state.videos[clientId] && state.videos[clientId][k] && state.videos[clientId][k].length>0);
    const active = m.k===view.month;
    monthsHtml += `<button class="month-pill ${active?'active':''} ${has?'has-data':''}"
      data-action="switch-month" data-client="${clientId}" data-month="${m.k}">
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
          <div class="mini-stat"><div class="v sensitive">R$ ${fmtBRL(total)}</div><div class="l">este mês</div></div>
          <div class="mini-stat"><div class="v sensitive">R$ ${fmtBRL(yearTotal)}</div><div class="l">no ano</div></div>
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
    ${rowsHtml}
    <div class="table-foot">
      <button class="add-row-btn" data-action="add-video" data-client="${clientId}" data-ym="${ym}">+ ${isEsp?'adicionar lançamento':'adicionar vídeo'}</button>
      <div class="month-total">Total do mês: <b class="sensitive">R$ ${fmtBRL(total)}</b></div>
    </div>
    <div class="action-bar">
      <button class="btn primary" data-action="gerar-pdf" data-client="${clientId}" data-ym="${ym}" ${rows.length===0?'disabled':''}>Gerar relatório PDF do mês</button>
      <button class="btn" data-action="lancar-nota" data-client="${clientId}" data-ym="${ym}" ${rows.length===0?'disabled':''}>Lançar nota emitida deste mês</button>
    </div>
  `;
}

/* ---------------- faturamento / limite MEI ---------------- */
function renderFaturamento(){
  const year = ui.fatYear;
  const {total, limite, pctClamped, msgClass, msg} = limiteProgress(year);

  const {buckets, semData} = notasMonthlyBreakdown(year);
  const maxBucket = Math.max(1, ...Object.values(buckets));
  let barsHtml = '<div class="monthly-bars">';
  MESES.forEach(m=>{
    const v = buckets[m.k];
    const w = (v/maxBucket)*100;
    barsHtml += `<div class="mbar-row">
      <div class="lbl">${m.nome}</div>
      <div class="mbar-track"><div class="mbar-fill" data-target="${w.toFixed(2)}"></div></div>
      <div class="val sensitive">R$ ${fmtBRL(v)}</div>
    </div>`;
  });
  if(semData>0){
    barsHtml += `<div class="mbar-row">
      <div class="lbl">Sem data</div>
      <div class="mbar-track"><div class="mbar-fill" data-target="${((semData/maxBucket)*100).toFixed(2)}" style="background:var(--ink-faint);"></div></div>
      <div class="val sensitive">R$ ${fmtBRL(semData)}</div>
    </div>`;
  }
  barsHtml += '</div>';

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

  const yearOptions = state.notasYears.map(y=>y).join(',');
  const statusCls = msgClass || 'ok';

  return `
    <div class="panel-head">
      <div class="panel-title">Faturamento &amp; Limite MEI</div>
      <div class="year-switch">
        <button data-action="fat-year-step" data-dir="-1">‹</button>
        <span>${year}</span>
        <button data-action="fat-year-step" data-dir="1">›</button>
        <button class="btn small" style="margin-left:8px;" data-action="fat-add-year">+ novo ano</button>
      </div>
    </div>

    <div class="hero-card"><div class="hero">
      <div class="gauge-wrap">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r="60" fill="none" stroke="var(--hairline-strong)" stroke-width="12"/>
          <circle class="gauge-ring-fill ${statusCls==='ok'?'':statusCls}" cx="75" cy="75" r="60" fill="none" stroke-width="12"
            stroke-linecap="round" stroke-dasharray="376.99" stroke-dashoffset="376.99"/>
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--slate)"/>
              <stop offset="100%" stop-color="var(--accent-soft)"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="gauge-center">
          <div class="pct">${pctClamped.toFixed(1).replace('.',',')}<span style="font-size:14px;">%</span></div>
          <div class="pct-label">do limite</div>
        </div>
      </div>
      <div class="hero-figures">
        <div class="hero-num">
          <div class="label">Faturado em ${year}</div>
          <div class="value sensitive">R$ ${fmtBRL(total).split(',')[0]}<span class="cents">,${fmtBRL(total).split(',')[1]}</span></div>
        </div>
        <div class="gauge-msg ${msgClass} sensitive">${msg}</div>
        <div class="hero-limit">
          limite anual (MEI): R$
          <input class="sensitive" type="text" inputmode="decimal" value="${esc(valorDisplay(limite))}" data-role="limite-field">
        </div>
      </div>
    </div></div>

    <div class="section-title">Por mês</div>
    ${barsHtml}

    <div class="section-title">Notas emitidas — ${year}</div>
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
  else if(action==='switch-tab'){
    ui.tab = btn.dataset.tab;
    if(ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG') ensureClientView(ui.tab);
    render();
  }
  else if(action==='switch-month'){
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
    const isCurrentMonth = ym === monthKey(REAL_YEAR, REAL_MONTH);
    const defaultData = isCurrentMonth ? TODAY_ISO : (ym + '-01');
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
  else if(action==='lancar-nota'){
    const client = btn.dataset.client, ym = btn.dataset.ym;
    const c = clientById(client);
    const total = monthTotal(client, ym);
    const year = ym.split('-')[0];
    if(!state.notas[year]) state.notas[year] = [];
    if(!state.notasYears.includes(year)){ state.notasYears.push(year); state.notasYears.sort(); }
    const isCurrentMonth = ym === monthKey(REAL_YEAR, REAL_MONTH);
    state.notas[year].push({
      id: uid('n'),
      empresa: c ? c.nome : '',
      data: isCurrentMonth ? TODAY_ISO : (ym + '-01'),
      valor: total
    });
    ui.tab = 'FATURAMENTO';
    ui.fatYear = year;
    persist();
    render();
    showToast(`Nota de R$ ${fmtBRL(total)} lançada em Faturamento.`);
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
    state.clients.push({id, nome:name, valorPadrao: valorEl ? parseBRL(valorEl.value) : 0, tipo});
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
    const previousTab = ui.tab;
    state.clients = state.clients.filter(c=>c.id!==id);
    state.clientOrder = state.clientOrder.filter(cid=>cid!==id);
    delete state.videos[id];
    if(ui.tab===id) ui.tab = state.clientOrder[0] || 'FATURAMENTO';
    persist();
    render();
    if(removedClient){
      showToast(`Cliente "${removedClient.nome}" excluído.`, () => {
        state.clients.splice(Math.min(clientIdx, state.clients.length), 0, removedClient);
        state.clientOrder.splice(Math.min(orderIdx, state.clientOrder.length), 0, id);
        if(removedVideos !== undefined) state.videos[id] = removedVideos;
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

  // The sliding-pill/gauge/bar geometry is computed from live layout
  // (offsetLeft/offsetWidth) at render time, so it goes stale if the window
  // is resized or a phone is rotated without anything else re-rendering —
  // re-sync it (snapped, no animation) whenever that happens.
  let resizeTimer = null;
  window.addEventListener('resize', ()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>{
      sliderGeom = {};
      lastGaugeOffset = null;
      lastBarWidths = {};
      requestAnimationFrame(()=>{
        syncSlider('rail', '.rail-slide-pill', '.rail .tab-btn.active');
        if(ui.tab && ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG'){
          syncSlider('months-'+ui.tab, '.month-slide-pill', '.months .month-pill.active');
        }
        if(ui.tab==='FATURAMENTO'){ syncGauge(); syncBars(); }
      });
    }, 150);
  });
}
boot();
