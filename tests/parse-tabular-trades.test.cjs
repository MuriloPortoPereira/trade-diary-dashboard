const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/data-transfer/infrastructure/parse-tabular-trades.js';
const moduleFile = path.join(root, modulePath);
const sources = [app];
if (fs.existsSync(moduleFile)) sources.push(fs.readFileSync(moduleFile, 'utf8'));
const parserNames = ['parseMT5Rows', 'parseGenericTradeRows', 'parseSpreadsheetRows', 'parseMT4Raw'];
function declaration(name) {
  const patterns = [new RegExp(`^function ${name}\\([^\\n]*\\}[^\\S\\n]*$`, 'm'),
    new RegExp(`^function ${name}\\([^]*?^\\}`, 'm')];
  const found = sources.flatMap(source => patterns.map(pattern => source.match(pattern)?.[0])).find(Boolean);
  assert.ok(found, `Missing ${name}`);
  return found;
}
const plain = value => JSON.parse(JSON.stringify(value));
function setup() {
  let ids = 0;
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-15T12:00:00.000Z'])); }
  }
  const context = vm.createContext({Date: FixedDate, trades: [], uid: () => `generated-${++ids}`});
  vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/trades/domain/trade-timing.js'), 'utf8'), context);
  const marketMap = app.match(/^const MARKET_MAP = \{[^]*?^\};/m);
  assert.ok(marketMap);
  vm.runInContext([marketMap[0], ...['cleanMTCell', 'parseMTNumber', 'normalizeDate', 'normalizeImportHeader',
    'mtTradeStatus', 'getMarket'].map(declaration),
    'const tradeTimingDomain=TradeDiaryTradeTiming.createTradeTiming({normalizeDate,cleanCell:cleanMTCell});',
    declaration('normalizeClockTime'), ...parserNames.map(declaration)].join('\n'), context);
  return {context, idCount: () => ids};
}
const mtPosition = (id = '1001') => ['2024.02.01 09:15:10', id, ' EUR USD ', 'buy', '0,50', '1,1000',
  '1,0900', '1,1300', '2024.02.01 10:30:20', '1,1200', '(1,25)', '-0,50', '10,126'];
const mtHTML = () => ['2024.02.01 09:00', '2001', 'US500', 'sell', 'position', '1', '100', '102', '94',
  '2024.02.02 10:00', '96', '-1', '0,25', '4,50'];
const genericHeader = ['date', 'symbol', 'entry', 'stop', 'exit', 'pnl', 'ticket'];

test('MT position layout preserves full record shape, locale numbers, fees, rounding and clocks', () => {
  const {context, idCount} = setup();
  const row = Object.freeze(mtPosition());
  const result = context.parseMT5Rows([row], 'report.xlsx');
  assert.deepEqual(plain(result), [{id: 'generated-1', positionId: '1001', symbol: 'EURUSD', date: '2024-02-01',
    exitDate: '2024-02-01', placedTime: '', openTime: '09:15', exitTime: '10:30', market: 'Forex', direction: 'Long',
    entry: 1.1, stop: 1.09, tp: 1.13, exit: 1.12, qty: 0.5, mult: null, riskPct: null, riskUsd: null,
    r: 2, pnl: 10.13, pnlPct: null, fees: -1.75, strategy: '', emoBefore: '', emotion: '', emoAfter: '',
    followedPlan: '', planDeviation: '', errors: [], discipline: null, confidence: null, mistake: '', remarks: '',
    images: [], hesitation: false, resultType: 'WIN', status: 'WIN', mode: 'absolute', incomplete: false,
    missing_fields: [], createdAt: '2026-10-15T12:00:00.000Z', updatedAt: '2026-10-15T12:00:00.000Z'}]);
  assert.equal(idCount(), 1);
});

test('MT HTML and MT4 statement layouts keep their column offsets, short R and tax handling', () => {
  const {context} = setup();
  const mt4 = ['2024.02.01 09:00', '3001', 'sell', '1', 'XAUUSD', '2000', '2010', '1970',
    '2024.02.02 10:00', '1980', '-1,20', '-0,30', '0,50', '-6,789'];
  const result = context.parseMT5Rows([mtHTML(), mt4]);
  assert.deepEqual(Array.from(result, trade => [trade.positionId, trade.direction, trade.r, trade.fees, trade.pnl, trade.exitDate]),
    [['2001', 'Short', 2, -0.75, 4.5, '2024-02-02'], ['3001', 'Short', 2, -1, -6.79, '2024-02-02']]);
});

test('MT rejects deal rows, split/nonpositive volumes, invalid IDs, prices and balance entries', () => {
  const {context, idCount} = setup();
  const invalid = [null, [], ['short']];
  for (const [index, value] of [[1, 'abc'], [3, 'balance'], [4, '0'], [4, '1/2'], [5, '0'], [9, '0'], [2, 'BALANCE']]) {
    const row = mtPosition(); row[index] = value; invalid.push(row);
  }
  for (const direction of ['in', 'out', 'in/out']) { const row = mtHTML(); row[4] = direction; invalid.push(row); }
  assert.equal(context.parseMT5Rows(invalid).length, 0);
  assert.equal(idCount(), 0);
});

test('MT missing/nonpositive stops retain incomplete markers and null profit remains OPEN', () => {
  const {context} = setup();
  const row = mtPosition(); row[6] = '-1'; row[7] = '0'; row[12] = '';
  const trade = context.parseMT5Rows([row])[0];
  assert.equal(trade.stop, null);
  assert.equal(trade.tp, null);
  assert.equal(trade.r, null);
  assert.equal(trade.pnl, null);
  assert.equal(trade.status, 'OPEN');
  assert.equal(trade.resultType, '');
  assert.equal(trade.incomplete, true);
  assert.deepEqual(Array.from(trade.missing_fields), ['stop']);
});

test('MT duplicate detection keeps typed existing IDs, all-account lookup and first-row order', () => {
  const {context, idCount} = setup();
  const existing = [{positionId: '1001', accountId: 'other-account'}, {positionId: 1002}];
  context.trades = existing;
  const rows = [mtPosition('1001'), mtPosition('1002'), mtPosition('1002'), mtPosition('1003')];
  const before = JSON.stringify(rows);
  assert.deepEqual(Array.from(context.parseMT5Rows(rows), trade => trade.positionId), ['1002', '1003']);
  assert.equal(idCount(), 2);
  assert.strictEqual(context.trades, existing);
  assert.equal(JSON.stringify(rows), before);
});

test('generic parser locates accented headers and retains aliases, fields and date/time fallbacks', () => {
  const {context} = setup();
  const headers = ['Data', 'Símbolo', 'Direção', 'Entrada', 'SL', 'Saída', 'Lucro', 'Taxas', 'Lote',
    'Estratégia', 'Emoção', 'Ticket', 'Data saída', 'Hora ordem', 'Hora entrada', 'Hora saída', 'Mercado', 'TP'];
  const rows = [['Report'], headers, ['02/02/2024 9:05', ' e s ', 'venda', '100', '102', '96', 'R$ 12,345',
    '(0,50)', '2', ' setup  x ', ' calma ', '001', '03/02/2024 10:00', '8:50', '', '', ' custom ', '94']];
  const trade = context.parseGenericTradeRows(rows, 'report.csv')[0];
  assert.deepEqual([trade.symbol, trade.date, trade.exitDate, trade.direction, trade.entry, trade.stop, trade.exit,
    trade.pnl, trade.r, trade.fees, trade.qty, trade.strategy, trade.emotion, trade.positionId, trade.market, trade.tp],
    ['ES', '2024-02-02', '2024-02-03', 'Short', 100, 102, 96, 12.35, 2, -0.5, 2, 'setup x', 'calma', '001', 'custom', 94]);
  assert.deepEqual([trade.placedTime, trade.openTime, trade.exitTime], ['08:50', '09:05', '10:00']);
  assert.equal(trade.status, 'WIN');
  assert.equal(trade.createdAt, '2026-10-15T12:00:00.000Z');
});

test('generic aliases use alias priority and header search stops before row 21', () => {
  const {context} = setup();
  const priority = [['data', 'date', 'symbol', 'entry'], ['2020-01-01', '2024-01-01', 'ES', '100']];
  assert.equal(context.parseGenericTradeRows(priority)[0].date, '2024-01-01');
  const preamble = Array.from({length: 19}, () => ['preamble']);
  assert.equal(context.parseGenericTradeRows([...preamble, genericHeader, ['2024-01-01', 'ES', 100]]).length, 1);
  assert.equal(context.parseGenericTradeRows([...preamble, ['preamble'], genericHeader, ['2024-01-01', 'ES', 100]]).length, 0);
});

test('generic guards skip unusable rows without IDs and retain numeric zero as complete data', () => {
  const {context, idCount} = setup();
  for (const rows of [null, undefined, {}, [], [['symbol']]]) assert.equal(context.parseGenericTradeRows(rows).length, 0);
  const rows = [genericHeader, null, ['bad date', 'ES', 1], ['2024-01-01', 'BALANCE', 1],
    ['2024-01-01', 'ES'], ['2024-01-01', 'ES', '0', '0', '0', '0']];
  const result = context.parseGenericTradeRows(rows);
  assert.equal(result.length, 1);
  assert.equal(idCount(), 1);
  assert.deepEqual([result[0].entry, result[0].stop, result[0].exit, result[0].pnl, result[0].r, result[0].status], [0, 0, 0, 0, null, 'BE']);
  assert.equal(result[0].incomplete, false);
});

test('generic negative-zero rounding, absent entry/stop and duplicate tickets retain legacy behavior', () => {
  const {context} = setup();
  context.trades = [{positionId: 'same'}];
  const row = ['2024-01-01', 'ES', '', '', '', '-0.004', 'same'];
  const result = context.parseGenericTradeRows([genericHeader, row, row]);
  assert.equal(result.length, 2);
  assert.equal(Object.is(result[0].pnl, -0), true);
  assert.equal(result[0].status, 'BE');
  assert.equal(result[0].direction, 'Long');
  assert.equal(result[0].incomplete, true);
  assert.deepEqual(Array.from(result[0].missing_fields), ['entry', 'stop']);
  assert.notStrictEqual(result[0].errors, result[1].errors);
  assert.notEqual(result[0].id, result[1].id);
});

test('generic parsing preserves Excel dates and loose textual dates without using the filename', () => {
  const first = setup(), second = setup();
  const rows = [genericHeader, [45292, 'ES', 1], ['2024.13.40', 'ES', 2]];
  const before = JSON.stringify(rows);
  const a = first.context.parseGenericTradeRows(rows, 'a.csv');
  assert.deepEqual(Array.from(a, trade => trade.date), ['2024-01-01', '2024-13-40']);
  assert.deepEqual(plain(a), plain(second.context.parseGenericTradeRows(rows, 'b.xlsx')));
  assert.equal(JSON.stringify(rows), before);
});

test('spreadsheet dispatch tries MT first and forwards the original input and default filename', () => {
  const {context} = setup();
  const calls = [], rows = [], mt = [{}], generic = [{}];
  context.parseMT5Rows = (...args) => { calls.push(['mt', ...args]); return mt; };
  context.parseGenericTradeRows = (...args) => { calls.push(['generic', ...args]); return generic; };
  assert.strictEqual(context.parseSpreadsheetRows(rows), mt);
  assert.deepEqual(calls, [['mt', rows, 'spreadsheet']]);
  context.parseMT5Rows = (...args) => { calls.push(['mt', ...args]); return []; };
  assert.strictEqual(context.parseSpreadsheetRows(rows, 'custom'), generic);
  assert.deepEqual(calls.slice(1), [['mt', rows, 'custom'], ['generic', rows, 'custom']]);
});

test('parser errors propagate, including spreadsheet null input before generic guards', () => {
  const {context} = setup();
  assert.throws(() => context.parseSpreadsheetRows(null), /null/);
  const failure = new Error('number failed');
  context.parseMTNumber = () => { throw failure; };
  assert.throws(() => context.parseMT5Rows([mtPosition()]), error => error === failure);
});

test('MT4 text adapter preserves naive delimiter splitting and the text source argument', () => {
  const {context} = setup();
  const calls = [], returned = [];
  context.parseMT5Rows = (rows, source) => { calls.push([plain(rows), source]); return returned; };
  assert.strictEqual(context.parseMT4Raw('"a","b"\n "c"\t"d" '), returned);
  assert.deepEqual(calls[0], [[['a', 'b'], ['c', 'd']], 'text']);
  context.parseMT4Raw('"a,b"\t"c"');
  assert.deepEqual(calls[1], [[['a', 'b', 'c']], 'text']);
  assert.throws(() => context.parseMT4Raw(null), /null/);
});

test('tabular parser APIs load once as classic globals without initial IO or state access', () => {
  assert.ok(fs.existsSync(moduleFile));
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'fetch', 'trades', 'uid', 'Date', 'normalizeDate', 'getMarket']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`unexpected initialization access: ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  for (const name of parserNames) {
    assert.equal(typeof context[name], 'function');
    assert.doesNotMatch(app, new RegExp(`^function ${name}\\(`, 'm'));
  }
  assert.equal(context.parseMT5Rows.length, 2);
  assert.equal(context.parseGenericTradeRows.length, 1);
  assert.equal(context.parseSpreadsheetRows.length, 1);
  assert.equal(context.parseMT4Raw.length, 1);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const index = scripts.findIndex(script => script.src === modulePath);
  assert.ok(index < scripts.findIndex(script => script.src === 'src/modules/data-transfer/presentation/import-workflow.js'));
  assert.ok(index < scripts.findIndex(script => script.src === 'app.js'));
});
