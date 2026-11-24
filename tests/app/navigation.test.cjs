/*
 * Objetivo do arquivo:
 *   Testar a navegacao entre paginas, o controle da barra lateral (sidebar) e a
 *   atualizacao global da interface (refreshAll, toggleSidebar e showPage).
 *
 * Modulo/arquivo testado:
 *   Funcoes refreshAll, toggleSidebar e showPage em
 *   src/app/presentation/app-workspace.js (verificando tambem que nao ha declaracoes
 *   legadas restantes em app.js).
 *
 * Estrategia de isolamento:
 *   Carrega apenas as tres funcoes em uma sandbox node:vm contendo todas as 14
 *   paginas e itens de menu simulados, stubs para todos os renderizadores de modulo e
 *   espias para sincronizacao de conta, topbar, banner de incompletos e reset de
 *   simulacao.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - refreshAll() renderiza a pagina ativa (ou dashboard como fallback) e em seguida
 *     atualiza o chrome compartilhado na ordem exata: conta -> trades -> sync ->
 *     topbar -> banner.
 *   - toggleSidebar() alterna 'open'/'show' simultaneamente, aceita parametro force e
 *     e seguro (no-op) quando os elementos da sidebar nao existem no DOM.
 *   - showPage() atualiza classes .active de pagina e menu, fecha a sidebar e executa
 *     ganchos especificos (resetar dashPeriod para 'all' no dashboard e resetar
 *     defaults de simulacao ao abrir stats com a aba de simulacao visivel).
 *   - Paginas desconhecidas limpam estados ativos sem chamar nenhum renderizador.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/app/presentation/app-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['refreshAll', 'toggleSidebar', 'showPage'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = legacy ?? ["refreshAll", "toggleSidebar", "showPage"].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');
const pageIds = ['dashboard', 'log', 'calendar', 'stats', 'psych', 'setup', 'premarket', 'strategyHub', 'studyHub', 'documents', 'notifications', 'accounts', 'partners', 'profile'];

// Simulador de classList com suporte a add, remove, contains e toggle(name, force).
function classList(initial = []) {
  const classes = new Set(initial);
  return {
    add: name => classes.add(name),
    remove: name => classes.delete(name),
    contains: name => classes.has(name),
    toggle(name, force) {
      const enabled = force === undefined ? !classes.has(name) : force;
      if (enabled) classes.add(name); else classes.delete(name);
      return enabled;
    },
  };
}

// Monta o DOM simulado de navegacao (paginas, itens .nav-item com onclick, sidebar,
// overlay, seletor de periodo e aba de simulacao) junto com todos os renderizadores
// espiados.
function setup({activePage = 'dashboard', includeSidebar = true, simulationVisible = false} = {}) {
  const pages = pageIds.map(id => ({id: `page-${id}`, classList: classList(id === activePage ? ['active'] : [])}));
  const navItems = pageIds.map(id => ({
    id, classList: classList(id === activePage ? ['active'] : []),
    getAttribute: name => name === 'onclick' ? `showPage('${id}')` : null,
  }));
  const sidebar = includeSidebar ? {classList: classList()} : null;
  const overlay = includeSidebar ? {classList: classList()} : null;
  const elements = Object.fromEntries(pages.map(page => [page.id, page]));
  Object.assign(elements, {
    sidebar,
    'sidebar-overlay': overlay,
    dashPeriod: {value: 'week'},
    'statTab-simulation': {style: {display: simulationVisible ? 'block' : 'none'}},
  });
  const calls = [];
  const renderers = Object.fromEntries(pageIds.map(id => [`render${id[0].toUpperCase()}${id.slice(1)}`, () => calls.push(id)]));
  Object.assign(renderers, {
    renderLog: () => calls.push('log'), renderCalendar: () => calls.push('calendar'), renderStats: () => calls.push('stats'),
    renderPsych: () => calls.push('psych'), renderSetup: () => calls.push('setup'), renderPremarket: () => calls.push('premarket'),
    renderStrategyHub: () => calls.push('strategyHub'), renderStudyHub: () => calls.push('studyHub'),
    renderDocumentsPage: () => calls.push('documents'), renderNotificationsPage: () => calls.push('notifications'),
    renderAccountsPage: () => calls.push('accounts'), renderPartnersPage: () => calls.push('partners'),
    renderProfilePage: () => calls.push('profile'),
  });
  const account = {id: 'a1'};
  const context = vm.createContext({
    document: {
      querySelector: selector => selector === '.page.active' ? pages.find(page => page.classList.contains('active')) ?? null : null,
      querySelectorAll: selector => selector === '.page' ? pages : selector === '.nav-item' ? navItems : [],
      getElementById: id => elements[id] ?? null,
    },
    ...renderers,
    getActiveAccount: () => { calls.push('getActiveAccount'); return account; },
    getAccountTrades: id => { calls.push(`getAccountTrades:${id}`); return ['trade']; },
    syncAccountBalanceChrome: (nextAccount, trades) => calls.push(['sync', nextAccount, trades]),
    updateTopbarStats: () => calls.push('topbar'),
    updateIncompleteBanner: () => calls.push('banner'),
    resetSimulationEntryDefaults: () => calls.push('resetSimulation'),
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#navigation' : modulePath});
  return {context, pages, navItems, sidebar, overlay, elements, calls, account};
}

// Verifica que refreshAll() despacha primeiro o renderizador da pagina ativa ('log')
// e depois sincroniza conta ativa, trades da conta, saldo no chrome, topbar e banner.
test('refresh dispatches the active page then updates shared account chrome in order', () => {
  const {context, calls, account} = setup({activePage: 'log'});
  context.refreshAll();
  assert.deepEqual(calls, [
    'log', 'getActiveAccount', 'getAccountTrades:a1', ['sync', account, ['trade']], 'topbar', 'banner',
  ]);
});

// Testa dois casos de borda em refreshAll(): sem nenhuma pagina ativa usa 'dashboard'
// como padrao; com uma pagina desconhecida ativa, pula o renderizador mas ainda
// atualiza o chrome.
test('refresh defaults to dashboard and unknown pages still update shared chrome', () => {
  const missing = setup({activePage: null});
  missing.context.refreshAll();
  assert.equal(missing.calls[0], 'dashboard');
  const unknown = setup({activePage: null});
  unknown.pages.push({id: 'page-unknown', classList: classList(['active'])});
  unknown.context.refreshAll();
  assert.deepEqual(unknown.calls.slice(0, 2), ['getActiveAccount', 'getAccountTrades:a1']);
});

// Valida alternancia da sidebar e overlay (sem argumento alterna; com false fecha
// ambos) e confirma retorno seguro quando sidebar/overlay nao existem no DOM.
test('sidebar toggles current state, accepts force and requires both elements', () => {
  const present = setup();
  present.context.toggleSidebar();
  assert.equal(present.sidebar.classList.contains('open'), true);
  assert.equal(present.overlay.classList.contains('show'), true);
  present.context.toggleSidebar(false);
  assert.equal(present.sidebar.classList.contains('open'), false);
  assert.equal(present.overlay.classList.contains('show'), false);
  const missing = setup({includeSidebar: false});
  assert.equal(missing.context.toggleSidebar(true), undefined);
});

// Garante que showPage('calendar') desativa a pagina anterior, ativa apenas a nova
// pagina e seu item correspondente no menu, invoca renderCalendar() e fecha a sidebar
// aberta.
test('show page switches page and nav classes, dispatches renderer and closes sidebar', () => {
  const {context, pages, navItems, sidebar, calls} = setup({activePage: 'dashboard'});
  sidebar.classList.add('open');
  context.showPage('calendar');
  assert.equal(pages.find(page => page.id === 'page-dashboard').classList.contains('active'), false);
  assert.equal(pages.find(page => page.id === 'page-calendar').classList.contains('active'), true);
  assert.equal(navItems.find(item => item.id === 'calendar').classList.contains('active'), true);
  assert.equal(navItems.filter(item => item.classList.contains('active')).length, 1);
  assert.deepEqual(calls, ['calendar']);
  assert.equal(sidebar.classList.contains('open'), false);
});

// Testa efeitos especificos por pagina: abrir 'dashboard' redefine dashPeriod para
// 'all'; abrir 'stats' quando statTab-simulation esta visivel chama
// resetSimulationEntryDefaults antes de renderStats.
test('dashboard resets period while simulation stats resets entry defaults before render', () => {
  const dashboard = setup({activePage: 'log'});
  dashboard.context.showPage('dashboard');
  assert.equal(dashboard.elements.dashPeriod.value, 'all');
  assert.deepEqual(dashboard.calls, ['dashboard']);
  const stats = setup({activePage: 'log', simulationVisible: true});
  stats.context.showPage('stats');
  assert.deepEqual(stats.calls, ['resetSimulation', 'stats']);
});

// Quando um ID de pagina inexistente e solicitado, limpa .active de todas as paginas
// e itens de navegacao sem acionar nenhum renderizador.
test('unknown page clears active state and only closes the sidebar', () => {
  const {context, pages, navItems, calls} = setup({activePage: 'dashboard'});
  context.showPage('missing');
  assert.equal(pages.some(page => page.classList.contains('active')), false);
  assert.equal(navItems.some(item => item.classList.contains('active')), false);
  assert.deepEqual(calls, []);
});

// Verifica remocao das declaracoes legadas em app.js, carregamento unico sincrono de
// app-workspace.js antes de profile-page.js e app.js, e ordem interna refreshAll ->
// showPage.
test('navigation declarations load once in the synchronous workspace before app.js', () => {
  for (const part of legacyParts) assert.equal(part, undefined);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const profileIndex = scripts.findIndex(script => script.src === 'src/modules/profile/presentation/profile-page.js');
  const navigationIndex = scripts.findIndex(script => script.src === modulePath);
  const appIndex = scripts.findIndex(script => script.src === 'app.js');
  assert.ok(navigationIndex < profileIndex && profileIndex < appIndex);
  assert.ok(moduleSource.indexOf('function refreshAll(') < moduleSource.indexOf('function showPage('));
});
