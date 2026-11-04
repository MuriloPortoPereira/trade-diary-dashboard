// app.js
// Comportamento principal do TradeLog

// ══════════════════════════════════════════════
// ESTADO GLOBAL
// ══════════════════════════════════════════════
let trades = [];
let preMarketData = {};
let selectedErrors = [];
let tradeImages = [];
let pmCurrentMonth = '';
const DEFAULT_STRATEGIES = ['Al Brooks','Halt Vwap','Halt VWAP (André)','Setup VWAP (Rompimento)','PIVÔ Al Brooks','Trade de Impulso'];
const DEFAULT_TRADE_ERRORS = ['Saí cedo','Entrei atrasado','Posição grande demais','Ignorei o contexto','Movi stop','FOMO','Overtrade','Revenge trade','Entrou sem gatilho','Fora do horário','Ignorou notícia','Operou cansado','Risco maior que o plano','Stop mal posicionado','Take profit cedo','Hesitação na execução','Não aceitou stop','Reentrou sem setup','Operou notícia','Aumentou lote no prejuízo'];
let config = {
  balance: 1000, risk: 1, ddDaily: 2, ddWeekly: 5, ddMonthly: 8, tf: '5M', mode: 'percent',
  mult: 0.2, goal: 0, dd: 10, symDefault: '',
  strategies: [...DEFAULT_STRATEGIES],
  strategyDefaultsSeeded: false,
  deletedDefaultStrategies: [],
  partnerHub: {
    affiliates: [],
    btcAddress: '',
    btcQrImage: '',
    coffeeUrl: '',
  },
  emotions: ['Tranquilidade','Neutralidade','Medo','Frustração','Euforia','Clareza mental','FOMO','Raiva','Culpa'],
  markets: ['EUA','Forex','Crypto','B3'],
  symbols: ['US30','US500','USTEC','US2000','EURUSD','GBPUSD','USDJPY','XAUUSD','BTCUSD','ETHUSD'],
  pmHabits: ['Revisar notícias financeiras','Revisar limites financeiros pessoais','Operar somente dentro do plano','Respeitar limites do plano','Respeitar influência emocional','Revisar trades','Escrever documento de insights','Análise emocional geral'],
  generalDocs: [
    {id:'playbook', title:'Playbook operacional', content:'Regras centrais de execução, risco e revisão pós-trade.', images:[], updatedAt:'2026-04-19T12:00:00.000Z'},
    {id:'risk-map', title:'Mapa de risco', content:'Limites máximos por sessão, semana e conta. Ajuste este documento conforme sua evolução.', images:[], updatedAt:'2026-04-19T12:00:00.000Z'},
  ],
  beBreakeven: 0.1, // % — abaixo disso é considerado breakeven
};

// ── SISTEMA DE CONTAS ──
let accounts = [
  {id:'default',name:'Conta Principal',type:'cfd_pct',color:'#22d5ed',balance:1000,risk:1,mult:1,
   ddDaily:2,ddWeekly:5,ddMonthly:8,ddTotal:10,goalPct:10,goalWeek:200,goalMonth:500,goalTotal:2000}
];
let activeAccountId = 'default';

function getActiveAccount(){
  accounts=accounts.map(normalizeAccount);
  return accounts.find(a=>a.id===activeAccountId)||accounts[0];
}

function getAccountTrades(accountId){
  if(!accountId||accountId==='all')return trades;
  return trades.filter(t=>t.accountId===accountId||(accountId==='default'&&!t.accountId));
}

function getAccountWorkingBalance(acct){
  const account=acct?normalizeAccount(acct):getActiveAccount();
  if(!account)return config.balance||1000;
  const acctTrades=getAccountTrades(account.id);
  const risk=calcAccountRiskState(account,acctTrades);
  const currentBalance=risk?.currentBalance;
  return Number.isFinite(currentBalance)&&currentBalance>0
    ? currentBalance
    : (account.balance||config.balance||1000);
}

function getTradeFormAccount(){
  const acctId=document.getElementById('t-account')?.value||activeAccountId;
  return accounts.find(a=>a.id===acctId)||getActiveAccount();
}

function isFuturesAccount(acct){
  return false;
}

function normalizeAccountType(type){
  return type==='futures_usd'?'cfd_pct':(type||'cfd_pct');
}

function normalizeAccount(acct={}){
  return {
    ...acct,
    type:normalizeAccountType(acct.type),
    ddDaily:acct.ddDaily??2,
    ddWeekly:acct.ddWeekly??5,
    ddMonthly:acct.ddMonthly??acct.ddTotal??8,
    ddTotal:acct.ddTotal??10,
    risk:acct.risk??1,
    goalPct:acct.goalPct??10,
    cashflows:Array.isArray(acct.cashflows)
      ? acct.cashflows.map(sanitizeAccountCashflow).filter(Boolean)
      : [],
  };
}

function normalizePartnerAffiliate(entry={}){
  return {
    id:entry.id||uid(),
    name:String(entry.name||'').trim(),
    url:String(entry.url||'').trim(),
    code:String(entry.code||'').trim(),
    note:String(entry.note||'').trim(),
  };
}

function ensurePartnerHubConfig(base=config){
  const next={...(base||{})};
  const source=next.partnerHub&&typeof next.partnerHub==='object'&&!Array.isArray(next.partnerHub)
    ? next.partnerHub
    : {};
  next.partnerHub={
    affiliates:Array.isArray(source.affiliates)?source.affiliates.map(normalizePartnerAffiliate):[],
    btcAddress:String(source.btcAddress||'').trim(),
    btcQrImage:String(source.btcQrImage||''),
    coffeeUrl:String(source.coffeeUrl||'').trim(),
  };
  return next;
}

function getPartnerHubConfig(){
  config=ensurePartnerHubConfig(config);
  return config.partnerHub;
}

const SIMULATION_ENTRY_DEFAULTS = Object.freeze({
  riskPct:1,
  rrr:1.1,
  goalPct:10,
  stopPct:2,
});

function defaultStudyHubState(){
  return {
    propfirm:{
      accountSize:100000,
      payoutPct:80,
      maxDdPct:10,
      dailyDdPct:SIMULATION_ENTRY_DEFAULTS.stopPct,
      riskPct:SIMULATION_ENTRY_DEFAULTS.riskPct,
      targetPct:SIMULATION_ENTRY_DEFAULTS.goalPct,
      rrr:SIMULATION_ENTRY_DEFAULTS.rrr,
      fxRate:5.8,
      taxPct:6,
      feePct:2,
    },
    plan:{
      title:'Plano Principal',
      market:'Índices / Forex',
      window:'09:00 - 12:00',
      setup:'Operar apenas contexto limpo, gatilho claro e risco definido antes da execução.',
      invalidation:'Cancelar quando a estrutura perder contexto, volatilidade fugir do padrão ou surgir notícia fora do plano.',
      noTrade:'Não operar cansado, emocionalmente reativo ou tentando recuperar perda.',
      dailyGoal:SIMULATION_ENTRY_DEFAULTS.goalPct,
      dailyStop:SIMULATION_ENTRY_DEFAULTS.stopPct,
      maxTrades:4,
      checklist:'Revisar contexto macro\nMarcar níveis principais\nConfirmar risco do dia\nRevisar gatilho do setup',
      execution:'Executar só onde o plano já foi validado. Nada de antecipar candle ou mover stop sem motivo.',
      review:'Registrar contexto, erro, acerto e estado emocional ao fim da sessão.',
    },
    simulator:{
      capital:100000,
      riskPct:SIMULATION_ENTRY_DEFAULTS.riskPct,
      winRate:55,
      rrr:SIMULATION_ENTRY_DEFAULTS.rrr,
      trades:30,
      runs:200,
      seed:1,
    },
    mental:{
      focus:4,
      energy:4,
      stress:2,
      discipline:4,
      anchor:'Esperar o gatilho completo, aceitar o risco e executar sem pressa.',
      triggers:'Overtrade, revenge trade, pressa para recuperar loss, operar fora da janela.',
      cutoff:'Se houver dois erros de processo ou perda de clareza, encerrar a sessão e revisar.',
    },
  };
}

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let pendingImport = [];
let pendingImportMeta = null;
let editingId = null;
let editingAccountId = null;
let accountFormCashflows = [];
let appDialogState = null;
let selectedTrades = new Set();
let bulkIncompleteEditIds = [];
let bulkIncompleteEditIndex = -1;
let sortState = {col:'date', dir:'desc'};
let eqMode = 'value';
let activeDocFolder = 'generalNotes';
let statsAccountPinned = false;
let activeDocId = null;
let studyHubTab = 'propfirm';
let studyHubState = defaultStudyHubState();
const charts = {};

// ── CATEGORIZAÇÃO DE MERCADO ──
const MARKET_MAP = {
  'US30':'EUA','DJI':'EUA','DOW':'EUA','DJ30':'EUA','DJIUSD':'EUA','USAIND':'EUA',
  'US500':'EUA','SP500':'EUA','SPX500':'EUA','SPX':'EUA','SPXUSD':'EUA',
  'USTEC':'EUA','NAS100':'EUA','NDX':'EUA','NASDAQ':'EUA','TECH100':'EUA',
  'US2000':'EUA','RUT2000':'EUA','RUSSELL':'EUA',
  'GER40':'EUA','DAX':'EUA','UK100':'EUA','FRA40':'EUA',
  'EURUSD':'Forex','GBPUSD':'Forex','USDJPY':'Forex','AUDUSD':'Forex','USDCAD':'Forex',
  'NZDUSD':'Forex','USDCHF':'Forex','EURGBP':'Forex','EURJPY':'Forex','GBPJPY':'Forex',
  'EURCAD':'Forex','AUDCAD':'Forex','CADJPY':'Forex','CHFJPY':'Forex','AUDNZD':'Forex',
  'XAUUSD':'Forex','XAGUSD':'Forex','GOLD':'Forex','SILVER':'Forex',
  'USOIL':'Forex','UKOIL':'Forex','OIL':'Forex','WTI':'Forex','BRENT':'Forex',
  'BTCUSD':'Crypto','ETHUSD':'Crypto','BNBUSD':'Crypto','SOLUSD':'Crypto',
  'ADAUSD':'Crypto','XRPUSD':'Crypto','DOTUSD':'Crypto','LTCUSD':'Crypto',
  'DOGEUSD':'Crypto','AVAXUSD':'Crypto',
  'AAPL':'EUA','TSLA':'EUA','AMZN':'EUA','GOOGL':'EUA','MSFT':'EUA',
  'NVDA':'EUA','META':'EUA','NFLX':'EUA',
  'WIN':'B3','WDO':'B3','WINFUT':'B3','WDOFUT':'B3','IBOV':'B3',
  'PETR4':'B3','VALE3':'B3','ITUB4':'B3',
};

function getMarket(sym){
  if(!sym)return'';
  const s=sym.toUpperCase().replace(/\.[0-9A-Z]+$/,'');
  if(MARKET_MAP[s])return MARKET_MAP[s];
  if(/^(BTC|ETH|BNB|SOL|ADA|XRP|DOGE|AVAX|DOT|LTC)/.test(s))return'Crypto';
  if(/^(EUR|GBP|USD|AUD|CAD|CHF|NZD|JPY|XAU|XAG)/.test(s))return'Forex';
  if(/^(US|SP|NDX|DOW|DJI|NAS|TECH|RUSS)/.test(s))return'EUA';
  if(/^(WIN|WDO|IND|DI1|DOL)/.test(s))return'B3';
  return'';
}

// ── CORES CHART ──
const CHART_OPTS = {
  responsive:true,maintainAspectRatio:false,animation:{duration:200},
  plugins:{legend:{labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}},
  scales:{
    x:{ticks:{color:'#506a74',font:{size:8},maxTicksLimit:12},grid:{color:'rgba(255,255,255,.06)'}},
    y:{ticks:{color:'#506a74',font:{size:8}},grid:{color:'rgba(255,255,255,.06)'}}
  }
};
function mkChart(id,cfg){
  const cv=document.getElementById(id);
  if(!cv)return;
  if(charts[id]&&typeof charts[id].destroy==='function')charts[id].destroy();
  charts[id]=new Chart(cv,cfg);
}

function buildSignedEquityDataset(data, overrides={}){
  return {
    data,
    borderColor:'#22d5ed',
    pointBackgroundColor:'#22d5ed',
    pointBorderColor:'#22d5ed',
    backgroundColor:'rgba(34,213,237,.10)',
    borderWidth:2,
    pointRadius:0,
    tension:.3,
    fill:{target:'origin',above:'rgba(69,224,123,.12)',below:'rgba(255,93,104,.12)'},
    ...overrides,
  };
}

// ── FORMATAÇÃO ──
const f2 = v => typeof v==='number' ? v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : v;
const fR = v => '$'+f2(v);
const fP = v => (v*100).toFixed(2)+'%';
const fDate = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—';
const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

const tradeTimingDomain=TradeDiaryTradeTiming.createTradeTiming({normalizeDate,cleanCell:cleanMTCell});

function normalizeClockTime(value){return tradeTimingDomain.normalizeClockTime(value);}
function clockToMinutes(value){return tradeTimingDomain.clockToMinutes(value);}
function formatClockMinutes(value){return tradeTimingDomain.formatClockMinutes(value);}
function formatDurationMinutes(value){return tradeTimingDomain.formatDurationMinutes(value);}
function buildTradeDateTime(dateValue,timeValue){return tradeTimingDomain.buildTradeDateTime(dateValue,timeValue);}
function getTradeDurationMinutes(trade={}){return tradeTimingDomain.getTradeDurationMinutes(trade);}
function averageMinutes(values=[]){return tradeTimingDomain.averageMinutes(values);}
function summarizeTradeTimingGroup(source=[]){return tradeTimingDomain.summarizeTradeTimingGroup(source);}
function getTradeTimingStats(source=[]){return tradeTimingDomain.getTradeTimingStats(source);}

function mtTradeStatus(pnl){return pnl==null?'OPEN':Math.abs(pnl)<0.005?'BE':pnl>0?'WIN':'LOSS';}
function normalizeStrategyName(value){
  return cleanMTCell(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w]+/g,'');
}
function tagConfigKey(type){
  return type==='strategy'?'strategies':type+'s';
}
function ensureDefaultStrategies(cfg=config){
  const next={...cfg};
  if(!Array.isArray(next.strategies))next.strategies=[];
  if(Array.isArray(next.strategys)){
    const existingLegacy=new Set(next.strategies.map(normalizeStrategyName));
    next.strategys.forEach(name=>{
      const clean=cleanMTCell(name);
      const key=normalizeStrategyName(clean);
      if(clean&&key&&!existingLegacy.has(key)){next.strategies.push(clean);existingLegacy.add(key);}
    });
    delete next.strategys;
  }
  if(!Array.isArray(next.deletedDefaultStrategies))next.deletedDefaultStrategies=[];
  const deleted=new Set(next.deletedDefaultStrategies.map(normalizeStrategyName));
  const existing=new Set(next.strategies.map(normalizeStrategyName));
  DEFAULT_STRATEGIES.forEach(name=>{
    const key=normalizeStrategyName(name);
    if(!deleted.has(key)&&!existing.has(key)){next.strategies.push(name);existing.add(key);}
  });
  next.strategyDefaultsSeeded=true;
  return next;
}

function setMode(m){
  config.mode=m;save();
  document.getElementById('modePercent')?.classList.toggle('active',m==='percent');
  document.getElementById('modeAbsolute')?.classList.toggle('active',m==='absolute');
  const pEl=document.getElementById('modePercentFields');
  const aEl=document.getElementById('modeAbsFields');
  if(pEl)pEl.style.display=m==='percent'?'':'none';
  if(aEl)aEl.style.display=m==='absolute'?'':'none';
  const cur=document.querySelector('.page.active')?.id?.replace('page-','');
  if(cur==='log')renderLog();
  if(cur==='dashboard')renderDashboard();
}


function isBulkIncompleteFlowTrade(tradeId){
  return !!tradeId&&bulkIncompleteEditIds.includes(tradeId);
}

function clearBulkIncompleteFlow(){
  bulkIncompleteEditIds=[];
  bulkIncompleteEditIndex=-1;
  updateTradeModalFlowUI();
}

function openBulkIncompleteTradeAt(index){
  const queue=bulkIncompleteEditIds.filter(id=>getAccountTrades(activeAccountId).some(t=>t.id===id&&t.incomplete));
  bulkIncompleteEditIds=[...new Set(queue)];
  if(!bulkIncompleteEditIds.length){
    clearBulkIncompleteFlow();
    return false;
  }
  bulkIncompleteEditIndex=Math.max(0,Math.min(index,bulkIncompleteEditIds.length-1));
  return openModal('tradeModal',bulkIncompleteEditIds[bulkIncompleteEditIndex]);
}

function openPreviousBulkIncompleteTrade(){
  if(bulkIncompleteEditIndex<=0)return;
  openBulkIncompleteTradeAt(bulkIncompleteEditIndex-1);
}

function openNextBulkIncompleteTrade(){
  if(bulkIncompleteEditIndex<0||bulkIncompleteEditIndex>=bulkIncompleteEditIds.length-1)return;
  openBulkIncompleteTradeAt(bulkIncompleteEditIndex+1);
}

function startBulkIncompleteFlow(ids=[]){
  bulkIncompleteEditIds=[...new Set(ids.filter(id=>getAccountTrades(activeAccountId).some(t=>t.id===id&&t.incomplete)))];
  if(!bulkIncompleteEditIds.length){
    clearBulkIncompleteFlow();
    showAppNotice(t('notice.incomplete'),t('notice.noIncomplete'));
    return false;
  }
  bulkIncompleteEditIndex=0;
  return openBulkIncompleteTradeAt(0);
}

function getNextBulkIncompleteTradeAfterSave(currentId){
  if(!bulkIncompleteEditIds.length)return null;
  bulkIncompleteEditIds=[...new Set(bulkIncompleteEditIds.filter(id=>getAccountTrades(activeAccountId).some(t=>t.id===id&&t.incomplete)))];
  if(!bulkIncompleteEditIds.length){
    clearBulkIncompleteFlow();
    return null;
  }
  const nextId=bulkIncompleteEditIds.find(id=>id!==currentId)||null;
  if(!nextId){
    clearBulkIncompleteFlow();
    return null;
  }
  bulkIncompleteEditIndex=Math.max(0,bulkIncompleteEditIds.indexOf(nextId));
  return nextId;
}







function isLogPageActive(){
  return document.querySelector('.page.active')?.id==='page-log';
}

function accountDisplayName(accountId){
  if(accountId==='all')return 'todas as contas';
  if(accountId==='active')return accountDisplayName(activeAccountId);
  const acct=accounts.find(a=>a.id===accountId);
  return acct?.name||accountId||'conta selecionada';
}

function getLogAccountEditLock(options={}){
  const requireActivePage=options.requireActivePage!==false;
  if(requireActivePage&&!isLogPageActive())return {locked:false};
  const accountFilter=options.accountFilter??document.getElementById('filterAccount')?.value??'active';
  if(!accountFilter||accountFilter==='active'||accountFilter===activeAccountId)return {locked:false};
  return {
    locked:true,
    accountId:accountFilter,
    accountName:accountDisplayName(accountFilter),
    activeAccountName:accountDisplayName(activeAccountId),
    allAccounts:accountFilter==='all',
  };
}

function buildLogAccountEditLockMessage(lock,action='editar'){
  if(lock.allAccounts){
    return `Você está vendo todas as contas em modo consulta. Para ${action} operações, primeiro escolha uma conta específica como conta ativa. Assim o diário mantém cada histórico protegido e evita alterações na conta errada.`;
  }
  return `Você está visualizando ${lock.accountName}, mas a conta ativa agora é ${lock.activeAccountName}. Para ${action} operações, primeiro troque a conta ativa para ${lock.accountName}. Assim o diário mantém o histórico protegido e evita mudanças na conta errada.`;
}

function showLogAccountEditLockNotice(action='editar'){
  const lock=getLogAccountEditLock();
  if(!lock.locked)return false;
  showAppNotice(
    'Histórico em modo visualização',
    buildLogAccountEditLockMessage(lock,action),
    {confirmText:'Entendi'}
  );
  return true;
}



function clampDisciplineScore(value){
  const n=Math.round((Number(value)||0)/5)*5;
  return Math.max(0,Math.min(100,n));
}

function normalizeLooseText(value){
  return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function createSeededRandom(seedText='seed'){
  let seed=0;
  const source=String(seedText||'seed');
  for(let i=0;i<source.length;i++)seed=(seed*31+source.charCodeAt(i))>>>0;
  return()=>{
    seed=(seed*1664525+1013904223)>>>0;
    return seed/4294967296;
  };
}

function pickSeeded(random, list=[]){
  const arr=Array.isArray(list)?list:[];
  if(!arr.length)return'';
  const rnd=typeof random==='function'?random:Math.random;
  return arr[Math.floor(rnd()*arr.length)%arr.length];
}

function pickFollowedPlanForImport(status, random){
  const rnd=typeof random==='function'?random:Math.random;
  if(status==='WIN')return rnd()>0.22?'sim':'parcial';
  if(status==='LOSS')return rnd()>0.58?'sim':rnd()>0.34?'parcial':'nao';
  return rnd()>0.28?'sim':'parcial';
}

function calculateImportedDiscipline(followedPlan,status,errorCount,hesitation,random){
  const rnd=typeof random==='function'?random:Math.random;
  const base=followedPlan==='sim'
    ? 74+rnd()*22-(status==='LOSS'?10:0)
    : followedPlan==='parcial'
      ? 46+rnd()*26
      : 18+rnd()*28;
  const penalty=Math.min(24,errorCount*8)+(hesitation?8:0);
  return clampDisciplineScore(base-penalty);
}

function calculateImportedConfidence(status,followedPlan,random){
  const rnd=typeof random==='function'?random:Math.random;
  const raw=(status==='WIN'?62:status==='LOSS'?48:56)+(followedPlan==='sim'?12:followedPlan==='nao'?-10:0)+rnd()*18;
  return clampDisciplineScore(raw);
}

function buildImportTimingFields(trade, random){
  const rnd=typeof random==='function'?random:Math.random;
  const market=trade.market||getMarket(trade.symbol)||'EUA';
  let openMinutes=clockToMinutes(trade.openTime);
  if(openMinutes==null){
    const base=market==='Crypto'?10*60:market==='Forex'?8*60+35:market==='B3'?9*60+8:9*60+30;
    openMinutes=base+Math.floor(rnd()*35);
  }
  let placedMinutes=clockToMinutes(trade.placedTime);
  if(placedMinutes==null)placedMinutes=Math.max(0,openMinutes-(2+Math.floor(rnd()*13)));
  let exitMinutes=clockToMinutes(trade.exitTime);
  if(exitMinutes==null&&['WIN','LOSS','BE'].includes(trade.status)){
    const duration=trade.status==='WIN'
      ? 6+Math.floor(rnd()*26)
      : trade.status==='LOSS'
        ? 4+Math.floor(rnd()*30)
        : 3+Math.floor(rnd()*16);
    exitMinutes=Math.min(openMinutes+duration,23*60+59);
  }
  return{
    placedTime:formatClockMinutes(placedMinutes),
    openTime:formatClockMinutes(openMinutes),
    exitTime:exitMinutes==null?'':formatClockMinutes(exitMinutes),
  };
}

function ensureAccountByName(name, defaults={}){
  const target=cleanMTCell(name);
  const existing=accounts.find(acct=>normalizeLooseText(acct.name)===normalizeLooseText(target));
  if(existing)return existing;
  const account=normalizeAccount({
    id:(normalizeLooseText(target).replace(/[^\w]+/g,'-')||`a${Date.now()}`),
    name:target,
    type:'cfd_pct',
    color:'#22d5ed',
    balance:1000,
    risk:1,
    mult:1,
    ddDaily:2,
    ddWeekly:5,
    ddMonthly:8,
    ddTotal:10,
    goalPct:10,
    goalWeek:0,
    goalMonth:0,
    goalTotal:0,
    cashflows:[],
    ...defaults,
  });
  accounts.push(account);
  return account;
}

function ensureTickmillAccount(){
  return ensureAccountByName('Tickmill',{
    id:'tickmill',
    color:'#2bd9a0',
    balance:3000,
    risk:1,
    goalPct:10,
  });
}

function calcImportMissingFields(trade, status){
  return TradeDiaryImportTradeRules.calcImportMissingFields(trade,status);
}

const TIPS={
  pnl:`<strong>Lucro Líquido</strong><p>Soma de todos os P/L fechados no período. Inclui wins, losses e breakevens.</p><div class="tip-row"><span>Negativo</span><span>Período com prejuízo</span></div><div class="tip-row"><span>Positivo</span><span>Período lucrativo</span></div>`,
  wr:`<strong>Assertividade / Win Rate</strong><p>Percentual de trades fechados como WIN. Um bom win rate sozinho não garante lucro — depende do RRR.</p><div class="tip-row"><span>Abaixo de 40%</span><span>Precisa de RRR alto (2:1+)</span></div><div class="tip-row"><span>50–60%</span><span>Faixa comum em setups sólidos</span></div><div class="tip-row"><span>Acima de 70%</span><span>Verifique se o RRR não é baixo demais</span></div>`,
  pf:`<strong>Fator de Lucro</strong><p>Razão entre ganhos brutos e perdas brutas. Mede a eficiência do setup independente do número de trades.</p><div class="tip-row"><span>Abaixo de 1.0</span><span>Setup destrutivo</span></div><div class="tip-row"><span>1.0 – 1.5</span><span>Setup marginal</span></div><div class="tip-row"><span>Acima de 1.5</span><span>Setup saudável</span></div>`,
  exp:`<strong>Expectância</strong><p>Retorno médio esperado por trade em múltiplos de R (risco). Responde: "vale a pena entrar nesse setup?"</p><div class="tip-row"><span>Negativa</span><span>Setup perde no longo prazo</span></div><div class="tip-row"><span>+0.2R ou mais</span><span>Setup consistentemente lucrativo</span></div>`,
  expPct:`<strong>Expectância % / trade</strong><p>Retorno médio esperado por trade expresso como percentual do capital. Permite comparar setups com tamanhos de conta diferentes.</p><div class="tip-row"><span>Negativa</span><span>Setup destrói capital a cada trade</span></div><div class="tip-row"><span>Positiva</span><span>Capital cresce com a execução</span></div>`,
  dd:`<strong>Drawdown Máximo</strong><p>Maior queda registrada do pico ao vale da curva de capital no período. Indica o pior momento que você passou.</p><div class="tip-row"><span>Abaixo de 10%</span><span>Risco controlado</span></div><div class="tip-row"><span>10% – 20%</span><span>Zona de atenção</span></div><div class="tip-row"><span>Acima de 20%</span><span>Risco elevado — revisar gestão</span></div>`,
  recovery:`<strong>Fator de Recovery</strong><p>Razão entre o retorno total e o drawdown máximo. Quanto maior, mais eficiente o setup se recupera das perdas.</p><div class="tip-row"><span>Abaixo de 1</span><span>Perdas ainda não recuperadas</span></div><div class="tip-row"><span>1 – 2</span><span>Recuperação adequada</span></div><div class="tip-row"><span>Acima de 2</span><span>Setup com boa resiliência</span></div>`,
  sharpe:`<strong>Índice de Sharpe</strong><p>Mede o retorno ajustado ao risco total (volatilidade). Quanto maior, melhor a relação entre lucro e instabilidade dos resultados.</p><div class="tip-row"><span>Abaixo de 1</span><span>Retorno não justifica o risco</span></div><div class="tip-row"><span>1 – 2</span><span>Bom desempenho ajustado</span></div><div class="tip-row"><span>Acima de 2</span><span>Excelente relação risco/retorno</span></div>`,
  sortino:`<strong>Índice de Sortino</strong><p>Similar ao Sharpe, mas penaliza apenas a volatilidade negativa (perdas). Mais justo para setups que têm ganhos assimétricos.</p><div class="tip-row"><span>Maior que Sharpe</span><span>As perdas são controladas</span></div><div class="tip-row"><span>Menor que Sharpe</span><span>Perdas puxam mais do que os ganhos</span></div>`,
  calmar:`<strong>Índice de Calmar</strong><p>Razão entre o retorno anualizado e o drawdown máximo. Avalia se o lucro compensa a pior sequência de perdas.</p><div class="tip-row"><span>Abaixo de 1</span><span>Drawdown consume o lucro</span></div><div class="tip-row"><span>Acima de 2</span><span>Retorno superior ao risco vivido</span></div>`,
  followedPlan:`<strong>Seguiu o Plano</strong><p>Percentual de trades em que você marcou "Seguiu o plano: Sim". Mede sua disciplina de execução.</p><div class="tip-row"><span>Abaixo de 60%</span><span>Alta frequência de desvios</span></div><div class="tip-row"><span>Acima de 80%</span><span>Execução consistente</span></div>`,
  discipline:`<strong>Disciplina Média</strong><p>Média do score de disciplina (0–100) atribuído a cada trade. Reflete a qualidade da tomada de decisão.</p><div class="tip-row"><span>Abaixo de 60</span><span>Muitos trades impulsivos</span></div><div class="tip-row"><span>Acima de 80</span><span>Execução de alta qualidade</span></div>`,
  hesitation:`<strong>Hesitações</strong><p>Trades em que você marcou que hesitou na entrada. Hesitar pode significar um setup válido perdido ou disciplina evitando uma entrada ruim.</p><div class="tip-row"><span>Alta hesitação em WINs</span><span>Cuida: está perdendo entradas válidas</span></div><div class="tip-row"><span>Alta hesitação em LOSSes</span><span>Sinal de boa intuição — confie mais nela</span></div>`,
  errors:`<strong>Total de Erros</strong><p>Soma de todos os erros de processo marcados nos trades do período. Use para identificar padrões de comportamento a corrigir.</p>`,
  stopSessao:`<strong>Stop da Sessão</strong><p>Limite máximo de perda permitido no dia corrente, calculado como percentual do capital base da conta.</p><p><b>Como é calculado:</b> filtra todos os trades com data igual a hoje e soma as perdas. Se o P/L do dia for negativo, esse valor é comparado com o limite configurado (ex: 2%).</p><div class="tip-row"><span>0–50%</span><span>Sessão tranquila, pode operar</span></div><div class="tip-row"><span>50–80%</span><span>Atenção — reduza o tamanho</span></div><div class="tip-row"><span>Acima de 80%</span><span>Considere encerrar a sessão</span></div><div class="tip-row"><span>100%+</span><span>Limite atingido — pare agora</span></div>`,
  stopSemana:`<strong>Stop da Semana</strong><p>Limite acumulado de perda para a semana corrente (domingo a sábado), calculado como percentual do capital base.</p><p><b>Como é calculado:</b> filtra trades da semana corrente e soma as perdas. A janela reseta todo domingo. Ganhos não reduzem o consumo — só perdas contam.</p><div class="tip-row"><span>0–50%</span><span>Semana sob controle</span></div><div class="tip-row"><span>50–80%</span><span>Sequência ruim — revise os setups</span></div><div class="tip-row"><span>Acima de 80%</span><span>Considere parar de operar na semana</span></div>`,
  ddTotal:`<strong>Drawdown Total</strong><p>Queda acumulada desde o pico do saldo até o valor atual. Protege o capital conquistado a cada ciclo de meta.</p><p><b>Como é calculado:</b> percorre todos os trades em ordem cronológica, rastreia o pico histórico do saldo e compara com o valor atual. O limite é aplicado sobre a base do ciclo atual — ao bater a meta, a base avança e o DD passa a proteger o lucro acumulado.</p><div class="tip-row"><span>Abaixo de 30%</span><span>Conta saudável</span></div><div class="tip-row"><span>30–70%</span><span>Atenção — drawdown se aprofundando</span></div><div class="tip-row"><span>Acima de 85%</span><span>Risco crítico de atingir o limite</span></div>`,
  meta:`<strong>Meta da Conta</strong><p>Sistema de meta cíclica: ao atingir o percentual configurado, a meta se reinicia sobre o novo saldo — protegendo o lucro e sempre avançando.</p><p><b>Como é calculado:</b> o ciclo atual é determinado pelo número de vezes que o saldo cresceu X% sobre o capital inicial mais aportes. A barra mostra o progresso dentro do ciclo corrente.</p><div class="tip-row"><span>Ciclo 1</span><span>Ainda no capital inicial</span></div><div class="tip-row"><span>Ciclo 2+</span><span>Lucros sendo protegidos pela meta</span></div><div class="tip-row"><span>100%</span><span>Meta atingida — ciclo avança</span></div>`,
  riscoIdeal:`<strong>Risco Ideal por Trade</strong><p>Valor sugerido de risco por operação com base no percentual configurado e no capital atual da conta.</p><p>Operar com risco fixo em percentual garante que drawdowns reduzam automaticamente o tamanho das posições, protegendo o capital de sequências negativas.</p><div class="tip-row"><span>Saldo atual</span><span>Capital vivo na conta agora</span></div><div class="tip-row"><span>P/L hoje</span><span>Resultado acumulado do dia corrente</span></div><div class="tip-row"><span>P/L total</span><span>Resultado desde o início da conta</span></div><div class="tip-row"><span>Ciclo</span><span>Quantas metas foram batidas e % do ciclo atual</span></div>`,
  equityChart:`<strong>Curva de Equity</strong><p>Evolução do saldo ao longo do tempo, trade a trade. Mostra se o capital está crescendo de forma consistente ou com alta volatilidade.</p><div class="tip-row"><span>Linha suave e ascendente</span><span>Consistência alta</span></div><div class="tip-row"><span>Quedas bruscas</span><span>Drawdowns relevantes — investigar</span></div>`,
  wlChart:`<strong>Distribuição W/L</strong><p>Proporção visual entre trades vencedores (WIN), perdedores (LOSS) e empatados (BE) no período selecionado.</p>`,
  rMultiplos:`<strong>R-Múltiplos</strong><p>Cada barra representa o resultado de um trade em múltiplos de R (onde 1R = risco assumido no trade). Permite comparar trades de tamanhos diferentes na mesma escala.</p><div class="tip-row"><span>+1R</span><span>Ganhou o equivalente ao risco</span></div><div class="tip-row"><span>-1R</span><span>Perdeu o risco planejado</span></div>`,
  wdayChart:`<strong>P/L por Dia da Semana</strong><p>Soma dos resultados agrupada por dia da semana. Identifica dias com padrão de performance melhor ou pior.</p>`,
  monthEvChart:`<strong>Evolução Mensal</strong><p>P/L total de cada mês. Útil para ver sazonalidade e tendência de longo prazo.</p>`,
  stratDashChart:`<strong>P/L por Estratégia</strong><p>Resultado acumulado de cada estratégia no período. Mostra quais setups estão gerando valor e quais estão destruindo capital.</p>`,
  emoDashChart:`<strong>Win Rate por Emoção</strong><p>Assertividade agrupada pela emoção registrada no trade. Revela quais estados mentais estão correlacionados com melhores resultados.</p>`,
  radarEstrategias:`<strong>Radar de Estratégias</strong><p>Ranking das estratégias por P/L no período selecionado, com win rate e fator R.</p><p>Use para identificar o que está pagando agora e concentrar atenção nos setups mais eficientes.</p>`,
  stopFee:`<strong>Stop consumido por taxas</strong><p>Parcela do stop diário já consumida apenas pelas taxas de corretagem e spread, antes de qualquer resultado de trade.</p>`,
  expN:`<strong>Resultado Esperado (N trades)</strong><p>Projeção matemática do lucro esperado ao executar N trades com os parâmetros inseridos. É a expectância por trade multiplicada pelo número de trades.</p><p>Não garante resultado — mas mostra a direção do setup com volume suficiente de trades.</p>`,
  probPos:`<strong>Probabilidade de Resultado Positivo</strong><p>Percentual de cenários simulados (Monte Carlo) que terminaram acima do capital inicial, com os parâmetros inseridos.</p><div class="tip-row"><span>Abaixo de 50%</span><span>Setup desfavorável</span></div><div class="tip-row"><span>Acima de 65%</span><span>Setup com edge positivo</span></div>`,
  p10:`<strong>P10 (Cauda Adversa)</strong><p>Em 10% dos cenários simulados, o resultado ficou abaixo deste valor. Representa o pior decil — use para calibrar o quanto de drawdown aceitar.</p>`,
  p50:`<strong>Mediana (P50)</strong><p>Em 50% dos cenários simulados, o resultado ficou acima deste valor. É a expectativa mais realista do setup com o volume de trades configurado.</p>`,
  p90:`<strong>P90 (Cauda Favorável)</strong><p>Em 90% dos cenários simulados, o resultado ficou abaixo deste valor. Representa o melhor decil — útil para entender o teto realista de performance.</p>`,
  stEqChart:`<strong>Curva de Equity (Análises)</strong><p>Evolução do saldo trade a trade no período selecionado. Uma curva suave e ascendente indica consistência — quedas bruscas revelam drawdowns a investigar.</p>`,
  stWLChart:`<strong>Distribuição W/L</strong><p>Proporção entre trades vencedores (WIN), perdedores (LOSS) e empatados (BE). Visualiza o win rate de forma intuitiva — mas lembre: win rate sozinho não define lucratividade.</p>`,
  stRChart:`<strong>R-Múltiplos</strong><p>Resultado de cada trade em múltiplos de R (1R = risco assumido). Barras verdes acima de +1R são trades que valeram o risco; abaixo de -1R indicam saídas além do stop.</p><div class="tip-row"><span>+1R ou mais</span><span>Trade ganhou mais do que arriscou</span></div><div class="tip-row"><span>-1R</span><span>Stop respeitado</span></div><div class="tip-row"><span>Abaixo de -1R</span><span>Stop ultrapassado — investigar</span></div>`,
  stWdChart:`<strong>P/L por Dia da Semana</strong><p>Soma dos resultados agrupada por dia. Identifica quais dias da semana têm melhor e pior desempenho histórico — útil para ajustar o calendário de operações.</p>`,
  stMonthChart:`<strong>Evolução Mensal</strong><p>P/L total de cada mês no período selecionado. Permite identificar sazonalidade, meses consistentemente lucrativos ou prejudicados.</p>`,
  stDdChart:`<strong>Equity × Drawdown</strong><p>Sobreposição da curva de capital com a linha de drawdown corrente. Mostra visualmente a profundidade e duração dos períodos adversos em relação à evolução do saldo.</p>`,
  stHistChart:`<strong>Histograma de P/L</strong><p>Distribuição de frequência dos resultados por faixa de valor. Uma distribuição concentrada à direita (valores positivos) indica consistência; cauda longa à esquerda indica perdas atípicas.</p>`,
  stMetTable:`<strong>Tabela de Métricas</strong><p>Conjunto completo de indicadores quantitativos do período selecionado. Cada métrica avalia uma dimensão diferente do desempenho — juntas, formam um diagnóstico preciso do setup.</p>`,
  stStreak:`<strong>Streak & Sequências</strong><p>Análise das maiores sequências consecutivas de wins e losses. Sequências longas de losses revelam fragilidades do setup em certas condições de mercado.</p>`,
  stMonthPnlChart:`<strong>P/L por Mês (Análise Temporal)</strong><p>Resultado total de cada mês. Permite identificar sazonalidade, meses sistematicamente ruins ou bons, e tendências de evolução ao longo do tempo.</p>`,
  stWdWRChart:`<strong>Win Rate por Dia da Semana</strong><p>Assertividade (% de wins) agrupada por dia da semana. Mostra quais dias você fecha mais operações vencedoras — use para focar nos dias de maior edge histórico.</p>`,
  stHeatmap:`<strong>Heatmap de Horários</strong><p>Visualização hora a hora do P/L acumulado. Cores mais intensas indicam maior concentração de resultado (verde = lucro, vermelho = perda). Ajuda a identificar as janelas de horário mais produtivas.</p>`,
  stTimeCards:`<strong>Estatísticas de Timing</strong><p>Médias calculadas sobre todos os trades fechados: hora de colocação, acionamento, saída e duração. Compare WIN vs LOSS para identificar padrões de tempo que afetam o resultado.</p>`,
  stWdTable:`<strong>Desempenho por Dia da Semana</strong><p>Tabela com trades, win rate, P/L e R médio por dia. Mais granular que o gráfico — mostra o volume de amostras por dia para validar a relevância estatística.</p>`,
  stTimingStrat:`<strong>Timing por Estratégia</strong><p>Hora média de colocação, acionamento, saída e duração agrupados por estratégia. Revela se setups específicos têm padrões de horário distintos.</p>`,
  stStratPnl:`<strong>P/L por Estratégia</strong><p>Resultado acumulado de cada estratégia no período. Identifica quais setups estão gerando ou destruindo capital — base para decidir onde concentrar esforço.</p>`,
  stStratWR:`<strong>Win Rate por Estratégia</strong><p>Assertividade de cada estratégia no período. Compare com o P/L para distinguir setups com alta frequência mas baixo RRR dos setups com menos trades e maior qualidade.</p>`,
  stStratTable:`<strong>Comparativo de Estratégias</strong><p>Tabela completa com métricas por estratégia: trades, wins, win rate, P/L, R médio, Profit Factor, Expectância, Sharpe, Sortino, Calmar e Recovery. Use para ranquear e escolher qual estratégia priorizar.</p>`,
  stEmoWR:`<strong>Win Rate por Emoção</strong><p>Assertividade agrupada pela emoção registrada durante o trade. Mostra quais estados emocionais estão correlacionados com mais acertos — e quais prejudicam a tomada de decisão.</p><div class="tip-row"><span>Verde (≥50%)</span><span>Emoção favorável à execução</span></div><div class="tip-row"><span>Vermelho (&lt;50%)</span><span>Emoção que prejudica o resultado</span></div>`,
  stEmoPnl:`<strong>P/L médio por Emoção</strong><p>Resultado financeiro médio por trade agrupado por emoção. Complementa o Win Rate — uma emoção pode ter WR alto mas P/L baixo se os wins forem pequenos.</p>`,
  stDiscWR:`<strong>Disciplina × Win Rate</strong><p>Correlação entre o score de disciplina registrado (0–100) e a assertividade por faixa. Revela se operar com mais disciplina melhora objetivamente o resultado.</p><div class="tip-row"><span>Faixas de disciplina</span><span>0–20%, 21–40%, 41–60%, 61–80%, 81–100%</span></div>`,
  stErrors:`<strong>Erros mais frequentes</strong><p>Ranking dos tipos de erro de processo mais registrados nos trades do período. Use para identificar padrões de comportamento a trabalhar no próximo ciclo.</p>`,
  stHesitation:`<strong>Trades por hesitação (perdidos)</strong><p>Trades em que você marcou que hesitou na entrada. Analisa se a hesitação custou trades vencedores ou protegeu de perdas.</p><div class="tip-row"><span>Muita hesitação em WINs</span><span>Você está perdendo entradas válidas</span></div><div class="tip-row"><span>Muita hesitação em LOSSes</span><span>Intuição bem calibrada — confie mais nela</span></div>`,
  stPlanChart:`<strong>P/L por status de plano seguido</strong><p>Resultado agrupado por como o trade se relacionou com o plano: seguiu, parcial, não seguiu ou sem registro. Quantifica o custo financeiro de desviar do plano.</p>`,
  stEmoTable:`<strong>Análise por Emoção</strong><p>Tabela detalhada com win rate, P/L médio, R médio, taxa de plano seguido e disciplina média por emoção. Permite comparar todas as dimensões de performance emocional de uma vez.</p>`,
  simMonteCarlo:`<strong>Simulação Monte Carlo</strong><p>Projeta 100 cenários aleatórios de curvas de equity para as próximas N trades usando os parâmetros inseridos. Cada linha representa um caminho possível.</p><p>Útil para entender a amplitude de resultados possíveis e calibrar expectativas realistas antes de operar.</p><div class="tip-row"><span>Banda verde</span><span>Cenários favoráveis (P75–P90)</span></div><div class="tip-row"><span>Linha central</span><span>Mediana (P50) — resultado mais provável</span></div><div class="tip-row"><span>Banda vermelha</span><span>Cenários adversos (P10–P25)</span></div>`,
};
const mkTip=tip=>`<span class="m-tip-icon" tabindex="0">?<span class="m-tip-popup">${tip}</span></span>`;
const mkCard=(c)=>`<div class="metric-card ${c.cls||''}"><div class="m-label-row"><span class="m-label">${c.lbl}</span>${c.tip?mkTip(c.tip):''}</div><div class="m-value">${c.val}</div>${c.sub!=null?`<div class="m-sub">${c.sub}</div>`:''}</div>`;

// Tooltip manager — position:fixed no body, escapa qualquer stacking context ou overflow:hidden
(function(){
  if(typeof document==='undefined'||!document.body)return;
  const fl=document.createElement('div');
  fl.className='m-tip-float';
  document.body.appendChild(fl);
  let tid=null;

  function show(icon){
    const popup=icon.querySelector('.m-tip-popup');
    if(!popup)return;
    fl.innerHTML=popup.innerHTML;
    fl.classList.add('visible');
    reposition(icon);
  }
  function hide(){fl.classList.remove('visible');}
  function reposition(icon){
    const GAP=8;
    const r=icon.getBoundingClientRect();
    const fw=fl.offsetWidth||230;
    const fh=fl.offsetHeight||100;
    let top=r.top-fh-GAP;
    let left=r.left+r.width/2-fw/2;
    if(top<4){top=r.bottom+GAP;}
    left=Math.max(4,Math.min(left,window.innerWidth-fw-4));
    fl.style.top=top+'px';
    fl.style.left=left+'px';
  }

  document.addEventListener('mouseover',function(e){
    const icon=e.target.closest('.m-tip-icon');
    if(icon){clearTimeout(tid);show(icon);}
  });
  document.addEventListener('mouseout',function(e){
    const icon=e.target.closest('.m-tip-icon');
    if(icon){tid=setTimeout(hide,80);}
  });
})();

function calcMetrics(data=[], acctId=activeAccountId){
  const acct=accounts.find(a=>a.id===acctId)||getActiveAccount();
  const capitalBase=getAccountCapitalBase(acct);
  const startBal=Number.isFinite(capitalBase)&&capitalBase>0?capitalBase:(acct?.balance||config.balance||1000);
  return TradeDiaryTradeMetrics.calculateTradeMetrics(data,startBal);
}

function filterByPeriod(arr, period){
  const now=new Date(),y=now.getFullYear(),mo=now.getMonth();
  if(period==='today'){const today=now.toISOString().slice(0,10);return arr.filter(t=>t.date===today);}
  if(period==='month') return arr.filter(t=>{if(!t.date)return false;const d=new Date(t.date+'T12:00');return d.getFullYear()===y&&d.getMonth()===mo;});
  if(period==='year')  return arr.filter(t=>{if(!t.date)return false;return new Date(t.date+'T12:00').getFullYear()===y;});
  if(period==='week'){const ws=new Date(now);ws.setDate(now.getDate()-now.getDay());return arr.filter(t=>{if(!t.date)return false;return new Date(t.date+'T12:00')>=ws;});}
  return arr;
}

function getOrderedTrades(arr){
  return [...arr].filter(t=>t?.date).sort((a,b)=>{
    if(a.date===b.date){
      return String(a.createdAt||'').localeCompare(String(b.createdAt||''));
    }
    return String(a.date).localeCompare(String(b.date));
  });
}

function getAnchorTradeDate(arr){
  const ordered=getOrderedTrades(arr);
  return ordered.length ? ordered[ordered.length-1].date : new Date().toISOString().split('T')[0];
}

function normalizeCashflowType(type){
  return type==='withdrawal'?'withdrawal':'deposit';
}

function sanitizeAccountCashflow(flow={}){
  const amount=Math.abs(parseFloat(flow.amount)||0);
  if(!amount)return null;
  return {
    id:flow.id||uid(),
    type:normalizeCashflowType(flow.type),
    date:flow.date||new Date().toISOString().split('T')[0],
    amount,
    note:cleanMTCell(flow.note||''),
  };
}

function getAccountCashflows(acct){
  return Array.isArray(acct?.cashflows)?acct.cashflows:[];
}

function calcAccountCashflow(acct){
  return TradeDiaryAccountCashflow.calculateCashflowTotals(getAccountCashflows(acct));
}

function getAccountCapitalBase(acct){
  return (acct?.balance||0)+calcAccountCashflow(acct).net;
}

function getAccountCurrentBalance(acct, acctTrades=getAccountTrades(acct?.id)){
  const m=calcMetrics(acctTrades||[],acct?.id);
  return getAccountCapitalBase(acct)+m.totalPnl;
}

function addAccountCashflow(accountId, flow){
  const acct=accounts.find(a=>a.id===accountId);
  if(!acct)return null;
  const entry=sanitizeAccountCashflow(flow);
  if(!entry)return null;
  if(!Array.isArray(acct.cashflows))acct.cashflows=[];
  acct.cashflows.push(entry);
  save();
  return entry;
}

function deleteAccountCashflow(accountId, flowId){
  const acct=accounts.find(a=>a.id===accountId);
  if(!acct||!Array.isArray(acct.cashflows))return false;
  const before=acct.cashflows.length;
  acct.cashflows=acct.cashflows.filter(flow=>flow.id!==flowId);
  if(acct.cashflows.length!==before){save();return true;}
  return false;
}

function formatSignedMoney(value){
  const n=Number(value)||0;
  return `${n>=0?'+':'-'}${fR(Math.abs(n))}`;
}

function formatAccountBalanceChange(risk){
  if(!risk)return'—';
  const parts=[`P/L ${formatSignedMoney(risk.totalPnl)}`];
  if(Math.abs(risk.cashflowNet||0)>0.0001)parts.push(`Mov. ${formatSignedMoney(risk.cashflowNet)}`);
  return parts.join(' · ');
}

let topbarDensity='full';
const topbarValueCache={};

function formatTopbarMoneyCompact(value){
  const n=Number(value)||0;
  const abs=Math.abs(n);
  const sign=n<0?'-':'';
  const compact=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:1});
  if(abs>=1000000)return `${sign}$${compact(abs/1000000)}M`;
  if(abs>=1000)return `${sign}$${compact(abs/1000)}K`;
  return `${sign}${fR(abs)}`;
}

function formatTopbarSignedCompactMoney(value){
  const n=Number(value)||0;
  return `${n>=0?'+':'-'}${formatTopbarMoneyCompact(Math.abs(n))}`;
}

function formatTopbarSignedPct(value, digits=1){
  const n=Number(value)||0;
  return `${n>=0?'+':''}${n.toFixed(digits)}%`;
}

function topbarGoalPctLabel(value){
  const n=Number(value||0);
  return Number.isInteger(n)?n.toFixed(0):n.toFixed(1);
}

function setTopbarClass(el, base, cls){
  if(!el)return;
  el.className=[base,cls||''].filter(Boolean).join(' ');
}

function setTopbarValue(id, values, cls='', baseClass='tb-stat-val'){
  topbarValueCache[id]={full:values.full,compact:values.compact||values.full,cls,baseClass};
  renderTopbarValue(id);
}

function applyTopbarDensity(){
  Object.keys(topbarValueCache).forEach(renderTopbarValue);
}

function fitTopbarDensity(){
  applyTopbarDensity();
}

function usageTone(value){
  if(value>=0.85)return'danger';
  if(value>=0.6)return'warn';
  return'safe';
}

function formatRiskLimitMeta(used,limit,excessUsd,excessPct){
  if(excessUsd>0)return `<span class="danger">Excedeu ${fR(excessUsd)} (${f2(excessPct)}%)</span>`;
  return `Restante ${fR(Math.max(limit-used,0))}`;
}


function formatStrategyRatio(value){
  if(value===Infinity)return'∞';
  if(value===-Infinity)return'-∞';
  return Number.isFinite(value)?value.toFixed(2):'—';
}

function getStrategySnapshots(arr, acctId=activeAccountId){
  const closed=arr.filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const map={};
  closed.forEach(t=>{
    const key=t.strategy||'Sem estratégia';
    if(!map[key])map[key]={pnl:0,w:0,n:0,rs:[],lastDate:'',best:null,trades:[]};
    map[key].pnl+=(t.pnl||0);
    map[key].n++;
    map[key].trades.push(t);
    if(t.status==='WIN')map[key].w++;
    if(t.r!=null)map[key].rs.push(t.r);
    if(t.date&&(!map[key].lastDate||t.date>map[key].lastDate))map[key].lastDate=t.date;
    if((map[key].best==null||(t.pnl||0)>map[key].best)&&t.pnl!=null)map[key].best=t.pnl;
  });
  return Object.entries(map).map(([name,data])=>{
    const metrics=calcMetrics(data.trades,acctId);
    return {
      name,
      pnl:data.pnl,
      wr:data.n?(data.w/data.n)*100:0,
      n:data.n,
      wins:data.w,
      avgR:data.rs.length?data.rs.reduce((sum,v)=>sum+v,0)/data.rs.length:0,
      pf:metrics.pf,
      exp:metrics.exp,
      sharpe:metrics.sharpe,
      sortino:metrics.sortino,
      calmar:metrics.calmar,
      recovery:metrics.recovery,
      maxDD:metrics.maxDD,
      maxDDusd:metrics.maxDDusd,
      startBal:metrics.startBal,
      lastDate:data.lastDate,
      best:data.best,
      trades:[...data.trades],
    };
  }).sort((a,b)=>b.pnl-a.pnl||b.wr-a.wr||b.n-a.n);
}

function getClosedStrategyTradesChronologically(source=[]){
  return (Array.isArray(source)?source:[])
    .filter(t=>t&&['WIN','LOSS','BE'].includes(t.status))
    .sort((a,b)=>{
      const aKey=`${a.date||''} ${normalizeClockTime(a.openTime)||normalizeClockTime(a.exitTime)||''} ${a.createdAt||''}`;
      const bKey=`${b.date||''} ${normalizeClockTime(b.openTime)||normalizeClockTime(b.exitTime)||''} ${b.createdAt||''}`;
      return aKey<bKey?-1:aKey>bKey?1:0;
    });
}

function buildStrategyEquitySeries(row){
  const closed=getClosedStrategyTradesChronologically(row?.trades);
  let running=Number.isFinite(row?.startBal)&&row.startBal>0?row.startBal:1000;
  const points=[parseFloat(running.toFixed(2))];
  closed.forEach(trade=>{
    running+=(trade.pnl||0);
    points.push(parseFloat(running.toFixed(2)));
  });
  return {closed,points};
}

function getStrategyCompareMetricDefs(){
  return [
    {key:'n',label:'Trades',better:'higher',get:row=>row?.n||0,format:value=>String(value||0)},
    {key:'wr',label:'Win Rate',better:'higher',get:row=>row?.wr||0,format:value=>`${(value||0).toFixed(1)}%`},
    {key:'pnl',label:'P/L',better:'higher',get:row=>row?.pnl||0,format:value=>`${value>=0?'+':''}${fR(value||0)}`},
    {key:'avgR',label:'Avg R',better:'higher',get:row=>row?.avgR||0,format:value=>`${value>=0?'+':''}${(value||0).toFixed(2)}R`},
    {key:'exp',label:'Expectância',better:'higher',get:row=>row?.exp||0,format:value=>`${value>=0?'+':''}${(value||0).toFixed(3)}R`},
    {key:'pf',label:'Profit Factor',better:'higher',get:row=>row?.pf??0,format:value=>formatStrategyRatio(value)},
    {key:'maxDD',label:'Max DD',better:'lower',get:row=>(row?.maxDD||0)*100,format:value=>`${(value||0).toFixed(1)}%`},
    {key:'recovery',label:'Fator Rec.',better:'higher',get:row=>row?.recovery??0,format:value=>formatStrategyRatio(value)},
  ];
}

function averageNumber(values=[]){
  const list=(Array.isArray(values)?values:[])
    .map(v=>Number(v))
    .filter(v=>Number.isFinite(v));
  if(!list.length)return null;
  return list.reduce((sum,v)=>sum+v,0)/list.length;
}

function medianNumber(values=[]){
  const list=(Array.isArray(values)?values:[])
    .map(v=>Number(v))
    .filter(v=>Number.isFinite(v))
    .sort((a,b)=>a-b);
  if(!list.length)return null;
  const mid=Math.floor(list.length/2);
  return list.length%2?list[mid]:(list[mid-1]+list[mid])/2;
}

function getStrategyOutcomeStats(row){
  const closed=getClosedStrategyTradesChronologically(row?.trades);
  const wins=closed.filter(t=>t.status==='WIN');
  const losses=closed.filter(t=>t.status==='LOSS');
  const bes=closed.filter(t=>t.status==='BE');
  const pnlValues=closed.map(t=>Number(t.pnl)).filter(v=>Number.isFinite(v));
  return {
    total:closed.length,
    wins:wins.length,
    losses:losses.length,
    bes:bes.length,
    winRatePct:closed.length?(wins.length/closed.length)*100:0,
    lossRatePct:closed.length?(losses.length/closed.length)*100:0,
    beRatePct:closed.length?(bes.length/closed.length)*100:0,
    avgWinPnl:averageNumber(wins.map(t=>t.pnl)),
    avgLossPnl:averageNumber(losses.map(t=>t.pnl)),
    medianPnl:medianNumber(pnlValues),
    bestPnl:pnlValues.length?Math.max(...pnlValues):null,
    worstPnl:pnlValues.length?Math.min(...pnlValues):null,
  };
}

function getTimingWindowLabel(startMinutes,bucketSize=30){
  if(!Number.isFinite(startMinutes))return'—';
  const start=((Math.round(startMinutes)%(24*60))+(24*60))%(24*60);
  return `${formatClockMinutes(start)}-${formatClockMinutes(start+bucketSize-1)}`;
}

function getDominantTimingWindow(source=[],bucketSize=30){
  const buckets={};
  (Array.isArray(source)?source:[]).forEach(trade=>{
    const minutes=clockToMinutes(trade?.openTime);
    if(minutes==null)return;
    const bucketStart=Math.floor(minutes/bucketSize)*bucketSize;
    if(!buckets[bucketStart])buckets[bucketStart]={count:0,pnl:0};
    buckets[bucketStart].count++;
    buckets[bucketStart].pnl+=(trade?.pnl||0);
  });
  const winner=Object.entries(buckets).sort((a,b)=>b[1].count-a[1].count||b[1].pnl-a[1].pnl||Number(a[0])-Number(b[0]))[0];
  if(!winner)return{label:'—',count:0,pnl:0};
  return{
    label:getTimingWindowLabel(Number(winner[0]),bucketSize),
    count:winner[1].count,
    pnl:winner[1].pnl,
  };
}

function coerceStrategyCompareValue(value, reference=1){
  if(value===Infinity)return Math.max(reference,1)*1.25;
  if(value===-Infinity)return -Math.max(reference,1)*1.25;
  return Number.isFinite(value)?value:0;
}

function getStrategyCompareScores(def,rowA,rowB){
  const rawA=def.get(rowA);
  const rawB=def.get(rowB);
  const ref=Math.max(
    Number.isFinite(rawA)?Math.abs(rawA):0,
    Number.isFinite(rawB)?Math.abs(rawB):0,
    1
  );
  const a=coerceStrategyCompareValue(rawA,ref);
  const b=coerceStrategyCompareValue(rawB,ref);
  if(Math.abs(a-b)<1e-9)return[100,100];
  if(def.better==='lower'){
    const max=Math.max(a,b);
    const min=Math.min(a,b);
    const range=max-min||1;
    return [
      +(((max-a)/range)*100).toFixed(1),
      +(((max-b)/range)*100).toFixed(1),
    ];
  }
  const max=Math.max(a,b);
  const min=Math.min(a,b,0);
  const range=max-min||1;
  return [
    +(((a-min)/range)*100).toFixed(1),
    +(((b-min)/range)*100).toFixed(1),
  ];
}

function getStrategyMetricWinner(def,rowA,rowB){
  const ref=Math.max(
    Math.abs(def.get(rowA)||0),
    Math.abs(def.get(rowB)||0),
    1
  );
  const a=coerceStrategyCompareValue(def.get(rowA),ref);
  const b=coerceStrategyCompareValue(def.get(rowB),ref);
  if(Math.abs(a-b)<1e-9)return'Empate';
  if(def.better==='lower')return a<b?rowA.name:rowB.name;
  return a>b?rowA.name:rowB.name;
}


function renderDashStrategyBoard(arr){
  renderStrategyRows('dashStrategyBoard',getStrategySnapshots(arr),5);
}



function getSortedTrades(arr){
  const {col,dir}=sortState;
  return [...arr].sort((a,b)=>{
    let va=a[col],vb=b[col];
    if(col==='idx'){va=arr.indexOf(a);vb=arr.indexOf(b);}
    if(va==null)return 1;if(vb==null)return -1;
    if(typeof va==='string')va=va.toLowerCase();
    if(typeof vb==='string')vb=vb.toLowerCase();
    const cmp=va<vb?-1:va>vb?1:0;
    return dir==='asc'?cmp:-cmp;
  });
}

function normalizeLogDate(value){
  const raw=String(value||'').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:'';
}

function normalizeLogDateRange(startDate='',endDate=''){
  let start=normalizeLogDate(startDate);
  let end=normalizeLogDate(endDate);
  if(start&&end&&start>end)[start,end]=[end,start];
  return {startDate:start,endDate:end};
}

function isTradeInLogDateRange(trade,startDate='',endDate=''){
  const range=normalizeLogDateRange(startDate,endDate);
  if(!range.startDate&&!range.endDate)return true;
  const date=normalizeLogDate(trade?.date);
  if(!date)return false;
  if(range.startDate&&date<range.startDate)return false;
  if(range.endDate&&date>range.endDate)return false;
  return true;
}

function getLogDateRangeFromControls(){
  return normalizeLogDateRange(
    document.getElementById('filterDateStart')?.value||'',
    document.getElementById('filterDateEnd')?.value||''
  );
}





let calViewMode='week';




function buildHesitationStats(source=[]){
  const hesitations=source.filter(t=>t&&t.hesitation);
  const total=hesitations.length;
  const wins=hesitations.filter(t=>t.status==='WIN').length;
  const losses=hesitations.filter(t=>t.status==='LOSS').length;
  const breakeven=hesitations.filter(t=>t.status==='BE').length;
  const other=Math.max(total-wins-losses-breakeven,0);
  const potentialPnl=hesitations.reduce((a,t)=>a+(Number(t.pnl)||0),0);
  const decided=wins+losses;
  return {
    total,
    wins,
    losses,
    breakeven,
    other,
    potentialPnl,
    winRatePct:decided?+(wins/decided*100).toFixed(0):0,
    lossRatePct:decided?+(losses/decided*100).toFixed(0):0,
  };
}

function buildDisciplineBuckets(source=[]){
  const labels=['0-20%','21-40%','41-60%','61-80%','81-100%'];
  const buckets=labels.map(label=>({label,count:0,wins:0,pnl:0,winRatePct:null,avgPnl:null}));
  (Array.isArray(source)?source:[]).forEach(trade=>{
    if(trade?.discipline==null)return;
    const val=clamp(Number(trade.discipline)||0,0,100);
    const index=val<=20?0:val<=40?1:val<=60?2:val<=80?3:4;
    const bucket=buckets[index];
    bucket.count++;
    if(trade.status==='WIN')bucket.wins++;
    bucket.pnl+=(trade.pnl||0);
  });
  return buckets.map(bucket=>({
    ...bucket,
    winRatePct:bucket.count?+(bucket.wins/bucket.count*100).toFixed(1):null,
    avgPnl:bucket.count?+((bucket.pnl/bucket.count).toFixed(2)):null,
  }));
}

function toSimulationNumber(value, fallback=0){
  return TradeDiarySimulationSizing.toSimulationNumber(value,fallback);
}

function roundSimulationMoney(value){
  return TradeDiarySimulationSizing.roundSimulationMoney(value);
}

function clampSimulationWinRatePct(value){
  return clamp(toSimulationNumber(value,55),1,99);
}

function clampSimulationWinRateInput(){
  const el=document.getElementById('simWR');
  if(!el)return;
  const raw=String(el.value||'').trim();
  if(!raw)return;
  const n=parseFloat(raw);
  if(!Number.isFinite(n)){el.value='55';return;}
  el.value=String(clamp(n,1,99));
}

function calculateSimulationSizing({balance=0,riskPct=0,goalPct=0,stopPct=0}={}){
  return TradeDiarySimulationSizing.calculateSimulationSizing({balance,riskPct,goalPct,stopPct});
}

function getSimulationEntryDefaults(input={}){
  const opts=typeof input==='number'?{balance:input}:(input||{});
  const balance=opts.balance??config.balance??1000;
  return {
    accountId:opts.accountId||'manual',
    accountName:opts.accountName||'Manual',
    winRatePct:clampSimulationWinRatePct(opts.winRatePct??55),
    rrr:SIMULATION_ENTRY_DEFAULTS.rrr,
    ...calculateSimulationSizing({
      balance,
      riskPct:SIMULATION_ENTRY_DEFAULTS.riskPct,
      goalPct:SIMULATION_ENTRY_DEFAULTS.goalPct,
      stopPct:SIMULATION_ENTRY_DEFAULTS.stopPct,
    }),
  };
}

function buildSimulationPlan({trades=20,winRatePct=55,rrr=1,riskUsd=0,goalPct=0,goalUsd=0,stopPct=0,stopUsd=0}={}){
  const cleanTrades=Math.max(1,parseInt(trades)||20);
  const wr=clampSimulationWinRatePct(winRatePct)/100;
  const cleanRrr=Math.max(0,toSimulationNumber(rrr,1));
  const risk=Math.max(0,toSimulationNumber(riskUsd,0));
  const goal=Math.max(0,toSimulationNumber(goalUsd,0));
  const stop=Math.max(0,toSimulationNumber(stopUsd,0));
  const winUsd=risk*cleanRrr;
  const expectancy=wr*winUsd-(1-wr)*risk;
  const winsToGoal=winUsd>0&&goal>0?Math.ceil(goal/winUsd):0;
  const lossesToStop=risk>0&&stop>0?Math.floor(stop/risk):0;
  const expectedTradesToGoal=expectancy>0&&goal>0?Math.ceil(goal/expectancy):0;
  let tone='safe';
  let title='Plano favorece execução';
  if(risk<=0||goal<=0||stop<=0){
    tone='warn';
    title='Preencha risco, meta e stop';
  }else if(expectancy<=0){
    tone='danger';
    title='Matemática desfavorável';
  }else if(expectedTradesToGoal>cleanTrades||lossesToStop<2){
    tone='warn';
    title='Plano exige cautela';
  }
  const expectedText=expectedTradesToGoal
    ? `${expectedTradesToGoal} trades esperados até a meta`
    : 'expectância negativa para meta';
  return {
    tone,
    title,
    winsToGoal,
    lossesToStop,
    expectedTradesToGoal,
    expectancyUsd:roundSimulationMoney(expectancy),
    summary:`${winsToGoal} wins até meta (${goalPct}% / ${fR(goal)}). Stop comporta ${lossesToStop} perdas cheias (${stopPct}% / ${fR(stop)}). ${expectedText}.`,
  };
}

function getSimulationAccountSnapshot(accountId=activeAccountId){
  const acct=(accountId&&accountId!=='manual')
    ? accounts.find(a=>a.id===accountId)
    : (accountId==='manual'?null:getActiveAccount());
  if(!acct){
    return getSimulationEntryDefaults({
      accountId:'manual',
      accountName:'Manual',
      winRatePct:55,
      balance:config.balance||1000,
    });
  }
  const acctTrades=getAccountTrades(acct.id);
  const riskState=calcAccountRiskState(acct,acctTrades);
  const metrics=calcMetrics(acctTrades,acct.id);
  return getSimulationEntryDefaults({
    accountId:acct.id,
    accountName:acct.name||'Conta',
    winRatePct:metrics.closed.length?clampSimulationWinRatePct(roundSimulationMoney(metrics.wr*100)):55,
    balance:riskState.currentBalance,
  });
}

function setSimulationInputValue(id,value,decimals=2){
  const el=document.getElementById(id);
  if(!el||!Number.isFinite(Number(value)))return;
  el.value=Number(value).toFixed(decimals);
}

function ensureSimulationSelectOption(select,value,label){
  if(!select)return;
  const target=String(value);
  const options=Array.from(select.options||[]);
  if(options.some(option=>String(option.value)===target))return;
  const option=document.createElement('option');
  option.value=target;
  option.textContent=label||`${target}R`;
  const customOption=options.find(option=>String(option.value)==='custom');
  if(customOption&&typeof select.insertBefore==='function')select.insertBefore(option,customOption);
  else if(typeof select.appendChild==='function')select.appendChild(option);
}

function setSimulationRrrInput(value=SIMULATION_ENTRY_DEFAULTS.rrr){
  const rrrSel=document.getElementById('simRRR');
  const rrrCustom=document.getElementById('simRRRCustom');
  if(!rrrSel)return;
  const raw=String(value);
  ensureSimulationSelectOption(rrrSel,raw,`${raw}R`);
  rrrSel.value=raw;
  if(rrrCustom){
    rrrCustom.value=raw;
    rrrCustom.style.display=rrrSel.value==='custom'?'block':'none';
  }
}




function buildMonteCarloBalanceProjection({balance,trades,winRate,rrr,riskUsd,goalUsd,stopUsd,scenarioCount=100}){
  const startBalance=roundSimulationMoney(balance);
  const N=Math.max(parseInt(trades,10)||0,1);
  const wr=clamp(toSimulationNumber(winRate,0.55),0.01,0.99);
  const risk=toSimulationNumber(riskUsd,0);
  const labels=[...Array(N+1)].map((_,i)=>i);
  const scenarios=[];
  for(let s=0;s<scenarioCount;s++){
    let balanceNow=startBalance;
    const line=[startBalance];
    for(let i=0;i<N;i++){
      balanceNow+=Math.random()<wr?rrr*risk:-risk;
      line.push(roundSimulationMoney(balanceNow));
    }
    scenarios.push(line);
  }
  const results=scenarios.map(line=>line[N]).sort((a,b)=>a-b);
  const medianLine=labels.map((_,i)=>{
    const values=scenarios.map(line=>line[i]).sort((a,b)=>a-b);
    return values[Math.floor(values.length/2)];
  });
  const goalBalance=roundSimulationMoney(startBalance+goalUsd);
  const stopBalance=roundSimulationMoney(startBalance-stopUsd);
  return{
    labels,
    scenarios,
    medianLine,
    goalBalance,
    stopBalance,
    probPositive:results.filter(value=>value>startBalance).length,
    probGoal:results.filter(value=>value>=goalBalance).length,
    probStop:results.filter(value=>value<=stopBalance).length,
  };
}


function getStatsPeriodTrades(){
  const period=document.getElementById('statPeriod')?.value||'all';
  const acctFilter=document.getElementById('statAccount')?.value||activeAccountId;
  let arr=acctFilter==='all'?accounts.flatMap(a=>getAccountTrades(a.id)):getAccountTrades(acctFilter);
  if(period==='custom'){
    const from=document.getElementById('statDateFrom')?.value;
    const to=document.getElementById('statDateTo')?.value;
    if(from||to){arr=arr.filter(t=>{if(!t.date)return false;return(!from||t.date>=from)&&(!to||t.date<=to);});}
  } else {arr=filterByPeriod(arr,period);}
  return arr;
}

function openPMMonth(ym){
  pmCurrentMonth=ym;
  showPage('premarket');
}

function addPMHabit(){
  const inp=document.getElementById('pmNewHabit');
  const val=(inp?.value||'').trim();
  if(!val)return;
  config.pmHabits.push(val);
  inp.value='';
  save();renderPremarket();
}

function removePMHabit(idx){
  config.pmHabits.splice(idx,1);
  save();renderPremarket();
}

function movePMHabit(idx,delta){
  const arr=config.pmHabits;
  const to=idx+delta;
  if(to<0||to>=arr.length)return;
  [arr[idx],arr[to]]=[arr[to],arr[idx]];
  save();renderPremarket();
}

function _renderPMHabitManager(){
  const el=document.getElementById('pmHabitList');if(!el)return;
  el.innerHTML=config.pmHabits.map((h,i)=>`
    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <span style="flex:1;font-size:12px;color:var(--text2)">${escapeHtml(h)}</span>
      <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:10px" onclick="movePMHabit(${i},-1)" ${i===0?'disabled':''}>↑</button>
      <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:10px" onclick="movePMHabit(${i},1)" ${i===config.pmHabits.length-1?'disabled':''}>↓</button>
      <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:10px;color:var(--red)" onclick="removePMHabit(${i})">✕</button>
    </div>`).join('');
}

function _renderPMCorrelCards(){
  const el=document.getElementById('pmCorrelCards');if(!el)return;
  const acctTrades=getAccountTrades(activeAccountId);
  const closed=acctTrades.filter(t=>t.status==='WIN'||t.status==='LOSS');
  const n=config.pmHabits.length;
  if(!n){el.innerHTML='';return;}
  const buckets={high:{pnl:0,cnt:0},mid:{pnl:0,cnt:0},low:{pnl:0,cnt:0}};
  Object.entries(preMarketData).forEach(([date,pm])=>{
    const habits=pm.habits;if(!Array.isArray(habits))return;
    const pct=habits.filter(Boolean).length/n;
    const dayTrades=closed.filter(t=>t.date===date);
    if(!dayTrades.length)return;
    const dayPnl=dayTrades.reduce((a,t)=>a+(t.pnl||0),0);
    const bucket=pct>=0.8?'high':pct>=0.5?'mid':'low';
    buckets[bucket].pnl+=dayPnl;buckets[bucket].cnt++;
  });
  const fmt=(b)=>b.cnt?((b.pnl>=0?'+':'')+fR(b.pnl/b.cnt)+' / dia ('+b.cnt+' dias)'):'sem dados';
  const habitTip=`<strong>Hábitos × P/L</strong><p>Correlação entre o percentual de hábitos cumpridos no dia e o resultado financeiro médio por sessão. Ajuda a entender se a consistência de rotina impacta a performance.</p>`;
  el.innerHTML=[
    {cls:'c-green',lbl:'≥ 80% hábitos',val:fmt(buckets.high),sub:'alta disciplina',tip:habitTip},
    {cls:'c-yellow',lbl:'50 – 79% hábitos',val:fmt(buckets.mid),sub:'disciplina parcial',tip:habitTip},
    {cls:'c-red',lbl:'< 50% hábitos',val:fmt(buckets.low),sub:'baixa disciplina',tip:habitTip},
  ].map(mkCard).join('');
}

function shiftPMMonth(delta){
  const [y,m]=pmCurrentMonth.split('-').map(Number);
  const d=new Date(y,m-1+delta,1);
  pmCurrentMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  renderPremarket();
}

function togglePMHabit(date,idx){
  if(!preMarketData[date])preMarketData[date]={};
  const n=config.pmHabits.length;
  if(!Array.isArray(preMarketData[date].habits))preMarketData[date].habits=new Array(n).fill(false);
  preMarketData[date].habits[idx]=!preMarketData[date].habits[idx];
  preMarketData[date].savedAt=new Date().toISOString();
  save();
  const cell=document.querySelector(`[data-pmcell="${date}-${idx}"]`);
  if(cell)cell.classList.toggle('pm-dot-done',preMarketData[date].habits[idx]);
  _updatePMStats();
}

function _updatePMStats(){
  const [y,m]=pmCurrentMonth.split('-').map(Number);
  const daysInMonth=new Date(y,m,0).getDate();
  const n=config.pmHabits.length;
  const discLabels=[],discData=[];
  for(let d=1;d<=daysInMonth;d++){
    const date=pmCurrentMonth+'-'+String(d).padStart(2,'0');
    discLabels.push(String(d));
    const habits=preMarketData[date]?.habits;
    discData.push(habits&&n?Math.round(habits.filter(Boolean).length/n*100):0);
  }
  const pct=Math.round(discData.reduce((a,v)=>a+v,0)/daysInMonth);
  const lbl=document.getElementById('pmDisciplinePct');if(lbl)lbl.textContent=pct+'%';
  const meta=document.getElementById('pmMetaMes');if(meta)meta.textContent=pct+'%';
  if(document.getElementById('pmDisciplineChart')){
    mkChart('pmDisciplineChart',{
      type:'bar',
      data:{labels:discLabels,datasets:[{data:discData,backgroundColor:discData.map(v=>v>=80?'rgba(69,224,123,.7)':v>=50?'rgba(34,213,237,.6)':'rgba(255,93,104,.55)'),borderColor:'transparent',borderRadius:3}]},
      options:{...CHART_OPTS,scales:{x:{...CHART_OPTS.scales?.x,ticks:{font:{size:9}}},y:{...CHART_OPTS.scales?.y,min:0,max:100,ticks:{callback:v=>v+'%',font:{size:9}}}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}},
    });
  }
  _renderPMCorrelCards();
}

function _pmMonthDiscipline(ym){
  const [y,m]=ym.split('-').map(Number);
  const days=new Date(y,m,0).getDate();
  const n=config.pmHabits.length;
  let total=0,done=0;
  for(let d=1;d<=days;d++){
    const date=ym+'-'+String(d).padStart(2,'0');
    const habits=preMarketData[date]?.habits;
    if(habits){total+=n;done+=habits.filter(Boolean).length;}
  }
  return total?Math.round(done/total*100):0;
}

function savePM(){
  // kept for compatibility — habit toggling is now inline via togglePMHabit
}

function deleteStrategy(idx){
  const name=config.strategies[idx];if(!name)return;
  const count=strategyUsageCount(name);
  const msg=count
    ? `Excluir "${name}" da lista de estratégias?\n\nEla aparece em ${count} trade(s). Os trades antigos continuam com esse nome no histórico.`
    : `Excluir "${name}" da lista de estratégias?`;
  showAppConfirm('Excluir estratégia',msg,()=>{
    rememberDeletedDefaultStrategy(name);
    config.strategies.splice(idx,1);
    config.strategyDefaultsSeeded=true;
    save();renderSetup();
  },{danger:true,confirmText:'Excluir'});
}

function rememberDeletedDefaultStrategy(name){
  const defaultMatch=DEFAULT_STRATEGIES.find(s=>normalizeStrategyName(s)===normalizeStrategyName(name));
  if(defaultMatch){
    if(!Array.isArray(config.deletedDefaultStrategies))config.deletedDefaultStrategies=[];
    if(!config.deletedDefaultStrategies.some(s=>normalizeStrategyName(s)===normalizeStrategyName(defaultMatch))){
      config.deletedDefaultStrategies.push(defaultMatch);
    }
  }
}

function renameStrategy(idx,newName){
  const oldName=config.strategies?.[idx];if(!oldName)return false;
  const next=cleanMTCell(newName);
  if(!next)return false;
  const nextKey=normalizeStrategyName(next);
  const oldKey=normalizeStrategyName(oldName);
  if(!nextKey||nextKey===oldKey)return false;
  const exists=config.strategies.some((name,i)=>i!==idx&&normalizeStrategyName(name)===nextKey);
  if(exists){showAppNotice('Estratégia duplicada','Já existe: '+next);return false;}
  rememberDeletedDefaultStrategy(oldName);
  config.strategies[idx]=next;
  trades.forEach(t=>{if(t.strategy===oldName)t.strategy=next;});
  config.strategyDefaultsSeeded=true;
  save();renderSetup();
  return true;
}

function editStrategy(idx){
  const name=config.strategies?.[idx];if(!name)return;
  showAppPrompt('Editar estratégia','Renomear estratégia:',name,next=>renameStrategy(idx,next),{confirmText:'Salvar'});
}

function strategyUsageCount(name){
  return getAccountTrades(activeAccountId).filter(t=>t.strategy===name).length;
}

function previewTradeImages(e){
  const files=Array.from(e.target.files);
  const preview=document.getElementById('t-images-preview');
  if(!preview)return;
  files.forEach(f=>{
    if(!f.type.startsWith('image/'))return;
    const r=new FileReader();
    r.onload=ev=>{tradeImages.push({name:f.name,dataUrl:ev.target.result});renderImagePreviews();};
    r.readAsDataURL(f);
  });
}
function removeTradeImage(i){tradeImages.splice(i,1);renderImagePreviews();}

function mergeStudyHubState(nextState){
  const base=defaultStudyHubState();
  const parsed=(nextState&&typeof nextState==='object')?nextState:{};
  return {
    ...base,
    ...parsed,
    propfirm:{...base.propfirm,...(parsed.propfirm||{})},
    plan:{...base.plan,...(parsed.plan||{})},
    simulator:{...base.simulator,...(parsed.simulator||{})},
    mental:{...base.mental,...(parsed.mental||{})},
  };
}

function createBackupPayload(){
  return TradeDiaryBackupFormat.createBackupPayload({
    exportedAt:new Date().toISOString(),
    trades,
    config,
    preMarketData,
    accounts,
    activeAccountId,
    studyHubState,
  });
}

function summarizeBackupData(data){
  return TradeDiaryBackupFormat.summarizeBackupData(data);
}

function formatBackupSummary(data){
  const s=summarizeBackupData(data);
  return [
    `${s.trades} ${t('backup.trades','trades')}`,
    `${s.accounts} ${t('backup.accounts','contas')}`,
    `${s.preMarketDays} ${t('backup.premarketDays','dias de pré-mercado')}`,
    `${s.documents} ${t('backup.documents','documentos')}`,
  ].join(' · ');
}

function validateBackupData(data){
  return TradeDiaryBackupFormat.validateBackupData(data);
}

const TRADE_CSV_HEADERS = TradeDiaryTradesCSV.TRADE_CSV_HEADERS;

function csvCell(value){
  return TradeDiaryTradesCSV.csvCell(value);
}

function buildTradesCSV(list=trades){
  return TradeDiaryTradesCSV.buildTradesCSV(list);
}

function normalizeCSVRow(value){
  return TradeDiaryDelimitedRows.normalizeCSVRow(value);
}

function isBinarySpreadsheetText(text){
  return /^\s*PK[\x03\x05\x07]/.test(text)||text.includes('[Content_Types].xml')||text.includes('xl/workbook.xml');
}

function splitDelimitedRows(text){
  return TradeDiaryDelimitedRows.splitDelimitedRows(text);
}

function parseCSVText(text){
  if(!text||isBinarySpreadsheetText(text))return[];
  return parseSpreadsheetRows(splitDelimitedRows(text),'csv');
}

function acctTypeLabel(t){
  return{cfd_pct:'CFD %',futures_usd:'CFD %',prop_pct:'Prop Firm %',crypto:'Crypto'}[t]||t;
}

function selectAccount(id){
  activeAccountId=id;
  statsAccountPinned=false;
  _incompleteBannerDismissed=false;
  save();
  updateTopbarStats();
  closeModal('accountModal');
  renderTopbarAccount();
  refreshAll();
}






function saveAccount(){
  const g=id=>document.getElementById(id)?.value||'';
  const name=g('af-name').trim();
  if(!name){showAppNotice('Campo obrigatório','Nome da conta é obrigatório.');return;}
  const acct={
    id:editingAccountId||('a'+Date.now()),
    name,type:normalizeAccountType(g('af-type')),color:g('af-color')||'#22d5ed',
    balance:parseFloat(g('af-balance'))||1000,
    risk:parseFloat(g('af-risk'))||1,
    mult:parseFloat(g('af-mult'))||1,
    ddDaily:parseFloat(g('af-dd-daily'))||2,
    ddWeekly:parseFloat(g('af-dd-weekly'))||5,
    ddMonthly:parseFloat(g('af-dd-monthly'))||8,
    ddTotal:parseFloat(g('af-dd-total'))||10,
    goalPct:parseFloat(g('af-goal'))||10,
    goalWeek:parseFloat(g('af-goal-week'))||0,
    goalMonth:parseFloat(g('af-goal-month'))||0,
    goalTotal:parseFloat(g('af-goal-total'))||0,
    cashflows:accountFormCashflows.map(flow=>({...flow})),
  };
  const normalized=normalizeAccount(acct);
  if(editingAccountId){const i=accounts.findIndex(a=>a.id===editingAccountId);if(i>=0)accounts[i]=normalized;} else{accounts.push(normalized);}
  save();renderAccountList();document.getElementById('accountForm').style.display='none';
  updateTopbarStats();renderTopbarAccount();
  renderAccountsPage();
  showAppNotice('Conta salva','✓ Conta salva!');
}

function deleteAccount(id){
  if(accounts.length<=1){showAppNotice('Ação bloqueada','Mantenha pelo menos uma conta.');return;}
  showAppConfirm('Excluir conta','Excluir esta conta?\n\nOs trades associados a ela serão mantidos.',()=>{
    accounts=accounts.filter(a=>a.id!==id);
    if(activeAccountId===id)activeAccountId=accounts[0].id;
    save();renderAccountList();renderTopbarAccount();renderAccountsPage();
  },{danger:true,confirmText:'Excluir'});
}




function getClosedTradesWithSubjectiveEmotion(list=[]){
  return (Array.isArray(list)?list:[]).filter(t=>['WIN','LOSS','BE'].includes(t?.status)&&String(t?.emotion||'').trim());
}

function getClosedTradesWithPlanTag(list=[]){
  return (Array.isArray(list)?list:[]).filter(t=>['WIN','LOSS','BE'].includes(t?.status)&&['sim','parcial','nao'].includes(String(t?.followedPlan||'').trim()));
}


function formatDocDate(date){
  return date ? new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}) : 'Sem data';
}

function buildOperationalAlerts(acct, acctTrades){
  const closed=acctTrades.filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const risk=calcAccountRiskState(acct,acctTrades);
  const strategies=getStrategySnapshots(acctTrades);
  const weakStrategy=strategies.find(row=>row.n>=3&&row.pnl<0);
  const bestStrategy=strategies[0];
  const incomplete=acctTrades.filter(t=>t.incomplete).length;
  const hesitation=acctTrades.filter(t=>t.hesitation).length;
  const missingNotes=closed.filter(t=>t.status==='LOSS'&&!(t.remarks||'').trim()).length;
  const tradedDays=[...new Set(closed.map(t=>t.date).filter(Boolean))];
  const missingPMDates=tradedDays.filter(date=>!preMarketData[date]||!Array.isArray(preMarketData[date].habits)).sort().reverse();
  const missingPremarket=missingPMDates.length;
  const alerts=[];

  alerts.push({
    tone:risk.dayUsage>=0.8?'danger':risk.dayUsage>=0.55?'warn':'safe',
    title:'Risco diário',
    summary:risk.dayUsage>=0.8
      ? `A sessão de ${risk.anchorLabel} consumiu ${Math.round(risk.dayUsage*100)}% do limite diário.`
      : `Uso atual do stop da sessão em ${Math.round(risk.dayUsage*100)}% do permitido.`,
    value:fR(Math.max(risk.dayLimit-Math.max(-risk.dayPnl,0),0)),
    actionPage:'setup',
    actionLabel:'Revisar risco',
  });

  alerts.push({
    tone:risk.weekPnl<0?'warn':'safe',
    title:'Semana operacional',
    summary:risk.weekPnl<0?`Semana negativa em ${fR(risk.weekPnl)}.`:`Semana positiva em ${(risk.weekPnl>=0?'+':'')+fR(risk.weekPnl)}.`,
    value:`DD ${(risk.currentDdPct*100).toFixed(2)}%`,
    actionPage:'stats',
    actionLabel:'Ver análises',
  });

  if(weakStrategy){
    alerts.push({
      tone:'warn',
      title:'Estratégia pressionada',
      summary:`${weakStrategy.name} está com ${weakStrategy.n} trades e resultado de ${(weakStrategy.pnl>=0?'+':'')+fR(weakStrategy.pnl)}.`,
      value:`WR ${weakStrategy.wr.toFixed(0)}%`,
      actionPage:'strategyHub',
      actionLabel:'Abrir estratégias',
    });
  }

  if(bestStrategy){
    alerts.push({
      tone:bestStrategy.pnl>=0?'safe':'warn',
      title:'Melhor tração atual',
      summary:`${bestStrategy.name} lidera o período com ${bestStrategy.n} trades registrados.`,
      value:`${bestStrategy.pnl>=0?'+':''}${fR(bestStrategy.pnl)}`,
      actionPage:'strategyHub',
      actionLabel:'Detalhar',
    });
  }

  if(incomplete){
    alerts.push({
      tone:'warn',
      title:'Trades incompletos',
      summary:`Existem ${incomplete} operações com campos faltando e isso contamina as leituras.`,
      value:`${incomplete} pendente(s)`,
      actionPage:'log',
      actionLabel:'Abrir trades',
    });
  }

  if(missingNotes){
    alerts.push({
      tone:'info',
      title:'Losses sem documentação',
      summary:`Você ainda tem ${missingNotes} loss(es) sem nota registrada no módulo Documentos.`,
      value:'Registrar revisão',
      actionPage:'documents',
      actionLabel:'Abrir documentos',
    });
  }

  if(missingPremarket){
    const shown=missingPMDates.slice(0,4).map(d=>fDate(d)).join(', ');
    const extra=missingPMDates.length>4?` +${missingPMDates.length-4} mais`:'';
    const oldestMonth=missingPMDates[missingPMDates.length-1]?.slice(0,7)||'';
    alerts.push({
      tone:'info',
      title:'Rotina não registrada',
      summary:`${missingPremarket} dia(s) sem checklist: ${shown}${extra}.`,
      value:'Ir ao mês',
      actionFn:`openPMMonth('${oldestMonth}')`,
      actionLabel:'Abrir rotina',
    });
  }

  if(hesitation){
    alerts.push({
      tone:'warn',
      title:'Hesitação operacional',
      summary:`${hesitation} trade(s) foram marcados como hesitação ou não execução do plano.`,
      value:`${hesitation} marcação(ões)`,
      actionPage:'psych',
      actionLabel:'Ver psicológico',
    });
  }

  const order={danger:0,warn:1,info:2,safe:3};
  return alerts.sort((a,b)=>(order[a.tone]??9)-(order[b.tone]??9));
}

const STUDY_HUB_INFO = {
  propfirm:{
    label:'PropFirm',
    title:'PropFirm Simulator',
    frameTitle:'PropFirm Simulator',
    frameMeta:'Leitura nativa de payout, metas e drawdown dentro do Mukas Hub.',
    summary:'Calculadoras de payout, meta, drawdown e sizing rodam direto no núcleo do Mukas Hub, sem ponte externa e sem troca de contexto.',
    features:[
      {title:'Payout e metas',copy:'Calcula alvo, retirada e leitura de esforço da conta no mesmo fluxo de risco do app.'},
      {title:'Limites de drawdown',copy:'Cruza drawdown diário, drawdown total e risco por trade sem sair do Mukas Hub.'},
      {title:'Modelos de prop',copy:'Centraliza sizing, payout líquido e esforço até a meta em leitura direta e rápida.'},
      {title:'Leitura de risco',copy:'Vira base para decidir lote, agressividade e proteção antes da sessão começar.'},
    ],
  },
  plano:{
    label:'Plano de Trade',
    title:'Plano de Trade',
    frameTitle:'Plano de Trade',
    frameMeta:'Playbook nativo dentro do fluxo principal do app.',
    summary:'Playbook da sessão, filtros, invalidação e revisão ficam centralizados no fluxo nativo do Mukas Hub.',
    features:[
      {title:'Playbook operacional',copy:'Reúne contexto, gatilho, invalidação e regras de execução em bloco único.'},
      {title:'Checklist da sessão',copy:'Mantém preparação, filtros e disciplina próximos da conta ativa.'},
      {title:'Regras de não trade',copy:'Centraliza quando parar, reduzir e simplesmente não entrar.'},
      {title:'Processo antes da entrada',copy:'Deixa leitura pré-mercado e revisão no mesmo ecossistema do diário.'},
    ],
  },
  tradesim:{
    label:'Trade Simulator',
    title:'Trade Simulator',
    frameTitle:'Trade Simulator',
    frameMeta:'Simulação nativa ligada ao estado real da conta.',
    summary:'Motor de expectativa, cenários e Monte Carlo integrado ao estado da conta, sem iframe e sem carga paralela.',
    features:[
      {title:'Ciclos e variância',copy:'Projeta faixa provável de capital e ajuda a ler sequência ruim antes dela acontecer.'},
      {title:'Teste de agressividade',copy:'Ajuda a validar se o risco por trade cabe dentro do plano antes de subir lote.'},
      {title:'Leitura de capital',copy:'Compara mediana, cauda ruim e cauda boa em cima do capital atual.'},
      {title:'Decisão mais fria',copy:'Vira laboratório de hipótese antes de levar mudança para conta real.'},
    ],
  },
  mental:{
    label:'Ferramentas Mentais',
    title:'Ferramentas Mentais',
    frameTitle:'Ferramentas Mentais',
    frameMeta:'Check-in mental nativo dentro do Mukas Hub.',
    summary:'Check-in mental, âncoras e cortes emocionais agora vivem dentro do próprio Mukas Hub, no mesmo padrão do restante do diário.',
    features:[
      {title:'Âncora de execução',copy:'Ajuda a voltar para o plano quando a sessão pesa ou acelera demais.'},
      {title:'Cortes e limites',copy:'Centraliza gatilhos de proteção para evitar overtrade e revenge.'},
      {title:'Preparação da sessão',copy:'Organiza foco, contexto e disciplina dentro do próprio app.'},
      {title:'Disciplina acima de tudo',copy:'Usa leitura emocional como proteção direta da conta e do drawdown do dia.'},
    ],
  },
};

function getStudyPropForm(){
  const base=studyHubState.propfirm;
  const num=(id,fallback)=>{const el=document.getElementById(id);return el?parseFloat(el.value)||fallback:fallback;};
  return {
    accountSize:num('studyPropAccount',base.accountSize),
    payoutPct:num('studyPropPayout',base.payoutPct),
    maxDdPct:num('studyPropMaxDd',base.maxDdPct),
    dailyDdPct:num('studyPropDailyDd',base.dailyDdPct),
    riskPct:num('studyPropRisk',base.riskPct),
    targetPct:num('studyPropTarget',base.targetPct),
    rrr:num('studyPropRrr',base.rrr),
    fxRate:num('studyPropFx',base.fxRate),
    taxPct:num('studyPropTax',base.taxPct),
    feePct:num('studyPropFee',base.feePct),
  };
}

function getStudyPlanForm(){
  const base=studyHubState.plan;
  const val=(id,fallback)=>document.getElementById(id)?.value ?? fallback;
  const num=(id,fallback)=>{const el=document.getElementById(id);return el?parseFloat(el.value)||fallback:fallback;};
  return {
    title:val('studyPlanTitle',base.title),
    market:val('studyPlanMarket',base.market),
    window:val('studyPlanWindow',base.window),
    setup:val('studyPlanSetup',base.setup),
    invalidation:val('studyPlanInvalidation',base.invalidation),
    noTrade:val('studyPlanNoTrade',base.noTrade),
    dailyGoal:num('studyPlanDailyGoal',base.dailyGoal),
    dailyStop:num('studyPlanDailyStop',base.dailyStop),
    maxTrades:parseInt(document.getElementById('studyPlanMaxTrades')?.value)||base.maxTrades,
    checklist:val('studyPlanChecklist',base.checklist),
    execution:val('studyPlanExecution',base.execution),
    review:val('studyPlanReview',base.review),
  };
}

function getStudySimForm(){
  const base=studyHubState.simulator;
  const num=(id,fallback)=>{const el=document.getElementById(id);return el?parseFloat(el.value)||fallback:fallback;};
  return {
    capital:num('studySimCapital',base.capital),
    riskPct:num('studySimRisk',base.riskPct),
    winRate:num('studySimWinRate',base.winRate),
    rrr:num('studySimRrr',base.rrr),
    trades:parseInt(document.getElementById('studySimTrades')?.value)||base.trades,
    runs:parseInt(document.getElementById('studySimRuns')?.value)||base.runs,
    seed:base.seed||Date.now(),
  };
}

function getStudyMentalForm(){
  const base=studyHubState.mental;
  const num=(id,fallback)=>{const el=document.getElementById(id);return el?parseInt(el.value)||fallback:fallback;};
  const val=(id,fallback)=>document.getElementById(id)?.value ?? fallback;
  return {
    focus:num('studyMentalFocus',base.focus),
    energy:num('studyMentalEnergy',base.energy),
    stress:num('studyMentalStress',base.stress),
    discipline:num('studyMentalDiscipline',base.discipline),
    anchor:val('studyMentalAnchor',base.anchor),
    triggers:val('studyMentalTriggers',base.triggers),
    cutoff:val('studyMentalCutoff',base.cutoff),
  };
}

function countStudyChecklistItems(text){
  return String(text||'').split(/\n|,/).map(item=>item.trim()).filter(Boolean).length;
}

function seededRand(seed){
  let value=seed>>>0;
  return()=>{value+=0x6D2B79F5;let t=Math.imul(value^value>>>15,1|value);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};
}

function getStudyPropSnapshot(prop=studyHubState.propfirm){
  const accountSize=Math.max(prop.accountSize||0,0);
  const riskUsd=accountSize*((prop.riskPct||0)/100);
  const dailyLimitUsd=accountSize*((prop.dailyDdPct||0)/100);
  const maxLimitUsd=accountSize*((prop.maxDdPct||0)/100);
  const targetUsd=accountSize*((prop.targetPct||0)/100);
  const payoutGrossUsd=targetUsd*((prop.payoutPct||0)/100);
  const deductionPct=clamp(((prop.taxPct||0)+(prop.feePct||0))/100,0,0.95);
  const payoutNetUsd=payoutGrossUsd*(1-deductionPct);
  const payoutNetBrl=payoutNetUsd*(prop.fxRate||1);
  const tradeTargetUsd=riskUsd*(prop.rrr||0);
  const tradesToTarget=tradeTargetUsd>0?Math.ceil(targetUsd/tradeTargetUsd):0;
  const dailyStopTrades=riskUsd>0?Math.floor(dailyLimitUsd/riskUsd):0;
  const maxStopTrades=riskUsd>0?Math.floor(maxLimitUsd/riskUsd):0;
  const breakevenWr=prop.rrr>0?(1/(1+prop.rrr))*100:100;
  return {accountSize,riskUsd,dailyLimitUsd,maxLimitUsd,targetUsd,payoutGrossUsd,payoutNetUsd,payoutNetBrl,tradeTargetUsd,tradesToTarget,dailyStopTrades,maxStopTrades,breakevenWr};
}

function getStudyMentalSnapshot(mental=studyHubState.mental){
  const normalized=((mental.focus||0)+(mental.energy||0)+(mental.discipline||0)+(6-(mental.stress||0)))/20;
  const score=Math.round(clamp(normalized,0,1)*100);
  const tone=score>=75?'safe':score>=55?'warn':'danger';
  return {score,tone};
}

function saveStudyPropFirm(){
  studyHubState.propfirm=getStudyPropForm();
  save();
  renderStudyHub();
}

function saveStudyPlan(){
  studyHubState.plan=getStudyPlanForm();
  save();
  renderStudyHub();
}

function saveStudyMental(){
  studyHubState.mental=getStudyMentalForm();
  save();
  renderStudyHub();
}

function syncStudySimulatorFromPropfirm(){
  const prop=getStudyPropForm();
  studyHubState.propfirm=prop;
  studyHubState.simulator={
    ...studyHubState.simulator,
    capital:prop.accountSize,
    riskPct:prop.riskPct,
    rrr:prop.rrr,
    seed:Date.now(),
  };
  save();
  renderStudyHub();
}

function setStudyHubLegacyValue(id, value){
  const el=document.getElementById(id);
  if(!el || value==null)return;
  el.value=String(value);
  try{el.dispatchEvent(new Event('input'));}catch{}
  try{el.dispatchEvent(new Event('change'));}catch{}
}

function setStudyHubLegacySelectValue(id, value){
  const el=document.getElementById(id);
  if(!el || value==null)return;
  const target=String(value);
  const options=Array.from(el.options||[]);
  const exact=options.find(opt=>String(opt.value)===target);
  const near=exact || options.find(opt=>{
    const parsed=parseFloat(opt.value);
    return Number.isFinite(parsed) && Math.abs(parsed-Number(value))<0.0001;
  });
  el.value=(near&&near.value) || (options.some(opt=>opt.value==='custom') ? 'custom' : target);
  try{el.dispatchEvent(new Event('input'));}catch{}
  try{el.dispatchEvent(new Event('change'));}catch{}
}

function syncStudyHubLegacyInputs(moduleKey){
  const prop=studyHubState.propfirm;
  const sim=studyHubState.simulator;
  const goal=prop.targetPct;
  const stop=prop.dailyDdPct;
  const risk=prop.riskPct;
  const rrr=prop.rrr;

  if(moduleKey==='propfirm'){
    ['s_conta','pf_conta','f2_conta','f1_conta','in_conta','r_conta'].forEach(id=>setStudyHubLegacyValue(id,prop.accountSize));
    ['s_payout','pf_payout','f2_payout','f1_payout','in_payout'].forEach(id=>setStudyHubLegacyValue(id,prop.payoutPct));
    ['s_ddmax','pf_ddmax','f2_ddmax','f1_ddmax','in_ddmax','r_ddmax'].forEach(id=>setStudyHubLegacyValue(id,prop.maxDdPct));
    ['s_dddaily','pf_dddaily','f2_dddaily','f1_dddaily','in_dddaily','r_dddaily'].forEach(id=>setStudyHubLegacyValue(id,stop));
    ['s_ir','pf_ir','f2_ir','f1_ir','in_ir'].forEach(id=>setStudyHubLegacyValue(id,prop.taxPct));
    ['s_taxa','pf_taxa','f2_taxa','f1_taxa','in_taxa'].forEach(id=>setStudyHubLegacyValue(id,prop.feePct));
    ['pf_meta','s_fim','f2_meta1','f2_metaf','f1_metap','f1_metaf','in_metaf'].forEach(id=>setStudyHubLegacyValue(id,goal));
    ['pf_sl_dia','f2_sl','f1_sl','in_sl','r_sl'].forEach(id=>setStudyHubLegacyValue(id,stop));
    ['pf_gain_dia','f2_gain','f1_gain','in_gain','r_gain'].forEach(id=>setStudyHubLegacyValue(id,goal));
    setStudyHubLegacyValue('s_step',risk);
    ['s_rrr','pf_rrr'].forEach(id=>setStudyHubLegacySelectValue(id,rrr));
    return;
  }

  if(moduleKey==='tradesim'){
    setStudyHubLegacyValue('ts-capital',sim.capital);
    setStudyHubLegacyValue('risk',sim.riskPct);
    setStudyHubLegacyValue('riskRange',sim.riskPct);
    const riskRangeVal=document.getElementById('riskRangeVal');
    if(riskRangeVal)riskRangeVal.textContent=`${sim.riskPct}%`;
    setStudyHubLegacyValue('dailyStop',prop.dailyDdPct);
    setStudyHubLegacyValue('dailyTarget',prop.targetPct);
    setStudyHubLegacyValue('sl',prop.riskPct);
    setStudyHubLegacyValue('tp',+(prop.riskPct*prop.rrr).toFixed(3));
    const rrrDisplay=document.getElementById('rrrDisplay');
    if(rrrDisplay)rrrDisplay.textContent=`1 : ${prop.rrr.toFixed(2)}`;
  }
}

function updateStudyMentalRange(name,value){
  const el=document.getElementById(`studyMental${name}Val`);
  if(el)el.textContent=`${value}/5`;
}

function buildStudySimulation(params=studyHubState.simulator){
  const runs=Math.max(20,Math.min(1000,params.runs||200));
  const tradesCount=Math.max(5,Math.min(300,params.trades||30));
  const riskPct=(params.riskPct||0)/100;
  const wr=(params.winRate||0)/100;
  const rrr=params.rrr||1;
  const seed=params.seed||1;
  const labels=Array.from({length:tradesCount+1},(_,i)=>i);
  const stepBuckets=labels.map(()=>[]);
  let positives=0;

  for(let run=0;run<runs;run++){
    const rand=seededRand(seed+run*7919);
    let balance=params.capital||0;
    stepBuckets[0].push(balance);
    for(let step=1;step<=tradesCount;step++){
      const change=balance*riskPct*(rand()<wr?rrr:-1);
      balance=Math.max(0,balance+change);
      stepBuckets[step].push(balance);
    }
    if(balance>=(params.capital||0))positives++;
  }

  const percentile=(arr,p)=>{
    const sorted=[...arr].sort((a,b)=>a-b);
    const idx=(sorted.length-1)*p;
    const low=Math.floor(idx),high=Math.ceil(idx);
    if(low===high)return sorted[low];
    return sorted[low]+(sorted[high]-sorted[low])*(idx-low);
  };

  const p10=stepBuckets.map(bucket=>percentile(bucket,0.10));
  const p50=stepBuckets.map(bucket=>percentile(bucket,0.50));
  const p90=stepBuckets.map(bucket=>percentile(bucket,0.90));
  return {labels,p10,p50,p90,positiveRate:positives/runs};
}

function renderStudyPropFirm(){
  const prop=studyHubState.propfirm;
  const setVal=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
  setVal('studyPropAccount',prop.accountSize);
  setVal('studyPropPayout',prop.payoutPct);
  setVal('studyPropMaxDd',prop.maxDdPct);
  setVal('studyPropDailyDd',prop.dailyDdPct);
  setVal('studyPropRisk',prop.riskPct);
  setVal('studyPropTarget',prop.targetPct);
  setVal('studyPropRrr',prop.rrr);
  setVal('studyPropFx',prop.fxRate);
  setVal('studyPropTax',prop.taxPct);
  setVal('studyPropFee',prop.feePct);

  const snap=getStudyPropSnapshot(prop);
  const metrics=document.getElementById('studyPropMetrics');
  if(metrics){
    const riskTradeTip=`<strong>Risco / Trade</strong><p>Valor em dólares que você arrisca por trade, calculado com base no percentual de risco configurado sobre o capital da conta.</p>`;
    const ddDiarioTip=`<strong>DD Diário</strong><p>Limite máximo de perda para a sessão do dia. Indica quantos stops cheios você pode levar antes de encerrar o dia obrigatoriamente.</p>`;
    const ddMaxTip=`<strong>DD Máximo</strong><p>Limite total de drawdown da conta. Representa o piso absoluto de capital — ao atingir, a conta precisa ser pausada e revisada.</p>`;
    const metaTip=`<strong>Meta Líquida</strong><p>Valor de payout já descontados impostos e taxas, considerando a taxa de câmbio configurada para conversão em BRL.</p>`;
    metrics.innerHTML=[
      {cls:'c-blue',lbl:'Risco / trade',val:fR(snap.riskUsd),sub:`${f2(prop.riskPct)}% da conta`,tip:riskTradeTip},
      {cls:'c-red',lbl:'DD diário',val:fR(snap.dailyLimitUsd),sub:`até ${snap.dailyStopTrades} stop(s)`,tip:ddDiarioTip},
      {cls:'c-red',lbl:'DD máximo',val:fR(snap.maxLimitUsd),sub:`até ${snap.maxStopTrades} stop(s)`,tip:ddMaxTip},
      {cls:'c-green',lbl:'Meta líquida',val:fR(snap.payoutNetUsd),sub:fR(snap.payoutNetBrl)+' em BRL',tip:metaTip},
    ].map(mkCard).join('');
  }

  renderStatusList('studyPropSummary',[
    {tone:'info',title:'Meta operacional',summary:`Meta de ${f2(prop.targetPct)}% exige ${snap.tradesToTarget||0} trade(s) cheios em ${prop.rrr.toFixed(3)}R.`,value:fR(snap.targetUsd)},
    {tone:snap.dailyStopTrades<=2?'danger':snap.dailyStopTrades<=4?'warn':'safe',title:'Proteção diária',summary:`Você suporta ${snap.dailyStopTrades} stop(s) inteiros antes de romper o limite do dia.`,value:fR(snap.dailyLimitUsd)},
    {tone:'warn',title:'Breakeven teórico',summary:`Com RRR de ${prop.rrr.toFixed(3)}, o breakeven mínimo fica em ${snap.breakevenWr.toFixed(1)}% de acerto.`,value:`WR ${snap.breakevenWr.toFixed(1)}%`},
    {tone:'safe',title:'Payout no alvo',summary:`Depois de payout, imposto e intermediação, o alvo devolve ${fR(snap.payoutNetUsd)} líquidos.`,value:fR(snap.payoutNetBrl)},
  ],'Defina os parâmetros da conta para gerar a leitura.');

  const ladderEl=document.getElementById('studyPropLadder');
  if(ladderEl){
    const rawSteps=[prop.riskPct,prop.riskPct*2,Math.max(prop.targetPct/2,prop.riskPct),prop.targetPct,prop.targetPct+prop.riskPct*2]
      .filter(v=>v>0).map(v=>+v.toFixed(2));
    const steps=[...new Set(rawSteps)].sort((a,b)=>a-b);
    ladderEl.innerHTML=steps.map(step=>{
      const profitUsd=prop.accountSize*(step/100);
      const gross=profitUsd*(prop.payoutPct/100);
      const net=gross*(1-clamp((prop.taxPct+prop.feePct)/100,0,0.95));
      const trades=snap.tradeTargetUsd>0?Math.ceil(profitUsd/snap.tradeTargetUsd):0;
      return`<tr>
        <td class="mono">${step.toFixed(2)}%</td>
        <td class="mono">${fR(profitUsd)}</td>
        <td class="mono">${fR(gross)}</td>
        <td class="mono">${fR(net)}</td>
        <td class="mono">${fR(net*(prop.fxRate||1))}</td>
        <td class="mono">${trades}</td>
      </tr>`;
    }).join('');
  }
}

function renderStudyPlan(){
  const plan=studyHubState.plan;
  const setVal=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
  setVal('studyPlanTitle',plan.title);
  setVal('studyPlanMarket',plan.market);
  setVal('studyPlanWindow',plan.window);
  setVal('studyPlanSetup',plan.setup);
  setVal('studyPlanInvalidation',plan.invalidation);
  setVal('studyPlanNoTrade',plan.noTrade);
  setVal('studyPlanDailyGoal',plan.dailyGoal);
  setVal('studyPlanDailyStop',plan.dailyStop);
  setVal('studyPlanMaxTrades',plan.maxTrades);
  setVal('studyPlanChecklist',plan.checklist);
  setVal('studyPlanExecution',plan.execution);
  setVal('studyPlanReview',plan.review);

  renderStatusList('studyPlanSummary',[
    {tone:'info',title:plan.title||'Plano ativo',summary:`Mercado: ${plan.market||'—'} · Janela: ${plan.window||'—'}`,value:`${plan.maxTrades||0} trade(s)`},
    {tone:'safe',title:'Risco do dia',summary:`Meta diária em ${f2(plan.dailyGoal||0)}% e stop diário em ${f2(plan.dailyStop||0)}%.`,value:`Stop ${f2(plan.dailyStop||0)}%`},
    {tone:countStudyChecklistItems(plan.checklist)>=4?'safe':'warn',title:'Checklist operacional',summary:`Checklist com ${countStudyChecklistItems(plan.checklist)} item(ns) cadastrados para a abertura.`,value:'Pré-sessão'},
    {tone:'warn',title:'Condição de não trade',summary:plan.noTrade||'Defina quando você não deve operar.',value:'Disciplina'},
  ],'Preencha o plano da sessão para ver o resumo.');
}

function renderStudySimulation(){
  const sim=studyHubState.simulator;
  const setVal=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
  setVal('studySimCapital',sim.capital);
  setVal('studySimRisk',sim.riskPct);
  setVal('studySimWinRate',sim.winRate);
  setVal('studySimRrr',sim.rrr);
  setVal('studySimTrades',sim.trades);
  setVal('studySimRuns',sim.runs);

  const result=buildStudySimulation(sim);
  const expectancyPct=(sim.winRate/100)*(sim.riskPct*sim.rrr)-(1-sim.winRate/100)*sim.riskPct;
  const finalP10=result.p10[result.p10.length-1]||0;
  const finalP50=result.p50[result.p50.length-1]||0;
  const finalP90=result.p90[result.p90.length-1]||0;
  const metrics=document.getElementById('studySimMetrics');
  if(metrics){
    metrics.innerHTML=[
      {cls:expectancyPct>=0?'c-green':'c-red',lbl:'Expectância / trade',val:`${expectancyPct>=0?'+':''}${expectancyPct.toFixed(3)}%`,sub:'sobre o capital',tip:TIPS.expPct},
      {cls:'c-blue',lbl:'Mediana final',val:fR(finalP50),sub:`${((finalP50/sim.capital-1)*100).toFixed(1)}%`,tip:TIPS.p50},
      {cls:'c-red',lbl:'P10 final',val:fR(finalP10),sub:'cauda adversa',tip:TIPS.p10},
      {cls:'c-green',lbl:'P90 final',val:fR(finalP90),sub:'cauda favorável',tip:TIPS.p90},
    ].map(mkCard).join('');
  }

  renderStatusList('studySimSummary',[
    {tone:expectancyPct>=0?'safe':'danger',title:'Expectância matemática',summary:expectancyPct>=0?`Seu setup mantém expectativa positiva de ${expectancyPct.toFixed(3)}% por trade.`:`Seu setup gera expectativa negativa de ${Math.abs(expectancyPct).toFixed(3)}% por trade.`,value:`WR ${f2(sim.winRate)}%`},
    {tone:result.positiveRate>=0.6?'safe':result.positiveRate>=0.4?'warn':'danger',title:'Ciclos positivos',summary:`${(result.positiveRate*100).toFixed(0)}% das simulações terminaram acima do capital inicial.`,value:`${sim.runs} sims`},
    {tone:'info',title:'Zona mediana',summary:`A mediana projeta ${fR(finalP50)} após ${sim.trades} trade(s).`,value:`RRR ${sim.rrr.toFixed(3)}`},
    {tone:'warn',title:'Cauda ruim',summary:`No cenário P10, o capital cai para ${fR(finalP10)}. Use isso para calibrar agressividade.`,value:fR(finalP10)},
  ],'Rode a simulação para ler o cenário.');

  mkChart('studySimChart',{
    type:'line',
    data:{
      labels:result.labels,
      datasets:[
        {label:'P10',data:result.p10,borderColor:'rgba(255,93,104,.75)',backgroundColor:'rgba(255,93,104,.08)',borderWidth:1.5,pointRadius:0,tension:.28},
        {label:'P50',data:result.p50,borderColor:'#22d5ed',backgroundColor:'rgba(34,213,237,.08)',borderWidth:2,pointRadius:0,tension:.28},
        {label:'P90',data:result.p90,borderColor:'rgba(69,224,123,.85)',backgroundColor:'rgba(69,224,123,.08)',borderWidth:1.5,pointRadius:0,tension:.28},
      ],
    },
    options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{labels:{color:'#8ba3ad'}}}},
  });
}

function runStudySimulation(){
  const current=getStudySimForm();
  studyHubState.simulator={...current,seed:Date.now()};
  save();
  renderStudyHub();
}

function renderStudyMental(){
  const mental=studyHubState.mental;
  const acctTrades=getAccountTrades(activeAccountId).filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const setVal=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
  setVal('studyMentalFocus',mental.focus);
  setVal('studyMentalEnergy',mental.energy);
  setVal('studyMentalStress',mental.stress);
  setVal('studyMentalDiscipline',mental.discipline);
  setVal('studyMentalAnchor',mental.anchor);
  setVal('studyMentalTriggers',mental.triggers);
  setVal('studyMentalCutoff',mental.cutoff);
  updateStudyMentalRange('Focus',mental.focus);
  updateStudyMentalRange('Energy',mental.energy);
  updateStudyMentalRange('Stress',mental.stress);
  updateStudyMentalRange('Discipline',mental.discipline);

  const snapshot=getStudyMentalSnapshot(mental);
  const emoMap={};
  acctTrades.forEach(t=>{
    if(!String(t.emotion||'').trim())return;
    const key=t.emotion;
    if(!emoMap[key])emoMap[key]={n:0,w:0};
    emoMap[key].n++;
    if(t.status==='WIN')emoMap[key].w++;
  });
  const emotionRows=Object.entries(emoMap).map(([emotion,data])=>({emotion,wr:data.n?(data.w/data.n)*100:0,n:data.n})).sort((a,b)=>b.wr-a.wr||b.n-a.n);
  const bestEmotion=emotionRows[0];
  const planTaggedTrades=getClosedTradesWithPlanTag(acctTrades);
  const followed=planTaggedTrades.filter(t=>t.followedPlan==='sim').length;
  const followRate=planTaggedTrades.length?(followed/planTaggedTrades.length)*100:0;
  const hesitations=acctTrades.filter(t=>t.hesitation).length;
  const metrics=document.getElementById('studyMentalMetrics');
  if(metrics){
    const mentalReadyTip=`<strong>Prontidão Mental</strong><p>Score calculado com base nas respostas do checklist pré-sessão (sono, foco, estado emocional). Quanto maior, mais preparado você está para operar com processo.</p><div class="tip-row"><span>Abaixo de 55%</span><span>Evite operar ou reduza o tamanho</span></div><div class="tip-row"><span>75% ou mais</span><span>Condição ideal para execução</span></div>`;
    const bestEmoTip=`<strong>Melhor Emoção</strong><p>Estado emocional com maior win rate nos trades registrados. Use como referência: quando estiver nessa emoção, o seu edge tende a se manifestar mais.</p>`;
    metrics.innerHTML=[
      {cls:snapshot.tone==='safe'?'c-green':snapshot.tone==='warn'?'c-yellow':'c-red',lbl:'Prontidão mental',val:`${snapshot.score}%`,sub:'sessão atual',tip:mentalReadyTip},
      {cls:'c-blue',lbl:'Seguiu o plano',val:`${followRate.toFixed(0)}%`,sub:`${followed} trade(s)`,tip:TIPS.followedPlan},
      {cls:'c-purple',lbl:'Melhor emoção',val:bestEmotion?.emotion||'—',sub:bestEmotion?`${bestEmotion.wr.toFixed(0)}% WR`: 'sem dados',tip:bestEmoTip},
      {cls:'c-red',lbl:'Hesitações',val:String(hesitations),sub:'operações perdidas / travadas',tip:TIPS.hesitation},
    ].map(mkCard).join('');
  }

  renderStatusList('studyMentalSummary',[
    {tone:snapshot.tone,title:'Leitura da sessão',summary:snapshot.score>=75?'Você está em boa faixa para operar sem forçar a mão.':snapshot.score>=55?'Sessão operável, mas exige vigilância e processo rígido.':'Estado frágil para manter consistência; proteja a conta.',value:`${snapshot.score}%`},
    {tone:'info',title:'Âncora de execução',summary:mental.anchor||'Defina a frase ou regra que te recoloca no plano quando a cabeça dispersa.',value:'Execução'},
    {tone:'warn',title:'Triggers de risco',summary:mental.triggers||'Liste aqui os gatilhos que normalmente te empurram para fora do plano.',value:'Auto-observação'},
    {tone:'danger',title:'Limite emocional',summary:mental.cutoff||'Defina qual condição encerra a sessão antes do prejuízo emocional contaminar a conta.',value:'Corte'},
  ],'Registre seu estado mental para alimentar a disciplina da sessão.');
}

function buildStudyHubStatuses(moduleKey, acct, acctTrades, risk){
  const closedTrades=acctTrades.filter(t=>['WIN','LOSS','BE'].includes(t.status));
  const deviations=acctTrades.filter(t=>t.followedPlan==='nao'||t.followedPlan==='parcial').length;
  const hesitations=acctTrades.filter(t=>t.hesitation).length;
  const usage=Math.max(risk.dayUsage||0,risk.totalUsage||0);

  if(moduleKey==='propfirm'){
    return [
      {tone:'info',title:'Leitura nativa',summary:'O módulo roda no núcleo do Mukas Hub e usa os mesmos estados da conta ativa para risco, meta e sizing.',value:'Sem iframe'},
      {tone:usageTone(usage),title:'Conta ativa em foco',summary:`${acct.name} opera com ${risk.riskLabel} de risco e está usando ${Math.round((risk.dayUsage||0)*100)}% do limite diário no recorte atual.`,value:risk.anchorLabel},
      {tone:'safe',title:'Melhor uso desta aba',summary:'Feche payout, meta e drawdown aqui antes de decidir lote, contratos ou agressividade da sessão.',value:'Pré-sessão'},
    ];
  }

  if(moduleKey==='plano'){
    return [
      {tone:'info',title:'Plano centralizado',summary:'Seu playbook agora fica na própria tela do Mukas Hub, conectado ao risco, conta ativa e disciplina operacional.',value:'Fluxo nativo'},
      {tone:'safe',title:'Limites da conta ativa',summary:`A conta ${acct.name} está configurada com stop diário de ${f2(acct.ddDaily||0)}% e meta total de ${f2(acct.goalPct||0)}%.`,value:`Stop ${f2(acct.ddDaily||0)}%`},
      {tone:deviations>0?'warn':'safe',title:'Disciplina observada',summary:deviations>0?`Existem ${deviations} operação(ões) fora ou parcial no plano. Use esta aba para endurecer o processo antes da próxima sessão.`:'Nenhum desvio de plano relevante foi encontrado no recorte atual.',value:`${closedTrades.length} trade(s)`},
    ];
  }

  if(moduleKey==='tradesim'){
    return [
      {tone:'info',title:'Simulação integrada',summary:'A leitura de cenários usa o estado atual da conta e conversa direto com o fluxo do Mukas Hub.',value:'Nativo'},
      {tone:closedTrades.length>=20?'safe':'warn',title:'Base real disponível',summary:`A conta ${acct.name} possui ${closedTrades.length} trade(s) fechado(s) para comparar com os cenários do simulador.`,value:`${closedTrades.length} trade(s)`},
      {tone:usageTone(usage),title:'Agressividade sob controle',summary:`Use o simulador considerando o risco atual de ${risk.riskLabel} e os limites da conta antes de escalar tamanho.`,value:'Risco atual'},
    ];
  }

  return [
    {tone:'info',title:'Rotina mental nativa',summary:'A leitura psicológica agora fica dentro do Mukas Hub e cruza disciplina, emoções e hesitações da conta ativa.',value:'Sem dependência externa'},
    {tone:deviations===0&&hesitations===0?'safe':deviations<=2&&hesitations<=2?'warn':'danger',title:'Leitura de disciplina',summary:`Há ${deviations} desvio(s) de plano e ${hesitations} hesitação(ões) registrados na conta ativa.`,value:`${closedTrades.length} trade(s)`},
    {tone:'warn',title:'Risco passa pela cabeça',summary:'Quando o estado mental sair do lugar, o objetivo deixa de ser ganhar mais e passa a ser proteger o drawdown do dia.',value:risk.anchorLabel},
  ];
}

function getStudyHubSummaryTarget(moduleKey){
  return {
    propfirm:'studyPropSummary',
    plano:'studyPlanSummary',
    tradesim:'studySimSummary',
    mental:'studyMentalSummary',
  }[moduleKey] || 'studyPropSummary';
}

function buildStudyHubFeatureList(features=[]){
  return features.map(feature=>`
    <div class="study-feature-item">
      <span class="study-feature-dot"></span>
      <div class="study-feature-copy">
        <strong>${escapeHtml(feature.title||'Módulo')}</strong>
        <small>${escapeHtml(feature.copy||'')}</small>
      </div>
    </div>
  `).join('');
}

function buildStudyHubSidebar(moduleKey){
  const current=STUDY_HUB_INFO[moduleKey]||STUDY_HUB_INFO.propfirm;
  const summaryId=getStudyHubSummaryTarget(moduleKey);
  return `
    <div class="study-side-stack">
      <div class="chart-card study-hub-note">
        <div class="setup-card-title">${escapeHtml(current.title||'Simulações')}</div>
        <div class="study-note-copy">${escapeHtml(current.summary||'')}</div>
        <div class="study-feature-list">${buildStudyHubFeatureList(current.features||[])}</div>
      </div>
      <div class="chart-card">
        <div class="setup-card-title">Conta ativa</div>
        <div id="studyHubRuntimeStatus" class="status-list compact"></div>
      </div>
      <div class="chart-card">
        <div class="setup-card-title">Leitura do módulo</div>
        <div id="${summaryId}" class="status-list compact"></div>
      </div>
    </div>
  `;
}

function buildStudyHubPropFirmMarkup(){
  return `
    <div class="study-section-stack">
      <div class="setup-card">
        <div class="table-header study-card-header">
          <div>
            <div class="setup-card-title">PropFirm Simulator</div>
            <div class="text-muted study-form-copy">Payout, drawdown, meta líquida e sizing em leitura nativa dentro do Mukas Hub.</div>
          </div>
          <div class="study-inline-actions">
            <button class="btn btn-primary btn-sm" onclick="saveStudyPropFirm()">Atualizar leitura</button>
            <button class="btn btn-ghost btn-sm" onclick="syncStudySimulatorFromPropfirm()">Enviar para Trade Simulator</button>
          </div>
        </div>
        <div class="form-grid fg-4">
          <div class="field-group"><label>Conta (USD)</label><input type="number" id="studyPropAccount" step="100" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>Payout %</label><input type="number" id="studyPropPayout" step="1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>DD máximo %</label><input type="number" id="studyPropMaxDd" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>DD diário %</label><input type="number" id="studyPropDailyDd" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>Risco / trade %</label><input type="number" id="studyPropRisk" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>Meta %</label><input type="number" id="studyPropTarget" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>RRR</label><input type="number" id="studyPropRrr" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>USD/BRL</label><input type="number" id="studyPropFx" step="0.01" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>Imposto %</label><input type="number" id="studyPropTax" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>Intermediação %</label><input type="number" id="studyPropFee" step="0.1" onchange="saveStudyPropFirm()"></div>
        </div>
      </div>
      <div class="chart-card">
        <div class="setup-card-title">Leitura quantitativa</div>
        <div id="studyPropMetrics" class="hero-metric-grid"></div>
      </div>
      <div class="table-card">
        <div class="table-header">
          <div class="table-title">Escada de payout</div>
          <div class="text-muted text-mono">cenários em percentual da conta</div>
        </div>
        <table class="tbl">
          <thead>
            <tr><th>Lucro %</th><th>Lucro USD</th><th>Payout bruto</th><th>Líquido USD</th><th>Líquido BRL</th><th>Trades</th></tr>
          </thead>
          <tbody id="studyPropLadder"></tbody>
        </table>
      </div>
    </div>
  `;
}

function buildStudyHubPlanMarkup(){
  return `
    <div class="study-section-stack">
      <div class="setup-card">
        <div class="table-header study-card-header">
          <div>
            <div class="setup-card-title">Plano de Trade</div>
            <div class="text-muted study-form-copy">Playbook operacional, limites da sessão e revisão pós-mercado conectados ao estado atual da conta.</div>
          </div>
          <div class="study-inline-actions">
            <button class="btn btn-primary btn-sm" onclick="saveStudyPlan()">Salvar plano</button>
          </div>
        </div>
        <div class="form-grid fg-3">
          <div class="field-group"><label>Título</label><input type="text" id="studyPlanTitle" onchange="saveStudyPlan()"></div>
          <div class="field-group"><label>Mercado</label><input type="text" id="studyPlanMarket" onchange="saveStudyPlan()"></div>
          <div class="field-group"><label>Janela</label><input type="text" id="studyPlanWindow" onchange="saveStudyPlan()"></div>
          <div class="field-group"><label>Setup</label><textarea id="studyPlanSetup" onchange="saveStudyPlan()"></textarea></div>
          <div class="field-group"><label>Invalidação</label><textarea id="studyPlanInvalidation" onchange="saveStudyPlan()"></textarea></div>
          <div class="field-group"><label>Condição de não trade</label><textarea id="studyPlanNoTrade" onchange="saveStudyPlan()"></textarea></div>
        </div>
      </div>
      <div class="study-native-grid">
        <div class="setup-card">
          <div class="setup-card-title">Regras da sessão</div>
          <div class="form-grid fg-3">
            <div class="field-group"><label>Meta diária %</label><input type="number" id="studyPlanDailyGoal" step="0.1" onchange="saveStudyPlan()"></div>
            <div class="field-group"><label>Stop diário %</label><input type="number" id="studyPlanDailyStop" step="0.1" onchange="saveStudyPlan()"></div>
            <div class="field-group"><label>Máx. trades</label><input type="number" id="studyPlanMaxTrades" step="1" onchange="saveStudyPlan()"></div>
          </div>
        </div>
        <div class="setup-card">
          <div class="setup-card-title">Checklist pré-sessão</div>
          <div class="field-group"><textarea id="studyPlanChecklist" onchange="saveStudyPlan()"></textarea></div>
        </div>
      </div>
      <div class="study-native-grid">
        <div class="setup-card">
          <div class="setup-card-title">Execução</div>
          <div class="field-group"><textarea id="studyPlanExecution" onchange="saveStudyPlan()"></textarea></div>
        </div>
        <div class="setup-card">
          <div class="setup-card-title">Revisão</div>
          <div class="field-group"><textarea id="studyPlanReview" onchange="saveStudyPlan()"></textarea></div>
        </div>
      </div>
    </div>
  `;
}

function buildStudyHubSimulationMarkup(){
  return `
    <div class="study-section-stack">
      <div class="setup-card">
        <div class="table-header study-card-header">
          <div>
            <div class="setup-card-title">Trade Simulator</div>
            <div class="text-muted study-form-copy">Monte Carlo nativo para leitura de expectativa, mediana e cauda adversa com base no risco da conta.</div>
          </div>
          <div class="study-inline-actions">
            <button class="btn btn-primary btn-sm" onclick="runStudySimulation()">Rodar simulação</button>
          </div>
        </div>
        <div class="form-grid fg-3">
          <div class="field-group"><label>Capital</label><input type="number" id="studySimCapital" step="100" onchange="runStudySimulation()"></div>
          <div class="field-group"><label>Risco %</label><input type="number" id="studySimRisk" step="0.1" onchange="runStudySimulation()"></div>
          <div class="field-group"><label>Win Rate %</label><input type="number" id="studySimWinRate" step="1" min="1" max="99" onchange="runStudySimulation()"></div>
          <div class="field-group"><label>RRR</label><input type="number" id="studySimRrr" step="0.1" onchange="runStudySimulation()"></div>
          <div class="field-group"><label>Trades</label><input type="number" id="studySimTrades" step="1" onchange="runStudySimulation()"></div>
          <div class="field-group"><label>Simulações</label><input type="number" id="studySimRuns" step="10" onchange="runStudySimulation()"></div>
        </div>
      </div>
      <div class="chart-card">
        <div class="setup-card-title">Leitura estatística</div>
        <div id="studySimMetrics" class="hero-metric-grid"></div>
      </div>
      <div class="chart-card">
        <div class="table-header">
          <div class="table-title">Monte Carlo</div>
          <div class="text-muted text-mono">p10 · p50 · p90</div>
        </div>
        <div class="study-sim-chart-wrap">
          <canvas id="studySimChart"></canvas>
        </div>
      </div>
    </div>
  `;
}

function buildStudyHubMentalMarkup(){
  return `
    <div class="study-section-stack">
      <div class="setup-card">
        <div class="table-header study-card-header">
          <div>
            <div class="setup-card-title">Ferramentas Mentais</div>
            <div class="text-muted study-form-copy">Check-in psicológico, âncora de execução e gatilhos de corte conectados à disciplina real da conta.</div>
          </div>
          <div class="study-inline-actions">
            <button class="btn btn-primary btn-sm" onclick="saveStudyMental()">Salvar leitura</button>
          </div>
        </div>
        <div class="study-range-grid">
          <div class="study-range-card">
            <div class="range-row"><span>Foco</span><span id="studyMentalFocusVal">4/5</span></div>
            <input type="range" id="studyMentalFocus" min="1" max="5" step="1" oninput="updateStudyMentalRange('Focus',this.value)" onchange="saveStudyMental()">
          </div>
          <div class="study-range-card">
            <div class="range-row"><span>Energia</span><span id="studyMentalEnergyVal">4/5</span></div>
            <input type="range" id="studyMentalEnergy" min="1" max="5" step="1" oninput="updateStudyMentalRange('Energy',this.value)" onchange="saveStudyMental()">
          </div>
          <div class="study-range-card">
            <div class="range-row"><span>Stress</span><span id="studyMentalStressVal">2/5</span></div>
            <input type="range" id="studyMentalStress" min="1" max="5" step="1" oninput="updateStudyMentalRange('Stress',this.value)" onchange="saveStudyMental()">
          </div>
          <div class="study-range-card">
            <div class="range-row"><span>Disciplina</span><span id="studyMentalDisciplineVal">4/5</span></div>
            <input type="range" id="studyMentalDiscipline" min="1" max="5" step="1" oninput="updateStudyMentalRange('Discipline',this.value)" onchange="saveStudyMental()">
          </div>
        </div>
      </div>
      <div class="chart-card">
        <div class="setup-card-title">Leitura emocional</div>
        <div id="studyMentalMetrics" class="hero-metric-grid"></div>
      </div>
      <div class="study-native-grid">
        <div class="setup-card">
          <div class="setup-card-title">Âncora</div>
          <div class="field-group"><textarea id="studyMentalAnchor" onchange="saveStudyMental()"></textarea></div>
        </div>
        <div class="setup-card">
          <div class="setup-card-title">Triggers</div>
          <div class="field-group"><textarea id="studyMentalTriggers" onchange="saveStudyMental()"></textarea></div>
        </div>
      </div>
      <div class="setup-card">
        <div class="setup-card-title">Corte da sessão</div>
        <div class="field-group"><textarea id="studyMentalCutoff" onchange="saveStudyMental()"></textarea></div>
      </div>
    </div>
  `;
}

function buildStudyHubModuleMarkup(moduleKey){
  if(moduleKey==='plano')return buildStudyHubPlanMarkup();
  if(moduleKey==='tradesim')return buildStudyHubSimulationMarkup();
  if(moduleKey==='mental')return buildStudyHubMentalMarkup();
  return buildStudyHubPropFirmMarkup();
}

function buildStudyHubNativeMarkup(moduleKey){
  return `
    <div class="study-tab-panel active" id="studyHubPanel-${moduleKey}">
      <div class="study-hub-shell-native">
        ${buildStudyHubModuleMarkup(moduleKey)}
        ${buildStudyHubSidebar(moduleKey)}
      </div>
    </div>
  `;
}

function switchStudyHubTab(tab, btn){
  if(!STUDY_HUB_INFO[tab])return;
  studyHubTab=tab;
  if(btn){
    document.querySelectorAll('#studyHubTabs .tab-btn').forEach(node=>node.classList.remove('active'));
    btn.classList.add('active');
  }
  renderStudyHub();
}

function renderStudyHub(){
  const moduleKey=STUDY_HUB_INFO[studyHubTab]?studyHubTab:'propfirm';
  studyHubTab=moduleKey;
  const host=document.getElementById('studyHubLegacyApp');
  const acct=getActiveAccount();
  const acctTrades=getAccountTrades(activeAccountId);
  const risk=calcAccountRiskState(acct,acctTrades);
  const moduleIndex={propfirm:0,plano:1,tradesim:2,mental:3}[moduleKey] ?? 0;

  document.querySelectorAll('#studyHubTabs .tab-btn').forEach(btn=>{
    const active=btn.getAttribute('onclick')?.includes(`'${moduleKey}'`);
    btn.classList.toggle('active',!!active);
  });

  if(host){
    host.classList.add('embed-mode');
    if(typeof window.sh_hubSwitch==='function') window.sh_hubSwitch(moduleIndex);
    else {
      ['mod-propfirm','mod-plano','mod-tradesim','mod-mental'].forEach((id,idx)=>{
        const el=document.getElementById(id);
        if(el) el.classList.toggle('active', idx===moduleIndex);
      });
    }
    syncStudyHubLegacyInputs(moduleKey);
    if(typeof window.sh_legacyInit==='function') window.sh_legacyInit(moduleKey);
    if(moduleKey==='tradesim'&&typeof window.studyHubEnhanceIntradayImpact==='function'){
      requestAnimationFrame(()=>window.studyHubEnhanceIntradayImpact());
    }
  }

  renderStatusList('studyHubRuntimeStatus',buildStudyHubStatuses(moduleKey,acct,acctTrades,risk),'Conta ativa sem alertas críticos.');
  if(moduleKey==='propfirm')renderStudyPropFirm();
  else if(moduleKey==='plano')renderStudyPlan();
  else if(moduleKey==='tradesim')renderStudySimulation();
  else renderStudyMental();
}

function normalizeDocImages(images){
  if(!Array.isArray(images))return[];
  return images
    .filter(img=>img&&img.dataUrl)
    .map(img=>({name:img.name||'imagem',dataUrl:img.dataUrl}));
}

function formatDocumentSelection(type){
  const editor=document.getElementById('docEditorBody');
  if(!editor||editor.disabled)return;
  const start=editor.selectionStart??editor.value.length;
  const end=editor.selectionEnd??editor.value.length;
  const selected=editor.value.slice(start,end);
  const fallback={
    bold:'texto em negrito',
    italic:'texto em italico',
    underline:'texto sublinhado',
    h1:'Titulo',
    h2:'Subtitulo',
    list:'item da lista',
    quote:'citacao',
  }[type]||'texto';
  const text=selected||fallback;
  let replacement=text;
  let caretStart=start;
  let caretEnd=start+replacement.length;
  const prefixLines=prefix=>text.split(/\r?\n/).map(line=>`${prefix}${line}`).join('\n');

  if(type==='bold'){
    replacement=`**${text}**`;
    caretStart=start+2;
    caretEnd=caretStart+text.length;
  } else if(type==='italic'){
    replacement=`_${text}_`;
    caretStart=start+1;
    caretEnd=caretStart+text.length;
  } else if(type==='underline'){
    replacement=`<u>${text}</u>`;
    caretStart=start+3;
    caretEnd=caretStart+text.length;
  } else if(type==='h1'){
    replacement=prefixLines('# ');
  } else if(type==='h2'){
    replacement=prefixLines('## ');
  } else if(type==='list'){
    replacement=prefixLines('- ');
  } else if(type==='quote'){
    replacement=prefixLines('> ');
  }

  editor.setRangeText(replacement,start,end,'end');
  if(!selected&&['bold','italic','underline'].includes(type))editor.setSelectionRange(caretStart,caretEnd);
  editor.focus();
}

function getDocumentEntryImages(entry){
  return normalizeDocImages(entry?.images);
}

function setDocumentEntryImages(entry,images){
  if(!entry)return;
  const next=normalizeDocImages(images);
  const now=new Date().toISOString();
  if(entry.kind==='trade'){
    const idx=trades.findIndex(trade=>trade.id===entry.tradeId);
    if(idx>=0){
      trades[idx].images=next;
      trades[idx].updatedAt=now;
    }
    return;
  }
  if(entry.kind==='daily'){
    if(!preMarketData[entry.date])preMarketData[entry.date]={};
    preMarketData[entry.date].images=next;
    preMarketData[entry.date].savedAt=now;
    return;
  }
  if(entry.kind==='general'){
    const idx=(config.generalDocs||[]).findIndex(doc=>doc.id===entry.docId);
    if(idx>=0){
      config.generalDocs[idx].images=next;
      config.generalDocs[idx].updatedAt=now;
    }
  }
}

function triggerDocumentImageUpload(){
  const entry=getCurrentDocumentEntry();
  if(!entry){showAppNotice('Selecione um documento','Selecione uma nota antes de adicionar imagem.');return;}
  document.getElementById('docImageInput')?.click();
}

function triggerFileInput(id){
  document.getElementById(id)?.click();
}

function addDocumentImages(e){
  const entry=getCurrentDocumentEntry();
  const files=Array.from(e.target.files||[]);
  if(!entry||!files.length)return;
  const target={...entry};
  files.forEach(file=>{
    if(!file.type.startsWith('image/'))return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const images=[...getDocumentEntryImages(target),{name:file.name,dataUrl:ev.target.result}];
      target.images=images;
      setDocumentEntryImages(target,images);
      save();
      renderDocumentsPage();
    };
    reader.readAsDataURL(file);
  });
  e.target.value='';
}

function removeDocumentImage(index){
  const entry=getCurrentDocumentEntry();
  if(!entry)return;
  const images=getDocumentEntryImages(entry);
  images.splice(index,1);
  setDocumentEntryImages(entry,images);
  save();
  renderDocumentsPage();
}

function getDocumentEntries(folderId=activeDocFolder){
  if(folderId==='tradeNotes'){
    return getOrderedTrades(getAccountTrades(activeAccountId))
      .filter(trade=>(trade.remarks||'').trim())
      .map(trade=>{
        const images=normalizeDocImages(trade.images);
        const pnlStr=trade.pnl!=null?((trade.pnl>=0?'+':'')+fR(trade.pnl)):'—';
        const rStr=(trade.r!=null&&Number.isFinite(trade.r))?((trade.r>=0?'+':'')+trade.r.toFixed(2)+'R'):'';
        return {
          id:`trade:${trade.id}`,
          kind:'trade',
          tradeId:trade.id,
          status:trade.status||'OPEN',
          pnl:trade.pnl,
          title:`${trade.symbol||'Trade'} · ${formatDocDate(trade.date)}`,
          meta:`${trade.strategy||'Sem estratégia'}${rStr?' · '+rStr:''} · ${pnlStr}`,
          body:trade.remarks||'',
          images,
          media:images[0]?.dataUrl||null,
          updatedAt:trade.updatedAt||trade.createdAt||'',
        };
      });
  }
  if(folderId==='dailyNotes'){
    return Object.entries(preMarketData)
      .filter(([,entry])=>entry?.docCreatedAt||(entry?.notes||'').trim())
      .sort((a,b)=>b[0].localeCompare(a[0]))
      .map(([date,entry])=>{
        const images=normalizeDocImages(entry.images);
        const parts=[];
        if(entry.mood)parts.push(`Humor ${entry.mood}/5`);
        if(entry.energy)parts.push(`Energia ${entry.energy}/5`);
        if(entry.stress)parts.push(`Estresse ${entry.stress}/5`);
        return {
          id:`daily:${date}`,
          kind:'daily',
          date,
          title:`${formatDocDate(date)}`,
          meta:parts.length?parts.join(' · '):'Nota do dia',
          body:entry.notes||'',
          images,
          media:images[0]?.dataUrl||null,
          updatedAt:entry.savedAt||'',
        };
      });
  }
  return (config.generalDocs||[])
    .map(doc=>{
      const images=normalizeDocImages(doc.images);
      const wordCount=(doc.content||'').trim().split(/\s+/).filter(Boolean).length;
      const updatedStr=doc.updatedAt?new Date(doc.updatedAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'—';
      return {
        id:`general:${doc.id}`,
        kind:'general',
        docId:doc.id,
        title:doc.title||'Documento geral',
        meta:`${wordCount} ${wordCount===1?'palavra':'palavras'} · atualizado ${updatedStr}`,
        hasContent:wordCount>0,
        body:doc.content||'',
        images,
        media:images[0]?.dataUrl||null,
        updatedAt:doc.updatedAt||'',
      };
    })
    .sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
}

function getDocumentFolders(){
  return [
    {id:'tradeNotes',  label:'Trades',      desc:'Observações registradas nos trades',  icon:'file',     count:getDocumentEntries('tradeNotes').length},
    {id:'dailyNotes',  label:'Diário',       desc:'Notas do dia criadas na rotina',      icon:'calendar', count:getDocumentEntries('dailyNotes').length},
    {id:'generalNotes',label:'Documentos',   desc:'Playbook, mapa de risco e anotações', icon:'folder',   count:getDocumentEntries('generalNotes').length},
  ];
}

function selectDocumentFolder(folderId){
  activeDocFolder=folderId;
  activeDocId=null;
  renderDocumentsPage();
}

function selectDocumentEntry(entryId){
  activeDocId=entryId;
  renderDocumentsPage();
}

function getCurrentDocumentEntry(){
  return getDocumentEntries(activeDocFolder).find(entry=>entry.id===activeDocId)||null;
}

function openDocumentTrade(){
  const entry=getCurrentDocumentEntry();
  if(entry?.kind!=='trade'||!entry.tradeId)return;
  openModal('tradeModal',entry.tradeId);
}

function createGeneralDocument(){
  const id=uid();
  if(!Array.isArray(config.generalDocs))config.generalDocs=[];
  config.generalDocs.unshift({
    id,
    title:'Nova anotação geral',
    content:'',
    images:[],
    updatedAt:new Date().toISOString(),
  });
  activeDocFolder='generalNotes';
  activeDocId=`general:${id}`;
  save();
  renderDocumentsPage();
}

function createDailyDocument(){
  const date=new Date().toISOString().split('T')[0];
  const now=new Date().toISOString();
  if(!preMarketData[date])preMarketData[date]={};
  preMarketData[date]={
    ...preMarketData[date],
    notes:preMarketData[date].notes||'',
    docCreatedAt:preMarketData[date].docCreatedAt||now,
    savedAt:now,
  };
  activeDocFolder='dailyNotes';
  activeDocId=`daily:${date}`;
  save();
  renderDocumentsPage();
}

function createDocumentFromActiveFolder(){
  if(activeDocFolder==='dailyNotes'){createDailyDocument();return;}
  if(activeDocFolder==='tradeNotes'){
    showAppNotice('Notas de trades','Notas de trades são criadas ao preencher o campo "Observações / Análise" dentro de um trade. Abra ou registre um trade para começar.');
    return;
  }
  createGeneralDocument();
}

function getDocumentCreateLabel(){
  return ({
    dailyNotes:'Nova nota do dia',
    tradeNotes:'Como criar',
    generalNotes:'Nova anotação',
  })[activeDocFolder]||'Nova anotação';
}

function getDocumentCreateDesc(){
  return ({
    dailyNotes:'Abre nota do dia atual',
    tradeNotes:'Notas vêm do campo de observações do trade',
    generalNotes:'Cria documento editável',
  })[activeDocFolder]||'Cria documento editável';
}

function saveCurrentDocument(){
  const entry=getCurrentDocumentEntry();
  const titleEl=document.getElementById('docEditorTitle');
  const bodyEl=document.getElementById('docEditorBody');
  if(!entry||!titleEl||!bodyEl){showAppNotice('Selecione um documento','Selecione um documento antes de salvar.');return;}
  const body=bodyEl.value||'';
  const title=titleEl.value||'Documento';
  const now=new Date().toISOString();

  if(entry.kind==='trade'){
    const idx=trades.findIndex(trade=>trade.id===entry.tradeId);
    if(idx>=0){
      trades[idx].remarks=body;
      trades[idx].updatedAt=now;
    }
  } else if(entry.kind==='daily'){
    if(!preMarketData[entry.date])preMarketData[entry.date]={};
    preMarketData[entry.date].notes=body;
    preMarketData[entry.date].docCreatedAt=preMarketData[entry.date].docCreatedAt||now;
    preMarketData[entry.date].savedAt=now;
  } else if(entry.kind==='general'){
    const idx=(config.generalDocs||[]).findIndex(doc=>doc.id===entry.docId);
    if(idx>=0){
      config.generalDocs[idx].title=title;
      config.generalDocs[idx].content=body;
      config.generalDocs[idx].updatedAt=now;
    }
  }

  save();
  refreshAll();
  showAppNotice('Documento salvo','✓ Documento salvo!');
}

function deleteDocumentEntry(entry){
  if(!entry)return false;
  const now=new Date().toISOString();
  if(entry.kind==='trade'){
    const idx=trades.findIndex(trade=>trade.id===entry.tradeId);
    if(idx<0)return false;
    trades[idx].remarks='';
    trades[idx].images=[];
    trades[idx].updatedAt=now;
  } else if(entry.kind==='daily'){
    if(!preMarketData[entry.date])return false;
    preMarketData[entry.date]={
      ...preMarketData[entry.date],
      notes:'',
      images:[],
      savedAt:now,
    };
    delete preMarketData[entry.date].docCreatedAt;
  } else if(entry.kind==='general'){
    const before=(config.generalDocs||[]).length;
    config.generalDocs=(config.generalDocs||[]).filter(doc=>doc.id!==entry.docId);
    if(config.generalDocs.length===before)return false;
  } else {
    return false;
  }
  activeDocId=null;
  return true;
}

function deleteCurrentDocument(){
  const entry=getCurrentDocumentEntry();
  if(!entry){showAppNotice('Excluir documento','Selecione uma anotação antes de excluir.');return;}
  const label=entry.kind==='trade'
    ? 'Limpar a anotação deste trade? O trade será mantido.'
    : entry.kind==='daily'
      ? 'Excluir esta anotação diária? A rotina do dia será mantida.'
      : `Excluir "${entry.title}"?`;
  showAppConfirm('Excluir anotação',label,()=>{
    if(deleteDocumentEntry(entry)){
      save();
      renderDocumentsPage();
      showAppNotice('Anotação excluída','Anotação removida com sucesso.');
    }
  },{danger:true,confirmText:'Excluir'});
}


function copyPartnerText(value,label='Conteúdo copiado'){
  const text=String(value||'').trim();
  if(!text){showAppNotice('Nada para copiar','Preencha este campo antes de copiar.');return;}
  const done=()=>showAppNotice(label,text);
  try{
    const clip=globalThis?.navigator?.clipboard;
    if(clip&&typeof clip.writeText==='function'){
      Promise.resolve(clip.writeText(text)).then(done).catch(done);
      return;
    }
  }catch(e){}
  done();
}

function addPartnerAffiliate(){
  const hub=getPartnerHubConfig();
  hub.affiliates.push(normalizePartnerAffiliate({}));
  save();
  renderPartnersPage();
}

function updatePartnerAffiliateField(id,key,value){
  const hub=getPartnerHubConfig();
  const entry=hub.affiliates.find(item=>item.id===id);
  if(!entry)return;
  entry[key]=String(value||'').trim();
  save();
  renderPartnersPage();
}

function removePartnerAffiliate(id){
  const hub=getPartnerHubConfig();
  const entry=hub.affiliates.find(item=>item.id===id);
  if(!entry)return;
  showAppConfirm('Remover afiliado',`Remover ${entry.name||'este afiliado'} da lista?`,()=>{
    hub.affiliates=hub.affiliates.filter(item=>item.id!==id);
    config.partnerHub=hub;
    save();
    renderPartnersPage();
  },{danger:true,confirmText:'Remover'});
}

function updatePartnerSupportField(key,value){
  const hub=getPartnerHubConfig();
  hub[key]=String(value||'').trim();
  save();
  renderPartnersPage();
}

function clearPartnerBtcQr(){
  const hub=getPartnerHubConfig();
  hub.btcQrImage='';
  const input=document.getElementById('partnerBtcQrInput');
  if(input)input.value='';
  save();
  renderPartnersPage();
}

function handlePartnerBtcQrUpload(event){
  const file=Array.from(event?.target?.files||[])[0];
  if(!file)return;
  if(file.type&&!file.type.startsWith('image/')){
    showAppNotice('QR Code BTC','Selecione uma imagem para o QR Code.');
    return;
  }
  const reader=new FileReader();
  reader.onload=ev=>{
    const hub=getPartnerHubConfig();
    hub.btcQrImage=String(ev?.target?.result||'');
    save();
    renderPartnersPage();
  };
  reader.readAsDataURL(file);
  if(event?.target)event.target.value='';
}




document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',e=>{
  e.preventDefault();
  const files=Array.from(e.dataTransfer.files);
  if(!files.length)return;
  const f=files[0];
  if(f.name.endsWith('.json')){importJSON({target:{files}});return;}
  if(f.name.endsWith('.xlsx')||f.name.endsWith('.html')||f.name.endsWith('.htm')){handleMT5Upload({target:{files:[f]}});return;}
  handleCSVUpload({target:{files}});
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(document.getElementById('appDialogModal')?.classList.contains('open'))closeAppDialog();
    document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));
    clearSelection();
    toggleSidebar(false);
  }
  if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();openModal('tradeModal');}
  if(e.key==='Delete'&&selectedTrades.size>0){bulkDelete();}
});
function setupRiskNumber(value,fallback){
  const n=parseFloat(value);
  return Number.isFinite(n)&&n>=0?n:fallback;
}

function readSetupRiskFormValues(){
  const g=id=>document.getElementById(id)?.value||'';
  return {
    balance:g('cfg-balance'),
    goalPct:g('cfg-goal'),
    risk:g('cfg-risk'),
    ddDaily:g('cfg-dd-daily'),
    ddWeekly:g('cfg-dd-weekly'),
    ddMonthly:g('cfg-dd-monthly'),
    ddTotal:g('cfg-dd'),
  };
}

function applySetupRiskToActiveAccount(values={}){
  const acct=getActiveAccount();
  const balance=setupRiskNumber(values.balance,acct?.balance??config.balance??1000);
  const risk=setupRiskNumber(values.risk,acct?.risk??config.risk??1);
  const ddDaily=setupRiskNumber(values.ddDaily,acct?.ddDaily??config.ddDaily??2);
  const ddWeekly=setupRiskNumber(values.ddWeekly,acct?.ddWeekly??config.ddWeekly??5);
  const ddMonthly=setupRiskNumber(values.ddMonthly,acct?.ddMonthly??config.ddMonthly??8);
  const ddTotal=setupRiskNumber(values.ddTotal,acct?.ddTotal??config.dd??10);
  const goalPct=setupRiskNumber(values.goalPct??values.goal,acct?.goalPct??config.goal??10);
  config.balance=balance;
  config.risk=risk;
  config.ddDaily=ddDaily;
  config.ddWeekly=ddWeekly;
  config.ddMonthly=ddMonthly;
  config.dd=ddTotal;
  config.goal=goalPct;
  if(acct){
    acct.balance=balance;
    acct.risk=risk;
    acct.ddDaily=ddDaily;
    acct.ddWeekly=ddWeekly;
    acct.ddMonthly=ddMonthly;
    acct.ddTotal=ddTotal;
    acct.goalPct=goalPct;
    return acct;
  }
  return {balance,risk,ddDaily,ddWeekly,ddMonthly,ddTotal,goalPct};
}

function previewSetupRiskFromForm(){
  const acct=applySetupRiskToActiveAccount(readSetupRiskFormValues());
  if(acct){
    renderSetupRiskSummary();
    syncAccountBalanceChrome(acct,getAccountTrades(acct.id));
    updateTopbarStats({fit:false});
  }
}

function addSetupCashflowToActiveAccount(flow){
  const acct=getActiveAccount();
  if(!acct)return null;
  const entry=addAccountCashflow(acct.id,flow);
  if(entry){renderSetupRiskSummary();renderSetupCashflowList();syncAccountBalanceChrome(acct,getAccountTrades(acct.id));updateTopbarStats();}
  return entry;
}

function addSetupCashflowFromForm(){
  const flow={
    type:document.getElementById('setup-flow-type')?.value||'deposit',
    date:document.getElementById('setup-flow-date')?.value||new Date().toISOString().split('T')[0],
    amount:document.getElementById('setup-flow-amount')?.value||0,
    note:document.getElementById('setup-flow-note')?.value||'',
  };
  const preview=sanitizeAccountCashflow(flow);
  if(!preview){showAppNotice('Movimento inválido','Informe um valor maior que zero.');return;}
  const label=preview.type==='withdrawal'?'Retirada':'Aporte';
  showAppConfirm(`Adicionar ${label}`,`Confirmar ${label.toLowerCase()} de ${fR(preview.amount)} na conta ativa?\n\nData: ${fDate(preview.date)}${preview.note?`\nObservação: ${preview.note}`:''}`,()=>{
    const entry=addSetupCashflowToActiveAccount(preview);
    if(!entry){showAppNotice('Movimento inválido','Informe um valor maior que zero.');return;}
    const amount=document.getElementById('setup-flow-amount');if(amount)amount.value='';
    const note=document.getElementById('setup-flow-note');if(note)note.value='';
    refreshAll();
  },{confirmText:'Confirmar'});
}

function deleteSetupCashflow(flowId){
  const acct=getActiveAccount();
  if(!acct)return;
  const flow=getAccountCashflows(acct).find(item=>item.id===flowId);
  if(!flow)return;
  const label=flow.type==='withdrawal'?'retirada':'aporte';
  showAppConfirm('Excluir movimento',`Excluir ${label} de ${fR(flow.amount)}?\n\nEsta ação atualiza o saldo da conta.`,()=>{
    if(deleteAccountCashflow(acct.id,flowId))refreshAll();
  },{danger:true,confirmText:'Excluir'});
}

function addTag(type){
  const inp=document.getElementById('new'+type.charAt(0).toUpperCase()+type.slice(1));
  const val=inp?.value?.trim();if(!val)return;
  if(type==='strategy')config=ensureDefaultStrategies(config);
  const key=tagConfigKey(type);
  if(!Array.isArray(config[key]))config[key]=[];
  const exists=config[key].some(item=>type==='strategy'
    ? normalizeStrategyName(item)===normalizeStrategyName(val)
    : item===val);
  if(exists){showAppNotice('Item duplicado','Já existe: '+val);return;}
  config[key].push(val);
  inp.value='';save();renderTags(type);
}

function removeTag(type,idx){
  const key=tagConfigKey(type);
  const name=config[key][idx];
  showAppConfirm('Remover item',`Remover "${name}"?`,()=>{
    config[key].splice(idx,1);save();renderTags(type);
  },{danger:true,confirmText:'Remover'});
}

function saveConfig(){
  const g=id=>document.getElementById(id)?.value||'';
  applySetupRiskToActiveAccount(readSetupRiskFormValues());
  config.tf=g('cfg-tf')||'5M';
  config.mult=parseFloat(g('cfg-mult'))||config.mult||0.2;
  config.symDefault=g('cfg-sym-default')||'';
  save();refreshAll();showAppNotice('Configurações salvas','✓ Configurações salvas!');
}

function clearAll(){
  showAppPrompt('Limpar todos os dados',
    `Isso apagará TODOS os ${trades.length} trades e dados de pré-mercado.\n\nPara confirmar, digite exatamente: APAGAR TUDO`,
    '',
    ()=>{
      trades=[];preMarketData={};
      save();refreshAll();showAppNotice('Dados apagados','Todos os dados foram apagados.');
    },
    {danger:true,confirmText:'Limpar tudo',inputLabel:'Confirmação',requiredValue:'APAGAR TUDO',errorText:'Digite APAGAR TUDO para confirmar.'}
  );
}

function recomputeAllIncomplete(){
  trades=trades.map(trade=>{
    const missing=calcImportMissingFields(trade,trade.status);
    const incomplete=missing.length>0;
    if(incomplete===!!trade.incomplete&&JSON.stringify(missing)===JSON.stringify(trade.missing_fields||[]))return trade;
    return {...trade,incomplete,missing_fields:missing};
  });
}

// ══════════════════════════════════════════════
// SISTEMA DE IDIOMAS (i18n)
// ══════════════════════════════════════════════
let currentLanguage = localStorage.getItem('appLanguage') || 'pt-BR';
