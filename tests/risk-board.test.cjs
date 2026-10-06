const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/accounts/presentation/risk-board.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderRiskBoard\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function render(overrides = {}, {missing, period = 'month', account = {risk: 1, ddDaily: 2, ddWeekly: 5, ddTotal: 10, goalPct: 10}} = {}) {
  const state = {
    riskLabel: '$10 / trade', currentBalance: 1000, capitalBase: 1000,
    dayPnl: 0, totalPnl: 0, weekPnl: 0, cicloAtual: 0, goalProgress: 0,
    riskPerTradeUsd: 10, dayUsage: 0, dayUsageRaw: 0, weekUsage: 0, weekUsageRaw: 0,
    totalUsage: 0, totalUsageRaw: 0, dayExcessUsd: 0, weekExcessUsd: 0, totalExcessUsd: 0,
    totalExcessPct: 0, dayLoss: 0, weekLoss: 0, dayLimit: 20, weekLimit: 50, totalLimit: 100,
    weekStartLabel: '01/02', weekEndLabel: '07/02', currentDdPct: 0, currentDdUsd: 0,
    ddBase: 1000, cicloBase: 1000, goalTarget: 100, pnlNoCiclo: 0, cicloAlvo: 1100,
    ...overrides,
  };
  const ids = ['riskIdealTrade', 'riskIdealTradeSub', 'riskProgress', 'riskSignals'];
  const nodes = Object.fromEntries(ids.filter(id => id !== missing).map(id => [id, {textContent: 'before', innerHTML: 'before'}]));
  if (period !== null) nodes.dashPeriod = {value: period};
  const trades = [{id: 'trade'}], calls = [];
  const context = vm.createContext({
    document: {getElementById: id => nodes[id] ?? null},
    calcAccountRiskState(acct, rows, selected) { assert.equal(acct, account); assert.equal(rows, trades); calls.push(selected); return state; },
    fR: value => `$${value.toFixed(2)}`, f2: value => value.toFixed(2),
    usageTone: usage => usage >= 1 ? 'danger' : usage >= 0.8 ? 'warn' : 'safe',
    TIPS: {stopSessao: 'session', stopSemana: 'week', ddTotal: 'dd', meta: 'goal'},
    mkTip: tip => `<tip>${tip}</tip>`, account, trades,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderRiskBoard(account, trades)', context), undefined);
  return {nodes, calls, state};
}

test('risk board renders mini stats, four ordered progress bars and neutral goal', () => {
  const {nodes, calls} = render();
  assert.deepEqual(calls, ['month']);
  assert.equal(nodes.riskIdealTrade.textContent, '$10 / trade');
  assert.match(nodes.riskIdealTradeSub.innerHTML, /Saldo atual[^]*\$1000\.00/);
  assert.match(nodes.riskIdealTradeSub.innerHTML, /1\.00% · \$10\.00/);
  const blocks = nodes.riskProgress.innerHTML.split('<div class="risk-progress-item">').slice(1);
  assert.equal(blocks.length, 4);
  for (const [i, name] of ['Stop da sessão', 'Stop da semana', 'Drawdown total', 'Meta da conta'].entries()) assert.match(blocks[i], new RegExp(name));
  assert.equal((nodes.riskProgress.innerHTML.match(/width:4%/g) ?? []).length, 4);
  assert.match(blocks[3], /risk-progress-value--neutral/);
  assert.match(nodes.riskSignals.innerHTML, /risk-alert-chip neutral/);
  assert.doesNotMatch(nodes.riskProgress.innerHTML, /EXCEDEU|ATINGIDA/);
});

test('excess losses preserve danger badges, raw percentages and uncapped widths', () => {
  const {nodes} = render({dayPnl: -30, totalPnl: -150, weekPnl: -60,
    dayExcessUsd: 10, weekExcessUsd: 10, totalExcessUsd: 50, totalExcessPct: 5,
    dayUsage: 1.5, dayUsageRaw: 1.6, weekUsage: 1.2, totalUsage: 1.5});
  const html = nodes.riskProgress.innerHTML;
  assert.equal((html.match(/EXCEDEU/g) ?? []).length, 3);
  assert.match(html, /160\.00% de 2\.00%/);
  assert.match(html, /width:150%/);
  assert.match(html, /Excedeu \$10\.00 \(1\.00%\)/);
  assert.equal((nodes.riskSignals.innerHTML.match(/risk-alert-chip danger/g) ?? []).length, 3);
  assert.match(nodes.riskIdealTradeSub.innerHTML, /var\(--red\)/);
});

test('signal warning thresholds are inclusive and negative week remains warning', () => {
  const low = render({totalUsage: 0.849, dayUsage: 0.799}).nodes.riskSignals.innerHTML;
  assert.equal((low.match(/risk-alert-chip safe/g) ?? []).length, 3);
  const high = render({totalUsage: 0.85, dayUsage: 0.8, weekPnl: -1}).nodes.riskSignals.innerHTML;
  assert.equal((high.match(/risk-alert-chip warn/g) ?? []).length, 3);
  assert.match(high, /DD em 85\.00%/);
  assert.match(high, /Sessão 80\.00%/);
});

test('achieved goal keeps cycle labels and clamps remaining target without clamping width', () => {
  const {nodes} = render({goalProgress: 1.2, pnlNoCiclo: 120, cicloAtual: 2});
  assert.match(nodes.riskProgress.innerHTML, /ATINGIDA/);
  assert.match(nodes.riskProgress.innerHTML, /Ciclo 3 · 120\.00% concluído/);
  assert.match(nodes.riskProgress.innerHTML, /width:120%/);
  assert.match(nodes.riskProgress.innerHTML, /Meta atingida · próximo alvo/);
  assert.match(nodes.riskSignals.innerHTML, /Meta do ciclo 3 atingida/);
});

test('zero bases and zero account limits keep legacy formatting defaults', () => {
  const {nodes, calls} = render({capitalBase: 0, ddBase: 0, cicloBase: 0}, {period: null, account: {risk: 0, ddDaily: 0, ddWeekly: 0, ddTotal: 0, goalPct: 0}});
  assert.deepEqual(calls, ['all']);
  assert.match(nodes.riskProgress.innerHTML, /\(—%\)/);
  assert.match(nodes.riskProgress.innerHTML, /0\.00% de 2\.00%/);
  assert.match(nodes.riskProgress.innerHTML, /0\.00% de 5\.00%/);
  assert.match(nodes.riskProgress.innerHTML, /0\.00% de 10\.00%/);
});

test('any missing required target returns before risk calculation or mutation', () => {
  for (const missing of ['riskIdealTrade', 'riskIdealTradeSub', 'riskProgress', 'riskSignals']) {
    const {nodes, calls} = render({}, {missing});
    assert.deepEqual(calls, []);
    for (const [id, node] of Object.entries(nodes)) if (id !== 'dashPeriod') assert.deepEqual(node, {textContent: 'before', innerHTML: 'before'});
  }
});
