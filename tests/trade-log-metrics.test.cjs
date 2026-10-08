const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-log-metrics.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderLogMetrics\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function render({rows = [], incompleteCount = 0, metrics, target = {innerHTML: 'before'}} = {}) {
  const calls = [];
  const context = vm.createContext({
    rows,
    incompleteCount,
    document: {getElementById(id) { calls.push(['target', id]); return target; }},
    calcMetrics(value) { calls.push(['metrics', value]); return metrics; },
    fR(value) { calls.push(['money', value]); return `F:${value}`; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderLogMetrics' : modulePath});
  vm.runInContext('renderLogMetrics(rows,incompleteCount)', context);
  return {target, calls};
}

test('missing log metrics target returns before reading or calculating rows', () => {
  const rows = new Proxy([], {get() { throw new Error('rows accessed'); }});
  const {calls} = render({rows, target: null});
  assert.deepEqual(calls, [['target', 'logMetrics']]);
});

test('log metrics preserve cards, signed result, win rate and average risk', () => {
  const rows = [{riskUsd: 10}, {riskUsd: null}, {riskUsd: 0}, {}, {riskUsd: -5}];
  const metrics = {closed: [{}, {}, {}], totalPnl: 25.5, wr: 2 / 3, wins: [{}, {}], losses: [{}]};
  const before = JSON.stringify(rows);
  const {target, calls} = render({rows, metrics});
  assert.match(target.innerHTML, /metric-card c-blue[^]*Registros filtrados[^]*>5<[^]*3 trades fechados/);
  assert.match(target.innerHTML, /metric-card c-green[^]*P\/L filtrado[^]*>\+F:25\.5<[^]*resultado do filtro atual/);
  assert.match(target.innerHTML, /metric-card c-yellow[^]*Win rate[^]*>66\.7%<[^]*2 wins · 1 losses/);
  assert.match(target.innerHTML, /metric-card c-purple[^]*Controle[^]*>F:1\.6666666666666667<[^]*risco médio por operação/);
  assert.deepEqual(calls, [
    ['target', 'logMetrics'],
    ['metrics', rows],
    ['money', 25.5],
    ['money', 5 / 3],
  ]);
  assert.equal(JSON.stringify(rows), before);
});

test('incomplete count preserves danger control without formatting average risk', () => {
  const rows = [{riskUsd: 10}];
  const metrics = {closed: [], totalPnl: -7, wr: 0, wins: [], losses: []};
  const {target, calls} = render({rows, incompleteCount: 2, metrics});
  assert.match(target.innerHTML, /metric-card c-red[^]*Controle[^]*>2 incompletos<[^]*pedem revisão/);
  assert.match(target.innerHTML, /P\/L filtrado[^]*>F:-7</);
  assert.deepEqual(calls.filter(call => call[0] === 'money'), [['money', -7]]);
});
