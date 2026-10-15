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
