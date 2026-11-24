/*
 * Objetivo:
 *   Validar o componente de barras/linhas de desempenho por estrategia (`renderStrategyRows`),
 *   verificando ordenacao, escape HTML, cores/sinais de P/L, largura relativa proporcional das
 *   barras, tratamento do limite de exibicao, estado vazio e guard clause de alvo ausente.
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/analytics/presentation/analytics-workspace.js` (funcao `renderStrategyRows`)
 *   - Remocao da declaracao legada em `app.js` e ordem de declaracao/carregamento em `index.html`
 *
 * Estrategia de isolamento:
 *   - Carrega `analytics-workspace.js` em `node:vm` com mocks de `document.getElementById`,
 *     `escapeHtml`, `fR` e `formatStrategyRatio`, registrando todas as chamadas de formatacao em `calls`.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Escape de caracteres especiais no nome da estrategia, sinalizacao `+$` para ganhos/zero e cor vermelha para perdas.
 *   - Normalizacao das barras relativa ao maior valor absoluto dentro da fatia exibida (com piso minimo de 8% para 0 e 10% para valor pequeno).
 *   - Limite padrao de 5 linhas; limites explicitos preservam comportamento de `Array.prototype.slice` (inclusive `0` -> vazio e `-1` -> 5 de 6).
 *   - Lista vazia exibe orientacao amigavel sem invocar formatadores; alvo DOM ausente retorna sem ler `rows`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Confirma que `renderStrategyRows` nao permanece em `app.js` e carrega `analytics-workspace.js`.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/analytics/presentation/analytics-workspace.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderStrategyRows\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Auxiliar de renderizacao em `node:vm`: permite passar ou omitir `limit`, controlar se o alvo
// `'target'` existe no DOM (`visible`), e captura o HTML final junto das chamadas a `fR` e `formatStrategyRatio`.
function render(rows, limit, visible = true) {
  const node = {innerHTML: 'before'}, calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { assert.equal(id, 'target'); return visible ? node : null; }},
    escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    fR(value) { calls.push(['money', value]); return `$${value.toFixed(2)}`; },
    formatStrategyRatio(value) { calls.push(['ratio', value]); return value === Infinity ? '∞' : value.toFixed(2); },
    rows, limit,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext(limit === undefined ? 'renderStrategyRows("target", rows)' : 'renderStrategyRows("target", rows, limit)', context), undefined);
  return {html: node.innerHTML, calls};
}

// Fabrica enxuta de linha de estrategia com estatisticas padrao (`n: 3`, `wr: 66.6`, `recovery: 1.25`).
const row = (name, pnl) => ({name, pnl, n: 3, wr: 66.6, recovery: 1.25});

// Testa 3 estrategias (+100, -50 com recovery infinito, e 0): verifica ordem, escape de `<gain&>`,
// classes verde/vermelha, gradiente negativo, larguras proporcionais (100%, 50%, piso 8%),
// arredondamento de WR (`67%`), exibicao de `FR ∞` e imutabilidade do array `rows`.
test('strategy rows preserve order, escaping, signs, metrics and relative progress', () => {
  const rows = [row('<gain&>', 100), {...row('loss', -50), recovery: Infinity}, row('zero', 0)];
  const before = JSON.stringify(rows);
  const {html, calls} = render(rows);
  const blocks = html.split('<div class="strategy-row">').slice(1);
  assert.equal(blocks.length, 3);
  assert.match(blocks[0], /&lt;gain&amp;&gt;/);
  assert.match(blocks[0], /text-green">\+\$100\.00/);
  assert.match(blocks[0], /width:100%/);
  assert.match(blocks[1], /text-red">\$-50\.00/);
  assert.match(blocks[1], /width:50%;background:linear-gradient\(90deg, var\(--red\)/);
  assert.match(blocks[1], /FR ∞/);
  assert.match(blocks[2], /text-green">\+\$0\.00/);
  assert.match(blocks[2], /width:8%/);
  assert.match(blocks[0], /3 trades[^]*67% WR[^]*FR 1\.25/);
  assert.deepEqual(calls.filter(call => call[0] === 'money').map(call => call[1]), [100, -50, 0]);
  assert.equal(JSON.stringify(rows), before);
});

// Valida o limite padrao de 5 linhas e limites explicitos: `limit = 2` normaliza as barras apenas
// sobre os 2 itens visiveis (10 -> 100%, 5 -> 50%, ignorando os 100 de fora), `limit = 0` gera
// string vazia, `limit = -1` segue `slice(0, -1)` (5 itens) e valor pequeno respeita piso de `10%`.
test('default limit is five and explicit limits retain slice behavior and sliced normalization', () => {
  const rows = [row('first', 10), row('second', 5), ...Array.from({length: 4}, (_, i) => row(`other${i}`, 100))];
  assert.equal((render(rows).html.match(/class="strategy-row"/g) ?? []).length, 5);
  const limited = render(rows, 2).html;
  assert.equal((limited.match(/class="strategy-row"/g) ?? []).length, 2);
  assert.match(limited, /width:100%/);
  assert.match(limited, /width:50%/);
  assert.equal(render(rows, 0).html, '');
  assert.equal((render(rows, -1).html.match(/class="strategy-row"/g) ?? []).length, 5);
  assert.match(render([row('small', 0.1)]).html, /width:10%/);
});

// Confirma que lista vazia renderiza a mensagem orientativa ("Sem trades suficientes") sem
// chamar `fR` nem `formatStrategyRatio`.
test('empty rows preserve existing guidance and skip formatting', () => {
  const {html, calls} = render([]);
  assert.match(html, /Sem trades suficientes/);
  assert.match(html, /Registre operações fechadas para ranquear setups\./);
  assert.deepEqual(calls, []);
});

// Garante retorno antecipado quando o container alvo nao existe no DOM, preservando `'before'`
// sem acessar `rows` (mesmo `null`) nem chamar formatadores.
test('missing target returns without reading rows or formatting', () => {
  const {html, calls} = render(null, undefined, false);
  assert.equal(html, 'before');
  assert.deepEqual(calls, []);
});

// Valida em `index.html` o carregamento sincrono unico do modulo antes de `app.js` e a declaracao
// previa de `renderStrategyRows` antes de `renderStrategyCompareCards`.
test('strategy rows loads once as a synchronous classic script before its consumers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(source.indexOf('function renderStrategyRows(') < source.indexOf('function renderStrategyCompareCards('));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
