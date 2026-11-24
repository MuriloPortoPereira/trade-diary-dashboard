/*
 * Objetivo:
 *   Validar os controles de edicao do diario de trades: bloqueio de edicao quando o
 *   filtro de conta diverge da conta ativa e toda a maquina de navegacao do fluxo em
 *   lote de trades incompletos.
 *
 * Modulos testados:
 *   - src/modules/trades/presentation/trade-form.js (isBulkIncompleteFlowTrade,
 *     clearBulkIncompleteFlow, openBulkIncompleteTradeAt,
 *     openPreviousBulkIncompleteTrade, openNextBulkIncompleteTrade,
 *     startBulkIncompleteFlow, getNextBulkIncompleteTradeAfterSave)
 *   - src/modules/trades/presentation/trade-log.js (isLogPageActive,
 *     accountDisplayName, getLogAccountEditLock, buildLogAccountEditLockMessage,
 *     showLogAccountEditLockNotice)
 *
 * Estrategia de isolamento:
 *   Carrega ambos os scripts de apresentacao dentro de um contexto node:vm com mocks
 *   de DOM (.page.active e filterAccount), contas, lista de trades, traducao (t),
 *   modal e notificacoes. Sobrescreve updateTradeModalFlowUI apos o carregamento para
 *   rastrear sincronizacoes de UI.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - O bloqueio de edicao respeita a pagina ativa, o filtro de conta
 *     atual/especifica/"all" e rotulos de conta.
 *   - Avisos de bloqueio preservam textos exatos, acao padrao ("editar"), argumentos
 *     e retorno booleano.
 *   - O fluxo em lote filtra trades completos/desconhecidos, deduplica IDs e nao muta
 *     o array do chamador.
 *   - Fluxo vazio limpa estado e atualiza UI antes de exibir aviso traduzido.
 *   - Navegacao anterior/proximo e por indice faz clamp nos limites e limpa o estado
 *     se os trades sumirem.
 *   - A continuacao pos-salvamento escolhe o proximo ID incompleto diferente do
 *     recem-salvo e encerra quando esgotado.
 *   - Ambos os scripts podem ser carregados em contexto vazio sem executar acesso
 *     prematuro ao DOM ou estado.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const flowPath='src/modules/trades/presentation/trade-form.js';
const controlsPath='src/modules/trades/presentation/trade-log.js';
const flowNames=['isBulkIncompleteFlowTrade','clearBulkIncompleteFlow','openBulkIncompleteTradeAt','openPreviousBulkIncompleteTrade','openNextBulkIncompleteTrade','startBulkIncompleteFlow','getNextBulkIncompleteTradeAfterSave'];
const controlNames=['isLogPageActive','accountDisplayName','getLogAccountEditLock','buildLogAccountEditLockMessage','showLogAccountEditLockNotice'];
const sources=[flowPath,controlsPath].map(file=>fs.readFileSync(path.join(root,file),'utf8'));

// Converte objetos criados dentro da VM em objetos planos do realm de teste para
// permitir comparacoes estritas com assert.deepEqual.
const plain=value=>JSON.parse(JSON.stringify(value));

// Monta o ambiente isolado de teste com os dois modulos carregados, estado inicial
// configuravel (pagina ativa, filtro de conta, IDs/indice do fluxo e lista de trades)
// e espias para chamadas de modal, aviso, busca de trades e atualizacao da UI do
// fluxo.
function harness({page='page-log',filter='active',ids=[],index=-1,trades=[{id:'a',incomplete:true},{id:'b',incomplete:true},{id:'complete',incomplete:false}]}={}) {
  const calls=[];
  const c=vm.createContext({activeAccountId:'one',accounts:[{id:'one',name:'Principal'},{id:'two',name:'Outra'}],bulkIncompleteEditIds:[...ids],bulkIncompleteEditIndex:index,trades,
    document:{querySelector(selector){assert.equal(selector,'.page.active');return page?{id:page}:null;},getElementById(id){assert.equal(id,'filterAccount');return filter===null?null:{value:filter};}},
    getAccountTrades(id){calls.push(['trades',id]);return trades;},
    openModal(...args){calls.push(['modal',...args]);return 'opened';},showAppNotice(...args){calls.push(['notice',...args]);},t:key=>`translated:${key}`});
  for(const source of sources)vm.runInContext(source,c);
  c.updateTradeModalFlowUI=()=>calls.push(['ui',Array.from(c.bulkIncompleteEditIds),c.bulkIncompleteEditIndex]);
  return {c,calls};
}

// Verifica a logica de bloqueio de edicao do log: libera para conta ativa/vazia,
// formata nomes de conta (incluindo fallback para ID desconhecido e vazio), bloqueia
// para outra conta ou "all", le o select do DOM por padrao e respeita a guarda de
// pagina ativa (com override via requireActivePage: false).
test('journal edit locks preserve active-page guard, filter defaults and account labels',()=>{
  const {c}=harness();
  for(const accountFilter of ['',null,'active','one'])assert.deepEqual(plain(c.getLogAccountEditLock({accountFilter})),{locked:false});
  assert.equal(c.accountDisplayName('active'),'Principal');assert.equal(c.accountDisplayName('all'),'todas as contas');assert.equal(c.accountDisplayName('missing'),'missing');assert.equal(c.accountDisplayName(''),'conta selecionada');
  assert.deepEqual(plain(c.getLogAccountEditLock({accountFilter:'two'})),{locked:true,accountId:'two',accountName:'Outra',activeAccountName:'Principal',allAccounts:false});
  assert.deepEqual(plain(c.getLogAccountEditLock({accountFilter:'all'})),{locked:true,accountId:'all',accountName:'todas as contas',activeAccountName:'Principal',allAccounts:true});
  assert.equal(harness({filter:'two'}).c.getLogAccountEditLock().locked,true);
  assert.equal(harness({filter:null}).c.getLogAccountEditLock().locked,false);
  for(const page of ['page-dashboard',null]){
    const off=harness({page,filter:'two'}).c;
    assert.deepEqual(plain(off.getLogAccountEditLock()),{locked:false});
    assert.equal(off.getLogAccountEditLock({requireActivePage:false}).locked,true);
  }
});

// Valida a exibicao de avisos de bloqueio (showLogAccountEditLockNotice): retorna
// false sem efeitos quando desbloqueado e exibe mensagens especificas para outra
// conta (com verbo customizado) e para "todas as contas".
test('lock notices preserve action defaults, text, call arguments and return values',()=>{
  const unlocked=harness();assert.equal(unlocked.c.showLogAccountEditLockNotice(),false);assert.deepEqual(unlocked.calls,[]);
  const {c,calls}=harness({filter:'two'});
  assert.equal(c.showLogAccountEditLockNotice('duplicar'),true);
  assert.deepEqual(plain(calls),[['notice','Histórico em modo visualização','Você está visualizando Outra, mas a conta ativa agora é Principal. Para duplicar operações, primeiro troque a conta ativa para Outra. Assim o diário mantém o histórico protegido e evita mudanças na conta errada.',{confirmText:'Entendi'}]]);
  const all=harness({filter:'all'});assert.equal(all.c.showLogAccountEditLockNotice(),true);
  assert.equal(all.calls[0][2],'Você está vendo todas as contas em modo consulta. Para editar operações, primeiro escolha uma conta específica como conta ativa. Assim o diário mantém cada histórico protegido e evita alterações na conta errada.');
});

// Garante que startBulkIncompleteFlow remove trades completos, inexistentes e
// duplicados sem alterar o array passado pelo chamador, inicia no indice 0, abre o
// modal do primeiro ID valido e valida isBulkIncompleteFlowTrade.
test('flow start filters completed/unknown trades and deduplicates without mutating caller IDs',()=>{
  const {c,calls}=harness();const ids=['b','complete','missing','a','b'];const before=[...ids];
  assert.equal(c.startBulkIncompleteFlow(ids),'opened');assert.deepEqual(ids,before);
  assert.deepEqual(Array.from(c.bulkIncompleteEditIds),['b','a']);assert.equal(c.bulkIncompleteEditIndex,0);
  assert.deepEqual(calls.at(-1),['modal','tradeModal','b']);
  assert.equal(c.isBulkIncompleteFlowTrade('b'),true);assert.equal(c.isBulkIncompleteFlowTrade(''),false);assert.equal(c.isBulkIncompleteFlowTrade('missing'),false);
});

// Caso de borda ao iniciar fluxo sem trades incompletos validos: limpa o estado
// anterior, sincroniza a UI antes de disparar o aviso traduzido e valida que
// clearBulkIncompleteFlow tambem reseta o estado.
test('empty flow clears state and updates UI before translated empty notice',()=>{
  const {c,calls}=harness({ids:['a'],index:0});
  assert.equal(c.startBulkIncompleteFlow(),false);
  assert.deepEqual(calls,[['ui',[],-1],['notice','translated:notice.incomplete','translated:notice.noIncomplete']]);
  assert.equal(c.clearBulkIncompleteFlow(),undefined);assert.deepEqual(calls.at(-1),['ui',[],-1]);
});

// Testa toda a navegacao do fluxo (openBulkIncompleteTradeAt, anterior e proximo):
// ignora navegacao sem indice ativo, refiltra e faz clamp de indices fora dos limites
// (99 e -99), respeita bordas da lista e limpa tudo quando a lista de trades
// subjacente fica vazia.
test('navigation filters again, clamps indices and retains modal return and previous/next guards',()=>{
  const {c,calls}=harness({ids:['a','complete','b','a'],index:-1});
  assert.equal(c.openPreviousBulkIncompleteTrade(),undefined);assert.equal(c.openNextBulkIncompleteTrade(),undefined);assert.deepEqual(calls,[]);
  assert.equal(c.openBulkIncompleteTradeAt(99),'opened');assert.deepEqual(Array.from(c.bulkIncompleteEditIds),['a','b']);assert.equal(c.bulkIncompleteEditIndex,1);
  const before=calls.length;assert.equal(c.openNextBulkIncompleteTrade(),undefined);assert.equal(calls.length,before);
  assert.equal(c.openPreviousBulkIncompleteTrade(),undefined);assert.equal(c.bulkIncompleteEditIndex,0);assert.deepEqual(calls.at(-1),['modal','tradeModal','a']);
  assert.equal(c.openNextBulkIncompleteTrade(),undefined);assert.equal(c.bulkIncompleteEditIndex,1);
  assert.equal(c.openBulkIncompleteTradeAt(-99),'opened');assert.equal(c.bulkIncompleteEditIndex,0);
  c.trades.splice(0,c.trades.length);assert.equal(c.openBulkIncompleteTradeAt(0),false);assert.deepEqual(calls.at(-1),['ui',[],-1]);
});

// Testa getNextBulkIncompleteTradeAfterSave: escolhe o primeiro ID incompleto
// restante diferente do salvo sem abrir o modal diretamente, reavalia quando um trade
// deixa de ser incompleto e limpa o fluxo ao esgotar ou quando restam apenas IDs
// inexistentes.
test('after save continuation chooses first remaining other ID, deduplicates and clears exhausted flow',()=>{
  const {c,calls}=harness({ids:['a','b','a','complete','missing'],index:1});
  assert.equal(c.getNextBulkIncompleteTradeAfterSave('b'),'a');assert.deepEqual(Array.from(c.bulkIncompleteEditIds),['a','b']);assert.equal(c.bulkIncompleteEditIndex,0);
  assert.equal(calls.some(call=>call[0]==='modal'),false);
  c.trades[0].incomplete=false;
  assert.equal(c.getNextBulkIncompleteTradeAfterSave('a'),'b');assert.equal(c.bulkIncompleteEditIndex,0);
  assert.equal(c.getNextBulkIncompleteTradeAfterSave('b'),null);assert.deepEqual(calls.at(-1),['ui',[],-1]);
  calls.length=0;assert.equal(c.getNextBulkIncompleteTradeAfterSave('b'),null);assert.deepEqual(calls,[]);
  c.bulkIncompleteEditIds=['missing'];assert.equal(c.getNextBulkIncompleteTradeAfterSave('a'),null);assert.deepEqual(calls.at(-1),['ui',[],-1]);
});

// Garante pureza na carga dos scripts: ambos os modulos de apresentacao podem ser
// avaliados em um contexto completamente vazio e expoem todas as funcoes publicas
// esperadas sem tentar acessar DOM ou globals no load.
test('both presentation scripts declare editing APIs without running DOM or state access',()=>{
  const c=vm.createContext({});
  for(const source of sources)vm.runInContext(source,c);
  for(const name of [...flowNames,...controlNames,'updateTradeModalFlowUI','renderLogReadOnlyNotice'])assert.equal(typeof c[name],'function',name);
});
