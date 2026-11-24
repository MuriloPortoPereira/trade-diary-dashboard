/*
 * Objetivo:
 *   Validar a renderizacao do Hub de Estrategias (`renderStrategyHub`), cobrindo cards de
 *   resumo (setup lider, setup mais fraco, estrategias positivas), tabela comparativa,
 *   delegacao para o board de linhas (`renderStrategyRows`) e lista de foco (`renderStatusList`).
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/analytics/presentation/analytics-workspace.js` (funcao `renderStrategyHub`)
 *   - Existencia do modulo, remocao do legado em `app.js` e adjacencia de scripts em `index.html`
 *
 * Estrategia de isolamento:
 *   - Carrega `analytics-workspace.js` em `node:vm` com stubs de `getAccountTrades`,
 *     `getStrategySnapshots`, `renderStrategyRows`, `renderStatusList` e formatadores.
 *   - Como `renderStrategyRows` tambem e definida dentro de `analytics-workspace.js`, o harness
 *     guarda a referencia do spy antes de executar o script e a restaura no contexto apos o load.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Identificacao correta do lider (com escape HTML), do setup mais fraco elegivel (desconsiderando
 *     amostra unitaria `n: 1` quando ha candidato com `n >= 2`), e contagem de estrategias positivas.
 *   - Formatacao de ratios, datas e fallback `'—'` para valores nulos na tabela comparativa.
 *   - Estado vazio preserva 4 cards, mensagem de tabela vazia, limite 5 no board e 1 item de foco ("Biblioteca operacional").
 *   - Ausencia de nos opcionais (`strategyHubMetrics`, `strategyHubTable`) nao impede o board nem o foco.
 *   - Em `index.html`, `strategy-analysis.js` segue imediatamente `analytics-workspace.js`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Confirma que `analytics-workspace.js` existe, que `renderStrategyHub` nao permanece em `app.js`
// e carrega o codigo do modulo para execucao na sandbox.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/analytics/presentation/analytics-workspace.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderStrategyHub\([^]*?^\}/m)?.[0];
assert.ok(fs.existsSync(path.join(root, modulePath)), 'extracted strategy hub renderer must exist');
assert.ok(!legacy, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Fabrica um snapshot de estrategia padrao com metricas completas, aceitando `overrides` por teste.
function row(overrides = {}) {
  return {name: 'Plano A', n: 3, pnl: 120, wr: 66.67, avgR: 1.25,
    sharpe: 1.5, sortino: 2, calmar: 0.8, recovery: 1.1,
    best: 80, lastDate: '2026-09-10', ...overrides};
}

// Monta o harness de `renderStrategyHub`: permite omitir nos opcionais (`missing`), intercepta
// todas as chamadas de dominio/subcomponentes em `calls` e reatribui o spy `renderStrategyRows`
// apos `vm.runInContext` para evitar que a declaracao interna do arquivo sobrescreva o mock.
function harness({rows = [], missing = []} = {}) {
  const nodes = Object.fromEntries(['strategyHubMetrics', 'strategyHubTable']
    .filter(id => !missing.includes(id)).map(id => [id, {innerHTML: 'before'}]));
  const calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { return nodes[id] ?? null; }},
    activeAccountId: 'account-a',
    getAccountTrades(id) { calls.push(['trades', id]); return [{id: 1}]; },
    getStrategySnapshots(trades, id) { calls.push(['snapshots', id, trades.length]); return rows; },
    renderStrategyRows(target, value, limit) { calls.push(['board', target, value, limit]); },
    renderStatusList(target, items, empty) { calls.push(['focus', target, items, empty]); },
    fR(value) { return `R:${value}`; },
    mkTip() { return '<span class="tip">?</span>'; },
    escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;'); },
    formatStrategyRatio(value) { return `ratio:${value}`; },
    formatDocDate(value) { return `date:${value}`; },
  });
  const renderStrategyRows = context.renderStrategyRows;
  vm.runInContext(source, context, {filename: modulePath});
  context.renderStrategyRows = renderStrategyRows;
  return {context, nodes, calls};
}

// Testa o cenario populado com 3 estrategias (lider com `<` para validar escape, setup fraco com
// `n: 2` e valores nulos, e setup `'Único'` com `n: 1` e P/L menor): valida escolha do setup mais
// fraco com amostra minima, contagem de positivas, 3 linhas na tabela, board com limite 3 e 3 itens de foco.
test('strategy hub renders leader, weak setup, positive count and comparison table', () => {
  const rows = [
    row({name: 'Líder <A', pnl: 120, wr: 66.67}),
    row({name: 'Fraco', n: 2, pnl: -50, wr: 25, avgR: -0.5, best: null, lastDate: null}),
    row({name: 'Único', n: 1, pnl: -200, wr: 0, avgR: -2}),
  ];
  const {context, nodes, calls} = harness({rows});
  vm.runInContext('renderStrategyHub()', context);
  assert.equal((nodes.strategyHubMetrics.innerHTML.match(/class="metric-card /g) ?? []).length, 4);
  assert.match(nodes.strategyHubMetrics.innerHTML, /Líder &lt;A/);
  assert.match(nodes.strategyHubMetrics.innerHTML, /Setup mais fraco[\s\S]*Fraco/);
  assert.match(nodes.strategyHubMetrics.innerHTML, /Estratégias positivas[\s\S]*>1<\/div>/);
  assert.equal((nodes.strategyHubTable.innerHTML.match(/<tr>/g) ?? []).length, 3);
  assert.match(nodes.strategyHubTable.innerHTML, /ratio:1\.5/);
  assert.match(nodes.strategyHubTable.innerHTML, /date:2026-09-10/);
  assert.match(nodes.strategyHubTable.innerHTML, /<td class="mono">—<\/td>/);
  const board = calls.find(call => call[0] === 'board');
  assert.equal(board[1], 'strategyHubBoard');
  assert.equal(board[3], 3);
  const focus = calls.find(call => call[0] === 'focus');
  assert.equal(focus[1], 'strategyHubFocus');
  assert.equal(focus[2].length, 3);
  assert.equal(focus[2][0].actionPage, 'log');
  assert.equal(focus[2][1].actionPage, 'documents');
  assert.deepEqual(calls.slice(0, 2), [['trades', 'account-a'], ['snapshots', 'account-a', 1]]);
});

// Verifica o estado vazio do Hub: mantem os 4 cards com `'—'` no lider, exibe aviso de dados
// insuficientes na tabela, passa limite 5 para o board e gera apenas o card de foco `'Biblioteca operacional'`.
test('empty strategy hub keeps four summary cards and empty table message', () => {
  const {context, nodes, calls} = harness();
  vm.runInContext('renderStrategyHub()', context);
  assert.equal((nodes.strategyHubMetrics.innerHTML.match(/class="metric-card /g) ?? []).length, 4);
  assert.match(nodes.strategyHubMetrics.innerHTML, /Setup líder[\s\S]*>—<\/div>/);
  assert.match(nodes.strategyHubTable.innerHTML, /Sem dados suficientes para montar o comparativo/);
  assert.equal(calls.find(call => call[0] === 'board')[3], 5);
  const focus = calls.find(call => call[0] === 'focus');
  assert.equal(focus[2].length, 1);
  assert.equal(focus[2][0].title, 'Biblioteca operacional');
});

// Garante que mesmo sem os containers de metricas e tabela no DOM, `renderStrategyHub` retorna
// `undefined` sem erro e segue delegando normalmente para o board (com limite 1) e para o foco.
test('missing optional metric and table nodes still render board and focus', () => {
  const {context, calls} = harness({rows: [row()], missing: ['strategyHubMetrics', 'strategyHubTable']});
  assert.equal(vm.runInContext('renderStrategyHub()', context), undefined);
  assert.deepEqual(calls.filter(call => call[0] === 'board').map(call => call[3]), [1]);
  assert.equal(calls.filter(call => call[0] === 'focus').length, 1);
});

// Valida em `index.html` a carga sincrona unica de `analytics-workspace.js` e garante que o
// proximo script local imediatamente apos ele e `strategy-analysis.js`.
test('extracted strategy hub renderer stays a synchronous classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map(match => ({attributes: match[1], src: match[1].match(/\bsrc="([^"]+)"/)?.[1]}))
    .filter(script => script.src && !script.src.startsWith('https://'));
  assert.equal(scripts.filter(script => script.src === modulePath).length, 1);
  const index = scripts.findIndex(script => script.src === modulePath);
  assert.equal(scripts[index + 1].src, 'src/modules/analytics/application/strategy-analysis.js');
  assert.doesNotMatch(scripts[index].attributes, /\b(?:async|defer|type="module")\b/i);
});
