/* ============================================================
   Juntar versões (mescla "de três vias")
   ------------------------------------------------------------
   O app guarda tudo numa linha só. Quando dois aparelhos editam ao mesmo
   tempo (Mac aberto o dia todo + celular na rua), em vez de escolher um lado
   a gente junta item a item, comparando cada versão com a "base" — a última
   versão da nuvem que este aparelho conhecia:

     - só este aparelho mudou um item  -> fica a mudança daqui
     - só o outro aparelho mudou       -> fica a mudança de lá
     - os dois mudaram igual           -> tanto faz
     - os dois mudaram DIFERENTE       -> fica a daqui (é a ação mais recente
       do usuário) e a de lá é devolvida em `conflitos` pra ser guardada à
       parte — nada se perde
     - um apagou e o outro editou      -> fica o editado (apagar nunca vence
       uma edição; na dúvida, guardar)

   Listas de itens com `id` (vídeos, notas, clientes) são juntadas por id;
   listas simples (ordem dos clientes, anos das notas) como conjunto.
   Funções puras: não mexem em nada fora delas.
   ============================================================ */

function isObj(x){ return x !== null && typeof x === 'object' && !Array.isArray(x); }
function isIdItem(x){ return isObj(x) && (typeof x.id === 'string' || typeof x.id === 'number'); }
function isIdArray(a){
  if(!Array.isArray(a) || !a.every(isIdItem)) return false;
  // dois itens com o mesmo id (ex.: backup antigo importado): juntar por id
  // perderia um deles — entao essa lista NAO e tratada item a item
  const ids = new Set(a.map(x => String(x.id)));
  return ids.size === a.length;
}
function isPrimArray(a){ return Array.isArray(a) && a.every(x => x === null || typeof x !== 'object'); }

// igualdade de conteúdo que ignora a ordem das chaves (o banco reordena as
// chaves do JSON ao guardar, então comparar texto não serve)
export function deepEq(a, b){
  if(a === b) return true;
  if(typeof a !== typeof b) return false;
  if(a === null || b === null || typeof a !== 'object') return false;
  if(Array.isArray(a) !== Array.isArray(b)) return false;
  if(Array.isArray(a)){
    if(a.length !== b.length) return false;
    for(let i=0;i<a.length;i++) if(!deepEq(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if(ka.length !== kb.length) return false;
  for(const k of ka){ if(!Object.prototype.hasOwnProperty.call(b, k) || !deepEq(a[k], b[k])) return false; }
  return true;
}

function clone(x){ return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }

function m3(b, l, r, path, conflitos){
  if(deepEq(l, r)) return clone(l);
  if(deepEq(l, b)) return clone(r);
  if(deepEq(r, b)) return clone(l);
  // os dois lados mudaram, e diferente
  if(l === undefined) return clone(r); // apagado aqui, editado lá: guarda o editado
  if(r === undefined) return clone(l); // editado aqui, apagado lá: guarda o editado
  const arrs = [b, l, r].filter(Array.isArray);
  if(Array.isArray(l) && Array.isArray(r) && arrs.every(isIdArray)){
    return mergeIdArray(Array.isArray(b) ? b : [], l, r, path, conflitos);
  }
  if(Array.isArray(l) && Array.isArray(r) && arrs.every(isPrimArray)){
    return mergeSet(Array.isArray(b) ? b : [], l, r);
  }
  if(isObj(l) && isObj(r)){
    const bb = isObj(b) ? b : {};
    const out = {};
    const keys = [...new Set([...Object.keys(l), ...Object.keys(r)])];
    for(const k of keys){
      const v = m3(bb[k], l[k], r[k], path.concat(k), conflitos);
      if(v !== undefined) out[k] = v;
    }
    return out;
  }
  conflitos.push({ path, local: clone(l), remoto: clone(r) });
  return clone(l);
}

function mergeIdArray(b, l, r, path, conflitos){
  const bm = new Map(b.map(x => [String(x.id), x]));
  const lm = new Map(l.map(x => [String(x.id), x]));
  const rm = new Map(r.map(x => [String(x.id), x]));
  const res = new Map();
  for(const id of new Set([...lm.keys(), ...rm.keys(), ...bm.keys()])){
    const v = m3(bm.get(id), lm.get(id), rm.get(id), path.concat('#' + id), conflitos);
    if(v !== undefined) res.set(id, v);
  }
  // ordem: a daqui; o que só existe lá entra logo depois do item que vinha
  // antes dele lá (um vídeo novo lançado no celular aparece no lugar certo)
  const ordem = l.map(x => String(x.id)).filter(id => res.has(id));
  const rIds = r.map(x => String(x.id));
  rIds.forEach((id, i) => {
    if(!res.has(id) || ordem.includes(id)) return;
    let pos = 0;
    for(let j = i - 1; j >= 0; j--){
      const k = ordem.indexOf(rIds[j]);
      if(k >= 0){ pos = k + 1; break; }
    }
    ordem.splice(pos, 0, id);
  });
  for(const id of res.keys()) if(!ordem.includes(id)) ordem.push(id);
  return ordem.map(id => res.get(id));
}

function mergeSet(b, l, r){
  const has = (arr, x) => arr.some(y => deepEq(y, x));
  const out = [];
  for(const x of [...l, ...r]){
    if(has(out, x)) continue;
    const tiradoAqui = has(b, x) && !has(l, x);
    const tiradoLa = has(b, x) && !has(r, x);
    if(tiradoAqui || tiradoLa) continue;
    out.push(x);
  }
  return out;
}

export function mergeState(base, local, remoto){
  const conflitos = [];
  const merged = m3(base === undefined ? {} : base, local, remoto, [], conflitos);
  reparar(merged, local, remoto, base);
  return { merged, conflitos };
}

// Um aparelho apagou um cliente enquanto o outro lançava vídeo nele: os
// vídeos ficam (editar vence apagar), então o cliente volta também — senão
// eles ficariam guardados mas invisíveis no app.
function reparar(m, l, r, b){
  if(!isObj(m) || !Array.isArray(m.clients)) return;
  const tem = id => m.clients.some(c => c && c.id === id);
  for(const cid of Object.keys(isObj(m.videos) ? m.videos : {})){
    if(tem(cid)) continue;
    const meses = m.videos[cid];
    const temVideo = isObj(meses) && Object.values(meses).some(a => Array.isArray(a) && a.length);
    if(!temVideo) continue;
    const achar = s => (s && Array.isArray(s.clients)) ? s.clients.find(c => c && c.id === cid) : null;
    const c = achar(l) || achar(r) || achar(b);
    if(!c) continue;
    m.clients.push(clone(c));
    if(Array.isArray(m.clientOrder) && !m.clientOrder.includes(cid)) m.clientOrder.push(cid);
  }
}

/* ---- lista do que mudou (pro registro de atividades, o "cofre") ---- */
function flatten(x, path, out){
  if(Array.isArray(x) && x.length && isIdArray(x)){
    for(const it of x) out[path + '/#' + it.id] = it;
    return out;
  }
  if(isObj(x)){
    const ks = Object.keys(x);
    if(!ks.length){ out[path] = x; return out; }
    for(const k of ks) flatten(x[k], path + '/' + k, out);
    return out;
  }
  out[path] = x;
  return out;
}

export function diffState(antes, depois){
  const a = flatten(antes || {}, '', {}), d = flatten(depois || {}, '', {});
  const mud = [];
  for(const k of new Set([...Object.keys(a), ...Object.keys(d)])){
    if(!deepEq(a[k], d[k])) mud.push({ path: k, antes: a[k], depois: d[k] });
  }
  return mud;
}

export function pareceEstado(x){
  return isObj(x) && Array.isArray(x.clients) && isObj(x.business);
}
