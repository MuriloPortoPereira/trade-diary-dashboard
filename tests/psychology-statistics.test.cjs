const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/psychology/presentation/psychology-statistics.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderStatsPsych\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function harness(rows = [], {hesitationNode = true, buckets} = {}) {
  const ids = ['statPsychCards', 'statEmoBody'];
  if (hesitationNode) ids.push('statHesitationWrap');
  const nodes = Object.fromEntries(ids.map(id => [id, {innerHTML: ''}]));
  const calls = [], cards = [], charts = new Map(), summaries = new Map();
  const defaultBuckets = [
    {label: 'Alta', count: 2, winRatePct: 50, avgPnl: 10},
    {label: 'Baixa', count: 1, winRatePct: 0, avgPnl: -20},
    {label: 'Vazia', count: 0, winRatePct: 0, avgPnl: 0},
  ];
  const context = vm.createContext({
    document: {getElementById: id => nodes[id] ?? null},
    getStatsPeriodTrades() { calls.push('period'); return rows; },
    getClosedTradesWithSubjectiveEmotion(data) { calls.push(['emotion', data.length]); return data.filter(row => row.emotion); },
    getClosedTradesWithPlanTag(data) { calls.push(['plan', data.length]); return data.filter(row => ['sim', 'nao', 'parcial'].includes(row.followedPlan)); },
    buildHesitationStats(data) { assert.equal(data, rows); calls.push('hesitation'); return {
      total: data.filter(row => row.hesitation).length, wins: 1, losses: 1, potentialPnl: -15, winRatePct: 50, breakeven: 1, other: 0,
    }; },
    buildDisciplineBuckets(data) { calls.push(['buckets', data.length]); return buckets ?? defaultBuckets; },
    mkCard(card) { cards.push(card); return `<card>${card.val}</card>`; },
    mkChart(id, config) { charts.set(id, config); },
    renderAnalysisSummary(id, data) { summaries.set(id, data); },
    TIPS: {followedPlan: 'plan', discipline: 'discipline', hesitation: 'hesitation', errors: 'errors'},
    CHART_OPTS: {scales: {x: {ticks: {}}, y: {}}, plugins: {}},
    fR: value => `$${value.toFixed(2)}`, fDate: date => date,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderStatsPsych()', context), undefined);
  return {nodes, calls, cards, charts, summaries, context};
}

const rows = [
  {status: 'WIN', emotion: 'Calmo', followedPlan: 'sim', discipline: 90, hesitation: true, pnl: 20, r: 2, errors: ['pressa'], date: '2024-02-01', symbol: 'A'},
  {status: 'LOSS', emotion: 'Calmo', followedPlan: 'nao', discipline: 50, hesitation: true, pnl: -20, r: -1, errors: ['pressa', 'medo'], date: '2024-02-02', symbol: 'B'},
  {status: 'BE', emotion: 'Neutro', followedPlan: 'parcial', discipline: null, hesitation: false, pnl: 0, r: 0, date: '2024-02-03', symbol: 'C'},
  {status: 'WIN', emotion: 'Foco', followedPlan: '', discipline: 100, pnl: 10, r: 1, errors: [], date: '2024-02-04', symbol: 'D'},
  {status: 'OPEN', emotion: 'Ignorar', followedPlan: 'sim', discipline: 20, hesitation: true, pnl: 100, errors: ['aberto'], date: '2024-02-05', symbol: 'E'},
];

test('statistics preserves closed-trade denominators, cards and chart identities', () => {
  const {cards, charts, calls} = harness(rows);
  assert.deepEqual(calls, ['period', ['emotion', 4], ['plan', 4], 'hesitation', ['buckets', 4]]);
  assert.deepEqual(cards.map(card => card.val), ['33%', '80%', 3, 3]);
  assert.deepEqual([...charts.keys()], ['statEmoWRChart', 'statEmoPnlChart', 'statDiscWRChart', 'statErrorsChart', 'statPlanChart']);
  assert.deepEqual(Array.from(charts.get('statEmoWRChart').data.labels), ['Calmo', 'Neutro', 'Foco']);
  assert.deepEqual(Array.from(charts.get('statEmoWRChart').data.datasets[0].data), [50, 0, 100]);
  assert.deepEqual(Array.from(charts.get('statEmoPnlChart').data.datasets[0].data), [0, 0, 10]);
  assert.equal(charts.get('statDiscWRChart').data.datasets[1].type, 'line');
  assert.deepEqual(Array.from(charts.get('statErrorsChart').data.datasets[0].data), [2, 1]);
  assert.deepEqual(Array.from(charts.get('statPlanChart').data.datasets[0].data), [20, 0, -20, 10]);
});

test('discipline and plan summaries keep ranked buckets, counts and tones', () => {
  const {summaries} = harness(rows);
  const disc = summaries.get('statDiscSummary');
  assert.deepEqual(Array.from(disc).map(item => item?.label), ['Faixa forte', 'Faixa fraca', 'Maior amostra']);
  assert.deepEqual(Array.from(disc).map(item => item?.value), ['Alta', 'Baixa', 'Alta']);
  const plan = summaries.get('statPlanSummary');
  assert.deepEqual(Array.from(plan).map(item => item?.value), ['Sim', 'Não', '4 trades']);
  assert.deepEqual(Array.from(plan).map(item => item?.tone), ['safe', 'danger', 'info']);
});

test('hesitation block and table preserve chart data, five-row cap and optional target', () => {
  const {nodes} = harness(rows);
  const html = nodes.statHesitationWrap.innerHTML;
  assert.match(html, /WIN perdidos: <b[^]*>1<\/b>/);
  assert.match(html, /LOSS marcados: <b[^]*>1<\/b>/);
  assert.match(html, /\$-15\.00/);
  assert.match(html, /BE\/outros: <b>1<\/b>/);
  assert.equal((nodes.statEmoBody.innerHTML.match(/<tr>/g) ?? []).length, 3);
  assert.match(nodes.statEmoBody.innerHTML, /Calmo[^]*50%[^]*0\.00\$/);
  const absent = harness(rows, {hesitationNode: false});
  assert.equal(absent.charts.size, 5);
  assert.equal((absent.nodes.statEmoBody.innerHTML.match(/<tr>/g) ?? []).length, 3);
  const repeated = Array.from({length: 7}, (_, i) => ({status: 'WIN', emotion: 'Foco', followedPlan: 'sim', hesitation: true, date: '2024-02-01', symbol: `S${i}`}));
  assert.equal((harness(repeated).nodes.statHesitationWrap.innerHTML.match(/S\d/g) ?? []).length, 5);
});

test('empty data retains zero cards, empty chart data and absent rankings', () => {
  const {cards, charts, summaries, nodes} = harness([], {buckets: []});
  assert.deepEqual(cards.map(card => card.val), ['0%', '0%', 0, 0]);
  assert.deepEqual(Array.from(charts.get('statEmoWRChart').data.labels), []);
  assert.deepEqual(Array.from(summaries.get('statDiscSummary')).map(Boolean), [false, false, false]);
  assert.deepEqual(Array.from(summaries.get('statPlanSummary')).map(Boolean), [false, false, false]);
  assert.equal(nodes.statEmoBody.innerHTML, '');
});

test('error chart preserves top-ten cap and long-label truncation', () => {
  const many = [{status: 'WIN', errors: Array.from({length: 12}, (_, i) => `very-long-error-label-${i}`)}];
  const {charts} = harness(many);
  assert.equal(charts.get('statErrorsChart').data.labels.length, 10);
  assert.match(charts.get('statErrorsChart').data.labels[0], /…$/);
});

test('psychology statistics loads once as a synchronous classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
