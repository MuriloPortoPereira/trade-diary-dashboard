const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/app/presentation/topbar-statistics.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacyDeclaration = appSource.match(/^function updateTopbarStats\([^]*?^\}/m)?.[0];
const source = legacyDeclaration ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function setup({trades, risk, account, missingSubs = []} = {}) {
  const defaultTrades = [
    {date: '2026-10-12', pnl: 100},
    {date: '2026-10-10', pnl: -20},
    {date: '2026-10-01', pnl: 50},
    {date: '2026-09-30', pnl: 999},
    {date: '', pnl: 500},
  ];
  const defaultRisk = {capitalBase: 1000, currentDdUsd: 25, currentDdPct: 0.025, goalTarget: 200, totalPnl: 50, currentBalance: 1050};
  const defaultAccount = {id: 'a1', goalPct: 10};
  const elements = Object.fromEntries(['tbWeekSub', 'tbMonthSub', 'tbDDSub', 'tbGoalSub']
    .filter(id => !missingSubs.includes(id)).map(id => [id, {textContent: ''}]));
  const calls = [];
  class FixedDate extends Date {
    constructor(value) { super(value === undefined ? '2026-10-14T12:00:00Z' : value); }
  }
  const selectedAccount = account ?? defaultAccount;
  const selectedTrades = trades ?? defaultTrades;
  const selectedRisk = risk ?? defaultRisk;
  const context = vm.createContext({
    Date: FixedDate,
    document: {getElementById: id => elements[id] ?? null},
    getActiveAccount: () => { calls.push(['account']); return selectedAccount; },
    getAccountTrades: id => { calls.push(['trades', id]); return selectedTrades; },
    calcAccountRiskState: (nextAccount, nextTrades) => { calls.push(['risk', nextAccount, nextTrades]); return selectedRisk; },
    formatSignedMoney: value => { calls.push(['signed', value]); return `signed:${value}`; },
    formatTopbarSignedPct: (value, digits) => { calls.push(['pct', value, digits]); return `pct:${value}:${digits}`; },
    fR: value => { calls.push(['money', value]); return `money:${value}`; },
    clamp: (value, min, max) => { calls.push(['clamp', value, min, max]); return Math.max(min, Math.min(max, value)); },
    topbarGoalPctLabel: value => { calls.push(['goalLabel', value]); return String(value); },
    setTopbarValue: (id, values, tone, base) => calls.push(['set', id, {...values}, tone, base]),
    fitTopbarDensity: () => calls.push(['fit']),
  });
  vm.runInContext(source, context, {filename: legacyDeclaration ? 'app.js#topbar-statistics' : modulePath});
  return {context, elements, calls, account: selectedAccount, trades: selectedTrades, risk: selectedRisk};
}

test('topbar statistics preserve weekly and monthly boundaries and projections', () => {
  const {context, elements, calls} = setup();
  context.updateTopbarStats();
  assert.equal(elements.tbWeekSub.textContent, 'pct:10:1');
  assert.equal(elements.tbMonthSub.textContent, 'pct:13:1');
  assert.equal(elements.tbDDSub.textContent, '2.5%');
  assert.equal(elements.tbGoalSub.textContent, 'money:50/money:200');
  assert.deepEqual(calls.filter(call => call[0] === 'signed'), [['signed', 100], ['signed', 130]]);
  assert.deepEqual(calls.filter(call => call[0] === 'set'), [
    ['set', 'tbWeek', {full: 'signed:100'}, 'g', undefined],
    ['set', 'tbMonth', {full: 'signed:130'}, 'g', undefined],
    ['set', 'tbDD', {full: 'money:25'}, 'r', undefined],
    ['set', 'tbGoal', {full: '25%'}, 'y', undefined],
    ['set', 'topBadge', {full: 'money:1050'}, 'green', 'tb-badge'],
  ]);
  assert.equal(calls.at(-1)[0], 'fit');
});

test('losses, zero capital and missing goal retain legacy tones and zero percentages', () => {
  const risk = {capitalBase: 0, currentDdUsd: 0, currentDdPct: 0, goalTarget: 0, totalPnl: -10, currentBalance: 990};
  const {context, elements, calls} = setup({trades: [{date: '2026-10-14', pnl: -5}], risk});
  context.updateTopbarStats();
  assert.equal(elements.tbWeekSub.textContent, 'pct:0:1');
  assert.equal(elements.tbMonthSub.textContent, 'pct:0:1');
  assert.equal(elements.tbGoalSub.textContent, 'money:0/money:0');
  assert.deepEqual(calls.filter(call => call[0] === 'set').map(call => [call[1], call[3]]), [
    ['tbWeek', 'r'], ['tbMonth', 'r'], ['tbDD', 'g'], ['tbGoal', 'y'], ['topBadge', 'red'],
  ]);

  const reachedRisk = {capitalBase: 1000, currentDdUsd: 0, currentDdPct: 0, goalTarget: 200, totalPnl: 250, currentBalance: 1250};
  const reached = setup({risk: reachedRisk});
  reached.context.updateTopbarStats();
  const goalCall = reached.calls.find(call => call[0] === 'set' && call[1] === 'tbGoal');
  assert.deepEqual(goalCall, ['set', 'tbGoal', {full: '100%'}, 'g', undefined]);
  assert.equal(reached.elements.tbGoalSub.textContent, 'money:250/money:200');
});

test('optional sub targets do not prevent main values or density fitting', () => {
  const {context, calls} = setup({missingSubs: ['tbWeekSub', 'tbMonthSub', 'tbDDSub', 'tbGoalSub']});
  context.updateTopbarStats();
  assert.equal(calls.filter(call => call[0] === 'set').length, 5);
  assert.equal(calls.at(-1)[0], 'fit');
});

test('fit false skips only the final density pass', () => {
  const {context, calls} = setup();
  context.updateTopbarStats({fit: false});
  assert.equal(calls.some(call => call[0] === 'fit'), false);
  assert.equal(calls.filter(call => call[0] === 'set').length, 5);
});

test('topbar statistics load once after shared topbar components and before account pages', () => {
  assert.equal(legacyDeclaration, undefined);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const valueIndex = scripts.findIndex(script => script.src === 'src/app/presentation/topbar-value.js');
  const summaryIndex = scripts.findIndex(script => script.src === 'src/app/presentation/account-summary.js');
  const statisticsIndex = scripts.findIndex(script => script.src === modulePath);
  const accountsIndex = scripts.findIndex(script => script.src === 'src/modules/accounts/presentation/accounts-page.js');
  const appIndex = scripts.findIndex(script => script.src === 'app.js');
  assert.ok(valueIndex < summaryIndex && summaryIndex < statisticsIndex && statisticsIndex < accountsIndex && accountsIndex < appIndex);
});
