const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/analytics/presentation/stop-fee-analysis.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderStopFeeAnalysis\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function render(overrides = {}, visible = true) {
  const analysis = {daysOverDailyStop: 0, daysOverDailyStopPct: 0, dayLimit: 20, days: 5,
    weeksOverWeeklyStop: 0, monthsOverMonthlyStop: 0, weekLimit: 50, monthLimit: 100,
    totalFees: 0, feesInR: 0, feePerTrade: 0, edgeRemovedPct: 0, feeDragPct: 0,
    expectancyBeforeFees: 10, expectancyAfterFees: 10, ...overrides};
  const account = {id: 'a'}, rows = [{id: 'trade-a'}], node = {innerHTML: 'before'}, calls = [], tips = [];
  const context = vm.createContext({
    document: {getElementById(id) { assert.equal(id, 'target'); return visible ? node : null; }},
    buildStopFeeAnalysis(acct, trades) { assert.equal(acct, account); assert.equal(trades, rows); calls.push('analysis'); return analysis; },
    fR: value => `$${value.toFixed(2)}`,
    mkTip(tip) { tips.push(tip); return `<tip>${tip}</tip>`; },
    account, rows,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderStopFeeAnalysis("target", account, rows)', context), undefined);
  return {html: node.innerHTML, calls, tips, analysis};
}

test('safe analysis renders four ordered cards, limits, fees and tooltips', () => {
  const {html, calls, tips} = render();
  assert.deepEqual(calls, ['analysis']);
  assert.equal((html.match(/class="risk-insight-item safe"/g) ?? []).length, 4);
  const labels = ['Dias acima do stop', 'Stops semana / mês', 'Taxas pagas', 'Edge removido'];
  assert.ok(labels.every((label, index) => index === 0 || html.indexOf(label) > html.indexOf(labels[index - 1])));
  assert.match(html, /Limite diário \$20\.00 · 5 dia\(s\) no período/);
  assert.match(html, /0S · 0M/);
  assert.match(html, /0\.00R consumidos/);
  assert.match(html, /aceitável/);
  assert.equal(tips.length, 4);
  assert.match(tips[0], /Dias acima do stop diário/);
  assert.match(tips[3], /Edge Removido pelas Taxas/);
});

test('breaches and fees preserve danger/warn tones and signed formatting', () => {
  const values = {daysOverDailyStop: 2, daysOverDailyStopPct: 40, weeksOverWeeklyStop: 1,
    monthsOverMonthlyStop: 2, totalFees: 12.5, feesInR: 0.625, feePerTrade: 2.5,
    edgeRemovedPct: 30, expectancyAfterFees: -2};
  const {html, analysis} = render(values);
  assert.match(html, /risk-insight-item danger/);
  assert.equal((html.match(/risk-insight-item warn/g) ?? []).length, 3);
  assert.match(html, /40% dos dias/);
  assert.match(html, /1S · 2M/);
  assert.match(html, /atingido/);
  assert.match(html, /0\.63R consumidos/);
  assert.match(html, /depois \$-2\.00/);
  assert.equal(analysis.feesInR, values.feesInR);
});

test('fee warning threshold is inclusive at 25 for either percentage', () => {
  for (const [edgeRemovedPct, feeDragPct, warning] of [[24.99,24.99,false],[25,0,true],[0,25,true]]) {
    const {html} = render({edgeRemovedPct, feeDragPct});
    const last = html.slice(html.lastIndexOf('<div class="risk-insight-item'));
    assert.match(last, warning ? /risk-insight-item warn/ : /risk-insight-item safe/);
    assert.match(last, warning ? /alto impacto/ : /aceitável/);
  }
  const {html} = render({expectancyBeforeFees: 0, edgeRemovedPct: 70, feeDragPct: 12});
  assert.match(html, /risk-insight-value">12%/);
});

test('missing target returns before calculating or formatting', () => {
  const {html, calls, tips} = render({}, false);
  assert.equal(html, 'before');
  assert.deepEqual(calls, []);
  assert.deepEqual(tips, []);
});

test('stop fee presentation loads once as a synchronous classic script before calendar', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/calendar/presentation/calendar-page.js'));
});
