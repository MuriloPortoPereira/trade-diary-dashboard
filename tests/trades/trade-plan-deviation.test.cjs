/*
 * Objetivo:
 *   Validar o controle do campo de desvio de plano (togglePlanDeviation) no formulario de trades:
 *   habilitacao, opacidade, texto de placeholder contextual conforme o campo "seguiu o plano"
 *   e disparo do recalculo automatico de disciplina.
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-form.js
 *   (funcao togglePlanDeviation, verificando tambem a migracao do legado em app.js
 *   e o carregamento sincrono no index.html).
 *
 * Estrategia de isolamento:
 *   Executa o script em uma sandbox node:vm fornecendo stubs dos campos t-plan-deviation
 *   e t-followedplan e um espiao para autoDisc (reaplicado apos runInContext). Usa Proxy
 *   quando o campo alvo falta para comprovar retorno antecipado.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - O modulo carrega uma unica vez como script classico sincrono antes de app.js.
 *   - Se t-plan-deviation nao existir, retorna antes de ler t-followedplan ou chamar autoDisc().
 *   - Quando o plano foi seguido ('sim'), habilita o campo (disabled: false, opacity: '1'),
 *     aplica placeholder de detalhe opcional e chama autoDisc().
 *   - Quando o plano nao foi seguido ('nao') ou t-followedplan esta ausente, aplica placeholder
 *     de mudanca na execucao e ainda atualiza a disciplina.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function togglePlanDeviation\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Confirma no index.html que trade-form.js e carregado uma unica vez, de forma sincrona, antes de app.js.
test('plan deviation loads once as a classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});

// Helper de execucao em VM: injeta stubs de t-plan-deviation e t-followedplan, sobrescreve autoDisc
// apos carregar trade-form.js para capturar a chamada e dispara togglePlanDeviation().
function toggle({deviation = {disabled: true, style: {opacity: '0.5'}, placeholder: 'before'}, followed = {value: ''}} = {}) {
  const calls = [];
  const context = vm.createContext({
    document: {
      getElementById(id) {
        calls.push(['target', id]);
        return id === 't-plan-deviation' ? deviation : id === 't-followedplan' ? followed : null;
      },
    },
    autoDisc() { calls.push(['discipline']); },
  });
  vm.runInContext(source, context, {filename: modulePath});
  context.autoDisc = () => calls.push(['discipline']);
  vm.runInContext('togglePlanDeviation()', context);
  return {deviation, followed, calls};
}

// Caso de borda sem o campo t-plan-deviation no DOM: um Proxy em `followed` assegura retorno
// imediato sem ler t-followedplan e sem acionar autoDisc().
test('missing deviation field returns before reading plan or updating discipline', () => {
  const followed = new Proxy({}, {get() { throw new Error('followed plan accessed'); }});
  const {calls} = toggle({deviation: null, followed});
  assert.deepEqual(calls, [['target', 't-plan-deviation']]);
});

// Cenario em que o usuario seguiu o plano ('sim'): desbloqueia o input, restaura opacidade '1',
// exibe o placeholder de detalhe opcional e aciona autoDisc() ao final.
test('followed plan enables the field and keeps the optional-detail placeholder', () => {
  const result = toggle({followed: {value: 'sim'}});
  assert.equal(result.deviation.disabled, false);
  assert.equal(result.deviation.style.opacity, '1');
  assert.equal(result.deviation.placeholder, 'Opcional: algum detalhe mesmo seguindo o plano?');
  assert.deepEqual(result.calls, [
    ['target', 't-plan-deviation'],
    ['target', 't-followedplan'],
    ['discipline'],
  ]);
});

// Cenario em que o usuario desviou do plano ('nao'): aplica o placeholder direcionado a
// descrever o que mudou na execucao, entrada, saida ou gestao.
test('deviated plan keeps the execution-change placeholder', () => {
  const {deviation} = toggle({followed: {value: 'nao'}});
  assert.equal(deviation.placeholder, 'O que mudou na execução, entrada, saída ou gestão?');
});

// Caso de borda quando t-followedplan nao existe no DOM (null): assume fallback vazio (equivalente
// a nao ter 'sim'), aplica o placeholder de mudanca de execucao e ainda chama autoDisc().
test('missing followed-plan field retains the empty-value fallback and still updates discipline', () => {
  const {deviation, calls} = toggle({followed: null});
  assert.equal(deviation.placeholder, 'O que mudou na execução, entrada, saída ou gestão?');
  assert.deepEqual(calls.at(-1), ['discipline']);
});
