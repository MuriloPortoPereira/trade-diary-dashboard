/*
 * Objetivo do arquivo:
 *   Validar o contrato arquitetural de scripts classicos no index.html, assegurando
 *   que todos os scripts locais existem, sao unicos, executam de forma sincrona,
 *   compilam sem colisoes de escopo global e respeitam a ordem de dependencias.
 *
 * Modulo/arquivo testado:
 *   index.html e toda a cadeia de scripts locais carregados pela aplicacao.
 *
 * Estrategia de isolamento:
 *   Inspecao estatica do HTML e compilacao via new vm.Script (sem executar efeitos
 *   de DOM ou rede), validando sintaxe individual, sintaxe concatenada no mesmo escopo
 *   lexico global e grafo de precedencia entre provedores e consumidores.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Nenhum script local duplicado, fora da raiz do projeto, inexistente ou com
 *     atributos async/defer/nomodule/type="module".
 *   - Ausencia de redeclaracoes conflitantes (const/let/class) no escopo global compartilhado.
 *   - Todos os namespaces globalThis.TradeDiary* possuem um unico provedor carregado
 *     antes de qualquer consumidor.
 *   - Precedencia obrigatoria para catalogos de idiomas, persistencia/bootstrap,
 *     workspace, simulacao, analytics, trades e modulos do StudyHub.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
  attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
})).filter(script => script.src && !/^(?:https?:)?\/\//i.test(script.src));
// Le o codigo-fonte de todos os scripts locais listados no index.html na ordem declarada.
const sources = () => scripts.map(script => ({...script, source:fs.readFileSync(path.join(root, script.src), 'utf8')}));
// Assercao auxiliar que garante que ambos os scripts existem no index.html e que o
// provedor aparece estritamente antes do consumidor na ordem de carregamento.
function before(provider, consumer) {
  const a = scripts.findIndex(script => script.src === provider), b = scripts.findIndex(script => script.src === consumer);
  assert.ok(a >= 0, `Missing provider: ${provider}`); assert.ok(b >= 0, `Missing consumer: ${consumer}`);
  assert.ok(a < b, `${provider} must precede ${consumer}`);
}
// Verifica que cada tag <script> local aponta para um arquivo real dentro da raiz do
// repositorio, sem duplicatas e em modo classico sincrono (sem async/defer/module).
test('local scripts are unique existing files with synchronous classic execution', () => {
  assert.ok(scripts.length); const seen = new Set();
  for (const script of scripts) {
    const file = path.resolve(root, script.src);
    assert.ok(file.startsWith(root + path.sep), script.src); assert.ok(!seen.has(file), `Duplicate: ${script.src}`);
    seen.add(file); assert.ok(fs.statSync(file).isFile(), script.src);
    assert.doesNotMatch(script.attributes, /\s(?:async|defer|nomodule)(?=\s|=|$)/i, script.src);
    const type = script.attributes.match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/i);
    assert.ok(['','text/javascript','application/javascript'].includes(type ? (type[1] ?? type[2] ?? type[3]).toLowerCase() : ''), script.src);
  }
});
// Compila cada arquivo isoladamente e depois todos juntos em uma unica unidade para
// detectar erros de sintaxe e colisoes de identificadores no escopo lexico global.
test('scripts compile individually and share a compatible global lexical scope', () => {
  const files = sources();
  for (const file of files) new vm.Script(file.source, {filename:file.src});
  // Compila todas as declaracoes juntas; execucao de DOM e bootstrap pertencem ao smoke de navegador.
  new vm.Script(files.map(file => `\n;\n${file.source}\n`).join(''), {filename:'classic-sequence.js'});
});
// Audita o padrao de namespaces globalThis.TradeDiary*: cada namespace deve ser definido
// uma unica vez, toda referencia deve possuir provedor valido e todo provedor deve vir antes.
test('namespace providers exist once and precede their consumers', () => {
  const files = sources(), providers = new Map();
  for (const file of files) for (const match of file.source.matchAll(/\bglobalThis\.(TradeDiary\w+)\s*=/g)) {
    assert.ok(!providers.has(match[1]), `Duplicate provider: ${match[1]}`); providers.set(match[1],file.src);
  }
  assert.ok(providers.size);
  for (const file of files) for (const match of file.source.matchAll(/\bTradeDiary[A-Za-z0-9_$]+\b/g)) {
    assert.ok(providers.has(match[0]), `Missing provider: ${match[0]} (${file.src})`);
  }
  for (const [name,provider] of providers) for (const file of files) {
    if (file.src !== provider && new RegExp(`\\b${name}\\b`).test(file.source)) before(provider,file.src);
  }
});
// Verifica as arestas criticas de ordenacao entre modulos no index.html: catalogos de
// traducao, persistencia -> load -> bootstrap, dominio -> apresentacao e pipeline do StudyHub.
test('bootstrap, locale catalogs and StudyHub preserve critical registration order', () => {
  const pref = 'src/modules/preferences/presentation/';
  for (const script of scripts.filter(script => script.src.startsWith(pref + 'locales/'))) {
    before(pref + 'translation-catalog.js',script.src); before(script.src,pref + 'language-selector.js');
  }
  before('src/app/infrastructure/app-state-storage.js','src/app/application/load-app-state.js');
  before('src/app/application/load-app-state.js','src/app/application/bootstrap-app.js');
  // Scripts de workspace registram funcoes; o bootstrap as invoca depois que o estado da aplicacao existe.
  before('src/app/presentation/app-workspace.js','app.js');
  before('src/modules/simulation/domain/simulation-calculations.js','src/modules/simulation/presentation/simulation-panel.js');
  before('src/modules/simulation/presentation/simulation-panel.js','app.js');
  before('src/modules/analytics/application/strategy-analysis.js','app.js');
  before('src/modules/analytics/presentation/analytics-workspace.js','app.js');
  before('src/modules/trades/presentation/trade-form.js','src/modules/trades/presentation/trade-log.js');
  const study = 'src/modules/study-hub/', runtime = study + 'presentation/study-hub-legacy-runtime.js';
  before(study + 'application/study-hub-state.js',study + 'presentation/study-hub-page.js');
  before(study + 'presentation/study-hub-page.js','app.js');
  before('app.js',study + 'infrastructure/study-hub-storage.js'); before(study + 'infrastructure/study-hub-storage.js',runtime);
  for (const tool of ['propfirm','plan','tradesim','mental','template']) before(study + `presentation/study-hub-${tool}.js`,runtime);
  before(runtime,study + 'presentation/study-hub-intraday.js');
});
