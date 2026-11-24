/*
 * Testes unitarios para divisao de linhas delimitadas (CSV/TSV/ponto-e-virgula) e
 * protecao contra binarios.
 *
 * Modulo testado:
 * - `src/modules/data-transfer/infrastructure/trade-file-formats.js`
 *   (`TradeDiaryDelimitedRows`)
 * - Wrappers correspondentes em `app.js`: `normalizeCSVRow`,
 *   `isBinarySpreadsheetText`, `splitDelimitedRows`, `parseCSVText`.
 *
 * Estrategia de isolamento:
 * - Carrega o modulo de formatos e as declaracoes de `app.js` em `vm.createContext`.
 * - Substitui `parseSpreadsheetRows` por um espiao apos a carga do modulo para
 *   verificar exatamente as linhas produzidas por `parseCSVText` sem acionar o parser
 *   de trades.
 *
 * Regras criticas garantidas:
 * - Normalizacao de celulas converte falsy para `''`, remove espacos nas bordas e
 *   retira apenas uma aspa dupla de cada extremidade.
 * - Deteccao de delimitador pela primeira linha com precedencia `;` > `\t` > `,`.
 * - Quebra literal de virgulas mesmo dentro de aspas (comportamento historico
 *   preservado) e descarte de arquivos binarios (ex: cabecalho ZIP `PK\x03`).
 * - Modulo isolado sem acesso a DOM/IO e carregado na ordem esperada em `index.html`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/data-transfer/infrastructure/trade-file-formats.js';

// Extrai os 4 wrappers/helpers relacionados a CSV de app.js para testa-los junto ao
// modulo de formatos.
const declarations = ['normalizeCSVRow', 'isBinarySpreadsheetText', 'splitDelimitedRows', 'parseCSVText'].map(name => {
  const match = appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
  assert.ok(match, `Missing ${name}`);
  return match[0];
}).join('\n');

// Converte resultados do realm VM para objetos JS comuns antes das assercoes.
const plain = value => JSON.parse(JSON.stringify(value));

// Prepara o contexto VM, carrega o modulo de formatos e isola `parseSpreadsheetRows`
// com um espiao.
function setup() {
  const calls = [];
  const context = vm.createContext({});
  const file = path.join(root, modulePath);
  if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: modulePath});

  // Mantem o colaborador de parsing do wrapper CSV isolado apos o carregamento
  // completo do modulo de formatos.
  context.parseSpreadsheetRows = (rows, filename) => {
    calls.push({rows: plain(rows), filename});
    return {parsed: true};
  };
  vm.runInContext(declarations, context, {filename: 'app.js#delimited-rows'});
  return {context, calls};
}

// Verifica que `normalizeCSVRow` zera valores falsy (null/undefined/0/false), aplica
// trim e remove apenas aspas duplas nas pontas.
test('cell normalization preserves falsey, trimming and edge-quote rules', () => {
  const {context} = setup();
  assert.deepEqual([null, undefined, 0, false, '  "alpha"  ', '"a""', ' a,b '].map(value => context.normalizeCSVRow(value)),
    ['', '', '', '', 'alpha', 'a"', 'a,b']);
});

// Garante remocao de linhas vazias/CRLF e deteccao do delimitador na primeira linha
// (priorizando `;`, depois `\t`, depois `,`).
test('row splitting trims lines and chooses delimiter from the first row', () => {
  const {context} = setup();
  assert.deepEqual(plain(context.splitDelimitedRows('  a ; b\r\n \r\n "x" ; 0 \n')), [['a', 'b'], ['x', '0']]);
  assert.deepEqual(plain(context.splitDelimitedRows('a\tb\nc\td')), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(plain(context.splitDelimitedRows('a;b\tc\nd;e\tf')), [['a', 'b\tc'], ['d', 'e\tf']]);
  assert.deepEqual(plain(context.splitDelimitedRows('a,b\nc;d')), [['a', 'b'], ['c;d']]);
});

// Confirma quebra literal de virgulas dentro de aspas, preservacao de celulas vazias
// intermediarias e coercoes de entradas vazias/numericas.
test('quoted commas are split literally and empty cells stay empty', () => {
  const {context} = setup();
  assert.deepEqual(plain(context.splitDelimitedRows('"a,b",,c')), [['a', 'b', '', 'c']]);
  assert.deepEqual(plain(context.splitDelimitedRows('')), []);
  assert.deepEqual(plain(context.splitDelimitedRows(0)), []);
  assert.deepEqual(plain(context.splitDelimitedRows(42)), [['42']]);
});

// Valida `parseCSVText`: delega matriz dividida com label `'csv'` para
// `parseSpreadsheetRows` e bloqueia conteudo binario (XLSX/ZIP) ou vazio.
test('CSV import retains binary guard and csv source label', () => {
  const {context, calls} = setup();
  assert.deepEqual(plain(context.parseCSVText('Date;Symbol\n2026-10-14;ES')), {parsed: true});
  assert.deepEqual(calls, [{rows: [['Date', 'Symbol'], ['2026-10-14', 'ES']], filename: 'csv'}]);
  assert.deepEqual(plain(context.parseCSVText('PK\x03binary')), []);
  assert.deepEqual(plain(context.parseCSVText('')), []);
  assert.equal(calls.length, 1);
});

// Verifica isolamento de `TradeDiaryDelimitedRows` sem acesso a DOM/IO, ordem interna
// das definicoes no arquivo e carregamento sincrono em index.html.
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
  const formatsSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
  assert.ok(formatsSource.indexOf('globalThis.TradeDiaryTradesCSV =') < formatsSource.indexOf('globalThis.TradeDiaryDelimitedRows ='));
  assert.ok(index < scripts.findIndex(script => script.src === 'app.js'));
  assert.match(appSource, /^function normalizeCSVRow\(value\)\{/m);
  assert.match(appSource, /^function splitDelimitedRows\(text\)\{/m);
});
