/*
 * Objetivo do arquivo:
 *   Validar a renderizacao da pagina de rotina pre-mercado (renderPremarket):
 *   resumo mensal de trades fechados, grade diaria de habitos (incluindo ano
 *   bissexto), encerramento antecipado se a grade estiver ausente e carregamento
 *   do script no index.html.
 *
 * Modulo/arquivo testado:
 *   src/modules/routine/presentation/premarket-page.js (confirmando que o arquivo
 *   extraido existe e que renderPremarket foi removido de app.js).
 *
 * Estrategia de isolamento:
 *   Carrega o modulo inteiro em uma sandbox node:vm, substituindo _updatePMStats e
 *   _renderPMHabitManager por espias apos o carregamento para isolar exclusivamente
 *   o comportamento de renderPremarket().
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Filtra trades do mes corrente descartando status OPEN e datas fora do mes,
 *     calculando contagem, P/L total, melhor trade, pior dia (soma) e maximo de trades/dia.
 *   - Renderiza grade com 28 colunas em fevereiro comum (2026) e 29 em bissexto (2024),
 *     marcando celulas concluidas (pm-dot-done) com atributo data-pmcell e onclick.
 *   - Mes sem trades fechados exibe marcador vazio '—' no P/L total.
 *   - Ausencia de pmHabitGrid interrompe apos o resumo mensal sem chamar stats/manager.
 *   - Script classico sincrono carregado imediatamente antes de documents-page.js.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/routine/presentation/premarket-page.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderPremarket\([^]*?^\}/m)?.[0];
assert.ok(fs.existsSync(path.join(root, modulePath)), 'extracted premarket renderer must exist');
assert.ok(!legacy, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Monta a sandbox vm para renderPremarket com mes, trades, habitos, dados diarios e
// nos ausentes configuraveis; substitui callbacks internos por espias apos o eval do modulo.
function harness({month = '2026-02', trades = [], habits = ['Plano', 'Revisão'], data = {}, missing = []} = {}) {
  const nodes = Object.fromEntries(['pmMonthLabel', 'pmResultStats', 'pmHabitGrid']
    .filter(id => !missing.includes(id)).map(id => [id, {textContent: 'before', innerHTML: 'before'}]));
  const calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { return nodes[id] ?? null; }},
    activeAccountId: 'account-a',
    getAccountTrades(id) { calls.push(['trades', id]); return trades; },
    config: {pmHabits: habits}, preMarketData: data,
    fR(value) { return `R:${value}`; },
    _updatePMStats() { calls.push('stats'); },
    _renderPMHabitManager() { calls.push('manager'); },
  });
  vm.runInContext(`let pmCurrentMonth=${JSON.stringify(month)};`, context);
  vm.runInContext(source, context, {filename: modulePath});
  // Mantem o isolamento do renderizador apos a pagina registrar seus controles reais.
  context._updatePMStats = () => calls.push('stats');
  context._renderPMHabitManager = () => calls.push('manager');
  return {context, nodes, calls};
}

// Testa fevereiro/2026 com 3 trades fechados validos (ignorando OPEN e 31/01): valida titulo,
// metricas mensais agregadas por dia, grade de 28 dias x 2 habitos (56 celulas), marcacao de
// habito concluido e sequencia final trades -> stats -> manager.
test('February renders month results and completed habit cells', () => {
  const trades = [
    {date: '2026-02-02', status: 'WIN', pnl: 100},
    {date: '2026-02-02', status: 'LOSS', pnl: -40},
    {date: '2026-02-03', status: 'WIN', pnl: 20},
    {date: '2026-02-04', status: 'OPEN', pnl: 500},
    {date: '2026-01-31', status: 'WIN', pnl: 900},
  ];
  const {context, nodes, calls} = harness({trades, data: {'2026-02-02': {habits: [true, false]}}});
  vm.runInContext('renderPremarket()', context);
  assert.equal(nodes.pmMonthLabel.textContent, 'Fevereiro 2026');
  assert.match(nodes.pmResultStats.innerHTML, /Trades no mês[\s\S]*>3<\/span>/);
  assert.match(nodes.pmResultStats.innerHTML, /P\/L total[\s\S]*\+R:80/);
  assert.match(nodes.pmResultStats.innerHTML, /Melhor trade[\s\S]*\+R:100/);
  assert.match(nodes.pmResultStats.innerHTML, /Pior dia \(soma\)[\s\S]*\+R:20/);
  assert.match(nodes.pmResultStats.innerHTML, /Máx\. trades em um dia[\s\S]*>2<\/span>/);
  assert.match(nodes.pmHabitGrid.innerHTML, /grid-template-columns:190px repeat\(28,26px\)/);
  assert.equal((nodes.pmHabitGrid.innerHTML.match(/class="pm-grid-day"/g) ?? []).length, 28);
  assert.equal((nodes.pmHabitGrid.innerHTML.match(/data-pmcell=/g) ?? []).length, 56);
  assert.match(nodes.pmHabitGrid.innerHTML, /class="pm-dot pm-dot-done" data-pmcell="2026-02-02-0"/);
  assert.match(nodes.pmHabitGrid.innerHTML, /onclick="togglePMHabit\('2026-02-02',0\)"/);
  assert.deepEqual(calls, [['trades', 'account-a'], 'stats', 'manager']);
});

// Valida mes bissexto (fevereiro/2024) sem trades fechados (apenas OPEN) e sem habitos:
// exibe 0 trades, '—' no P/L total, grade com 29 colunas de dias e nenhuma celula de habito.
test('empty month keeps empty result markers and renders leap-year grid', () => {
  const {context, nodes} = harness({month: '2024-02', trades: [{date: '2024-02-05', status: 'OPEN', pnl: 10}], habits: []});
  vm.runInContext('renderPremarket()', context);
  assert.equal(nodes.pmMonthLabel.textContent, 'Fevereiro 2024');
  assert.match(nodes.pmResultStats.innerHTML, /Trades no mês[\s\S]*>0<\/span>/);
  assert.match(nodes.pmResultStats.innerHTML, /P\/L total[\s\S]*>—<\/span>/);
  assert.match(nodes.pmHabitGrid.innerHTML, /repeat\(29,26px\)/);
  assert.equal((nodes.pmHabitGrid.innerHTML.match(/class="pm-grid-day"/g) ?? []).length, 29);
  assert.equal((nodes.pmHabitGrid.innerHTML.match(/data-pmcell=/g) ?? []).length, 0);
});

// Caso o elemento pmHabitGrid nao exista no DOM, preenche o rotulo e estatisticas mensais
// e retorna antecipadamente sem invocar _updatePMStats nem _renderPMHabitManager.
test('missing grid stops after monthly results without habit callbacks', () => {
  const {context, nodes, calls} = harness({missing: ['pmHabitGrid']});
  assert.equal(vm.runInContext('renderPremarket()', context), undefined);
  assert.equal(nodes.pmMonthLabel.textContent, 'Fevereiro 2026');
  assert.match(nodes.pmResultStats.innerHTML, /Trades no mês/);
  assert.deepEqual(calls, [['trades', 'account-a']]);
});

// Garante no index.html que premarket-page.js carrega uma unica vez como script classico
// sincrono imediatamente antes de documents-page.js.
test('extracted premarket renderer stays a synchronous classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map(match => ({attributes: match[1], src: match[1].match(/\bsrc="([^"]+)"/)?.[1]}))
    .filter(script => script.src && !script.src.startsWith('https://'));
  assert.equal(scripts.filter(script => script.src === modulePath).length, 1);
  const index = scripts.findIndex(script => script.src === modulePath);
  assert.equal(scripts[index + 1].src, 'src/modules/documents/presentation/documents-page.js');
  assert.doesNotMatch(scripts[index].attributes, /\b(?:async|defer|type="module")\b/i);
});
