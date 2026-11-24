/*
 * Objetivo:
 *   Validar a renderizacao dos cartoes de metricas resumidas no topo do historico de
 *   trades (registros filtrados, P/L filtrado com sinal, win rate e cartao de
 *   controle de risco/incompletos).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-log.js (funcao renderLogMetrics,
 *   confirmando tambem a migracao do legado em app.js e o carregamento correto no
 *   index.html).
 *
 * Estrategia de isolamento:
 *   Executa o script dentro de uma sandbox node:vm fornecendo mocks para
 *   document.getElementById, calcMetrics e formatador monetario fR, registrando todas
 *   as chamadas para auditar ordem e argumentos. Usa Proxy no cenario de alvo ausente
 *   para comprovar retorno imediato sem ler `rows`.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Sem o elemento logMetrics no DOM, retorna antes de ler linhas ou chamar
 *     calcMetrics.
 *   - O modulo e carregado uma unica vez como script classico antes de app.js.
 *   - Renderiza os 4 cartoes na ordem esperada, inclui sinal '+' para P/L positivo,
 *     calcula win rate percentual e risco medio sobre trades com riskUsd numerico sem
 *     mutar o array original.
 *   - Quando incompleteCount > 0, o cartao "Controle" entra em destaque de alerta
 *     (c-red) exibindo a quantidade de incompletos e evita formatar risco medio
 *     desnecessariamente.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-log.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderLogMetrics\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Helper de execucao em VM: injeta linhas, contagem de incompletos, resultado
// predefinido de calcMetrics e espiao de fR, executa renderLogMetrics(rows,
// incompleteCount) e devolve alvo e rastro.
function render({rows = [], incompleteCount = 0, metrics, target = {innerHTML: 'before'}} = {}) {
  const calls = [];
  const context = vm.createContext({
    rows,
    incompleteCount,
    document: {getElementById(id) { calls.push(['target', id]); return target; }},
    calcMetrics(value) { calls.push(['metrics', value]); return metrics; },
    fR(value) { calls.push(['money', value]); return `F:${value}`; },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('renderLogMetrics(rows,incompleteCount)', context);
  return {target, calls};
}

// Caso de borda sem o elemento logMetrics: um Proxy em `rows` garante que nenhuma
// propriedade do array e acessada nem calcMetrics e invocado quando o alvo do DOM nao
// existe.
test('missing log metrics target returns before reading or calculating rows', () => {
  const rows = new Proxy([], {get() { throw new Error('rows accessed'); }});
  const {calls} = render({rows, target: null});
  assert.deepEqual(calls, [['target', 'logMetrics']]);
});

// Verifica no index.html que trade-log.js e carregado uma unica vez antes de app.js.
test('trade log metrics classic script loads once before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

// Cenario completo sem incompletos: valida os 4 rotulos, cores dos cartoes, P/L
// positivo com prefixo '+', win rate arredondado para 1 casa (66.7%), media de
// riskUsd apenas sobre valores validos (10, 0, -5 -> 5/3), sequencia exata de
// chamadas e imutabilidade do array `rows`.
test('log metrics preserve cards, signed result, win rate and average risk', () => {
  const rows = [{riskUsd: 10}, {riskUsd: null}, {riskUsd: 0}, {}, {riskUsd: -5}];
  const metrics = {closed: [{}, {}, {}], totalPnl: 25.5, wr: 2 / 3, wins: [{}, {}], losses: [{}]};
  const before = JSON.stringify(rows);
  const {target, calls} = render({rows, metrics});
  const labels = [...target.innerHTML.matchAll(/<div class="m-label">([^<]+)<\/div>/g)].map(match => match[1]);
  assert.deepEqual(labels, ['Registros filtrados', 'P/L filtrado', 'Win rate', 'Controle']);
  assert.match(target.innerHTML, /metric-card c-blue[^]*Registros filtrados[^]*>5<[^]*3 trades fechados/);
  assert.match(target.innerHTML, /metric-card c-green[^]*P\/L filtrado[^]*>\+F:25\.5<[^]*resultado do filtro atual/);
  assert.match(target.innerHTML, /metric-card c-yellow[^]*Win rate[^]*>66\.7%<[^]*2 wins · 1 losses/);
  assert.match(target.innerHTML, /metric-card c-purple[^]*Controle[^]*>F:1\.6666666666666667<[^]*risco médio por operação/);
  assert.deepEqual(calls, [
    ['target', 'logMetrics'],
    ['metrics', rows],
    ['money', 25.5],
    ['money', 5 / 3],
  ]);
  assert.equal(JSON.stringify(rows), before);
});

// Caso de borda com trades incompletos e P/L negativo: o cartao "Controle" muda para
// vermelho (c-red) indicando revisao pendente, o P/L negativo nao recebe '+', e fR e
// chamado apenas uma vez (para o P/L).
test('incomplete count preserves danger control without formatting average risk', () => {
  const rows = [{riskUsd: 10}];
  const metrics = {closed: [], totalPnl: -7, wr: 0, wins: [], losses: []};
  const {target, calls} = render({rows, incompleteCount: 2, metrics});
  assert.match(target.innerHTML, /metric-card c-red[^]*Controle[^]*>2 incompletos<[^]*pedem revisão/);
  assert.match(target.innerHTML, /P\/L filtrado[^]*>F:-7</);
  assert.deepEqual(calls.filter(call => call[0] === 'money'), [['money', -7]]);
});
