/*
 * Objetivo:
 *   Validar a sincronizacao de contexto de conta e mercado no formulario de trades
 *   (projecao de risco, multiplicador, alternancia entre modo percentual/absoluto,
 *   resumo da conta e inferencia automatica de mercado a partir do simbolo).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-form.js
 *   (funcoes onAccountChange e updateMarketFromSymbol, alem da verificacao de que
 *   nao restam definicoes legadas em app.js e de que a ordem de scripts no index.html esta correta).
 *
 * Estrategia de isolamento:
 *   Cria uma sandbox node:vm contendo elementos DOM simulados (com suporte a ocultar
 *   campos opcionais via lista `missing`), contas de fixture e espias para servicos externos
 *   (getActiveAccount, isFuturesAccount, getAccountTrades, calcAccountRiskState, fR, calcRR, getMarket).
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Selecionar uma conta projeta risco, multiplicador (com fallback para 1 quando 0),
 *     modo de exibicao de campos, resumo formatado da conta e dispara calcRR().
 *   - Contas de futuros invertem a visibilidade entre modePercentFields e modeAbsFields.
 *   - Conta inexistente ou ausente no select recorre a getActiveAccount().
 *   - Campos opcionais ausentes pulam apenas sua propria atualizacao sem impedir calcRR().
 *   - updateMarketFromSymbol atualiza o select de mercado apenas quando getMarket retorna valor truthy.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['onAccountChange', 'updateMarketFromSymbol'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

// Helper de montagem do ambiente de formulario em VM: cria os inputs e containers padrao,
// remove IDs listados em `missing`, injeta duas contas de exemplo e registra todas as chamadas
// feitas as dependencias. Reatribui calcRR apos carregar o modulo para interceptar a chamada real.
function setup({selectedId = 'a2', missing = [], futures = false, market = 'EUA'} = {}) {
  const elements = {
    't-account': {value: selectedId},
    't-riskpct': {value: ''},
    't-mult': {value: ''},
    modePercentFields: {style: {}},
    modeAbsFields: {style: {}},
    't-acct-info': {innerHTML: ''},
    't-symbol': {value: 'US30'},
    't-market': {value: 'old'},
  };
  for (const id of missing) delete elements[id];
  const accounts = [
    {id: 'a1', name: 'Principal', risk: 1, mult: 2, goalPct: 10},
    {id: 'a2', name: 'Secundária', risk: 0.5, mult: 0, goalPct: 20},
  ];
  const active = accounts[0];
  const calls = [];
  const risk = {currentBalance: 1234.5, cashflowNet: -50};
  const context = vm.createContext({
    accounts,
    document: {getElementById: id => elements[id] ?? null},
    getActiveAccount: () => { calls.push(['active']); return active; },
    isFuturesAccount: account => { calls.push(['futures', account.id]); return futures; },
    getAccountTrades: id => { calls.push(['trades', id]); return ['trade']; },
    calcAccountRiskState: (account, trades) => { calls.push(['risk', account.id, trades]); return risk; },
    fR: value => { calls.push(['format', value]); return `R$${value}`; },
    calcRR: () => calls.push(['rr']),
    getMarket: symbol => { calls.push(['market', symbol]); return market; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#trade-form-account-context' : modulePath});
  context.calcRR = () => calls.push(['rr']);
  return {context, elements, calls, accounts, active, risk};
}

// Fluxo nominal de onAccountChange para conta nao-futuros: verifica projecao de risco (0.5),
// fallback do multiplicador 0 para 1, visibilidade dos campos percentuais, HTML formatado de saldo/aportes/meta
// e a ordem completa das chamadas de calculo e recalculo de RR.
test('selected account projects risk, multiplier, field mode and formatted summary', () => {
  const {context, elements, calls} = setup();
  context.onAccountChange();
  assert.equal(elements['t-riskpct'].value, 0.5);
  assert.equal(elements['t-mult'].value, 1);
  assert.equal(elements.modePercentFields.style.display, '');
  assert.equal(elements.modeAbsFields.style.display, 'none');
  assert.equal(elements['t-acct-info'].innerHTML, '<span style="color:var(--muted)">Saldo: <b style="color:var(--text)">R$1234.5</b></span><br><span style="color:var(--muted)">Aportes líquidos: R$-50 · Meta: 20%</span>');
  assert.deepEqual(calls, [
    ['futures', 'a2'], ['futures', 'a2'], ['trades', 'a2'], ['risk', 'a2', ['trade']],
    ['format', 1234.5], ['format', -50], ['rr'],
  ]);
});

// Garante que contas de futuros ocultam os campos percentuais e exibem os campos absolutos.
test('futures presentation swaps percent and absolute field visibility', () => {
  const {context, elements} = setup({futures: true});
  context.onAccountChange();
  assert.equal(elements.modePercentFields.style.display, 'none');
  assert.equal(elements.modeAbsFields.style.display, '');
});

// Casos de borda de resolucao de conta: tanto um ID desconhecido quanto a ausencia do select t-account
// devem cair no fallback getActiveAccount() e preencher os dados da conta ativa (a1).
test('unknown or missing selection falls back to the active account', () => {
  const unknown = setup({selectedId: 'missing'});
  unknown.context.onAccountChange();
  assert.equal(unknown.elements['t-riskpct'].value, 1);
  assert.equal(unknown.elements['t-mult'].value, 2);
  assert.deepEqual(unknown.calls.slice(0, 2), [['active'], ['futures', 'a1']]);
  const missing = setup({missing: ['t-account']});
  missing.context.onAccountChange();
  assert.equal(missing.elements['t-riskpct'].value, 1);
});

// Verifica tolerancia a alvos opcionais no DOM: quando todos os campos de projecao faltam,
// evita consultas desnecessarias de futuros/trades/risco, mas ainda executa calcRR().
test('optional targets skip only their own projection and still recalculate RR', () => {
  const missing = ['t-riskpct', 't-mult', 'modePercentFields', 'modeAbsFields', 't-acct-info'];
  const {context, calls} = setup({missing});
  context.onAccountChange();
  assert.deepEqual(calls, [['rr']]);
});

// Testa updateMarketFromSymbol em tres cenarios: mercado reconhecido atualiza t-market;
// mercado vazio preserva o valor anterior ('old'); campos ausentes ainda consultam getMarket(undefined) sem falhar.
test('symbol change preserves market lookup and conditional select update', () => {
  const present = setup({market: 'EUA'});
  present.context.updateMarketFromSymbol();
  assert.equal(present.elements['t-market'].value, 'EUA');
  assert.deepEqual(present.calls, [['market', 'US30']]);
  const unknown = setup({market: ''});
  unknown.context.updateMarketFromSymbol();
  assert.equal(unknown.elements['t-market'].value, 'old');
  const missing = setup({missing: ['t-symbol', 't-market'], market: 'Forex'});
  missing.context.updateMarketFromSymbol();
  assert.deepEqual(missing.calls, [['market', undefined]]);
});

// Confirma que as funcoes legadas sairam de app.js e que trade-form.js carrega uma unica vez,
// de forma sincrona, antes de trade-log.js e app.js no index.html.
test('trade form account context shares the cohesive form script before consumers', () => {
  for (const part of legacyParts) assert.equal(part, undefined);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const contextIndex = scripts.findIndex(script => script.src === modulePath);
  const noticeIndex = scripts.findIndex(script => script.src === 'src/modules/trades/presentation/trade-log.js');
  const appIndex = scripts.findIndex(script => script.src === 'app.js');
  assert.ok(contextIndex < noticeIndex && noticeIndex < appIndex);
});
