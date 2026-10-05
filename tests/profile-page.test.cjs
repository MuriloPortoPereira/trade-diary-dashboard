const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const profilePath = 'src/modules/profile/presentation/profile-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacyDeclaration = appSource.match(/^function renderProfilePage\([^]*?^\}/m)?.[0];
const extracted = fs.existsSync(path.join(root, profilePath));
const source = extracted ? fs.readFileSync(path.join(root, profilePath), 'utf8') : legacyDeclaration;
assert.ok(source, 'renderProfilePage must remain available');

function createHarness({elements = ['profileHero', 'profileRiskPanel', 'profileTags'], metrics, risk} = {}) {
  const calls = [];
  const nodes = Object.fromEntries(elements.map(id => [id, {innerHTML: ''}]));
  const account = {id: 'account-1', name: 'A<&', type: 'cfd_pct'};
  const trades = [{id: 'trade-1'}];
  const config = {strategies: ['S<&'], emotions: ['E<&'], markets: ['M<&']};
  const alerts = [0, 1, 2, 3, 4].map(id => ({id}));
  const sandbox = {
    document: {getElementById(id) { calls.push(['getElementById', id]); return nodes[id] ?? null; }},
    activeAccountId: 'account-1', config,
    getActiveAccount() { calls.push(['getActiveAccount']); return account; },
    getAccountTrades(id) { calls.push(['getAccountTrades', id]); return trades; },
    calcMetrics(rows, id) { calls.push(['calcMetrics', rows, id]); return metrics ?? {totalPnl: 12.5, exp: 0.375, pf: Infinity}; },
    calcAccountRiskState(acct, rows) { calls.push(['calcAccountRiskState', acct, rows]); return risk ?? {
      goalProgress: 0.534, riskSub: 'Risco <alto>', riskLabel: 'Padrão <1>',
      dayUsage: 0.7, dayLimit: 20, totalUsage: 0.699, currentDdPct: 0.042, totalLimit: 100,
    }; },
    escapeHtml(value) { calls.push(['escapeHtml', value]); return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;'); },
    acctTypeLabel(type) { calls.push(['acctTypeLabel', type]); return 'Conta <CFD>'; },
    fR(value) { calls.push(['fR', value]); return `R:${value}`; },
    buildOperationalAlerts(acct, rows) { calls.push(['buildOperationalAlerts', acct, rows]); return alerts; },
    renderStatusList(...args) { calls.push(['renderStatusList', ...args]); },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: extracted ? profilePath : 'app.js (profile declaration)'});
  return {calls, nodes, account, trades, config, context};
}

test('profile renders account metrics, risk thresholds and escaped tag groups', () => {
  const {calls, nodes, account, trades, config, context} = createHarness();
  assert.equal(vm.runInContext('renderProfilePage()', context), undefined);
  assert.match(nodes.profileHero.innerHTML, /A&lt;&amp;/);
  assert.match(nodes.profileHero.innerHTML, /Conta &lt;CFD&gt;|Conta &lt;CFD>/);
  assert.match(nodes.profileHero.innerHTML, /\+R:12\.5/);
  assert.match(nodes.profileHero.innerHTML, /\+0\.375R/);
  assert.match(nodes.profileHero.innerHTML, /<strong>∞<\/strong>/);
  assert.match(nodes.profileHero.innerHTML, /<strong>53%<\/strong>/);
  assert.match(nodes.profileRiskPanel.innerHTML, /status-item warn/);
  assert.match(nodes.profileRiskPanel.innerHTML, /status-item safe/);
  assert.match(nodes.profileRiskPanel.innerHTML, /4\.20%/);
  assert.match(nodes.profileTags.innerHTML, /S&lt;&amp;/);
  assert.match(nodes.profileTags.innerHTML, /E&lt;&amp;/);
  assert.match(nodes.profileTags.innerHTML, /M&lt;&amp;/);
  assert.deepEqual(calls.slice(0, 4), [
    ['getActiveAccount'], ['getAccountTrades', 'account-1'],
    ['calcMetrics', trades, 'account-1'], ['calcAccountRiskState', account, trades],
  ]);
  const status = calls.find(call => call[0] === 'renderStatusList');
  assert.equal(status[1], 'profileFocus');
  assert.deepEqual(Array.from(status[2], item => item.id), [0, 1, 2, 3]);
  assert.deepEqual(config, {strategies: ['S<&'], emotions: ['E<&'], markets: ['M<&']});
});

test('profile still computes alerts when optional targets are absent', () => {
  const {calls, context} = createHarness({elements: [], metrics: {totalPnl: -2, exp: -0.2, pf: 1}, risk: {
    goalProgress: 0, riskSub: '', riskLabel: '', dayUsage: 0, dayLimit: 0,
    totalUsage: 0, currentDdPct: 0, totalLimit: 0,
  }});
  vm.runInContext('renderProfilePage()', context);
  assert.deepEqual(calls.filter(call => call[0] === 'getElementById').map(call => call[1]),
    ['profileHero', 'profileRiskPanel', 'profileTags']);
  assert.equal(calls.filter(call => call[0] === 'renderStatusList').length, 1);
  assert.equal(calls.some(call => call[0] === 'fR'), false);
});

test('extracted profile stays a synchronous classic script before app.js', () => {
  if (!extracted) return;
  assert.ok(!legacyDeclaration, 'legacy declaration must be moved');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map(match => ({attributes: match[1], src: match[1].match(/\bsrc="([^"]+)"/)?.[1]}))
    .filter(script => script.src && !script.src.startsWith('https://'));
  assert.equal(scripts.filter(script => script.src === profilePath).length, 1);
  const profileIndex = scripts.findIndex(script => script.src === profilePath);
  assert.equal(scripts[profileIndex + 1].src, 'app.js');
  assert.doesNotMatch(scripts[profileIndex].attributes, /\b(?:async|defer|type="module")\b/i);
});
