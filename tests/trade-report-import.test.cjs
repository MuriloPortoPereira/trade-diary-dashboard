const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const files = ['src/modules/data-transfer/infrastructure/read-trade-report.js', 'src/modules/data-transfer/presentation/import-workflow.js', 'app.js'];
const sources = files.filter(file => fs.existsSync(path.join(root, file))).map(file => fs.readFileSync(path.join(root, file), 'utf8'));
const names = ['handleMT5Upload', 'handleReportUpload', 'handleHistoryUpload', 'loadSheetJS', 'parseMT5HTML', 'handleMT5Result'];
const declarations = names.map(name => {
  const match = sources.map(source => source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))).find(Boolean);
  assert.ok(match, name);
  return match[0];
}).join('\n');
const plain = value => JSON.parse(JSON.stringify(value));
function setup() {
  const calls = [], readers = [], scripts = [];
  const nodes = {csvPreview: {innerHTML: ''}, mt4Preview: {innerHTML: ''}};
  const context = vm.createContext({
    activeAccountId: 'first', pendingImport: [], window: {},
    document: {
      getElementById(id) { calls.push(['node', id]); return nodes[id] || null; },
      createElement(tag) { calls.push(['create', tag]); const element = {}; if(tag === 'div') element.querySelectorAll = () => []; return element; },
      head: {appendChild(script) { scripts.push(script); calls.push(['append']); }},
    },
    FileReader: class {
      constructor() { readers.push(this); }
      readAsText(...args) { calls.push(['text', ...args]); }
      readAsArrayBuffer(file) { calls.push(['buffer', file]); }
    },
    parseSpreadsheetRows(rows, filename) { calls.push(['rows', rows, filename]); return [{id: 'parsed'}]; },
    parseMT4Raw(text) { calls.push(['mt4', text]); return [{id: 'mt4'}]; },
    prepareImportedTrades(rows, options) { calls.push(['prepare', rows, plain(options)]); return [{id: 'prepared'}]; },
    setPendingImport(rows, options) { calls.push(['pending', rows, plain(options)]); context.pendingImport = rows; },
    showImportPreview(rows) { calls.push(['preview', rows]); },
    openModal(id) { calls.push(['open', id]); },
    handleCSVUpload(event) { calls.push(['csv', event]); },
  });
  vm.runInContext(declarations, context);
  return {context, calls, readers, scripts, nodes};
}
test('report upload ignores missing file and routes case-insensitive HTML only through MT upload', () => {
  const {context, calls, readers} = setup();
  for(const name of ['handleMT5Upload', 'handleReportUpload', 'handleHistoryUpload']) context[name]({target: {files: []}});
  assert.equal(calls.length, 0); assert.equal(readers.length, 0);
  context.handleMT5Upload = event => calls.push(['mt', event]);
  for(const filename of ['report.HTML', 'report.HtM', 'report.xlsx', 'report.csv', 'report']) {
    const event = {target: {files: [{name: filename}]}};
    context.handleHistoryUpload(event);
    assert.strictEqual(calls.at(-1)[1], event);
    assert.equal(calls.at(-1)[0], /\.htm[l]?$/i.test(filename) ? 'mt' : 'csv');
  }
});
test('SheetJS loader runs synchronously when present and otherwise waits for script onload', () => {
  const {context, calls, scripts} = setup();
  let count = 0; const callback = () => count++;
  context.window.XLSX = {};
  context.loadSheetJS(callback);
  assert.equal(count, 1); assert.equal(calls.length, 0);
  delete context.window.XLSX;
  context.loadSheetJS(callback);
  assert.equal(count, 1); assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  assert.strictEqual(scripts[0].onload, callback);
  assert.equal(scripts[0].onerror, undefined);
  scripts[0].onload(); assert.equal(count, 2);
});
test('HTML upload uses first file, UTF-16 and parser result with captured preview node', () => {
  const {context, calls, readers, nodes} = setup();
  context.parseMT5HTML = (html, name) => { calls.push(['html', html, name]); return ['result']; };
  context.handleMT5Result = (result, node) => calls.push(['result', result, node]);
  const file = {name: 'history.HTM'};
  context.handleMT5Upload({target: {files: [file, {name: 'ignored'}]}});
  assert.match(nodes.csvPreview.innerHTML, /Processando history.HTM/);
  assert.deepEqual(calls.at(-1), ['text', file, 'utf-16']);
  const preview = nodes.csvPreview; delete nodes.csvPreview;
  readers[0].onload({target: {result: '<table>'}});
  assert.deepEqual(calls.at(-2), ['html', '<table>', file.name]);
  assert.deepEqual(calls.at(-1), ['result', ['result'], preview]);
});
test('non HTML/XLSX upload falls back to MT4 text and optional preview', () => {
  const {context, calls, readers, nodes} = setup();
  delete nodes.csvPreview;
  context.handleMT5Result = (rows, node) => calls.push(['result', rows, node]);
  const file = {name: 'history.txt'};
  context.handleMT5Upload({target: {files: [file]}});
  assert.match(nodes.mt4Preview.innerHTML, /Processando/);
  assert.deepEqual(calls.at(-1), ['text', file]);
  readers[0].onload({target: {result: 'raw'}});
  assert.deepEqual(calls.at(-2), ['mt4', 'raw']);
  assert.strictEqual(calls.at(-1)[2], nodes.mt4Preview);
  delete nodes.mt4Preview;
  context.handleMT5Upload({target: {files: [file]}});
  readers[1].onload({target: {result: ''}});
  assert.equal(calls.at(-1)[2], null);
});
test('XLSX upload defers reading, selects first sheet and preserves conversion options', () => {
  const {context, calls, readers, nodes} = setup(); let loaded;
  context.loadSheetJS = callback => { loaded = callback; };
  const sheet = {}, rows = [['row']], buffer = new ArrayBuffer(2);
  context.XLSX = {
    read(input, options) { calls.push(['workbook', input, plain(options)]); return {SheetNames: ['one', 'two'], Sheets: {one: sheet}}; },
    utils: {sheet_to_json(input, options) { calls.push(['sheet', input, plain(options)]); return rows; }},
  };
  const file = {name: 'history.XLSX'};
  context.handleMT5Upload({target: {files: [file]}});
  assert.equal(readers.length, 0); loaded();
  assert.deepEqual(calls.at(-1), ['buffer', file]);
  context.activeAccountId = 'at-completion';
  readers[0].onload({target: {result: buffer}});
  assert.deepEqual(calls.find(call => call[0] === 'workbook'), ['workbook', buffer, {type: 'array', cellDates: true}]);
  assert.deepEqual(calls.find(call => call[0] === 'sheet'), ['sheet', sheet, {header: 1, defval: null, raw: false}]);
  assert.strictEqual(calls.find(call => call[0] === 'rows')[1], rows);
  assert.deepEqual(calls.find(call => call[0] === 'prepare')[2], {accountId: 'at-completion', seedLabel: 'upload'});
  assert.deepEqual(calls.find(call => call[0] === 'pending')[2], {accountId: 'at-completion', source: 'upload'});
  assert.match(nodes.csvPreview.innerHTML, /1 trades detectados/);
  assert.deepEqual(calls.slice(-2).map(call => call[0]), ['preview', 'open']);
});
test('XLSX processing catches parser and result errors while HTML errors propagate', () => {
  const {context, readers, nodes} = setup();
  context.loadSheetJS = callback => callback();
  const failure = new Error('format failed');
  context.XLSX = {read() { throw failure; }};
  context.handleMT5Upload({target: {files: [{name: 'bad.xlsx'}]}});
  readers[0].onload({target: {result: null}});
  assert.match(nodes.csvPreview.innerHTML, /Erro: format failed/);
  context.XLSX = {read() { return {SheetNames: ['s'], Sheets: {s: {}}}; }, utils: {sheet_to_json() { return []; }}};
  context.handleMT5Result = () => { throw failure; };
  readers[0].onload({target: {result: null}});
  assert.match(nodes.csvPreview.innerHTML, /Erro: format failed/);
  context.parseMT5HTML = () => { throw failure; };
  context.handleMT5Upload({target: {files: [{name: 'bad.html'}]}});
  assert.throws(() => readers[1].onload({target: {result: ''}}), error => error === failure);
});
test('HTML reader trims td/th, filters short rows and delegates unchanged filename', () => {
  const {context, calls} = setup();
  const makeRow = size => ({querySelectorAll(selector) { assert.equal(selector, 'td,th'); return Array.from({length: size}, (_, i) => ({textContent: `  cell ${i}\n`})); }});
  const element = {innerHTML: '', querySelectorAll(selector) { assert.equal(selector, 'tr'); return [makeRow(9), makeRow(10), makeRow(11)]; }};
  context.document.createElement = tag => { assert.equal(tag, 'div'); return element; };
  const result = context.parseMT5HTML('<table>raw</table>', 'report.html');
  assert.equal(element.innerHTML, '<table>raw</table>');
  assert.deepEqual(plain(calls[0][1]), [Array.from({length: 10}, (_, i) => `cell ${i}`), Array.from({length: 11}, (_, i) => `cell ${i}`)]);
  assert.equal(calls[0][2], 'report.html'); assert.equal(result[0].id, 'parsed');
});
test('empty report preserves pending state and result flow opens even if preparation returns empty', () => {
  const {context, calls, nodes} = setup();
  const prior = context.pendingImport = [{id: 'prior'}];
  context.handleMT5Result([], nodes.csvPreview);
  assert.match(nodes.csvPreview.innerHTML, /Nenhum trade detectado/);
  assert.strictEqual(context.pendingImport, prior); assert.equal(calls.length, 0);
  context.handleMT5Result([], null); assert.equal(calls.length, 0);
  context.prepareImportedTrades = () => [];
  context.handleMT5Result([{}], null);
  assert.deepEqual(calls.map(call => call[0]), ['pending', 'preview', 'open']);
  assert.strictEqual(calls[1][1], context.pendingImport);
});

test('report adapters load as classic globals before app and perform no IO at startup', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for(const file of files.slice(0, 2)) {
    assert.equal(html.split(`src="${file}"`).length - 1, 1);
    assert.ok(html.indexOf(`src="${file}"`) < html.indexOf('src="app.js"'));
  }
  const context = vm.createContext({});
  for(const file of files.slice(0, 2)) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  for(const name of names) assert.equal(typeof context[name], 'function');
});
