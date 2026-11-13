/* ============================================================
   NUVEM-FALSA-RITMO — so pra pre-visualizar o desenho em desenvolvimento.

   Entra SO quando o servidor local roda com VITE_NUVEM_FALSA=1 (config
   "ritmo-falsa" do .claude/launch.json). Nesse modo o app pula o login e,
   no lugar do Supabase, usa esta "nuvem" que mora na memoria da aba:
   nada sai do computador, nada e gravado em lugar nenhum, e ao recarregar
   a pagina tudo volta ao comeco.

   Os dados abaixo sao INVENTADOS (clientes, CNPJs, videos e notas que nao
   existem), so no mesmo formato do estado de verdade.

   Este arquivo NAO entra no app publicado: o `import()` dele fica atras de
   `import.meta.env.DEV`, que no build vira `false` e o empacotador joga
   fora. Conferir: grep "NUVEM-FALSA-RITMO" dist -r  → nada.
   ============================================================ */

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// numeros "aleatorios" sempre iguais (a tela nao muda a cada recarga)
function sorteador(semente){
  let s = semente >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function estadoInventado(){
  const hoje = new Date();
  const ano = hoje.getFullYear(), mes = hoje.getMonth(), dia = hoje.getDate();
  const ym = `${ano}-${pad(mes + 1)}`;
  const antD = new Date(ano, mes - 1, 1);
  const ymAnt = `${antD.getFullYear()}-${pad(antD.getMonth() + 1)}`;
  const ultimoDiaAnt = new Date(ano, mes, 0).getDate();
  const rnd = sorteador(20261113);
  let seq = 0;
  const id = p => `${p}_falso_${pad(++seq)}`;

  const clients = [
    {id:'orla',  nome:'ORLA FILMES PRODUÇÕES AUDIOVISUAIS LTDA', valorPadrao:70, tipo:'fixo', diaFechamento:0, cnpj:'11.222.333/0001-81'},
    {id:'norte', nome:'NORTE SOCIAL', valorPadrao:40, tipo:'fixo', diaFechamento:8, cnpj:'22.333.444/0001-72'},
    {id:'vega',  nome:'VEGA STUDIO',  valorPadrao:50, tipo:'fixo', diaFechamento:4, cnpj:'33.444.555/0001-63'},
  ];
  const finais = {
    orla:['Clínica Aurora','Padaria Trigal','Dr. Benício'],
    norte:['Loja Maré','Academia Pulso','Café Brisa','Ótica Lume'],
    vega:['Imobiliária Cais','Pet Farol','Estúdio Nave'],
  };
  const titulos = ['Reels bastidores','Corte podcast','Depoimento cliente','Anúncio promoção','Vídeo institucional','Reels dica rápida','Chamada evento','Tutorial produto'];

  const videos = {orla:{}, norte:{}, vega:{}};
  const lancar = (cid, aba, data, qtd) => {
    const c = clients.find(x => x.id === cid);
    const rows = videos[cid][aba] || (videos[cid][aba] = []);
    for(let i = 0; i < qtd; i++){
      rows.push({
        id: id('v'),
        headline: `${titulos[Math.floor(rnd() * titulos.length)]} ${pad(rows.length + 1)}`,
        subcliente: finais[cid][Math.floor(rnd() * finais[cid].length)],
        data: iso(data),
        valor: c.valorPadrao,
      });
    }
  };
  const ehDomingo = d => d.getDay() === 0;

  // mes passado: todo dia util tem video; Orla fecha no ultimo dia do mes
  for(let d = 1; d <= ultimoDiaAnt; d++){
    const dt = new Date(antD.getFullYear(), antD.getMonth(), d);
    if(ehDomingo(dt)) continue;
    if(rnd() < .55) lancar('orla', ymAnt, dt, 1);
    if(d >= 8)  lancar('norte', ymAnt, dt, 1 + Math.floor(rnd() * 3));
    if(d >= 5 && rnd() < .8) lancar('vega', ymAnt, dt, 1 + Math.floor(rnd() * 2));
  }
  // este mes, ate ontem. Norte e Vega ainda lancam uns dias na aba do mes
  // passado (fecham dia 8 e dia 4): e o caso "Fora daqui" do cartao da meta.
  const fechaNorte = Math.min(8, dia - 1), fechaVega = Math.min(4, dia - 1);
  for(let d = 1; d < dia; d++){
    const dt = new Date(ano, mes, d);
    if(ehDomingo(dt)) continue;
    if(rnd() < .7) lancar('orla', ym, dt, 1 + Math.floor(rnd() * 2));
    lancar('norte', d < fechaNorte ? ymAnt : ym, dt, 2 + Math.floor(rnd() * 4));
    if(rnd() < .85) lancar('vega', d < fechaVega ? ymAnt : ym, dt, 1 + Math.floor(rnd() * 3));
  }

  const soma = (cid, aba) => (videos[cid][aba] || []).reduce((s, r) => s + r.valor, 0);

  // notas: ano passado inteiro, este ano ate o mes passado (uma por cliente)
  const notas = {[String(ano - 1)]: [], [String(ano)]: []};
  const nomeNota = {orla:'ORLA FILMES', norte:'NORTE SOCIAL', vega:'VEGA STUDIO'};
  for(let m = 0; m < 12; m++){
    ['orla','norte','vega'].forEach((cid, i) => {
      if(rnd() < .12) return;
      notas[String(ano - 1)].push({id: id('n'), empresa: nomeNota[cid], data: m % 4 === 3 ? '' : `${ano - 1}-${pad(m + 1)}-${pad(3 + i * 4)}`, valor: 1400 + Math.round(rnd() * 16) * 100});
    });
  }
  for(let m = 0; m < mes - 1; m++){
    ['orla','norte','vega'].forEach((cid, i) => {
      notas[String(ano)].push({id: id('n'), empresa: nomeNota[cid], data: `${ano}-${pad(m + 1)}-${pad(2 + i * 3)}`, valor: 1500 + Math.round(rnd() * 14) * 100});
    });
  }

  // fechamentos do mes passado (cada um com a nota dele)
  const fechamentos = {orla:{}, norte:{}, vega:{}};
  const fechar = (cid, quando) => {
    const valor = soma(cid, ymAnt);
    if(!valor) return;
    const nid = id('n');
    notas[String(quando.getFullYear())] = notas[String(quando.getFullYear())] || [];
    notas[String(quando.getFullYear())].push({id: nid, empresa: clients.find(c => c.id === cid).nome, data: iso(quando), valor});
    fechamentos[cid][ymAnt] = {data: iso(quando), notaId: nid, valor};
  };
  fechar('orla', new Date(ano, mes, 0));
  if(dia > fechaVega && fechaVega > 0)  fechar('vega', new Date(ano, mes, fechaVega));
  if(dia > fechaNorte && fechaNorte > 0) fechar('norte', new Date(ano, mes, fechaNorte));

  return {
    business: {
      nomeFantasia:'Joel Exemplo Filmes', razaoSocial:'Joel Exemplo Produções ME', cnpj:'44.555.666/0001-54',
      pix:'pix@exemplo.test', email:'contato@exemplo.test', telefone:'(11) 90000-0000', apelido:'Joel',
    },
    meiLimiteAnual: 81000,
    clients,
    clientOrder: ['orla','norte','vega'],
    videos,
    notas,
    notasYears: [String(ano - 1), String(ano)],
    metas: {[ymAnt]: 7500, [ym]: 8000},
    fechamentos,
    orcamentos: [{
      id:'o_falso_01', numero:`${ano}-001`, data: iso(new Date(ano, mes, Math.max(1, dia - 3))), status:'enviado',
      cliente:'Restaurante Enseada', projeto:'Vídeo de inauguração',
      itens:[{id:'i_falso_01', descricao:'Edição de vídeo (até 90 s)', qtd:'2', valor:'450'}, {id:'i_falso_02', descricao:'Legendas animadas', qtd:'2', valor:'80'}],
      descTipo:'pc', descValor:'0', usarTotalManual:false, totalManual:'',
      texto:'', textoEditado:false, prazo:'7 dias úteis', validade:'15 dias',
      pag:{pix:true, pixDesc:'5', cartao:true, parc:'3', sinal:false},
      calc:{modo:'freela', qtd:'2', duracao:'', nivel:'simples', tempo:'1h', extras:['leg'], hora:'60', adic:30, prazo:'1'},
    }],
  };
}

// Mesma "cara" do window.storage de verdade (get, getStamp, setIfUnchanged,
// existeComPrefixo, historico, set), mas tudo num Map dentro da aba.
export function criarNuvemFalsa(chave){
  const linhas = new Map();
  linhas.set(chave, {data: JSON.stringify(estadoInventado()), updated_at: new Date().toISOString()});
  return {
    falsa: true,
    async get(key){
      const l = linhas.get(key);
      return l ? {value: l.data, updatedAt: l.updated_at} : {value: null};
    },
    async getStamp(key){
      const l = linhas.get(key);
      return {updatedAt: l ? l.updated_at : null};
    },
    async setIfUnchanged(key, value, esperado, novoCarimbo){
      const l = linhas.get(key);
      if(!esperado){
        if(l) return {conflict: true};
      } else if(!l || l.updated_at !== esperado){
        return {conflict: true};
      }
      linhas.set(key, {data: value, updated_at: novoCarimbo});
      return {ok: true, updatedAt: novoCarimbo};
    },
    async existeComPrefixo(prefixo){
      return [...linhas.keys()].some(k => k.startsWith(prefixo));
    },
    async historico(){ /* o cofre de verdade nao e tocado */ },
    async set(key, value){
      linhas.set(key, {data: value, updated_at: new Date().toISOString()});
    },
  };
}
