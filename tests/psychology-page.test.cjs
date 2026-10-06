const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/psychology/presentation/psychology-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacyDeclaration = appSource.match(/^function renderPsych\([^]*?^\}/m)?.[0];
const extracted = fs.existsSync(path.join(root, modulePath));
const source = extracted ? fs.readFileSync(path.join(root, modulePath), 'utf8') : legacyDeclaration;
assert.ok(source, 'renderPsych must remain available');

function createHarness({trades = [], visible} = {}) {
  const ids = visible ?? ['bestEmotion', 'bestEmotionWR', 'worstEmotion', 'worstEmotionWR',
    'followedPlanRate', 'avgDisc', 'psychTbody'];
  const nodes = Object.fromEntries(ids.map(id => [id, {textContent: 'before', innerHTML: 'before'}]));
  const calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['node', id]); return nodes[id] ?? null; }},
    activeAccountId: 'account-a',
    getAccountTrades(id) { calls.push(['trades', id]); return trades; },
    getClosedTradesWithSubjectiveEmotion(rows) {
      calls.push(['emotions', rows.length]);
      return rows.filter(row => row.emotion);
    },
    getClosedTradesWithPlanTag(rows) {
      calls.push(['plans', rows.length]);
      return rows.filter(row => ['sim', 'parcial', 'nao'].includes(row.followedPlan));
    },
    mkChart(id, config) { calls.push(['chart', id, config]); },
    CHART_OPTS: {scales: {x: {grid: false}, y: {grid: true}}, plugins: {tooltip: {enabled: true}}},
  });
  vm.runInContext(source, context, {filename: extracted ? modulePath : 'app.js (psychology declaration)'});
  return {calls, context, nodes};
}

test('psychology renders emotion summaries, discipline, charts and table', () => {
  const trades = [
    {status: 'WIN', emotion: 'Confiante', r: 2, discipline: 90, followedPlan: 'sim'},
    {status: 'LOSS', emotion: 'Ansioso', r: -1, discipline: 50, followedPlan: 'nao'},
    {status: 'WIN', emotion: 'Ansioso', r: 1, discipline: 70, followedPlan: 'sim'},
    {status: 'BE', emotion: 'Neutro', r: 0, discipline: 80, followedPlan: 'parcial'},
    {status: 'OPEN', emotion: 'Ignorado', r: 5, discipline: 100, followedPlan: 'sim'},
  ];
  const {calls, context, nodes} = createHarness({trades});
  assert.equal(vm.runInContext('renderPsych()', context), undefined);
  assert.equal(nodes.bestEmotion.textContent, 'Confiante');
  assert.equal(nodes.bestEmotionWR.textContent, '100% win rate');
  assert.equal(nodes.worstEmotion.textContent, 'Ansioso');
  assert.equal(nodes.worstEmotionWR.textContent, '50% win rate');
  assert.equal(nodes.followedPlanRate.textContent, '50%');
  assert.equal(nodes.avgDisc.textContent, '73%');
  const charts = calls.filter(call => call[0] === 'chart');
  assert.equal(charts.length, 2);
  assert.deepEqual(charts.map(call => call[1]), ['emotionChart', 'discChart']);
  assert.deepEqual(Array.from(charts[0][2].data.labels), ['Confiante', 'Ansioso', 'Neutro']);
  assert.deepEqual(Array.from(charts[0][2].data.datasets[0].data), [100, 50, 0]);
  assert.deepEqual(Array.from(charts[1][2].data.datasets[0].data), [90, 50, 70, 80]);
  assert.equal((nodes.psychTbody.innerHTML.match(/<tr>/g) ?? []).length, 3);
  assert.match(nodes.psychTbody.innerHTML, /Confiante[\s\S]*100%[\s\S]*2\.00R[\s\S]*100%[\s\S]*90%/);
  assert.match(nodes.psychTbody.innerHTML, /Ansioso[\s\S]*50%[\s\S]*0\.00R[\s\S]*50%[\s\S]*60%/);
  assert.deepEqual(calls.slice(0, 3), [['trades', 'account-a'], ['emotions', 4], ['plans', 4]]);
});

test('empty psychology keeps neutral summaries and empty chart datasets', () => {
  const {calls, context, nodes} = createHarness();
  vm.runInContext('renderPsych()', context);
  assert.equal(nodes.bestEmotion.textContent, '—');
  assert.equal(nodes.bestEmotionWR.textContent, '');
  assert.equal(nodes.worstEmotion.textContent, '—');
  assert.equal(nodes.worstEmotionWR.textContent, '');
  assert.equal(nodes.followedPlanRate.textContent, '0%');
  assert.equal(nodes.avgDisc.textContent, '0%');
  assert.equal(nodes.psychTbody.innerHTML, '');
  const charts = calls.filter(call => call[0] === 'chart');
  assert.deepEqual(Array.from(charts[0][2].data.labels), []);
  assert.deepEqual(Array.from(charts[1][2].data.datasets[0].data), []);
});

test('optional summary nodes do not prevent charts and table rendering', () => {
  const trade = {status: 'WIN', emotion: 'Calmo', r: 1, discipline: 85, followedPlan: 'sim'};
  const {calls, context, nodes} = createHarness({trades: [trade], visible: ['psychTbody']});
  vm.runInContext('renderPsych()', context);
  assert.equal(calls.filter(call => call[0] === 'chart').length, 2);
  assert.match(nodes.psychTbody.innerHTML, /Calmo/);
});

test('extracted psychology renderer stays a synchronous classic script before app.js', () => {
  if (!extracted) return;
  assert.ok(!legacyDeclaration, 'legacy declaration must be moved');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map(match => ({attributes: match[1], src: match[1].match(/\bsrc="([^"]+)"/)?.[1]}))
    .filter(script => script.src && !script.src.startsWith('https://'));
  assert.equal(scripts.filter(script => script.src === modulePath).length, 1);
  const index = scripts.findIndex(script => script.src === modulePath);
  assert.equal(scripts[index + 1].src, 'src/modules/analytics/presentation/strategy-hub-page.js');
  assert.doesNotMatch(scripts[index].attributes, /\b(?:async|defer|type="module")\b/i);
});
