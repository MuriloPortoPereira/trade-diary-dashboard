const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/app/presentation/account-summary.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderTopbarAccount\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function render(account, visible = ['acctDot', 'acctPillName', 'acctPillType']) {
  const nodes = Object.fromEntries(visible.map(id => [id, {
    style: {background: 'before'},
    textContent: 'before',
  }]));
  const calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['target', id]); return nodes[id] ?? null; }},
    getActiveAccount() { calls.push(['account']); return account; },
    acctTypeLabel(value) { calls.push(['type', value]); return `TYPE:${value}`; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderTopbarAccount' : modulePath});
  vm.runInContext('renderTopbarAccount()', context);
  return {nodes, calls};
}

test('missing active account returns before accessing topbar elements', () => {
  const {calls} = render(null);
  assert.deepEqual(calls, [['account']]);
});

test('topbar account preserves color, raw name, type label and source object', () => {
  const account = {id: 'a', color: '#123456', name: 'Conta <Principal>', type: 'prop_pct'};
  const before = JSON.stringify(account);
  const {nodes, calls} = render(account);
  assert.equal(nodes.acctDot.style.background, '#123456');
  assert.equal(nodes.acctPillName.textContent, 'Conta <Principal>');
  assert.equal(nodes.acctPillType.textContent, 'TYPE:prop_pct');
  assert.deepEqual(calls.filter(call => call[0] === 'target').map(call => call[1]), ['acctDot', 'acctPillName', 'acctPillType']);
  assert.deepEqual(calls.filter(call => call[0] === 'type'), [['type', 'prop_pct']]);
  assert.equal(JSON.stringify(account), before);
});

test('topbar targets remain independently optional', () => {
  const account = {color: 'red', name: 'Conta', type: 'crypto'};
  const dotOnly = render(account, ['acctDot']);
  assert.equal(dotOnly.nodes.acctDot.style.background, 'red');
  assert.equal(dotOnly.calls.some(call => call[0] === 'type'), false);

  const typeOnly = render(account, ['acctPillType']);
  assert.equal(typeOnly.nodes.acctPillType.textContent, 'TYPE:crypto');
  assert.deepEqual(typeOnly.calls.filter(call => call[0] === 'type'), [['type', 'crypto']]);
});
