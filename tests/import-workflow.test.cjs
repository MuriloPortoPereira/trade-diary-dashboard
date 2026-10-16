const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/data-transfer/presentation/import-workflow.js';
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const moduleFile = path.join(root, modulePath);
const source = fs.existsSync(moduleFile) ? fs.readFileSync(moduleFile, 'utf8') : app;
const names = ['importJSON', 'handleCSVUpload', 'parseMT4', 'showImportPreview', 'confirmImport'];
const declarations = names.map(name => {
  const match = source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
  assert.ok(match, `Missing ${name}`);
  return match[0];
}).join('\n');
const plain = value => JSON.parse(JSON.stringify(value));

function setup() {
  const calls = [], readers = [], tasks = [], confirmations = [];
  const nodes = {csvPreview: {innerHTML: ''}, csvConfirmPreview: {innerHTML: ''}, importCount: {}, mt4Input: {value: ''}};
  const prepared = [{id: 'prepared'}];
  const context = vm.createContext({
    activeAccountId: 'active', pendingImport: [], trades: [], accounts: [{id: 'active', name: '<Account>'}],
    _incompleteBannerDismissed: true,
    document: {getElementById: id => nodes[id] || null},
    FileReader: class {
      constructor() { readers.push(this); }
      readAsText(...args) { calls.push(['readText', ...args]); }
      readAsArrayBuffer(file) { calls.push(['readBuffer', file]); }
    },
    validateBackupData(data) { calls.push(['validate', data]); },
    renderBackupSummary(data) { calls.push(['summary', data]); },
    formatBackupSummary() { calls.push(['format']); return 'summary'; },
    showAppConfirm(...args) { calls.push(['confirm']); confirmations.push(args); },
    restoreBackupData(data) { calls.push(['restore', data]); },
    createBackupPayload() { calls.push(['payload']); return {restored: true}; },
    save() { calls.push(['save']); }, refreshAll() { calls.push(['refresh']); },
    showAppNotice(...args) { calls.push(['notice', ...args]); },
    parseCSVText(text) { calls.push(['csv', text]); return ['csv-rows']; },
    parseSpreadsheetRows(rows, name) { calls.push(['spreadsheet', rows, name]); return ['sheet-rows']; },
    prepareImportedTrades(rows, options) { calls.push(['prepare', rows, plain(options)]); return prepared; },
    setPendingImport(rows, options) { calls.push(['pending', rows, plain(options)]); context.pendingImport = [...rows]; },
    clearPendingImport() { calls.push(['clear']); context.pendingImport = []; },
    getPendingImportAccountId() { return 'active'; },
    getTradeImportPositionKey(trade, account) { return trade.position ? `${trade.accountId || account}:${trade.position}` : ''; },
    openModal(id) { calls.push(['open', id]); }, closeModal(id) { calls.push(['close', id]); },
    escapeHtml(value) { return value.replaceAll('<', '&lt;').replaceAll('>', '&gt;'); },
    fDate: value => value, fR: value => String(value),
    parseMT4Raw(text) { calls.push(['mt4', text]); return ['mt4-rows']; },
    loadSheetJS(callback) { calls.push(['loadSheetJS']); tasks.push(callback); },
    setTimeout(callback, delay) { calls.push(['timer', delay]); tasks.push(callback); },
    showPage(id) { calls.push(['page', id]); },
    startBulkIncompleteFlow(ids) { calls.push(['bulk', Array.from(ids)]); },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/data-transfer/domain/import-trade-rules.js'), 'utf8'), context);
  vm.runInContext(declarations, context);
  return {context, calls, readers, tasks, confirmations, nodes, prepared};
}

test('JSON import reads one file and waits for confirmation before restoration and save', () => {
  const {context, calls, readers, confirmations} = setup();
  context.importJSON({target: {files: []}});
  assert.equal(readers.length, 0);
  const file = {name: 'backup.json'};
  context.importJSON({target: {files: [file, {}]}});
  assert.deepEqual(calls, [['readText', file]]);
  readers[0].onload({target: {result: '{"trades":[]}'}});
  assert.deepEqual(calls.map(call => call[0]), ['readText', 'validate', 'summary', 'format', 'confirm']);
  assert.strictEqual(calls[1][1], calls[2][1]);
  assert.equal(confirmations[0][0], 'Importar backup completo');
  assert.equal(confirmations[0][1], 'Este backup contém: summary.\n\nRestaurar agora?');
  assert.equal(confirmations[0][3].confirmText, 'Importar backup');
  confirmations[0][2]();
  assert.deepEqual(calls.slice(5).map(call => call[0]), ['restore', 'save', 'refresh', 'payload', 'summary', 'notice']);
  assert.strictEqual(calls[5][1], calls[1][1]);
});

test('JSON read errors become notices while deferred restoration errors propagate', () => {
  const {context, calls, readers, confirmations} = setup();
  context.importJSON({target: {files: [{}]}});
  readers[0].onload({target: {result: '{invalid'}});
  assert.equal(calls.at(-1)[1], 'Erro ao ler backup');
  assert.equal(calls.at(-1)[3].danger, true);
  assert.equal(confirmations.length, 0);
  context.validateBackupData = () => { throw new Error('invalid backup'); };
  readers[0].onload({target: {result: '{}'}});
  assert.equal(calls.at(-1)[2], 'invalid backup');
  context.validateBackupData = () => {};
  readers[0].onload({target: {result: '{}'}});
  const failure = new Error('restore failed');
  context.restoreBackupData = () => { throw failure; };
  const length = calls.length;
  assert.throws(confirmations[0][2], error => error === failure);
  assert.equal(calls.length, length);
});

test('CSV upload uses the first file, UTF-8, completion-time account and pending preview', () => {
  const {context, calls, readers, prepared} = setup();
  context.handleCSVUpload({target: {}});
  assert.equal(readers.length, 0);
  const file = {name: 'trades.CSV'};
  context.handleCSVUpload({target: {files: [file, {name: 'ignored.xlsx'}]}});
  assert.deepEqual(calls, [['readText', file, 'UTF-8']]);
  context.activeAccountId = 'next';
  context.showImportPreview = rows => calls.push(['preview', rows]);
  readers[0].onload({target: {result: 'raw CSV'}});
  assert.deepEqual(calls.map(call => call[0]), ['readText', 'csv', 'prepare', 'pending', 'preview', 'open']);
  assert.deepEqual(calls[2], ['prepare', ['csv-rows'], {accountId: 'next', seedLabel: 'trades.CSV'}]);
  assert.deepEqual(calls[3][2], {accountId: 'next', source: 'csv'});
  assert.strictEqual(calls[4][1], context.pendingImport);
  assert.notStrictEqual(calls[4][1], prepared);
});

test('empty CSV shows the existing notice and CSV parser errors remain uncaught', () => {
  const {context, calls, readers} = setup();
  context.prepareImportedTrades = () => [];
  context.handleCSVUpload({target: {files: [{name: 'empty.txt'}]}});
  readers[0].onload({target: {result: null}});
  assert.deepEqual(calls[1], ['csv', '']);
  assert.deepEqual(calls.at(-1), ['notice', 'Importação', 'Nenhum trade encontrado no CSV.']);
  assert.equal(calls.some(call => call[0] === 'open'), false);
  const failure = new Error('parser failed');
  context.parseCSVText = () => { throw failure; };
  assert.throws(() => readers[0].onload({target: {result: 'bad'}}), error => error === failure);
});

test('XLSX upload waits for SheetJS, reads the first sheet and preserves conversion options', () => {
  const {context, calls, readers, tasks, nodes} = setup();
  const sheet = {}, rows = [['date']];
  context.XLSX = {read(buffer, options) { calls.push(['workbook', buffer, plain(options)]); return {SheetNames: ['first', 'second'], Sheets: {first: sheet}}; },
    utils: {sheet_to_json(input, options) { calls.push(['sheet', input, plain(options)]); return rows; }}};
  context.showImportPreview = rows => calls.push(['preview', rows]);
  const file = {name: 'trades.XLSX'};
  context.handleCSVUpload({target: {files: [file]}});
  assert.match(nodes.csvPreview.innerHTML, /Processando trades.XLSX/);
  assert.equal(readers.length, 0);
  tasks.shift()();
  assert.deepEqual(calls.at(-1), ['readBuffer', file]);
  context.activeAccountId = 'next';
  const buffer = new ArrayBuffer(8);
  readers[0].onload({target: {result: buffer}});
  assert.deepEqual(calls[2], ['workbook', buffer, {type: 'array', cellDates: true}]);
  assert.deepEqual(calls[3], ['sheet', sheet, {header: 1, defval: null, raw: false}]);
  assert.deepEqual(calls[4], ['spreadsheet', rows, 'trades.XLSX']);
  assert.deepEqual(calls[5][2], {accountId: 'next', seedLabel: 'trades.XLSX'});
  assert.deepEqual(calls[6][2], {accountId: 'next', source: 'xlsx'});
  assert.strictEqual(calls[7][1], context.pendingImport);
  assert.match(nodes.csvPreview.innerHTML, /1 trades detectados/);
  assert.deepEqual(calls.at(-1), ['open', 'csvConfirmModal']);
});

test('empty and failing XLSX keep their preview messages without changing error policy', () => {
  const {context, calls, readers, tasks, nodes} = setup();
  context.XLSX = {read() { return {SheetNames: ['sheet'], Sheets: {sheet: {}}}; }, utils: {sheet_to_json() { return []; }}};
  context.prepareImportedTrades = () => [];
  context.handleCSVUpload({target: {files: [{name: 'empty.xlsx'}]}});
  tasks.shift()();
  readers[0].onload({target: {result: new ArrayBuffer(0)}});
  assert.match(nodes.csvPreview.innerHTML, /Nenhum trade encontrado no XLSX/);
  assert.deepEqual(calls.at(-1), ['notice', 'Importação', 'Nenhum trade encontrado no XLSX.']);
  context.XLSX.read = () => { throw new Error('invalid workbook'); };
  readers[0].onload({target: {result: null}});
  assert.match(nodes.csvPreview.innerHTML, /Erro: invalid workbook/);
  delete nodes.csvPreview;
  context.handleCSVUpload({target: {files: [{name: 'missing-preview.xlsx'}]}});
  tasks.shift()();
  assert.doesNotThrow(() => readers[1].onload({target: {result: null}}));
});

test('MT4 text import keeps blank/empty guards and previews the prepared list directly', () => {
  const {context, calls, nodes, prepared} = setup();
  context.parseMT4();
  assert.deepEqual(calls.map(call => call[0]), ['notice']);
  nodes.mt4Input.value = ' raw report ';
  context.showImportPreview = rows => calls.push(['preview', rows]);
  calls.length = 0;
  context.parseMT4();
  assert.deepEqual(calls.map(call => call[0]), ['mt4', 'prepare', 'pending', 'preview', 'open']);
  assert.deepEqual(calls[0], ['mt4', ' raw report ']);
  assert.deepEqual(calls[1][2], {accountId: 'active', seedLabel: 'mt4-text'});
  assert.strictEqual(calls[3][1], prepared);
  context.prepareImportedTrades = () => [];
  calls.length = 0;
  context.parseMT4();
  assert.deepEqual(calls.map(call => call[0]), ['mt4', 'notice']);
});

test('preview updates count before its guard and retains account escaping and the 80-row cap', () => {
  const {context, nodes} = setup();
  delete nodes.csvConfirmPreview;
  context.getPendingImportAccountId = () => { throw new Error('must not resolve account'); };
  context.showImportPreview([{}]);
  assert.equal(nodes.importCount.textContent, '1');
  nodes.csvConfirmPreview = {};
  context.getPendingImportAccountId = () => 'active';
  const rows = Array.from({length: 81}, (_, index) => ({date: '2024-01-01', symbol: `ROW${index}`, direction: 'BUY', status: 'WIN', incomplete: index === 80, pnl: 0}));
  context.showImportPreview(rows);
  const html = nodes.csvConfirmPreview.innerHTML;
  assert.equal(nodes.importCount.textContent, '81');
  assert.match(html, /&lt;Account&gt;/);
  assert.match(html, /1 incompletos/);
  assert.match(html, /ROW79/);
  assert.doesNotMatch(html, /ROW80/);
  assert.match(html, /mais 1 trades/);
  assert.match(html, />\+0<\/td>/);
});

test('confirmation deduplicates positions and ids before prepending, saving and opening incomplete trades', () => {
  const {context, calls, tasks} = setup();
  const old = {id: 'old', position: 'old-position'};
  const first = {id: 'new', position: 'new-position', incomplete: true, date: '2024-02-02'};
  const second = {id: 'second', incomplete: true, date: '2024-01-01'};
  const complete = {id: 'complete'};
  context.trades = [old];
  const pending = [{id: 'skip-position', position: 'old-position'}, {id: 'old', position: 'new-position'}, first,
    {id: 'skip-duplicate-position', position: 'new-position'}, {id: 'new'}, second, complete];
  context.pendingImport = pending;
  context.confirmImport();
  assert.deepEqual(Array.from(context.trades), [first, second, complete, old]);
  assert.strictEqual(context.trades[0], first);
  assert.equal(pending.length, 7);
  assert.equal(context.pendingImport.length, 0);
  assert.equal(context._incompleteBannerDismissed, false);
  assert.deepEqual(calls.map(call => call[0]), ['clear', 'save', 'close', 'refresh', 'notice', 'timer']);
  assert.match(calls[4][2], /3 trades importados.*2 precisam/);
  assert.deepEqual(calls.at(-1), ['timer', 600]);
  tasks[0]();
  assert.deepEqual(calls.slice(-2), [['page', 'log'], ['bulk', ['second', 'new']]]);
});

test('confirmation preserves zero-import save behavior and partial mutations on save failure', () => {
  const {context, calls, tasks} = setup();
  context.confirmImport();
  assert.deepEqual(calls.map(call => call[0]), ['clear', 'save', 'close', 'refresh', 'notice']);
  assert.match(calls.at(-1)[2], /0 trades importados/);
  assert.equal(tasks.length, 0);
  const item = {id: 'new'};
  context.pendingImport = [item];
  context._incompleteBannerDismissed = true;
  const failure = new Error('save failed');
  context.save = () => { throw failure; };
  calls.length = 0;
  assert.throws(() => context.confirmImport(), error => error === failure);
  assert.strictEqual(context.trades[0], item);
  assert.equal(context.pendingImport.length, 0);
  assert.equal(context._incompleteBannerDismissed, false);
  assert.deepEqual(calls.map(call => call[0]), ['clear']);
});

test('confirmation reads pending records after scanning existing positions and ids', () => {
  const {context} = setup();
  const candidate = {id: 'current'};
  const existing = {get id() { context.pendingImport = [candidate]; return 'existing'; }};
  context.trades = [existing];
  context.pendingImport = [{id: 'stale'}];
  context.confirmImport();
  assert.strictEqual(context.trades[0], candidate);
  assert.strictEqual(context.trades[1], existing);
});

test('import handlers remain classic globals and initialize without reading state or IO', () => {
  assert.ok(fs.existsSync(moduleFile));
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'FileReader', 'XLSX', 'fetch', 'pendingImport', 'trades', 'activeAccountId']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`unexpected initialization access: ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  for (const name of names) {
    assert.equal(typeof context[name], 'function');
    assert.doesNotMatch(app, new RegExp(`^function ${name}\\(`, 'm'));
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const index = scripts.findIndex(script => script.src === modulePath);
  assert.ok(index > scripts.findIndex(script => script.src === 'src/modules/data-transfer/application/restore-backup.js'));
  assert.ok(index < scripts.findIndex(script => script.src === 'app.js'));
});
