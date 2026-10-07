const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/accounts/presentation/risk-setup-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderSetup\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

const fieldIds = [
  'cfg-balance', 'cfg-goal', 'cfg-risk', 'cfg-dd-daily', 'cfg-dd-weekly',
  'cfg-dd-monthly', 'cfg-dd', 'cfg-tf', 'cfg-mult', 'cfg-sym-default', 'setup-flow-date',
];

function render({account = null, config = {}, values = {}, missing = []} = {}) {
  const nodes = Object.fromEntries(fieldIds
    .filter(id => !missing.includes(id))
    .map(id => [id, {value: Object.hasOwn(values, id) ? values[id] : 'before'}]));
  const calls = [];
  class FixedDate {
    toISOString() { return '2026-10-07T12:00:00.000Z'; }
  }
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['target', id]); return nodes[id] ?? null; }},
    getActiveAccount() { calls.push(['account']); return account; },
    config,
    Date: FixedDate,
    renderSetupRiskSummary() { calls.push(['risk-summary']); },
    renderSetupCashflowList() { calls.push(['cashflow-list']); },
    renderTags(type) { calls.push(['tags', type]); },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderSetup' : modulePath});
  vm.runInContext('renderSetup()', context);
  return {nodes, calls};
}

test('account values take precedence while zero values and an existing date are preserved', () => {
  const account = {
    balance: 0, goalPct: 0, risk: 0, ddDaily: 0, ddWeekly: 0,
    ddMonthly: 0, ddTotal: 0,
  };
  const config = {balance: 1000, goal: 10, risk: 1, ddDaily: 2, ddWeekly: 5, ddMonthly: 8, dd: 10, tf: 'M5', mult: 0, symDefault: ''};
  const {nodes, calls} = render({account, config, values: {'setup-flow-date': '2026-10-01'}});
  for (const id of ['cfg-balance', 'cfg-goal', 'cfg-risk', 'cfg-dd-daily', 'cfg-dd-weekly', 'cfg-dd-monthly', 'cfg-dd']) {
    assert.equal(nodes[id].value, 0);
  }
  assert.equal(nodes['cfg-tf'].value, 'M5');
  assert.equal(nodes['cfg-mult'].value, '');
  assert.equal(nodes['cfg-sym-default'].value, '');
  assert.equal(nodes['setup-flow-date'].value, '2026-10-01');
  assert.deepEqual(calls.filter(call => !['target', 'account'].includes(call[0])), [
    ['risk-summary'], ['cashflow-list'], ['tags', 'strategy'], ['tags', 'emotion'], ['tags', 'market'],
  ]);
});

test('missing account uses config and legacy defaults and initializes an empty date', () => {
  const config = {balance: 500, risk: 2, dd: 0, tf: 'H1', mult: 3, symDefault: 'WIN'};
  const {nodes} = render({config, values: {'setup-flow-date': ''}});
  assert.equal(nodes['cfg-balance'].value, 500);
  assert.equal(nodes['cfg-goal'].value, 10);
  assert.equal(nodes['cfg-risk'].value, 2);
  assert.equal(nodes['cfg-dd-daily'].value, 2);
  assert.equal(nodes['cfg-dd-weekly'].value, 5);
  assert.equal(nodes['cfg-dd-monthly'].value, 8);
  assert.equal(nodes['cfg-dd'].value, 10);
  assert.equal(nodes['cfg-tf'].value, 'H1');
  assert.equal(nodes['cfg-mult'].value, 3);
  assert.equal(nodes['cfg-sym-default'].value, 'WIN');
  assert.equal(nodes['setup-flow-date'].value, '2026-10-07');
});

test('null values and missing fields stay untouched without skipping downstream renderers', () => {
  const {nodes, calls} = render({
    config: {balance: null, goal: null, risk: null, tf: null},
    missing: ['cfg-dd-weekly', 'setup-flow-date'],
  });
  assert.equal(nodes['cfg-balance'].value, 'before');
  assert.equal(nodes['cfg-risk'].value, 'before');
  assert.equal(nodes['cfg-tf'].value, 'before');
  assert.equal(calls.filter(call => call[0] === 'risk-summary').length, 1);
  assert.equal(calls.filter(call => call[0] === 'cashflow-list').length, 1);
  assert.deepEqual(calls.filter(call => call[0] === 'tags').map(call => call[1]), ['strategy', 'emotion', 'market']);
});

test('risk setup page loads once after its components and before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/modules/accounts/presentation/setup-risk-summary.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf('src/modules/accounts/presentation/setup-cashflow-list.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
