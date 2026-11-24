/*
 * Objetivo: Testar a renderizacao completa da pagina de documentos (`renderDocumentsPage`),
 * abrangendo arvore de pastas, lista de entradas, editor, contexto de trade vinculado e midia.
 * Modulo/arquivo testado: funcao `renderDocumentsPage` em
 * `src/modules/documents/presentation/documents-page.js` (confirmando existencia do modulo e
 * remocao da declaracao legada em `app.js`).
 * Estrategia de isolamento: executa apenas `renderDocumentsPage` em `node:vm` com 13 nos DOM
 * simulados (permitindo omitir elementos especificos via `missing`), estado de pasta/documento
 * ativo e mocks rastreaveis para consultas de pastas, entradas, midia e trades.
 * Pontos-chave garantidos: auto-selecao da primeira entrada, fallback de pasta/ID invalidos para
 * `generalNotes`, preview com remocao de marcacao Markdown e escape HTML, modo somente-leitura
 * no titulo de documentos de trade com painel de contexto, guarda de no ausente no editor e
 * carregamento sincrono antes de `app.js`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/documents/presentation/documents-page.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderDocumentsPage\([^]*?^\}/m)?.[0];
assert.ok(fs.existsSync(path.join(root, modulePath)), 'extracted documents renderer must exist');
assert.ok(!legacy, 'legacy declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = ["renderDocumentsPage"].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

/*
 * Fabrica de harness em sandbox: instancia os 13 elementos DOM da pagina de documentos (menos os
 * indicados em `missing`), define `activeDocFolder` e `activeDocId` no contexto `vm`, injeta
 * mocks de pastas/entradas/midia/trades e devolve `{context, nodes, calls}`.
 */
function harness({folder = 'generalNotes', selected = null, entries = [], folders, trade = null, missing = []} = {}) {
  const ids = ['docFolders', 'docCreateBtn', 'docDeleteBtn', 'docListTitle', 'docListCount', 'docEntries',
    'docEditorHeading', 'docEditorMeta', 'docEditorTitle', 'docEditorBody', 'docMedia', 'docOpenTradeBtn', 'docTradeContext'];
  const nodes = Object.fromEntries(ids.filter(id => !missing.includes(id)).map(id => [id, {
    innerHTML: 'old', textContent: 'old', value: 'old', disabled: false, style: {display: 'old'},
  }]));
  const calls = [];
  const folderRows = folders ?? [
    {id: 'generalNotes', label: 'Anotações', desc: 'Gerais', icon: 'note', count: entries.length},
    {id: 'tradeNotes', label: 'Trades', desc: 'Operações', icon: 'trade', count: 0},
  ];
  const context = vm.createContext({
    document: {getElementById(id) { return nodes[id] ?? null; }},
    getDocumentFolders() { calls.push('folders'); return folderRows; },
    getDocumentEntries(id) { calls.push(['entries', id]); return entries; },
    getCurrentDocumentEntry() { calls.push('current'); return entries.find(entry => entry.id === vm.runInContext('activeDocId', context)) ?? null; },
    getDocumentCreateLabel() { return 'Nova anotação'; },
    getDocumentCreateDesc() { return 'Criar documento'; },
    renderDocFolderIcon(icon) { return `<i>${icon}</i>`; },
    renderDocumentMedia(entry) { calls.push(['media', entry.id]); return '<div>mídia</div>'; },
    getAccountTrades() { return trade ? [trade] : []; },
    activeAccountId: 'a',
    fR(value) { return `R:${value}`; },
    escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;'); },
  });
  vm.runInContext(`let activeDocFolder=${JSON.stringify(folder)}; let activeDocId=${JSON.stringify(selected)};`, context);
  const mocks = Object.fromEntries(['getDocumentFolders', 'getDocumentEntries', 'getCurrentDocumentEntry', 'getDocumentCreateLabel', 'getDocumentCreateDesc'].map(name => [name, context[name]]));
  vm.runInContext(source, context, {filename: modulePath});
  Object.assign(context, mocks);
  return {context, nodes, calls};
}

/*
 * Documentos gerais: seleciona automaticamente a primeira entrada quando `activeDocId` e nulo,
 * renderiza pastas e botao de criacao, escapa HTML no titulo da lista, limpa marcadores Markdown
 * no preview (`Texto importante…`), usa singular `'1 item'`, habilita titulo/corpo, oculta botao
 * de abrir trade e renderiza a midia da entrada.
 */
test('general documents select the first entry and render folder, list and editor', () => {
  const entry = {id: 'general:1', kind: 'general', title: 'Plano <A', meta: 'Hoje', body: 'Texto **importante**', hasContent: true};
  const {context, nodes, calls} = harness({entries: [entry]});
  vm.runInContext('renderDocumentsPage()', context);
  assert.equal(vm.runInContext('activeDocId', context), 'general:1');
  assert.match(nodes.docFolders.innerHTML, /Anotações[\s\S]*Nova anotação/);
  assert.match(nodes.docEntries.innerHTML, /Plano &lt;A/);
  assert.match(nodes.docEntries.innerHTML, /Texto importante…/);
  assert.equal(nodes.docListCount.textContent, '1 item');
  assert.equal(nodes.docEditorHeading.textContent, 'Plano <A');
  assert.equal(nodes.docEditorBody.value, 'Texto **importante**');
  assert.equal(nodes.docEditorTitle.disabled, false);
  assert.equal(nodes.docOpenTradeBtn.style.display, 'none');
  assert.equal(nodes.docMedia.innerHTML, '<div>mídia</div>');
  assert.deepEqual(calls.filter(call => Array.isArray(call) && call[0] === 'media'), [['media', 'general:1']]);
});

/*
 * Fallback para pasta e selecao invalidas: corrige `activeDocFolder` para `'generalNotes'` e
 * `activeDocId` para `null`, exibe `'0 itens'` e estado vazio na lista/editor, desabilita o corpo,
 * mostra mensagem padrao de midia vazia e mantem `docTradeContext` inalterado.
 */
test('invalid folder and selection fall back to empty general documents', () => {
  const {context, nodes, calls} = harness({folder: 'missing', selected: 'gone'});
  vm.runInContext('renderDocumentsPage()', context);
  assert.equal(vm.runInContext('activeDocFolder', context), 'generalNotes');
  assert.equal(vm.runInContext('activeDocId', context), null);
  assert.deepEqual(calls.find(call => Array.isArray(call) && call[0] === 'entries'), ['entries', 'generalNotes']);
  assert.equal(nodes.docListCount.textContent, '0 itens');
  assert.match(nodes.docEntries.innerHTML, /Nenhum documento ainda/);
  assert.equal(nodes.docEditorHeading.textContent, 'Nenhum documento selecionado');
  assert.equal(nodes.docEditorTitle.value, '');
  assert.equal(nodes.docEditorBody.disabled, true);
  assert.equal(nodes.docMedia.innerHTML, '<div class="doc-media-empty">Nenhuma mídia vinculada.</div>');
  assert.equal(nodes.docTradeContext.style.display, 'old');
});

/*
 * Documento vinculado a trade: oculta botoes de criacao/exclusao, bloqueia edicao do titulo
 * mantendo o corpo editavel, exibe `docOpenTradeBtn` e o banner `docTradeContext` com simbolo
 * escapado, R/P/L com sinal positivo e badge de status na listagem.
 */
test('trade document keeps editor read-only title and linked trade context', () => {
  const entry = {id: 'trade:7', kind: 'trade', title: 'Trade', meta: 'Hoje', body: 'Análise', tradeId: 7, status: 'WIN'};
  const trade = {id: 7, status: 'WIN', symbol: 'EUR<USD', direction: 'LONG', entry: 1.2, r: 1.5, pnl: 42, strategy: 'Plano A'};
  const {context, nodes} = harness({folder: 'tradeNotes', entries: [entry], trade});
  vm.runInContext('renderDocumentsPage()', context);
  assert.equal(nodes.docCreateBtn.style.display, 'none');
  assert.equal(nodes.docDeleteBtn.style.display, 'none');
  assert.equal(nodes.docEditorTitle.disabled, true);
  assert.equal(nodes.docEditorBody.disabled, false);
  assert.equal(nodes.docOpenTradeBtn.style.display, 'inline-flex');
  assert.equal(nodes.docTradeContext.style.display, 'flex');
  assert.match(nodes.docTradeContext.innerHTML, /EUR&lt;USD/);
  assert.match(nodes.docTradeContext.innerHTML, /\+1\.50R/);
  assert.match(nodes.docTradeContext.innerHTML, /\+R:42/);
  assert.match(nodes.docEntries.innerHTML, /doc-entry-badge/);
});

/*
 * Guarda de editor ausente: se `#docEditorBody` nao existir no DOM, a lista ainda e renderizada,
 * mas a funcao retorna antes de atualizar `#docMedia` ou invocar `renderDocumentMedia`.
 */
test('missing editor node returns after list rendering without media or trade work', () => {
  const entry = {id: 'general:1', kind: 'general', title: 'Nota', meta: 'Hoje', body: 'Texto'};
  const {context, nodes, calls} = harness({entries: [entry], missing: ['docEditorBody']});
  assert.equal(vm.runInContext('renderDocumentsPage()', context), undefined);
  assert.match(nodes.docEntries.innerHTML, /Nota/);
  assert.equal(nodes.docMedia.innerHTML, 'old');
  assert.equal(calls.some(call => Array.isArray(call) && call[0] === 'media'), false);
});

/*
 * Contrato de carregamento: confirma script classico sincrono unico em `index.html` antes de `app.js`.
 */
test('extracted documents renderer stays a synchronous classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map(match => ({attributes: match[1], src: match[1].match(/\bsrc="([^"]+)"/)?.[1]}))
    .filter(script => script.src && !script.src.startsWith('https://'));
  assert.equal(scripts.filter(script => script.src === modulePath).length, 1);
  const index = scripts.findIndex(script => script.src === modulePath);
  assert.ok(index < scripts.findIndex(script => script.src === 'app.js'));
  assert.doesNotMatch(scripts[index].attributes, /\b(?:async|defer|type="module")\b/i);
});