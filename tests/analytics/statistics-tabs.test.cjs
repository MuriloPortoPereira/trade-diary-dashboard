/*
 * Objetivo:
 *   Validar a navegacao entre abas da pagina de Estatisticas (`switchStatTab`), garantindo
 *   exibicao exclusiva do painel selecionado, atualizacao da classe `active` nos botoes de aba
 *   e delegacao correta para os renderizadores especificos de cada aba.
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/analytics/presentation/analytics-workspace.js` (funcao `switchStatTab`)
 *   - Remocao da declaracao legada em `app.js` e ordem de carga em `index.html`
 *
 * Estrategia de isolamento:
 *   - Extrai apenas `switchStatTab` via regex e a executa em `node:vm` com mocks de paineis
 *     (`statTab-*`), botoes (`#statTabNav .tab-btn`) com `classList` instrumentado e spies dos
 *     renderizadores (`renderStatsPsych`, `resetSimulationEntryDefaults`, `renderSimulation`, `renderStats`).
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Somente o painel correspondente a aba escolhida recebe `display = 'block'`; os demais recebem `'none'`.
 *   - A classe `'active'` e removida de todos os botoes antes de ser adicionada ao botao selecionado.
 *   - Aba `'psych'` chama exclusivamente `renderStatsPsych`.
 *   - Aba `'simulation'` executa `resetSimulationEntryDefaults` antes de `renderSimulation`.
 *   - Abas desconhecidas e paineis ausentes no DOM sao tolerados, caindo no fallback `renderStats`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Confirma a remocao de `switchStatTab` de `app.js`, extrai sua implementacao do modulo
// `analytics-workspace.js` e declara a lista canonica das 5 abas de estatisticas.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/analytics/presentation/analytics-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function switchStatTab\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = ['switchStatTab'].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');
const tabIds = ['overview', 'strategy', 'time', 'psych', 'simulation'];

// Garante em `index.html` o carregamento sincrono unico do modulo e a disponibilidade previa
// de `psychology-page.js` antes de `app.js`.
test('statistics tabs load once and psychology is available before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/modules/psychology/presentation/psychology-page.js') < html.indexOf('src="app.js"'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});

// Cria um mock simples de elemento com `classList.add` e `classList.remove` que grava cada
// manipulacao de classe no log `calls` para auditar a ordem exata das operacoes.
function createClassTarget(label, calls) {
  return {
    classList: {
      add(name) { calls.push([label, 'add', name]); },
      remove(name) { calls.push([label, 'remove', name]); },
    },
  };
}

// Auxiliar de execucao de `switchStatTab`: monta os paineis de aba (com suporte a omitir
// paineis via `missing`), cria botoes de navegacao e opcionalmente um botao clicado (`selected`),
// retornando o estado final de visibilidade dos paineis e o historico completo `calls`.
function render(id, {missing = [], selected = true} = {}) {
  const calls = [];
  const panels = Object.fromEntries(tabIds.map(tab => [tab, {style: {display: 'before'}}]));
  for (const tab of missing) panels[tab] = null;
  const buttons = [createClassTarget('button-1', calls), createClassTarget('button-2', calls)];
  const selectedElement = selected ? createClassTarget('selected', calls) : null;
  const context = vm.createContext({
    selectedTab: id,
    selectedElement,
    document: {
      getElementById(targetId) {
        calls.push(['target', targetId]);
        return panels[targetId.replace('statTab-', '')] ?? null;
      },
      querySelectorAll(selector) {
        calls.push(['buttons', selector]);
        return buttons;
      },
    },
    renderStatsPsych() { calls.push(['render', 'psych']); },
    resetSimulationEntryDefaults() { calls.push(['reset', 'simulation']); },
    renderSimulation() { calls.push(['render', 'simulation']); },
    renderStats() { calls.push(['render', 'stats']); },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('switchStatTab(selectedTab, selectedElement)', context);
  return {panels, calls};
}

// Valida a aba `'overview'`: exibe apenas seu painel, oculta os outros 4, limpa `'active'` dos
// botoes existentes, ativa o botao selecionado e chama `renderStats`.
test('overview shows only its panel, resets buttons and activates the selected control', () => {
  const {panels, calls} = render('overview');
  assert.equal(panels.overview.style.display, 'block');
  for (const tab of tabIds.slice(1)) assert.equal(panels[tab].style.display, 'none');
  assert.deepEqual(calls.slice(-4), [
    ['button-1', 'remove', 'active'],
    ['button-2', 'remove', 'active'],
    ['selected', 'add', 'active'],
    ['render', 'stats'],
  ]);
});

// Verifica que a aba `'psych'` funciona mesmo sem elemento selecionado (`selected: false`)
// e delega unicamente para `renderStatsPsych` sem disparar `renderStats` nem reset de simulacao.
test('psychology tab delegates only to the psychology renderer', () => {
  const {panels, calls} = render('psych', {selected: false});
  assert.equal(panels.psych.style.display, 'block');
  assert.deepEqual(calls.filter(call => call[0] === 'render' || call[0] === 'reset'), [
    ['render', 'psych'],
  ]);
});

// Garante que a aba `'simulation'` primeiro reseta os valores padrao de entrada da simulacao
// (`resetSimulationEntryDefaults`) e em seguida chama `renderSimulation`.
test('simulation tab resets entry defaults before rendering the simulation', () => {
  const {panels, calls} = render('simulation');
  assert.equal(panels.simulation.style.display, 'block');
  assert.deepEqual(calls.filter(call => call[0] === 'render' || call[0] === 'reset'), [
    ['reset', 'simulation'],
    ['render', 'simulation'],
  ]);
});

// Testa o caso de borda de aba desconhecida com todos os paineis ausentes no DOM: consulta
// todos os IDs esperados, limpa os botoes de `#statTabNav .tab-btn` e cai no fallback `renderStats`.
test('unknown tab tolerates missing panels and retains the general statistics fallback', () => {
  const {calls} = render('unknown', {missing: tabIds, selected: false});
  assert.deepEqual(calls.slice(0, 6), [
    ...tabIds.map(tab => ['target', `statTab-${tab}`]),
    ['buttons', '#statTabNav .tab-btn'],
  ]);
  assert.deepEqual(calls.at(-1), ['render', 'stats']);
});
