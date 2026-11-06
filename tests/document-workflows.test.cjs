const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const files = ['src/modules/documents/presentation/documents-page.js', 'app.js'];
const names = ['formatDocDate', 'normalizeDocImages', 'formatDocumentSelection', 'getDocumentEntryImages', 'setDocumentEntryImages', 'triggerDocumentImageUpload', 'addDocumentImages', 'removeDocumentImage', 'getDocumentEntries', 'getDocumentFolders', 'selectDocumentFolder', 'selectDocumentEntry', 'getCurrentDocumentEntry', 'openDocumentTrade', 'createGeneralDocument', 'createDailyDocument', 'createDocumentFromActiveFolder', 'getDocumentCreateLabel', 'getDocumentCreateDesc', 'saveCurrentDocument', 'deleteDocumentEntry', 'deleteCurrentDocument'];
const sources = files.map(file => fs.readFileSync(path.join(root, file), 'utf8'));
const declarations = names.map(name => {
  const matches = sources.map(source => source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))).filter(Boolean);
  assert.equal(matches.length, 1, name);
  return matches[0][0];
}).join('\n');
const plain = value => JSON.parse(JSON.stringify(value));
const now = '2026-11-06T12:34:56.000Z';
function setup() {
  const calls = [], readers = [], nodes = {docEditorTitle: {value: ''}, docEditorBody: {value: ''}, docImageInput: {click() {calls.push('click');}}};
  class Clock extends Date { constructor(...args) {super(...(args.length ? args : [now]));} }
  const c = vm.createContext({Date: Clock, activeAccountId: 'a', activeDocFolder: 'generalNotes', activeDocId: null,
    trades: [], preMarketData: {}, config: {generalDocs: []},
    document: {getElementById(id) {return nodes[id] || null;}},
    getAccountTrades(id) {calls.push(['account', id]); return c.trades.filter(t => t.accountId === id);},
    getOrderedTrades(rows) {calls.push('ordered'); return rows.slice().reverse();}, fR: value => `money:${value}`,
    uid: () => 'new', save() {calls.push('save');}, refreshAll() {calls.push('refresh');}, renderDocumentsPage() {calls.push('render');},
    showAppNotice(...args) {calls.push(['notice', ...args]);}, showAppConfirm(...args) {calls.push(['confirm', ...args]);},
    openModal(...args) {calls.push(['modal', ...args]);}, FileReader: class {constructor() {readers.push(this);} readAsDataURL(file) {this.file = file;}},
  });
  vm.runInContext(declarations, c);
  return {c, calls, nodes, readers};
}
test('document queries retain the three sources, filtering, projection and ordering', () => {
  const {c, calls} = setup();
  c.trades = [{id: 1, accountId: 'a', remarks: 'first', date: '2026-11-05', pnl: 0, r: 0, images: [{dataUrl: 'x'}]}, {id: 2, accountId: 'a', remarks: 'second'}, {id: 3, accountId: 'a', remarks: '  '}, {id: 4, accountId: 'b', remarks: 'foreign'}];
  const rows = c.getDocumentEntries('tradeNotes');
  assert.deepEqual(plain(rows.map(r => r.id)), ['trade:2', 'trade:1']);
  assert.equal(rows[1].meta, 'Sem estratégia · +0.00R · +money:0');
  assert.deepEqual(plain(rows[1].images), [{name: 'imagem', dataUrl: 'x'}]);
  assert.deepEqual(calls, [['account', 'a'], 'ordered']);
  c.preMarketData = {'2026-11-01': {notes: 'old', mood: 2}, '2026-11-03': {docCreatedAt: 'yes', energy: 4, stress: 1}, '2026-11-04': {notes: ' '}};
  assert.deepEqual(plain(c.getDocumentEntries('dailyNotes').map(r => [r.id, r.meta])), [['daily:2026-11-03', 'Energia 4/5 · Estresse 1/5'], ['daily:2026-11-01', 'Humor 2/5']]);
  c.config.generalDocs = [{id: 'old', content: 'two words', updatedAt: '2026-01-01'}, {id: 'new', content: '', updatedAt: '2026-02-01'}];
  assert.deepEqual(plain(c.getDocumentEntries().map(r => [r.id, r.hasContent])), [['general:new', false], ['general:old', true]]);
  assert.deepEqual(plain(c.getDocumentFolders().map(f => f.count)), [2, 2, 2]);
  assert.equal(c.formatDocDate(''), 'Sem data');
  assert.deepEqual(plain(c.normalizeDocImages(null)), []);
});
test('creation, selection, labels and linked trade preserve state and effect order', () => {
  const {c, calls} = setup();
  c.createGeneralDocument();
  assert.deepEqual(plain(c.config.generalDocs), [{id: 'new', title: 'Nova anotação geral', content: '', images: [], updatedAt: now}]);
  assert.equal(c.activeDocId, 'general:new');
  assert.deepEqual(calls, ['save', 'render']);
  c.preMarketData['2026-11-06'] = {habits: [true], notes: 'kept', docCreatedAt: 'original'};
  c.createDailyDocument();
  assert.deepEqual(plain(c.preMarketData['2026-11-06']), {habits: [true], notes: 'kept', docCreatedAt: 'original', savedAt: now});
  c.selectDocumentFolder('tradeNotes'); assert.equal(c.activeDocId, null);
  assert.equal(c.getDocumentCreateLabel(), 'Como criar');
  assert.equal(c.getDocumentCreateDesc(), 'Notas vêm do campo de observações do trade');
  c.createDocumentFromActiveFolder(); assert.equal(calls.at(-1)[0], 'notice');
  c.trades = [{id: 7, accountId: 'a', remarks: 'note'}]; c.selectDocumentEntry('trade:7'); c.openDocumentTrade();
  assert.deepEqual(calls.at(-1), ['modal', 'tradeModal', 7]);
});
test('save and delete preserve trade and routine data, timestamps and confirmation timing', () => {
  for (const kind of ['trade', 'daily', 'general']) {
    const {c, calls, nodes} = setup();
    c.trades = [{id: 7, accountId: 'a', remarks: 'old', pnl: 55, images: [{dataUrl: 'old'}]}];
    c.preMarketData = {'2026-11-06': {notes: 'old', habits: [true], mood: 3, docCreatedAt: 'created'}};
    c.config.generalDocs = [{id: 7, content: 'old', title: 'old', images: [{dataUrl: 'old'}]}];
    c.activeDocFolder = {trade: 'tradeNotes', daily: 'dailyNotes', general: 'generalNotes'}[kind];
    c.activeDocId = {trade: 'trade:7', daily: 'daily:2026-11-06', general: 'general:7'}[kind];
    nodes.docEditorTitle.value = 'edited'; nodes.docEditorBody.value = 'body';
    c.saveCurrentDocument();
    assert.deepEqual(calls.slice(-3).map(v => Array.isArray(v) ? v[0] : v), ['save', 'refresh', 'notice']);
    if (kind === 'trade') {assert.equal(c.trades[0].remarks, 'body'); assert.equal(c.trades[0].updatedAt, now);}
    if (kind === 'daily') {assert.equal(c.preMarketData['2026-11-06'].notes, 'body'); assert.equal(c.preMarketData['2026-11-06'].docCreatedAt, 'created');}
    if (kind === 'general') {assert.equal(c.config.generalDocs[0].title, 'edited'); assert.equal(c.config.generalDocs[0].content, 'body');}
    c.deleteCurrentDocument(); const confirm = calls.at(-1);
    assert.equal(confirm[0], 'confirm'); assert.deepEqual(plain(confirm[4]), {danger: true, confirmText: 'Excluir'});
    assert.notEqual(c.activeDocId, null); confirm[3](); assert.equal(c.activeDocId, null);
    assert.deepEqual(calls.slice(-3).map(v => Array.isArray(v) ? v[0] : v), ['save', 'render', 'notice']);
    assert.equal(c.trades[0].pnl, 55); assert.deepEqual(plain(c.preMarketData['2026-11-06'].habits), [true]);
    if (kind === 'trade') {assert.equal(c.trades[0].remarks, ''); assert.deepEqual(plain(c.trades[0].images), []);}
    if (kind === 'daily') {assert.equal(c.preMarketData['2026-11-06'].notes, ''); assert.equal(c.preMarketData['2026-11-06'].docCreatedAt, undefined);}
    if (kind === 'general') assert.equal(c.config.generalDocs.length, 0);
  }
});
test('missing documents and invalid deletion retain guards', () => {
  const {c, calls} = setup();
  assert.equal(c.deleteDocumentEntry(null), false);
  assert.equal(c.deleteDocumentEntry({kind: 'unknown'}), false);
  assert.equal(c.deleteDocumentEntry({kind: 'trade', tradeId: 'missing'}), false);
  assert.equal(c.deleteDocumentEntry({kind: 'daily', date: 'missing'}), false);
  assert.equal(c.deleteDocumentEntry({kind: 'general', docId: 'missing'}), false);
  c.saveCurrentDocument(); c.deleteCurrentDocument(); c.triggerDocumentImageUpload();
  assert.deepEqual(calls.map(v => v[0]), ['notice', 'notice', 'notice']);
});
test('formatting preserves selection, multiline prefixes, fallback caret and disabled guard', () => {
  const {c, nodes} = setup(); const editor = nodes.docEditorBody;
  editor.setRangeText = function(text, start, end, mode) {assert.equal(mode, 'end'); this.value = this.value.slice(0, start) + text + this.value.slice(end);};
  editor.setSelectionRange = function(start, end) {this.range = [start, end];}; editor.focus = function() {this.focused = true;};
  for (const [type, expected] of [['bold', '**a\nb**'], ['italic', '_a\nb_'], ['underline', '<u>a\nb</u>'], ['h1', '# a\n# b'], ['h2', '## a\n## b'], ['list', '- a\n- b'], ['quote', '> a\n> b'], ['unknown', 'a\nb']]) {
    editor.value = 'a\nb'; editor.selectionStart = 0; editor.selectionEnd = 3; c.formatDocumentSelection(type); assert.equal(editor.value, expected);
  }
  editor.value = ''; editor.selectionEnd = 0; c.formatDocumentSelection('bold'); assert.equal(editor.value, '**texto em negrito**'); assert.deepEqual(editor.range, [2, 18]);
  editor.disabled = true; c.formatDocumentSelection('italic'); assert.equal(editor.value, '**texto em negrito**');
});
test('asynchronous uploads capture original entry and append in callback order after selection changes', () => {
  const {c, calls, readers} = setup();
  c.config.generalDocs = [{id: 'a', images: [{dataUrl: 'initial'}]}, {id: 'b', images: []}]; c.activeDocId = 'general:a';
  c.triggerDocumentImageUpload(); assert.equal(calls.at(-1), 'click');
  const target = {files: [{name: 'first', type: 'image/png'}, {name: 'skip', type: 'text/plain'}, {name: 'second', type: 'image/jpeg'}], value: 'selected'};
  c.addDocumentImages({target}); assert.equal(target.value, ''); assert.equal(readers.length, 2);
  c.activeDocId = 'general:b'; readers[1].onload({target: {result: 'second-url'}}); readers[0].onload({target: {result: 'first-url'}});
  assert.deepEqual(plain(c.config.generalDocs[0].images), [{name: 'imagem', dataUrl: 'initial'}, {name: 'second', dataUrl: 'second-url'}, {name: 'first', dataUrl: 'first-url'}]);
  assert.deepEqual(plain(c.config.generalDocs[1].images), []); assert.equal(c.config.generalDocs[0].updatedAt, now);
  assert.deepEqual(calls.slice(-4), ['save', 'render', 'save', 'render']);
  c.activeDocId = 'general:a'; c.removeDocumentImage(1); assert.equal(c.config.generalDocs[0].images.length, 2);
});
test('media setters preserve unrelated fields and timestamp each source', () => {
  const {c} = setup(); c.trades = [{id: 1, pnl: 9}]; c.preMarketData = {day: {habits: [true]}}; c.config.generalDocs = [{id: 1, content: 'keep'}];
  const images = [{dataUrl: 'url', extra: 'drop'}];
  for (const entry of [{kind: 'trade', tradeId: 1}, {kind: 'daily', date: 'day'}, {kind: 'general', docId: 1}]) c.setDocumentEntryImages(entry, images);
  assert.equal(c.trades[0].pnl, 9); assert.equal(c.trades[0].updatedAt, now); assert.equal(c.preMarketData.day.savedAt, now); assert.equal(c.config.generalDocs[0].content, 'keep');
  assert.deepEqual(plain(c.preMarketData.day.images), [{name: 'imagem', dataUrl: 'url'}]);
  c.setDocumentEntryImages(null, images); c.setDocumentEntryImages({kind: 'daily', date: 'new'}, images); assert.equal(c.preMarketData.new.savedAt, now);
});
test('trade and daily uploads keep their original target when the selected folder changes', () => {
  for (const kind of ['trade', 'daily']) {
    const {c, readers} = setup();
    c.trades = [{id: 1, accountId: 'a', remarks: 'note', pnl: 8}];
    c.preMarketData = {day: {notes: 'note', habits: [true]}};
    c.activeDocFolder = kind === 'trade' ? 'tradeNotes' : 'dailyNotes';
    c.activeDocId = kind === 'trade' ? 'trade:1' : 'daily:day';
    c.addDocumentImages({target: {files: [{type: 'image/png', name: 'captured'}], value: 'input'}});
    c.selectDocumentFolder('generalNotes');
    readers[0].onload({target: {result: 'captured-url'}});
    const original = kind === 'trade' ? c.trades[0] : c.preMarketData.day;
    assert.deepEqual(plain(original.images), [{name: 'captured', dataUrl: 'captured-url'}]);
    assert.equal(kind === 'trade' ? original.pnl : original.habits[0], kind === 'trade' ? 8 : true);
    assert.equal(c.config.generalDocs.length, 0);
  }
});
