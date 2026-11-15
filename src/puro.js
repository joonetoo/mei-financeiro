/* ============================================================
   Contas e regras "puras" do Ritmo
   ------------------------------------------------------------
   Funções que só fazem conta: recebem o que precisam e devolvem a resposta,
   sem mexer na tela, na nuvem nem em nada fora delas. Moram aqui (e não no
   main.js) pra poderem ser conferidas pelos testes automáticos (`npm test`,
   pasta `testes/`). O main.js continua chamando com os mesmos nomes.
   ============================================================ */

/* ---------------- datas ---------------- */
// data LOCAL (nao toISOString, que e UTC): depois das 21h no Brasil o UTC ja
// virou o dia seguinte, e o video lancado a noite caia com a data de amanha.
export function localISO(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function addDays(iso, n){
  const [y,m,d] = iso.split('-').map(Number);
  return localISO(new Date(y, m-1, d+n));
}
export function shiftYm(ym, n){
  const [y,m] = ym.split('-').map(Number);
  const d = new Date(y, m-1+n, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
export function ymDiff(a, b){
  const [ya,ma] = a.split('-').map(Number), [yb,mb] = b.split('-').map(Number);
  return (ya*12+ma) - (yb*12+mb);
}

/* ---------------- dinheiro ---------------- */
export function parseBRL(v){
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
// duas casas, sem a "poeira" da soma de numeros quebrados (0.1 + 0.2)
export function centavos(n){
  return Math.round(n*100)/100;
}

/* ---------------- texto que vai pra tela ---------------- */
export function esc(s){
  return (s===undefined||s===null?'':String(s))
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

/* ---------------- sigla da bolinha do cliente ---------------- */
export function initials(name){
  const parts = (name||'').trim().split(/\s+/).filter(Boolean);
  if(parts.length===0) return '?';
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0]+parts[1][0]).toUpperCase();
}
export function primeiras2(nome){ return ((nome||'').trim().split(/\s+/)[0]||'').slice(0,2).toUpperCase(); }
// as iniciais, mas se outro cliente der a mesma (WAD SOCIAL e WIDE STUDIO =
// "WS") usa as 2 primeiras letras do 1º nome (WA / WI)
export function siglaDe(clients, cid){
  const c = (clients||[]).find(o=>o && o.id===cid);
  if(!c) return '?';
  const s = initials(c.nome);
  const iguais = clients.filter(o=>o && o.id!==cid && initials(o.nome)===s);
  if(!iguais.length) return s;
  const p = primeiras2(c.nome);
  return (p.length<2 || iguais.some(o=>primeiras2(o.nome)===p)) ? s : p;
}

/* ---------------- períodos de cobrança ---------------- */
export function periodoFechado(st, cid, ym){
  const f = st.fechamentos && st.fechamentos[cid];
  const x = f && f[ym] ? f[ym] : null;
  return !!(x && !x.aberto && x.data);
}
// o período aberto do cliente: o mês seguinte ao último fechado; sem nenhum
// fechamento ainda, o último mês (até o atual) que tem vídeo; senão o mês atual
export function periodoAberto(st, cid, atual){
  const f = (st.fechamentos && st.fechamentos[cid]) || {};
  const fechados = Object.keys(f).filter(k=>periodoFechado(st, cid, k)).sort();
  if(fechados.length) return shiftYm(fechados[fechados.length-1], 1);
  const vids = st.videos[cid] || {};
  const comVideo = Object.keys(vids).filter(k=>k<=atual && (vids[k]||[]).length).sort();
  return comVideo.length ? comVideo[comVideo.length-1] : atual;
}
// quando o período costuma fechar (só pra estimativa): dia 0 = último dia do
// próprio mês (Fábio); dia N = dia N do mês seguinte (Wide 4, WAD 8)
export function fechamentoPrevisto(st, cid, ym){
  const c = (st.clients||[]).find(o=>o && o.id===cid);
  const dia = c ? (Number(c.diaFechamento)||0) : 0;
  const [y,m] = ym.split('-').map(Number);
  if(!dia) return localISO(new Date(y, m, 0));
  const lim = new Date(y, m+1, 0).getDate();
  return localISO(new Date(y, m, Math.min(dia, lim)));
}

/* ---------------- meta do mês ---------------- */
// a do proprio mes, ou (se ainda nao definida) a do ultimo mes anterior que
// tenha meta — o mes novo ja comeca com a meta do anterior.
export function metaDoMes(metas, ym){
  metas = metas || {};
  if(Object.prototype.hasOwnProperty.call(metas, ym)) return parseBRL(metas[ym]) || 0;
  const anteriores = Object.keys(metas).filter(k=>k<ym).sort();
  return anteriores.length ? (parseBRL(metas[anteriores[anteriores.length-1]]) || 0) : 0;
}

/* ---------------- semanas (segunda a domingo) ---------------- */
// a semana em que o dia `iso` cai: posicao dele (0 = segunda … 6 = domingo),
// a segunda e o domingo
export function semanaDe(iso){
  const [y,m,d] = iso.split('-').map(Number);
  const idx = (new Date(y, m-1, d).getDay()+6)%7;
  const seg = addDays(iso, -idx);
  return {idx, seg, dom: addDays(seg, 6)};
}
// semanas do mes, cortadas nas bordas do mes: a soma das semanas bate com o
// total do mes. `porData` = {"AAAA-MM-DD": {v: valor, n: quantidade}}
export function semanasDoMes(ym, porData){
  const [ano, mes] = ym.split('-');
  const dim = new Date(Number(ano), Number(mes), 0).getDate();
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
  return semanas;
}

/* ---------------- cópias de segurança na nuvem ---------------- */
// nome da linha onde uma copia e guardada. O "rabicho" sorteado no fim evita
// que duas copias feitas no mesmo segundo caiam na mesma linha (uma apagaria
// a outra).
export function idDaCopia(chave, d, rabicho){
  const hora = `${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
  return `${chave}-conflito-${localISO(d)}-${hora}-${rabicho}`;
}
export function rabichoSorteado(){
  return (Math.random().toString(36).slice(2) + '0000').slice(0, 4);
}

/* ---------------- notas emitidas: a gaveta do ano ---------------- */
// As notas ficam em st.notas[ano] ("gavetas"), e o limite do MEI soma a gaveta
// do ano. Entao, quando a data de uma nota passa pra outro ano, a nota tem que
// trocar de gaveta — a MESMA nota (mesmo id), nunca uma copia.
export function acharNota(notas, id){
  if(!id) return null;
  for(const y of Object.keys(notas||{})){
    const lista = notas[y];
    if(!Array.isArray(lista)) continue;
    const idx = lista.findIndex(n=>n && n.id===id);
    if(idx>=0) return {year:y, idx, nota:lista[idx]};
  }
  return null;
}
function anoDaData(data){
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec(String(data||''));
  return m ? m[1] : null;
}
// Chamar DEPOIS de mudar a data da nota, dizendo a data que ela tinha antes.
// So mexe se o ano da data mudou e a nota nao esta na gaveta desse ano.
// Devolve {de, para, idx} (pra poder desfazer) ou null se nao moveu.
export function ajustarGavetaDaNota(st, id, dataAntes){
  const a = acharNota(st.notas, id);
  if(!a) return null;
  // id repetido em mais de uma gaveta (backup antigo importado): nao da pra
  // saber qual das duas foi editada, entao nao move nenhuma
  let vezes = 0;
  for(const y of Object.keys(st.notas||{})) if(Array.isArray(st.notas[y])) vezes += st.notas[y].filter(n=>n && n.id===id).length;
  if(vezes !== 1) return null;
  const para = anoDaData(a.nota.data);
  if(!para || para === a.year || para === anoDaData(dataAntes)) return null;
  st.notas[a.year].splice(a.idx, 1);
  if(!Array.isArray(st.notas[para])) st.notas[para] = [];
  st.notas[para].push(a.nota);
  if(Array.isArray(st.notasYears) && !st.notasYears.includes(para)){ st.notasYears.push(para); st.notasYears.sort(); }
  return {de: a.year, para, idx: a.idx};
}
// Desfaz o ajuste: devolve a nota pra gaveta (e pro lugar) de onde saiu.
export function devolverNotaPraGaveta(st, id, mov){
  if(!mov) return false;
  const a = acharNota(st.notas, id);
  if(!a || a.year === mov.de) return false;
  st.notas[a.year].splice(a.idx, 1);
  if(!Array.isArray(st.notas[mov.de])) st.notas[mov.de] = [];
  const lista = st.notas[mov.de];
  lista.splice(Math.min(mov.idx, lista.length), 0, a.nota);
  if(Array.isArray(st.notasYears) && !st.notasYears.includes(mov.de)){ st.notasYears.push(mov.de); st.notasYears.sort(); }
  return true;
}

/* ---------------- dias de trabalho do mês (escala 5x2) ---------------- */
// O Joel trabalha de segunda a sexta (feriado no meio da semana conta: ele
// trabalha). `mes` vai de 1 a 12. Devolve quantos dias o mês tem no total,
// quantos sao de segunda a sexta, e — a partir de `dia` (contando o proprio
// dia) — quantos ainda faltam de cada tipo e quantos uteis ja passaram.
export function diasDeTrabalho(ano, mes, dia = 1){
  const dim = new Date(Number(ano), Number(mes), 0).getDate();
  let uteis = 0, uteisAPartir = 0, corridosAPartir = 0, uteisAntes = 0;
  for(let d = 1; d <= dim; d++){
    const sem = new Date(Number(ano), Number(mes) - 1, d).getDay(); // 0 dom, 6 sab
    const util = sem >= 1 && sem <= 5;
    if(util) uteis++;
    if(d >= dia){ corridosAPartir++; if(util) uteisAPartir++; }
    else if(util) uteisAntes++;
  }
  return { dim, uteis, uteisAPartir, corridosAPartir, uteisAntes };
}
