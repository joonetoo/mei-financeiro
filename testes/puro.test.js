// Testes das contas e regras do Ritmo (src/puro.js).
// Dados inventados — nada daqui é real. Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localISO, addDays, shiftYm, ymDiff, parseBRL, centavos, esc, initials, siglaDe,
  periodoFechado, periodoAberto, fechamentoPrevisto, metaDoMes, semanaDe, semanasDoMes,
  idDaCopia, rabichoSorteado, acharNota, ajustarGavetaDaNota, devolverNotaPraGaveta,
} from '../src/puro.js';

/* ---------- parseBRL ---------- */
test('parseBRL: jeito brasileiro de escrever dinheiro', () => {
  assert.equal(parseBRL('1.500,50'), 1500.5);
  assert.equal(parseBRL('50,00'), 50);
  assert.equal(parseBRL('R$ 1.234,56'), 1234.56);
  assert.equal(parseBRL('12,5'), 12.5);
});
test('parseBRL: "1.500" e "12.000" sem vírgula são milhar, não R$ 1,50', () => {
  assert.equal(parseBRL('1.500'), 1500);
  assert.equal(parseBRL('12.000'), 12000);
  assert.equal(parseBRL('1.234.567'), 1234567);
});
test('parseBRL: ponto que não é de milhar continua decimal', () => {
  assert.equal(parseBRL('1.5'), 1.5);
  assert.equal(parseBRL('40.50'), 40.5);
  assert.equal(parseBRL('1500.75'), 1500.75);
});
test('parseBRL: vazio, lixo e números prontos', () => {
  assert.equal(parseBRL(''), 0);
  assert.equal(parseBRL('   '), 0);
  assert.equal(parseBRL(null), 0);
  assert.equal(parseBRL(undefined), 0);
  assert.equal(parseBRL('abc'), 0);
  assert.equal(parseBRL(NaN), 0);
  assert.equal(parseBRL(42.5), 42.5);
  assert.equal(parseBRL(0), 0);
  assert.equal(parseBRL('-30,00'), -30);
});
test('centavos: tira a poeira da soma de valores quebrados', () => {
  assert.equal(centavos(0.1 + 0.2), 0.3);
  assert.equal(centavos(33.33 + 33.33 + 33.34), 100);
  assert.equal(centavos(1234.5), 1234.5);
  assert.equal(centavos(0), 0);
});

/* ---------- datas ---------- */
test('localISO usa o dia LOCAL (23h30 ainda é hoje)', () => {
  assert.equal(localISO(new Date(2031, 0, 5, 23, 30)), '2031-01-05');
  assert.equal(localISO(new Date(2031, 11, 31, 0, 0)), '2031-12-31');
});
test('addDays atravessa mês, ano e fevereiro bissexto', () => {
  assert.equal(addDays('2031-01-31', 1), '2031-02-01');
  assert.equal(addDays('2031-01-01', -1), '2030-12-31');
  assert.equal(addDays('2032-02-28', 1), '2032-02-29');
  assert.equal(addDays('2031-02-28', 1), '2031-03-01');
  assert.equal(addDays('2031-03-10', 0), '2031-03-10');
});
test('shiftYm: anda meses pra frente e pra trás, virando o ano', () => {
  assert.equal(shiftYm('2031-12', 1), '2032-01');
  assert.equal(shiftYm('2031-01', -1), '2030-12');
  assert.equal(shiftYm('2031-05', 0), '2031-05');
  assert.equal(shiftYm('2031-03', 12), '2032-03');
  assert.equal(shiftYm('2031-03', -15), '2029-12');
});
test('ymDiff: quantos meses de distância', () => {
  assert.equal(ymDiff('2032-01', '2031-12'), 1);
  assert.equal(ymDiff('2031-03', '2031-03'), 0);
  assert.equal(ymDiff('2030-11', '2031-02'), -3);
});

/* ---------- períodos de cobrança ---------- */
function estado(){
  return {
    clients: [
      { id: 'alfa', nome: 'ALFA FILMES', diaFechamento: 0 },
      { id: 'beta', nome: 'BETA MÍDIA', diaFechamento: 4 },
      { id: 'gama', nome: 'GAMA', diaFechamento: 31 },
    ],
    videos: {},
    fechamentos: {},
  };
}
test('periodoAberto: sem fechamento nem vídeo, é o mês atual', () => {
  assert.equal(periodoAberto(estado(), 'alfa', '2031-06'), '2031-06');
});
test('periodoAberto: sem fechamento, é o último mês com vídeo (até o atual)', () => {
  const s = estado();
  s.videos.alfa = { '2031-03': [{ id: 'v1' }], '2031-04': [{ id: 'v2' }], '2031-05': [], '2031-09': [{ id: 'v3' }] };
  assert.equal(periodoAberto(s, 'alfa', '2031-06'), '2031-04', 'mês vazio e mês futuro não contam');
});
test('periodoAberto: com fechamento, é o mês seguinte ao último fechado', () => {
  const s = estado();
  s.videos.alfa = { '2031-03': [{ id: 'v1' }] };
  s.fechamentos.alfa = { '2031-03': { data: '2031-03-31', notaId: 'n1', valor: 100 }, '2031-04': { data: '2031-04-30', notaId: 'n2', valor: 50 } };
  assert.equal(periodoAberto(s, 'alfa', '2031-04'), '2031-05');
});
test('periodoAberto: período reaberto não conta como fechado', () => {
  const s = estado();
  s.fechamentos.alfa = { '2031-03': { data: '2031-03-31', notaId: 'n1', valor: 100 }, '2031-04': { aberto: true, notaId: 'n2' } };
  assert.ok(periodoFechado(s, 'alfa', '2031-03'));
  assert.ok(!periodoFechado(s, 'alfa', '2031-04'));
  assert.equal(periodoAberto(s, 'alfa', '2031-06'), '2031-04');
});
test('periodoAberto: fechou dezembro → abre janeiro do ano seguinte', () => {
  const s = estado();
  s.fechamentos.alfa = { '2031-12': { data: '2032-01-02', notaId: 'n1', valor: 100 } };
  assert.equal(periodoAberto(s, 'alfa', '2032-01'), '2032-01');
});
test('fechamentoPrevisto: dia 0 = último dia do próprio mês', () => {
  const s = estado();
  assert.equal(fechamentoPrevisto(s, 'alfa', '2031-02'), '2031-02-28');
  assert.equal(fechamentoPrevisto(s, 'alfa', '2032-02'), '2032-02-29');
  assert.equal(fechamentoPrevisto(s, 'alfa', '2031-12'), '2031-12-31');
});
test('fechamentoPrevisto: dia N = dia N do mês seguinte (virando o ano)', () => {
  const s = estado();
  assert.equal(fechamentoPrevisto(s, 'beta', '2031-09'), '2031-10-04');
  assert.equal(fechamentoPrevisto(s, 'beta', '2031-12'), '2032-01-04');
});
test('fechamentoPrevisto: dia maior que o mês seguinte tem → último dia dele', () => {
  const s = estado();
  assert.equal(fechamentoPrevisto(s, 'gama', '2031-01'), '2031-02-28');
  assert.equal(fechamentoPrevisto(s, 'gama', '2031-03'), '2031-04-30');
});
test('fechamentoPrevisto: cliente que não existe cai no último dia do mês', () => {
  assert.equal(fechamentoPrevisto(estado(), 'nao-existe', '2031-04'), '2031-04-30');
});

/* ---------- meta do mês ---------- */
test('metaDoMes: a do próprio mês; sem ela, herda a do último mês anterior', () => {
  const metas = { '2031-03': 6000, '2031-06': '7.500', '2031-08': 0 };
  assert.equal(metaDoMes(metas, '2031-03'), 6000);
  assert.equal(metaDoMes(metas, '2031-04'), 6000);
  assert.equal(metaDoMes(metas, '2031-05'), 6000);
  assert.equal(metaDoMes(metas, '2031-06'), 7500);
  assert.equal(metaDoMes(metas, '2031-07'), 7500);
});
test('metaDoMes: zero = mês sem meta (e os seguintes herdam o zero)', () => {
  const metas = { '2031-06': 7500, '2031-08': 0 };
  assert.equal(metaDoMes(metas, '2031-08'), 0);
  assert.equal(metaDoMes(metas, '2031-09'), 0);
});
test('metaDoMes: antes da primeira meta, ou sem metas, é zero', () => {
  assert.equal(metaDoMes({ '2031-03': 6000 }, '2031-02'), 0);
  assert.equal(metaDoMes({}, '2031-02'), 0);
  assert.equal(metaDoMes(undefined, '2031-02'), 0);
});
test('metaDoMes: herda atravessando o ano', () => {
  assert.equal(metaDoMes({ '2031-11': 8000 }, '2032-01'), 8000);
});

/* ---------- semanas, segunda a domingo ---------- */
test('semanaDe: segunda é o dia 0 e domingo o dia 6', () => {
  // 2031-09-01 é uma segunda-feira
  assert.equal(new Date(2031, 8, 1).getDay(), 1, 'calendário do teste');
  assert.deepEqual(semanaDe('2031-09-01'), { idx: 0, seg: '2031-09-01', dom: '2031-09-07' });
  assert.deepEqual(semanaDe('2031-09-07'), { idx: 6, seg: '2031-09-01', dom: '2031-09-07' });
  assert.deepEqual(semanaDe('2031-09-10'), { idx: 2, seg: '2031-09-08', dom: '2031-09-14' });
});
test('semanaDe: semana que atravessa a virada do mês e do ano', () => {
  // 2031-10-01 é quarta: a semana começa em 29/09
  assert.deepEqual(semanaDe('2031-10-01'), { idx: 2, seg: '2031-09-29', dom: '2031-10-05' });
  // 2032-01-01 é quinta: a semana começa em 29/12/2031
  assert.deepEqual(semanaDe('2032-01-01'), { idx: 3, seg: '2031-12-29', dom: '2032-01-04' });
});
test('semanasDoMes: mês que começa na segunda', () => {
  const s = semanasDoMes('2031-09', {});
  assert.deepEqual(s.map(w => [w.ini, w.fim]), [[1, 7], [8, 14], [15, 21], [22, 28], [29, 30]]);
});
test('semanasDoMes: semanas cortadas na virada do mês (começo e fim)', () => {
  // outubro/2031 começa numa quarta e termina numa sexta
  const s = semanasDoMes('2031-10', {});
  assert.deepEqual(s.map(w => [w.ini, w.fim]), [[1, 5], [6, 12], [13, 19], [20, 26], [27, 31]]);
});
test('semanasDoMes: mês que começa no domingo tem uma "semana" de um dia só', () => {
  // junho/2031 começa num domingo
  assert.equal(new Date(2031, 5, 1).getDay(), 0, 'calendário do teste');
  const s = semanasDoMes('2031-06', {});
  assert.deepEqual([s[0].ini, s[0].fim], [1, 1]);
  assert.deepEqual([s[1].ini, s[1].fim], [2, 8]);
});
test('semanasDoMes: todo dia do mês cai em exatamente uma semana, inclusive fevereiro bissexto', () => {
  for(const ym of ['2031-02', '2032-02', '2031-06', '2031-10', '2031-12']){
    const s = semanasDoMes(ym, {});
    const dias = s.flatMap(w => Array.from({ length: w.fim - w.ini + 1 }, (_, i) => w.ini + i));
    const dim = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)), 0).getDate();
    assert.deepEqual(dias, Array.from({ length: dim }, (_, i) => i + 1), ym);
  }
});
test('semanasDoMes: a soma das semanas bate com o total do mês, e o mês vizinho fica de fora', () => {
  const porData = {
    '2031-09-30': { v: 999, n: 9 }, // setembro: não entra
    '2031-10-01': { v: 100, n: 2 },
    '2031-10-05': { v: 50, n: 1 },
    '2031-10-06': { v: 40, n: 1 },
    '2031-10-31': { v: 10.5, n: 1 },
    '2031-11-01': { v: 777, n: 7 }, // novembro: não entra
  };
  const s = semanasDoMes('2031-10', porData);
  assert.deepEqual(s.map(w => w.v), [150, 40, 0, 0, 10.5]);
  assert.deepEqual(s.map(w => w.n), [3, 1, 0, 0, 1]);
  assert.equal(s.reduce((t, w) => t + w.v, 0), 200.5);
});

/* ---------- sigla da bolinha ---------- */
test('initials: duas palavras = duas iniciais; uma palavra = duas primeiras letras', () => {
  assert.equal(initials('Alfa Filmes'), 'AF');
  assert.equal(initials('gama'), 'GA');
  assert.equal(initials('  Beta   Mídia  Digital '), 'BM');
  assert.equal(initials(''), '?');
  assert.equal(initials(undefined), '?');
});
test('siglaDe: sem repetição, usa as iniciais', () => {
  const cs = [{ id: 'a', nome: 'ALFA FILMES' }, { id: 'b', nome: 'BETA MÍDIA' }];
  assert.equal(siglaDe(cs, 'a'), 'AF');
  assert.equal(siglaDe(cs, 'b'), 'BM');
});
test('siglaDe: dois clientes com a mesma sigla passam a usar as 2 primeiras letras do 1º nome', () => {
  const cs = [{ id: 'a', nome: 'NORTE SOCIAL' }, { id: 'b', nome: 'NUVEM STUDIO' }, { id: 'c', nome: 'ALFA FILMES' }];
  assert.equal(siglaDe(cs, 'a'), 'NO');
  assert.equal(siglaDe(cs, 'b'), 'NU');
  assert.equal(siglaDe(cs, 'c'), 'AF');
});
test('siglaDe: se nem as 2 primeiras letras separam, fica nas iniciais', () => {
  const cs = [{ id: 'a', nome: 'NORTE SOCIAL' }, { id: 'b', nome: 'NOVA SERRA' }];
  assert.equal(siglaDe(cs, 'a'), 'NS');
  assert.equal(siglaDe(cs, 'b'), 'NS');
});
test('siglaDe: cliente que não existe = "?"', () => {
  assert.equal(siglaDe([{ id: 'a', nome: 'ALFA' }], 'zzz'), '?');
  assert.equal(siglaDe([], 'zzz'), '?');
});

/* ---------- esc ---------- */
test('esc: troca tudo que poderia virar código na tela, inclusive aspas simples', () => {
  assert.equal(esc(`<img src=x onerror="alert('oi')">&`), '&lt;img src=x onerror=&quot;alert(&#39;oi&#39;)&quot;&gt;&amp;');
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(12), '12');
  assert.equal(esc('v_abc123_x9k2p'), 'v_abc123_x9k2p', 'um id normal sai igual');
});

/* ---------- nome das cópias de segurança ---------- */
test('idDaCopia: começa por <chave>-conflito-AAAA-MM-DD-HHMMSS e termina no rabicho', () => {
  const id = idDaCopia('linha-de-teste', new Date(2031, 2, 9, 7, 5, 3), 'k3x9');
  assert.equal(id, 'linha-de-teste-conflito-2031-03-09-070503-k3x9');
});
test('idDaCopia: duas cópias no mesmo segundo não caem na mesma linha', () => {
  const d = new Date(2031, 2, 9, 7, 5, 3);
  const ids = new Set(Array.from({ length: 200 }, () => idDaCopia('linha-de-teste', d, rabichoSorteado())));
  assert.ok(ids.size >= 199, 'com 4 letras/números sorteados, repetir em 200 é raríssimo');
  for(const id of ids) assert.match(id, /^linha-de-teste-conflito-2031-03-09-070503-[a-z0-9]{4}$/);
});

/* ---------- nota que troca de gaveta (ano) ---------- */
function comNotas(){
  return {
    notas: {
      '2031': [
        { id: 'n1', empresa: 'ALFA', data: '2031-03-31', valor: 100 },
        { id: 'n2', empresa: 'BETA', data: '2031-12-20', valor: 400 },
        { id: 'n3', empresa: 'GAMA', data: null, valor: 70 },
      ],
      '2032': [{ id: 'n9', empresa: 'DELTA', data: '2032-01-02', valor: 10 }],
    },
    notasYears: ['2031', '2032'],
    fechamentos: { beta: { '2031-12': { data: '2031-12-20', notaId: 'n2', valor: 400 } } },
  };
}
const soma = (s, ano) => (s.notas[ano] || []).reduce((t, n) => t + n.valor, 0);
const todas = s => Object.values(s.notas).flat();

test('nota: data mudou dentro do mesmo ano → não sai da gaveta', () => {
  const s = comNotas();
  s.notas['2031'][1].data = '2031-12-28';
  assert.equal(ajustarGavetaDaNota(s, 'n2', '2031-12-20'), null);
  assert.deepEqual(s, (() => { const o = comNotas(); o.notas['2031'][1].data = '2031-12-28'; return o; })());
});
test('nota: data passou pro ano seguinte → a MESMA nota vai pra gaveta do ano novo', () => {
  const s = comNotas();
  const nota = s.notas['2031'][1];
  nota.data = '2032-01-05';
  const mov = ajustarGavetaDaNota(s, 'n2', '2031-12-20');
  assert.deepEqual(mov, { de: '2031', para: '2032', idx: 1 });
  assert.equal(todas(s).filter(n => n.id === 'n2').length, 1, 'não duplica');
  assert.equal(todas(s).length, 4, 'nenhuma nota some');
  assert.equal(acharNota(s.notas, 'n2').year, '2032');
  assert.equal(acharNota(s.notas, 'n2').nota, nota, 'é o mesmo objeto, com o mesmo id');
  assert.equal(soma(s, '2031'), 170, 'sai do limite do ano antigo');
  assert.equal(soma(s, '2032'), 410, 'entra no limite do ano novo');
  assert.equal(acharNota(s.notas, s.fechamentos.beta['2031-12'].notaId).nota, nota, 'o fechamento continua achando a nota');
});
test('nota: ano que ainda não tinha gaveta → cria a gaveta e põe o ano na lista', () => {
  const s = comNotas();
  s.notas['2031'][0].data = '2029-07-01';
  const mov = ajustarGavetaDaNota(s, 'n1', '2031-03-31');
  assert.deepEqual(mov, { de: '2031', para: '2029', idx: 0 });
  assert.deepEqual(s.notas['2029'].map(n => n.id), ['n1']);
  assert.deepEqual(s.notasYears, ['2029', '2031', '2032']);
});
test('nota sem data que ganha uma data de outro ano → vai pro ano da data; do mesmo ano → fica', () => {
  const s = comNotas();
  s.notas['2031'][2].data = '2031-05-05';
  assert.equal(ajustarGavetaDaNota(s, 'n3', null), null);
  s.notas['2031'][2].data = '2032-05-05';
  assert.deepEqual(ajustarGavetaDaNota(s, 'n3', '2031-05-05'), { de: '2031', para: '2032', idx: 2 });
});
test('nota: tirar a data ("sem data") não muda a gaveta', () => {
  const s = comNotas();
  s.notas['2031'][1].data = null;
  assert.equal(ajustarGavetaDaNota(s, 'n2', '2031-12-20'), null);
  assert.equal(acharNota(s.notas, 'n2').year, '2031');
});
test('nota guardada num ano diferente do da data (dado antigo): só mexer no dia, sem mudar o ano da data, não move', () => {
  const s = comNotas();
  s.notas['2031'].push({ id: 'n7', empresa: 'ANTIGA', data: '2032-01-10', valor: 5 });
  s.notas['2031'][3].data = '2032-01-11';
  assert.equal(ajustarGavetaDaNota(s, 'n7', '2032-01-10'), null);
  assert.equal(acharNota(s.notas, 'n7').year, '2031');
});
test('nota: id que não existe ou data torta → não faz nada', () => {
  const s = comNotas();
  assert.equal(ajustarGavetaDaNota(s, 'nao-existe', null), null);
  s.notas['2031'][0].data = 'amanhã';
  assert.equal(ajustarGavetaDaNota(s, 'n1', '2031-03-31'), null);
  assert.equal(todas(s).length, 4);
});
test('nota: desfazer devolve pra gaveta original, no mesmo lugar', () => {
  const s = comNotas();
  const antes = JSON.parse(JSON.stringify(s));
  const nota = s.notas['2031'][1];
  const dataAntes = nota.data;
  nota.data = '2032-01-05';
  const mov = ajustarGavetaDaNota(s, 'n2', dataAntes);
  // desfazer: volta a data e a gaveta
  nota.data = dataAntes;
  assert.equal(devolverNotaPraGaveta(s, 'n2', mov), true);
  assert.deepEqual(s, antes, 'fica exatamente como era');
});
test('nota: fechar de novo em outro ano e desfazer (valor + data + gaveta voltam)', () => {
  const s = comNotas();
  const antes = JSON.parse(JSON.stringify(s));
  const nota = acharNota(s.notas, 'n2').nota;
  const { valor, data } = nota;
  nota.valor = 455.5; nota.data = '2032-01-03'; // "já emiti a nota" de novo, depois da virada
  const mov = ajustarGavetaDaNota(s, 'n2', data);
  assert.equal(acharNota(s.notas, 'n2').year, '2032');
  assert.equal(soma(s, '2031'), 170);
  const n = acharNota(s.notas, 'n2');
  n.nota.valor = valor; n.nota.data = data;
  devolverNotaPraGaveta(s, 'n2', mov);
  assert.deepEqual(s, antes);
});
test('nota: desfazer sem ter movido (mov nulo) não mexe em nada', () => {
  const s = comNotas();
  const antes = JSON.parse(JSON.stringify(s));
  assert.equal(devolverNotaPraGaveta(s, 'n2', null), false);
  assert.deepEqual(s, antes);
});
test('acharNota: acha em qualquer ano; id vazio ou inexistente = null', () => {
  const s = comNotas();
  assert.deepEqual({ year: acharNota(s.notas, 'n9').year, idx: acharNota(s.notas, 'n9').idx }, { year: '2032', idx: 0 });
  assert.equal(acharNota(s.notas, ''), null);
  assert.equal(acharNota(s.notas, 'x'), null);
  assert.equal(acharNota(undefined, 'n1'), null);
});

test('nota com id repetido em duas gavetas nao e movida', () => {
  const s = { notas: { '2031': [{ id: 'd1', data: '2032-01-05', valor: 10 }], '2032': [{ id: 'd1', data: '2032-02-01', valor: 20 }] }, notasYears: ['2031', '2032'] };
  assert.equal(ajustarGavetaDaNota(s, 'd1', '2031-12-20'), null);
  assert.equal(s.notas['2031'].length, 1);
  assert.equal(s.notas['2032'].length, 1);
});

/* ---------- dias de trabalho (segunda a sexta) ---------- */
import { diasDeTrabalho } from '../src/puro.js';
test('diasDeTrabalho: novembro de 2026 tem 21 dias de segunda a sexta', () => {
  const d = diasDeTrabalho(2026, 11, 1);
  assert.equal(d.dim, 30);
  assert.equal(d.uteis, 21);
  assert.equal(d.uteisAPartir, 21);
  assert.equal(d.corridosAPartir, 30);
  assert.equal(d.uteisAntes, 0);
});
test('diasDeTrabalho: contando a partir de um domingo (15/11/2026)', () => {
  const d = diasDeTrabalho(2026, 11, 15);
  assert.equal(d.corridosAPartir, 16);   // 15 a 30
  assert.equal(d.uteisAPartir, 11);      // 16-20, 23-27, 30
  assert.equal(d.uteisAntes, 10);        // 2-6, 9-13
});
test('diasDeTrabalho: contando a partir de uma sexta inclui a propria sexta', () => {
  const d = diasDeTrabalho(2026, 11, 13);
  assert.equal(d.uteisAPartir, 12);      // 13, 16-20, 23-27, 30
  assert.equal(d.uteisAntes, 9);         // 2-6, 9-12
});
test('diasDeTrabalho: fevereiro de 2026 tem 20, e o ultimo dia num sabado da 0 uteis restantes', () => {
  assert.equal(diasDeTrabalho(2026, 2, 1).uteis, 20);
  const d = diasDeTrabalho(2026, 2, 28);
  assert.equal(d.uteisAPartir, 0);
  assert.equal(d.corridosAPartir, 1);
});
