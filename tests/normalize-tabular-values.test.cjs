const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/data-transfer/infrastructure/normalize-tabular-values.js';
const moduleFile = path.join(root, modulePath);
const names = ['parseMTNumber', 'normalizeDate', 'cleanMTCell', 'normalizeImportHeader'];
const source = fs.existsSync(moduleFile) ? fs.readFileSync(moduleFile, 'utf8') : names.map(name => {
  const match = app.match(new RegExp(`^function ${name}\\([^\\n]*\\}[^\\S\\n]*$`, 'm'))
    || app.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
  assert.ok(match, `Missing ${name}`);
  return match[0];
}).join('\n');
function setup() {
  const context = vm.createContext({Date});
  vm.runInContext(source, context);
  return context;
}

test('numeric normalization preserves null/finite/scalar conversion and signed zero', () => {
  const context = setup();
  for (const value of [null, undefined, NaN, Infinity, -Infinity, '', '  ', '\u2014', true, false, {}, 'invalid', '--1']) {
    assert.equal(context.parseMTNumber(value), null);
  }
  for (const value of [0, -0, 1.005, -42, Number.MAX_VALUE]) assert.equal(context.parseMTNumber(value), value);
  assert.equal(context.parseMTNumber(123n), 123);
  assert.equal(context.parseMTNumber([1, 2]), 1.2);
  assert.equal(Object.is(context.parseMTNumber('-0'), -0), true);
  assert.equal(Object.is(context.parseMTNumber('(0)'), -0), true);
});

test('numeric locale heuristics keep currency, parentheses, ambiguous separators and loose parsing', () => {
  const context = setup();
  for (const [input, expected] of [
    ['R$ 1.234,56', 1234.56], ['$1,234.56', 1234.56], ['(R$ 1.234,56)', -1234.56],
    ['USD - 1\u00a0234,56', -1234.56], ['+12.5', 12.5], ['( -2.5 )', -2.5],
    ['1.234', 1.234], ['1,234', 1.234], ['1,234,567', 1.234], ['1.234.567', 1.234], ['1e3', 13],
  ]) assert.equal(context.parseMTNumber(input), expected, input);
});

test('cell cleaning preserves coercion, trimming, whitespace collapse and punctuation', () => {
  const context = setup();
  for (const [input, expected] of [[null, ''], [undefined, ''], [0, '0'], [false, 'false'],
    [' \t a\r\n b\u00a0c ', 'a b c'], [' a,b;"x" ', 'a,b;"x"'], [[1, null, 'a\nb'], '1,,a b']]) {
    assert.equal(context.cleanMTCell(input), expected);
  }
});

test('date normalization keeps textual formats, Excel fractions, loose ranges and invalid fallback', () => {
  const context = setup();
  for (const [input, expected] of [[null, ''], [undefined, ''], ['', ''], ['invalid', ''],
    ['2024.2.3 09:15', '2024-02-03'], ['03/02/2024 09:15', '2024-02-03'], ['2024-13-40', '2024-13-40'],
    [45292, '2024-01-01'], ['45292,75', '2024-01-01'], [' 45292.75 ', '2024-01-01']]) {
    assert.equal(context.normalizeDate(input), expected, String(input));
  }
  assert.equal(context.normalizeDate(new Date('invalid')), '');
});

test('Date instances use UTC while date-prefixed strings retain their textual calendar day', () => {
  const context = setup();
  const timestamp = '2024-03-01T00:30:00+03:00';
  assert.equal(context.normalizeDate(new Date(timestamp)), '2024-02-29');
  assert.equal(context.normalizeDate(timestamp), '2024-03-01');
});

test('header normalization strips accents/punctuation while retaining percent, underscore and digits', () => {
  const context = setup();
  for (const [input, expected] of [[null, ''], [false, 'false'], [0, '0'], [' S/L ', 'sl'],
    [' Horário da Abertura (%) / # ', 'horariodaabertura%'], [' Símbolo-á Ativo__ 2% ', 'simboloaativo__2%']]) {
    assert.equal(context.normalizeImportHeader(input), expected);
  }
});

test('date parsing retains late lookup of the global numeric helper after string coercion', () => {
  const context = setup();
  const calls = [];
  context.parseMTNumber = input => { calls.push(input); return 45292; };
  assert.equal(context.normalizeDate('45293'), '2024-01-01');
  assert.deepEqual(calls, ['45293']);
  context.normalizeDate('2024-02-03');
  assert.equal(calls.length, 1);
  const input = {toString() { context.parseMTNumber = () => 45293; return '45292'; }};
  assert.equal(context.normalizeDate(input), '2024-01-02');
});

test('header normalization retains the global cell helper and conversion errors propagate', () => {
  const context = setup();
  const input = {};
  const calls = [];
  context.cleanMTCell = value => { calls.push(value); return ' Á B_2% '; };
  assert.equal(context.normalizeImportHeader(input), 'ab_2%');
  assert.strictEqual(calls[0], input);
  const failure = new Error('conversion failed');
  const invalid = {toString() { throw failure; }};
  const original = setup();
  for (const name of names) assert.throws(() => original[name](invalid), error => error === failure);
  const date = new Date('2024-01-01');
  date.toISOString = () => { throw failure; };
  assert.throws(() => original.normalizeDate(date), error => error === failure);
});

test('normalization APIs initialize and run without application state or IO as ordered classic globals', () => {
  assert.ok(fs.existsSync(moduleFile));
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'fetch', 'trades', 'config', 'uid', 'Chart']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`unexpected normalizer access: ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context);
  for (const name of names) {
    assert.equal(typeof context[name], 'function');
    assert.equal(context[name].length, 1);
    assert.doesNotMatch(app, new RegExp(`^function ${name}\\(`, 'm'));
  }
  assert.equal(context.parseMTNumber('1,5'), 1.5);
  assert.equal(context.normalizeDate('45292,75'), '2024-01-01');
  assert.equal(context.normalizeImportHeader(' Símbolo / '), 'simbolo');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const index = scripts.findIndex(script => script.src === modulePath);
  assert.ok(index < scripts.findIndex(script => script.src === 'src/modules/data-transfer/infrastructure/parse-tabular-trades.js'));
  assert.ok(index < scripts.findIndex(script => script.src === 'app.js'));
});
