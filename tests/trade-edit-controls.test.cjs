const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const flowPath='src/modules/trades/presentation/trade-form.js';
const controlsPath='src/modules/trades/presentation/trade-log.js';
const flowNames=['isBulkIncompleteFlowTrade','clearBulkIncompleteFlow','openBulkIncompleteTradeAt','openPreviousBulkIncompleteTrade','openNextBulkIncompleteTrade','startBulkIncompleteFlow','getNextBulkIncompleteTradeAfterSave'];
const controlNames=['isLogPageActive','accountDisplayName','getLogAccountEditLock','buildLogAccountEditLockMessage','showLogAccountEditLockNotice'];
const sources=[flowPath,controlsPath].map(file=>fs.readFileSync(path.join(root,file),'utf8'));
const plain=value=>JSON.parse(JSON.stringify(value));
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

test('lock notices preserve action defaults, text, call arguments and return values',()=>{
  const unlocked=harness();assert.equal(unlocked.c.showLogAccountEditLockNotice(),false);assert.deepEqual(unlocked.calls,[]);
  const {c,calls}=harness({filter:'two'});
  assert.equal(c.showLogAccountEditLockNotice('duplicar'),true);
  assert.deepEqual(plain(calls),[['notice','Histórico em modo visualização','Você está visualizando Outra, mas a conta ativa agora é Principal. Para duplicar operações, primeiro troque a conta ativa para Outra. Assim o diário mantém o histórico protegido e evita mudanças na conta errada.',{confirmText:'Entendi'}]]);
  const all=harness({filter:'all'});assert.equal(all.c.showLogAccountEditLockNotice(),true);
  assert.equal(all.calls[0][2],'Você está vendo todas as contas em modo consulta. Para editar operações, primeiro escolha uma conta específica como conta ativa. Assim o diário mantém cada histórico protegido e evita alterações na conta errada.');
});

test('flow start filters completed/unknown trades and deduplicates without mutating caller IDs',()=>{
  const {c,calls}=harness();const ids=['b','complete','missing','a','b'];const before=[...ids];
  assert.equal(c.startBulkIncompleteFlow(ids),'opened');assert.deepEqual(ids,before);
  assert.deepEqual(Array.from(c.bulkIncompleteEditIds),['b','a']);assert.equal(c.bulkIncompleteEditIndex,0);
  assert.deepEqual(calls.at(-1),['modal','tradeModal','b']);
  assert.equal(c.isBulkIncompleteFlowTrade('b'),true);assert.equal(c.isBulkIncompleteFlowTrade(''),false);assert.equal(c.isBulkIncompleteFlowTrade('missing'),false);
});

test('empty flow clears state and updates UI before translated empty notice',()=>{
  const {c,calls}=harness({ids:['a'],index:0});
  assert.equal(c.startBulkIncompleteFlow(),false);
  assert.deepEqual(calls,[['ui',[],-1],['notice','translated:notice.incomplete','translated:notice.noIncomplete']]);
  assert.equal(c.clearBulkIncompleteFlow(),undefined);assert.deepEqual(calls.at(-1),['ui',[],-1]);
});

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

test('both presentation scripts declare editing APIs without running DOM or state access',()=>{
  const c=vm.createContext({});
  for(const source of sources)vm.runInContext(source,c);
  for(const name of [...flowNames,...controlNames,'updateTradeModalFlowUI','renderLogReadOnlyNotice'])assert.equal(typeof c[name],'function',name);
});
