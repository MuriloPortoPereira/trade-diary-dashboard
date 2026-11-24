/*
 * Objetivo do arquivo:
 *   Validar o fluxo completo de inicializacao (bootstrap) da aplicacao no evento
 *   'load' da janela, bem como o comportamento responsivo no evento 'resize' e o
 *   contrato de carregamento sincrono no index.html.
 *
 * Modulo/arquivo testado:
 *   src/app/application/bootstrap-app.js (com fallback de deteccao para o trecho
 *   legado de window.addEventListener('load', ...) em app.js).
 *
 * Estrategia de isolamento:
 *   Executa o codigo-fonte diretamente em um contexto isolado via node:vm,
 *   injetando uma data deterministica (FixedDate), um mock minimo de window com
 *   registro de listeners e stubs espiados para cada funcao de persistencia,
 *   normalizacao e renderizacao.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Sem dados previos, carrega dados de exemplo, cria e normaliza conta padrao,
 *     semeia os documentos gerais padrao com carimbo de data/hora consistente e
 *     inicializa a configuracao do Partner Hub na ordem exata de renderizacao.
 *   - Com estado ja existente, nao carrega dados de exemplo, remove apenas
 *     documentos em branco recem-criados automaticamente e preserva conta ativa.
 *   - No redimensionamento, fecha a sidebar apenas em telas largas (> breakpoint)
 *     e sempre recalcula a densidade da barra superior (fitTopbarDensity).
 *   - Garante que o script permanece classico, sincrono e posicionado corretamente
 *     entre app-workspace.js e app.js no index.html.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/app/application/bootstrap-app.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^window\.addEventListener\('load',\(\)=>\{[^]*?^\}\);/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

// Subclasse de Date que fixa o relogio em '2026-11-04T15:30:00.000Z' quando
// instanciada sem argumentos, tornando deterministicos os timestamps de documentos.
class FixedDate extends Date {
  constructor(value) { super(value === undefined ? '2026-11-04T15:30:00.000Z' : value); }
}

// Monta o ambiente isolado de execucao (sandbox vm) com estado inicial configuravel,
// captura de listeners registrados em window e registro cronologico de chamadas (calls).
function setup({trades = [], accounts = [], config = {}, activeAccountId = ''} = {}) {
  const calls = [];
  const listeners = {};
  const sandbox = {
    Date: FixedDate,
    trades,
    accounts,
    config,
    activeAccountId,
    window: {
      innerWidth: 1200,
      addEventListener(type, callback) { calls.push(['listen', type]); listeners[type] = callback; },
    },
    load: () => calls.push(['load']),
    loadSampleData: () => calls.push(['sample']),
    save: () => calls.push(['save']),
    normalizeAccount: account => { calls.push(['normalize', account.id]); return {...account, normalized: true}; },
    createDefaultGeneralDocuments: () => {
      calls.push(['defaultDocs']);
      const now = new FixedDate().toISOString();
      return [
        {id: 'playbook', title: 'Playbook operacional', content: 'Playbook', images: [], updatedAt: now},
        {id: 'risk-map', title: 'Mapa de risco', content: 'Mapa', images: [], updatedAt: now},
      ];
    },
    ensurePartnerHubConfig: value => { calls.push(['partner']); return {...value, partnerReady: true}; },
    toggleSidebar: value => calls.push(['sidebar', value]),
    fitTopbarDensity: () => calls.push(['fit']),
    syncCalPicker: () => calls.push(['calendar']),
    renderTopbarAccount: () => calls.push(['account']),
    updateTopbarStats: () => calls.push(['stats']),
    renderDashboard: () => calls.push(['dashboard']),
    updateIncompleteBanner: () => calls.push(['incomplete']),
    initLanguageSelector: () => calls.push(['language']),
    initCotacao: () => calls.push(['quote']),
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: legacy ? 'app.js#bootstrap' : modulePath});
  return {context, sandbox, calls, listeners};
}

// Verifica o cenario de primeiro acesso (estado vazio): antes do 'load' apenas o
// listener e registrado; ao disparar 'load', cria conta 'default' normalizada,
// gera os dois documentos padrao com timestamp fixo, inicializa parceiros e executa
// toda a cadeia de renderizacao; no 'resize' em tela larga (1200px), fecha a sidebar
// e reajusta a densidade da barra superior.
test('empty state preserves sample loading, account and document seeds, and render order', () => {
  const {context, calls, listeners} = setup();
  assert.deepEqual(calls, [['listen', 'load']]);
  listeners.load();
  assert.equal(context.accounts.length, 1);
  assert.equal(context.accounts[0].id, 'default');
  assert.equal(context.accounts[0].normalized, true);
  assert.equal(context.config.generalDocs.length, 2);
  assert.deepEqual([...context.config.generalDocs.map(doc => doc.id)], ['playbook', 'risk-map']);
  assert.equal(context.config.generalDocs.every(doc => doc.updatedAt === '2026-11-04T15:30:00.000Z'), true);
  assert.equal(context.config.partnerReady, true);
  assert.equal(context.activeAccountId, 'default');
  assert.deepEqual(calls.map(call => call[0]), [
    'listen', 'load', 'sample', 'normalize', 'defaultDocs', 'partner', 'listen',
    'calendar', 'account', 'stats', 'dashboard', 'incomplete', 'language', 'quote',
  ]);
  listeners.resize();
  assert.deepEqual(calls.slice(-2), [['sidebar', false], ['fit']]);
});

// Verifica o cenario com dados ja salvos: impede novo carregamento de dados demo,
// persiste alteracoes de higienizacao (save), remove documento vazio generico ('blank')
// mantendo tanto o customizado quanto o padrao 'playbook' mesmo vazio, preserva a conta
// ativa e, em viewport estreita (900px), executa apenas 'fit' sem tocar na sidebar.
test('existing state saves, normalizes and removes only auto-created blank documents', () => {
  const docs = [
    {id: 'blank', title: '', content: ''},
    {id: 'custom', title: 'Custom', content: 'text'},
    {id: 'playbook', title: '', content: ''},
  ];
  const {context, calls, listeners} = setup({
    trades: [{id: 'trade'}],
    accounts: [{id: 'account-a', name: 'A'}],
    config: {generalDocs: docs},
    activeAccountId: 'account-a',
  });
  listeners.load();
  assert.equal(calls.some(call => call[0] === 'sample'), false);
  assert.equal(calls.some(call => call[0] === 'save'), true);
  assert.deepEqual([...context.config.generalDocs.map(doc => doc.id)], ['custom', 'playbook']);
  assert.equal(context.activeAccountId, 'account-a');
  context.window.innerWidth = 900;
  listeners.resize();
  assert.deepEqual(calls.at(-1), ['fit']);
  assert.equal(calls.some(call => call[0] === 'sidebar'), false);
});

// Confirma no index.html que o modulo extraido de bootstrap e carregado uma unica vez
// como script classico sincrono (sem async/defer/module), apos app-workspace.js e antes de app.js.
test('bootstrap remains one synchronous classic script before navigation and app.js', () => {
  if (legacy) return;
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/app/presentation/app-workspace.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
