const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-form-account-context.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['onAccountChange', 'updateMarketFromSymbol'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function setup({selectedId = 'a2', missing = [], futures = false, market = 'EUA'} = {}) {
  const elements = {
    't-account': {value: selectedId},
    't-riskpct': {value: ''},
    't-mult': {value: ''},
    modePercentFields: {style: {}},
    modeAbsFields: {style: {}},
    't-acct-info': {innerHTML: ''},
    't-symbol': {value: 'US30'},
    't-market': {value: 'old'},
  };
  for (const id of missing) delete elements[id];
  const accounts = [
    {id: 'a1', name: 'Principal', risk: 1, mult: 2, goalPct: 10},
    {id: 'a2', name: 'Secundária', risk: 0.5, mult: 0, goalPct: 20},
  ];
  const active = accounts[0];
  const calls = [];
  const risk = {currentBalance: 1234.5, cashflowNet: -50};
  const context = vm.createContext({
    accounts,
    document: {getElementById: id => elements[id] ?? null},
    getActiveAccount: () => { calls.push(['active']); return active; },
    isFuturesAccount: account => { calls.push(['futures', account.id]); return futures; },
    getAccountTrades: id => { calls.push(['trades', id]); return ['trade']; },
    calcAccountRiskState: (account, trades) => { calls.push(['risk', account.id, trades]); return risk; },
    fR: value => { calls.push(['format', value]); return `R$${value}`; },
    calcRR: () => calls.push(['rr']),
    getMarket: symbol => { calls.push(['market', symbol]); return market; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#trade-form-account-context' : modulePath});
  return {context, elements, calls, accounts, active, risk};
}

test('selected account projects risk, multiplier, field mode and formatted summary', () => {
  const {context, elements, calls} = setup();
  context.onAccountChange();
  assert.equal(elements['t-riskpct'].value, 0.5);
  assert.equal(elements['t-mult'].value, 1);
  assert.equal(elements.modePercentFields.style.display, '');
  assert.equal(elements.modeAbsFields.style.display, 'none');
  assert.equal(elements['t-acct-info'].innerHTML, '<span style="color:var(--muted)">Saldo: <b style="color:var(--text)">R$1234.5</b></span><br><span style="color:var(--muted)">Aportes líquidos: R$-50 · Meta: 20%</span>');
  assert.deepEqual(calls, [
    ['futures', 'a2'], ['futures', 'a2'], ['trades', 'a2'], ['risk', 'a2', ['trade']],
    ['format', 1234.5], ['format', -50], ['rr'],
  ]);
});

test('futures presentation swaps percent and absolute field visibility', () => {
  const {context, elements} = setup({futures: true});
  context.onAccountChange();
  assert.equal(elements.modePercentFields.style.display, 'none');
  assert.equal(elements.modeAbsFields.style.display, '');
});

test('unknown or missing selection falls back to the active account', () => {
  const unknown = setup({selectedId: 'missing'});
  unknown.context.onAccountChange();
  assert.equal(unknown.elements['t-riskpct'].value, 1);
  assert.equal(unknown.elements['t-mult'].value, 2);
  assert.deepEqual(unknown.calls.slice(0, 2), [['active'], ['futures', 'a1']]);
  const missing = setup({missing: ['t-account']});
  missing.context.onAccountChange();
  assert.equal(missing.elements['t-riskpct'].value, 1);
});

test('optional targets skip only their own projection and still recalculate RR', () => {
  const missing = ['t-riskpct', 't-mult', 'modePercentFields', 'modeAbsFields', 't-acct-info'];
  const {context, calls} = setup({missing});
  context.onAccountChange();
  assert.deepEqual(calls, [['rr']]);
});

test('symbol change preserves market lookup and conditional select update', () => {
  const present = setup({market: 'EUA'});
  present.context.updateMarketFromSymbol();
  assert.equal(present.elements['t-market'].value, 'EUA');
  assert.deepEqual(present.calls, [['market', 'US30']]);
  const unknown = setup({market: ''});
  unknown.context.updateMarketFromSymbol();
  assert.equal(unknown.elements['t-market'].value, 'old');
  const missing = setup({missing: ['t-symbol', 't-market'], market: 'Forex'});
  missing.context.updateMarketFromSymbol();
  assert.deepEqual(missing.calls, [['market', undefined]]);
});

test('trade form account context loads once after options and before remaining trade presentation', () => {
  for (const part of legacyParts) assert.equal(part, undefined);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const optionsIndex = scripts.findIndex(script => script.src === 'src/modules/trades/presentation/trade-form-options.js');
  const contextIndex = scripts.findIndex(script => script.src === modulePath);
  const imagesIndex = scripts.findIndex(script => script.src === 'src/modules/trades/presentation/trade-images.js');
  const appIndex = scripts.findIndex(script => script.src === 'app.js');
  assert.ok(optionsIndex < contextIndex && contextIndex < imagesIndex && imagesIndex < appIndex);
});
