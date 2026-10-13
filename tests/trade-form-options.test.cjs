const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-form-options.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['populateSelects', 'toggleTradeError'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function setup({missing = [], selectedErrors = ['Anterior']} = {}) {
  const ids = ['t-emotion', 't-emo-before', 't-emo-after', 't-strategy', 't-market', 't-account', 'symbolsList'];
  const elements = Object.fromEntries(ids.filter(id => !missing.includes(id)).map(id => [id, {innerHTML: 'old', value: 'old'}]));
  const calls = [];
  const context = vm.createContext({
    config: {
      emotions: ['Calma', 'Medo & foco'],
      strategies: ['Setup A', '<Setup B>'],
      markets: ['EUA', 'B3'],
      symbols: ['US30', 'EURUSD'],
    },
    accounts: [{id: 'a1', name: 'Principal'}, {id: 'a2', name: 'Secundária'}],
    activeAccountId: 'a2',
    selectedErrors,
    document: {getElementById: id => elements[id] ?? null},
    onAccountChange: () => calls.push(['account']),
    renderErrorChips: () => calls.push(['chips']),
    autoDisc: force => calls.push(['discipline', force]),
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#trade-form-options' : modulePath});
  return {context, elements, calls};
}

test('populate selects preserves option order, raw labels and active account', () => {
  const {context, elements, calls} = setup();
  context.populateSelects();
  const emotionOptions = '<option value="">—</option><option>Calma</option><option>Medo & foco</option>';
  assert.equal(elements['t-emotion'].innerHTML, emotionOptions);
  assert.equal(elements['t-emo-before'].innerHTML, emotionOptions);
  assert.equal(elements['t-emo-after'].innerHTML, emotionOptions);
  assert.equal(elements['t-strategy'].innerHTML, '<option value="">— Estratégia —</option><option>Setup A</option><option><Setup B></option>');
  assert.equal(elements['t-market'].innerHTML, '<option value="">— Mercado —</option><option>EUA</option><option>B3</option>');
  assert.equal(elements['t-account'].innerHTML, '<option value="a1">Principal</option><option value="a2">Secundária</option>');
  assert.equal(elements['t-account'].value, 'a2');
  assert.equal(elements.symbolsList.innerHTML, '<option value="US30"><option value="EURUSD">');
  assert.equal(context.selectedErrors.length, 0);
  assert.deepEqual(calls, [['account'], ['chips']]);
});

test('populate tolerates every optional select while retaining final effects', () => {
  const {context, calls} = setup({missing: ['t-emotion', 't-emo-before', 't-emo-after', 't-strategy', 't-market', 't-account', 'symbolsList']});
  context.populateSelects();
  assert.equal(context.selectedErrors.length, 0);
  assert.deepEqual(calls, [['account'], ['chips']]);
});

test('missing symbols config retains the empty datalist behavior', () => {
  const {context, elements} = setup();
  delete context.config.symbols;
  context.populateSelects();
  assert.equal(elements.symbolsList.innerHTML, '');
});

test('toggle ignores blank labels without rendering or recalculating', () => {
  const {context, calls} = setup();
  context.toggleTradeError('   ');
  assert.deepEqual([...context.selectedErrors], ['Anterior']);
  assert.deepEqual(calls, []);
});

test('toggle trims and adds or removes errors before recalculating discipline', () => {
  const {context, calls} = setup({selectedErrors: ['FOMO', 'Stop']});
  context.toggleTradeError('  Hesitação  ');
  assert.deepEqual([...context.selectedErrors], ['FOMO', 'Stop', 'Hesitação']);
  context.toggleTradeError('FOMO');
  assert.deepEqual([...context.selectedErrors], ['Stop', 'Hesitação']);
  assert.deepEqual(calls, [
    ['chips'], ['discipline', true], ['chips'], ['discipline', true],
  ]);
});
