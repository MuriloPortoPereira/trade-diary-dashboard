const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const modules = ['src/modules/accounts/presentation/account-form.js', 'src/modules/accounts/presentation/risk-setup-page.js'];
const names = ['selectAccount', 'saveAccount', 'deleteAccount', 'setupRiskNumber', 'readSetupRiskFormValues', 'applySetupRiskToActiveAccount', 'previewSetupRiskFromForm', 'addSetupCashflowToActiveAccount', 'addSetupCashflowFromForm', 'deleteSetupCashflow', 'addTag', 'removeTag', 'saveConfig'];
const candidates = [...modules.map(file => fs.readFileSync(path.join(root, file), 'utf8')), fs.readFileSync(path.join(root, 'app.js'), 'utf8')];
const source = names.map(name => {
  const matches = candidates.map(text => text.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))).filter(Boolean);
  assert.equal(matches.length, 1, name); return matches[0][0];
}).join('\n');
const plain = value => JSON.parse(JSON.stringify(value));
function setup() {
  const calls = [], nodes = {};
  const c = vm.createContext({accounts: [], trades: [{id: 'preserved', accountId: 'a'}], activeAccountId: 'a', editingAccountId: null, accountFormCashflows: [], config: {}, statsAccountPinned: true, _incompleteBannerDismissed: true,
    Date: class extends Date {static now() {return 123;}}, document: {getElementById: id => nodes[id] || null},
    normalizeAccountType(type) {calls.push(['type', type]); return type === 'legacy' ? 'cfd_pct' : type;}, normalizeAccount(account) {calls.push(['normalize', account]); return {...account, normalized: true};},
    getActiveAccount: () => c.accounts.find(a => a.id === c.activeAccountId) || null,
    getAccountTrades(id) {calls.push(['trades', id]); return c.trades.filter(t => t.accountId === id);},
    getAccountCashflows: account => account.cashflows || [],
    sanitizeAccountCashflow(flow) {calls.push(['sanitize', flow]); return Number(flow.amount) > 0 ? {...flow, amount: Number(flow.amount)} : null;},
    addAccountCashflow(id, flow) {calls.push(['add', id, flow]); return Number(flow.amount) > 0 ? {...flow, id: 'new-flow'} : null;},
    deleteAccountCashflow(id, flowId) {calls.push(['delete-flow', id, flowId]); return flowId !== 'failed';},
    fR: value => `money:${value}`, fDate: value => `date:${value}`,
    ensureDefaultStrategies(value) {calls.push('defaults'); return value;}, tagConfigKey: type => `${type}s`, normalizeStrategyName: value => value.trim().toLowerCase(),
    showAppNotice(...args) {calls.push(['notice', ...args]);}, showAppConfirm(...args) {calls.push(['confirm', ...args]);},
  });
  for (const name of ['save', 'updateTopbarStats', 'closeModal', 'renderTopbarAccount', 'refreshAll', 'renderAccountList', 'renderAccountsPage', 'renderSetupRiskSummary', 'renderSetupCashflowList', 'syncAccountBalanceChrome', 'renderTags']) c[name] = (...args) => calls.push([name, ...args]);
  vm.runInContext(source, c);
  const set = (id, value) => nodes[id] = {value, style: {display: 'block'}};
  return {c, calls, nodes, set};
}
test('selection sets legacy flags and preserves effect order even for an unknown id', () => {
  const {c, calls} = setup(); assert.equal(c.selectAccount('missing'), undefined);
  assert.equal(c.activeAccountId, 'missing'); assert.equal(c.statsAccountPinned, false); assert.equal(c._incompleteBannerDismissed, false);
  assert.deepEqual(calls, [['save'], ['updateTopbarStats'], ['closeModal', 'accountModal'], ['renderTopbarAccount'], ['refreshAll']]);
});
test('account save validates, normalizes types and legacy defaults, and clones form cashflows', () => {
  const {c, calls, set, nodes} = setup(); c.saveAccount(); assert.equal(calls.at(-1)[0], 'notice'); assert.equal(c.accounts.length, 0);
  calls.length = 0; set('af-name', '  Principal  '); set('af-type', 'legacy'); set('af-risk', '0'); set('af-balance', '-10'); set('af-goal-week', '2.5'); set('accountForm', '');
  c.accountFormCashflows = [{id: 'f', amount: 8}];
  assert.equal(c.saveAccount(), undefined);
  const account = c.accounts[0]; assert.equal(account.name, 'Principal'); assert.equal(account.id, 'a123'); assert.equal(account.type, 'cfd_pct'); assert.equal(account.normalized, true);
  assert.equal(account.balance, -10); assert.equal(account.risk, 1); assert.equal(account.mult, 1); assert.equal(account.ddDaily, 2); assert.equal(account.ddWeekly, 5); assert.equal(account.ddMonthly, 8); assert.equal(account.ddTotal, 10); assert.equal(account.goalPct, 10); assert.equal(account.goalWeek, 2.5); assert.equal(account.goalMonth, 0); assert.equal(account.goalTotal, 0);
  assert.notEqual(account.cashflows[0], c.accountFormCashflows[0]); assert.equal(nodes.accountForm.style.display, 'none');
  assert.deepEqual(calls.slice(2).map(call => call[0]), ['save', 'renderAccountList', 'updateTopbarStats', 'renderTopbarAccount', 'renderAccountsPage', 'notice']);
  c.editingAccountId = 'a123'; set('af-name', 'Edited'); c.saveAccount(); assert.equal(c.accounts.length, 1); assert.equal(c.accounts[0].name, 'Edited');
  c.editingAccountId = 'missing'; c.saveAccount(); assert.equal(c.accounts.length, 1);
});
test('account deletion blocks the final account and defers removal while retaining trades', () => {
  const {c, calls} = setup(); c.accounts = [{id: 'a'}]; c.deleteAccount('a'); assert.equal(calls.at(-1)[0], 'notice');
  c.accounts.push({id: 'b'}); c.deleteAccount('a'); const confirm = calls.at(-1); assert.equal(confirm[0], 'confirm'); assert.equal(c.accounts.length, 2);
  assert.deepEqual(plain(confirm[4]), {danger: true, confirmText: 'Excluir'}); confirm[3](); assert.equal(c.activeAccountId, 'b'); assert.deepEqual(plain(c.accounts), [{id: 'b'}]); assert.equal(c.trades.length, 1);
  assert.deepEqual(calls.slice(-4), [['save'], ['renderAccountList'], ['renderTopbarAccount'], ['renderAccountsPage']]);
});
test('risk parsing retains zero, permissive numeric prefixes, defaults and account/config synchronization', () => {
  const {c} = setup();
  for (const [value, expected] of [['0', 0], ['2.5x', 2.5], ['-1', 9], ['', 9], [Infinity, 9], [null, 9]]) assert.equal(c.setupRiskNumber(value, 9), expected);
  assert.deepEqual(plain(c.applySetupRiskToActiveAccount()), {balance: 1000, risk: 1, ddDaily: 2, ddWeekly: 5, ddMonthly: 8, ddTotal: 10, goalPct: 10});
  c.accounts = [{id: 'a', balance: 70, risk: 3, extra: true}]; c.config.risk = 99;
  const account = c.applySetupRiskToActiveAccount({balance: '0', risk: '-1', ddDaily: '4', goal: '12', ddTotal: '0'});
  assert.equal(account, c.accounts[0]); assert.equal(account.balance, 0); assert.equal(account.risk, 3); assert.equal(account.goalPct, 12); assert.equal(account.ddTotal, 0); assert.equal(account.extra, true); assert.equal(c.config.risk, 3); assert.equal(c.config.goal, 12); assert.equal(c.config.dd, 0);
});
test('form reading and preview preserve missing fields and exact projection order', () => {
  const {c, calls, set} = setup(); set('cfg-balance', '300'); set('cfg-risk', '0');
  assert.deepEqual(plain(c.readSetupRiskFormValues()), {balance: '300', goalPct: '', risk: '0', ddDaily: '', ddWeekly: '', ddMonthly: '', ddTotal: ''});
  c.accounts = [{id: 'a'}]; c.previewSetupRiskFromForm(); assert.equal(c.accounts[0].balance, 300);
  assert.deepEqual(calls.map(call => call[0]), ['renderSetupRiskSummary', 'trades', 'syncAccountBalanceChrome', 'updateTopbarStats']);
  assert.deepEqual(plain(calls.at(-1)[1]), {fit: false});
  c.accounts = []; calls.length = 0; c.previewSetupRiskFromForm(); assert.equal(calls[0][0], 'renderSetupRiskSummary'); assert.equal(calls[1][1], undefined);
});
test('cashflow addition returns missing/invalid guards and projects successful entry without an extra save', () => {
  const {c, calls} = setup(); assert.equal(c.addSetupCashflowToActiveAccount({amount: 1}), null); assert.deepEqual(calls, []);
  c.accounts = [{id: 'a'}]; assert.equal(c.addSetupCashflowToActiveAccount({amount: 0}), null); assert.deepEqual(calls.map(call => call[0]), ['add']);
  calls.length = 0; const result = c.addSetupCashflowToActiveAccount({amount: 3}); assert.equal(result.id, 'new-flow');
  assert.deepEqual(calls.map(call => call[0]), ['add', 'renderSetupRiskSummary', 'renderSetupCashflowList', 'trades', 'syncAccountBalanceChrome', 'updateTopbarStats']);
});
test('cashflow form validates before confirmation and clears fields only after successful addition', () => {
  const {c, calls, nodes, set} = setup(); c.addSetupCashflowFromForm(); assert.equal(calls.at(-1)[0], 'notice');
  set('setup-flow-type', 'withdrawal'); set('setup-flow-date', '2026-11-06'); set('setup-flow-amount', '25'); set('setup-flow-note', 'Fees'); c.addSetupCashflowFromForm();
  const confirm = calls.at(-1); assert.equal(confirm[1], 'Adicionar Retirada'); assert.match(confirm[2], /money:25[\s\S]*date:2026-11-06[\s\S]*Fees/); assert.deepEqual(plain(confirm[4]), {confirmText: 'Confirmar'});
  confirm[3](); assert.equal(calls.at(-1)[0], 'notice'); assert.equal(nodes['setup-flow-amount'].value, '25');
  c.accounts = [{id: 'a'}]; confirm[3](); assert.equal(nodes['setup-flow-amount'].value, ''); assert.equal(nodes['setup-flow-note'].value, ''); assert.equal(calls.at(-1)[0], 'refreshAll');
});
test('cashflow deletion captures account before confirmation and refreshes only on success', () => {
  const {c, calls} = setup(); c.deleteSetupCashflow('missing'); assert.deepEqual(calls, []);
  c.accounts = [{id: 'a', cashflows: [{id: 'flow', type: 'withdrawal', amount: 4}, {id: 'failed', amount: 1}]}]; c.deleteSetupCashflow('missing'); assert.deepEqual(calls, []);
  c.deleteSetupCashflow('flow'); const confirm = calls.at(-1); assert.match(confirm[2], /retirada de money:4/); c.activeAccountId = 'b'; confirm[3](); assert.deepEqual(calls.slice(-2), [['delete-flow', 'a', 'flow'], ['refreshAll']]);
  c.activeAccountId = 'a'; c.deleteSetupCashflow('failed'); const failed = calls.at(-1); failed[3](); assert.equal(calls.at(-1)[0], 'delete-flow');
});
test('tags preserve strategy normalization, case-sensitive other tags, and deferred removal', () => {
  const {c, calls, set, nodes} = setup(); c.addTag('emotion'); assert.deepEqual(calls, []);
  set('newEmotion', '  Calm  '); c.addTag('emotion'); assert.deepEqual(plain(c.config.emotions), ['Calm']); assert.equal(nodes.newEmotion.value, ''); assert.deepEqual(calls.slice(-2), [['save'], ['renderTags', 'emotion']]);
  set('newEmotion', 'Calm'); c.addTag('emotion'); assert.equal(calls.at(-1)[0], 'notice'); set('newEmotion', 'calm'); c.addTag('emotion'); assert.equal(c.config.emotions.length, 2);
  c.config.strategys = ['Setup']; set('newStrategy', ' setup '); c.addTag('strategy'); assert.equal(calls.at(-1)[0], 'notice'); assert.equal(c.config.strategys.length, 1);
  c.removeTag('emotion', 0); const confirm = calls.at(-1); assert.equal(c.config.emotions.length, 2); assert.deepEqual(plain(confirm[4]), {danger: true, confirmText: 'Remover'}); confirm[3](); assert.deepEqual(plain(c.config.emotions), ['calm']); assert.deepEqual(calls.slice(-2), [['save'], ['renderTags', 'emotion']]);
});
test('config save applies risk, preserves legacy mult fallbacks and orders persistence before refresh/notice', () => {
  const {c, calls, set} = setup(); c.config.mult = 4; c.accounts = [{id: 'a'}]; set('cfg-balance', '0'); set('cfg-mult', '0'); c.saveConfig();
  assert.equal(c.config.balance, 0); assert.equal(c.accounts[0].balance, 0); assert.equal(c.config.tf, '5M'); assert.equal(c.config.mult, 4); assert.equal(c.config.symDefault, '');
  assert.deepEqual(calls.map(call => call[0]), ['save', 'refreshAll', 'notice']);
  c.config.mult = 0; set('cfg-tf', 'H1'); set('cfg-sym-default', 'ES'); c.saveConfig(); assert.equal(c.config.mult, 0.2); assert.equal(c.config.tf, 'H1'); assert.equal(c.config.symDefault, 'ES');
});
