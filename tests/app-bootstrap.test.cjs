const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/app/application/bootstrap-app.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^window\.addEventListener\('load',\(\)=>\{[^]*?^\}\);/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

class FixedDate extends Date {
  constructor(value) { super(value === undefined ? '2026-11-04T15:30:00.000Z' : value); }
}

function setup({trades = [], accounts = [], config = {}, activeAccountId = ''} = {}) {
  const calls = [];
  const listeners = {};
  const sandbox = {
    Date: FixedDate,
    trades,
    accounts,
    config,
    activeAccountId,
    window: {
      innerWidth: 1200,
      addEventListener(type, callback) { calls.push(['listen', type]); listeners[type] = callback; },
    },
    load: () => calls.push(['load']),
    loadSampleData: () => calls.push(['sample']),
    save: () => calls.push(['save']),
    normalizeAccount: account => { calls.push(['normalize', account.id]); return {...account, normalized: true}; },
    ensurePartnerHubConfig: value => { calls.push(['partner']); return {...value, partnerReady: true}; },
    toggleSidebar: value => calls.push(['sidebar', value]),
    fitTopbarDensity: () => calls.push(['fit']),
    syncCalPicker: () => calls.push(['calendar']),
    renderTopbarAccount: () => calls.push(['account']),
    updateTopbarStats: () => calls.push(['stats']),
    renderDashboard: () => calls.push(['dashboard']),
    updateIncompleteBanner: () => calls.push(['incomplete']),
    initLanguageSelector: () => calls.push(['language']),
    initCotacao: () => calls.push(['quote']),
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: legacy ? 'app.js#bootstrap' : modulePath});
  return {context, sandbox, calls, listeners};
}

test('empty state preserves sample loading, account and document seeds, and render order', () => {
  const {context, calls, listeners} = setup();
  assert.deepEqual(calls, [['listen', 'load']]);
  listeners.load();
  assert.equal(context.accounts.length, 1);
  assert.equal(context.accounts[0].id, 'default');
  assert.equal(context.accounts[0].normalized, true);
  assert.equal(context.config.generalDocs.length, 2);
  assert.deepEqual([...context.config.generalDocs.map(doc => doc.id)], ['playbook', 'risk-map']);
  assert.equal(context.config.generalDocs.every(doc => doc.updatedAt === '2026-11-04T15:30:00.000Z'), true);
  assert.equal(context.config.partnerReady, true);
  assert.equal(context.activeAccountId, 'default');
  assert.deepEqual(calls.map(call => call[0]), [
    'listen', 'load', 'sample', 'normalize', 'partner', 'listen',
    'calendar', 'account', 'stats', 'dashboard', 'incomplete', 'language', 'quote',
  ]);
  listeners.resize();
  assert.deepEqual(calls.slice(-2), [['sidebar', false], ['fit']]);
});

test('existing state saves, normalizes and removes only auto-created blank documents', () => {
  const docs = [
    {id: 'blank', title: '', content: ''},
    {id: 'custom', title: 'Custom', content: 'text'},
    {id: 'playbook', title: '', content: ''},
  ];
  const {context, calls, listeners} = setup({
    trades: [{id: 'trade'}],
    accounts: [{id: 'account-a', name: 'A'}],
    config: {generalDocs: docs},
    activeAccountId: 'account-a',
  });
  listeners.load();
  assert.equal(calls.some(call => call[0] === 'sample'), false);
  assert.equal(calls.some(call => call[0] === 'save'), true);
  assert.deepEqual([...context.config.generalDocs.map(doc => doc.id)], ['custom', 'playbook']);
  assert.equal(context.activeAccountId, 'account-a');
  context.window.innerWidth = 900;
  listeners.resize();
  assert.deepEqual(calls.at(-1), ['fit']);
  assert.equal(calls.some(call => call[0] === 'sidebar'), false);
});

test('bootstrap remains one synchronous classic script before navigation and app.js', () => {
  if (legacy) return;
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/app/presentation/app-workspace.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
