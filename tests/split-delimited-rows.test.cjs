const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/data-transfer/infrastructure/split-delimited-rows.js';
const start = appSource.indexOf('function normalizeCSVRow(');
const end = appSource.indexOf('\nfunction handleCSVUpload(', start);
assert.ok(start >= 0 && end > start);
const plain = value => JSON.parse(JSON.stringify(value));

function setup() {
  const calls = [];
  const context = vm.createContext({parseSpreadsheetRows: (rows, filename) => {
    calls.push({rows: plain(rows), filename});
    return {parsed: true};
  }});
  const file = path.join(root, modulePath);
  if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: modulePath});
  vm.runInContext(appSource.slice(start, end), context, {filename: 'app.js#delimited-rows'});
  return {context, calls};
}

test('cell normalization preserves falsey, trimming and edge-quote rules', () => {
  const {context} = setup();
  assert.deepEqual([null, undefined, 0, false, '  "alpha"  ', '"a""', ' a,b '].map(value => context.normalizeCSVRow(value)),
    ['', '', '', '', 'alpha', 'a"', 'a,b']);
});

test('row splitting trims lines and chooses delimiter from the first row', () => {
  const {context} = setup();
  assert.deepEqual(plain(context.splitDelimitedRows('  a ; b\r\n \r\n "x" ; 0 \n')), [['a', 'b'], ['x', '0']]);
  assert.deepEqual(plain(context.splitDelimitedRows('a\tb\nc\td')), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(plain(context.splitDelimitedRows('a;b\tc\nd;e\tf')), [['a', 'b\tc'], ['d', 'e\tf']]);
  assert.deepEqual(plain(context.splitDelimitedRows('a,b\nc;d')), [['a', 'b'], ['c;d']]);
});

test('quoted commas are split literally and empty cells stay empty', () => {
  const {context} = setup();
  assert.deepEqual(plain(context.splitDelimitedRows('"a,b",,c')), [['a', 'b', '', 'c']]);
  assert.deepEqual(plain(context.splitDelimitedRows('')), []);
  assert.deepEqual(plain(context.splitDelimitedRows(0)), []);
  assert.deepEqual(plain(context.splitDelimitedRows(42)), [['42']]);
});

test('CSV import retains binary guard and csv source label', () => {
  const {context, calls} = setup();
  assert.deepEqual(plain(context.parseCSVText('Date;Symbol\n2026-10-14;ES')), {parsed: true});
  assert.deepEqual(calls, [{rows: [['Date', 'Symbol'], ['2026-10-14', 'ES']], filename: 'csv'}]);
  assert.deepEqual(plain(context.parseCSVText('PK\x03binary')), []);
  assert.deepEqual(plain(context.parseCSVText('')), []);
  assert.equal(calls.length, 1);
});

test('delimited row parser is isolated and loads before classic consumers', () => {
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'fetch', 'trades', 'FileReader', 'Blob']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`delimited parser accessed ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, modulePath), 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.keys(context.TradeDiaryDelimitedRows).sort(), ['normalizeCSVRow', 'splitDelimitedRows']);
  assert.deepEqual(plain(context.TradeDiaryDelimitedRows.splitDelimitedRows('a;b\nc;d')), [['a', 'b'], ['c', 'd']]);

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const index = scripts.findIndex(script => script.src === modulePath);
  assert.ok(scripts.findIndex(script => script.src === 'src/modules/data-transfer/infrastructure/serialize-trades-csv.js') < index);
  assert.ok(index < scripts.findIndex(script => script.src === 'app.js'));
  assert.match(appSource, /^function normalizeCSVRow\(value\)\{/m);
  assert.match(appSource, /^function splitDelimitedRows\(text\)\{/m);
});
