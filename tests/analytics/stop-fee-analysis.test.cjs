/*
 * Objetivo:
 *   Testar o componente de apresentacao de analise de stops e impacto de taxas
 *   (`renderStopFeeAnalysis`), garantindo a ordem dos 4 cards de risco, tons de alerta
 *   (`safe`, `warn`, `danger`), limiar inclusivo de 25% para taxas, tooltips e guard clause.
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/analytics/presentation/analytics-workspace.js` (funcao `renderStopFeeAnalysis`)
 *   - Remocao da declaracao legada em `app.js` e inclusao em `index.html`
 *
 * Estrategia de isolamento:
 *   - Executa `analytics-workspace.js` em `node:vm` fornecendo um stub parametrizavel de
 *     `buildStopFeeAnalysis` (que tambem valida passagem exata de `account` e `rows`),
 *     `fR`, `mkTip` e o no DOM simulado `'target'`.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Cenario seguro gera 4 cards `safe` na ordem fixa ("Dias acima do stop", "Stops semana / mês",
 *     "Taxas pagas", "Edge removido") com 4 tooltips correspondentes.
 *   - Violacoes de stop e taxas elevadas aplicam tons `danger`/`warn`, arredondamento de R (`0.63R`)
 *     e sinais negativos sem mutar o objeto de analise.
 *   - Limiar de alerta de taxas e inclusivo em 25% para `edgeRemovedPct` OU `feeDragPct`; quando
 *     `expectancyBeforeFees` e 0, exibe `feeDragPct`.
 *   - Alvo DOM ausente retorna imediatamente antes de calcular a analise ou gerar tooltips.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Confirma que `renderStopFeeAnalysis` ja foi removida de `app.js` e carrega `analytics-workspace.js`.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/analytics/presentation/analytics-workspace.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderStopFeeAnalysis\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Auxiliar de renderizacao: monta um objeto de analise saudavel por padrao (sobrescrevivel via
// `overrides`), valida que `buildStopFeeAnalysis` recebe exatamente `(account, rows)` e captura
// HTML gerado, chamadas e lista de tooltips.
function render(overrides = {}, visible = true) {
  const analysis = {daysOverDailyStop: 0, daysOverDailyStopPct: 0, dayLimit: 20, days: 5,
    weeksOverWeeklyStop: 0, monthsOverMonthlyStop: 0, weekLimit: 50, monthLimit: 100,
    totalFees: 0, feesInR: 0, feePerTrade: 0, edgeRemovedPct: 0, feeDragPct: 0,
    expectancyBeforeFees: 10, expectancyAfterFees: 10, ...overrides};
  const account = {id: 'a'}, rows = [{id: 'trade-a'}], node = {innerHTML: 'before'}, calls = [], tips = [];
  const context = vm.createContext({
    document: {getElementById(id) { assert.equal(id, 'target'); return visible ? node : null; }},
    buildStopFeeAnalysis(acct, trades) { assert.equal(acct, account); assert.equal(trades, rows); calls.push('analysis'); return analysis; },
    fR: value => `$${value.toFixed(2)}`,
    mkTip(tip) { tips.push(tip); return `<tip>${tip}</tip>`; },
    account, rows,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderStopFeeAnalysis("target", account, rows)', context), undefined);
  return {html: node.innerHTML, calls, tips, analysis};
}

// Verifica o cenario sem violacoes nem taxas: 4 cards com tom `safe` na ordem canonica,
// textos de limite diario, `0S · 0M`, `0.00R consumidos`, status `aceitável` e 4 tooltips.
test('safe analysis renders four ordered cards, limits, fees and tooltips', () => {
  const {html, calls, tips} = render();
  assert.deepEqual(calls, ['analysis']);
  assert.equal((html.match(/class="risk-insight-item safe"/g) ?? []).length, 4);
  const labels = ['Dias acima do stop', 'Stops semana / mês', 'Taxas pagas', 'Edge removido'];
  assert.ok(labels.every((label, index) => index === 0 || html.indexOf(label) > html.indexOf(labels[index - 1])));
  assert.match(html, /Limite diário \$20\.00 · 5 dia\(s\) no período/);
  assert.match(html, /0S · 0M/);
  assert.match(html, /0\.00R consumidos/);
  assert.match(html, /aceitável/);
  assert.equal(tips.length, 4);
  assert.match(tips[0], /Dias acima do stop diário/);
  assert.match(tips[3], /Edge Removido pelas Taxas/);
});

// Exercita o cenario de risco elevado com estouros diarios/semanais/mensais e taxas altas:
// confirma 1 card `danger` e 3 `warn`, percentuais, formato `1S · 2M`, arredondamento `0.63R`,
// expectancia negativa apos taxas (`$-2.00`) e preservacao do valor original em `analysis.feesInR`.
test('breaches and fees preserve danger/warn tones and signed formatting', () => {
  const values = {daysOverDailyStop: 2, daysOverDailyStopPct: 40, weeksOverWeeklyStop: 1,
    monthsOverMonthlyStop: 2, totalFees: 12.5, feesInR: 0.625, feePerTrade: 2.5,
    edgeRemovedPct: 30, expectancyAfterFees: -2};
  const {html, analysis} = render(values);
  assert.match(html, /risk-insight-item danger/);
  assert.equal((html.match(/risk-insight-item warn/g) ?? []).length, 3);
  assert.match(html, /40% dos dias/);
  assert.match(html, /1S · 2M/);
  assert.match(html, /atingido/);
  assert.match(html, /0\.63R consumidos/);
  assert.match(html, /depois \$-2\.00/);
  assert.equal(analysis.feesInR, values.feesInR);
});

// Testa a fronteira exata do alerta de taxas: `24.99` em ambos ainda e `safe` ("aceitável"),
// enquanto `25` em `edgeRemovedPct` ou `feeDragPct` ja vira `warn` ("alto impacto"); tambem valida
// que com `expectancyBeforeFees === 0` o valor exibido cai para `feeDragPct` (`12%`).
test('fee warning threshold is inclusive at 25 for either percentage', () => {
  for (const [edgeRemovedPct, feeDragPct, warning] of [[24.99,24.99,false],[25,0,true],[0,25,true]]) {
    const {html} = render({edgeRemovedPct, feeDragPct});
    const last = html.slice(html.lastIndexOf('<div class="risk-insight-item'));
    assert.match(last, warning ? /risk-insight-item warn/ : /risk-insight-item safe/);
    assert.match(last, warning ? /alto impacto/ : /aceitável/);
  }
  const {html} = render({expectancyBeforeFees: 0, edgeRemovedPct: 70, feeDragPct: 12});
  assert.match(html, /risk-insight-value">12%/);
});

// Garante que quando o elemento DOM alvo nao existe, a funcao retorna imediatamente sem
// chamar `buildStopFeeAnalysis` nem `mkTip` e mantendo `'before'`.
test('missing target returns before calculating or formatting', () => {
  const {html, calls, tips} = render({}, false);
  assert.equal(html, 'before');
  assert.deepEqual(calls, []);
  assert.deepEqual(tips, []);
});

// Valida em `index.html` o carregamento sincrono unico de `analytics-workspace.js` e a
// presenca de `calendar-page.js` antes de `app.js`.
test('stop fee and calendar presentation load synchronously before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/modules/calendar/presentation/calendar-page.js') < html.indexOf('src="app.js"'));
});
