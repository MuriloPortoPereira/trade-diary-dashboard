const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const appSource = fs.readFileSync(`${__dirname}/../app.js`, 'utf8');
const serializerPath = 'src/modules/data-transfer/infrastructure/serialize-trades-csv.js';
const serializerSource = fs.readFileSync(`${__dirname}/../${serializerPath}`, 'utf8');
const forbiddenGlobals = [
  'window', 'document', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest',
  'WebSocket', 'navigator', 'indexedDB', 'caches', 'Chart', 'Blob', 'FileReader',
  'require', 'process', 'console', 'setTimeout', 'setInterval', 'trades',
];
const header = 'date,symbol,direction,placedTime,openTime,exitDate,exitTime,entry,exit,stop,tp,qty,riskUsd,riskPct,r,pnl,status,market,strategy,emotion,errors,remarks';
const emptyRow = Array(22).fill('""').join(',');

function declaration(name) {
  const match = appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
  assert.ok(match, `Missing legacy function: ${name}`);
  return match[0];
}

function loadSerializerContext() {
  const sandbox = {};
  for (const name of forbiddenGlobals) {
    Object.defineProperty(sandbox, name, {
      get() { throw new Error(`Serializer must not access ${name}`); },
    });
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(serializerSource, context, {filename: serializerPath});
  return context;
}

function loadLegacyContext() {
  const context = vm.createContext({TradeDiaryTradesCSV: loadSerializerContext().TradeDiaryTradesCSV});
  const headers = appSource.match(/^const TRADE_CSV_HEADERS = .*;$/m);
  assert.ok(headers, 'Missing legacy headers');
  vm.runInContext([
    'let trades = [];', headers[0],
    ...['csvCell', 'buildTradesCSV', 'exportTradesCSV'].map(declaration),
  ].join('\n'), context, { filename: 'app.js (CSV declarations)' });
  return context;
}

function characterize(label, api) {
  const test = (name, callback) => nodeTest(`${label}: ${name}`, callback);

  test('quotes every cell and preserves scalar conversion', () => {
    for (const [value, expected] of [
      [undefined, '""'], [null, '""'], ['', '""'], ['  ', '"  "'],
      [0, '"0"'], [-0, '"0"'], [false, '"false"'], [true, '"true"'],
      [1.005, '"1.005"'], [NaN, '"NaN"'], [Infinity, '"Infinity"'],
      [12n, '"12"'], [Symbol('x'), '"Symbol(x)"'], [{}, '"[object Object]"'],
    ]) assert.equal(api.csvCell(value), expected);
  });

  test('escapes quotes but retains commas, CR, LF, Unicode and formula text', () => {
    assert.equal(api.csvCell('ação,"A"\r\nB\nC\rD'), '"ação,""A""\r\nB\nC\rD"');
    assert.equal(api.csvCell('=SUM(A1:A2)'), '"=SUM(A1:A2)"');
  });

  test('joins arrays with semicolon-space before quoting', () => {
    assert.equal(api.csvCell([]), '""');
    assert.equal(api.csvCell(['a,b', '"c"', null, undefined, '', 0, false]), '"a,b; ""c""; ; ; ; 0; false"');
    assert.equal(api.csvCell([['a', 'b'], , 'c']), '"a,b; ; c"');
  });

  test('empty or non-array lists emit only headers and LF', () => {
    for (const list of [[], null, false, 0, '', 'invalid', {}, {length: 1}]) {
      assert.equal(api.buildTradesCSV(list), header + '\n');
    }
  });

  test('keeps column order independently of object order and ignores extra fields', () => {
    const trade = {extra: 'ignored'};
    header.split(',').reverse().forEach(name => { trade[name] = name; });
    assert.equal(api.buildTradesCSV([trade]), header + '\n' +
      '"date","symbol","direction","placedTime","openTime","exitDate","exitTime","entry","exit","stop","tp","qty","riskUsd","riskPct","r","pnl","status","market","strategy","emotion","errors","remarks"');
  });

  test('keeps row order, missing values, LF separators and no final row newline', () => {
    const first = {date: '2026-09-10', symbol: 'EURUSD', errors: ['pressa', '"erro"'], remarks: 'linha 1\nlinha 2'};
    const expectedFirst = ['"2026-09-10"', '"EURUSD"', ...Array(18).fill('""'), '"pressa; ""erro"""', '"linha 1\nlinha 2"'].join(',');
    assert.equal(api.buildTradesCSV([first, {}]), header + '\n' + expectedFirst + '\n' + emptyRow);
  });

  test('retains null-row TypeError and primitive/sparse-row behavior', () => {
    for (const row of [null, undefined]) {
      assert.throws(() => api.buildTradesCSV([row]), {name: 'TypeError'});
    }
    assert.equal(api.buildTradesCSV([0, false, 'text']), header + '\n' + [emptyRow, emptyRow, emptyRow].join('\n'));
    assert.equal(api.buildTradesCSV(Array(2)), header + '\n\n');
  });

  test('reads inherited fields and propagates conversion errors', () => {
    const trade = Object.create({date: 'inherited'});
    assert.equal(api.buildTradesCSV([trade]), header + '\n"inherited",' + Array(21).fill('""').join(','));
    const error = new Error('conversion failed');
    const value = {toString() { throw error; }};
    assert.throws(() => api.csvCell(value), thrown => thrown === error);
    assert.throws(() => api.buildTradesCSV([{remarks: value}]), thrown => thrown === error);
  });

  test('does not mutate input lists, records or arrays', () => {
    const errors = Object.freeze(['a', 'b']);
    const record = Object.freeze({date: '2026-09-10', errors});
    const list = Object.freeze([record]);
    assert.equal(api.buildTradesCSV(list), api.buildTradesCSV(list));
    assert.deepEqual(list, [{date: '2026-09-10', errors: ['a', 'b']}]);
  });
}

characterize('isolated CSV serializer', loadSerializerContext().TradeDiaryTradesCSV);
characterize('legacy CSV wrappers', loadLegacyContext());

nodeTest('serializer exposes one namespace without helper leaks or DOM/IO/global-state access', () => {
  const context = loadSerializerContext();
  assert.deepEqual(Object.getOwnPropertyNames(context).filter(name => !forbiddenGlobals.includes(name)), ['TradeDiaryTradesCSV']);
  assert.deepEqual(Object.keys(context.TradeDiaryTradesCSV).sort(), ['TRADE_CSV_HEADERS', 'buildTradesCSV', 'csvCell']);
  assert.equal(context.TradeDiaryTradesCSV.buildTradesCSV(), header + '\n');
});

nodeTest('legacy header alias shares the serializer column array', () => {
  const context = loadLegacyContext();
  assert.equal(vm.runInContext('TRADE_CSV_HEADERS', context), context.TradeDiaryTradesCSV.TRADE_CSV_HEADERS);
  assert.equal(vm.runInContext('TRADE_CSV_HEADERS.join(",")', context), header);
});

nodeTest('HTML loads serializer once between sizing and app.js as synchronous classic scripts', () => {
  const html = fs.readFileSync(`${__dirname}/../index.html`, 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1],
    src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const localScripts = scripts.filter(script => script.src && !script.src.startsWith('https://'));
  const csvOrder = ['src/modules/simulation/domain/calculate-simulation-sizing.js', serializerPath, 'app.js'];
  assert.deepEqual(localScripts.map(script => script.src).filter(src => csvOrder.includes(src)), csvOrder);
  for (const script of localScripts) {
    assert.doesNotMatch(script.attributes, /\b(?:async|defer|nomodule)\b/i);
    const type = script.attributes.match(/\btype\s*=\s*['"]([^'"]*)['"]/i)?.[1];
    assert.ok(type === undefined || type === '' || type === 'text/javascript');
  }
});

nodeTest('global buildTradesCSV keeps signature and resolves current trades on each default call', () => {
  const context = loadLegacyContext();
  assert.equal(context.buildTradesCSV.length, 0);
  assert.equal(context.csvCell.length, 1);
  assert.equal(context.buildTradesCSV(), header + '\n');
  vm.runInContext('trades = [{date: "first"}]', context);
  const first = header + '\n"first",' + Array(21).fill('""').join(',');
  assert.equal(context.buildTradesCSV(), first);
  assert.equal(context.buildTradesCSV(undefined), first);
  vm.runInContext('trades = [{}]', context);
  assert.equal(context.buildTradesCSV(), header + '\n' + emptyRow);
  assert.equal(context.buildTradesCSV(null), header + '\n');
});

nodeTest('export consumer keeps CSV payload, filename, MIME and empty-list notice', () => {
  const context = loadLegacyContext();
  const downloads = [], notices = [];
  context.downloadTextFile = (...args) => downloads.push(args);
  context.showAppNotice = (...args) => notices.push(args);
  vm.runInContext('Date = class extends Date { toISOString() { return "2026-09-10T12:00:00.000Z"; } }', context);
  assert.equal(context.exportTradesCSV([{}], 'filtered'), undefined);
  assert.deepEqual(downloads, [[header + '\n' + emptyRow, 'filtered_2026-09-10.csv', 'text/csv;charset=utf-8']]);
  for (const input of [[], null, {}]) assert.equal(context.exportTradesCSV(input, 'empty'), undefined);
  assert.equal(downloads.length, 1);
  assert.deepEqual(notices, Array(3).fill(['Exportar CSV', 'Nenhum trade encontrado para esses filtros.']));
});
