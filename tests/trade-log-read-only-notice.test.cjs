const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-log-read-only-notice.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderLogReadOnlyNotice\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function render({accountFilter = 'active', lock, target = {style: {display: 'before'}, innerHTML: 'before'}} = {}) {
  const calls = [];
  const context = vm.createContext({
    inputFilter: accountFilter,
    document: {getElementById(id) { calls.push(['target', id]); return target; }},
    getLogAccountEditLock(options) { calls.push(['lock', options]); return lock; },
    escapeHtml(value) { calls.push(['escape', value]); return `escaped:${value}`; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderLogReadOnlyNotice' : modulePath});
  vm.runInContext('renderLogReadOnlyNotice(inputFilter)', context);
  return {target, calls: JSON.parse(JSON.stringify(calls))};
}

test('missing read-only notice returns before calculating the account lock', () => {
  const {calls} = render({target: null, lock: new Proxy({}, {get() { throw new Error('lock accessed'); }})});
  assert.deepEqual(calls, [['target', 'logReadOnlyNotice']]);
});

test('unlocked journal hides and clears the prior notice', () => {
  const lock = {locked: false};
  const {target, calls} = render({accountFilter: 'account-a', lock});
  assert.equal(target.style.display, 'none');
  assert.equal(target.innerHTML, '');
  assert.deepEqual(calls, [
    ['target', 'logReadOnlyNotice'],
    ['lock', {accountFilter: 'account-a', requireActivePage: false}],
  ]);
});

test('all-accounts lock preserves the shared guidance and escaped target', () => {
  const lock = {locked: true, allAccounts: true, accountName: 'ignored'};
  const before = JSON.stringify(lock);
  const {target, calls} = render({accountFilter: 'all', lock});
  assert.equal(target.style.display, 'block');
  assert.equal(target.innerHTML, '<div class="alert alert-info"><b>Modo visualização.</b> Você está consultando escaped:todas as contas. Escolha uma conta específica como conta ativa para adicionar, editar, duplicar ou excluir operações.</div>');
  assert.deepEqual(calls, [
    ['target', 'logReadOnlyNotice'],
    ['lock', {accountFilter: 'all', requireActivePage: false}],
    ['escape', 'todas as contas'],
  ]);
  assert.equal(JSON.stringify(lock), before);
});

test('specific-account lock escapes both guidance and consulted account text', () => {
  const lock = {locked: true, allAccounts: false, accountName: 'Conta <A>'};
  const {target, calls} = render({accountFilter: 'account-a', lock});
  assert.equal(target.style.display, 'block');
  assert.equal(target.innerHTML, '<div class="alert alert-info"><b>Modo visualização.</b> Você está consultando escaped:Conta <A>. Troque a conta ativa para escaped:Conta <A> antes de adicionar, editar, duplicar ou excluir operações.</div>');
  assert.deepEqual(calls, [
    ['target', 'logReadOnlyNotice'],
    ['lock', {accountFilter: 'account-a', requireActivePage: false}],
    ['escape', 'Conta <A>'],
    ['escape', 'Conta <A>'],
  ]);
});

test('read-only notice loads once as a synchronous classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/modules/trades/presentation/trade-images.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
