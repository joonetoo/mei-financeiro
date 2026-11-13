// Testes da junção de versões entre aparelhos (src/sync.js).
// Dados inventados — nada daqui é real. Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeState, diffState, deepEq, pareceEstado } from '../src/sync.js';

const copia = x => JSON.parse(JSON.stringify(x));
function base(){
  return {
    business: { nomeFantasia: 'Estúdio Exemplo', cnpj: '' },
    meiLimiteAnual: 81000,
    clients: [
      { id: 'alfa', nome: 'ALFA FILMES', valorPadrao: 50, tipo: 'fixo' },
      { id: 'beta', nome: 'BETA MÍDIA', valorPadrao: 40, tipo: 'fixo' },
    ],
    clientOrder: ['alfa', 'beta'],
    videos: {
      alfa: { '2031-03': [
        { id: 'v1', headline: 'Vídeo 1', data: '2031-03-02', valor: 50 },
        { id: 'v2', headline: 'Vídeo 2', data: '2031-03-03', valor: 50 },
      ] },
    },
    notas: {
      '2031': [
        { id: 'n1', empresa: 'ALFA FILMES', data: '2031-03-31', valor: 100 },
        { id: 'n2', empresa: 'BETA MÍDIA', data: '2031-12-20', valor: 400 },
      ],
      '2032': [],
    },
    notasYears: ['2031', '2032'],
    metas: { '2031-03': 6000 },
    fechamentos: { beta: { '2031-12': { data: '2031-12-20', notaId: 'n2', valor: 400 } } },
    orcamentos: [],
  };
}
const todasAsNotas = s => Object.values(s.notas).flat();
const vezesDaNota = (s, id) => todasAsNotas(s).filter(n => n.id === id).length;

test('só este aparelho mudou: fica a mudança daqui, sem conflito', () => {
  const b = base(), l = base(), r = base();
  l.videos.alfa['2031-03'][0].valor = 80;
  const { merged, conflitos } = mergeState(b, l, r);
  assert.equal(merged.videos.alfa['2031-03'][0].valor, 80);
  assert.equal(conflitos.length, 0);
});

test('só o outro aparelho mudou: fica a mudança de lá, sem conflito', () => {
  const b = base(), l = base(), r = base();
  r.videos.alfa['2031-03'].push({ id: 'v3', headline: 'Vídeo 3', data: '2031-03-04', valor: 50 });
  const { merged, conflitos } = mergeState(b, l, r);
  assert.deepEqual(merged.videos.alfa['2031-03'].map(v => v.id), ['v1', 'v2', 'v3']);
  assert.equal(conflitos.length, 0);
});

test('cada aparelho mudou um campo diferente do mesmo vídeo: os dois ficam', () => {
  const b = base(), l = base(), r = base();
  l.videos.alfa['2031-03'][0].valor = 75;
  r.videos.alfa['2031-03'][0].headline = 'Abertura do evento';
  const { merged, conflitos } = mergeState(b, l, r);
  assert.equal(merged.videos.alfa['2031-03'][0].valor, 75);
  assert.equal(merged.videos.alfa['2031-03'][0].headline, 'Abertura do evento');
  assert.equal(conflitos.length, 0);
});

test('o MESMO campo mudado nos dois lados: fica o daqui e o de lá vai pros conflitos', () => {
  const b = base(), l = base(), r = base();
  l.videos.alfa['2031-03'][0].valor = 75;
  r.videos.alfa['2031-03'][0].valor = 90;
  const { merged, conflitos } = mergeState(b, l, r);
  assert.equal(merged.videos.alfa['2031-03'][0].valor, 75);
  assert.equal(conflitos.length, 1);
  assert.equal(conflitos[0].local, 75);
  assert.equal(conflitos[0].remoto, 90);
  assert.deepEqual(conflitos[0].path, ['videos', 'alfa', '2031-03', '#v1', 'valor']);
});

test('os dois mudaram igual: sem conflito', () => {
  const b = base(), l = base(), r = base();
  l.meiLimiteAnual = 90000; r.meiLimiteAnual = 90000;
  const { merged, conflitos } = mergeState(b, l, r);
  assert.equal(merged.meiLimiteAnual, 90000);
  assert.equal(conflitos.length, 0);
});

test('editar vence apagar: apagado aqui, editado lá → o vídeo fica (editado)', () => {
  const b = base(), l = base(), r = base();
  l.videos.alfa['2031-03'].splice(0, 1);
  r.videos.alfa['2031-03'][0].valor = 120;
  const { merged } = mergeState(b, l, r);
  const v1 = merged.videos.alfa['2031-03'].find(v => v.id === 'v1');
  assert.ok(v1, 'o vídeo editado no outro aparelho não pode sumir');
  assert.equal(v1.valor, 120);
});

test('editar vence apagar: editado aqui, apagado lá → o vídeo fica (editado)', () => {
  const b = base(), l = base(), r = base();
  l.videos.alfa['2031-03'][1].headline = 'Corte final';
  r.videos.alfa['2031-03'].splice(1, 1);
  const { merged } = mergeState(b, l, r);
  const v2 = merged.videos.alfa['2031-03'].find(v => v.id === 'v2');
  assert.ok(v2);
  assert.equal(v2.headline, 'Corte final');
});

test('apagado num lado e intocado no outro: some mesmo', () => {
  const b = base(), l = base(), r = base();
  l.videos.alfa['2031-03'].splice(0, 1);
  const { merged } = mergeState(b, l, r);
  assert.deepEqual(merged.videos.alfa['2031-03'].map(v => v.id), ['v2']);
});

test('vídeos novos nos dois aparelhos: entram os dois, nenhum duplicado', () => {
  const b = base(), l = base(), r = base();
  l.videos.alfa['2031-03'].push({ id: 'vL', headline: 'do Mac', data: '2031-03-05', valor: 50 });
  r.videos.alfa['2031-03'].push({ id: 'vR', headline: 'do celular', data: '2031-03-05', valor: 50 });
  const { merged, conflitos } = mergeState(b, l, r);
  const ids = merged.videos.alfa['2031-03'].map(v => v.id);
  assert.deepEqual([...ids].sort(), ['v1', 'v2', 'vL', 'vR']);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(conflitos.length, 0);
});

test('ids duplicados numa lista (backup antigo): nenhum item é engolido', () => {
  const b = base();
  b.videos.alfa['2031-03'].push({ id: 'v1', headline: 'gêmeo', data: '2031-03-09', valor: 30 });
  const l = copia(b), r = copia(b);
  r.meiLimiteAnual = 85000; // mudança qualquer do outro lado
  const { merged } = mergeState(b, l, r);
  assert.equal(merged.videos.alfa['2031-03'].length, 3);
  assert.equal(merged.videos.alfa['2031-03'].filter(v => v.id === 'v1').length, 2);
  assert.equal(merged.meiLimiteAnual, 85000);
});

test('ids duplicados numa lista mudada nos dois lados: fica a lista daqui inteira e a de lá vai pros conflitos', () => {
  const b = base();
  b.videos.alfa['2031-03'].push({ id: 'v1', headline: 'gêmeo', data: '2031-03-09', valor: 30 });
  const l = copia(b), r = copia(b);
  l.videos.alfa['2031-03'][0].valor = 60;
  r.videos.alfa['2031-03'][1].valor = 70;
  const { merged, conflitos } = mergeState(b, l, r);
  assert.deepEqual(merged.videos.alfa['2031-03'], l.videos.alfa['2031-03']);
  assert.equal(conflitos.length, 1);
  assert.deepEqual(conflitos[0].remoto, r.videos.alfa['2031-03']);
});

test('cliente apagado aqui com vídeo novo lançado lá: o cliente volta junto com os vídeos', () => {
  const b = base(), l = base(), r = base();
  l.clients = l.clients.filter(c => c.id !== 'alfa');
  l.clientOrder = ['beta'];
  delete l.videos.alfa;
  r.videos.alfa['2031-03'].push({ id: 'v9', headline: 'novo', data: '2031-03-10', valor: 50 });
  const { merged } = mergeState(b, l, r);
  assert.ok(merged.videos.alfa['2031-03'].some(v => v.id === 'v9'), 'o vídeo novo fica');
  assert.ok(merged.clients.some(c => c.id === 'alfa'), 'o cliente volta, senão o vídeo ficaria invisível');
  assert.ok(merged.clientOrder.includes('alfa'));
});

test('cliente apagado aqui e nada mudado lá: continua apagado', () => {
  const b = base(), l = base(), r = base();
  l.clients = l.clients.filter(c => c.id !== 'alfa');
  l.clientOrder = ['beta'];
  delete l.videos.alfa;
  const { merged } = mergeState(b, l, r);
  assert.ok(!merged.clients.some(c => c.id === 'alfa'));
  assert.equal(merged.videos.alfa, undefined);
});

test('listas simples (ordem dos clientes) juntam como conjunto', () => {
  const b = base(), l = base(), r = base();
  l.clientOrder.push('gama'); r.clientOrder.push('delta');
  const { merged } = mergeState(b, l, r);
  assert.deepEqual([...merged.clientOrder].sort(), ['alfa', 'beta', 'delta', 'gama']);
});

test('mescla não mexe nos objetos de entrada', () => {
  const b = base(), l = base(), r = base();
  l.videos.alfa['2031-03'][0].valor = 75;
  r.videos.alfa['2031-03'].push({ id: 'v3', headline: 'x', data: '2031-03-04', valor: 1 });
  const b0 = copia(b), l0 = copia(l), r0 = copia(r);
  mergeState(b, l, r);
  assert.deepEqual(b, b0); assert.deepEqual(l, l0); assert.deepEqual(r, r0);
});

/* ---------- nota que muda de gaveta (ano) ---------- */
function moverNota(s, id, de, para, novaData){
  const i = s.notas[de].findIndex(n => n.id === id);
  const [n] = s.notas[de].splice(i, 1);
  if(novaData) n.data = novaData;
  if(!s.notas[para]) s.notas[para] = [];
  s.notas[para].push(n);
}

test('nota movida de ano aqui, nada mudado lá: uma vez só, no ano novo', () => {
  const b = base(), l = base(), r = base();
  moverNota(l, 'n2', '2031', '2032', '2032-01-05');
  const { merged, conflitos } = mergeState(b, l, r);
  assert.equal(vezesDaNota(merged, 'n2'), 1);
  assert.equal(merged.notas['2032'][0].id, 'n2');
  assert.equal(merged.notas['2032'][0].data, '2032-01-05');
  assert.equal(conflitos.length, 0);
});

test('nota movida de ano lá, nada mudado aqui: uma vez só, no ano novo', () => {
  const b = base(), l = base(), r = base();
  moverNota(r, 'n2', '2031', '2032', '2032-01-05');
  const { merged } = mergeState(b, l, r);
  assert.equal(vezesDaNota(merged, 'n2'), 1);
  assert.ok(merged.notas['2032'].some(n => n.id === 'n2'));
});

test('nota movida de ano aqui e EDITADA lá: não duplica, não some, junta as duas mudanças', () => {
  const b = base(), l = base(), r = base();
  moverNota(l, 'n2', '2031', '2032', '2032-01-05');
  r.notas['2031'].find(n => n.id === 'n2').valor = 450;
  const { merged, conflitos } = mergeState(b, l, r);
  assert.equal(vezesDaNota(merged, 'n2'), 1, 'a mesma nota não pode contar duas vezes no limite');
  const n = merged.notas['2032'].find(x => x.id === 'n2');
  assert.ok(n, 'fica na gaveta do ano novo');
  assert.equal(n.data, '2032-01-05');
  assert.equal(n.valor, 450);
  assert.equal(conflitos.length, 0);
  assert.equal(merged.fechamentos.beta['2031-12'].notaId, 'n2', 'o fechamento continua apontando pra ela');
  assert.equal(todasAsNotas(merged).length, 2, 'as outras notas seguem lá');
});

test('nota EDITADA aqui e movida de ano lá: não duplica, vai pro ano novo com a edição daqui', () => {
  const b = base(), l = base(), r = base();
  l.notas['2031'].find(n => n.id === 'n2').empresa = 'BETA MÍDIA LTDA';
  moverNota(r, 'n2', '2031', '2032', '2032-01-05');
  const { merged, conflitos } = mergeState(b, l, r);
  assert.equal(vezesDaNota(merged, 'n2'), 1);
  const n = merged.notas['2032'].find(x => x.id === 'n2');
  assert.ok(n);
  assert.equal(n.empresa, 'BETA MÍDIA LTDA');
  assert.equal(n.data, '2032-01-05');
  assert.equal(conflitos.length, 0);
});

test('nota movida pra anos DIFERENTES nos dois aparelhos: uma só, no ano daqui, e a versão de lá vai pros conflitos', () => {
  const b = base(), l = base(), r = base();
  moverNota(l, 'n2', '2031', '2032', '2032-01-05');
  moverNota(r, 'n2', '2031', '2030', '2030-12-30');
  const { merged, conflitos } = mergeState(b, l, r);
  assert.equal(vezesDaNota(merged, 'n2'), 1);
  assert.equal(merged.notas['2032'].find(x => x.id === 'n2').data, '2032-01-05');
  assert.ok(!(merged.notas['2030'] || []).some(x => x.id === 'n2'));
  assert.equal(conflitos.length, 1);
  assert.equal(conflitos[0].remoto, '2030-12-30');
});

test('nota movida de ano aqui e APAGADA lá: fica (uma vez) — mexer vence apagar', () => {
  const b = base(), l = base(), r = base();
  moverNota(l, 'n2', '2031', '2032', '2032-01-05');
  r.notas['2031'] = r.notas['2031'].filter(n => n.id !== 'n2');
  const { merged } = mergeState(b, l, r);
  assert.equal(vezesDaNota(merged, 'n2'), 1);
  assert.ok(merged.notas['2032'].some(n => n.id === 'n2'));
});

test('nota movida pro MESMO ano nos dois aparelhos: uma vez só', () => {
  const b = base(), l = base(), r = base();
  moverNota(l, 'n2', '2031', '2032', '2032-01-05');
  moverNota(r, 'n2', '2031', '2032', '2032-01-05');
  const { merged, conflitos } = mergeState(b, l, r);
  assert.equal(vezesDaNota(merged, 'n2'), 1);
  assert.equal(conflitos.length, 0);
});

test('notas com o mesmo id em dois anos que JÁ existiam antes (backup antigo): ninguém é apagado', () => {
  const b = base();
  b.notas['2032'].push({ id: 'n1', empresa: 'OUTRA EMPRESA', data: '2032-02-01', valor: 999 });
  const l = copia(b), r = copia(b);
  r.notas['2031'].find(n => n.id === 'n1').valor = 150;
  const { merged } = mergeState(b, l, r);
  assert.equal(vezesDaNota(merged, 'n1'), 2);
  assert.equal(merged.notas['2032'].find(n => n.id === 'n1').valor, 999);
  assert.equal(merged.notas['2031'].find(n => n.id === 'n1').valor, 150);
});

test('soma das notas depois de uma troca de gaveta com edição do outro lado: nada conta em dobro', () => {
  const b = base(), l = base(), r = base();
  moverNota(l, 'n2', '2031', '2032', '2032-01-05');
  r.notas['2031'].find(n => n.id === 'n2').valor = 450;
  const { merged } = mergeState(b, l, r);
  const soma = ano => (merged.notas[ano] || []).reduce((s, n) => s + n.valor, 0);
  assert.equal(soma('2031'), 100);
  assert.equal(soma('2032'), 450);
});

/* ---------- diffState / deepEq / pareceEstado ---------- */
test('diffState: lista o que mudou, com o caminho do item', () => {
  const a = base(), d = base();
  d.videos.alfa['2031-03'][0].valor = 80;
  d.videos.alfa['2031-03'].push({ id: 'v3', headline: 'novo', data: '2031-03-04', valor: 50 });
  d.notas['2031'].splice(0, 1);
  const mud = diffState(a, d);
  const por = Object.fromEntries(mud.map(m => [m.path, m]));
  assert.equal(mud.length, 3);
  assert.equal(por['/videos/alfa/2031-03/#v1'].antes.valor, 50);
  assert.equal(por['/videos/alfa/2031-03/#v1'].depois.valor, 80);
  assert.equal(por['/videos/alfa/2031-03/#v3'].antes, undefined);
  assert.equal(por['/notas/2031/#n1'].depois, undefined);
});

test('diffState: estados iguais (mesmo com as chaves em outra ordem) = nada mudou', () => {
  const a = base();
  const d = { orcamentos: [], fechamentos: a.fechamentos, metas: a.metas, notasYears: a.notasYears, notas: a.notas,
    videos: a.videos, clientOrder: a.clientOrder, clients: a.clients, meiLimiteAnual: 81000, business: { cnpj: '', nomeFantasia: 'Estúdio Exemplo' } };
  assert.deepEqual(diffState(a, d), []);
});

test('diffState: a troca de gaveta de uma nota aparece como saída de um ano e entrada no outro', () => {
  const a = base(), d = base();
  moverNota(d, 'n2', '2031', '2032', '2032-01-05');
  const caminhos = diffState(a, d).map(m => m.path).sort();
  assert.deepEqual(caminhos, ['/notas/2031/#n2', '/notas/2032', '/notas/2032/#n2'].sort());
});

test('diffState: sem "antes" (primeira gravação) não quebra', () => {
  assert.ok(diffState(null, base()).length > 0);
});

test('deepEq ignora a ordem das chaves, mas não a dos itens', () => {
  assert.ok(deepEq({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 }));
  assert.ok(!deepEq({ a: [1, 2] }, { a: [2, 1] }));
  assert.ok(!deepEq({ a: 1 }, { a: 1, b: undefined }));
  assert.ok(!deepEq(null, {}));
});

test('pareceEstado: só aceita o que tem cara de dados do Ritmo', () => {
  assert.ok(pareceEstado(base()));
  assert.ok(pareceEstado({ clients: [], business: {} }));
  assert.ok(!pareceEstado(null));
  assert.ok(!pareceEstado([]));
  assert.ok(!pareceEstado('texto'));
  assert.ok(!pareceEstado({}));
  assert.ok(!pareceEstado({ clients: [] }));
  assert.ok(!pareceEstado({ business: {} }));
  assert.ok(!pareceEstado({ clients: {}, business: {} }), 'clients tem que ser lista');
  assert.ok(!pareceEstado({ clients: [], business: [] }), 'business tem que ser objeto');
  assert.ok(!pareceEstado({ clients: 'x', business: 'y' }), 'o teste antigo (só "existe") deixava isto passar');
});
