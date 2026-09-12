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
  async get(key) {
    try {
      const { data, error } = await supabase
        .from("app_data")
        .select("data")
        .eq("id", key)
        .maybeSingle();
      if (error || !data) return null;
      return { value: JSON.stringify(data.data) };
    } catch (e) {
      console.error("Falha ao carregar do Supabase", e);
      return null;
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
  try{
    const res = await window.storage.get(STORAGE_KEY, false);
    if(res && res.value){
      state = JSON.parse(res.value);
      migrateState();
      return;
    }
  }catch(e){ /* not found or error -> fall through to default */ }
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

function persist(){
  setSaveIndicator('saving');
  clearTimeout(saveTimer);
  return new Promise(resolve=>{
    saveTimer = setTimeout(async ()=>{
      try{
        await window.storage.set(STORAGE_KEY, JSON.stringify(state), false);
        setSaveIndicator('saved');
      }catch(e){
        setSaveIndicator('error');
      }
      resolve();
    }, 300);
  });
}

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
  toast: null
};

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
  }, 5500);
}

/* ---------------- rendering ---------------- */
function esc(s){
  return (s===undefined||s===null?'':String(s))
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

function todosClientesMesTotal(ym){
  return state.clientOrder.reduce((s, id) => s + monthTotal(id, ym), 0);
}

function render(){
  const app = document.getElementById('app');
  const ymAtual = monthKey(REAL_YEAR, REAL_MONTH);
  const totalMesAtual = todosClientesMesTotal(ymAtual);
  app.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <h1>${esc(state.business.nomeFantasia||'Minha empresa')}</h1>
        <div class="sub">CNPJ ${esc(state.business.cnpj||'—')}</div>
      </div>
      <div class="topbar-stat">
        <div class="stat-label">Faturamento de ${MES_NOME[REAL_MONTH]} (todos os clientes)</div>
        <div class="stat-value">R$ ${fmtBRL(totalMesAtual)}</div>
      </div>
      <div id="savestate" class="savestate">salvo</div>
    </div>
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
  state.clientOrder.forEach(id=>{
    const c = clientById(id);
    if(!c) return;
    const active = ui.tab===id;
    const total = clientYearTotal(id, ensureClientView(id).year);
    html += `<button class="tab-btn ${active?'active':''}" data-action="switch-tab" data-tab="${id}">
      <span>${esc(c.nome)}</span>
      <span class="tag">R$ ${fmtBRL(total)}</span>
    </button>`;
  });
  html += `<div class="rail-divider"></div>`;
  html += `<button class="tab-btn ${ui.tab==='FATURAMENTO'?'active':''}" data-action="switch-tab" data-tab="FATURAMENTO">
    <span>Faturamento &amp; Limite MEI</span>
  </button>`;
  html += `<button class="tab-btn ${ui.tab==='CONFIG'?'active':''}" data-action="switch-tab" data-tab="CONFIG">
    <span>Configurações</span>
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

  let monthsHtml = '<div class="months">';
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

  let rowsHtml = '';
  if(rows.length===0){
    rowsHtml = `<div class="empty-hint">Nenhum ${isEsp?'lançamento':'vídeo'} em ${MES_NOME[view.month]} de ${view.year} ainda.</div>`;
  } else if(isEsp){
    rowsHtml = `<div class="esp-cards">`;
    rows.forEach(r=>{
      rowsHtml += `<div class="esp-card" data-row="${r.id}">
        <textarea class="esp-textarea" rows="2" placeholder="Escreva aqui: cliente, o que foi feito, quantos vídeos etc."
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="headline">${esc(r.headline)}</textarea>
        <div class="esp-card-foot">
          <div class="valor-wrap"><span class="valor-prefix">R$</span><input class="cell-input valor" type="text" inputmode="decimal" value="${esc(valorDisplay(r.valor))}"
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
      rowsHtml += `<tr data-row="${r.id}">
        <td class="num">${i+1}</td>
        <td><input class="cell-input" type="text" value="${esc(r.headline)}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="headline" placeholder="Nome do vídeo"></td>
        <td><input class="cell-input" type="text" value="${esc(r.subcliente)}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="subcliente" placeholder="Cliente final"></td>
        <td><input class="cell-input" type="date" value="${esc(r.data)}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="data"></td>
        <td><div class="valor-wrap"><span class="valor-prefix">R$</span><input class="cell-input valor" type="text" inputmode="decimal" value="${esc(valorDisplay(r.valor))}"
          data-role="video-field" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}" data-field="valor"></div></td>
        <td class="acao"><button class="icon-btn" title="Excluir vídeo" data-action="delete-video" data-client="${clientId}" data-ym="${ym}" data-row="${r.id}">✕</button></td>
      </tr>`;
    });
    rowsHtml += `</tbody></table></div>`;
  }

  return `
    <div class="panel-head">
      <div class="panel-title">${esc(c.nome)}${isEsp?' <span class="tipo-badge">esporádico</span>':''}</div>
      <div class="year-switch">
        <button data-action="year-step" data-client="${clientId}" data-dir="-1">‹</button>
        <span>${view.year}</span>
        <button data-action="year-step" data-client="${clientId}" data-dir="1">›</button>
        <span style="color:var(--ink-faint);margin-left:8px;">total do ano: R$ ${fmtBRL(yearTotal)}</span>
      </div>
    </div>
    ${monthsHtml}
    ${rowsHtml}
    <div class="table-foot">
      <button class="add-row-btn" data-action="add-video" data-client="${clientId}" data-ym="${ym}">+ ${isEsp?'adicionar lançamento':'adicionar vídeo'}</button>
      <div class="month-total">Total do mês: <b>R$ ${fmtBRL(total)}</b></div>
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
  const total = notasYearTotal(year);
  const limite = parseBRL(state.meiLimiteAnual)||81000;
  const pct = Math.min((total/limite)*100, 999);
  const pctClamped = Math.min(pct,100);
  let gaugeClass = '', msgClass='', msg='';
  const restante = limite - total;
  if(pct>=100){ gaugeClass='over'; msgClass='over'; msg=`Limite ultrapassado em R$ ${fmtBRL(Math.abs(restante))}. Fique atento ao desenquadramento do MEI.`; }
  else if(pct>=90){ gaugeClass='warn'; msgClass='warn'; msg=`Faltam R$ ${fmtBRL(restante)} para o limite anual — atenção.`; }
  else { msg = `Faltam R$ ${fmtBRL(restante)} para o limite anual de R$ ${fmtBRL(limite)}.`; }

  const {buckets, semData} = notasMonthlyBreakdown(year);
  const maxBucket = Math.max(1, ...Object.values(buckets));
  let barsHtml = '<div class="monthly-bars">';
  MESES.forEach(m=>{
    const v = buckets[m.k];
    const w = (v/maxBucket)*100;
    barsHtml += `<div class="mbar-row">
      <div class="lbl">${m.nome}</div>
      <div class="mbar-track"><div class="mbar-fill" style="width:${w}%"></div></div>
      <div class="val">R$ ${fmtBRL(v)}</div>
    </div>`;
  });
  if(semData>0){
    barsHtml += `<div class="mbar-row">
      <div class="lbl">Sem data</div>
      <div class="mbar-track"><div class="mbar-fill" style="width:${(semData/maxBucket)*100}%;background:var(--gold-wash);border-color:var(--gold);"></div></div>
      <div class="val">R$ ${fmtBRL(semData)}</div>
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

  let rowsHtml;
  if(rows.length===0){
    rowsHtml = `<div class="empty-hint">Nenhuma nota lançada em ${year} ainda.</div>`;
  } else {
    rowsHtml = `<div class="table-wrap"><table class="ledger">
      <thead><tr><th>Empresa</th><th class="data">Data</th><th class="valor">Valor</th><th class="acao"></th></tr></thead>
      <tbody>`;
    rows.forEach(r=>{
      rowsHtml += `<tr>
        <td><input class="cell-input" type="text" list="empresa-list" value="${esc(r.empresa)}"
          data-role="nota-field" data-year="${year}" data-row="${r.id}" data-field="empresa"></td>
        <td><input class="cell-input" type="date" value="${esc(r.data||'')}"
          data-role="nota-field" data-year="${year}" data-row="${r.id}" data-field="data"></td>
        <td><div class="valor-wrap"><span class="valor-prefix">R$</span><input class="cell-input valor" type="text" inputmode="decimal" value="${esc(valorDisplay(r.valor))}"
          data-role="nota-field" data-year="${year}" data-row="${r.id}" data-field="valor"></div></td>
        <td class="acao"><button class="icon-btn" title="Excluir nota" data-action="delete-nota" data-year="${year}" data-row="${r.id}">✕</button></td>
      </tr>`;
    });
    rowsHtml += `</tbody></table></div>
    <datalist id="empresa-list">${empresaOptions}</datalist>`;
  }

  const yearOptions = state.notasYears.map(y=>y).join(',');

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

    <div class="hero">
      <div class="hero-num">
        <div class="label">Faturado em ${year}</div>
        <div class="value">R$ ${fmtBRL(total).split(',')[0]}<span class="cents">,${fmtBRL(total).split(',')[1]}</span></div>
      </div>
      <div class="hero-limit">
        limite anual (MEI): R$
        <input type="text" inputmode="decimal" value="${esc(valorDisplay(limite))}" data-role="limite-field">
      </div>
    </div>

    <div class="gauge"><div class="gauge-fill ${gaugeClass}" style="width:${pctClamped}%"></div></div>
    <div class="gauge-ticks"><span>0</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
    <div class="gauge-msg ${msgClass}">${msg}</div>

    <div class="section-title">Por mês</div>
    ${barsHtml}

    <div class="section-title">Notas emitidas — ${year}</div>
    ${rowsHtml}
    <div class="table-foot">
      <button class="add-row-btn" data-action="add-nota" data-year="${year}">+ adicionar nota</button>
      <div class="month-total">Total ${year}: <b>R$ ${fmtBRL(total)}</b></div>
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
      <input type="text" value="${esc(c.nome)}" data-role="client-field" data-client="${id}" data-field="nome">
      ${isEsp
        ? `<span class="tipo-badge" title="Cliente esporádico, sem valor padrão a cada lançamento">esporádico</span>`
        : `<input type="text" inputmode="decimal" value="${esc(valorDisplay(c.valorPadrao))}" title="Valor padrão por vídeo" data-role="client-field" data-client="${id}" data-field="valorPadrao">`}
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
        <input type="text" value="${esc(b.cnpj)}" data-role="business-field" data-field="cnpj"></div>
      <div class="field"><label>Chave Pix</label>
        <input type="text" value="${esc(b.pix)}" data-role="business-field" data-field="pix"></div>
      <div class="field"><label>E-mail (opcional)</label>
        <input type="text" value="${esc(b.email)}" data-role="business-field" data-field="email"></div>
      <div class="field"><label>Telefone (opcional)</label>
        <input type="text" value="${esc(b.telefone)}" data-role="business-field" data-field="telefone"></div>
    </div>

    <div class="section-title">Limite anual do MEI</div>
    <div class="field" style="max-width:220px;">
      <label>Valor do limite (R$)</label>
      <input type="text" inputmode="decimal" value="${esc(valorDisplay(state.meiLimiteAnual))}" data-role="limite-field">
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
      const railLabel = document.querySelector(`.rail .tab-btn[data-tab="${t.dataset.client}"] span:first-child`);
      if(railLabel) railLabel.textContent = t.value;
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

  if(action==='switch-tab'){
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
    state.clients = state.clients.filter(c=>c.id!==id);
    state.clientOrder = state.clientOrder.filter(cid=>cid!==id);
    delete state.videos[id];
    if(ui.tab===id) ui.tab = state.clientOrder[0] || 'FATURAMENTO';
    persist();
    render();
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
  reader.onload = async () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(!parsed.clients || !parsed.business){ throw new Error('formato inválido'); }
      state = parsed;
      migrateState();
      await persist();
      render();
      showToast('Backup restaurado com sucesso.');
    }catch(err){
      showToast('Não consegui ler esse arquivo. Confira se é um backup válido (.json).');
    }
  };
  reader.readAsText(file);
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
  doc.setTextColor(20,24,20);
  doc.text(b.nomeFantasia || 'Relatório', marginX, 50);

  doc.setFont('helvetica','normal');
  doc.setFontSize(9.5);
  doc.setTextColor(90,95,85);
  let infoY = 68;
  if(b.razaoSocial){ doc.text(b.razaoSocial, marginX, infoY); infoY += 13; }
  if(b.cnpj){ doc.text(`CNPJ: ${b.cnpj}`, marginX, infoY); infoY += 13; }
  if(b.pix){ doc.text(`Chave Pix: ${b.pix}`, marginX, infoY); infoY += 13; }
  if(b.email){ doc.text(b.email, marginX, infoY); infoY += 13; }
  if(b.telefone){ doc.text(b.telefone, marginX, infoY); infoY += 13; }

  doc.setDrawColor(220,210,180);
  doc.line(marginX, infoY+4, pageWidth-marginX, infoY+4);

  doc.setFont('helvetica','bold');
  doc.setFontSize(13);
  doc.setTextColor(20,24,20);
  doc.text(`Relatório mensal — ${c.nome}`, marginX, infoY+26);
  doc.setFont('helvetica','normal');
  doc.setFontSize(10.5);
  doc.setTextColor(90,95,85);
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
    styles: { font:'helvetica', fontSize:9.5, textColor:[34,38,31], cellPadding:6, lineColor:[221,211,182], lineWidth:0.5 },
    headStyles: { fillColor:[14,111,99], textColor:[255,255,255], fontStyle:'bold' },
    alternateRowStyles: { fillColor:[245,240,228] },
    columnStyles: isEsp ? {
      0:{cellWidth:28},
      2:{cellWidth:80, halign:'right'}
    } : {
      0:{cellWidth:28},
      3:{cellWidth:70},
      4:{cellWidth:80, halign:'right'}
    },
    foot: isEsp ? [['','Total', 'R$ ' + fmtBRL(total)]] : [['','','','Total', 'R$ ' + fmtBRL(total)]],
    footStyles: { fillColor:[237,229,208], textColor:[34,38,31], fontStyle:'bold', halign:'right' }
  });

  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setTextColor(140,140,130);
  doc.text(isEsp ? `${rows.length} lançamento(s) neste mês.` : `${rows.length} vídeo(s) editado(s) neste mês.`, marginX, finalY);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, marginX, finalY+13);

  const filename = `${mesNome} - ${year} - ${c.nome}.pdf`;

  // Sandboxed environments (like this artifact preview) often block the
  // "click a hidden <a download>" trick used by doc.save(), which can
  // navigate the whole page away and leave it blank. Opening the PDF in
  // a new tab is more reliable; fall back to the download link if popups
  // are blocked.
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if(!win){
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(()=> URL.revokeObjectURL(url), 60000);
}

/* ---------------- boot ---------------- */
async function boot(){
  await loadState();
  ui.tab = state.clientOrder[0] || 'FATURAMENTO';
  if(ui.tab && ui.tab!=='FATURAMENTO' && ui.tab!=='CONFIG') ensureClientView(ui.tab);
  render();
  attachStaticHandlers();
}
boot();
