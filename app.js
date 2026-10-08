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
const padClock = value => String(value).padStart(2,'0');

function normalizeClockTime(value){
  if(value===null||value===undefined)return'';
  if(value instanceof Date&&!isNaN(value.getTime())){
    return `${padClock(value.getHours())}:${padClock(value.getMinutes())}`;
  }
  const raw=cleanMTCell(value);
  if(!raw)return'';
  let m=raw.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
  if(m)return`${padClock(m[1])}:${m[2]}`;
  m=raw.match(/\b(\d{1,2})\.(\d{2})(?:\.(\d{2}))?\b/);
  if(m)return`${padClock(m[1])}:${m[2]}`;
  m=raw.match(/^(\d{3,4})$/);
  if(m){
    const digits=m[1].padStart(4,'0');
    const hh=parseInt(digits.slice(0,2),10);
    const mm=parseInt(digits.slice(2),10);
    if(hh>=0&&hh<24&&mm>=0&&mm<60)return`${padClock(hh)}:${padClock(mm)}`;
  }
  const parsed=new Date(raw);
  if(!isNaN(parsed.getTime()))return`${padClock(parsed.getHours())}:${padClock(parsed.getMinutes())}`;
  return'';
}

function clockToMinutes(value){
  const clock=normalizeClockTime(value);
  if(!clock)return null;
  const [hh,mm]=clock.split(':').map(Number);
  return hh*60+mm;
}

function formatClockMinutes(value){
  const minutes=Math.round(Number(value));
  if(!Number.isFinite(minutes))return'—';
  const safe=((minutes%(24*60))+(24*60))%(24*60);
  const hh=Math.floor(safe/60);
  const mm=safe%60;
  return `${padClock(hh)}:${padClock(mm)}`;
}

function formatDurationMinutes(value){
  const minutes=Math.round(Number(value));
  if(!Number.isFinite(minutes)||minutes<0)return'—';
  if(minutes<60)return `${minutes} min`;
  const hours=Math.floor(minutes/60);
  const rest=minutes%60;
  return rest?`${hours}h ${rest}min`:`${hours}h`;
}

function buildTradeDateTime(dateValue,timeValue){
  const clock=normalizeClockTime(timeValue);
  const date=normalizeDate(dateValue||timeValue);
  if(!date||!clock)return null;
  const parsed=new Date(`${date}T${clock}:00`);
  return isNaN(parsed.getTime())?null:parsed;
}

function getTradeDurationMinutes(trade={}){
  const start=buildTradeDateTime(trade.date||trade.openTime,trade.openTime);
  const end=buildTradeDateTime(trade.exitDate||trade.date||trade.exitTime,trade.exitTime);
  if(!start||!end)return null;
  let diff=Math.round((end.getTime()-start.getTime())/60000);
  if(diff<0&&diff>-1440)diff+=1440;
  return diff>=0?diff:null;
}

function averageMinutes(values=[]){
  const list=(Array.isArray(values)?values:[])
    .map(v=>Number(v))
    .filter(v=>Number.isFinite(v));
  if(!list.length)return null;
  return Math.round(list.reduce((sum,v)=>sum+v,0)/list.length);
}

function summarizeTradeTimingGroup(source=[]){
  const rows=(Array.isArray(source)?source:[]);
  return{
    count:rows.length,
    avgPlacedMinutes:averageMinutes(rows.map(t=>clockToMinutes(t.placedTime))),
    avgOpenMinutes:averageMinutes(rows.map(t=>clockToMinutes(t.openTime))),
    avgExitMinutes:averageMinutes(rows.map(t=>clockToMinutes(t.exitTime))),
    avgDurationMinutes:averageMinutes(rows.map(getTradeDurationMinutes)),
  };
}

function getTradeTimingStats(source=[]){
  const closed=(Array.isArray(source)?source:[]).filter(t=>['WIN','LOSS','BE'].includes(t?.status));
  const grouped={};
  closed.forEach(trade=>{
    const key=trade.strategy||'Sem estratégia';
    if(!grouped[key])grouped[key]=[];
    grouped[key].push(trade);
  });
  const byStrategy=Object.entries(grouped)
    .map(([name,rows])=>({name,...summarizeTradeTimingGroup(rows)}))
    .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
  return{
    overall:summarizeTradeTimingGroup(closed),
    wins:summarizeTradeTimingGroup(closed.filter(t=>t.status==='WIN')),
    losses:summarizeTradeTimingGroup(closed.filter(t=>t.status==='LOSS')),
    byStrategy,
  };
}

function parseMTNumber(value){
  if(value===null||value===undefined)return null;
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  let s=String(value).trim();
  if(!s||s==='—')return null;
  let neg=false;
  if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1);}
  s=s.replace(/\u00a0/g,' ').replace(/[^\d,.\-+]/g,'').replace(/\s/g,'');
  if(!s)return null;
  const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
  if(comma>-1&&dot>-1){
    const decimal=comma>dot?',':'.';
    const thousand=decimal===','?'.':',';
    s=s.replace(new RegExp('\\'+thousand,'g'),'');
    if(decimal===',')s=s.replace(',','.');
  } else if(comma>-1){
    s=s.replace(/\./g,'').replace(',','.');
  }
  const n=parseFloat(s);
  if(!Number.isFinite(n))return null;
  return neg?-Math.abs(n):n;
}

function normalizeDate(value){
  if(value===null||value===undefined)return'';
  if(value instanceof Date&&!isNaN(value.getTime()))return value.toISOString().slice(0,10);
  const raw=String(value).trim();
  if(!raw)return'';
  const pad=n=>String(n).padStart(2,'0');
  let m=raw.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if(m)return`${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m=raw.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if(m)return`${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  const serial=parseMTNumber(raw);
  if(/^\d+([.,]\d+)?$/.test(raw)&&serial&&serial>20000&&serial<80000){
    const d=new Date(Date.UTC(1899,11,30)+serial*86400000);
    return d.toISOString().slice(0,10);
  }
  const d=new Date(raw);
  return isNaN(d.getTime())?'':d.toISOString().slice(0,10);
}

function cleanMTCell(value){return String(value??'').replace(/\s+/g,' ').trim();}
function mtTradeStatus(pnl){return pnl==null?'OPEN':Math.abs(pnl)<0.005?'BE':pnl>0?'WIN':'LOSS';}
function normalizeImportHeader(value){
  return cleanMTCell(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w%]+/g,'');
}
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

function openModal(id,tradeId=null){
  if(id==='tradeModal'&&showLogAccountEditLockNotice(tradeId?'editar':'adicionar'))return false;
  editingId=tradeId;
  document.getElementById(id).classList.add('open');
  if(id==='tradeModal'){
    populateSelects();
    if(tradeId){
      const t=trades.find(x=>x.id===tradeId);
      resetForm();
      if(t)fillForm(t);
    } else {
      resetForm();
      document.getElementById('t-date').value=new Date().toISOString().split('T')[0];
      updateTradeDurationField();
    }
    updateTradeModalFlowUI();
  }
  if(id==='accountModal'){
    renderAccountList();
    document.getElementById('accountForm').style.display='none';
  }
}
function closeModal(id){
  document.getElementById(id).classList.remove('open');
  if(id==='tradeModal')clearBulkIncompleteFlow();
}

function isBulkIncompleteFlowTrade(tradeId){
  return !!tradeId&&bulkIncompleteEditIds.includes(tradeId);
}

function updateTradeModalFlowUI(){
  const title=document.getElementById('tradeModalTitle');
  const flow=document.getElementById('tradeModalFlow');
  const label=document.getElementById('tradeModalFlowLabel');
  const prev=document.getElementById('tradeModalPrevBtn');
  const next=document.getElementById('tradeModalNextBtn');
  const saveBtn=document.getElementById('tradeModalSaveBtn');
  const active=bulkIncompleteEditIds.length>0&&bulkIncompleteEditIndex>=0&&isBulkIncompleteFlowTrade(editingId);

  if(title)title.textContent=editingId
    ? active?'Completar Trade Incompleto':'Editar Trade'
    : 'Registrar Trade';

  if(saveBtn)saveBtn.textContent=active&&bulkIncompleteEditIds.length>1?'Salvar e continuar':'Salvar Trade';
  if(!flow||!label||!prev||!next)return;

  if(!active){
    flow.style.display='none';
    label.textContent='';
    prev.disabled=true;
    next.disabled=true;
    return;
  }

  const total=bulkIncompleteEditIds.length;
  const currentTrade=trades.find(t=>t.id===editingId);
  flow.style.display='flex';
  label.textContent=`Completar incompletos ${bulkIncompleteEditIndex+1} de ${total}${currentTrade?.symbol?` · ${currentTrade.symbol}`:''}`;
  prev.disabled=bulkIncompleteEditIndex<=0;
  next.disabled=bulkIncompleteEditIndex>=total-1;
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

function openAppDialog(options={}){
  const modal=document.getElementById('appDialogModal');
  if(!modal)return false;
  const title=document.getElementById('appDialogTitle');
  const body=document.getElementById('appDialogBody');
  const inputWrap=document.getElementById('appDialogInputWrap');
  const input=document.getElementById('appDialogInput');
  const inputLabel=document.getElementById('appDialogInputLabel');
  const error=document.getElementById('appDialogError');
  const confirmBtn=document.getElementById('appDialogConfirmBtn');
  if(title)title.textContent=options.title||'Confirmar ação';
  if(body)body.textContent=options.message||'';
  if(error)error.textContent='';
  if(inputWrap)inputWrap.style.display=options.input?'block':'none';
  if(inputLabel)inputLabel.textContent=options.inputLabel||'Valor';
  if(input){input.value=options.inputValue||'';input.placeholder=options.inputPlaceholder||'';}
  if(confirmBtn){
    confirmBtn.textContent=options.confirmText||'Confirmar';
    confirmBtn.className=`btn ${options.danger?'btn-danger':'btn-primary'}`;
  }
  appDialogState={...options};
  modal.classList.add('open');
  if(options.input&&input)setTimeout(()=>input.focus(),0);
  return true;
}

function closeAppDialog(){
  document.getElementById('appDialogModal')?.classList.remove('open');
  appDialogState=null;
}

function confirmAppDialog(){
  const state=appDialogState;if(!state)return;
  const input=document.getElementById('appDialogInput');
  const value=state.input?(input?.value||''):'';
  if(state.requiredValue!=null&&value!==state.requiredValue){
    const error=document.getElementById('appDialogError');
    if(error)error.textContent=state.errorText||`Digite ${state.requiredValue} para confirmar.`;
    return;
  }
  const action=state.onConfirm;
  closeAppDialog();
  if(action)action(value);
}

function showAppConfirm(title,message,onConfirm,options={}){
  if(openAppDialog({title,message,onConfirm,confirmText:options.confirmText||'Confirmar',danger:!!options.danger}))return;
  if(confirm(message))onConfirm();
}

function showAppNotice(title,message,options={}){
  if(openAppDialog({title,message,onConfirm:null,confirmText:options.confirmText||'OK',danger:!!options.danger}))return;
  alert(message);
}

function showAppPrompt(title,message,inputValue,onConfirm,options={}){
  if(openAppDialog({title,message,onConfirm,input:true,inputValue,inputLabel:options.inputLabel||'Nome',inputPlaceholder:options.inputPlaceholder||'',confirmText:options.confirmText||'Salvar',danger:!!options.danger,requiredValue:options.requiredValue,errorText:options.errorText}))return;
  const value=prompt(message,inputValue);
  if(value!==null)onConfirm(value);
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

function renderLogReadOnlyNotice(accountFilter){
  const el=document.getElementById('logReadOnlyNotice');
  if(!el)return;
  const lock=getLogAccountEditLock({accountFilter,requireActivePage:false});
  if(!lock.locked){
    el.style.display='none';
    el.innerHTML='';
    return;
  }
  const target=lock.allAccounts?'todas as contas':lock.accountName;
  const actionText=lock.allAccounts
    ? 'Escolha uma conta específica como conta ativa para adicionar, editar, duplicar ou excluir operações.'
    : `Troque a conta ativa para ${escapeHtml(lock.accountName)} antes de adicionar, editar, duplicar ou excluir operações.`;
  el.style.display='block';
  el.innerHTML=`<div class="alert alert-info"><b>Modo visualização.</b> Você está consultando ${escapeHtml(target)}. ${actionText}</div>`;
}

function populateSelects(){
  const emoOpts='<option value="">—</option>'+config.emotions.map(s=>`<option>${s}</option>`).join('');
  ['t-emotion','t-emo-before','t-emo-after'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=emoOpts;});
  const strat=document.getElementById('t-strategy');
  if(strat)strat.innerHTML='<option value="">— Estratégia —</option>'+config.strategies.map(s=>`<option>${s}</option>`).join('');
  const mkt=document.getElementById('t-market');
  if(mkt)mkt.innerHTML='<option value="">— Mercado —</option>'+config.markets.map(s=>`<option>${s}</option>`).join('');
  const acctSel=document.getElementById('t-account');
  if(acctSel){acctSel.innerHTML=accounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');acctSel.value=activeAccountId;}
  const dl=document.getElementById('symbolsList');
  if(dl)dl.innerHTML=(config.symbols||[]).map(s=>`<option value="${s}">`).join('');
  onAccountChange();
  selectedErrors=[];renderErrorChips();
}

function toggleTradeError(label){
  const key=String(label||'').trim();
  if(!key)return;
  selectedErrors=selectedErrors.includes(key)
    ? selectedErrors.filter(e=>e!==key)
    : [...selectedErrors,key];
  renderErrorChips();
  autoDisc(true);
}

function renderErrorChips(){
  const el=document.getElementById('errorChips');
  if(!el)return;
  const labels=[...DEFAULT_TRADE_ERRORS,...selectedErrors]
    .map(e=>String(e||'').trim())
    .filter(Boolean)
    .filter((e,i,arr)=>arr.indexOf(e)===i);
  el.innerHTML=labels.map(label=>{
    const on=selectedErrors.includes(label);
    return `<button type="button" class="err-chip ${on?'on':''}" onclick="toggleTradeError(decodeURIComponent('${encodeURIComponent(label)}'))">${escapeHtml(label)}</button>`;
  }).join('');
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
  const missing=[];
  if(!trade.entry) missing.push('entry');
  if(!trade.stop)  missing.push('stop');
  if(!trade.strategy)    missing.push('strategy');
  if(!trade.emotion)     missing.push('emotion');
  if(!trade.followedPlan)missing.push('followedPlan');
  if((['WIN','LOSS','BE'].includes(status))&&trade.exit==null) missing.push('exit');
  return missing;
}

function prepareImportedTrades(list=[], {accountId=activeAccountId, seedLabel='import'}={}){
  const targetAccountId=accountId||activeAccountId;
  return (Array.isArray(list)?list:[]).map(trade=>{
    const status=trade.status||mtTradeStatus(trade.pnl);
    const baseMissing=Array.isArray(trade.missing_fields)?[...trade.missing_fields]:[];
    const computed=calcImportMissingFields({...trade,status},status);
    const missingFields=[...new Set([...baseMissing,...computed])];
    return{
      ...trade,
      id:trade.id||uid(),
      accountId:trade.accountId||targetAccountId||activeAccountId,
      market:trade.market||getMarket(trade.symbol),
      strategy:trade.strategy||'',
      placedTime:normalizeClockTime(trade.placedTime)||'',
      openTime:normalizeClockTime(trade.openTime)||'',
      exitTime:normalizeClockTime(trade.exitTime)||'',
      emoBefore:trade.emoBefore||'',
      emotion:trade.emotion||'',
      emoAfter:trade.emoAfter||'',
      followedPlan:trade.followedPlan||'',
      planDeviation:trade.planDeviation??'',
      errors:Array.isArray(trade.errors)?[...trade.errors]:[],
      discipline:trade.discipline!=null?trade.discipline:null,
      confidence:trade.confidence!=null?trade.confidence:null,
      hesitation:trade.hesitation!=null?!!trade.hesitation:false,
      mistake:trade.mistake||'',
      remarks:trade.remarks||'',
      images:normalizeDocImages(trade.images),
      resultType:trade.resultType||(['WIN','LOSS','BE'].includes(status)?status:''),
      status,
      incomplete:missingFields.length>0,
      missing_fields:missingFields,
      createdAt:trade.createdAt||new Date().toISOString(),
      updatedAt:trade.updatedAt||new Date().toISOString(),
    };
  });
}

function setPendingImport(list=[], {accountId=activeAccountId, source='import'}={}){
  const targetAccountId=accountId||(Array.isArray(list)?list.find(t=>t?.accountId)?.accountId:'')||activeAccountId;
  pendingImport=(Array.isArray(list)?list:[]).map(trade=>prepareImportedTrades([trade],{accountId:trade?.accountId||targetAccountId})[0]);
  pendingImportMeta={accountId:targetAccountId,source};
  return pendingImport;
}

function clearPendingImport(){
  pendingImport=[];
  pendingImportMeta=null;
}

function getPendingImportAccountId(){
  return pendingImportMeta?.accountId||(Array.isArray(pendingImport)?pendingImport.find(t=>t?.accountId)?.accountId:'')||activeAccountId;
}

function getTradeImportPositionKey(trade={}, fallbackAccountId='default'){
  if(!trade?.positionId)return '';
  const accountId=trade.accountId||fallbackAccountId||activeAccountId||'default';
  return `${accountId}::${trade.positionId}`;
}

function updateTradeDurationField(){
  const el=document.getElementById('t-duration');
  if(!el)return;
  const trade={
    date:document.getElementById('t-date')?.value||'',
    exitDate:document.getElementById('t-exitdate')?.value||document.getElementById('t-date')?.value||'',
    openTime:document.getElementById('t-opentime')?.value||'',
    exitTime:document.getElementById('t-exittime')?.value||'',
  };
  const minutes=getTradeDurationMinutes(trade);
  el.value=minutes!=null?formatDurationMinutes(minutes):'';
}

function autoDisc(force=false){
  const disc=document.getElementById('t-discipline');
  if(!disc)return;
  if(disc.dataset.manual==='1'&&!force)return;

  const get=id=>document.getElementById(id)?.value||'';
  const isChecked=id=>!!document.getElementById(id)?.checked;
  const riskyEmotions=['FOMO','Raiva','Culpa','Frustração','Medo','Euforia'];
  const severeErrors=['Revenge trade','Aumentou lote no prejuízo','Não aceitou stop','Risco maior que o plano','Entrou sem gatilho','Overtrade','FOMO'];
  let score=96;
  const reasons=[];

  const followed=get('t-followedplan');
  if(followed==='nao'){score-=30;reasons.push('plano não seguido');}
  else if(followed==='parcial'){score-=15;reasons.push('plano parcial');}
  else if(followed==='sim')score+=2;

  const errors=selectedErrors.map(e=>String(e||'').trim()).filter(Boolean);
  if(errors.length){
    const errorPenalty=errors.reduce((sum,e)=>sum+(severeErrors.includes(e)?12:8),0);
    score-=Math.min(48,errorPenalty);
    reasons.push(`${errors.length} erro${errors.length>1?'s':''} marcado${errors.length>1?'s':''}`);
  }

  const mistake=get('t-mistake').trim();
  if(mistake&&!errors.length){score-=6;reasons.push('erro descrito');}

  const deviation=get('t-plan-deviation').trim();
  if(deviation){
    const normalizedDeviation=normalizeLooseText(deviation);
    let deviationPenalty=followed==='sim'?4:followed==='parcial'?10:followed==='nao'?14:8;
    if(['horario','acelerou','gatilho','agressividade','revenge','fomo','stop','pressa','lote'].some(token=>normalizedDeviation.includes(token))){
      deviationPenalty+=4;
    }
    score-=deviationPenalty;
    reasons.push('desvio descrito');
  }

  const emotions=[get('t-emo-before'),get('t-emotion'),get('t-emo-after')].filter(Boolean);
  const riskyCount=[...new Set(emotions.filter(e=>riskyEmotions.includes(e)))].length;
  if(riskyCount){score-=Math.min(18,riskyCount*6);reasons.push('emoção de risco');}

  const confidence=parseInt(get('t-confidence'),10);
  if(Number.isFinite(confidence)){
    if(confidence<40){score-=12;reasons.push('confiança baixa');}
    else if(confidence<60){score-=6;reasons.push('confiança moderada');}
    else if(confidence>=80)score+=2;
    if(confidence>=85&&(errors.length||riskyCount||followed==='nao')){score-=6;reasons.push('excesso de confiança');}
    if(confidence<40&&(errors.length||riskyCount||followed==='parcial'||followed==='nao')){score-=6;reasons.push('executou sem clareza');}
  }

  if(isChecked('t-hesitation')){score-=10;reasons.push('hesitação');}
  if(!followed&&(errors.length||mistake||deviation||isChecked('t-hesitation'))){score-=8;reasons.push('plano indefinido');}

  const result=get('t-result-type');
  if(result==='BE')score-=2;

  const finalScore=clampDisciplineScore(score);
  disc.value=finalScore;
  disc.dataset.manual='';
  const label=document.getElementById('t-disc-val');
  if(label)label.textContent=finalScore+'%';
  const explain=document.getElementById('discExplain');
  if(explain)explain.textContent=reasons.length?`Auto: ${reasons.join(' · ')}.`:'Auto: execução limpa.';
}

function togglePlanDeviation(){
  const pd=document.getElementById('t-plan-deviation');
  if(!pd)return;
  pd.disabled=false;
  pd.style.opacity='1';
  const followed=document.getElementById('t-followedplan')?.value||'';
  pd.placeholder=followed==='sim'
    ? 'Opcional: algum detalhe mesmo seguindo o plano?'
    : 'O que mudou na execução, entrada, saída ou gestão?';
  autoDisc();
}

function resetForm(){
  ['t-symbol','t-date','t-entry','t-stop','t-tp','t-exit',
   't-riskpct','t-riskusd','t-r','t-pnl',
   't-qty','t-mult','t-riskabs','t-pnl-abs','t-r-abs',
   't-fees','t-strategy','t-market','t-emotion','t-emo-before','t-emo-after',
   't-followedplan','t-plan-deviation','t-mistake','t-remarks','t-exitdate','t-result-type',
   't-placedtime','t-opentime','t-exittime','t-duration'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const f=document.getElementById('t-fees');if(f)f.value='0';
  const h=document.getElementById('t-hesitation');if(h)h.checked=false;
  const conf=document.getElementById('t-confidence');if(conf)conf.value=60;
  const confV=document.getElementById('t-conf-val');if(confV)confV.textContent='60%';
  const disc=document.getElementById('t-discipline');if(disc){disc.value=70;disc.dataset.manual='';}
  const discV=document.getElementById('t-disc-val');if(discV)discV.textContent='70%';
  const de=document.getElementById('discExplain');if(de)de.textContent='';
  const pd=document.getElementById('t-plan-deviation');
  if(pd){pd.disabled=false;pd.style.opacity='1';pd.placeholder='O que mudou na execução, entrada, saída ou gestão?';}
  const a=getActiveAccount();
  const rp=document.getElementById('t-riskpct');if(rp&&a.risk)rp.value=a.risk;
  const mp=document.getElementById('t-mult');if(mp&&a.mult)mp.value=a.mult;
  const pEl=document.getElementById('modePercentFields');
  const aEl=document.getElementById('modeAbsFields');
  if(pEl)pEl.style.display=isFuturesAccount(a)?'none':'';
  if(aEl)aEl.style.display=isFuturesAccount(a)?'':'none';
  selectedErrors=[];
  tradeImages=[];
  const imgInput=document.getElementById('t-images');if(imgInput)imgInput.value='';
  renderErrorChips();
  renderImagePreviews();
  updateTradeDurationField();
}

function fillForm(t){
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v;};
  set('t-symbol',t.symbol);set('t-date',t.date);set('t-entry',t.entry);
  set('t-stop',t.stop);set('t-tp',t.tp);set('t-exit',t.exit);
  set('t-fees',t.fees||0);set('t-strategy',t.strategy);set('t-market',t.market);set('t-direction',t.direction);
  set('t-emotion',t.emotion);set('t-emo-before',t.emoBefore);set('t-emo-after',t.emoAfter);
  set('t-followedplan',t.followedPlan);
  set('t-result-type',t.resultType||'');set('t-mistake',t.mistake);set('t-remarks',t.remarks);set('t-exitdate',t.exitDate);
  set('t-placedtime',normalizeClockTime(t.placedTime));set('t-opentime',normalizeClockTime(t.openTime));set('t-exittime',normalizeClockTime(t.exitTime));
  const h=document.getElementById('t-hesitation');if(h)h.checked=t.hesitation||false;
  const confVal=t.confidence!=null?(t.confidence<=5?t.confidence*20:t.confidence):60;
  const discVal=t.discipline!=null?(t.discipline<=5?t.discipline*20:t.discipline):70;
  const conf=document.getElementById('t-confidence');if(conf)conf.value=confVal;
  const confV=document.getElementById('t-conf-val');if(confV)confV.textContent=confVal+'%';
  const disc=document.getElementById('t-discipline');if(disc){disc.value=discVal;disc.dataset.manual='1';}
  const discV=document.getElementById('t-disc-val');if(discV)discV.textContent=discVal+'%';
  const pd=document.getElementById('t-plan-deviation');
  if(pd){pd.value=t.planDeviation||'';pd.disabled=false;pd.style.opacity='1';}
  set('t-riskpct',t.riskPct);set('t-riskusd',t.riskUsd);set('t-r',t.r);set('t-pnl',t.pnl);
  set('t-qty',t.qty);set('t-mult',t.mult);set('t-riskabs',t.riskUsd);set('t-r-abs',t.r);set('t-pnl-abs',t.pnl);
  const acctSel=document.getElementById('t-account');
  if(acctSel)acctSel.value=t.accountId||activeAccountId;
  selectedErrors=Array.isArray(t.errors)?[...t.errors]:[];renderErrorChips();
  const a=accounts.find(x=>x.id===(t.accountId||activeAccountId))||getActiveAccount();
  const pEl=document.getElementById('modePercentFields');const aEl=document.getElementById('modeAbsFields');
  if(pEl)pEl.style.display=isFuturesAccount(a)?'none':'';
  if(aEl)aEl.style.display=isFuturesAccount(a)?'':'none';
  tradeImages=normalizeDocImages(t.images);
  const imgInput=document.getElementById('t-images');if(imgInput)imgInput.value='';
  renderImagePreviews();
  updateTradeDurationField();
}

function calcRR(){
  const g=id=>{const el=document.getElementById(id);return el?parseFloat(el.value)||0:0;};
  const gs=id=>{const el=document.getElementById(id);return el?el.value:'';};
  const entry=g('t-entry'),stop_=g('t-stop'),exit_=g('t-exit'),tp_=g('t-tp');
  const dir=gs('t-direction')||'Long';
  const riskPts=(entry&&stop_)?Math.abs(entry-stop_):0;

  if(config.mode==='percent'){
    const riskPct=g('t-riskpct');
    const bal=getAccountWorkingBalance(getTradeFormAccount());
    const riskUsd=bal*(riskPct/100);
    const elRU=document.getElementById('t-riskusd');
    if(elRU&&riskPct>0)elRU.value=riskUsd.toFixed(2);

    if(entry&&stop_&&riskPts>0){
      const exitP=exit_||tp_;
      if(exitP){
        const pnlPts=dir==='Long'?(exitP-entry):(entry-exitP);
        const r=parseFloat((pnlPts/riskPts).toFixed(3));
        const elR=document.getElementById('t-r');if(elR)elR.value=r;
        const actualRisk=riskUsd||g('t-riskusd');
        const pnlUsd=r*actualRisk;
        const elP=document.getElementById('t-pnl');
        if(elP)elP.value=pnlUsd.toFixed(2);
      }
    }
  } else {
    const qty=g('t-qty'),mult=g('t-mult')||config.mult||1;
    const elRA=document.getElementById('t-riskabs');
    if(entry&&stop_&&qty&&riskPts>0){
      const riskUsd=riskPts*qty*mult;
      if(elRA)elRA.value=riskUsd.toFixed(2);
      const exitP=exit_||tp_;
      if(exitP){
        const pnlPts=dir==='Long'?(exitP-entry):(entry-exitP);
        const r=parseFloat((pnlPts/riskPts).toFixed(3));
        const pnlUsd=pnlPts*qty*mult;
        const elR=document.getElementById('t-r-abs');if(elR)elR.value=r;
        const elP=document.getElementById('t-pnl-abs');if(elP)elP.value=pnlUsd.toFixed(2);
      }
    }
  }
}

function saveTrade(){
  const get=id=>document.getElementById(id)?.value||'';
  const sym=get('t-symbol').trim();
  const date=get('t-date');
  if(!sym||!date){showAppNotice('Campo obrigatório','Símbolo e data são obrigatórios.');return;}

  const entry=parseFloat(get('t-entry'))||null;
  const stop=parseFloat(get('t-stop'))||null;
  const tp=parseFloat(get('t-tp'))||null;
  const exit=parseFloat(get('t-exit'))||null;
  const dir=get('t-direction');
  const fees=parseFloat(get('t-fees'))||0;
  const placedTime=normalizeClockTime(get('t-placedtime'));
  const openTime=normalizeClockTime(get('t-opentime'));
  const exitTime=normalizeClockTime(get('t-exittime'));

  const acctId=document.getElementById('t-account')?.value||activeAccountId;
  const acct=accounts.find(a=>a.id===acctId)||getActiveAccount();
  const acctBalance=getAccountWorkingBalance(acct);
  const isFut=isFuturesAccount(acct);

  let pnl,r,riskUsd,riskPct,qty,mult;
  if(!isFut){
    pnl=parseFloat(get('t-pnl'))||null;
    r=parseFloat(get('t-r'))||null;
    riskPct=parseFloat(get('t-riskpct'))||null;
    riskUsd=parseFloat(get('t-riskusd'))||null;
  } else {
    pnl=parseFloat(get('t-pnl-abs'))||null;
    r=parseFloat(get('t-r-abs'))||null;
    riskUsd=parseFloat(get('t-riskabs'))||null;
    qty=parseFloat(get('t-qty'))||null;
    mult=parseFloat(get('t-mult'))||acct.mult||null;
  }

  if(!isFut&&riskPct!=null&&(!Number.isFinite(riskUsd)||riskUsd<=0))riskUsd=parseFloat((acctBalance*(riskPct/100)).toFixed(2));

  if(entry&&stop&&exit&&!r){
    const riskPts=Math.abs(entry-stop);
    if(riskPts>0){const pnlPts=dir==='Long'?exit-entry:entry-exit; r=parseFloat((pnlPts/riskPts).toFixed(3));}
  }
  if(r!=null&&riskUsd&&!pnl) pnl=parseFloat((r*riskUsd).toFixed(2));

  const pnlPct=pnl!=null&&acctBalance?pnl/acctBalance:null;
  const missing=[];
  if(!entry)missing.push('entry');
  if(!stop)missing.push('stop');
  if(!get('t-strategy'))missing.push('strategy');
  if(!get('t-emotion'))missing.push('emotion');
  if(!get('t-followedplan'))missing.push('followedPlan');

  const resultType=get('t-result-type');
  let status='OPEN';
  if(resultType==='BE') status='BE';
  else if(resultType==='WIN') status='WIN';
  else if(resultType==='LOSS') status='LOSS';
  else if(exit){
    if(pnl!=null){
      const bePct=Math.abs(pnl)/(riskUsd||1)*100;
      status=pnl>0?'WIN':(bePct<(config.beBreakeven||10))?'BE':'LOSS';
    } else status='OPEN';
  }

  const confVal=parseInt(document.getElementById('t-confidence')?.value)||60;
  const discVal=parseInt(document.getElementById('t-discipline')?.value)||70;

  const trade={
    id: editingId||uid(),
    accountId: acctId,
    symbol:sym, date, market:get('t-market')||getMarket(sym), direction:dir,
    entry, stop, tp, exit,
    qty, mult, riskPct, riskUsd,
    pnl, pnlPct, r, fees,
    strategy:get('t-strategy'), exitDate:get('t-exitdate'), placedTime, openTime, exitTime,
    emoBefore:get('t-emo-before'),
    emotion:get('t-emotion'),
    emoAfter:get('t-emo-after'),
    followedPlan:get('t-followedplan'),
    planDeviation:get('t-plan-deviation'),
    errors:[...selectedErrors],
    resultType,
    discipline:discVal,
    confidence:confVal,
    mistake:get('t-mistake'), remarks:get('t-remarks'),
    images:normalizeDocImages(tradeImages),
    hesitation:document.getElementById('t-hesitation')?.checked||false,
    mode:isFut?'absolute':'percent',
    status,
    incomplete: missing.length>0,
    missing_fields: missing,
    createdAt: editingId?trades.find(t=>t.id===editingId)?.createdAt:new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if(entry&&stop&&exit){
    const riskPts=Math.abs(entry-stop);
    const pnlPts=trade.direction==='Long'?exit-entry:entry-exit;
    trade.r=riskPts>0?parseFloat((pnlPts/riskPts).toFixed(3)):null;
    trade.status=pnlPts>0?'WIN':'LOSS';
  }

  const hadBulkIncompleteFlow=isBulkIncompleteFlowTrade(editingId);
  if(editingId){trades=trades.map(t=>t.id===editingId?trade:t);} else{trades.unshift(trade);}
  save();
  const nextBulkIncompleteId=getNextBulkIncompleteTradeAfterSave(trade.id);
  refreshAll();
  if(nextBulkIncompleteId){
    openModal('tradeModal',nextBulkIncompleteId);
    return;
  }
  closeModal('tradeModal');
  if(hadBulkIncompleteFlow&&trade.incomplete===false&&selectedTrades.size){
    const selectedIncomplete=getSelectedIncompleteTrades().length;
    if(selectedIncomplete===0&&trade.id)showAppNotice('Incompletos revisados','Trades incompletos selecionados foram revisados.');
  }
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
  const closed=data.filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const wins=closed.filter(t=>t.status==='WIN');
  const losses=closed.filter(t=>t.status==='LOSS');
  const bes=closed.filter(t=>t.status==='BE');
  const totalPnl=closed.reduce((a,t)=>a+(t.pnl||0),0);
  const wr=closed.length?wins.length/closed.length:0;
  const avgWin=wins.length?wins.reduce((a,t)=>a+(t.r||0),0)/wins.length:0;
  const avgLoss=losses.length?Math.abs(losses.reduce((a,t)=>a+(t.r||0),0)/losses.length):0;
  const exp=closed.length?(wr*avgWin-(1-wr)*avgLoss):0;
  const grossW=wins.reduce((a,t)=>a+(t.pnl||0),0);
  const grossL=Math.abs(losses.reduce((a,t)=>a+(t.pnl||0),0));
  const pf=grossL>0?grossW/grossL:wins.length?Infinity:0;

  let peak=startBal,trough=startBal,maxDD=0,maxDDusd=0,running=startBal;
  [...closed].reverse().forEach(t=>{
    running+=(t.pnl||0);
    if(running>peak){peak=running;trough=running;}
    else if(running<trough){trough=running;}
    const dd=peak>0?(peak-trough)/peak:0;
    const ddusd=peak-trough;
    if(dd>maxDD){maxDD=dd;maxDDusd=ddusd;}
  });

  const dailyPnl={};
  closed.forEach(t=>{const k=t.date||'';dailyPnl[k]=(dailyPnl[k]||0)+(t.pnl||0);});
  const daily=Object.values(dailyPnl);
  const meanD=daily.length?daily.reduce((a,v)=>a+v,0)/daily.length:0;
  const stdD=daily.length>1?Math.sqrt(daily.reduce((a,v)=>a+(v-meanD)**2,0)/(daily.length-1)):0;
  const sharpe=stdD>0?(meanD/stdD)*Math.sqrt(252):0;
  const negDaily=daily.filter(v=>v<0);
  const stdDown=negDaily.length>1?Math.sqrt(negDaily.reduce((a,v)=>a+v**2,0)/negDaily.length):0;
  const sortino=stdDown>0?(meanD/stdDown)*Math.sqrt(252):0;
  const annualReturn=daily.length>0?(meanD*252):0;
  const calmar=maxDD>0?(annualReturn/startBal)/maxDD:0;
  const recovery=maxDDusd>0?totalPnl/maxDDusd:(totalPnl>0?Infinity:0);

  let curStreak=0,maxWS=0,maxLS=0,lastDir='',tempLs=0,maxLoseStreakPnl=0;
  [...closed].reverse().forEach(t=>{
    if(t.status===lastDir){curStreak++;}else{curStreak=1;lastDir=t.status;}
    if(t.status==='WIN')maxWS=Math.max(maxWS,curStreak);
    else{maxLS=Math.max(maxLS,curStreak);}
    if(t.status==='LOSS'){tempLs+=(t.pnl||0);} else{if(tempLs<maxLoseStreakPnl)maxLoseStreakPnl=tempLs;tempLs=0;}
  });

  return {closed,wins,losses,bes,totalPnl,wr,avgWin,avgLoss,exp,pf,maxDD,maxDDusd,
    sharpe,sortino,calmar,recovery,maxWS,maxLS,maxLoseStreakPnl,grossW,grossL,startBal};
}

function filterByPeriod(arr, period){
  const now=new Date(),y=now.getFullYear(),mo=now.getMonth();
  if(period==='today'){const today=now.toISOString().slice(0,10);return arr.filter(t=>t.date===today);}
  if(period==='month') return arr.filter(t=>{if(!t.date)return false;const d=new Date(t.date+'T12:00');return d.getFullYear()===y&&d.getMonth()===mo;});
  if(period==='year')  return arr.filter(t=>{if(!t.date)return false;return new Date(t.date+'T12:00').getFullYear()===y;});
  if(period==='week'){const ws=new Date(now);ws.setDate(now.getDate()-now.getDay());return arr.filter(t=>{if(!t.date)return false;return new Date(t.date+'T12:00')>=ws;});}
  return arr;
}

function toggleEqMode(){
  eqMode=eqMode==='value'?'pct':'value';
  const btn=document.getElementById('eqModeBtn');
  if(btn)btn.textContent=eqMode==='value'?'% retorno':'$ valor';
  renderDashboard();
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
  return getAccountCashflows(acct).reduce((sum,flow)=>{
    const amount=Math.abs(parseFloat(flow.amount)||0);
    if(flow.type==='withdrawal')sum.withdrawals+=amount;
    else sum.deposits+=amount;
    sum.net=sum.deposits-sum.withdrawals;
    return sum;
  },{deposits:0,withdrawals:0,net:0});
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

function calcAccountRiskState(acct, acctTrades, period){
  const ordered=getOrderedTrades(acctTrades);
  const anchorStr=getAnchorTradeDate(acctTrades);
  const anchorDate=new Date(anchorStr+'T12:00:00');

  const todayStr=new Date().toISOString().split('T')[0];
  const todayDate=new Date(todayStr+'T12:00:00');
  const weekStart=new Date(todayDate);
  weekStart.setDate(todayDate.getDate()-todayDate.getDay());
  weekStart.setHours(0,0,0,0);
  const weekEnd=new Date(weekStart);
  weekEnd.setDate(weekStart.getDate()+6);
  weekEnd.setHours(23,59,59,999);

  const sumPnl=list=>list.reduce((sum,t)=>sum+(t.pnl||0),0);

  // Período selecionado no dashboard afeta quais trades entram nas barras
  // 'today' → só hoje | 'week' → semana dom-sáb | 'month' → mês corrente
  // 'year'/'all'/undefined → todos (DD total desde o início)
  let scopeTrades=acctTrades;
  if(period==='today') scopeTrades=acctTrades.filter(t=>t.date===todayStr);
  else if(period==='week') scopeTrades=acctTrades.filter(t=>{
    if(!t.date)return false;
    const d=new Date(t.date+'T12:00:00');
    return d>=weekStart&&d<=weekEnd;
  });
  else if(period==='month') scopeTrades=acctTrades.filter(t=>{
    if(!t.date)return false;
    const d=new Date(t.date+'T12:00:00');
    return d.getFullYear()===todayDate.getFullYear()&&d.getMonth()===todayDate.getMonth();
  });

  // Filtros fixos para referência interna (sinais, topbar, etc.)
  const dayTrades=acctTrades.filter(t=>t.date===todayStr);
  const weekTrades=acctTrades.filter(t=>{
    if(!t.date)return false;
    const d=new Date(t.date+'T12:00:00');
    return d>=weekStart && d<=weekEnd;
  });
  const monthTrades=acctTrades.filter(t=>{
    if(!t.date)return false;
    const d=new Date(t.date+'T12:00:00');
    return d.getFullYear()===todayDate.getFullYear() && d.getMonth()===todayDate.getMonth();
  });

  const dayPnl=sumPnl(dayTrades);
  const weekPnl=sumPnl(weekTrades);
  const monthPnl=sumPnl(monthTrades);

  // PnL do escopo selecionado — usado nas barras de progresso das barras de risco
  const scopePnl=sumPnl(scopeTrades);
  // Perda no escopo selecionado (só valores negativos)
  const scopeLoss=Math.max(-scopePnl,0);

  const cashflow=calcAccountCashflow(acct);
  const initialBalance=acct.balance||0;
  const capitalBase=initialBalance+cashflow.net;
  const goalBase=initialBalance+cashflow.deposits;
  let peak=capitalBase;
  let current=capitalBase;
  let currentDdPct=0;
  let currentDdUsd=0;
  ordered.forEach(t=>{
    current+=(t.pnl||0);
    if(current>peak)peak=current;
    currentDdPct=peak>0?Math.max(0,(peak-current)/peak):0;
    currentDdUsd=Math.max(0,peak-current);
  });

  const pctMoney=pct=>parseFloat((capitalBase*((pct||0)/100)).toFixed(2));
  const goalMoney=pct=>parseFloat((goalBase*((pct||0)/100)).toFixed(2));
  const dayLimit=pctMoney(acct.ddDaily||2);
  const weekLimit=pctMoney(acct.ddWeekly||5);
  const monthLimit=pctMoney(acct.ddMonthly||acct.ddTotal||10);
  const riskPerTradeUsd=pctMoney(acct.risk||0);
  const totalPnl=current-capitalBase;

  // Meta cíclica: avança sobre o saldo atual a cada vez que bate o percentual configurado
  // Usa goalBase (capital + depósitos) como patamar inicial do ciclo 0
  const goalPct=(acct.goalPct||10)/100;
  // Quantos ciclos completos foram batidos: baseado em saldo atual vs goalBase
  const cicloAtual=goalPct>0&&goalBase>0
    ? Math.max(0,Math.floor(Math.log(current/goalBase)/Math.log(1+goalPct)))
    : 0;
  // Saldo no início do ciclo atual (= goalBase * (1+goalPct)^cicloAtual)
  const cicloBase=parseFloat((goalBase*Math.pow(1+goalPct,cicloAtual)).toFixed(2));
  // Alvo do ciclo atual
  const cicloAlvo=parseFloat((goalBase*Math.pow(1+goalPct,cicloAtual+1)).toFixed(2));
  // Tamanho do ciclo em $
  const goalTarget=parseFloat((cicloAlvo-cicloBase).toFixed(2));
  // P/L dentro do ciclo atual (desde o patamar do ciclo)
  const pnlNoCiclo=parseFloat((current-cicloBase).toFixed(2));
  const goalProgress=goalTarget>0?clamp(pnlNoCiclo/goalTarget,0,1):0;

  // DD total: calculado sobre o saldo do início do ciclo atual — protege o lucro já conquistado
  const ddBase=cicloBase;
  const totalLimit=parseFloat((ddBase*((acct.ddTotal||10)/100)).toFixed(2));

  const dayLoss=Math.max(-dayPnl,0);
  // Para semana e mês: consumo é a PERDA acumulada no período (PnL negativo)
  const weekLoss=Math.max(-weekPnl,0);
  const monthLoss=Math.max(-monthPnl,0);
  const pctExcess=amount=>capitalBase>0?parseFloat((amount/capitalBase*100).toFixed(2)):0;
  const dayExcessUsd=parseFloat(Math.max(dayLoss-dayLimit,0).toFixed(2));
  const weekExcessUsd=parseFloat(Math.max(weekLoss-weekLimit,0).toFixed(2));
  const monthExcessUsd=parseFloat(Math.max(monthLoss-monthLimit,0).toFixed(2));
  const totalExcessUsd=parseFloat(Math.max(currentDdUsd-totalLimit,0).toFixed(2));

  // Limite e consumo para o escopo selecionado (barra principal de risco no período)
  const scopeLimit=period==='today'?dayLimit:period==='week'?weekLimit:period==='month'?monthLimit:totalLimit;
  const scopeLimitPct=period==='today'?(acct.ddDaily||2):period==='week'?(acct.ddWeekly||5):period==='month'?(acct.ddMonthly||acct.ddTotal||10):(acct.ddTotal||10);
  const scopeExcessUsd=parseFloat(Math.max(scopeLoss-scopeLimit,0).toFixed(2));
  const scopeUsageRaw=scopeLimit>0?scopeLoss/scopeLimit:0;
  const scopeUsage=clamp(scopeUsageRaw,0,1);

  const todayLabel=todayDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
  const anchorLabelFmt=anchorDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
  const weekStartLabel=weekStart.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  const weekEndLabel=weekEnd.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  const activePeriod=period||'all';
  return {
    anchorStr,
    todayStr,
    anchorLabel:anchorStr===todayStr?`Hoje (${todayLabel})`:anchorLabelFmt,
    todayLabel,
    weekStartLabel,
    weekEndLabel,
    activePeriod,
    scopePnl,
    scopeLoss,
    scopeLimit,
    scopeLimitPct,
    scopeExcessUsd,
    scopeUsageRaw,
    scopeUsage,
    initialBalance,
    cashflowDeposits:cashflow.deposits,
    cashflowWithdrawals:cashflow.withdrawals,
    cashflowNet:cashflow.net,
    capitalBase,
    goalBase,
    currentBalance:current,
    totalPnl,
    dayPnl,
    weekPnl,
    monthPnl,
    dayLimit,
    weekLimit,
    monthLimit,
    totalLimit,
    riskPerTradeUsd,
    dayLoss,
    weekLoss,
    monthLoss,
    dayUsageRaw:dayLimit>0?dayLoss/dayLimit:0,
    weekUsageRaw:weekLimit>0?weekLoss/weekLimit:0,
    monthUsageRaw:monthLimit>0?monthLoss/monthLimit:0,
    totalUsageRaw:totalLimit>0?currentDdUsd/totalLimit:0,
    dayUsage:dayLimit>0?clamp(dayLoss/dayLimit,0,1):0,
    weekUsage:weekLimit>0?clamp(weekLoss/weekLimit,0,1):0,
    monthUsage:monthLimit>0?clamp(monthLoss/monthLimit,0,1):0,
    totalUsage:totalLimit>0?clamp(currentDdUsd/totalLimit,0,1):0,
    dayExcessUsd,
    weekExcessUsd,
    monthExcessUsd,
    totalExcessUsd,
    dayExcessPct:pctExcess(dayExcessUsd),
    weekExcessPct:pctExcess(weekExcessUsd),
    monthExcessPct:pctExcess(monthExcessUsd),
    totalExcessPct:pctExcess(totalExcessUsd),
    goalProgress,
    goalTarget,
    pnlNoCiclo,
    cicloAtual,
    cicloBase,
    cicloAlvo,
    ddBase,
    currentDdPct,
    currentDdUsd,
    peakBalance:peak,
    riskLabel:isFuturesAccount(acct)?fR(acct.risk||0):`${f2(acct.risk||0)}%`,
    riskSub:isFuturesAccount(acct)
      ? `Conta em modo futuro · multiplicador padrao ${f2(acct.mult||1)}`
      : `Saldo inicial ${fR(initialBalance)} · aportes líquidos ${fR(cashflow.net)} · meta ${f2(acct.goalPct||10)}%`,
  };
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

function renderTopbarValue(id){
  const item=topbarValueCache[id];
  const el=document.getElementById(id);
  if(!item||!el)return;
  const value=topbarDensity==='compact'?item.compact:item.full;
  el.textContent=value;
  el.title=item.full;
  setTopbarClass(el,item.baseClass,item.cls);
}

function applyTopbarDensity(){
  Object.keys(topbarValueCache).forEach(renderTopbarValue);
}

function fitTopbarDensity(){
  applyTopbarDensity();
}

function syncAccountBalanceChrome(acct=getActiveAccount(), acctTrades=getAccountTrades(acct?.id)){
  if(!acct)return null;
  const risk=calcAccountRiskState(acct,acctTrades);
  const sideBalance=document.getElementById('sideBalance');
  if(sideBalance)sideBalance.textContent=fR(risk.currentBalance); // legado — mantido para compatibilidade
  const sideChange=document.getElementById('sideBalanceChange');
  if(sideChange){
    sideChange.textContent=formatAccountBalanceChange(risk);
    const isNegative=risk.totalPnl<0 || (risk.totalPnl===0 && (risk.cashflowNet||0)<0);
    sideChange.style.color=isNegative?'var(--red)':'var(--green)';
  }
  const sideCount=document.getElementById('sideTradeCount');
  if(sideCount)sideCount.textContent=acctTrades.length;
  return risk;
}

function getTradeWeekKey(dateStr){
  if(!dateStr)return'';
  const d=new Date(dateStr+'T12:00:00');
  if(Number.isNaN(d.getTime()))return'';
  const weekStart=new Date(d);
  weekStart.setDate(d.getDate()-d.getDay());
  return weekStart.toISOString().slice(0,10);
}

function buildStopFeeAnalysis(acct, acctTrades=[]){
  const closed=acctTrades.filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const risk=calcAccountRiskState(acct,acctTrades);
  const dayLimit=Number(risk.dayLimit)||0;
  const weekLimit=Number(risk.weekLimit)||0;
  const monthLimit=Number(risk.monthLimit)||0;
  const groupPnl=(keyFn)=>{
    const map={};
    closed.forEach(t=>{
      const key=keyFn(t);
      if(!key)return;
      map[key]=(map[key]||0)+(Number(t.pnl)||0);
    });
    return map;
  };
  const dayPnl=groupPnl(t=>t.date||'');
  const weekPnl=groupPnl(t=>getTradeWeekKey(t.date));
  const monthPnl=groupPnl(t=>t.date?String(t.date).slice(0,7):'');
  const countOver=(map,limit)=>limit>0?Object.values(map).filter(v=>Math.max(-v,0)>limit).length:0;
  const pct=(count,total)=>total?parseFloat((count/total*100).toFixed(1)):0;
  const totalFees=closed.reduce((sum,t)=>sum+Math.abs(Number(t.fees)||0),0);
  const netPnl=closed.reduce((sum,t)=>sum+(Number(t.pnl)||0),0);
  const pnlBeforeFees=netPnl+totalFees;
  const feePerTrade=closed.length?totalFees/closed.length:0;
  const expectancyBeforeFees=closed.length?pnlBeforeFees/closed.length:0;
  const expectancyAfterFees=closed.length?netPnl/closed.length:0;
  const edgeRemovedPct=expectancyBeforeFees>0?clamp(((expectancyBeforeFees-expectancyAfterFees)/expectancyBeforeFees)*100,0,999):0;
  const feeDragPct=Math.abs(pnlBeforeFees)>0?Math.abs(totalFees/pnlBeforeFees)*100:0;
  const feesInR=risk.riskPerTradeUsd>0?totalFees/risk.riskPerTradeUsd:0;
  const days=Object.keys(dayPnl).length;
  const weeks=Object.keys(weekPnl).length;
  const months=Object.keys(monthPnl).length;
  const daysOverDailyStop=countOver(dayPnl,dayLimit);
  const weeksOverWeeklyStop=countOver(weekPnl,weekLimit);
  const monthsOverMonthlyStop=countOver(monthPnl,monthLimit);
  return {
    closedTrades:closed.length,
    dayLimit,
    weekLimit,
    monthLimit,
    days,
    weeks,
    months,
    daysOverDailyStop,
    weeksOverWeeklyStop,
    monthsOverMonthlyStop,
    daysOverDailyStopPct:pct(daysOverDailyStop,days),
    weeksOverWeeklyStopPct:pct(weeksOverWeeklyStop,weeks),
    monthsOverMonthlyStopPct:pct(monthsOverMonthlyStop,months),
    totalFees:parseFloat(totalFees.toFixed(2)),
    netPnl:parseFloat(netPnl.toFixed(2)),
    pnlBeforeFees:parseFloat(pnlBeforeFees.toFixed(2)),
    feePerTrade:parseFloat(feePerTrade.toFixed(2)),
    expectancyBeforeFees:parseFloat(expectancyBeforeFees.toFixed(2)),
    expectancyAfterFees:parseFloat(expectancyAfterFees.toFixed(2)),
    edgeRemovedPct:parseFloat(edgeRemovedPct.toFixed(1)),
    feeDragPct:parseFloat(feeDragPct.toFixed(1)),
    feesInR:parseFloat(feesInR.toFixed(2)),
  };
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

function renderStrategyCompareCards(rows){
  const wrap=document.getElementById('stStratCompare');
  if(!wrap)return;
  const selectedA=document.getElementById('stStratA')?.value||'';
  const selectedB=document.getElementById('stStratB')?.value||'';
  const byName=new Map(rows.map(row=>[row.name,row]));
  const rowA=byName.get(selectedA);
  const rowB=byName.get(selectedB);
  const cardsEl=document.getElementById('stCmpCards');
  const insightsEl=document.getElementById('stCmpInsights');
  const summaryEl=document.getElementById('stCmpSummaryBody');
  const metricExplainEl=document.getElementById('stCmpMetricExplain');
  const outcomeExplainEl=document.getElementById('stCmpOutcomeExplain');
  const timingExplainEl=document.getElementById('stCmpTimingExplain');
  const emptyEl=document.getElementById('stCmpEmpty');
  const fullEl=document.getElementById('stCmpFull');
  const defs=getStrategyCompareMetricDefs();
  wrap.style.display='block';
  const renderEmptyState=(message,subMessage='')=>{
    if(fullEl)fullEl.style.display='none';
    if(emptyEl){
      emptyEl.style.display='grid';
      emptyEl.innerHTML=`<div>
        <div class="table-title">Escolha Estratégia A e Estratégia B</div>
        <div class="strategy-compare-note">${escapeHtml(message)}</div>
      </div>
      <div class="strategy-compare-empty-grid">
        <div class="strategy-compare-empty-card">
          <span>Estratégia A</span>
          <strong>${escapeHtml(selectedA||'Aguardando seleção')}</strong>
        </div>
        <div class="strategy-compare-empty-card">
          <span>Estratégia B</span>
          <strong>${escapeHtml(selectedB||'Aguardando seleção')}</strong>
        </div>
        <div class="strategy-compare-empty-card">
          <span>Próximo passo</span>
          <strong>${escapeHtml(subMessage||'Selecione as duas estratégias para liberar curva, gráficos e resumo final.')}</strong>
        </div>
      </div>`;
    }
    if(cardsEl)cardsEl.innerHTML='';
    if(summaryEl)summaryEl.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted)">Selecione Estratégia A e Estratégia B para ver o comparativo completo.</td></tr>';
    if(insightsEl)insightsEl.textContent='Comparação completa liberada quando as duas estratégias estiverem escolhidas.';
    if(metricExplainEl)metricExplainEl.textContent='';
    if(outcomeExplainEl)outcomeExplainEl.textContent='';
    if(timingExplainEl)timingExplainEl.textContent='';
    renderAnalysisSummary('stCmpMetricSummary',[]);
    renderAnalysisSummary('stCmpOutcomeSummary',[]);
    renderAnalysisSummary('stCmpTimingSummary',[]);
  };
  const renderDetailCard=(targetId,label,row,leaderCount=0)=>{
    const el=document.getElementById(targetId);
    if(!el)return;
    if(!row){
      el.innerHTML=`<div class="chart-title">${label}</div><div style="font-size:12px;color:var(--muted);padding:8px 0">Selecione uma estratégia para comparar.</div>`;
      return;
    }
    const timing=getTradeTimingStats(row.trades).overall;
    el.innerHTML=`<div class="chart-title">${label}: ${escapeHtml(row.name)}</div>
      <div class="analysis-summary-grid">
        <div class="analysis-summary-chip info"><div class="analysis-summary-label">Trades</div><div class="analysis-summary-value">${row.n}</div><div class="analysis-summary-sub">${row.wins} WIN · ${row.n-row.wins} não-WIN</div></div>
        <div class="analysis-summary-chip ${row.pnl>=0?'safe':'danger'}"><div class="analysis-summary-label">P/L</div><div class="analysis-summary-value">${row.pnl>=0?'+':''}${fR(row.pnl)}</div><div class="analysis-summary-sub">melhor ${row.best!=null?(row.best>=0?'+':'')+fR(row.best):'—'}</div></div>
        <div class="analysis-summary-chip"><div class="analysis-summary-label">Timing</div><div class="analysis-summary-value">${formatClockMinutes(timing.avgOpenMinutes)}</div><div class="analysis-summary-sub">dur. ${formatDurationMinutes(timing.avgDurationMinutes)}</div></div>
        <div class="analysis-summary-chip ${leaderCount>0?'safe':'info'}"><div class="analysis-summary-label">Destaque</div><div class="analysis-summary-value">${leaderCount}</div><div class="analysis-summary-sub">métrica(s) lideradas</div></div>
      </div>`;
    el.innerHTML+=`<div class="strategy-compare-note">${row.n<10?'Amostra ainda curta para leitura definitiva.':'Base mais firme para comparar consistência e execução.'} Último trade em ${fDate(row.lastDate)}.</div>`;
  };
  const buildTopCard=row=>{
    if(!row)return'';
    const timing=getTradeTimingStats(row.trades).overall;
    return `<div class="chart-card strategy-compare-card">
      <div class="chart-title">${escapeHtml(row.name)}</div>
      <div class="strategy-compare-metrics">
        ${defs.map(def=>`<div class="strategy-compare-metric"><span>${def.label}</span><strong>${def.format(def.get(row))}</strong></div>`).join('')}
        <div class="strategy-compare-metric"><span>Hora média</span><strong>${formatClockMinutes(timing.avgOpenMinutes)}</strong></div>
      </div>
      <div class="strategy-compare-note">${row.n<10?'Amostra pequena: use como leitura inicial.':'Amostra forte o bastante para comparar padrão de resultado e timing.'}</div>
    </div>`;
  };
  if(!rows.length){
    renderEmptyState('Ainda não há trades fechados suficientes por estratégia nesse período.','Registre operações fechadas com setup preenchido para comparar desempenho.');
    renderDetailCard('stCmpA','Estratégia A',null,0);
    renderDetailCard('stCmpB','Estratégia B',null,0);
    return;
  }
  if(!rowA||!rowB||rowA.name===rowB.name){
    renderEmptyState(
      rowA&&rowB&&rowA.name===rowB.name
        ? 'Escolha duas estratégias diferentes para evitar comparação duplicada.'
        : 'Selecione as duas estratégias para abrir a curva, os gráficos e o resumo comparativo.',
      rowA&&rowB&&rowA.name===rowB.name
        ? 'Troque uma das estratégias e o painel completo aparece em seguida.'
        : 'Quando A e B estiverem preenchidas, a comparação completa aparece aqui.'
    );
    renderDetailCard('stCmpA','Estratégia A',rowA,0);
    renderDetailCard('stCmpB','Estratégia B',rowB,0);
    return;
  }
  if(emptyEl)emptyEl.style.display='none';
  if(fullEl)fullEl.style.display='grid';

  const outcomeA=getStrategyOutcomeStats(rowA);
  const outcomeB=getStrategyOutcomeStats(rowB);
  const timingA=getTradeTimingStats(rowA.trades).overall;
  const timingB=getTradeTimingStats(rowB.trades).overall;
  const dominantA=getDominantTimingWindow(rowA.trades,30);
  const dominantB=getDominantTimingWindow(rowB.trades,30);
  const leaderCounts={[rowA.name]:0,[rowB.name]:0,Empate:0};
  if(cardsEl)cardsEl.innerHTML=[buildTopCard(rowA),buildTopCard(rowB)].filter(Boolean).join('');
  if(summaryEl){
    summaryEl.innerHTML=defs.map(def=>{
      const winner=getStrategyMetricWinner(def,rowA,rowB);
      if(leaderCounts[winner]!=null)leaderCounts[winner]++;
      const winnerClass=winner==='Empate'?'text-muted':'strategy-compare-winner';
      return `<tr>
        <td>${def.label}</td>
        <td class="mono">${def.format(def.get(rowA))}</td>
        <td class="mono">${def.format(def.get(rowB))}</td>
        <td class="${winnerClass}">${escapeHtml(winner)}</td>
      </tr>`;
    }).join('');
  }
  renderDetailCard('stCmpA','Estratégia A',rowA,leaderCounts[rowA.name]||0);
  renderDetailCard('stCmpB','Estratégia B',rowB,leaderCounts[rowB.name]||0);
  if(insightsEl){
    const leadName=(leaderCounts[rowA.name]||0)===(leaderCounts[rowB.name]||0)
      ? 'Empate técnico'
      : (leaderCounts[rowA.name]||0)>(leaderCounts[rowB.name]||0)?rowA.name:rowB.name;
    const leadCount=Math.max(leaderCounts[rowA.name]||0,leaderCounts[rowB.name]||0);
    const sampleNote=rowA.n<10||rowB.n<10?' · Base curta em pelo menos uma das estratégias.':'';
    insightsEl.textContent=leadName==='Empate técnico'
      ? `Empate técnico nas métricas principais${sampleNote}`
      : `${leadName} lidera em ${leadCount} de ${defs.length} métricas${sampleNote}`;
  }
  if(metricExplainEl){
    metricExplainEl.textContent='Barras normalizadas por métrica: 100 marca o líder daquele critério. Use o resumo abaixo para ler os valores reais sem misturar unidades diferentes.';
  }
  renderAnalysisSummary('stCmpMetricSummary',[
    {tone:'safe',label:'Retorno',value:getStrategyMetricWinner(defs.find(def=>def.key==='pnl'),rowA,rowB),sub:`${rowA.name} ${(rowA.pnl>=0?'+':'')+fR(rowA.pnl)} · ${rowB.name} ${(rowB.pnl>=0?'+':'')+fR(rowB.pnl)}`},
    {tone:'info',label:'Expectância',value:getStrategyMetricWinner(defs.find(def=>def.key==='exp'),rowA,rowB),sub:`${rowA.exp>=0?'+':''}${rowA.exp.toFixed(3)}R · ${rowB.exp>=0?'+':''}${rowB.exp.toFixed(3)}R`},
    {tone:'warn',label:'Profit Factor',value:getStrategyMetricWinner(defs.find(def=>def.key==='pf'),rowA,rowB),sub:`${formatStrategyRatio(rowA.pf)} · ${formatStrategyRatio(rowB.pf)}`},
    {tone:'danger',label:'Drawdown',value:getStrategyMetricWinner(defs.find(def=>def.key==='maxDD'),rowA,rowB),sub:`${((rowA.maxDD||0)*100).toFixed(1)}% · ${((rowB.maxDD||0)*100).toFixed(1)}%`},
  ]);

  const equityA=buildStrategyEquitySeries(rowA);
  const equityB=buildStrategyEquitySeries(rowB);
  const maxLen=Math.max(equityA.points.length,equityB.points.length,1);
  const labels=Array.from({length:maxLen},(_,i)=>i===0?'Início':`T${i}`);
  const padSeries=(points)=>Array.from({length:maxLen},(_,i)=>i<points.length?points[i]:null);
  mkChart('stCmpEquityChart',{
    type:'line',
    data:{
      labels,
      datasets:[
        buildSignedEquityDataset(padSeries(equityA.points),{label:rowA.name,borderColor:'rgba(34,213,237,.95)',pointBackgroundColor:'rgba(34,213,237,.95)',pointBorderColor:'rgba(34,213,237,.95)',backgroundColor:'rgba(34,213,237,.12)',fill:false,spanGaps:false}),
        buildSignedEquityDataset(padSeries(equityB.points),{label:rowB.name,borderColor:'rgba(255,206,103,.95)',pointBackgroundColor:'rgba(255,206,103,.95)',pointBorderColor:'rgba(255,206,103,.95)',backgroundColor:'rgba(255,206,103,.12)',fill:false,spanGaps:false}),
      ],
    },
    options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:true,labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}}},
  });

  const metricChartDefs=defs.filter(def=>def.key!=='n');
  const metricScores=metricChartDefs.map(def=>getStrategyCompareScores(def,rowA,rowB));
  mkChart('stCmpMetricBarsChart',{
    type:'bar',
    data:{
      labels:metricChartDefs.map(def=>def.label),
      datasets:[
        {label:rowA.name,data:metricScores.map(score=>score[0]),backgroundColor:'rgba(34,213,237,.62)',borderColor:'transparent',borderRadius:4,maxBarThickness:28},
        {label:rowB.name,data:metricScores.map(score=>score[1]),backgroundColor:'rgba(255,206,103,.62)',borderColor:'transparent',borderRadius:4,maxBarThickness:28},
      ],
    },
    options:{...CHART_OPTS,indexAxis:'y',scales:{...CHART_OPTS.scales,x:{...CHART_OPTS.scales.x,max:100},y:{...CHART_OPTS.scales.y}},plugins:{...CHART_OPTS.plugins,legend:{display:true,labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}}},
  });

  if(outcomeExplainEl){
    outcomeExplainEl.textContent='Composição WIN/LOSS/BE por estratégia. O resumo destaca mediana por trade, extremos e a qualidade média dos ganhos e perdas.';
  }
  mkChart('stCmpOutcomeChart',{
    type:'bar',
    data:{
      labels:[rowA.name,rowB.name],
      datasets:[
        {label:'WIN',data:[outcomeA.wins,outcomeB.wins],backgroundColor:'rgba(69,224,123,.68)',borderColor:'transparent',borderRadius:4,maxBarThickness:40,stack:'results'},
        {label:'LOSS',data:[outcomeA.losses,outcomeB.losses],backgroundColor:'rgba(255,93,104,.68)',borderColor:'transparent',borderRadius:4,maxBarThickness:40,stack:'results'},
        {label:'BE',data:[outcomeA.bes,outcomeB.bes],backgroundColor:'rgba(255,206,103,.72)',borderColor:'transparent',borderRadius:4,maxBarThickness:40,stack:'results'},
      ],
    },
    options:{...CHART_OPTS,scales:{...CHART_OPTS.scales,x:{...CHART_OPTS.scales.x,stacked:true},y:{...CHART_OPTS.scales.y,stacked:true}},plugins:{...CHART_OPTS.plugins,legend:{display:true,labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}}},
  });
  const medianWinner=(outcomeA.medianPnl??-Infinity)===(outcomeB.medianPnl??-Infinity)?'Empate':(outcomeA.medianPnl??-Infinity)>(outcomeB.medianPnl??-Infinity)?rowA.name:rowB.name;
  const bestWinner=(outcomeA.bestPnl??-Infinity)===(outcomeB.bestPnl??-Infinity)?'Empate':(outcomeA.bestPnl??-Infinity)>(outcomeB.bestPnl??-Infinity)?rowA.name:rowB.name;
  const worstWinner=(outcomeA.worstPnl??-Infinity)===(outcomeB.worstPnl??-Infinity)?'Empate':(outcomeA.worstPnl??-Infinity)>(outcomeB.worstPnl??-Infinity)?rowA.name:rowB.name;
  renderAnalysisSummary('stCmpOutcomeSummary',[
    {tone:'info',label:'Mediana',value:medianWinner,sub:`${outcomeA.medianPnl!=null?(outcomeA.medianPnl>=0?'+':'')+fR(outcomeA.medianPnl):'—'} · ${outcomeB.medianPnl!=null?(outcomeB.medianPnl>=0?'+':'')+fR(outcomeB.medianPnl):'—'}`},
    {tone:'safe',label:'Melhor trade',value:bestWinner,sub:`${outcomeA.bestPnl!=null?(outcomeA.bestPnl>=0?'+':'')+fR(outcomeA.bestPnl):'—'} · ${outcomeB.bestPnl!=null?(outcomeB.bestPnl>=0?'+':'')+fR(outcomeB.bestPnl):'—'}`},
    {tone:'danger',label:'Pior trade',value:worstWinner,sub:`${outcomeA.worstPnl!=null?(outcomeA.worstPnl>=0?'+':'')+fR(outcomeA.worstPnl):'—'} · ${outcomeB.worstPnl!=null?(outcomeB.worstPnl>=0?'+':'')+fR(outcomeB.worstPnl):'—'}`},
    {tone:'warn',label:'WIN/LOSS/BE',value:`${outcomeA.winRatePct.toFixed(0)}/${outcomeA.lossRatePct.toFixed(0)}/${outcomeA.beRatePct.toFixed(0)} · ${outcomeB.winRatePct.toFixed(0)}/${outcomeB.lossRatePct.toFixed(0)}/${outcomeB.beRatePct.toFixed(0)}`,sub:`Avg WIN ${outcomeA.avgWinPnl!=null?(outcomeA.avgWinPnl>=0?'+':'')+fR(outcomeA.avgWinPnl):'—'} · ${outcomeB.avgWinPnl!=null?(outcomeB.avgWinPnl>=0?'+':'')+fR(outcomeB.avgWinPnl):'—'}`},
  ]);

  if(timingExplainEl){
    timingExplainEl.textContent='Timing compara hora média de acionamento, hora média de saída e duração média. Entrada e saída usam o eixo esquerdo (horário do dia); duração usa o eixo direito (minutos).';
  }
  mkChart('stCmpTimingChart',{
    type:'bar',
    data:{
      labels:[rowA.name,rowB.name],
      datasets:[
        {label:'Entrada média',data:[timingA.avgOpenMinutes||0,timingB.avgOpenMinutes||0],backgroundColor:'rgba(34,213,237,.62)',borderColor:'transparent',borderRadius:4,maxBarThickness:30,yAxisID:'y'},
        {label:'Saída média',data:[timingA.avgExitMinutes||0,timingB.avgExitMinutes||0],backgroundColor:'rgba(99,169,255,.58)',borderColor:'transparent',borderRadius:4,maxBarThickness:30,yAxisID:'y'},
        {type:'line',label:'Duração média',data:[timingA.avgDurationMinutes||0,timingB.avgDurationMinutes||0],borderColor:'rgba(255,206,103,.92)',backgroundColor:'rgba(255,206,103,.22)',borderWidth:2,pointRadius:3,pointHoverRadius:4,tension:.24,yAxisID:'y1'},
      ],
    },
    options:{...CHART_OPTS,scales:{...CHART_OPTS.scales,y:{...CHART_OPTS.scales.y,position:'left',ticks:{...CHART_OPTS.scales.y.ticks,callback:value=>formatClockMinutes(value)}},y1:{...CHART_OPTS.scales.y,position:'right',grid:{display:false},ticks:{...CHART_OPTS.scales.y.ticks,callback:value=>`${Math.round(Number(value)||0)} min`}}},plugins:{...CHART_OPTS.plugins,legend:{display:true,labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}}},
  });
  renderAnalysisSummary('stCmpTimingSummary',[
    {tone:'info',label:'Entrada média',value:`${formatClockMinutes(timingA.avgOpenMinutes)} · ${formatClockMinutes(timingB.avgOpenMinutes)}`,sub:'hora de acionamento'},
    {tone:'info',label:'Saída média',value:`${formatClockMinutes(timingA.avgExitMinutes)} · ${formatClockMinutes(timingB.avgExitMinutes)}`,sub:'hora de encerramento'},
    {tone:'warn',label:'Duração média',value:`${formatDurationMinutes(timingA.avgDurationMinutes)} · ${formatDurationMinutes(timingB.avgDurationMinutes)}`,sub:'tempo típico por operação'},
    {tone:'safe',label:'Janela dominante',value:`${dominantA.label} · ${dominantB.label}`,sub:`${dominantA.count} trades · ${dominantB.count} trades`},
  ]);
}


function renderDashStrategyBoard(arr){
  renderStrategyRows('dashStrategyBoard',getStrategySnapshots(arr),5);
}


function renderLogMetrics(arr,incompleteCount){
  const el=document.getElementById('logMetrics');
  if(!el)return;
  const m=calcMetrics(arr);
  const riskTrades=arr.filter(t=>t.riskUsd!=null);
  const avgRisk=riskTrades.length ? riskTrades.reduce((sum,t)=>sum+(t.riskUsd||0),0)/riskTrades.length : 0;
  const cards=[
    {cls:'c-blue',lbl:'Registros filtrados',val:String(arr.length),sub:`${m.closed.length} trades fechados`},
    {cls:'c-green',lbl:'P/L filtrado',val:`${m.totalPnl>=0?'+':''}${fR(m.totalPnl)}`,sub:'resultado do filtro atual'},
    {cls:'c-yellow',lbl:'Win rate',val:`${(m.wr*100).toFixed(1)}%`,sub:`${m.wins.length} wins · ${m.losses.length} losses`},
    {cls:incompleteCount?'c-red':'c-purple',lbl:'Controle',val:incompleteCount?`${incompleteCount} incompletos`:fR(avgRisk),sub:incompleteCount?'pedem revisão':'risco médio por operação'},
  ];
  el.innerHTML=cards.map(c=>`
    <div class="metric-card ${c.cls}">
      <div class="m-label">${c.lbl}</div>
      <div class="m-value">${c.val}</div>
      <div class="m-sub">${c.sub}</div>
    </div>`).join('');
}


function sortLog(col){
  if(sortState.col===col){sortState.dir=sortState.dir==='asc'?'desc':'asc';}
  else{sortState.col=col;sortState.dir=col==='date'?'desc':'asc';}
  document.querySelectorAll('.sort-ind').forEach(el=>el.textContent='');
  const ind=document.getElementById('si-'+col);
  if(ind)ind.textContent=sortState.dir==='asc'?'↑':'↓';
  renderLog();
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

function clearLogDateRange(){
  const start=document.getElementById('filterDateStart');
  const end=document.getElementById('filterDateEnd');
  if(start)start.value='';
  if(end)end.value='';
  renderLog();
}

function toggleSelectAll(el){
  const tbody=document.getElementById('logTbody');
  tbody.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.checked=el.checked;
    const row=cb.closest('tr');
    if(row)row.classList.toggle('selected',el.checked);
    if(el.checked)selectedTrades.add(cb.dataset.id);
    else selectedTrades.delete(cb.dataset.id);
  });
  updateBulkBar();
}

function toggleRowSelect(cb,id){
  if(cb.checked)selectedTrades.add(id);
  else selectedTrades.delete(id);
  const row=cb.closest('tr');
  if(row)row.classList.toggle('selected',cb.checked);
  updateBulkBar();
}

function getSelectedTradeList(){
  return [...selectedTrades].map(id=>trades.find(t=>t.id===id)).filter(Boolean);
}

function getSelectedIncompleteTrades(){
  return getSelectedTradeList().filter(t=>t.incomplete);
}

function updateBulkBar(){
  const bar=document.getElementById('bulkBar');
  const cnt=document.getElementById('bulkCount');
  const hint=document.getElementById('bulkHint');
  const editBtn=document.getElementById('bulkEditBtn');
  const completeBtn=document.getElementById('bulkCompleteBtn');
  if(!bar)return;
  const selectedCount=selectedTrades.size;
  const incompleteCount=getSelectedIncompleteTrades().length;
  if(selectedCount>0){
    bar.classList.add('show');
    if(cnt)cnt.textContent=incompleteCount>0
      ? `${selectedCount} selecionado(s) · ${incompleteCount} incompleto(s)`
      : `${selectedCount} selecionado(s)`;
    if(hint)hint.style.display='none';
  } else{
    bar.classList.remove('show');
    if(hint)hint.style.display='inline-flex';
  }
  if(editBtn)editBtn.textContent=selectedCount===1?'✏ Editar':'✏ Editar seleção';
  if(completeBtn)completeBtn.textContent=incompleteCount>0
    ? `✓ Completar incompletos (${incompleteCount})`
    : '✓ Completar incompletos';
  const chkAll=document.getElementById('chkAll');
  if(chkAll){const all=document.querySelectorAll('#logTbody input[type=checkbox]');chkAll.checked=all.length>0&&[...all].every(c=>c.checked);}
}

function clearSelection(){
  selectedTrades.clear();
  document.querySelectorAll('#logTbody input[type=checkbox]').forEach(cb=>{cb.checked=false;cb.closest('tr')?.classList.remove('selected');});
  const ca=document.getElementById('chkAll');if(ca)ca.checked=false;
  updateBulkBar();
}

function showTradeDeleteDoubleConfirm({title, introMessage, finalMessage, onConfirm}){
  showAppConfirm(
    title,
    introMessage,
    ()=>{
      showAppConfirm(
        'Última confirmação',
        finalMessage,
        onConfirm,
        {danger:true,confirmText:'Excluir agora'}
      );
    },
    {danger:true,confirmText:'Continuar'}
  );
}

function bulkDelete(){
  if(!selectedTrades.size)return;
  if(showLogAccountEditLockNotice('excluir'))return;
  const count=selectedTrades.size;
  showTradeDeleteDoubleConfirm({
    title:'Excluir selecionados',
    introMessage:`Você selecionou ${count} trade(s). Quer seguir para confirmação final da exclusão?`,
    finalMessage:`${count} trade(s) selecionado(s) serão removido(s) do histórico.\n\nEsta ação não poderá ser desfeita.`,
    onConfirm:()=>{
    trades=trades.filter(t=>!selectedTrades.has(t.id));
    selectedTrades.clear();
    save();refreshAll();
    }
  });
}

function editSelectedTrades(){
  if(!selectedTrades.size)return;
  if(showLogAccountEditLockNotice('editar'))return;
  const selected=getSelectedTradeList();
  if(selected.length!==1){
    showAppNotice('Editar selecionados','Selecione apenas 1 trade para editar. Para vários trades, use duplicar, excluir ou completar incompletos.');
    return;
  }
  clearBulkIncompleteFlow();
  openModal('tradeModal',selected[0].id);
}

function completeSelectedIncompleteTrades(){
  if(!selectedTrades.size)return;
  if(showLogAccountEditLockNotice('editar'))return;
  const incomplete=getSelectedIncompleteTrades()
    .sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||'').localeCompare(b.createdAt||''));
  if(!incomplete.length){
    showAppNotice(t('notice.incomplete'),t('notice.noIncomplete'));
    return;
  }
  startBulkIncompleteFlow(incomplete.map(t=>t.id));
}

function completeAllIncompleteTrades(){
  if(showLogAccountEditLockNotice('editar'))return;
  const incomplete=getAccountTrades(activeAccountId)
    .filter(t=>t.incomplete)
    .sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||'').localeCompare(b.createdAt||''));
  if(!incomplete.length){
    showAppNotice('Incompletos','Não há trades incompletos nesta conta.');
    return;
  }
  startBulkIncompleteFlow(incomplete.map(t=>t.id));
}

function cloneTradeForDuplicate(source, now=new Date().toISOString()){
  const clone=JSON.parse(JSON.stringify(source||{}));
  clone.id=uid();
  delete clone.positionId;
  clone.createdAt=now;
  clone.updatedAt=now;
  clone.errors=Array.isArray(source?.errors)?[...source.errors]:[];
  clone.images=normalizeDocImages(source?.images);
  return clone;
}

function finishTradeMutation(){
  save();
  if(document.querySelector('.page.active'))refreshAll();
}

function duplicateTrade(id){
  if(showLogAccountEditLockNotice('duplicar'))return;
  const original=trades.find(t=>t.id===id);
  if(!original)return;
  trades.unshift(cloneTradeForDuplicate(original));
  finishTradeMutation();
}

function duplicateSelectedTrades(){
  if(!selectedTrades.size)return;
  if(showLogAccountEditLockNotice('duplicar'))return;
  const copies=[...selectedTrades].map(id=>trades.find(t=>t.id===id)).filter(Boolean).map(t=>cloneTradeForDuplicate(t));
  if(!copies.length)return;
  trades=[...copies,...trades];
  selectedTrades.clear();
  finishTradeMutation();
}

function getLogFilteredTrades({accountId='active',strategy='',startDate='',endDate=''}={}){
  const acctId=accountId==='active'?activeAccountId:(accountId||'active');
  let filtered=acctId==='all'?accounts.flatMap(a=>getAccountTrades(a.id)):[...getAccountTrades(acctId)];
  filtered=filtered.filter(t=>isTradeInLogDateRange(t,startDate,endDate));
  if(strategy)filtered=filtered.filter(t=>t.strategy===strategy);
  return getSortedTrades(filtered);
}

function getLogAccountTrades(accountId='active',dateRange={}){
  const acctId=accountId==='active'?activeAccountId:(accountId||'active');
  const source=acctId==='all'?accounts.flatMap(a=>getAccountTrades(a.id)):getAccountTrades(acctId);
  return source.filter(t=>isTradeInLogDateRange(t,dateRange.startDate,dateRange.endDate));
}

function renderLog(){
  const acctSel=document.getElementById('filterAccount');
  const stratSel=document.getElementById('filterStrategy');
  let accountFilter=acctSel?.value||'active';
  const strat=stratSel?.value||'';
  if(acctSel){
    const v=acctSel.value||'active';
    acctSel.innerHTML='<option value="active">Conta atual</option><option value="all">Todas contas</option>'+accounts.map(a=>`<option value="${a.id}">${escapeHtml(a.name||a.id)}</option>`).join('');
    const allowedAccounts=['active','all',...accounts.map(a=>a.id)];
    acctSel.value=allowedAccounts.includes(v)?v:'active';
    accountFilter=acctSel.value||'active';
  }
  if(stratSel){const v=stratSel.value;stratSel.innerHTML='<option value="">Todas estratégias</option>'+config.strategies.map(s=>`<option>${s}</option>`).join('');stratSel.value=v;}
  renderLogReadOnlyNotice(accountFilter);
  const dateRange=getLogDateRangeFromControls();
  const filtered=getLogFilteredTrades({accountId:accountFilter,strategy:strat,...dateRange});
  const allAcctTrades=accountFilter==='all'?accounts.flatMap(a=>getAccountTrades(a.id)):getAccountTrades(accountFilter==='active'?activeAccountId:accountFilter);
  const incomplete=allAcctTrades.filter(t=>t.incomplete);
  const iaEl=document.getElementById('incompleteAlert');
  if(iaEl){if(incomplete.length){iaEl.style.display='block';document.getElementById('incompleteCount').textContent=incomplete.length;}else{iaEl.style.display='none';}}
  renderLogMetrics(filtered,incomplete.length);
  document.getElementById('logCount').textContent=filtered.length+' registros';
  document.getElementById('logTbody').innerHTML=filtered.length
    ? filtered.map((t,i)=>tradeRow(t,true,filtered.length-i)).join('')
    : `<tr><td colspan="22" style="text-align:center;color:var(--muted);padding:24px">${t('misc.noTrades')}</td></tr>`;
  updateBulkBar();
}

function fmtMissingField(f){
  return({entry:'entrada',stop:'stop',strategy:'estratégia',emotion:'emoção',followedPlan:'plano',exit:'saída'}[f]||f);
}

function tradeRow(t, showAll=true, idx=null){
  const pnl=t.pnl||0;
  const pc=pnl>0?'text-green':pnl<0?'text-red':'';
  const rVal=(t.r!=null&&Number.isFinite(t.r))?((t.r>=0?'+':'')+t.r.toFixed(2)+'R'):'—';
  const statusBadge=`<span class="badge ${(t.status||'open').toLowerCase()}">${t.status||'OPEN'}</span>`;
  const missingList=(t.missing_fields||[]).map(fmtMissingField).join(', ');
  const incBadge=t.incomplete?`<span class="badge incomplete" title="Faltando: ${missingList||'campos não preenchidos'}">!</span> `:'';
  const riskStr=t.riskUsd!=null?fR(t.riskUsd):(t.riskPct!=null?t.riskPct.toFixed(2)+'%':'—');
  const pnlStr=pnl?((pnl>=0?'+':'')+fR(pnl)):'—';
  const pnlPctStr=t.pnlPct!=null?((t.pnlPct>=0?'+':'')+(t.pnlPct*100).toFixed(2)+'%'):'—';
  const sel=selectedTrades.has(t.id);
  const incClass=t.incomplete?' trade-row-incomplete':'';

  if(!showAll){
    return `<tr class="${incClass.trim()}">
      <td class="mono">${fDate(t.date)}</td>
      <td class="td-symbol">${incBadge}${t.symbol||'—'}</td>
      <td><span class="badge ${(t.direction||'').toLowerCase()}">${t.direction||'—'}</span></td>
      <td class="td-sm">${t.mode==='absolute'?'$':'%'}</td>
      <td class="mono">${t.entry||'—'}</td><td class="mono">${t.exit||'—'}</td>
      <td class="mono ${pnl>0?'text-green':pnl<0?'text-red':''}">${rVal}</td>
      <td class="mono ${pc}">${pnlStr}</td>
      <td class="td-sm">${t.emotion||'—'}</td>
      <td>${statusBadge}</td>
    </tr>`;
  }

  return `<tr class="${sel?'selected':''}${incClass}">
    <td class="td-chk"><input type="checkbox" ${sel?'checked':''} data-id="${t.id}" onchange="toggleRowSelect(this,'${t.id}')" style="accent-color:var(--accent)"></td>
    <td class="mono td-sm">${idx||'—'}</td>
    <td class="mono">${fDate(t.date)}</td>
    <td class="td-symbol">${incBadge}${t.symbol||'—'}</td>
    <td class="td-sm">${t.market||getMarket(t.symbol)||'—'}</td>
    <td><span class="badge ${(t.direction||'').toLowerCase()}">${t.direction||'—'}</span></td>
    <td class="mono">${t.entry||'—'}</td>
    <td class="mono text-red">${t.stop||'—'}</td>
    <td class="mono text-muted">${t.tp||'—'}</td>
    <td class="mono">${t.exit||'—'}</td>
    <td class="mono td-sm">${t.qty!=null?t.qty:'—'}</td>
    <td class="mono text-yellow">${riskStr}</td>
    <td class="mono ${pnl>0?'text-green':pnl<0?'text-red':''}">${rVal}</td>
    <td class="mono ${pc}">${pnlStr}</td>
    <td class="mono td-sm ${pc}">${pnlPctStr}</td>
    <td class="td-sm">${t.strategy||'—'}</td>
    <td class="td-sm">${t.emotion||'—'}</td>
    <td class="td-sm">${t.followedPlan||'—'}</td>
    <td class="mono td-sm">${t.discipline!=null?t.discipline:'—'}</td>
    <td>${statusBadge}</td>
    <td class="td-actions">
      <button class="btn btn-ghost btn-sm btn-icon" onclick="openModal('tradeModal','${t.id}')" title="Editar">✏</button>
      <button class="btn btn-ghost btn-sm btn-icon" onclick="duplicateTrade('${t.id}')" title="Duplicar">⧉</button>
      <button class="btn btn-danger btn-sm btn-icon" onclick="deleteTrade('${t.id}')" title="Excluir">✕</button>
    </td>
  </tr>`;
}

function deleteTrade(id){
  if(showLogAccountEditLockNotice('excluir'))return;
  showTradeDeleteDoubleConfirm({
    title:'Excluir trade',
    introMessage:'Excluir este trade do histórico? Você ainda passará por uma última confirmação.',
    finalMessage:'Este trade será removido do histórico.\n\nEsta ação não poderá ser desfeita.',
    onConfirm:()=>{
    trades=trades.filter(t=>t.id!==id);
    selectedTrades.delete(id);
    save();refreshAll();
    }
  });
}


let calViewMode='week';



function switchStatTab(id,el){
  ['overview','strategy','time','psych','simulation'].forEach(t=>{
    const div=document.getElementById('statTab-'+t);
    if(div)div.style.display=t===id?'block':'none';
  });
  document.querySelectorAll('#statTabNav .tab-btn').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  if(id==='psych')renderStatsPsych();
  else if(id==='simulation'){resetSimulationEntryDefaults();renderSimulation();}
  else renderStats();
}

function renderStats(){
  const acctSel=document.getElementById('statAccount');
  if(acctSel){
    const current=acctSel.value;
    acctSel.innerHTML=`<option value="all">${t('stats.allAccounts')}</option>`+accounts.map(a=>`<option value="${a.id}">${escapeHtml(a.name||a.id)}</option>`).join('');
    const allowed=['all',...accounts.map(a=>a.id)];
    const nextValue=statsAccountPinned&&allowed.includes(current)?current:activeAccountId;
    acctSel.value=allowed.includes(nextValue)?nextValue:activeAccountId;
  }
  const acctId=document.getElementById('statAccount')?.value||activeAccountId;
  const scopedAcctId=acctId==='all'?activeAccountId:acctId;
  const arr=getStatsPeriodTrades();
  const m=calcMetrics(arr, scopedAcctId);
  document.getElementById('statsMetrics').innerHTML=[
    {cls:'c-green',lbl:'P/L Total',val:(m.totalPnl>=0?'+':'')+fR(m.totalPnl),sub:m.closed.length+' fechados',tip:TIPS.pnl},
    {cls:'c-blue',lbl:'Win Rate',val:(m.wr*100).toFixed(1)+'%',sub:m.wins.length+'W · '+m.losses.length+'L'+(m.bes?.length?` · ${m.bes.length}BE`:'' ),tip:TIPS.wr},
    {cls:'c-yellow',lbl:'Expectância',val:(m.exp>=0?'+':'')+m.exp.toFixed(3)+'R',sub:'por trade',tip:TIPS.exp},
    {cls:'c-purple',lbl:'Profit Factor',val:isFinite(m.pf)?m.pf.toFixed(2):'∞',sub:'bruto/perda',tip:TIPS.pf},
    {cls:'c-red',lbl:'Max DD',val:(m.maxDD*100).toFixed(1)+'%',sub:`recovery ${isFinite(m.recovery)?m.recovery.toFixed(2):'—'} ${mkTip(TIPS.recovery)}`,tip:TIPS.dd},
    {cls:'c-blue',lbl:'Sharpe',val:isFinite(m.sharpe)?m.sharpe.toFixed(2):'—',sub:'retorno/risco',tip:TIPS.sharpe},
    {cls:'c-teal',lbl:'Sortino',val:isFinite(m.sortino)?m.sortino.toFixed(2):'—',sub:'downside risk',tip:TIPS.sortino},
    {cls:'c-yellow',lbl:'Calmar',val:isFinite(m.calmar)?m.calmar.toFixed(2):'—',sub:'retorno/DD',tip:TIPS.calmar},
  ].map(mkCard).join('');
  const riskAcct=accounts.find(a=>a.id===scopedAcctId)||getActiveAccount();
  const riskTrades=acctId==='all'?arr.filter(t=>(t.accountId||activeAccountId)===riskAcct.id):arr;
  renderStopFeeAnalysis('statsRiskLeakageRows',riskAcct,riskTrades);
  const startBal=m.startBal||1000;
  let run=startBal;const eqPts=[startBal];
  [...m.closed].reverse().forEach(t=>{run+=(t.pnl||0);eqPts.push(parseFloat(run.toFixed(2)));});
  mkChart('stEqChart',{type:'line',data:{labels:eqPts.map((_,i)=>i),datasets:[buildSignedEquityDataset(eqPts)]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  mkChart('stWLChart',{type:'doughnut',data:{labels:['Wins','Losses','Breakeven'],datasets:[{data:[m.wins.length,m.losses.length,m.bes?.length||0],backgroundColor:['rgba(0,214,143,.7)','rgba(255,77,106,.7)','rgba(255,206,103,.78)'],borderColor:'transparent'}]},options:{...CHART_OPTS,scales:{x:{display:false},y:{display:false}},plugins:{...CHART_OPTS.plugins,legend:{labels:{color:'#8ba3ad'}}}}});
  const rs=m.closed.filter(t=>t.r!=null).map(t=>t.r);
  mkChart('stRChart',{type:'bar',data:{labels:rs.map((_,i)=>i+1),datasets:[{data:rs,backgroundColor:rs.map(r=>r>=0?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:2}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const wd=[0,0,0,0,0,0,0];
  m.closed.forEach(t=>{if(t.date)wd[new Date(t.date+'T12:00').getDay()]+=(t.pnl||0);});
  const wdLbls=[t('day.sun','Dom'),t('day.mon','Seg'),t('day.tue','Ter'),t('day.wed','Qua'),t('day.thu','Qui'),t('day.fri','Sex'),t('day.sat','Sáb')];
  mkChart('stWdChart',{type:'bar',data:{labels:wdLbls,datasets:[{data:wd,backgroundColor:wd.map(v=>v>=0?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const mthMap={};m.closed.forEach(t=>{if(t.date){const k=t.date.slice(0,7);mthMap[k]=(mthMap[k]||0)+(t.pnl||0);}});
  const mk=Object.keys(mthMap).sort();
  mkChart('stMonthChart',{type:'bar',data:{labels:mk,datasets:[{data:mk.map(k=>mthMap[k]),backgroundColor:mk.map(k=>mthMap[k]>=0?'rgba(77,124,254,.6)':'rgba(255,93,104,.50)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  let pk=startBal,cur2=startBal;const ddArr=[];
  [...m.closed].reverse().forEach(t=>{cur2+=(t.pnl||0);if(cur2>pk)pk=cur2;ddArr.push(parseFloat(((pk-cur2)/pk*100).toFixed(2)));});
  mkChart('stDdChart',{type:'line',data:{labels:eqPts.slice(1).map((_,i)=>i+1),datasets:[buildSignedEquityDataset(eqPts.slice(1),{label:'Equity',borderWidth:1.5,yAxisID:'y'}),{label:'DD%',data:ddArr,borderColor:'rgba(255,77,106,.7)',borderWidth:1,pointRadius:0,tension:.3,fill:true,backgroundColor:'rgba(255,77,106,.07)',yAxisID:'y1'}]},options:{...CHART_OPTS,scales:{x:CHART_OPTS.scales.x,y:{...CHART_OPTS.scales.y,position:'left'},y1:{...CHART_OPTS.scales.y,position:'right',reverse:true,grid:{display:false}}}}});
  const pnlVals=m.closed.filter(t=>t.pnl!=null).map(t=>t.pnl);
  if(pnlVals.length>1){
    const mn=Math.min(...pnlVals),mx=Math.max(...pnlVals),bk=10,st=(mx-mn)/bk||1;
    const hist=Array(bk).fill(0);
    pnlVals.forEach(v=>{let b=Math.min(Math.floor((v-mn)/st),bk-1);hist[b]++;});
    mkChart('stHistChart',{type:'bar',data:{labels:hist.map((_,i)=>fR(mn+i*st)),datasets:[{data:hist,backgroundColor:'rgba(34,213,237,.62)',borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  }
  const avgWin=m.avgWin||0;
  const avgLoss=m.avgLoss||0;
  const rrr=avgLoss>0?avgWin/avgLoss:0;
  const beWR=rrr>0?1/(1+rrr)*100:0;
  const openTrades=arr.filter(t=>t.status==='OPEN').length;
  const beTrades=m.bes?.length||0;
  const grossWin=(m.wins||[]).reduce((s,t)=>s+(t.pnl||0),0);
  const grossLoss=Math.abs((m.losses||[]).reduce((s,t)=>s+(t.pnl||0),0));
  const metRow=(label,value,tip,colorFn)=>{
    const style=typeof colorFn==='function'?colorFn(value):typeof colorFn==='string'?colorFn:'';
    return`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)">
    <span style="font-size:11px;color:var(--muted);display:inline-flex;align-items:center;gap:4px">${label}${tip?' '+mkTip(tip):''}</span>
    <span style="font-family:'DM Mono',monospace;font-size:11px;${style}">${value}</span>
  </div>`;
  };
  document.getElementById('statsMetTable').innerHTML=[
    metRow('Total de trades',m.closed.length,`<strong>Total de Trades</strong><p>Número de trades fechados (WIN, LOSS ou BE) no período selecionado. Trades em aberto não entram no cálculo.</p>`),
    metRow('Wins / Losses / BE',`${m.wins.length}W · ${m.losses.length}L · ${beTrades}BE`,`<strong>Distribuição de Resultados</strong><p>Contagem de trades vencedores, perdedores e empatados. BE (breakeven) são trades que fecharam no zero a zero.</p>`),
    metRow('Win Rate',(m.wr*100).toFixed(1)+'%',TIPS.wr,v=>m.wr>=0.5?'color:var(--green)':'color:var(--yellow)'),
    metRow('Win Rate necessário',beWR.toFixed(1)+'%',`<strong>Win Rate Necessário (Breakeven)</strong><p>Percentual mínimo de acertos para o setup não perder dinheiro, dado o RRR médio atual. Fórmula: 1 ÷ (1 + RRR).</p><div class="tip-row"><span>Seu WR acima deste valor</span><span>Setup lucrativo no longo prazo</span></div>`,v=>m.wr*100>beWR?'color:var(--green)':'color:var(--red)'),
    metRow('P/L Total',(m.totalPnl>=0?'+':'')+fR(m.totalPnl),TIPS.pnl,v=>m.totalPnl>=0?'color:var(--green)':'color:var(--red)'),
    metRow('Ganho bruto','+'+fR(grossWin),`<strong>Ganho Bruto</strong><p>Soma de todos os P/L positivos no período, sem descontar as perdas.</p>`,'color:var(--green)'),
    metRow('Perda bruta','-'+fR(grossLoss),`<strong>Perda Bruta</strong><p>Soma absoluta de todos os P/L negativos no período.</p>`,'color:var(--red)'),
    metRow('Profit Factor',isFinite(m.pf)?m.pf.toFixed(2):'∞',TIPS.pf,v=>parseFloat(v)>=1.5?'color:var(--green)':parseFloat(v)>=1?'color:var(--yellow)':'color:var(--red)'),
    metRow('Expectância',(m.exp>=0?'+':'')+m.exp.toFixed(3)+'R',TIPS.exp,v=>m.exp>=0.2?'color:var(--green)':m.exp>=0?'color:var(--yellow)':'color:var(--red)'),
    metRow('RRR médio',rrr.toFixed(2),`<strong>RRR Médio (Risk-Reward Ratio)</strong><p>Razão entre o ganho médio e a perda média em múltiplos de R. Um RRR de 1.5 significa que os wins valem 1.5x mais que os losses.</p><div class="tip-row"><span>Abaixo de 1.0</span><span>Precisa de WR alto (&gt;60%)</span></div><div class="tip-row"><span>1.0–2.0</span><span>Faixa saudável</span></div><div class="tip-row"><span>Acima de 2.0</span><span>Excelente — WR baixo aceitável</span></div>`,v=>rrr>=1?'color:var(--green)':'color:var(--yellow)'),
    metRow('Avg Win / Avg Loss','+'+avgWin.toFixed(2)+'R · -'+avgLoss.toFixed(2)+'R',`<strong>Média dos Wins e Losses</strong><p>Resultado médio dos trades vencedores e perdedores em R. Comparar os dois revela o RRR real do setup.</p>`),
    metRow('Max Drawdown',(m.maxDD*100).toFixed(2)+'%',TIPS.dd,v=>m.maxDD<0.1?'color:var(--green)':m.maxDD<0.2?'color:var(--yellow)':'color:var(--red)'),
    metRow('Recovery Factor',isFinite(m.recovery)?m.recovery.toFixed(2):'—',TIPS.recovery,v=>parseFloat(v)>=2?'color:var(--green)':parseFloat(v)>=1?'color:var(--yellow)':'color:var(--red)'),
    metRow('Sharpe',isFinite(m.sharpe)?m.sharpe.toFixed(2):'—',TIPS.sharpe,v=>parseFloat(v)>=1?'color:var(--green)':parseFloat(v)>=0?'color:var(--yellow)':'color:var(--red)'),
    metRow('Sortino',isFinite(m.sortino)?m.sortino.toFixed(2):'—',TIPS.sortino,v=>parseFloat(v)>=1?'color:var(--green)':parseFloat(v)>=0?'color:var(--yellow)':'color:var(--red)'),
    metRow('Calmar',isFinite(m.calmar)?m.calmar.toFixed(2):'—',TIPS.calmar,v=>parseFloat(v)>=1?'color:var(--green)':parseFloat(v)>=0?'color:var(--yellow)':'color:var(--red)'),
  ].join('');
  document.getElementById('statsStreakRows').innerHTML=[
    metRow('Maior sequência de wins',m.maxWS+' trades',`<strong>Maior Sequência de Wins</strong><p>Maior número de trades consecutivos vencedores no período. Útil para entender a consistência do setup.</p>`),
    metRow('Maior sequência de losses',m.maxLS+' trades',`<strong>Maior Sequência de Losses</strong><p>Maior número de trades consecutivos perdedores. Importante para calibrar a resiliência psicológica e o tamanho de posição.</p>`,v=>parseInt(v)>=5?'color:var(--red)':parseInt(v)>=3?'color:var(--yellow)':''),
    metRow('Em aberto',openTrades,`<strong>Trades em Aberto</strong><p>Número de trades com status OPEN no período — ainda não fechados e sem resultado registrado.</p>`),
    metRow('Breakevens',beTrades,`<strong>Breakevens</strong><p>Trades que fecharam no zero a zero (sem lucro nem perda). Podem indicar boa gestão de stop ou trades que não desenvolveram.</p>`),
  ].join('');
  const symp={};m.closed.forEach(t=>{const s=t.symbol||'—';if(!symp[s])symp[s]={w:0,l:0,pnl:0};t.status==='WIN'?symp[s].w++:symp[s].l++;symp[s].pnl+=(t.pnl||0);});
  const symEntries=Object.entries(symp);
  const symEl=document.getElementById('stSymRows');
  if(symEl){
    if(!symEntries.length){symEl.innerHTML=`<div style="padding:10px 0;font-size:11px;color:var(--muted);text-align:center">Sem dados</div>`;}
    else{
      const symTip=`<strong>Performance por Símbolo</strong><p>Resumo de trades agrupados por ativo/símbolo. Útil para identificar quais ativos contribuem mais para o resultado.</p>`;
      symEl.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0 6px;border-bottom:1px solid rgba(255,255,255,.1)">
        <span style="font-size:10px;color:var(--dim);font-weight:600;letter-spacing:.04em;text-transform:uppercase">Símbolo ${mkTip(symTip)}</span>
        <span style="display:flex;gap:24px"><span style="font-size:10px;color:var(--dim);font-weight:600;letter-spacing:.04em;text-transform:uppercase;width:36px;text-align:right">N</span><span style="font-size:10px;color:var(--dim);font-weight:600;letter-spacing:.04em;text-transform:uppercase;width:40px;text-align:right">WR</span><span style="font-size:10px;color:var(--dim);font-weight:600;letter-spacing:.04em;text-transform:uppercase;width:54px;text-align:right">P/L</span></span>
      </div>`+symEntries.sort((a,b)=>b[1].pnl-a[1].pnl).map(([s,d])=>{const tot=d.w+d.l;const wr=tot?(d.w/tot*100).toFixed(0)+'%':'—';const pnlStr=(d.pnl>=0?'+':'')+fR(d.pnl);const pnlColor=d.pnl>=0?'color:var(--green)':'color:var(--red)';return`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span style="font-size:11px;color:var(--text);font-weight:500">${s}</span><span style="display:flex;gap:24px;font-family:'DM Mono',monospace;font-size:11px"><span style="width:36px;text-align:right;color:var(--muted)">${tot}</span><span style="width:40px;text-align:right;color:var(--muted)">${wr}</span><span style="width:54px;text-align:right;${pnlColor}">${pnlStr}</span></span></div>`;}).join('');
    }
  }
  const strategyRows=getStrategySnapshots(m.closed,scopedAcctId);
  const stratSels=[document.getElementById('stStratA'),document.getElementById('stStratB')];
  const strats=strategyRows.map(row=>row.name);
  stratSels.forEach(sel=>{if(!sel)return;const v=sel.value;sel.innerHTML='<option value="">—</option>'+strats.map(s=>`<option>${s}</option>`).join('');sel.value=v;});
  const sk=strategyRows.map(row=>row.name);
  const sPnl=strategyRows.map(row=>row.pnl);
  const sWR=strategyRows.map(row=>+row.wr.toFixed(1));
  mkChart('stStratPnlChart',{type:'bar',data:{labels:sk.map(s=>s.length>15?s.slice(0,15)+'…':s),datasets:[{data:sPnl,backgroundColor:sPnl.map(v=>v>=0?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,indexAxis:'y',plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  mkChart('stStratWRChart',{type:'bar',data:{labels:sk.map(s=>s.length>15?s.slice(0,15)+'…':s),datasets:[{data:sWR,backgroundColor:'rgba(34,213,237,.62)',borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,indexAxis:'y',scales:{...CHART_OPTS.scales,x:{...CHART_OPTS.scales.x,max:100}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  document.getElementById('stStratBody').innerHTML=strategyRows.map(row=>`<tr><td>${escapeHtml(row.name)}</td><td class="mono">${row.n}</td><td class="mono text-green">${row.wins}</td><td class="mono">${row.wr.toFixed(1)}%</td><td class="mono ${row.pnl>=0?'text-green':'text-red'}">${(row.pnl>=0?'+':'')+fR(row.pnl)}</td><td class="mono">${row.avgR.toFixed(2)+'R'}</td><td class="mono">${isFinite(row.pf)?row.pf.toFixed(2):'∞'}</td><td class="mono">${(row.exp>=0?'+':'')+row.exp.toFixed(3)+'R'}</td><td class="mono">${formatStrategyRatio(row.sharpe)}</td><td class="mono">${formatStrategyRatio(row.sortino)}</td><td class="mono">${formatStrategyRatio(row.calmar)}</td><td class="mono">${formatStrategyRatio(row.recovery)}</td></tr>`).join('');
  renderStrategyCompareCards(strategyRows);
  mkChart('stMonthPnlChart',{type:'bar',data:{labels:mk,datasets:[{data:mk.map(k=>mthMap[k]),backgroundColor:mk.map(k=>mthMap[k]>=0?'rgba(77,124,254,.6)':'rgba(255,93,104,.50)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const wdWR=[0,0,0,0,0,0,0];const wdN=[0,0,0,0,0,0,0];
  m.closed.forEach(t=>{if(t.date){const d=new Date(t.date+'T12:00').getDay();wdN[d]++;if(t.status==='WIN')wdWR[d]++;}});
  const wdWRPct=wdWR.map((w,i)=>wdN[i]>0?+(w/wdN[i]*100).toFixed(1):0);
  mkChart('stWdWRChart',{type:'bar',data:{labels:wdLbls,datasets:[{label:'Win Rate %',data:wdWRPct,backgroundColor:'rgba(34,213,237,.62)',borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,scales:{...CHART_OPTS.scales,y:{...CHART_OPTS.scales.y,max:100}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const timeStats=getTradeTimingStats(m.closed);
  const timeCards=document.getElementById('stTimeCards');
  if(timeCards){
    const timeTip=`<strong>Horários de Trading</strong><p>Médias calculadas sobre todos os trades fechados no período. Ajuda a identificar os melhores horários de operação.</p>`;
    const durTip=`<strong>Duração das Operações</strong><p>Tempo médio entre a abertura e o fechamento do trade. Compare WIN vs LOSS para identificar se manter trades por mais tempo melhora ou piora os resultados.</p>`;
    timeCards.innerHTML=[
      {cls:'c-blue',lbl:t('timing.avgOrder','Ordem média'),val:formatClockMinutes(timeStats.overall.avgPlacedMinutes),sub:`${timeStats.overall.count||0} trade(s)`,tip:timeTip},
      {cls:'c-green',lbl:t('timing.avgEntry','Entrada média'),val:formatClockMinutes(timeStats.overall.avgOpenMinutes),sub:t('timing.triggered','hora acionada'),tip:timeTip},
      {cls:'c-purple',lbl:t('timing.avgExit','Saída média'),val:formatClockMinutes(timeStats.overall.avgExitMinutes),sub:t('timing.closed','hora encerrada'),tip:timeTip},
      {cls:'c-yellow',lbl:t('timing.avgDuration','Duração média'),val:formatDurationMinutes(timeStats.overall.avgDurationMinutes),sub:t('timing.closedTrades','operações fechadas'),tip:durTip},
      {cls:'c-green',lbl:t('timing.durationWin','Duração WIN'),val:formatDurationMinutes(timeStats.wins.avgDurationMinutes),sub:`${timeStats.wins.count||0} WIN`,tip:durTip},
      {cls:'c-red',lbl:t('timing.durationLoss','Duração LOSS'),val:formatDurationMinutes(timeStats.losses.avgDurationMinutes),sub:`${timeStats.losses.count||0} LOSS`,tip:durTip},
    ].map(c=>`<div class="metric-card ${c.cls} time-metric-card"><div class="m-label-row"><span class="m-label">${c.lbl}</span>${c.tip?mkTip(c.tip):''}</div><div class="m-value">${c.val}</div><div class="m-sub">${c.sub}</div></div>`).join('');
  }
  const heatHours={};
  m.closed.forEach(t=>{
    const minutes=clockToMinutes(t.openTime);
    if(minutes==null)return;
    const h=Math.floor(minutes/60);
    if(!heatHours[h])heatHours[h]={n:0,pnl:0};
    heatHours[h].n++;
    heatHours[h].pnl+=(t.pnl||0);
  });
  const heatEl=document.getElementById('stHourHeatmap');
  if(heatEl){const maxPnl=Math.max(...Object.values(heatHours).map(h=>Math.abs(h.pnl)),1);
    heatEl.innerHTML='<div style="display:flex;gap:4px;flex-wrap:wrap">'+[...Array(24)].map((_,h)=>{const d=heatHours[h];if(!d)return`<div style="width:36px;height:36px;border-radius:5px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--dim)">${h}h</div>`;const intensity=Math.min(d.pnl/maxPnl,1);const bg=d.pnl>=0?`rgba(0,214,143,${0.15+Math.abs(intensity)*0.6})`:`rgba(255,77,106,${0.15+Math.abs(intensity)*0.6})`;return`<div style="width:36px;height:36px;border-radius:5px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center" title="${h}h: ${d.n} trades, P/L ${fR(d.pnl)}"><span style="font-size:9px;color:var(--text);font-weight:600">${h}h</span><span style="font-size:8px;color:var(--muted)">${d.n}T</span></div>`;}).join('')+'</div>';
  }
  document.getElementById('stTimeBody').innerHTML=[...wdLbls.map((d,i)=>{const ts=m.closed.filter(t=>t.date&&new Date(t.date+'T12:00').getDay()===i);const w=ts.filter(t=>t.status==='WIN').length;const pnl=ts.reduce((a,t)=>a+(t.pnl||0),0);const avg_r2=ts.filter(t=>t.r!=null).length?ts.filter(t=>t.r!=null).reduce((a,t)=>a+(t.r||0),0)/ts.filter(t=>t.r!=null).length:0;return ts.length?`<tr><td>${d}</td><td class="mono">${ts.length}</td><td class="mono">${(w/ts.length*100).toFixed(0)}%</td><td class="mono ${pnl>=0?'text-green':'text-red'}">${(pnl>=0?'+':'')+fR(pnl)}</td><td class="mono">${avg_r2.toFixed(2)+'R'}</td></tr>`:'';})].join('');
  const timeStrategyBody=document.getElementById('stTimeStrategyBody');
  if(timeStrategyBody){
    timeStrategyBody.innerHTML=timeStats.byStrategy.length
      ? timeStats.byStrategy.map(row=>`<tr><td><b>${escapeHtml(row.name)}</b></td><td class="mono">${row.count}</td><td class="mono">${formatClockMinutes(row.avgPlacedMinutes)}</td><td class="mono">${formatClockMinutes(row.avgOpenMinutes)}</td><td class="mono">${formatClockMinutes(row.avgExitMinutes)}</td><td class="mono">${formatDurationMinutes(row.avgDurationMinutes)}</td></tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Sem horários suficientes no período.</td></tr>';
  }
  // Inject tooltips into chart/section titles (Análises)
  // Format: [contentId, titleText, tip] — contentId is ANY element inside the target card/table
  [
    ['stEqChart','Curva de Equity',TIPS.stEqChart],
    ['stWLChart','Distribuição W/L',TIPS.stWLChart],
    ['stRChart','R-Múltiplos',TIPS.stRChart],
    ['stWdChart','P/L por Dia da Semana',TIPS.stWdChart],
    ['stMonthChart','Evolução Mensal',TIPS.stMonthChart],
    ['stDdChart','Equity × Drawdown',TIPS.stDdChart],
    ['stHistChart','Histograma P/L',TIPS.stHistChart],
    ['statsMetTable','Tabela de Métricas',TIPS.stMetTable],
    ['statsStreakRows','Streak & Sequências',TIPS.stStreak],
    ['stMonthPnlChart','P/L por Mês',TIPS.stMonthPnlChart],
    ['stWdWRChart','Win Rate por Dia da Semana',TIPS.stWdWRChart],
    ['stHourHeatmap','Trades por Horário (acionamento)',TIPS.stHeatmap],
    ['stTimeBody','Desempenho por Dia da Semana',TIPS.stWdTable],
    ['stTimeStrategyBody','Timing por Estratégia',TIPS.stTimingStrat],
    ['stStratPnlChart','P/L por Estratégia',TIPS.stStratPnl],
    ['stStratWRChart','Win Rate por Estratégia',TIPS.stStratWR],
    ['stStratBody','Comparativo de Estratégias',TIPS.stStratTable],
    // Psicológico
    ['statEmoWRChart','Win Rate por Emoção (durante)',TIPS.stEmoWR],
    ['statEmoPnlChart','P/L médio por Emoção',TIPS.stEmoPnl],
    ['statDiscWRChart','Disciplina × Win Rate',TIPS.stDiscWR],
    ['statErrorsChart','Erros mais frequentes',TIPS.stErrors],
    ['statHesitationWrap','Trades por hesitação (perdidos)',TIPS.stHesitation],
    ['statPlanChart','P/L por status de plano seguido',TIPS.stPlanChart],
    ['statEmoBody','Análise por Emoção',TIPS.stEmoTable],
    // Simulação
    ['simChart','Monte Carlo — 100 cenários de curva de equity',TIPS.simMonteCarlo],
  ].forEach(([contentId,titleText,tip])=>{
    const el=document.getElementById(contentId);
    if(!el)return;
    const card=el.closest('.chart-card')||el.closest('.table-card')||el.closest('.setup-card');
    if(!card)return;
    const titleEl=Array.from(card.querySelectorAll('.chart-title,.table-title,.setup-card-title')).find(t=>t.textContent.trim()===titleText);
    if(!titleEl||titleEl.querySelector('.m-tip-icon'))return;
    titleEl.innerHTML=titleEl.textContent+' '+mkTip(tip);
  });
  renderSimulation();
}

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

function applySimulationAccountSnapshot(accountId){
  const snapshot=getSimulationAccountSnapshot(accountId);
  const balanceEl=document.getElementById('simBalance');
  if(balanceEl){
    balanceEl.value=snapshot.balance.toFixed(2);
    balanceEl.readOnly=accountId&&accountId!=='manual';
  }
  setSimulationInputValue('simWR',clampSimulationWinRatePct(snapshot.winRatePct),1);
  setSimulationInputValue('simRiskPct',snapshot.riskPct,2);
  setSimulationInputValue('simGoalPct',snapshot.goalPct,2);
  setSimulationInputValue('simStopPct',snapshot.stopPct,2);
  setSimulationRrrInput(snapshot.rrr);
  syncSimulationMoneyFromPercent();
}

function resetSimulationEntryDefaults(){
  const selected=document.getElementById('simAccount')?.value;
  const accountId=selected&&selected!=='manual'?selected:activeAccountId;
  applySimulationAccountSnapshot(accountId||'manual');
}

function syncSimulationMoneyFromPercent(){
  const selected=document.getElementById('simAccount')?.value;
  const fallback=getSimulationAccountSnapshot(selected||activeAccountId);
  const sizing=calculateSimulationSizing({
    balance:toSimulationNumber(document.getElementById('simBalance')?.value,fallback.balance),
    riskPct:toSimulationNumber(document.getElementById('simRiskPct')?.value,fallback.riskPct),
    goalPct:toSimulationNumber(document.getElementById('simGoalPct')?.value,fallback.goalPct),
    stopPct:toSimulationNumber(document.getElementById('simStopPct')?.value,fallback.stopPct),
  });
  setSimulationInputValue('simRisk',sizing.riskUsd,2);
  setSimulationInputValue('simGoalDay',sizing.goalUsd,2);
  setSimulationInputValue('simStopDay',sizing.stopUsd,2);
  return sizing;
}

function loadSimFromAccount(){
  const id=document.getElementById('simAccount')?.value;
  const balanceEl=document.getElementById('simBalance');
  if(!id||id==='manual'){
    if(balanceEl)balanceEl.readOnly=false;
    applySimulationAccountSnapshot('manual');
    renderSimulation();
    return;
  }
  applySimulationAccountSnapshot(id);
  renderSimulation();
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

function renderSimulation(){
  const acctSel=document.getElementById('simAccount');
  if(acctSel&&acctSel.options.length<=1){
    const currentValue=acctSel.value;
    accounts.forEach(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name;acctSel.appendChild(o);});
    if(currentValue==='manual'){
      acctSel.value='manual';
    } else if(currentValue&&accounts.some(a=>a.id===currentValue)){
      acctSel.value=currentValue;
      applySimulationAccountSnapshot(currentValue);
    } else if(activeAccountId&&accounts.some(a=>a.id===activeAccountId)){
      acctSel.value=activeAccountId;
      applySimulationAccountSnapshot(activeAccountId);
    }
  }
  const rrrSel=document.getElementById('simRRR');
  const rrrCustom=document.getElementById('simRRRCustom');
  if(rrrSel&&rrrCustom){const isCustom=rrrSel.value==='custom';rrrCustom.style.display=isCustom?'block':'none';}
  const sizing=syncSimulationMoneyFromPercent();
  const N=parseInt(document.getElementById('simN')?.value)||20;
  const wrEl=document.getElementById('simWR');
  const wrPct=clampSimulationWinRatePct(wrEl?.value);
  const wr=wrPct/100;
  const rrrRaw=document.getElementById('simRRR')?.value;
  const rrr=rrrRaw==='custom'?parseFloat(document.getElementById('simRRRCustom')?.value)||1:parseFloat(rrrRaw)||1;
  const risk=Number.isFinite(sizing.riskUsd)?sizing.riskUsd:toSimulationNumber(document.getElementById('simRisk')?.value,10);
  const goalDay=Number.isFinite(sizing.goalUsd)?sizing.goalUsd:toSimulationNumber(document.getElementById('simGoalDay')?.value,50);
  const stopDay=Number.isFinite(sizing.stopUsd)?sizing.stopUsd:toSimulationNumber(document.getElementById('simStopDay')?.value,30);
  const balance=toSimulationNumber(document.getElementById('simBalance')?.value,1000);
  const expectancy=wr*rrr*risk-(1-wr)*risk;
  const exp_N=expectancy*N;
  const pf_=wr>0?(wr*rrr)/((1-wr)||0.001):0;
  const projection=buildMonteCarloBalanceProjection({balance,trades:N,winRate:wr,rrr,riskUsd:risk,goalUsd:goalDay,stopUsd:stopDay,scenarioCount:100});
  document.getElementById('simCards').innerHTML=[
    {cls:'c-yellow',lbl:'Expectância/trade',val:(expectancy>=0?'+':'')+fR(expectancy),tip:TIPS.exp},
    {cls:'c-green',lbl:'Resultado esperado (N)',val:(exp_N>=0?'+':'')+fR(exp_N),tip:TIPS.expN},
    {cls:'c-purple',lbl:'Profit Factor',val:isFinite(pf_)?pf_.toFixed(2):'∞',tip:TIPS.pf},
    {cls:'c-blue',lbl:'P(positivo)',val:projection.probPositive+'%',tip:TIPS.probPos},
  ].map(mkCard).join('');
  const sumEl=document.getElementById('simSummary');
  if(sumEl)sumEl.innerHTML=`<b style="color:var(--green)">${projection.probGoal}%</b> de chance de atingir meta (${sizing.goalPct}% / ${fR(goalDay)}) · <b style="color:var(--red)">${projection.probStop}%</b> de bater stop (${sizing.stopPct}% / ${fR(stopDay)}) em ${N} trades com RRR ${rrr}`;
  const plan=buildSimulationPlan({trades:N,winRatePct:wr*100,rrr,riskUsd:risk,goalPct:sizing.goalPct,goalUsd:goalDay,stopPct:sizing.stopPct,stopUsd:stopDay});
  const planEl=document.getElementById('simPlan');
  if(planEl)planEl.innerHTML=`<div class="status-item ${plan.tone}"><div class="status-item-copy"><div class="status-item-title">${escapeHtml(plan.title)}</div><div class="status-item-summary">${escapeHtml(plan.summary)}</div></div><div class="status-item-value">${escapeHtml((plan.expectancyUsd>=0?'+':'')+fR(plan.expectancyUsd)+'/T')}</div></div>`;
  const scenarioDatasets=projection.scenarios.slice(0,30).map(line=>({data:line,borderColor:'rgba(77,124,254,.06)',borderWidth:1,pointRadius:0,tension:.3,showLine:true}));
  mkChart('simChart',{type:'line',data:{labels:projection.labels,datasets:[{label:'Mediana',data:projection.medianLine,borderColor:'#22d5ed',borderWidth:2.5,pointRadius:0,tension:.3},...scenarioDatasets,{label:'Meta',data:projection.labels.map(()=>projection.goalBalance),borderColor:'rgba(0,214,143,.5)',borderWidth:1,borderDash:[4,4],pointRadius:0},{label:'Stop',data:projection.labels.map(()=>projection.stopBalance),borderColor:'rgba(255,93,104,.50)',borderWidth:1,borderDash:[4,4],pointRadius:0}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
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

function toggleCustomPeriod(){
  const period=document.getElementById('statPeriod')?.value||'custom';
  const bar=document.getElementById('customPeriodBar');
  if(bar)bar.style.display=period==='custom'?'flex':'none';
  renderStats();
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

function handleMT5Upload(e){
  const f=e.target.files[0];if(!f)return;
  const ext=f.name.toLowerCase().split('.').pop();
  const prev=document.getElementById('csvPreview')||document.getElementById('mt4Preview');
  if(prev)prev.innerHTML=`<div class="alert alert-info">⏳ Processando ${f.name}...</div>`;
  if(ext==='xlsx'){
    loadSheetJS(()=>{const r=new FileReader();r.onload=ev=>{try{const wb=XLSX.read(ev.target.result,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:false});handleMT5Result(parseSpreadsheetRows(rows,f.name),prev);}catch(err){if(prev)prev.innerHTML=`<div class="alert alert-warn">❌ Erro: ${err.message}</div>`;}};r.readAsArrayBuffer(f);});
  } else if(ext==='html'||ext==='htm'){
    const r=new FileReader();r.onload=ev=>{handleMT5Result(parseMT5HTML(ev.target.result,f.name),prev);};r.readAsText(f,'utf-16');
  } else {const r=new FileReader();r.onload=ev=>{handleMT5Result(parseMT4Raw(ev.target.result),prev);};r.readAsText(f);}
}

function handleReportUpload(e){
  const f=e.target.files[0];if(!f)return;
  const ext=f.name.toLowerCase().split('.').pop();
  if(ext==='html'||ext==='htm')handleMT5Upload(e);
  else handleCSVUpload(e);
}

function handleHistoryUpload(e){
  handleReportUpload(e);
}

function loadSheetJS(cb){
  if(window.XLSX){cb();return;}
  const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=cb;document.head.appendChild(s);
}

function parseMT5Rows(rows,filename){
  const existingIds=new Set(trades.map(t=>t.positionId).filter(Boolean));
  const result=[];
  const mappings=[
    {kind:'mt5-position',time:0,id:1,symbol:2,type:3,volume:4,entry:5,sl:6,tp:7,exitTime:8,exit:9,commission:10,swap:11,pnl:12},
    {kind:'mt5-position-html',time:0,id:1,symbol:2,type:3,dealDir:4,volume:5,entry:6,sl:7,tp:8,exitTime:9,exit:10,commission:11,swap:12,pnl:13},
    {kind:'mt4-statement',time:0,id:1,type:2,volume:3,symbol:4,entry:5,sl:6,tp:7,exitTime:8,exit:9,commission:10,tax:11,swap:12,pnl:13},
  ];
  const parseRow=(r,map)=>{
    if(!r||r.length<10)return null;
    const posId=cleanMTCell(r[map.id]);
    if(!/^\d+$/.test(posId))return null;
    const tipo=cleanMTCell(r[map.type]).toLowerCase();
    if(tipo!=='buy'&&tipo!=='sell')return null;
    const dealDir=map.dealDir!=null?cleanMTCell(r[map.dealDir]).toLowerCase():'';
    if(dealDir==='in'||dealDir==='out'||dealDir==='in/out')return null;
    const volRaw=cleanMTCell(r[map.volume]);
    if(!volRaw||volRaw.includes('/'))return null;
    const vol=parseMTNumber(volRaw);
    if(!vol||vol<=0)return null;
    const en=parseMTNumber(r[map.entry]);
    const ex=parseMTNumber(r[map.exit]);
    if(!en||en<=0||!ex||ex<=0)return null;
    const sym=cleanMTCell(r[map.symbol]).toUpperCase().replace(/\s/g,'');
    if(!sym||sym==='BALANCE')return null;
    const slRaw=parseMTNumber(r[map.sl]),tpRaw=parseMTNumber(r[map.tp]);
    const sl=slRaw&&slRaw>0?slRaw:null,tp=tpRaw&&tpRaw>0?tpRaw:null;
    const pnl=parseMTNumber(r[map.pnl]);
    const pnlV=pnl==null?null:parseFloat(pnl.toFixed(2));
    const comm=parseMTNumber(r[map.commission])||0;
    const tax=map.tax!=null?(parseMTNumber(r[map.tax])||0):0;
    const swap=parseMTNumber(r[map.swap])||0;
    return{posId,tipo,vol,en,ex,sym,sl,tp,pnlV,fees:parseFloat((comm+tax+swap).toFixed(2)),time:r[map.time],exitTime:r[map.exitTime]};
  };
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    const parsed=mappings.map(m=>parseRow(r,m)).find(Boolean);
    if(!parsed||existingIds.has(parsed.posId))continue;
    const dir=parsed.tipo==='buy'?'Long':'Short';
    let rVal=null;
    if(parsed.sl&&Math.abs(parsed.en-parsed.sl)>0){const pts=Math.abs(parsed.en-parsed.sl);rVal=parseFloat(((dir==='Long'?parsed.ex-parsed.en:parsed.en-parsed.ex)/pts).toFixed(3));}
    const status=mtTradeStatus(parsed.pnlV);
    result.push({id:uid(),positionId:parsed.posId,symbol:parsed.sym,date:normalizeDate(parsed.time),
      exitDate:normalizeDate(parsed.exitTime),placedTime:'',openTime:normalizeClockTime(parsed.time),exitTime:normalizeClockTime(parsed.exitTime),
      market:getMarket(parsed.sym),direction:dir,entry:parsed.en,stop:parsed.sl,tp:parsed.tp,exit:parsed.ex,qty:parsed.vol,mult:null,
      riskPct:null,riskUsd:null,r:rVal,pnl:parsed.pnlV,pnlPct:null,fees:parsed.fees,
      strategy:'',emoBefore:'',emotion:'',emoAfter:'',followedPlan:'',planDeviation:'',
      errors:[],discipline:null,confidence:null,mistake:'',remarks:'',images:[],hesitation:false,
      resultType:status==='OPEN'?'':status,status,mode:'absolute',
      incomplete:!parsed.sl,missing_fields:parsed.sl?[]:['stop'],
      createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    existingIds.add(parsed.posId);
  }
  return result;
}

function parseGenericTradeRows(rows,filename='csv'){
  if(!Array.isArray(rows)||!rows.length)return[];
  const aliases={
    date:['date','data','horario','hora','opentime','abertura','horariodaabertura'],
    exitDate:['exitdate','datasaida','closetime','fechamento'],
    placedTime:['placedtime','horariocolocado','horadecolocacao','horaordem','ordertime','horarioordem'],
    openTime:['opentime','horaentrada','horarioentrada','horarioacionado','horaacionada','horaacionou','entrytime'],
    exitTime:['exittime','horasaida','horariosaida','horafechamento','closetimeonly'],
    symbol:['symbol','simbolo','ativo','ticker','item','instrumento'],
    direction:['direction','direcao','dir','tipo','type','lado'],
    entry:['entry','entrada','precoentrada','openprice'],
    stop:['stop','sl','s/l','stoploss'],
    tp:['tp','takeprofit','alvo','target','t/p'],
    exit:['exit','saida','precosaida','closeprice','fechamento'],
    pnl:['pnl','profit','lucro','resultado','pl'],
    qty:['qty','qtd','quantidade','volume','size','lote'],
    fees:['fees','taxas','comissao','commission','custos'],
    strategy:['strategy','estrategia','setup'],
    emotion:['emotion','emocao'],
    market:['market','mercado'],
    ticket:['ticket','position','posicao','ordem','order'],
  };
  const findHeader=()=>{
    for(let i=0;i<Math.min(rows.length,20);i++){
      const norm=(rows[i]||[]).map(normalizeImportHeader);
      const hasSymbol=aliases.symbol.some(a=>norm.includes(a));
      const hasDate=aliases.date.some(a=>norm.includes(a));
      if(hasSymbol&&hasDate)return i;
    }
    return 0;
  };
  const headerIndex=findHeader();
  const headers=(rows[headerIndex]||[]).map(normalizeImportHeader);
  const idx=names=>names.map(n=>headers.indexOf(n)).find(i=>i>=0);
  const col={};
  Object.keys(aliases).forEach(k=>{col[k]=idx(aliases[k]);});
  if(col.symbol==null||col.date==null)return[];
  const get=(r,k)=>col[k]!=null?cleanMTCell(r[col[k]]):'';
  const result=[];
  for(let i=headerIndex+1;i<rows.length;i++){
    const r=rows[i]||[];
    const symbol=get(r,'symbol').toUpperCase().replace(/\s/g,'');
    const rawDate=get(r,'date');
    const rawExitDate=get(r,'exitDate');
    const date=normalizeDate(rawDate);
    if(!symbol||!date||symbol==='BALANCE')continue;
    const entry=parseMTNumber(get(r,'entry'));
    const stop=parseMTNumber(get(r,'stop'));
    const tp=parseMTNumber(get(r,'tp'));
    const exit=parseMTNumber(get(r,'exit'));
    const pnl=parseMTNumber(get(r,'pnl'));
    if(entry==null&&exit==null&&pnl==null)continue;
    const dirRaw=get(r,'direction').toLowerCase();
    const direction=/(sell|short|venda)/.test(dirRaw)?'Short':'Long';
    let rVal=null;
    if(entry!=null&&stop!=null&&exit!=null&&Math.abs(entry-stop)>0){
      const pts=Math.abs(entry-stop);
      rVal=parseFloat(((direction==='Long'?exit-entry:entry-exit)/pts).toFixed(3));
    }
    const pnlV=pnl==null?null:parseFloat(pnl.toFixed(2));
    const missing=[];if(entry==null)missing.push('entry');if(stop==null)missing.push('stop');
    const fees=parseMTNumber(get(r,'fees'))||0;
    const ticket=get(r,'ticket');
    result.push({id:uid(),positionId:ticket||undefined,symbol,date,exitDate:normalizeDate(rawExitDate),
      market:get(r,'market')||getMarket(symbol),direction,entry,stop,tp,exit,qty:parseMTNumber(get(r,'qty')),mult:null,
      riskPct:null,riskUsd:null,r:rVal,pnl:pnlV,pnlPct:null,fees,strategy:get(r,'strategy'),emotion:get(r,'emotion'),
      placedTime:normalizeClockTime(get(r,'placedTime')),
      openTime:normalizeClockTime(get(r,'openTime')||rawDate),
      exitTime:normalizeClockTime(get(r,'exitTime')||rawExitDate),
      emoBefore:'',emoAfter:'',followedPlan:'',planDeviation:'',errors:[],discipline:null,confidence:null,
      mistake:'',remarks:'',images:[],hesitation:false,resultType:pnlV==null?'':mtTradeStatus(pnlV),
      status:mtTradeStatus(pnlV),mode:'absolute',incomplete:missing.length>0,missing_fields:missing,
      createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  }
  return result;
}

function parseSpreadsheetRows(rows,filename='spreadsheet'){
  const mtRows=parseMT5Rows(rows,filename);
  return mtRows.length?mtRows:parseGenericTradeRows(rows,filename);
}

function parseMT5HTML(html,filename){
  const div=document.createElement('div');div.innerHTML=html;
  const allRows=[];
  div.querySelectorAll('tr').forEach(tr=>{const cells=[...tr.querySelectorAll('td,th')].map(c=>c.textContent.trim());if(cells.length>=10)allRows.push(cells);});
  return parseSpreadsheetRows(allRows,filename);
}

function handleMT5Result(result,prevEl){
  if(!result.length){if(prevEl)prevEl.innerHTML=`<div class="alert alert-warn">❌ Nenhum trade detectado. Verifique se é um relatório histórico válido (XLSX, HTML ou CSV).</div>`;return;}
  setPendingImport(prepareImportedTrades(result,{accountId:activeAccountId,seedLabel:'upload'}),{accountId:activeAccountId,source:'upload'});
  if(prevEl)prevEl.innerHTML=`<div class="alert alert-info">✓ ${result.length} trades detectados.</div>`;
  showImportPreview(pendingImport);openModal('csvConfirmModal');
}

function parseMT4Raw(text){
  const rows=text.split('\n').map(l=>l.trim().split(/\t|,/).map(c=>c.replace(/^"|"$/g,'')));
  return parseMT5Rows(rows,'text');
}

function showImportPreview(list){
  const ic=document.getElementById('importCount');if(ic)ic.textContent=String(list.length);
  const prev=document.getElementById('csvConfirmPreview');
  if(!prev)return;
  const inc=list.filter(t=>t.incomplete);
  const targetAccountId=getPendingImportAccountId();
  const target=accounts.find(a=>a.id===targetAccountId)?.name||'Conta ativa';
  prev.innerHTML=`<div class="alert alert-info">📊 ${list.length} trades detectados${inc.length?' · ⚠ '+inc.length+' incompletos':''} · conta alvo: <b>${escapeHtml(target)}</b></div>
    <div style="overflow-x:auto;max-height:280px;overflow-y:auto">
    <table class="tbl"><thead><tr><th>Data</th><th>Símbolo</th><th>Mercado</th><th>Dir</th><th>Entrada</th><th>Saída</th><th>P/L</th><th>Status</th></tr></thead>
    <tbody>${list.slice(0,80).map(t=>`<tr>
      <td class="mono">${fDate(t.date)}</td><td><b>${t.symbol}</b></td>
      <td style="font-size:10px">${t.market||'—'}</td>
      <td><span class="badge ${(t.direction||'').toLowerCase()}">${t.direction}</span></td>
      <td class="mono">${t.entry||'—'}</td><td class="mono">${t.exit||'—'}</td>
      <td class="mono ${(t.pnl||0)>0?'text-green':(t.pnl||0)<0?'text-red':''}">${t.pnl!=null?((t.pnl>=0?'+':'')+fR(t.pnl)):'—'}</td>
      <td><span class="badge ${(t.status||'open').toLowerCase()}">${t.status}</span></td>
    </tr>`).join('')}
    ${list.length>80?`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:8px">...e mais ${list.length-80} trades</td></tr>`:''}</tbody>
    </table></div>`;
}

function confirmImport(){
  const targetAccountId=getPendingImportAccountId();
  const existingPos=new Set(trades.map(t=>getTradeImportPositionKey(t,targetAccountId)).filter(Boolean));
  const existingIds=new Set(trades.map(t=>t.id));
  const seenPos=new Set();
  const seenIds=new Set();
  const newTrades=pendingImport.filter(t=>{
    const positionKey=getTradeImportPositionKey(t,targetAccountId);
    if(positionKey&&(existingPos.has(positionKey)||seenPos.has(positionKey)))return false;
    if(existingIds.has(t.id)||seenIds.has(t.id))return false;
    if(positionKey)seenPos.add(positionKey);
    seenIds.add(t.id);
    return true;
  });
  trades=[...newTrades,...trades];
  clearPendingImport();
  _incompleteBannerDismissed=false;
  save();closeModal('csvConfirmModal');refreshAll();
  const importedIncomplete=newTrades
    .filter(t=>t.incomplete)
    .sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  if(importedIncomplete.length){
    showAppNotice('Importação concluída',`✓ ${newTrades.length} trades importados · ${importedIncomplete.length} precisam ser completados. Abrindo editor...`);
    setTimeout(()=>{
      showPage('log');
      startBulkIncompleteFlow(importedIncomplete.map(t=>t.id));
    },600);
  } else {
    showAppNotice('Importação concluída','✓ '+newTrades.length+' trades importados!');
  }
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
function renderImagePreviews(){
  const preview=document.getElementById('t-images-preview');if(!preview)return;
  preview.innerHTML=tradeImages.map((img,i)=>`<div style="position:relative;display:inline-block"><img src="${img.dataUrl}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border2)" title="${img.name}"><button onclick="removeTradeImage(${i})" style="position:absolute;top:-4px;right:-4px;background:var(--red);border:none;border-radius:50%;width:16px;height:16px;color:white;font-size:10px">✕</button></div>`).join('');
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
  return {
    version:2,
    exportedAt:new Date().toISOString(),
    trades,
    config,
    preMarketData,
    accounts,
    activeAccountId,
    studyHubState,
  };
}

function summarizeBackupData(data){
  const src=(data&&typeof data==='object')?data:{};
  return {
    trades:Array.isArray(src.trades)?src.trades.length:0,
    accounts:Array.isArray(src.accounts)?src.accounts.length:0,
    preMarketDays:(src.preMarketData&&typeof src.preMarketData==='object'&&!Array.isArray(src.preMarketData))?Object.keys(src.preMarketData).length:0,
    documents:Array.isArray(src.config?.generalDocs)?src.config.generalDocs.length:0,
  };
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

function renderBackupSummary(data=createBackupPayload()){
  const el=document.getElementById('backupSummary');
  if(!el)return;
  el.textContent=t('backup.current','Backup atual')+': '+formatBackupSummary(data);
}

function validateBackupData(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Arquivo de backup inválido.');
  const keys=['trades','config','preMarketData','accounts','activeAccountId','studyHubState'];
  if(!keys.some(k=>Object.prototype.hasOwnProperty.call(data,k)))throw new Error('Arquivo não parece ser um backup do diário.');
}

function restoreBackupData(data){
  validateBackupData(data);
  if(Array.isArray(data.trades))trades=data.trades;
  if(data.config&&typeof data.config==='object')config=ensureDefaultStrategies({...config,...data.config});
  else config=ensureDefaultStrategies(config);
  if(data.preMarketData&&typeof data.preMarketData==='object'&&!Array.isArray(data.preMarketData))preMarketData=data.preMarketData;
  if(Array.isArray(data.accounts)&&data.accounts.length)accounts=data.accounts.map(normalizeAccount);
  if(data.activeAccountId)activeAccountId=data.activeAccountId;
  if(!activeAccountId&&accounts[0])activeAccountId=accounts[0].id;
  if(data.studyHubState)studyHubState=mergeStudyHubState(data.studyHubState);
  return summarizeBackupData(createBackupPayload());
}

function exposeJsonExport(){
  return JSON.stringify(createBackupPayload(),null,2);
}

function exportJSON(){
  const payload=createBackupPayload();
  renderBackupSummary(payload);
  const a=document.createElement('a');
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  a.href=url;
  a.download=`tradelog_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function importJSON(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      validateBackupData(data);
      renderBackupSummary(data);
      showAppConfirm('Importar backup completo',`Este backup contém: ${formatBackupSummary(data)}.\n\nRestaurar agora?`,()=>{
        restoreBackupData(data);
        save();refreshAll();renderBackupSummary(createBackupPayload());
        showAppNotice('Backup restaurado','Backup completo importado com sucesso.');
      },{confirmText:'Importar backup'});
    } catch(err){showAppNotice('Erro ao ler backup',err.message,{danger:true});}
  };
  r.readAsText(f);
}

const TRADE_CSV_HEADERS = TradeDiaryTradesCSV.TRADE_CSV_HEADERS;

function csvCell(value){
  return TradeDiaryTradesCSV.csvCell(value);
}

function buildTradesCSV(list=trades){
  return TradeDiaryTradesCSV.buildTradesCSV(list);
}

function downloadTextFile(content,filename,type='text/csv'){
  const a=document.createElement('a');
  const url=URL.createObjectURL(new Blob([content],{type}));
  a.href=url;
  a.download=filename;
  a.click();
  if(URL.revokeObjectURL)setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function normalizeExportSymbols(value){
  return String(value||'')
    .split(/[,\s;]+/)
    .map(s=>s.trim().toUpperCase())
    .filter(Boolean);
}

function getTradesForCustomExport(filters={}){
  const from=filters.from||filters.start||'';
  const to=filters.to||filters.end||'';
  const symbols=normalizeExportSymbols(filters.symbol||filters.symbols||'');
  const status=String(filters.status||'').trim().toUpperCase();
  const market=String(filters.market||'').trim();
  const accountId=String(filters.accountId||filters.account||'').trim();
  const source=accountId?getAccountTrades(accountId):getAccountTrades(activeAccountId);
  return source.filter(t=>{
    if(from&&(!t.date||t.date<from))return false;
    if(to&&(!t.date||t.date>to))return false;
    if(symbols.length&&!symbols.includes(String(t.symbol||'').toUpperCase()))return false;
    if(status&&String(t.status||'').toUpperCase()!==status)return false;
    if(market&&String(t.market||'')!==market)return false;
    return true;
  });
}

function readCustomExportFilters(){
  return {
    from:document.getElementById('exportStartDate')?.value||'',
    to:document.getElementById('exportEndDate')?.value||'',
    accountId:document.getElementById('exportAccount')?.value||'',
  };
}

function exportTradesCSV(list,baseName){
  const rows=Array.isArray(list)?list:[];
  if(!rows.length){showAppNotice('Exportar CSV','Nenhum trade encontrado para esses filtros.');return;}
  downloadTextFile(buildTradesCSV(rows),`${baseName}_${new Date().toISOString().split('T')[0]}.csv`,'text/csv;charset=utf-8');
}

function exportCSV(){
  exportTradesCSV(getAccountTrades(activeAccountId),'trades_todos');
}

function exportCSVCustom(){
  exportTradesCSV(getTradesForCustomExport(readCustomExportFilters()),'trades_personalizado');
}

function exportCSVMonth(){
  const now=new Date();
  const from=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const to=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`;
  exportTradesCSV(getTradesForCustomExport({from,to,accountId:activeAccountId}),'trades_mes');
}

function normalizeCSVRow(value){
  return String(value||'').trim().replace(/^"|"$/g,'');
}

function isBinarySpreadsheetText(text){
  return /^\s*PK[\x03\x05\x07]/.test(text)||text.includes('[Content_Types].xml')||text.includes('xl/workbook.xml');
}

function splitDelimitedRows(text){
  const lines=String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length);
  if(!lines.length)return[];
  const first=lines[0];
  const delimiter=first.includes(';')?';':first.includes('\t')?'\t':',';
  return lines.map(line=>line.split(delimiter).map(c=>normalizeCSVRow(c)));
}

function parseCSVText(text){
  if(!text||isBinarySpreadsheetText(text))return[];
  return parseSpreadsheetRows(splitDelimitedRows(text),'csv');
}

function handleCSVUpload(event){
  const files=Array.from(event.target.files||[]);
  if(!files.length)return;
  const f=files[0];
  const ext=f.name.toLowerCase().split('.').pop();
  const prev=document.getElementById('csvPreview');
  if(ext==='xlsx'){
    if(prev)prev.innerHTML=`<div class="alert alert-info">⏳ Processando ${f.name}...</div>`;
    loadSheetJS(()=>{const reader=new FileReader();reader.onload=ev=>{try{const wb=XLSX.read(ev.target.result,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:false});const prepared=prepareImportedTrades(parseSpreadsheetRows(rows,f.name),{accountId:activeAccountId,seedLabel:f.name});setPendingImport(prepared,{accountId:activeAccountId,source:'xlsx'});if(!pendingImport.length){if(prev)prev.innerHTML='<div class="alert alert-warn">Nenhum trade encontrado no XLSX.</div>';showAppNotice('Importação','Nenhum trade encontrado no XLSX.');return;}if(prev)prev.innerHTML=`<div class="alert alert-info">✓ ${pendingImport.length} trades detectados.</div>`;showImportPreview(pendingImport);openModal('csvConfirmModal');}catch(err){if(prev)prev.innerHTML=`<div class="alert alert-warn">❌ Erro: ${err.message}</div>`;}};reader.readAsArrayBuffer(f);});
    return;
  }
  const reader=new FileReader();
  reader.onload=ev=>{
    const prepared=prepareImportedTrades(parseCSVText(ev.target.result || ''),{accountId:activeAccountId,seedLabel:f.name});
    setPendingImport(prepared,{accountId:activeAccountId,source:'csv'});
    if(!pendingImport.length){showAppNotice('Importação','Nenhum trade encontrado no CSV.');return;}
    showImportPreview(pendingImport);openModal('csvConfirmModal');
  };
  reader.readAsText(f,'UTF-8');
}

function parseMT4(){
  const text=document.getElementById('mt4Input')?.value||'';
  if(!text.trim()){showAppNotice('Campo vazio','Cole o conteúdo do relatório histórico no campo.');return;}
  const result=prepareImportedTrades(parseMT4Raw(text),{accountId:activeAccountId,seedLabel:'mt4-text'});
  if(!result.length){showAppNotice('Importação','Nenhum trade detectado. Verifique o conteúdo.');return;}
  setPendingImport(result,{accountId:activeAccountId,source:'mt4'});
  showImportPreview(result);openModal('csvConfirmModal');
}

function switchImportTab(id){
  ['csv','export'].forEach(tab=>{
    const el=document.getElementById('importTab-'+tab);
    if(el)el.style.display=tab===id?'':'none';
  });
  document.querySelectorAll('#page-import .tab-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.getAttribute('onclick')?.includes(`'${id}'`));
  });
  if(id==='export'){renderBackupSummary(createBackupPayload());renderExportAccountFilter();}
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

function updateTopbarStats(options={}){
  const shouldFit=options.fit!==false;
  const a=getActiveAccount();
  const acctTrades=getAccountTrades(a.id);
  const risk=calcAccountRiskState(a,acctTrades);
  const now=new Date();
  const ws=new Date(now);ws.setDate(now.getDate()-now.getDay());
  const weekPnl=acctTrades.filter(t=>{if(!t.date)return false;return new Date(t.date+'T12:00')>=ws;}).reduce((s,t)=>s+(t.pnl||0),0);
  const monthPnl=acctTrades.filter(t=>{if(!t.date)return false;const d=new Date(t.date+'T12:00');return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();}).reduce((s,t)=>s+(t.pnl||0),0);
  const setSub=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  const pct=(v)=>risk.capitalBase?(v/risk.capitalBase)*100:0;
  setTopbarValue('tbWeek',{full:formatSignedMoney(weekPnl)},weekPnl>=0?'g':'r');
  setSub('tbWeekSub',formatTopbarSignedPct(pct(weekPnl),1));
  setTopbarValue('tbMonth',{full:formatSignedMoney(monthPnl)},monthPnl>=0?'g':'r');
  setSub('tbMonthSub',formatTopbarSignedPct(pct(monthPnl),1));
  setTopbarValue('tbDD',{full:fR(risk.currentDdUsd)},risk.currentDdUsd>0?'r':'g');
  setSub('tbDDSub',`${(risk.currentDdPct*100).toFixed(1)}%`);
  const goalDonePct=risk.goalTarget>0?clamp(risk.totalPnl/risk.goalTarget*100,0,100):0;
  const goalCfg=topbarGoalPctLabel(a.goalPct||0);
  setTopbarValue('tbGoal',{full:`${goalDonePct.toFixed(0)}%`},goalDonePct>=100?'g':'y');
  setSub('tbGoalSub',`${fR(Math.max(risk.totalPnl,0))}/${fR(risk.goalTarget)}`);
  setTopbarValue('topBadge',{full:fR(risk.currentBalance)},risk.totalPnl>=0?'green':'red','tb-badge');
  if(shouldFit)fitTopbarDensity();
}

function newAccount(){
  editingAccountId=null;
  accountFormCashflows=[];
  document.getElementById('acctFormTitle').textContent='Nova Conta';
  ['af-name','af-balance','af-risk','af-mult','af-dd-daily','af-dd-weekly','af-dd-monthly','af-dd-total','af-goal','af-goal-week','af-goal-month','af-goal-total','af-flow-amount','af-flow-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('af-type').value='cfd_pct';
  document.getElementById('af-color').value='#22d5ed';
  const flowDate=document.getElementById('af-flow-date');if(flowDate)flowDate.value=new Date().toISOString().split('T')[0];
  document.getElementById('accountForm').style.display='block';
  renderAccountCashflowList();
}

function editAccount(id){
  const a=accounts.find(x=>x.id===id);if(!a)return;
  editingAccountId=id;
  accountFormCashflows=getAccountCashflows(a).map(flow=>({...flow}));
  document.getElementById('acctFormTitle').textContent='Editar Conta';
  const set=(el,v)=>{const e=document.getElementById(el);if(e&&v!=null)e.value=v;};
  set('af-name',a.name);set('af-type',a.type);set('af-color',a.color);
  set('af-balance',a.balance);set('af-risk',a.risk);set('af-mult',a.mult);
  set('af-dd-daily',a.ddDaily);set('af-dd-weekly',a.ddWeekly);set('af-dd-monthly',a.ddMonthly);set('af-dd-total',a.ddTotal);
  set('af-goal',a.goalPct);set('af-goal-week',a.goalWeek);set('af-goal-month',a.goalMonth);set('af-goal-total',a.goalTotal);
  const flowDate=document.getElementById('af-flow-date');if(flowDate&&!flowDate.value)flowDate.value=new Date().toISOString().split('T')[0];
  document.getElementById('accountForm').style.display='block';
  renderAccountCashflowList();
}

function addAccountCashflowFromForm(){
  const entry=sanitizeAccountCashflow({
    type:document.getElementById('af-flow-type')?.value||'deposit',
    date:document.getElementById('af-flow-date')?.value||new Date().toISOString().split('T')[0],
    amount:document.getElementById('af-flow-amount')?.value||0,
    note:document.getElementById('af-flow-note')?.value||'',
  });
  if(!entry){showAppNotice('Movimento inválido','Informe um valor maior que zero.');return;}
  accountFormCashflows.push(entry);
  const amount=document.getElementById('af-flow-amount');if(amount)amount.value='';
  const note=document.getElementById('af-flow-note');if(note)note.value='';
  renderAccountCashflowList();
}

function removeAccountFormCashflow(index){
  accountFormCashflows.splice(index,1);
  renderAccountCashflowList();
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

function onAcctTypeChange(){
  const t=document.getElementById('af-type')?.value;
  const u=document.getElementById('af-risk-unit');
  const m=document.getElementById('af-mult');
  if(u)u.textContent=t==='futures_usd'?'$':'%';
  if(m)m.parentElement.style.display=t==='futures_usd'?'block':'none';
}

function onAccountChange(){
  const selId=document.getElementById('t-account')?.value;
  const a=accounts.find(x=>x.id===selId)||getActiveAccount();
  const rp=document.getElementById('t-riskpct');if(rp)rp.value=a.risk;
  const mp=document.getElementById('t-mult');if(mp)mp.value=a.mult||1;
  const pEl=document.getElementById('modePercentFields');
  const aEl=document.getElementById('modeAbsFields');
  if(pEl)pEl.style.display=isFuturesAccount(a)?'none':'';
  if(aEl)aEl.style.display=isFuturesAccount(a)?'':'none';
  const infoEl=document.getElementById('t-acct-info');
  if(infoEl){const acctTrades=getAccountTrades(a.id);const risk=calcAccountRiskState(a,acctTrades);infoEl.innerHTML=`<span style="color:var(--muted)">Saldo: <b style="color:var(--text)">${fR(risk.currentBalance)}</b></span><br><span style="color:var(--muted)">Aportes líquidos: ${fR(risk.cashflowNet)} · Meta: ${a.goalPct}%</span>`;}
  calcRR();
}

function onStatsAccountChange(){
  statsAccountPinned=true;
  renderStats();
}

function updateMarketFromSymbol(){
  const sym=document.getElementById('t-symbol')?.value;
  const mkt=getMarket(sym);
  const sel=document.getElementById('t-market');if(sel&&mkt)sel.value=mkt;
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

let _incompleteBannerDismissed=false;

function updateIncompleteBanner(){
  const count=getAccountTrades(activeAccountId).filter(t=>t.incomplete).length;
  const el=document.getElementById('incompleteAlert');
  const countEl=document.getElementById('incompleteCount');
  if(el)el.style.display=count&&!_incompleteBannerDismissed?'block':'none';
  if(countEl)countEl.textContent=count;
}

function dismissIncompleteBanner(){
  _incompleteBannerDismissed=true;
  updateIncompleteBanner();
}

function refreshAll(){
  const active=document.querySelector('.page.active');
  const id=active?.id?.replace('page-','')||'dashboard';
  ({dashboard:renderDashboard,log:renderLog,calendar:renderCalendar,stats:renderStats,psych:renderPsych,setup:renderSetup,premarket:renderPremarket,strategyHub:renderStrategyHub,studyHub:renderStudyHub,documents:renderDocumentsPage,notifications:renderNotificationsPage,accounts:renderAccountsPage,partners:renderPartnersPage,profile:renderProfilePage}[id]||(() => {}))();
  const a=getActiveAccount();
  syncAccountBalanceChrome(a,getAccountTrades(a.id));
  updateTopbarStats();
  updateIncompleteBanner();
}

function toggleSidebar(force){
  const sidebar=document.getElementById('sidebar');
  const overlay=document.getElementById('sidebar-overlay');
  if(!sidebar||!overlay)return;
  const nextState=typeof force==='boolean' ? force : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open',nextState);
  overlay.classList.toggle('show',nextState);
}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('onclick')?.includes("'"+id+"'"))n.classList.add('active');});
  if(id==='dashboard'){const sel=document.getElementById('dashPeriod');if(sel)sel.value='all';}
  if(id==='stats'&&document.getElementById('statTab-simulation')?.style.display==='block')resetSimulationEntryDefaults();
  ({dashboard:renderDashboard,log:renderLog,calendar:renderCalendar,stats:renderStats,psych:renderPsych,setup:renderSetup,premarket:renderPremarket,strategyHub:renderStrategyHub,studyHub:renderStudyHub,documents:renderDocumentsPage,notifications:renderNotificationsPage,accounts:renderAccountsPage,partners:renderPartnersPage,profile:renderProfilePage}[id]||(() => {}))();
  toggleSidebar(false);
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

function buildTickmillDemoImport(){
  const account=ensureTickmillAccount();
  return buildSampleTrades(account.id).slice(0,40).map((trade,index)=>({
    ...trade,
    id:`tickmill-demo-${index+1}`,
    positionId:`tickmill-demo-${index+1}`,
    accountId:account.id,
  }));
}

function loadTickmillDemoImport(){
  const account=ensureTickmillAccount();
  activeAccountId=account.id;
  setPendingImport(buildTickmillDemoImport(),{accountId:account.id,source:'tickmill-demo'});
  save();
  renderTopbarAccount();
  updateTopbarStats();
  showImportPreview(pendingImport);
  openModal('csvConfirmModal');
}

function buildSampleTrades(accountId=activeAccountId, baseDateStr=new Date().toISOString().split('T')[0]){
  const sampleTradeCount=300;
  const account=accounts.find(a=>a.id===accountId)||getActiveAccount();
  const baseBalance=account?.balance||config.balance||1000;
  const seedText=`${accountId}|${baseDateStr}|mukas-sample-trades`;
  let seed=0;
  for(let i=0;i<seedText.length;i++)seed=(seed*31+seedText.charCodeAt(i))>>>0;
  const rnd=()=>{
    seed=(seed*1664525+1013904223)>>>0;
    return seed/4294967296;
  };
  const pick=arr=>arr[Math.floor(rnd()*arr.length)%arr.length];
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const round=(value,symbol)=>{
    const digits=['EURUSD','GBPUSD'].includes(symbol)?5:['USDJPY','XAUUSD'].includes(symbol)?2:2;
    return parseFloat(Number(value).toFixed(digits));
  };
  const toDate=offset=>{
    const d=new Date(baseDateStr+'T12:00:00');
    d.setDate(d.getDate()+offset);
    return d.toISOString().slice(0,10);
  };
  const clampMinutes=minutes=>Math.max(0,Math.min(minutes,23*60+59));
  const buildSampleClockBundle=(strategy,market,status)=>{
    const strategyName=normalizeLooseText(strategy);
    let base=market==='Crypto'?10*60:market==='Forex'?8*60+30:market==='B3'?9*60+10:9*60+30;
    if(strategyName.includes('vwap'))base=market==='Crypto'?9*60+40:market==='Forex'?8*60:9*60+28;
    else if(strategyName.includes('impulso'))base+=20;
    else if(strategyName.includes('brooks'))base+=42;
    const placed=clampMinutes(base-(2+Math.floor(rnd()*12)));
    const opened=clampMinutes(base+Math.floor(rnd()*18));
    const duration=status==='WIN'
      ? 6+Math.floor(rnd()*26)
      : status==='LOSS'
        ? 4+Math.floor(rnd()*28)
        : 3+Math.floor(rnd()*16);
    const exited=clampMinutes(opened+duration);
    return{
      placedTime:formatClockMinutes(placed),
      openTime:formatClockMinutes(opened),
      exitTime:formatClockMinutes(exited),
    };
  };
  const symbolProfiles={
    US30:{base:38200,riskPts:55,qty:1,market:'EUA'},
    US500:{base:5150,riskPts:12,qty:1,market:'EUA'},
    USTEC:{base:18350,riskPts:34,qty:1,market:'EUA'},
    US2000:{base:2040,riskPts:8,qty:1,market:'EUA'},
    EURUSD:{base:1.075,riskPts:0.0022,qty:0.2,market:'Forex'},
    GBPUSD:{base:1.25,riskPts:0.0026,qty:0.2,market:'Forex'},
    USDJPY:{base:155.2,riskPts:0.28,qty:0.2,market:'Forex'},
    XAUUSD:{base:2390,riskPts:5.5,qty:0.1,market:'Forex'},
    BTCUSD:{base:64500,riskPts:650,qty:0.05,market:'Crypto'},
    ETHUSD:{base:3150,riskPts:46,qty:0.4,market:'Crypto'},
  };
  const symbols=Object.keys(symbolProfiles);
  const strategies=[...new Set([...DEFAULT_STRATEGIES,'Al Brooks','Halt Vwap'])];
  const emotions=['Tranquilidade','Neutralidade','Medo','Frustração','Euforia','Clareza mental','FOMO','Raiva','Culpa'];
  const beforeEmotions=['Tranquilidade','Neutralidade','Medo','FOMO','Euforia','Frustração','Clareza mental'];
  const afterByStatus={
    WIN:['Tranquilidade','Clareza mental','Alívio','Neutralidade'],
    LOSS:['Frustração','Culpa','Raiva','Medo'],
    BE:['Alívio','Neutralidade','Tranquilidade'],
  };
  const remarksByStatus={
    WIN:['Gatilho respeitado, gestão controlada e saída coerente com o plano.','Entrada com contexto favorável e execução limpa após confirmação.','Trade bom para estudar repetição de setup vencedor.'],
    LOSS:['Perda útil para revisar execução, risco e reação emocional.','Setup falhou e evidenciou ponto de melhoria no processo.','Trade negativo incluído para testar drawdown e análise de erros.'],
    BE:['Trade protegido cedo, bom para revisar gestão e saída no zero.','Operação sem direção suficiente, encerrada perto do breakeven.','Resultado neutro para comparar disciplina e hesitação.'],
  };
  const specs=[
    {date:-9,symbol:'US500',market:'EUA',direction:'Long',entry:5120.25,stop:5108.25,tp:5144.25,exit:5141.25,qty:1,riskUsd:20,r:1.75,fees:1.8,strategy:'Al Brooks',emotion:'Clareza mental',emoBefore:'Neutralidade',emoAfter:'Tranquilidade',followedPlan:'sim',planDeviation:'',errors:[],discipline:92,confidence:84,hesitation:false,remarks:'Gatilho de pullback claro, entrada no reteste e saída parcial perto da região de liquidez.'},
    {date:-8,symbol:'USTEC',market:'EUA',direction:'Short',entry:18240.5,stop:18272.5,tp:18176.5,exit:18272.5,qty:1,riskUsd:22,r:-1,fees:2.2,strategy:'Halt Vwap',emotion:'Frustração',emoBefore:'Ansiedade',emoAfter:'Frustração',followedPlan:'parcial',planDeviation:'Antecipou confirmação do candle.',errors:['Entrou sem gatilho','FOMO'],discipline:48,confidence:62,hesitation:false,remarks:'Contexto era bom, mas a entrada veio antes do fechamento. Loss de processo.'},
    {date:-7,symbol:'GBPUSD',market:'Forex',direction:'Long',entry:1.2512,stop:1.2492,tp:1.2552,exit:1.2528,qty:0.2,riskUsd:16,r:0.8,fees:0.8,strategy:'PIVÔ Al Brooks',emotion:'Neutralidade',emoBefore:'Tranquilidade',emoAfter:'Alívio',followedPlan:'sim',planDeviation:'',errors:[],discipline:84,confidence:72,hesitation:false,remarks:'Trade menor após notícia. Gestão conservadora, parcial rápida e stop protegido.'},
    {date:-6,symbol:'US30',market:'EUA',direction:'Long',entry:38120,stop:38070,tp:38220,exit:38220,qty:1,riskUsd:25,r:2,fees:2.4,strategy:'Setup VWAP (Rompimento)',emotion:'Tranquilidade',emoBefore:'Clareza mental',emoAfter:'Tranquilidade',followedPlan:'sim',planDeviation:'',errors:[],discipline:96,confidence:88,hesitation:false,remarks:'Rompimento com volume e VWAP sustentando. Trade executado dentro do plano.'},
    {date:-5,symbol:'XAUUSD',market:'Forex',direction:'Short',entry:2386.2,stop:2391.2,tp:2376.2,exit:2386.2,qty:0.1,riskUsd:18,r:0,fees:1.1,strategy:'Al Brooks',emotion:'Medo',emoBefore:'Medo',emoAfter:'Alívio',followedPlan:'sim',planDeviation:'',errors:['Saí cedo'],discipline:70,confidence:58,hesitation:true,remarks:'Houve hesitação na gestão e saída no zero. Registrar para comparar com o alvo original.'},
    {date:-4,symbol:'EURUSD',market:'Forex',direction:'Long',entry:1.0724,stop:1.0704,tp:1.0764,exit:1.0704,qty:0.2,riskUsd:20,r:-1,fees:0.9,strategy:'PIVÔ Al Brooks',emotion:'Culpa',emoBefore:'FOMO',emoAfter:'Culpa',followedPlan:'nao',planDeviation:'Entrou fora do horário planejado.',errors:['Fora do horário','Revenge trade'],discipline:32,confidence:45,hesitation:false,remarks:'Trade tomado para recuperar perda anterior. Deve entrar na revisão de rotina.'},
    {date:-3,symbol:'BTCUSD',market:'Crypto',direction:'Long',entry:64200,stop:63600,tp:65400,exit:64920,qty:0.05,riskUsd:30,r:1.2,fees:3.2,strategy:'Halt Vwap',emotion:'Neutralidade',emoBefore:'Neutralidade',emoAfter:'Clareza mental',followedPlan:'sim',planDeviation:'',errors:[],discipline:86,confidence:76,hesitation:false,remarks:'Entrada menor por volatilidade. Parcial saiu bem e protegeu contra devolução.'},
    {date:-2,symbol:'US500',market:'EUA',direction:'Short',entry:5168.5,stop:5180.5,tp:5144.5,exit:5180.5,qty:1,riskUsd:20,r:-1,fees:1.8,strategy:'Trade de Impulso',emotion:'Raiva',emoBefore:'Frustração',emoAfter:'Raiva',followedPlan:'nao',planDeviation:'Aumentou agressividade após stop anterior.',errors:['Aumentou lote no prejuízo','Não aceitou stop'],discipline:24,confidence:70,hesitation:false,remarks:'Sinal de risco emocional. Encerrar sessão depois desse tipo de leitura.'},
    {date:-1,symbol:'USTEC',market:'EUA',direction:'Long',entry:18310,stop:18280,tp:18370,exit:18358,qty:1,riskUsd:24,r:1.6,fees:2.1,strategy:'Al Brooks',emotion:'Tranquilidade',emoBefore:'Neutralidade',emoAfter:'Tranquilidade',followedPlan:'sim',planDeviation:'',errors:[],discipline:90,confidence:82,hesitation:false,remarks:'Boa espera pelo gatilho, stop técnico respeitado e saída antes da resistência maior.'},
    {date:-1,symbol:'XAUUSD',market:'Forex',direction:'Long',entry:2398.5,stop:2393.5,tp:2408.5,exit:2395,qty:0.1,riskUsd:26,r:-0.7,fees:1.2,strategy:'Halt VWAP (André)',emotion:'Medo',emoBefore:'Neutralidade',emoAfter:'Frustração',followedPlan:'parcial',planDeviation:'Ajustou saída durante candle ainda aberto.',errors:['Saí cedo','Hesitação na execução'],discipline:58,confidence:64,hesitation:true,remarks:'Setup ainda válido, mas a gestão ficou defensiva após candle contra. Útil para revisar hesitação em loss.'},
    {date:0,symbol:'US30',market:'EUA',direction:'Short',entry:38240,stop:38290,tp:38140,exit:38310,qty:1,riskUsd:25,r:-1.4,fees:2.6,strategy:'Trade de Impulso',emotion:'Raiva',emoBefore:'Frustração',emoAfter:'Culpa',followedPlan:'nao',planDeviation:'Insistiu no short após stop técnico e aceitou slippage pior.',errors:['Não aceitou stop','Aumentou lote no prejuízo','Overtrade'],discipline:18,confidence:78,hesitation:false,remarks:'Trade simulado para testar estouro de DD diário: perda acima do risco planejado e quebra clara de processo.'},
    {date:0,symbol:'USTEC',market:'EUA',direction:'Long',entry:18420,stop:18390,tp:18480,exit:18396,qty:1,riskUsd:30,r:-0.8,fees:2.2,strategy:'Halt Vwap',emotion:'FOMO',emoBefore:'Euforia',emoAfter:'Frustração',followedPlan:'nao',planDeviation:'Entrou por medo de perder movimento depois de loss anterior.',errors:['FOMO','Entrou sem gatilho','Operou cansado'],discipline:22,confidence:68,hesitation:false,remarks:'Segundo loss do dia para validar alertas de DD, rotina emocional e análise de erros cometidos.'},
    {date:0,symbol:'BTCUSD',market:'Crypto',direction:'Short',entry:64800,stop:65100,tp:64200,exit:64710,qty:0.05,riskUsd:18,r:0.3,fees:2.9,strategy:'Al Brooks',emotion:'Neutralidade',emoBefore:'Culpa',emoAfter:'Alívio',followedPlan:'sim',planDeviation:'',errors:['Take profit cedo'],discipline:74,confidence:56,hesitation:false,remarks:'Trade pequeno depois do DD. Seguiu plano de reduzir agressividade, mas saiu cedo antes do alvo principal.'},
  ];
  const generated=[];
  for(let i=specs.length;i<sampleTradeCount;i++){
    const symbol=pick(symbols);
    const profile=symbolProfiles[symbol];
    const direction=rnd()>0.48?'Long':'Short';
    const statusRoll=rnd();
    const status=statusRoll<0.48?'WIN':statusRoll<0.93?'LOSS':'BE';
    const r=status==='WIN'
      ? parseFloat((0.35+rnd()*2.4).toFixed(2))
      : status==='LOSS'
        ? parseFloat((-(0.35+rnd()*1.35)).toFixed(2))
        : parseFloat(((rnd()-0.5)*0.16).toFixed(2));
    const date=-Math.floor(i/2);
    const drift=1+(rnd()-0.5)*0.04;
    const entry=round(profile.base*drift,symbol);
    const riskPts=profile.riskPts*(0.75+rnd()*0.65);
    const stop=round(direction==='Long'?entry-riskPts:entry+riskPts,symbol);
    const targetR=Math.max(1.2,Math.abs(r)+0.55);
    const tp=round(direction==='Long'?entry+riskPts*targetR:entry-riskPts*targetR,symbol);
    const exit=round(direction==='Long'?entry+riskPts*r:entry-riskPts*r,symbol);
    const followedPlan=status==='WIN'
      ? (rnd()>0.18?'sim':'parcial')
      : status==='LOSS'
        ? (rnd()>0.62?'sim':rnd()>0.38?'parcial':'nao')
        : (rnd()>0.25?'sim':'parcial');
    const errors=[];
    if(followedPlan!=='sim'||status==='LOSS'||rnd()<0.18){
      const count=followedPlan==='nao'?2:1;
      for(let j=0;j<count;j++){
        const err=pick(DEFAULT_TRADE_ERRORS);
        if(!errors.includes(err))errors.push(err);
      }
    }
    const discipline=followedPlan==='sim'
      ? Math.round(clamp(70+rnd()*27-(status==='LOSS'?10:0),0,100))
      : followedPlan==='parcial'
        ? Math.round(45+rnd()*35)
        : Math.round(15+rnd()*40);
    const riskUsd=parseFloat((12+rnd()*28).toFixed(2));
    generated.push({
      date,
      symbol,
      market:profile.market,
      direction,
      entry,
      stop,
      tp,
      exit,
      qty:profile.qty,
      riskUsd,
      r,
      fees:parseFloat((0.6+rnd()*3.4).toFixed(2)),
      strategy:pick(strategies),
      emotion:pick(emotions),
      emoBefore:pick(beforeEmotions),
      emoAfter:pick(afterByStatus[status]),
      followedPlan,
      planDeviation:followedPlan==='sim'?'':pick(['Entrou antes da confirmação.','Saiu antes do alvo por desconforto.','Aumentou agressividade depois de perda.','Reduziu posição fora do plano original.']),
      errors,
      discipline,
      confidence:Math.round(clamp(42+rnd()*48+(status==='WIN'?8:0),0,100)),
      hesitation:rnd()<0.2||errors.includes('Hesitação na execução'),
      remarks:pick(remarksByStatus[status]),
    });
  }
  return [...specs,...generated].slice(0,sampleTradeCount).map((s,i)=>{
    const pnl=parseFloat((s.r*s.riskUsd).toFixed(2));
    const status=s.r>0?'WIN':s.r<0?'LOSS':'BE';
    const timing=buildSampleClockBundle(s.strategy,s.market,status);
    return {
      id:uid(),
      accountId,
      symbol:s.symbol,
      date:toDate(s.date),
      exitDate:toDate(s.date),
      placedTime:normalizeClockTime(s.placedTime)||timing.placedTime,
      openTime:normalizeClockTime(s.openTime)||timing.openTime,
      exitTime:normalizeClockTime(s.exitTime)||timing.exitTime,
      market:s.market,
      direction:s.direction,
      entry:s.entry,
      stop:s.stop,
      tp:s.tp,
      exit:s.exit,
      qty:s.qty,
      mult:null,
      riskPct:parseFloat((s.riskUsd/baseBalance*100).toFixed(2)),
      riskUsd:s.riskUsd,
      r:s.r,
      pnl,
      pnlPct:parseFloat((pnl/baseBalance).toFixed(4)),
      fees:s.fees,
      strategy:s.strategy,
      emotion:s.emotion,
      emoBefore:s.emoBefore,
      emoAfter:s.emoAfter,
      followedPlan:s.followedPlan,
      planDeviation:s.planDeviation,
      errors:[...s.errors],
      discipline:s.discipline,
      confidence:s.confidence,
      mistake:s.errors[0]||'',
      remarks:s.remarks,
      images:[],
      hesitation:s.hesitation,
      resultType:status,
      status,
      mode:'percent',
      incomplete:false,
      missing_fields:[],
      createdAt:new Date(new Date(baseDateStr+'T12:00:00').getTime()-(specs.length-i)*3600000).toISOString(),
      updatedAt:new Date().toISOString(),
    };
  });
}

function ensureSampleStrategies(){
  ['Al Brooks','Halt Vwap'].forEach(name=>{
    if(!config.strategies.some(s=>normalizeStrategyName(s)===normalizeStrategyName(name))){
      config.strategies.push(name);
    }
  });
}

function loadSampleData(){
  ensureSampleStrategies();
  trades.push(...buildSampleTrades(activeAccountId));
  save();
}

function addSampleTrades(){
  if(showLogAccountEditLockNotice('adicionar'))return;
  const acct=getActiveAccount();
  showAppConfirm('Adicionar dados demo','Adicionar 300 trades simulados na conta atual para testar análises, psicológico, taxas, estratégias e estouro de DD?',()=>{
    ensureSampleStrategies();
    trades.unshift(...buildSampleTrades(acct.id));
    save();refreshAll();
    showAppNotice('Dados demo adicionados','300 trades simulados foram adicionados ao histórico.');
  },{confirmText:'Adicionar'});
}

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

function renderTags(type){
  const el=document.getElementById(type+'Tags');if(!el)return;
  if(type==='strategy')config=ensureDefaultStrategies(config);
  const key=tagConfigKey(type);
  if(!Array.isArray(config[key]))config[key]=[];
  const items=config[key];
  if(type==='strategy'){
    el.innerHTML=items.map((t,i)=>{
      const count=strategyUsageCount(t);
      const title=count?`Excluir da lista (${count} trade(s) usam esta estratégia)`:'Excluir da lista';
      return`<div class="tag strategy-tag"><span>${escapeHtml(t)}</span>${count?`<span class="tag-count">${count}</span>`:''}<button class="tag-edit-btn" onclick="editStrategy(${i})" title="Editar" aria-label="Editar ${escapeHtml(t)}">✎</button><button class="tag-delete-btn" onclick="deleteStrategy(${i})" title="${escapeHtml(title)}" aria-label="Excluir ${escapeHtml(t)}">×</button></div>`;
    }).join('');
  } else {
    el.innerHTML=items.map((t,i)=>`<div class="tag"><span>${escapeHtml(t)}</span><button class="tag-delete-btn" onclick="removeTag('${type}',${i})" title="Excluir" aria-label="Excluir ${escapeHtml(t)}">×</button></div>`).join('');
  }
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

function save(){
  localStorage.setItem('tl_trades',JSON.stringify(trades));
  localStorage.setItem('tl_config',JSON.stringify(config));
  localStorage.setItem('tl_pm',JSON.stringify(preMarketData));
  localStorage.setItem('tl_accounts',JSON.stringify(accounts));
  localStorage.setItem('tl_activeAccount',activeAccountId);
  localStorage.setItem('tl_studyhub',JSON.stringify(studyHubState));
}

function recomputeAllIncomplete(){
  trades=trades.map(trade=>{
    const missing=calcImportMissingFields(trade,trade.status);
    const incomplete=missing.length>0;
    if(incomplete===!!trade.incomplete&&JSON.stringify(missing)===JSON.stringify(trade.missing_fields||[]))return trade;
    return {...trade,incomplete,missing_fields:missing};
  });
}

function load(){
  try{
    const t=localStorage.getItem('tl_trades'),c=localStorage.getItem('tl_config');
    const pm=localStorage.getItem('tl_pm');
    const ac=localStorage.getItem('tl_accounts'),ai=localStorage.getItem('tl_activeAccount');
    const sh=localStorage.getItem('tl_studyhub');
    if(t)trades=JSON.parse(t);
    if(c)config={...config,...JSON.parse(c)};
    config=ensureDefaultStrategies(config);
    config=ensurePartnerHubConfig(config);
    if(pm)preMarketData=JSON.parse(pm);
    if(ac)accounts=JSON.parse(ac).map(normalizeAccount);
    if(ai)activeAccountId=ai;
    if(sh){
      studyHubState=mergeStudyHubState(JSON.parse(sh));
    }
    recomputeAllIncomplete();
  }catch(e){}
}

window.addEventListener('load',()=>{
  load();
  if(!trades.length)loadSampleData();
  else save();
  if(!accounts||!accounts.length)accounts=[{id:'default',name:'Conta Principal',type:'cfd_pct',color:'#22d5ed',balance:1000,risk:1,mult:1,ddDaily:2,ddWeekly:5,ddMonthly:8,ddTotal:10,goalPct:10,goalWeek:200,goalMonth:500,goalTotal:2000}];
  accounts=accounts.map(normalizeAccount);
  if(!Array.isArray(config.generalDocs))config.generalDocs=[
    {id:'playbook',title:'Playbook operacional',content:`# Playbook Operacional

## Regras de entrada
- Aguardar fechamento do candle de confirmação
- Setup deve estar alinhado com o contexto da sessão
- Não operar contra a tendência principal sem confluência clara

## Regras de saída
- Respeitar o stop definido antes da entrada
- Parcial no primeiro alvo (1R); stop no breakeven após 1.5R
- Não mover stop contra a posição

## Gestão de risco
- Máximo 1-2% de risco por trade
- Parar operações ao atingir o stop diário
- Revisar semana ao atingir 50% do stop semanal

## Revisão pós-trade
- Registrar emoção, contexto e lição em cada operação
- Revisar trades da semana todo sábado
- Atualizar este playbook mensalmente`,images:[],updatedAt:new Date().toISOString()},
    {id:'risk-map',title:'Mapa de risco',content:`# Mapa de Risco

## Limites por sessão
- **Stop diário:** 2% do capital — parar imediatamente ao atingir
- **Meta diária:** 1% do capital — reduzir tamanho após atingir

## Limites semanais
- **Stop semanal:** 5% do capital
- **Meta semanal:** definida na rotina de pré-mercado

## Limites mensais
- **Stop mensal:** 8% do capital
- **Drawdown máximo:** 10% — parar e revisar o processo

## Regras de escalonamento
- Aumentar lote apenas após 20 trades consecutivos dentro dos limites
- Reduzir lote após 3 stops consecutivos
- Nunca dobrar posição para recuperar perda`,images:[],updatedAt:new Date().toISOString()},
  ];
  // Remove docs gerais criados em branco automaticamente (sem conteúdo e sem título customizado)
  if(Array.isArray(config.generalDocs)){
    config.generalDocs=config.generalDocs.filter(doc=>
      (doc.content||'').trim()||['playbook','risk-map'].includes(doc.id)
    );
  }
  config=ensurePartnerHubConfig(config);
  if(!activeAccountId)activeAccountId=accounts[0].id;
  window.addEventListener('resize',()=>{if(window.innerWidth>1080)toggleSidebar(false);fitTopbarDensity();});
  syncCalPicker();
  renderTopbarAccount();
  updateTopbarStats();
  renderDashboard();
  updateIncompleteBanner();
  initLanguageSelector();
  initCotacao();
});

// ══════════════════════════════════════════════
// SISTEMA DE IDIOMAS (i18n)
// ══════════════════════════════════════════════
let currentLanguage = localStorage.getItem('appLanguage') || 'pt-BR';

// ══════════════════════════════════════════════
// COTAÇÃO USD/BRL
// ══════════════════════════════════════════════
let cotacaoAtual = parseFloat(localStorage.getItem('appCotacao') || '5.80');
let cotacaoInterval = null;

function setCotacao(value) {
  const v = parseFloat(value);
  if (!v || v < 1) return;
  cotacaoAtual = parseFloat(v.toFixed(2));
  localStorage.setItem('appCotacao', cotacaoAtual);

  // Sincroniza input do topbar
  const input = document.getElementById('cotInput');
  if (input) input.value = cotacaoAtual.toFixed(2);

  const hubCot = document.getElementById('hubCot');
  if (hubCot) hubCot.value = cotacaoAtual.toFixed(2);
  const hubBadge = document.getElementById('hubCotBadge');
  if (hubBadge) hubBadge.textContent = `R$ ${cotacaoAtual.toFixed(2)}`;
  if (typeof window.sh_hubSetCot === 'function') window.sh_hubSetCot(cotacaoAtual);
  else if (typeof window.hubSetCot === 'function') window.hubSetCot(cotacaoAtual);
}

async function fetchCotacao() {
  const btn = document.getElementById('cotRefreshBtn');
  if (btn) btn.classList.add('spinning');
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const d = await r.json();
    const rate = parseFloat(d.USDBRL.bid);
    if (rate && rate > 1) setCotacao(rate);
  } catch (e) {
    // mantém valor anterior silenciosamente
  } finally {
    if (btn) btn.classList.remove('spinning');
  }
}

function initCotacao() {
  // Restaura valor salvo
  const input = document.getElementById('cotInput');
  if (input) input.value = cotacaoAtual.toFixed(2);

  // Busca imediatamente
  fetchCotacao();

  // Atualiza a cada 5 minutos
  cotacaoInterval = setInterval(fetchCotacao, 5 * 60 * 1000);
}

/* BEGIN STUDYHUB INTEGRATED BUNDLE */
(() => {
  const host = document.getElementById('studyHubLegacyApp');
  if (!host || host.dataset.loaded === '1') return;
  host.classList.add('embed-mode');
  host.innerHTML = "<!-- ──────────── MÓDULO 0: PROPFIRM ──────────── -->\n<div class=\"hub-module active\" id=\"mod-propfirm\">\n<input type=\"hidden\" id=\"gCot\" value=\"5.80\"><span id=\"cotBadge\" style=\"display:none\">R$ 5,80</span>\n<div id=\"pf-app\">\n\n<!-- TABS -->\n<div class=\"tabs-nav\">\n  <button class=\"tab-btn active\" onclick=\"sh_pfTab(0)\">📊 Simulador</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(1)\">📋 Multi-Payout</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(2)\">🧮 Calculadora</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(3)\">💼 Grandes Contas</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(4)\">🎯 2 Fases</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(5)\">🎯 1 Fase</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(6)\">🎯 Instant</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(7)\">📅 RRR Unificado</button>\n</div>\n\n<!-- ══════════════════════ ABA 0: SIMULADOR ══════════════════════ -->\n<div class=\"tab-panel active\" id=\"pf-tab0\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">🏆 Simulador de Payouts — Prop Firms</div>\n      <button class=\"btn primary\" onclick=\"sh_calcSimulador()\">▶ Calcular</button>\n    </div>\n    <div class=\"sec-body\">\n      <!-- Parâmetros principais -->\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital total da conta prop. Base de cálculo para todos os limites e metas em percentual.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_conta\" value=\"100000\" oninput=\"sh_calcSimulador()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro bruto que a prop repassa ao trader. Ex: 80% significa que de cada $100 de lucro, você recebe $80 antes de IR e taxas.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_payout\" value=\"80\" step=\"1\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo %</b><p>Limite máximo de drawdown da conta em percentual do capital. Ao atingir, a conta é encerrada pela prop.</p><div class=\"tr\"><span>5%</span><span>Regra conservadora</span></div><div class=\"tr\"><span>10%</span><span>Padrão do mercado</span></div></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_ddmax\" value=\"10\" step=\"0.5\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário %</b><p>Limite de perda máxima em uma única sessão, em percentual do capital. Resetado a cada dia.</p><p>Ao atingir, você deve parar de operar no dia.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_dddaily\" value=\"5\" step=\"0.5\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR aplicada sobre o lucro líquido recebido. Varia conforme regime tributário e residência fiscal.</p><div class=\"tr\"><span>Brasil (DARF)</span><span>15% a 22,5%</span></div><div class=\"tr\"><span>Ganho mensal &lt; R$20k</span><span>Isento (B3)</span></div></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_ir\" value=\"6\" step=\"1\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Percentual cobrado pela prop ou corretora sobre o payout bruto como taxa de serviço ou gestão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_taxa\" value=\"2\" step=\"0.5\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>RRR Alvo <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Quantas vezes o alvo é maior que o stop. RRR 2 significa que para cada $1 arriscado, o alvo é $2.</p><div class=\"tr\"><span>0.618</span><span>Setup agressivo (alta WR)</span></div><div class=\"tr\"><span>1.5 – 2</span><span>Equilíbrio saudável</span></div><div class=\"tr\"><span>3+</span><span>Setup de tendência / swing</span></div></span></span></label><select id=\"s_rrr\" onchange=\"sh_calcSimulador()\"><option value=\"0.618\">0.618</option><option value=\"1\" selected>1:1</option><option value=\"1.141\">1.141</option><option value=\"1.618\">1.618</option><option value=\"2\">1:2</option></select></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Número de stops cheios consecutivos até bater o DD Máximo. Quanto maior, mais margem para sequências negativas sem encerrar a conta.</p><div class=\"tr\"><span>Menos de 10</span><span>Alta fragilidade</span></div><div class=\"tr\"><span>20 ou mais</span><span>Gestão confortável</span></div></span></span></label><input type=\"number\" id=\"s_stops\" value=\"40\" min=\"1\" oninput=\"sh_calcSimulador()\"></div>\n      </div>\n      <!-- Intervalo personalizado -->\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Intervalo de Metas — começa em 0, Intervalo = seu Risco por trade</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Intervalo % (= Risco por trade) <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Metas</b><p>Cada linha da tabela avança este percentual de lucro. Use o mesmo valor do seu risco por trade — assim cada linha representa exatamente 1R ganho.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_step\" value=\"0.25\" step=\"0.05\" min=\"0.01\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Fim % <span class=\"tip\">?<span class=\"tip-box\"><b>Fim da Tabela</b><p>Até qual percentual de lucro a tabela é gerada. Defina como a meta total de lucro da conta para ver o payout esperado no alvo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_fim\" value=\"10\" step=\"0.25\" min=\"0.01\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        </div>\n      </div>\n      <!-- Outputs rápidos — agora 6 cards: risco + DD Max + DD Diário com stops -->\n      <div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Risco por Entrada % <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Entrada %</b><p>Percentual da conta arriscado em cada operação, calculado a partir do DD Máximo dividido pelo número de stops configurado.</p></span></span></div><div class=\"out-big cb\" id=\"s_risco_ent\" style=\"font-size:15px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Risco USD / trade <span class=\"tip\">?<span class=\"tip-box\"><b>Risco USD por Trade</b><p>Valor em dólares arriscado por operação. É o percentual de risco aplicado sobre o capital da conta.</p></span></span></div><div class=\"out-big cy\" id=\"s_risco_usd\" style=\"font-size:15px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Alvo USD / trade <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo USD por Trade</b><p>Lucro em dólares por operação vencedora, calculado como Risco USD × RRR configurado.</p></span></span></div><div class=\"out-big cg\" id=\"s_alvo_usd\" style=\"font-size:15px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">DD Máximo (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo em USD</b><p>Valor absoluto do drawdown máximo permitido. Ao atingir este valor de perda acumulada, a conta é encerrada pela prop. O sub-valor mostra quantos stops cheios cabem.</p></span></span></div><div class=\"out-big cr\" id=\"s_ddmax_usd\" style=\"font-size:15px\">—</div><div class=\"out-sub\" id=\"s_stops_max\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">DD Diário (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário em USD</b><p>Limite de perda por sessão em valor absoluto. O sub-valor mostra quantos stops cheios cabem dentro deste limite antes de encerrar o dia.</p></span></span></div><div class=\"out-big co\" id=\"s_dd_usd\" style=\"font-size:15px\">—</div><div class=\"out-sub\" id=\"s_stops_dia\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Entradas p/ bater meta <span class=\"tip\">?<span class=\"tip-box\"><b>Entradas para Bater a Meta</b><p>Número de trades vencedores consecutivos necessários para atingir o lucro percentual de cada linha da tabela, considerando o RRR configurado.</p></span></span></div><div class=\"out-big cp\" id=\"s_meta_trades\" style=\"font-size:15px\">—</div></div>\n      </div>\n      <!-- Tabela sem scroll -->\n      <div class=\"tbl-wrap\">\n        <table class=\"tbl\">\n          <thead><tr>\n            <th class=\"al\">Lucro %</th>\n            <th>Lucro USD</th>\n            <th>Payout Bruto USD</th>\n            <th>Payout Bruto BRL</th>\n            <th>Após IR (BRL)</th>\n            <th>Líquido Final BRL</th>\n            <th>Trades p/ Meta</th>\n            <th>Líquido / Trade BRL</th>\n          </tr></thead>\n          <tbody id=\"simTbody\"></tbody>\n        </table>\n      </div>\n      <div class=\"chart-wrap\" style=\"height:180px;margin-top:12px\"><canvas id=\"pfSimChart\"></canvas></div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 1: MULTI-PAYOUT ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab1\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">📋 Comparativo Multi-Payout USD &amp; BRL</div>\n      <button class=\"btn primary\" onclick=\"sh_calcMulti()\">▶ Calcular</button>\n    </div>\n    <div class=\"sec-body\">\n      <div style=\"display:flex;justify-content:center;gap:12px;margin-bottom:10px;flex-wrap:wrap\">\n        <div class=\"field\" style=\"margin:0;width:220px\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital base para converter os percentuais de lucro em valores absolutos em USD e BRL.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_conta\" value=\"100000\" oninput=\"sh_calcMulti()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0;width:180px\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR aplicada sobre cada célula de payout da tabela comparativa.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_ir\" value=\"6\" oninput=\"sh_calcMulti()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0;width:200px\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo de serviço descontado do payout bruto antes do repasse ao trader.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_taxa\" value=\"2\" oninput=\"sh_calcMulti()\"><span class=\"u\">%</span></div></div>\n      </div>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Intervalo — começa em 0, Intervalo = Risco por trade</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Intervalo % (= Risco) <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Lucro</b><p>Incremento entre as linhas da tabela, equivalente ao seu risco por trade. Cada linha representa 1R a mais de lucro acumulado.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_step\" value=\"0.25\" step=\"0.05\" min=\"0.01\" oninput=\"sh_calcMulti()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Fim % <span class=\"tip\">?<span class=\"tip-box\"><b>Fim da Tabela</b><p>Limite superior da tabela comparativa. Defina como a meta total de lucro da conta para ver o payout líquido no alvo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_fim\" value=\"10\" step=\"0.25\" oninput=\"sh_calcMulti()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Payout Custom % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout Personalizado</b><p>Coluna extra da tabela com o percentual de payout que você negociou ou pretende negociar com a prop. Útil para comparar com os percentuais padrão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_custom\" value=\"88\" step=\"1\" min=\"1\" max=\"100\" oninput=\"sh_calcMulti()\"><span class=\"u\">%</span></div></div>\n        </div>\n      </div>\n      <div class=\"tbl-wrap\">\n        <table class=\"tbl\">\n          <thead><tr>\n            <th class=\"al\">Lucro %</th>\n            <th>Lucro USD</th>\n            <th class=\"cy\">50%</th><th class=\"cy\">55%</th><th class=\"cy\">60%</th><th class=\"cy\">65%</th>\n            <th class=\"cg\">70%</th><th class=\"cg\">75%</th><th class=\"cg\">80%</th><th class=\"cg\">85%</th><th class=\"cg\">90%</th>\n            <th class=\"cp\">Custom</th>\n          </tr></thead>\n          <tbody id=\"multiTbody\"></tbody>\n        </table>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 2: CALCULADORA ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab2\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\"><div class=\"sec-title\">🧮 Prop Firm — Calculadora Completa</div></div>\n    <div class=\"sec-body\">\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital total da conta prop. Base de cálculo para todos os limites, metas e riscos em percentual.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_conta\" value=\"100000\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo %</b><p>Limite máximo de drawdown da conta. Ao atingir este percentual de queda, a conta é encerrada.</p><div class=\"tr\"><span>Calculado sobre</span><span>capital inicial</span></div></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_ddmax\" value=\"10\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário %</b><p>Perda máxima permitida em uma única sessão. Resetada a cada dia. Ao atingir, encerre o dia imediatamente.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_dddaily\" value=\"5\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta de Lucro % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta de Lucro %</b><p>Percentual de lucro sobre o capital necessário para ser aprovado na fase de avaliação ou para solicitar o payout.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_meta\" value=\"8\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Quantidade de stops cheios seguidos que a conta suporta antes de bater o DD Máximo. Quanto maior, mais segura é a operação.</p></span></span></label><input type=\"number\" id=\"pf_stops\" value=\"20\" oninput=\"sh_calcPropFirm()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Entradas/Dia <span class=\"tip\">?<span class=\"tip-box\"><b>Entradas por Dia</b><p>Número de trades que você planeja executar por sessão. Usado para calcular o número estimado de dias até atingir a meta.</p></span></span></label><input type=\"number\" id=\"pf_entradas\" value=\"4\" oninput=\"sh_calcPropFirm()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>RRR Alvo <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Proporção entre o alvo de ganho e o stop de perda por trade. RRR 2 significa alvo = 2× o risco.</p><div class=\"tr\"><span>1:1</span><span>Precisa de WR &gt; 50%</span></div><div class=\"tr\"><span>2:1</span><span>Breakeven com WR 33%</span></div></span></span></label><select id=\"pf_rrr\" onchange=\"sh_calcPropFirm()\"><option value=\"0.618\">0.618</option><option value=\"1\" selected>1:1</option><option value=\"1.141\">1.141</option><option value=\"1.618\">1.618</option><option value=\"2\">1:2</option></select></div>\n        <div class=\"field\" style=\"margin:0\"><label>Assertividade % <span class=\"tip\">?<span class=\"tip-box\"><b>Assertividade (Win Rate)</b><p>Percentual de trades encerrados como WIN. Combinado com o RRR, determina a expectância do setup.</p><div class=\"tr\"><span>WR mínimo 1:1</span><span>50%</span></div><div class=\"tr\"><span>WR mínimo 2:1</span><span>34%</span></div></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_assert\" value=\"60\" step=\"1\" min=\"1\" max=\"100\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro bruto que a prop repassa ao trader. Calculado antes de IR e taxas de intermediação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_payout\" value=\"80\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR aplicada sobre o valor recebido após payout e taxa de intermediação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_ir\" value=\"15\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo cobrado pela prop ou corretora sobre o payout bruto, antes do repasse ao trader.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_taxa\" value=\"2\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div></div>\n      </div>\n      <!-- Metas do Dia -->\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Metas do Dia</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Stop Loss diário % <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Loss Diário %</b><p>Percentual da conta que você se propõe a perder como máximo por sessão. Diferente do DD Diário da prop — este é o seu limite pessoal de gestão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_sl_dia\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Meta de Gain diária % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta de Gain Diária %</b><p>Alvo de lucro por sessão em percentual da conta. Ao atingir, considere encerrar o dia para proteger o resultado.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_gain_dia\" value=\"2\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Stop Loss USD <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Loss em USD</b><p>Valor absoluto do seu stop pessoal diário convertido para dólares. É quanto você aceita perder no máximo em uma sessão.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--red)\" id=\"pf_sl_usd\">—</div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Meta Gain USD <span class=\"tip\">?<span class=\"tip-box\"><b>Meta de Gain em USD</b><p>Valor absoluto do seu alvo de lucro diário. Ao atingir este valor no dia, considere encerrar a sessão.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--green)\" id=\"pf_gain_usd\">—</div></div>\n        </div>\n      </div>\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Risco/Entrada % <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Entrada %</b><p>Percentual da conta arriscado por operação, calculado a partir do DD Máximo dividido pelo número de stops configurado.</p></span></span></div><div class=\"out-big cy\" id=\"pf_r1\" style=\"font-size:16px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Risco/Entrada USD <span class=\"tip\">?<span class=\"tip-box\"><b>Risco em USD por Trade</b><p>Valor em dólares arriscado por operação — o percentual de risco aplicado sobre o capital da conta.</p></span></span></div><div class=\"out-big co\" id=\"pf_r2\" style=\"font-size:16px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\">\n          <div class=\"out-lbl\">DD Máximo (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo em USD</b><p>Limite absoluto de drawdown da conta. Ao atingir, a conta é encerrada pela prop. Sub-valor: quantos stops cheios cabem antes de bater este limite.</p></span></span></div>\n          <div class=\"out-big cr\" id=\"pf_ddmax_usd\" style=\"font-size:16px\">—</div>\n          <div class=\"out-sub\" id=\"pf_stops_max\">—</div>\n        </div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\">\n          <div class=\"out-lbl\">DD Diário (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário em USD</b><p>Limite de perda por sessão em valor absoluto. Sub-valor: quantos stops cheios cabem dentro deste limite antes de encerrar o dia.</p></span></span></div>\n          <div class=\"out-big co\" id=\"pf_dddaily_usd\" style=\"font-size:16px\">—</div>\n          <div class=\"out-sub\" id=\"pf_r3\">—</div>\n        </div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Meta USD <span class=\"tip\">?<span class=\"tip-box\"><b>Meta em USD</b><p>Valor absoluto da meta de lucro da conta para aprovação ou saque, calculado sobre o capital configurado.</p></span></span></div><div class=\"out-big cb\" id=\"pf_r4\" style=\"font-size:16px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Trades p/ Meta <span class=\"tip\">?<span class=\"tip-box\"><b>Trades para Bater a Meta</b><p>Número de trades vencedores necessários para atingir a meta de lucro, considerando o RRR e o risco por trade configurados.</p></span></span></div><div class=\"out-big cp\" id=\"pf_r5\" style=\"font-size:16px\">—</div><div class=\"out-sub\" id=\"pf_r5sub\"></div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Dias Estimados <span class=\"tip\">?<span class=\"tip-box\"><b>Dias Estimados</b><p>Estimativa de dias úteis para atingir a meta, considerando o número de entradas por dia configurado e os trades necessários. É uma projeção otimista — assume win rate suficiente.</p></span></span></div><div class=\"out-big cm\" id=\"pf_r6\" style=\"font-size:16px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Alvo/trade (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo por Trade em USD</b><p>Lucro esperado por operação vencedora em dólares: Risco USD × RRR configurado.</p></span></span></div><div class=\"out-big cg\" id=\"pf_alvo_usd\" style=\"font-size:16px\">—</div></div>\n      </div>\n      <div class=\"out-box\" style=\"background:rgba(63,185,80,.06);border-color:rgba(63,185,80,.3);padding:14px\">\n        <div class=\"out-lbl\">✅ Líquido Final BRL <span class=\"tip\">?<span class=\"tip-box\"><b>Líquido Final em BRL</b><p>Valor líquido que você recebe ao atingir a meta — após payout, taxa de intermediação, IR e conversão para reais pela cotação atual do dólar.</p></span></span></div>\n        <div class=\"out-big cg\" id=\"pf_r7\" style=\"font-size:28px\">—</div>\n        <div class=\"out-sub\" id=\"pf_r7sub\"></div>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 3: GRANDES CONTAS ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab3\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">💼 Simulação — Grandes Contas até $400k</div>\n      <button class=\"btn primary\" onclick=\"sh_calcGrandes()\">▶ Calcular</button>\n    </div>\n    <div class=\"sec-body\">\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro bruto repassado pela prop ao trader, antes de IR e taxa de intermediação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_payout\" value=\"80\" oninput=\"sh_calcGrandes()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR aplicada sobre o valor recebido após payout e taxa de intermediação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_ir\" value=\"6\" oninput=\"sh_calcGrandes()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo de serviço descontado do payout bruto antes do repasse ao trader.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_taxa\" value=\"2\" oninput=\"sh_calcGrandes()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Alvo Líquido (R$) <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo Líquido em BRL</b><p>Valor em reais que você quer receber no final, já descontados IR e taxas. A tabela mostra qual tamanho de conta e risco por trade são necessários para atingi-lo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_alvo\" value=\"5000\" oninput=\"sh_calcGrandes()\"><span class=\"u\">R$</span></div></div>\n      </div>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Intervalo — começa em 0, Intervalo = Risco por trade</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Intervalo % (= Risco) <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Risco</b><p>Cada linha da tabela avança esse percentual — equivale ao risco por trade. Cada linha = 1R de lucro acumulado.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_step\" value=\"0.25\" step=\"0.05\" min=\"0.01\" oninput=\"sh_calcGrandes()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Fim % <span class=\"tip\">?<span class=\"tip-box\"><b>Fim da Tabela</b><p>Limite superior do risco simulado. Defina como a meta total de lucro para ver o payout líquido esperado no alvo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_fim\" value=\"10\" step=\"0.25\" oninput=\"sh_calcGrandes()\"><span class=\"u\">%</span></div></div>\n        </div>\n      </div>\n      <div class=\"tbl-wrap\">\n        <table class=\"tbl\">\n          <thead><tr>\n            <th class=\"al\">Lucro %</th>\n            <th>$1k</th><th>$2k</th><th>$5k</th><th>$10k</th><th>$25k</th>\n            <th>$50k</th><th>$75k</th><th>$100k</th><th>$150k</th><th>$200k</th>\n            <th>$300k</th><th>$400k</th>\n          </tr></thead>\n          <tbody id=\"grandesTbody\"></tbody>\n        </table>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 4: 2 FASES ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab4\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">🎯 Gerenciamento — 2 Fases</div>\n      <div class=\"btn-row\">\n        <button class=\"btn primary\" onclick=\"sh_calc2Fases()\">▶ Calcular</button>\n        <label class=\"btn success\" style=\"cursor:pointer\">↑ Importar JSON/CSV<input type=\"file\" accept=\".csv,.json\" style=\"display:none\" onchange=\"sh_importFase(event,'2f')\"></label>\n        <button class=\"btn\" onclick=\"sh_exportFase('2f')\">↓ Exportar</button>\n      </div>\n    </div>\n    <div class=\"sec-body\">\n      <!-- Parâmetros -->\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital da conta de avaliação 2 fases. Base para todos os cálculos de risco, metas e payout.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_conta\" value=\"100000\" oninput=\"sh_calc2Fases()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo %</b><p>Drawdown máximo permitido pela prop. Ao atingir em qualquer ponto da avaliação ou na conta funded, ela é encerrada.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_ddmax\" value=\"10\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário %</b><p>Limite de perda por sessão estabelecido pela prop. Diferente do seu stop pessoal — este é o limite regulatório da conta.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_dddaily\" value=\"5\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder Conta <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Quantos stops cheios seguidos cabem antes de bater o DD Máximo. Indica a margem de erro da gestão de risco.</p></span></span></label><input type=\"number\" id=\"f2_stops\" value=\"40\" oninput=\"sh_calc2Fases()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Fase 1 % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Fase 1 %</b><p>Lucro percentual necessário para ser aprovado na primeira fase da avaliação e avançar para a Fase 2.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_meta1\" value=\"8\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Fase 2 % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Fase 2 %</b><p>Lucro percentual necessário para ser aprovado na segunda fase e receber a conta funded.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_meta2\" value=\"5\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Funded Mensal % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Funded Mensal %</b><p>Lucro mensal alvo na conta funded para solicitar o payout. Geralmente não obrigatório — é o seu objetivo de renda.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_metaf\" value=\"5\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Entradas/Dia <span class=\"tip\">?<span class=\"tip-box\"><b>Entradas por Dia</b><p>Número médio de trades por sessão. Usado para estimar o número de dias necessários para atingir as metas de cada fase.</p></span></span></label><input type=\"number\" id=\"f2_entradas\" value=\"4\" oninput=\"sh_calc2Fases()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro que a prop repassa ao trader. Incide sobre o lucro bruto da conta funded.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_payout\" value=\"80\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR sobre o valor recebido após payout. Consulte seu regime tributário para o valor correto.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_ir\" value=\"15\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo de serviço cobrado antes do repasse ao trader, sobre o payout bruto.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_taxa\" value=\"2\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div></div>\n      </div>\n      <!-- Metas operacionais do dia -->\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Metas Operacionais do Dia</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Meta Stop Loss % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal Diário</b><p>Seu limite de perda por sessão — diferente do DD Diário da prop. Serve como proteção proativa antes de chegar no limite regulatório.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_sl\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Meta Gain % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain Diário</b><p>Meta de lucro por sessão. Ao atingir, considere encerrar o dia para proteger o resultado e evitar overtrading.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_gain\" value=\"2\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Stop Loss USD <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal em USD</b><p>Valor absoluto do seu stop pessoal diário. Ao atingir esta perda em uma sessão, encerre o dia — mesmo que o DD Diário da prop ainda não tenha sido atingido.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--red)\" id=\"f2_sl_usd\">—</div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Gain USD <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain em USD</b><p>Valor absoluto do seu alvo de lucro diário. Ao atingir, considere encerrar a sessão para proteger o resultado.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--green)\" id=\"f2_gain_usd\">—</div></div>\n        </div>\n      </div>\n      <div id=\"f2Results\"></div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 5: 1 FASE ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab5\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">🎯 Gerenciamento — 1 Fase</div>\n      <div class=\"btn-row\">\n        <button class=\"btn primary\" onclick=\"sh_calc1Fase()\">▶ Calcular</button>\n        <label class=\"btn success\" style=\"cursor:pointer\">↑ Importar JSON/CSV<input type=\"file\" accept=\".csv,.json\" style=\"display:none\" onchange=\"sh_importFase(event,'1f')\"></label>\n        <button class=\"btn\" onclick=\"sh_exportFase('1f')\">↓ Exportar</button>\n      </div>\n    </div>\n    <div class=\"sec-body\">\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital da conta de avaliação 1 fase. Base para todos os cálculos de risco, metas e payout.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_conta\" value=\"50000\" oninput=\"sh_calc1Fase()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo %</b><p>Drawdown máximo permitido pela prop. Ao atingir em qualquer momento da avaliação ou conta funded, ela é encerrada.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_ddmax\" value=\"6\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário %</b><p>Limite de perda por sessão da prop. Resetado diariamente. Ao atingir, encerre imediatamente o dia operacional.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_dddaily\" value=\"3\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Quantidade de stops consecutivos suportados antes de bater o DD Máximo. Quanto mais, maior a margem para drawdowns naturais do setup.</p></span></span></label><input type=\"number\" id=\"f1_stops\" value=\"20\" oninput=\"sh_calc1Fase()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Prova % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta de Prova %</b><p>Lucro percentual necessário para passar na avaliação 1 fase e receber a conta funded.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_metap\" value=\"10\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Funded Mensal % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Funded Mensal %</b><p>Alvo de lucro mensal na conta funded para solicitar payout. Defina com base na sua capacidade de execução sem forçar frequência.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_metaf\" value=\"5\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Entradas/Dia <span class=\"tip\">?<span class=\"tip-box\"><b>Entradas por Dia</b><p>Número médio de trades por sessão. Usado para calcular estimativa de dias para atingir a meta da prova.</p></span></span></label><input type=\"number\" id=\"f1_entradas\" value=\"4\" oninput=\"sh_calc1Fase()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro repassado pela prop ao trader na conta funded.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_payout\" value=\"80\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR sobre o payout recebido. Consulte seu regime tributário.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_ir\" value=\"15\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo de serviço da prop ou corretora sobre o payout bruto, descontado antes do repasse.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_taxa\" value=\"2\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div></div><div></div>\n      </div>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Metas Operacionais do Dia</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Meta Stop Loss % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal Diário</b><p>Seu limite de perda por sessão — proteção antes de atingir o DD Diário da prop. Boa prática: metade do DD Diário da conta.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_sl\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Meta Gain % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain Diário</b><p>Meta de lucro por sessão. Ao atingir, considere encerrar o dia — dias positivos protegidos são mais valiosos do que ganhos extras com risco de reversão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_gain\" value=\"2\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Stop Loss USD <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal em USD</b><p>Valor absoluto do seu stop pessoal diário. Ao atingir esta perda em uma sessão, encerre o dia imediatamente.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--red)\" id=\"f1_sl_usd\">—</div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Gain USD <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain em USD</b><p>Valor absoluto do seu alvo de lucro diário. Ao atingir, considere encerrar a sessão para proteger o resultado.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--green)\" id=\"f1_gain_usd\">—</div></div>\n        </div>\n      </div>\n      <div id=\"f1Results\"></div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 6: INSTANT ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab6\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">🎯 Gerenciamento — Instant</div>\n      <div class=\"btn-row\">\n        <button class=\"btn primary\" onclick=\"sh_calcInstant()\">▶ Calcular</button>\n        <label class=\"btn success\" style=\"cursor:pointer\">↑ Importar JSON/CSV<input type=\"file\" accept=\".csv,.json\" style=\"display:none\" onchange=\"sh_importFase(event,'inst')\"></label>\n        <button class=\"btn\" onclick=\"sh_exportFase('inst')\">↓ Exportar</button>\n      </div>\n    </div>\n    <div class=\"sec-body\">\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital da conta instant funded — sem fase de avaliação, começa operando imediatamente. Base para todos os cálculos de risco e payout.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_conta\" value=\"50000\" oninput=\"sh_calcInstant()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown Máximo %</b><p>Limite total de queda da conta. Instant fundings tendem a ter DD máximo mais restritivo que contas com avaliação — maior risco para a prop.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_ddmax\" value=\"5\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown Diário %</b><p>Limite de perda por sessão. Resetado diariamente. Contas instant costumam ter DD diário mais apertado — atenção redobrada na gestão de risco.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_dddaily\" value=\"3\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Quantos stops cheios consecutivos cabem antes de bater o DD Máximo. Indica a margem de erro da gestão de risco.</p><div class=\"tr\"><span>Menos de 10</span><span>Alta fragilidade</span></div><div class=\"tr\"><span>20 ou mais</span><span>Gestão confortável</span></div></span></span></label><input type=\"number\" id=\"in_stops\" value=\"20\" oninput=\"sh_calcInstant()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Funded Mensal % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Funded Mensal</b><p>Seu alvo de lucro mensal para solicitar payout. Em contas instant geralmente não há meta obrigatória — use como objetivo de renda pessoal.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_metaf\" value=\"5\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Entradas/Dia <span class=\"tip\">?<span class=\"tip-box\"><b>Entradas por Dia</b><p>Número médio de trades por sessão. Usado para estimar o tempo necessário para atingir a meta mensal.</p></span></span></label><input type=\"number\" id=\"in_entradas\" value=\"4\" oninput=\"sh_calcInstant()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro bruto repassado pela prop. Instant fundings costumam oferecer payout mais alto (90–95%) como compensação pela ausência de avaliação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_payout\" value=\"95\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR sobre o payout recebido. Consulte seu regime tributário.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_ir\" value=\"15\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo de serviço descontado do payout bruto antes do repasse ao trader.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_taxa\" value=\"2\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div></div><div></div><div></div>\n      </div>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Metas Operacionais do Dia</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Meta Stop Loss % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal Diário</b><p>Seu limite de perda por sessão — mais conservador que o DD Diário da prop. Acionar antes protege a conta de chegar no limite regulatório.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_sl\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Meta Gain % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain Diário</b><p>Meta de lucro por sessão. Atingiu? Considere encerrar o dia. Dias verdes protegidos valem mais que ganhos extras com risco de reversão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_gain\" value=\"2\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Stop Loss USD <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal em USD</b><p>Valor absoluto do seu stop pessoal diário. Em contas instant o DD diário é mais restritivo — seu stop pessoal deve ser ainda mais conservador.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--red)\" id=\"in_sl_usd\">—</div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Gain USD <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain em USD</b><p>Valor absoluto do alvo diário. Ao atingir, proteja o resultado encerrando a sessão.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--green)\" id=\"in_gain_usd\">—</div></div>\n        </div>\n      </div>\n      <div id=\"inResults\"></div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 7: RRR UNIFICADO ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab7\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">📅 Simulador de Cenários — RRR Unificado</div>\n      <button class=\"btn primary\" onclick=\"sh_calcRRR()\">▶ Calcular</button>\n    </div>\n    <div class=\"sec-body\">\n      <!-- Parâmetros da conta -->\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital base da conta. Usado para converter percentuais de risco, metas e DD em valores absolutos em dólar.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"r_conta\" value=\"50000\" oninput=\"sh_calcRRR()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo %</b><p>Limite total de drawdown da conta. Ao atingir, a conta é encerrada pela prop ou deve ser pausada por gestão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"r_ddmax\" value=\"10\" oninput=\"sh_calcRRR()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário %</b><p>Limite de perda por sessão estabelecido pela prop. Ao atingir, encerre o dia imediatamente.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"r_dddaily\" value=\"5\" oninput=\"sh_calcRRR()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Quantos stops cheios a conta suporta antes de bater o DD Máximo. Determina o risco máximo por trade.</p></span></span></label><input type=\"number\" id=\"r_stops\" value=\"20\" oninput=\"sh_calcRRR()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Stop Loss % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal Diário</b><p>Seu limite de perda por sessão — mais conservador que o DD Diário da prop. Acionar antes protege a conta de atingir o limite regulatório.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"r_sl\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcRRR()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Gain % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain Diário</b><p>Meta de lucro por sessão. Atingiu? Considere encerrar o dia. Consistência de dias verdes vale mais do que maximizar cada sessão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"r_gain\" value=\"2\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcRRR()\"><span class=\"u\">%</span></div></div>\n        <div></div><div></div>\n      </div>\n\n      <!-- Info geral: risco por nível + metas do dia -->\n      <div id=\"rrrInfo\" style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px\"></div>\n      <div id=\"rrrDayInfo\" style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px\"></div>\n\n      <!-- 5 colunas RRR -->\n      <div style=\"display:grid;grid-template-columns:repeat(5,1fr);gap:10px\" id=\"rrrGrid\"></div>\n    </div>\n  </div>\n</div>\n\n</div><!-- #app --></div><!-- /mod-propfirm -->\n\n<!-- ──────────── MÓDULO 1: PLANO DE TRADE ──────────── -->\n<div class=\"hub-module\" id=\"mod-plano\">\n<input type=\"hidden\" id=\"cotInput\" value=\"5.80\"><span id=\"cotDisp\" style=\"display:none\"></span>\n<div id=\"pt-app\">\n<div class=\"tabs-nav\">\n  <button class=\"tab-btn active\" onclick=\"sh_ptTab(0)\">📋 Plano de Trade</button>\n  <button class=\"tab-btn\" onclick=\"sh_ptTab(1)\">📉 Loss Contínuo &amp; Alternado</button>\n  <button class=\"tab-btn\" onclick=\"sh_ptTab(2)\">📊 Cálculos Day Trade</button>\n</div>\n\n<!-- ═══════ ABA 1: PLANO DE TRADE ═══════ -->\n<div class=\"tab-panel active\" id=\"pt-tab0\">\n\n  <!-- CICLOS -->\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">🔄 Simulador de Ciclos</div>\n      <div class=\"btn-row\">\n        <button class=\"btn success\" onclick=\"sh_addCiclo()\">+ Ciclo</button>\n        <button class=\"btn primary\" onclick=\"sh_calcCiclos()\">▶ Calcular</button>\n      </div>\n    </div>\n    <div class=\"sec-body\">\n      <div class=\"fr5\" style=\"margin-bottom:14px;gap:8px\">\n        <div class=\"field\" style=\"margin:0\"><label>Capital Inicial ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Inicial</b><p>Saldo de partida do Ciclo 1. Os ciclos seguintes herdam automaticamente o capital final do ciclo anterior.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicCap\" value=\"1000\" step=\"1\" oninput=\"sh_calcCiclos()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Risco inicial (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Risco Inicial %</b><p>Percentual do capital arriscado por operação no Ciclo 1. Com juros compostos, o valor em USD cresce a cada ciclo conforme o capital aumenta.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicRisco\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcCiclos()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Redução risco (%/cic) <span class=\"tip\">?<span class=\"tip-box\"><b>Redução de Risco por Ciclo</b><p>Quanto o risco percentual diminui a cada ciclo. Permite simular uma gestão mais conservadora à medida que o capital cresce.</p><div class=\"tr\"><span>0</span><span>Risco fixo em todos os ciclos</span></div><div class=\"tr\"><span>0.25</span><span>Reduz 0.25% a cada ciclo</span></div></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicRedRisco\" value=\"0.25\" step=\"0.05\" min=\"0\" oninput=\"sh_calcCiclos()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>RRR inicial <span class=\"tip\">?<span class=\"tip-box\"><b>RRR Inicial</b><p>Relação Risco:Retorno do Ciclo 1. Define quanto o alvo é maior que o stop. RRR 2 = alvo 2× o risco.</p></span></span></label><input type=\"number\" id=\"cicRRR\" value=\"1\" step=\"0.001\" min=\"0.1\" oninput=\"sh_calcCiclos()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Δ RRR por ciclo <span class=\"tip\">?<span class=\"tip-box\"><b>Variação de RRR por Ciclo</b><p>Quanto o RRR aumenta ou diminui a cada ciclo. Use positivo para simular evolução do setup, negativo para conservadorismo, 0 para manter fixo.</p></span></span></label><input type=\"number\" id=\"cicDeltaRRR\" value=\"0\" step=\"0.001\" oninput=\"sh_calcCiclos()\"></div>\n      </div>\n      <div class=\"fr3\" style=\"margin-bottom:14px;gap:8px\">\n        <div class=\"field\" style=\"margin:0\"><label>Intervalo redução risco (ciclos) <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Redução de Risco</b><p>A cada quantos ciclos a redução de risco é aplicada. Ex: 2 = reduz o risco a cada 2 ciclos.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicIntRisco\" value=\"1\" step=\"1\" min=\"1\" oninput=\"sh_calcCiclos()\"><span class=\"u\">#</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Intervalo Δ RRR (ciclos) <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Variação de RRR</b><p>A cada quantos ciclos o delta de RRR é aplicado. Permite progressão gradual do RRR ao longo dos ciclos.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicIntRRR\" value=\"1\" step=\"1\" min=\"1\" oninput=\"sh_calcCiclos()\"><span class=\"u\">#</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>N operações por ciclo <span class=\"tip\">?<span class=\"tip-box\"><b>Operações por Ciclo</b><p>Número de trades executados em cada ciclo. O ganho final de cada ciclo usa juros compostos com esse volume de trades e a expectância do setup.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicNOps\" value=\"200\" step=\"1\" min=\"1\" oninput=\"sh_calcCiclos()\"><span class=\"u\">ops</span></div></div>\n      </div>\n      <div class=\"tbl-wrap\">\n        <table class=\"tbl\">\n          <thead><tr><th class=\"al\">Ciclo</th><th>Capital ($)</th><th>Risco%</th><th>RRR</th><th>Ops</th><th>Cap. Final ($)</th><th>Ganho/Op ($)</th><th>Ganho Total ($)</th><th>Em R$</th><th></th></tr></thead>\n          <tbody id=\"ciclosTbody\"></tbody>\n        </table>\n      </div>\n      <div class=\"chart-wrap\" style=\"height:180px\"><canvas id=\"ciclosChart\"></canvas></div>\n    </div>\n  </div>\n\n  <!-- PARCIAIS + SIMULAÇÃO BR + METAS -->\n  <div class=\"g3\" style=\"margin-bottom:16px\">\n\n    <!-- PARCIAIS -->\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">🎯 Parciais — RRR Efetivo</div></div>\n      <div class=\"sec-body\">\n        <div class=\"fr3\" style=\"margin-bottom:10px\">\n          <div>\n            <div class=\"field\"><label>Alvo 1 (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Parcial 1 — % da Posição</b><p>Percentual do tamanho total da posição encerrado neste primeiro alvo. A soma dos três alvos deve ser 100%.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"p1p\" value=\"50\" min=\"0\" max=\"100\" step=\"5\" oninput=\"sh_calcParciais()\"><span class=\"u\">%</span></div></div>\n            <div class=\"field\"><label>RRR 1 <span class=\"tip\">?<span class=\"tip-box\"><b>RRR desta Parcial</b><p>Relação risco:retorno específica deste alvo. O RRR Médio resultante é a média ponderada dos três alvos pelo percentual de posição encerrado em cada um.</p></span></span></label><input type=\"number\" id=\"p1r\" value=\"0.618\" step=\"0.001\" oninput=\"sh_calcParciais()\"></div>\n          </div>\n          <div>\n            <div class=\"field\"><label>Alvo 2 (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Parcial 2 — % da Posição</b><p>Percentual da posição encerrado no segundo alvo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"p2p\" value=\"25\" min=\"0\" max=\"100\" step=\"5\" oninput=\"sh_calcParciais()\"><span class=\"u\">%</span></div></div>\n            <div class=\"field\"><label>RRR 2 <span class=\"tip\">?<span class=\"tip-box\"><b>RRR desta Parcial</b><p>Relação risco:retorno do segundo alvo.</p></span></span></label><input type=\"number\" id=\"p2r\" value=\"1.000\" step=\"0.001\" oninput=\"sh_calcParciais()\"></div>\n          </div>\n          <div>\n            <div class=\"field\"><label>Alvo 3 (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Parcial 3 — % da Posição</b><p>Percentual da posição encerrado no terceiro alvo. O restante não encerrado representa a parcial de tendência ou runner.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"p3p\" value=\"25\" min=\"0\" max=\"100\" step=\"5\" oninput=\"sh_calcParciais()\"><span class=\"u\">%</span></div></div>\n            <div class=\"field\"><label>RRR 3 <span class=\"tip\">?<span class=\"tip-box\"><b>RRR desta Parcial</b><p>Relação risco:retorno do terceiro alvo. Quanto maior, mais o setup aproveitou o movimento.</p></span></span></label><input type=\"number\" id=\"p3r\" value=\"1.141\" step=\"0.001\" oninput=\"sh_calcParciais()\"></div>\n          </div>\n        </div>\n        <div class=\"fr3\" style=\"gap:8px;margin-bottom:10px\">\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">RRR Médio <span class=\"tip\">?<span class=\"tip-box\"><b>RRR Efetivo Médio</b><p>Relação risco:retorno resultante ao fechar os três alvos parciais com os pesos definidos. É a média ponderada de RRR1×%1 + RRR2×%2 + RRR3×%3. Use este valor para calcular a expectância real do setup.</p></span></span></div><div class=\"out-big cb\" id=\"pRRR\">—</div></div>\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Soma % <span class=\"tip\">?<span class=\"tip-box\"><b>Soma dos Percentuais</b><p>Total dos percentuais distribuídos entre os três alvos. Deve ser exatamente 100% para que o cálculo do RRR Médio seja válido.</p></span></span></div><div class=\"out-big\" id=\"pSoma\">—</div></div>\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Excedente <span class=\"tip\">?<span class=\"tip-box\"><b>Excedente</b><p>Diferença entre a soma dos percentuais e 100%. Se positivo, você está distribuindo mais que a posição inteira. Se negativo, há posição não alocada (runner sem alvo definido).</p></span></span></div><div class=\"out-big\" id=\"pExc\">—</div></div>\n        </div>\n        <div class=\"sep\"></div>\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Referência</div>\n        <div class=\"tbl-wrap tbl-scroll\" style=\"max-height:200px\">\n          <table class=\"tbl\"><thead><tr><th class=\"al\">Combinação</th><th>RRR</th></tr></thead><tbody id=\"parcRefTbody\"></tbody></table>\n        </div>\n      </div>\n    </div>\n\n    <!-- SIMULAÇÃO MERCADO BR (WDO/WIN) -->\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">🇧🇷 Simulação Mercado BR</div></div>\n      <div class=\"sec-body\">\n        <div class=\"fr3\" style=\"margin-bottom:10px;gap:6px\">\n          <div class=\"field\" style=\"margin:0\">\n            <label>Mercado <span class=\"tip\">?<span class=\"tip-box\"><b>Mercado</b><p>WDO = Mini Dólar — cada ponto vale R$10. WIN = Mini Índice — cada ponto vale R$0,20. Define o valor monetário de cada ponto na simulação.</p></span></span></label>\n            <select id=\"brMercado\" onchange=\"sh_calcBR()\">\n              <option value=\"WDO\">WDO (Mini Dólar)</option>\n              <option value=\"WIN\">WIN (Mini Índice)</option>\n            </select>\n          </div>\n          <div class=\"field\" style=\"margin:0\"><label>Total de Contratos <span class=\"tip\">?<span class=\"tip-box\"><b>Total de Contratos</b><p>Número de contratos da posição completa, a ser distribuído entre os alvos parciais definidos abaixo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"brContratos\" value=\"3\" min=\"1\" step=\"1\" oninput=\"sh_calcBR()\"><span class=\"u\">ctt</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Valor do STOP (pts) <span class=\"tip\">?<span class=\"tip-box\"><b>Stop em Pontos</b><p>Distância em pontos do seu stop loss em relação à entrada. Usado para calcular o risco financeiro total da operação em reais.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"brStop\" value=\"12\" step=\"1\" oninput=\"sh_calcBR()\"><span class=\"u\">pts</span></div></div>\n        </div>\n        <div class=\"fr4\" style=\"gap:6px;margin-bottom:10px\">\n          <div class=\"field\" style=\"margin:0\"><label>Ctt Alvo 1 (61,8%) <span class=\"tip\">?<span class=\"tip-box\"><b>Contratos no Alvo 1</b><p>Quantos contratos encerrar no alvo de 61,8% do stop (nível de Fibonacci). Parcial conservadora para garantir parte do lucro cedo.</p></span></span></label><input type=\"number\" id=\"brA1\" value=\"1\" min=\"0\" step=\"1\" oninput=\"sh_calcBR()\"></div>\n          <div class=\"field\" style=\"margin:0\"><label>Ctt Alvo 2 (100%) <span class=\"tip\">?<span class=\"tip-box\"><b>Contratos no Alvo 2</b><p>Quantos contratos encerrar no alvo de 100% do stop (RRR 1:1). Equilíbrio entre realização e continuidade do trade.</p></span></span></label><input type=\"number\" id=\"brA2\" value=\"1\" min=\"0\" step=\"1\" oninput=\"sh_calcBR()\"></div>\n          <div class=\"field\" style=\"margin:0\"><label>Ctt Alvo 3 (161,8%) <span class=\"tip\">?<span class=\"tip-box\"><b>Contratos no Alvo 3</b><p>Quantos contratos encerrar no alvo de 161,8% do stop (extensão de Fibonacci). Maximiza o lucro em movimentos mais amplos.</p></span></span></label><input type=\"number\" id=\"brA3\" value=\"1\" min=\"0\" step=\"1\" oninput=\"sh_calcBR()\"></div>\n          <div class=\"field\" style=\"margin:0\"><label>Ctt Alvo 4 (200%) <span class=\"tip\">?<span class=\"tip-box\"><b>Contratos no Alvo 4</b><p>Quantos contratos encerrar no alvo de 200% do stop (RRR 2:1). Runner para trades de tendência forte.</p></span></span></label><input type=\"number\" id=\"brA4\" value=\"0\" min=\"0\" step=\"1\" oninput=\"sh_calcBR()\"></div>\n        </div>\n        <div class=\"tbl-wrap\" style=\"margin-bottom:8px\">\n          <table class=\"tbl\" id=\"brAlvosTbl\">\n            <thead><tr><th>Alvo</th><th>Mult.</th><th>Pts</th><th>Stop (R$)</th><th>Lucro/Ctt (R$)</th><th>Contratos</th><th>Lucro Total (R$)</th><th>% Total</th></tr></thead>\n            <tbody id=\"brAlvosTbody\"></tbody>\n          </table>\n        </div>\n        <div style=\"background:var(--bg1);border:1px solid var(--border);border-radius:6px;padding:8px 12px\">\n          <div class=\"fr3\" style=\"gap:8px\">\n            <div style=\"text-align:center\"><div class=\"out-lbl\">Stop Total (R$) <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Total em R$</b><p>Risco financeiro total da operação: Stop em pontos × Valor do ponto × Total de contratos. É quanto você perde se o stop for atingido antes de qualquer parcial.</p></span></span></div><div class=\"out-big cr\" id=\"brStopTotal\">—</div></div>\n            <div style=\"text-align:center\"><div class=\"out-lbl\">Lucro Total (R$) <span class=\"tip\">?<span class=\"tip-box\"><b>Lucro Total em R$</b><p>Ganho financeiro total somando todos os alvos parciais com os contratos alocados em cada um. É o resultado se todos os alvos forem atingidos.</p></span></span></div><div class=\"out-big cg\" id=\"brLucroTotal\">—</div></div>\n            <div style=\"text-align:center\"><div class=\"out-lbl\">Lucro Médio/Ctt (R$) <span class=\"tip\">?<span class=\"tip-box\"><b>Lucro Médio por Contrato</b><p>Média do lucro por contrato considerando a distribuição entre os alvos parciais. Útil para comparar setups com diferentes números de contratos.</p></span></span></div><div class=\"out-big cy\" id=\"brLucroMedio\">—</div></div>\n          </div>\n          <div style=\"display:flex;gap:6px;margin-top:8px;align-items:center;justify-content:center;font-size:11px\">\n            <span style=\"color:var(--muted)\">Status:</span>\n            <span id=\"brStatus\" style=\"font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700\">—</span>\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <!-- METAS -->\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\">\n        <div class=\"sec-title\">🏆 Calculadora de Metas</div>\n        <button class=\"btn primary\" onclick=\"sh_calcMetas()\">▶ Calcular</button>\n      </div>\n      <div class=\"sec-body\">\n        <div class=\"fr2\" style=\"margin-bottom:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Capital atual ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Atual</b><p>Saldo disponível para trading. Base para calcular o valor em dólar do risco e do lucro por trade.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"mCapUSD\" value=\"1000\"><span class=\"u\">$</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Risco por trade (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade %</b><p>Percentual do capital arriscado em cada operação. Combinado com o RRR, determina o lucro esperado por trade vencedor.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"mRisco\" value=\"1\" step=\"0.1\"><span class=\"u\">%</span></div></div>\n        </div>\n        <div class=\"fr2\" style=\"margin-bottom:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>RRR <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Proporção entre o alvo e o stop. Determina o lucro em dólar por trade vencedor.</p></span></span></label><input type=\"number\" id=\"mRRR\" value=\"1.141\" step=\"0.001\"></div>\n          <div class=\"field\" style=\"margin:0\"><label>Meta total ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Total</b><p>Valor em dólar que você quer acumular. A tabela calcula quantos acertos são necessários em diferentes prazos (1 semana, 1 mês, 3 meses, etc.).</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"mMeta\" value=\"1000\"><span class=\"u\">$</span></div></div>\n        </div>\n        <div class=\"fr2\" style=\"gap:8px;margin-bottom:10px\">\n          <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Risco/trade ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade em USD</b><p>Valor em dólares arriscado por operação: Capital × Risco%. Quanto maior, menos trades são necessários para atingir a meta — mas o drawdown em sequências de loss também é maior.</p></span></span></div><div class=\"out-big co\" id=\"mRiscoU\">—</div></div>\n          <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Lucro/trade via RRR ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Lucro por Trade via RRR</b><p>Ganho em dólares por operação vencedora: Risco/trade × RRR. É o valor que entra no saldo a cada WIN. A tabela abaixo usa este valor para calcular quantos acertos são necessários por prazo.</p></span></span></div><div class=\"out-big cg\" id=\"mLucroU\">—</div></div>\n        </div>\n        <div class=\"tbl-wrap\">\n          <table class=\"tbl\"><thead><tr><th>Período</th><th>Dias úteis</th><th>Acertos</th><th>Acertos/sem</th><th>Acertos/dia</th></tr></thead><tbody id=\"metasTbody\"></tbody></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- RECUPERAÇÃO + LOSSES CONSECUTIVOS -->\n  <div class=\"g2\" style=\"margin-bottom:16px\">\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\">\n        <div class=\"sec-title\">🩹 Recuperação de Perdas <span class=\"tip\" style=\"font-size:10px\">?<span class=\"tip-box\"><b>Recuperação de Perdas</b><p>Mostra o quanto você precisa ganhar para recuperar cada nível de perda. Perdas são matematicamente assimétricas: perder 30% exige ganhar 43% para voltar ao ponto inicial.</p><div class=\"tr\"><span>Perda 10%</span><span>Precisa ganhar 11%</span></div><div class=\"tr\"><span>Perda 25%</span><span>Precisa ganhar 33%</span></div><div class=\"tr\"><span>Perda 50%</span><span>Precisa ganhar 100%</span></div></span></span></div>\n        <div class=\"iu\" style=\"width:120px\"><input type=\"number\" id=\"recovCap\" value=\"1000\" min=\"1\" step=\"100\" oninput=\"sh_calcRecov()\"><span class=\"u\">$</span></div>\n      </div>\n      <div class=\"sec-body\" style=\"padding:0\">\n        <div class=\"tbl-wrap\">\n          <table class=\"tbl\"><thead><tr><th class=\"al\">Perda</th><th>Saldo ($)</th><th>Perda ($)</th><th>Ganho p/ recuperar</th></tr></thead><tbody id=\"recovTbody\"></tbody></table>\n        </div>\n      </div>\n    </div>\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\">\n        <div class=\"sec-title\">🎲 Possibilidades de Losses Consecutivos <span class=\"tip\" style=\"font-size:10px\">?<span class=\"tip-box\"><b>Losses Consecutivos</b><p>Probabilidade estatística de sofrer N losses seguidos em 100 trades com o win rate definido. Use para se preparar psicologicamente para o drawdown esperado — sequências de losses são normais em qualquer setup lucrativo.</p></span></span></div>\n        <span class=\"tbadge\">100 trades</span>\n      </div>\n      <div class=\"sec-body\">\n        <div class=\"field\" style=\"margin-bottom:12px\">\n          <label>Win Rate: <span id=\"wrLbl\" class=\"cb\">55%</span> <span class=\"tip\">?<span class=\"tip-box\"><b>Win Rate</b><p>Percentual de trades vencedores do seu setup. Quanto menor o win rate, maior a probabilidade de sequências longas de losses consecutivos — planeje seu risco por trade considerando isso.</p></span></span></label>\n          <input type=\"range\" id=\"wrSlider\" min=\"10\" max=\"90\" step=\"1\" value=\"55\" oninput=\"document.getElementById('wrLbl').textContent=this.value+'%';sh_calcLosses()\">\n        </div>\n        <div class=\"tbl-wrap\" style=\"margin-bottom:10px\">\n          <table class=\"tbl\"><thead><tr><th>Sequência</th><th>P(ao menos X consec.)</th><th>Visual</th></tr></thead><tbody id=\"lossTbody\"></tbody></table>\n        </div>\n        <div class=\"chart-wrap\" style=\"height:160px\"><canvas id=\"lossChart\"></canvas></div>\n      </div>\n    </div>\n  </div>\n\n  <!-- HEATMAP + DD -->\n  <div class=\"g2\" style=\"margin-bottom:16px\">\n    <div class=\"sec\" style=\"margin:0;overflow:hidden\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">🗺️ Mapa de Expectância (WR × RRR) <span class=\"tip\">?<span class=\"tip-box\"><b>Mapa de Expectância</b><p>Heatmap que cruza Win Rate (linhas) com RRR (colunas) e classifica cada combinação em expectativa positiva (verde), breakeven (amarelo) ou negativa (vermelho). Use para identificar quais setups são matematicamente viáveis antes de operar.</p></span></span></div></div>\n      <div class=\"sec-body\" style=\"padding:10px\">\n        <div class=\"tbl-wrap\" style=\"overflow-x:auto\">\n          <table class=\"tbl\" id=\"heatTbl\" style=\"font-size:9px;min-width:0\"></table>\n        </div>\n        <div style=\"display:flex;gap:14px;margin-top:8px;font-size:10px;justify-content:center\">\n          <span><span style=\"display:inline-block;width:10px;height:10px;background:rgba(63,185,80,.18);border-radius:2px;margin-right:4px\"></span>Positiva</span>\n          <span><span style=\"display:inline-block;width:10px;height:10px;background:rgba(227,179,65,.18);border-radius:2px;margin-right:4px\"></span>Breakeven</span>\n          <span><span style=\"display:inline-block;width:10px;height:10px;background:rgba(248,81,73,.18);border-radius:2px;margin-right:4px\"></span>Negativa</span>\n        </div>\n      </div>\n    </div>\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\">\n        <div class=\"sec-title\">📈 Drawdown Recovery <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown Recovery</b><p>Simulação Monte Carlo que estima quantos trades são necessários para recuperar um drawdown sofrido. Insira a conta atual, o alvo e o setup de recuperação — o gráfico mostra a distribuição de cenários possíveis.</p></span></span></div>\n        <div class=\"btn-row\">\n          <button class=\"btn primary\" onclick=\"sh_calcDD()\">▶ Simular</button>\n          <button class=\"btn danger\" onclick=\"sh_clearDDHist()\">Limpar</button>\n        </div>\n      </div>\n      <div class=\"sec-body\">\n        <!-- modo: perda em $ ou % -->\n        <div style=\"display:flex;gap:8px;align-items:center;margin-bottom:10px\">\n          <label style=\"font-size:11px;color:var(--muted);font-weight:500\">Calcular por:</label>\n          <select id=\"ddModo\" onchange=\"sh_calcDDModo()\" style=\"width:120px\">\n            <option value=\"alvo\">Alvo direto ($)</option>\n            <option value=\"pct\">Perda em %</option>\n            <option value=\"usd\">Perda em $</option>\n          </select>\n        </div>\n        <div class=\"fr2\" style=\"margin-bottom:8px\" id=\"ddInputsAlvo\">\n          <div class=\"field\" style=\"margin:0\"><label>Conta atual ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta Atual</b><p>Saldo atual após o drawdown sofrido. A simulação projeta quantos trades são necessários para recuperar o capital.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"ddAtual\" value=\"700\" oninput=\"sh_calcDD()\"><span class=\"u\">$</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Alvo ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Recuperação</b><p>Capital que você quer atingir. Pode ser o capital original (recuperação total) ou um valor intermediário.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"ddAlvo\" value=\"1000\" oninput=\"sh_calcDD()\"><span class=\"u\">$</span></div></div>\n        </div>\n        <div id=\"ddInputsPct\" style=\"display:none;margin-bottom:8px\">\n          <div class=\"fr2\">\n            <div class=\"field\" style=\"margin:0\"><label>Capital original ($)</label><div class=\"iu\"><input type=\"number\" id=\"ddCapOrig\" value=\"1000\" oninput=\"sh_calcDDFromPct()\"><span class=\"u\">$</span></div></div>\n            <div class=\"field\" style=\"margin:0\"><label>Perda sofrida (%)</label><div class=\"iu\"><input type=\"number\" id=\"ddPerdaPct\" value=\"30\" step=\"1\" oninput=\"sh_calcDDFromPct()\"><span class=\"u\">%</span></div></div>\n          </div>\n        </div>\n        <div id=\"ddInputsUSD\" style=\"display:none;margin-bottom:8px\">\n          <div class=\"fr2\">\n            <div class=\"field\" style=\"margin:0\"><label>Capital original ($)</label><div class=\"iu\"><input type=\"number\" id=\"ddCapOrig2\" value=\"1000\" oninput=\"sh_calcDDFromUSD()\"><span class=\"u\">$</span></div></div>\n            <div class=\"field\" style=\"margin:0\"><label>Perda sofrida ($)</label><div class=\"iu\"><input type=\"number\" id=\"ddPerdaUSD\" value=\"300\" step=\"10\" oninput=\"sh_calcDDFromUSD()\"><span class=\"u\">$</span></div></div>\n          </div>\n        </div>\n        <div class=\"fr2\" style=\"margin-bottom:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Win Rate % <span class=\"tip\">?<span class=\"tip-box\"><b>Win Rate</b><p>Percentual de trades vencedores do setup usado para a recuperação. Afeta diretamente a velocidade e probabilidade de recuperação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"ddWR\" value=\"55\" min=\"1\" max=\"99\" oninput=\"sh_calcDD()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>RRR <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Proporção entre alvo e stop do setup de recuperação. RRR maior reduz o número de trades necessários para recuperar.</p></span></span></label><input type=\"number\" id=\"ddRRR\" value=\"1.141\" step=\"0.001\" oninput=\"sh_calcDD()\"></div>\n        </div>\n        <div class=\"fr2\" style=\"margin-bottom:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Risco % / trade <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade %</b><p>Percentual do capital arriscado por operação durante a fase de recuperação. Evite aumentar o risco para \"recuperar mais rápido\" — isso tende a aprofundar o drawdown.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"ddRisco\" value=\"1\" step=\"0.1\" oninput=\"sh_calcDD()\"><span class=\"u\">%</span></div></div>\n          <div></div>\n        </div>\n        <div class=\"fr2\" style=\"gap:8px;margin-bottom:8px\">\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">DD Atual <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown Atual %</b><p>Percentual de queda do capital atual em relação ao capital original. Quanto maior, mais trades são necessários para a recuperação completa.</p></span></span></div><div class=\"out-big cr\" id=\"ddPctOut\">—</div></div>\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Mediana (trades) <span class=\"tip\">?<span class=\"tip-box\"><b>Mediana de Trades para Recuperar</b><p>Em 50% das simulações Monte Carlo, o capital se recupera em até este número de trades com o setup configurado. É a estimativa mais realista — metade dos cenários termina antes, metade depois.</p></span></span></div><div class=\"out-big cy\" id=\"ddMedOut\">—</div></div>\n        </div>\n        <div class=\"out-box\" style=\"padding:8px;margin-bottom:8px;text-align:center\"><div class=\"out-lbl\">Range P10–P90 <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Confiança P10–P90</b><p>Em 80% dos cenários simulados, a recuperação acontece dentro deste intervalo de trades. P10 = cenário adverso (10% dos casos ficam abaixo). P90 = cenário favorável (90% dos casos terminam antes).</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--muted)\" id=\"ddRangeOut\">—</div></div>\n        <div id=\"ddHistBox\" style=\"display:none;background:var(--bg1);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-bottom:8px\">\n          <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px\">Histórico (<span id=\"ddHistCount\">0</span> simulações)</div>\n          <div style=\"display:flex;gap:6px;flex-wrap:wrap\" id=\"ddHistChips\"></div>\n        </div>\n        <div class=\"chart-wrap\" style=\"height:150px\"><canvas id=\"ddChart\"></canvas></div>\n      </div>\n    </div>\n  </div>\n\n  <!-- PROGRESSÃO + DIÁRIO -->\n  <div class=\"sec\" style=\"margin-bottom:16px\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">📊 Progressão de Capital</div>\n      <button class=\"btn primary\" onclick=\"sh_renderPlanilha()\">▶ Calcular</button>\n    </div>\n    <div class=\"sec-body\">\n      <div class=\"fr4\" style=\"margin-bottom:12px\">\n        <div class=\"field\" style=\"margin:0\"><label>Capital Inicial ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Inicial</b><p>Ponto de partida da progressão. Cada linha da tabela representa 1 trade vencedor com juros compostos aplicados sobre o saldo acumulado.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"plCap\" value=\"1000\" step=\"1\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Risco (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade %</b><p>Percentual arriscado por operação. Com juros compostos, cada trade vencedor aplica esse ganho sobre o saldo acumulado — não sobre o capital inicial.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"plRisco\" value=\"1\" step=\"0.1\" min=\"0.01\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>RRR <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Relação entre alvo e stop. Determina o ganho percentual por trade vencedor. Ex: risco 1% com RRR 2 = ganho 2% por trade.</p></span></span></label><input type=\"number\" id=\"plRRR\" value=\"1.141\" step=\"0.001\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>USD/BRL <span class=\"tip\">?<span class=\"tip-box\"><b>Câmbio USD/BRL</b><p>Taxa de câmbio usada para converter os valores de dólar para reais na coluna BRL da tabela. Atualize conforme a cotação atual.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"plCot\" value=\"5.80\" step=\"0.01\"><span class=\"u\">R$</span></div></div>\n      </div>\n      <div class=\"g2\">\n        <div class=\"tbl-wrap tbl-scroll\" style=\"max-height:340px\">\n          <table class=\"tbl\">\n            <thead><tr><th class=\"al\">#</th><th>Capital ($)</th><th>Diferença ($)</th><th>Gain</th><th>Valor (R$)</th><th>Banca (R$)</th></tr></thead>\n            <tbody id=\"planilhaTbody\"></tbody>\n          </table>\n        </div>\n        <div class=\"chart-wrap\" style=\"height:340px;margin-top:0\"><canvas id=\"planilhaChart\"></canvas></div>\n      </div>\n    </div>\n  </div>\n\n\n\n</div><!-- /tab0 -->\n\n<!-- ═══════ ABA 2: LOSS ═══════ -->\n<div class=\"tab-panel\" id=\"pt-tab1\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">⚙️ Parâmetros</div>\n      <button class=\"btn primary\" onclick=\"sh_runSim()\">▶ Simular</button>\n    </div>\n    <div class=\"sec-body\">\n      <div class=\"fr4\">\n        <div class=\"field\"><label>Capital Inicial (R$) <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Inicial</b><p>Saldo de partida para as duas simulações. O Contínuo aplica −1R por trade (pior cenário). O Alternado simula L→W→L→W com o RRR definido.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"sCap\" value=\"5000\" step=\"100\"><span class=\"u\">R$</span></div></div>\n        <div class=\"field\"><label>Risco por trade (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade %</b><p>Percentual do saldo arriscado por operação. No modo contínuo, cada loss reduz o saldo nesse percentual cumulativamente.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"sRisco\" value=\"2\" step=\"0.1\" min=\"0.01\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\"><label>RRR <span style=\"font-size:9px;color:var(--dim)\">(alternado)</span> <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — modo alternado</b><p>Relação risco:retorno usada no modo L→W→L→W. Não afeta o modo contínuo — que aplica −1R fixo por trade independentemente do RRR.</p></span></span></label><input type=\"number\" id=\"sRRR\" value=\"1\" step=\"0.001\"></div>\n        <div class=\"field\"><label>N trades <span class=\"tip\">?<span class=\"tip-box\"><b>Número de Trades</b><p>Quantidade de operações simuladas. Contínuo = N losses seguidos. Alternado = N pares Loss/Win intercalados.</p></span></span></label><input type=\"number\" id=\"sN\" value=\"100\" min=\"5\" max=\"500\" step=\"5\"></div>\n      </div>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:10px 14px;font-size:11px;color:var(--muted);margin-top:4px\">\n        <strong style=\"color:var(--text)\">Modo Contínuo:</strong> perdas consecutivas de <strong style=\"color:var(--red)\">−1R</strong> (pior cenário) &nbsp;|&nbsp;\n        <strong style=\"color:var(--text)\">Modo Alternado:</strong> L→W→L→W… | Loss = −risco%, Win = +risco%×RRR\n      </div>\n    </div>\n  </div>\n  <div class=\"g2\" id=\"simResults\">\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">📉 Loss Contínuo</div><span style=\"font-size:9px;color:var(--red);font-family:'JetBrains Mono',monospace\">−1R por trade</span></div>\n      <div class=\"sec-body\" style=\"padding:10px\">\n        <div class=\"fr2\" style=\"gap:8px;margin-bottom:10px\">\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Saldo Final <span class=\"tip\">?<span class=\"tip-box\"><b>Saldo Final — Loss Contínuo</b><p>Capital restante após N losses consecutivos de −1R cada. Mostra o pior cenário possível: quanto sobra se você perder todos os trades seguidos.</p></span></span></div><div class=\"out-big cr\" id=\"cFinal\">—</div></div>\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Drawdown Total <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown Total — Loss Contínuo</b><p>Percentual de queda do capital inicial após todos os losses consecutivos. Quanto maior o risco por trade, mais devastador é o drawdown em sequências longas.</p></span></span></div><div class=\"out-big cr\" id=\"cDD\">—</div></div>\n        </div>\n        <div class=\"chart-wrap\" style=\"height:200px;margin-bottom:10px\"><canvas id=\"cChart\"></canvas></div>\n        <div class=\"tbl-wrap tbl-scroll\" style=\"max-height:280px\"><table class=\"tbl\"><thead><tr><th>#</th><th>Res</th><th>P&L (R$)</th><th>Saldo (R$)</th><th>DD%</th></tr></thead><tbody id=\"cTbody\"></tbody></table></div>\n      </div>\n    </div>\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">🔀 Loss/Win Alternado</div><span style=\"font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace\">L→W→L→W</span></div>\n      <div class=\"sec-body\" style=\"padding:10px\">\n        <div class=\"fr2\" style=\"gap:8px;margin-bottom:10px\">\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Saldo Final <span class=\"tip\">?<span class=\"tip-box\"><b>Saldo Final — Alternado</b><p>Capital após N pares L→W alternados. Mostra o efeito do RRR no longo prazo: com RRR &gt; 1 o saldo cresce mesmo com 50% de acerto; com RRR &lt; 1 deteriora progressivamente.</p></span></span></div><div class=\"out-big\" id=\"aFinal\">—</div></div>\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Drawdown <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown — Alternado</b><p>Maior queda acumulada registrada durante a sequência L→W. Mesmo com resultado final positivo, o drawdown mostra o pior momento que você passou no caminho.</p></span></span></div><div class=\"out-big cr\" id=\"aRet\">—</div></div>\n        </div>\n        <div class=\"chart-wrap\" style=\"height:200px;margin-bottom:10px\"><canvas id=\"aChart\"></canvas></div>\n        <div class=\"tbl-wrap tbl-scroll\" style=\"max-height:280px\"><table class=\"tbl\"><thead><tr><th>#</th><th>Res</th><th>P&L (R$)</th><th>Saldo (R$)</th><th>Acum%</th></tr></thead><tbody id=\"aTbody\"></tbody></table></div>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- ═══════ ABA 3: CÁLCULOS DT ═══════ -->\n<div class=\"tab-panel\" id=\"pt-tab2\">\n\n  <!-- CÁLCULO RÁPIDO DT: Futuros EUA -->\n  <div class=\"sec\" style=\"margin-bottom:16px\">\n    <div class=\"sec-hdr\"><div class=\"sec-title\">🇺🇸 Cálculo Rápido — Futuros EUA</div></div>\n    <div class=\"sec-body\">\n      <div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:12px\">\n        <!-- SP500 -->\n        <div class=\"dt-card\">\n          <div class=\"dt-card-hdr\">SP-500 <span class=\"tip\" style=\"font-size:9px;vertical-align:middle\">?<span class=\"tip-box\"><b>SP-500 (ES/MES)</b><p>Mini S&P 500. ES = contrato cheio ($50/pt) | MES = micro ($5/pt). Mínimo de variação: 0.25 pts. Negocia de domingo a sexta, ~23h/dia.</p></span></span></div>\n          <div class=\"dt-card-body\">\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Entrada <span class=\"tip\">?<span class=\"tip-box\"><b>Preço de Entrada</b><p>Preço do acionamento da ordem. Para futuros EUA, cada 0.25 pts = 1 tick = $12,50 no ES ou $1,25 no MES.</p></span></span></label><input type=\"number\" id=\"spEntrada\" value=\"4100\" step=\"0.25\" oninput=\"sh_calcDT('sp')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>Stop <span class=\"tip\">?<span class=\"tip-box\"><b>Preço de Stop Loss</b><p>Nível de preço onde a perda máxima é atingida e a posição é encerrada automaticamente.</p></span></span></label><input type=\"number\" id=\"spStop\" value=\"4099.75\" step=\"0.25\" oninput=\"sh_calcDT('sp')\"></div>\n            </div>\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Alvo <span class=\"tip\">?<span class=\"tip-box\"><b>Preço de Alvo (Take Profit)</b><p>Nível de preço do seu take profit. O RRR é calculado automaticamente a partir da distância relativa entre Entrada, Stop e Alvo.</p></span></span></label><input type=\"number\" id=\"spAlvo\" value=\"4101\" step=\"0.25\" oninput=\"sh_calcDT('sp')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>QTD <span class=\"tip\">?<span class=\"tip-box\"><b>Quantidade de Contratos</b><p>Número de contratos operados. O risco e lucro totais são multiplicados por este valor.</p></span></span></label><input type=\"number\" id=\"spQtd\" value=\"1\" min=\"1\" step=\"1\" oninput=\"sh_calcDT('sp')\"></div>\n            </div>\n            <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px\">\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Risco ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red)\" id=\"spRisco\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Lucro ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--green)\" id=\"spLucro\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">RRR</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--blue)\" id=\"spRRRout\">—</div></div>\n            </div>\n            <div class=\"vol-strip\">\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Último <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Último Preço</b><p>Cotação atual do ativo. Usada com Vol% para calcular a volatilidade diária em pontos e sugerir stops baseados em volatilidade.</p></span></span></div><input type=\"number\" id=\"spUlt\" value=\"6000\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('sp')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol% <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Volatilidade Diária %</b><p>Variação percentual média diária do ativo. Multiplicada pelo Último Preço para obter Vol pts. Stop sugerido = 20% da volatilidade diária em pontos.</p></span></span></div><input type=\"number\" id=\"spVolPct\" value=\"0.44\" step=\"0.01\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('sp')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol pts</div><div class=\"vc-val\" id=\"spVolPts\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">20% vol</div><div class=\"vc-val cy\" id=\"spVol20\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco/lote</div><div class=\"vc-val co\" id=\"spRiscoLote\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">QTD vol</div><input type=\"number\" id=\"spVolQtd\" value=\"1\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('sp')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco Tot</div><div class=\"vc-val cr\" id=\"spRiscoTot\">—</div></div>\n            </div>\n          </div>\n        </div>\n        <!-- NASDAQ -->\n        <div class=\"dt-card\">\n          <div class=\"dt-card-hdr\">NASDAQ <span class=\"tip\" style=\"font-size:9px;vertical-align:middle\">?<span class=\"tip-box\"><b>NASDAQ (NQ/MNQ)</b><p>Futuros do índice Nasdaq-100. NQ = contrato cheio ($20/pt) | MNQ = micro ($2/pt). Mínimo: 0.25 pts. Alta volatilidade — stop em pts vale mais em $ que no SP500.</p></span></span></div>\n          <div class=\"dt-card-body\">\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Entrada</label><input type=\"number\" id=\"nqEntrada\" value=\"18260\" step=\"0.25\" oninput=\"sh_calcDT('nq')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>Stop</label><input type=\"number\" id=\"nqStop\" value=\"14999.75\" step=\"0.25\" oninput=\"sh_calcDT('nq')\"></div>\n            </div>\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Alvo</label><input type=\"number\" id=\"nqAlvo\" value=\"15001\" step=\"0.25\" oninput=\"sh_calcDT('nq')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>QTD</label><input type=\"number\" id=\"nqQtd\" value=\"1\" min=\"1\" step=\"1\" oninput=\"sh_calcDT('nq')\"></div>\n            </div>\n            <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px\">\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Risco ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red)\" id=\"nqRisco\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Lucro ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--green)\" id=\"nqLucro\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">RRR</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--blue)\" id=\"nqRRRout\">—</div></div>\n            </div>\n            <div class=\"vol-strip\">\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Último <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Último Preço</b><p>Cotação atual do ativo. Usada com Vol% para calcular a volatilidade diária em pontos e sugerir stops baseados em volatilidade.</p></span></span></div><input type=\"number\" id=\"nqUlt\" value=\"21000\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('nq')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol% <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Volatilidade Diária %</b><p>Variação percentual média diária do ativo. Multiplicada pelo Último Preço para obter Vol pts. Stop sugerido = 20% da volatilidade diária em pontos.</p></span></span></div><input type=\"number\" id=\"nqVolPct\" value=\"0.60\" step=\"0.01\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('nq')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol pts</div><div class=\"vc-val\" id=\"nqVolPts\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">20% vol</div><div class=\"vc-val cy\" id=\"nqVol20\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco/lote</div><div class=\"vc-val co\" id=\"nqRiscoLote\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">QTD vol</div><input type=\"number\" id=\"nqVolQtd\" value=\"1\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('nq')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco Tot</div><div class=\"vc-val cr\" id=\"nqRiscoTot\">—</div></div>\n            </div>\n          </div>\n        </div>\n        <!-- OIL CL -->\n        <div class=\"dt-card\">\n          <div class=\"dt-card-hdr\">OIL (CL) <span class=\"tip\" style=\"font-size:9px;vertical-align:middle\">?<span class=\"tip-box\"><b>Petróleo Bruto (CL/MCL)</b><p>Futuro do WTI Crude Oil. CL = contrato cheio ($1.000/pt) | MCL = micro ($100/pt). Mínimo: 0.01 pts. Alta reatividade a notícias geopolíticas e estoques semanais.</p></span></span></div>\n          <div class=\"dt-card-body\">\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Entrada</label><input type=\"number\" id=\"clEntrada\" value=\"63\" step=\"0.01\" oninput=\"sh_calcDT('cl')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>Stop</label><input type=\"number\" id=\"clStop\" value=\"62\" step=\"0.01\" oninput=\"sh_calcDT('cl')\"></div>\n            </div>\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Alvo</label><input type=\"number\" id=\"clAlvo\" value=\"64\" step=\"0.01\" oninput=\"sh_calcDT('cl')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>QTD</label><input type=\"number\" id=\"clQtd\" value=\"1\" min=\"1\" step=\"1\" oninput=\"sh_calcDT('cl')\"></div>\n            </div>\n            <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px\">\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Risco ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red)\" id=\"clRisco\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Lucro ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--green)\" id=\"clLucro\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">RRR</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--blue)\" id=\"clRRRout\">—</div></div>\n            </div>\n            <div class=\"vol-strip\">\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Último <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Último Preço</b><p>Cotação atual do ativo. Usada com Vol% para calcular a volatilidade diária em pontos e sugerir stops baseados em volatilidade.</p></span></span></div><input type=\"number\" id=\"clUlt\" value=\"69\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('cl')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol% <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Volatilidade Diária %</b><p>Variação percentual média diária do ativo. Multiplicada pelo Último Preço para obter Vol pts. Stop sugerido = 20% da volatilidade diária em pontos.</p></span></span></div><input type=\"number\" id=\"clVolPct\" value=\"2.70\" step=\"0.01\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('cl')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol pts</div><div class=\"vc-val\" id=\"clVolPts\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">20% vol</div><div class=\"vc-val cy\" id=\"clVol20\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco/lote</div><div class=\"vc-val co\" id=\"clRiscoLote\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">QTD vol</div><input type=\"number\" id=\"clVolQtd\" value=\"1\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('cl')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco Tot</div><div class=\"vc-val cr\" id=\"clRiscoTot\">—</div></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- Futuros BR -->\n  <div class=\"sec\" style=\"margin-bottom:16px\">\n    <div class=\"sec-hdr\"><div class=\"sec-title\">🇧🇷 Cálculo Rápido — Futuros Brasileiros</div></div>\n    <div class=\"sec-body\">\n      <div class=\"g2\">\n        <!-- WDO -->\n        <div class=\"dt-card\">\n          <div class=\"dt-card-hdr\">WDOFUT — Mini Dólar <span class=\"tip\" style=\"font-size:9px;vertical-align:middle\">?<span class=\"tip-box\"><b>WDO — Mini Dólar</b><p>Futuro do dólar comercial na B3. Cada ponto = R$10 por contrato. Liquidado financeiramente no vencimento. Negocia das 9h às 18h (horário de Brasília).</p></span></span></div>\n          <div class=\"dt-card-body\">\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Entrada</label><input type=\"number\" id=\"wdEntrada\" value=\"5000\" step=\"0.5\" oninput=\"sh_calcDT('wd')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>Stop</label><input type=\"number\" id=\"wdStop\" value=\"5017\" step=\"0.5\" oninput=\"sh_calcDT('wd')\"></div>\n            </div>\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Alvo</label><input type=\"number\" id=\"wdAlvo\" value=\"5007\" step=\"0.5\" oninput=\"sh_calcDT('wd')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>QTD</label><input type=\"number\" id=\"wdQtd\" value=\"2\" min=\"1\" step=\"1\" oninput=\"sh_calcDT('wd')\"></div>\n            </div>\n            <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px\">\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Risco (R$)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red)\" id=\"wdRisco\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Lucro (R$)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--green)\" id=\"wdLucro\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">RRR</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--blue)\" id=\"wdRRRout\">—</div></div>\n            </div>\n            <div class=\"vol-strip\">\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Último <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Último Preço</b><p>Cotação atual do ativo. Usada com Vol% para calcular a volatilidade diária em pontos e sugerir stops baseados em volatilidade.</p></span></span></div><input type=\"number\" id=\"wdUlt\" value=\"5700\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wd')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol% <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Volatilidade Diária %</b><p>Variação percentual média diária do ativo. Multiplicada pelo Último Preço para obter Vol pts. Stop sugerido = 20% da volatilidade diária em pontos.</p></span></span></div><input type=\"number\" id=\"wdVolPct\" value=\"1.10\" step=\"0.01\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wd')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol pts</div><div class=\"vc-val\" id=\"wdVolPts\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">20% vol</div><div class=\"vc-val cy\" id=\"wdVol20\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">R$/lote</div><div class=\"vc-val co\" id=\"wdRiscoLote\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">QTD vol</div><input type=\"number\" id=\"wdVolQtd\" value=\"2\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wd')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco R$</div><div class=\"vc-val cr\" id=\"wdRiscoTot\">—</div></div>\n            </div>\n          </div>\n        </div>\n        <!-- WIN -->\n        <div class=\"dt-card\">\n          <div class=\"dt-card-hdr\">WINFUT — Mini Índice <span class=\"tip\" style=\"font-size:9px;vertical-align:middle\">?<span class=\"tip-box\"><b>WIN — Mini Índice Bovespa</b><p>Futuro do Ibovespa na B3. Cada ponto = R$0,20 por contrato. Negocia das 9h às 18h55 (horário de Brasília). Requer mais contratos para o mesmo risco em R$ em comparação ao WDO.</p></span></span></div>\n          <div class=\"dt-card-body\">\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Entrada</label><input type=\"number\" id=\"wiEntrada\" value=\"136660\" step=\"10\" oninput=\"sh_calcDT('wi')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>Stop</label><input type=\"number\" id=\"wiStop\" value=\"136000\" step=\"10\" oninput=\"sh_calcDT('wi')\"></div>\n            </div>\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Alvo</label><input type=\"number\" id=\"wiAlvo\" value=\"138460\" step=\"10\" oninput=\"sh_calcDT('wi')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>QTD</label><input type=\"number\" id=\"wiQtd\" value=\"7\" min=\"1\" step=\"1\" oninput=\"sh_calcDT('wi')\"></div>\n            </div>\n            <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px\">\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Risco (R$)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red)\" id=\"wiRisco\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Lucro (R$)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--green)\" id=\"wiLucro\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">RRR</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--blue)\" id=\"wiRRRout\">—</div></div>\n            </div>\n            <div class=\"vol-strip\">\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Último <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Último Preço</b><p>Cotação atual do ativo. Usada com Vol% para calcular a volatilidade diária em pontos e sugerir stops baseados em volatilidade.</p></span></span></div><input type=\"number\" id=\"wiUlt\" value=\"137400\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wi')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol% <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Volatilidade Diária %</b><p>Variação percentual média diária do ativo. Multiplicada pelo Último Preço para obter Vol pts. Stop sugerido = 20% da volatilidade diária em pontos.</p></span></span></div><input type=\"number\" id=\"wiVolPct\" value=\"1.60\" step=\"0.01\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wi')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol pts</div><div class=\"vc-val\" id=\"wiVolPts\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">20% vol</div><div class=\"vc-val cy\" id=\"wiVol20\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">R$/lote</div><div class=\"vc-val co\" id=\"wiRiscoLote\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">QTD vol</div><input type=\"number\" id=\"wiVolQtd\" value=\"2\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wi')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco R$</div><div class=\"vc-val cr\" id=\"wiRiscoTot\">—</div></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- BLOCO UNIFICADO: Gerenciamento + Cálculo de Ações lado a lado -->\n  <div class=\"g2\" style=\"gap:16px\">\n\n    <!-- ESQUERDA: Gerenciamento WIN & WDO -->\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\">\n        <div class=\"sec-title\">📈 Gerenciamento de Risco — WIN &amp; WDO</div>\n        <button class=\"btn primary\" onclick=\"sh_calcAcoesFull()\">▶ Atualizar</button>\n      </div>\n      <div class=\"sec-body\">\n\n        <!-- VOLATILIDADE — topo -->\n        <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:14px\">\n          <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">\n            Volatilidade Histórica — Máximo de Risco por Trade\n            <span style=\"color:var(--dim);text-transform:none;letter-spacing:0;font-size:9px\"> · Preencha abaixo ou use vol-strip dos futuros BR</span>\n          </div>\n          <div class=\"fr2\" style=\"gap:8px;margin-bottom:8px\">\n            <div class=\"field\" style=\"margin:0\"><label>Vol WIN — 20% da VH (pts)</label><input type=\"number\" id=\"winVolStop\" value=\"175.87\" step=\"0.01\" oninput=\"sh_calcAcoes()\"></div>\n            <div class=\"field\" style=\"margin:0\"><label>Vol DOL — 20% da VH (pts)</label><input type=\"number\" id=\"dolVolStop\" value=\"248.52\" step=\"0.01\" oninput=\"sh_calcAcoes()\"></div>\n          </div>\n          <table class=\"tbl\">\n            <thead><tr><th></th><th>Máx Risco/Trade</th><th>Diário ×3</th><th>Semanal ×6</th><th style=\"color:var(--yellow)\">Mensal ×12</th></tr></thead>\n            <tbody>\n              <tr>\n                <td class=\"al\" style=\"color:var(--green);font-weight:700\">WIN</td>\n                <td class=\"co\" id=\"winMRT\">—</td><td class=\"cb\" id=\"winDia\">—</td><td class=\"cb\" id=\"winSem\">—</td><td class=\"cy\" id=\"winMes\">—</td>\n              </tr>\n              <tr>\n                <td class=\"al\" style=\"color:var(--blue);font-weight:700\">DOL</td>\n                <td class=\"co\" id=\"dolMRT\">—</td><td class=\"cb\" id=\"dolDia\">—</td><td class=\"cb\" id=\"dolSem\">—</td><td class=\"cy\" id=\"dolMes\">—</td>\n              </tr>\n              <tr><td class=\"al cm\">Nº Stops</td><td class=\"cm\">—</td><td class=\"cm\">3</td><td class=\"cm\">6</td><td class=\"cm\">12</td></tr>\n            </tbody>\n          </table>\n        </div>\n\n        <!-- Por Pontos -->\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px\">\n          Por Pontos de Risco <span style=\"text-transform:none;letter-spacing:0\">— WIN: pts × R$0,20/pt · DOL: pts × R$10/pt</span>\n        </div>\n        <table class=\"tbl\" style=\"margin-bottom:14px\">\n          <thead><tr><th></th><th>Risco (R$)</th><th>Pts de Risco</th><th>R$/Ponto</th><th>N Contratos</th></tr></thead>\n          <tbody>\n            <tr>\n              <td class=\"al\" style=\"color:var(--green);font-weight:700\">WIN</td>\n              <td><input type=\"number\" id=\"winRiscoRef\" value=\"250\" min=\"1\" oninput=\"sh_calcGerRisco()\" style=\"width:65px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:4px;padding:3px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;text-align:center\"></td>\n              <td><input type=\"number\" id=\"winPts\" value=\"150\" min=\"1\" oninput=\"sh_calcGerRisco()\" style=\"width:65px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:4px;padding:3px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;text-align:center\"></td>\n              <td class=\"cy\" id=\"winPorPto\">—</td><td class=\"cb\" id=\"winNctt\">—</td>\n            </tr>\n            <tr>\n              <td class=\"al\" style=\"color:var(--blue);font-weight:700\">DOL</td>\n              <td><input type=\"number\" id=\"dolRiscoRef\" value=\"250\" min=\"1\" oninput=\"sh_calcGerRisco()\" style=\"width:65px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:4px;padding:3px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;text-align:center\"></td>\n              <td><input type=\"number\" id=\"dolPts\" value=\"10\" min=\"1\" oninput=\"sh_calcGerRisco()\" style=\"width:65px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:4px;padding:3px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;text-align:center\"></td>\n              <td class=\"cy\" id=\"dolPorPto\">—</td><td class=\"cb\" id=\"dolNctt\">—</td>\n            </tr>\n          </tbody>\n        </table>\n\n        <!-- Como calcular VH -->\n        <div style=\"background:var(--bg1);border:1px solid var(--border);border-radius:8px;padding:10px;font-size:11px;color:var(--muted);line-height:1.6\">\n          <div style=\"color:var(--text);font-weight:600;margin-bottom:6px;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.08em\">Como calcular a Volatilidade Histórica (VH)</div>\n          <ol style=\"padding-left:16px;font-size:10px\">\n            <li>Insira no gráfico o <strong>VH Aritmético de 20 períodos</strong>.</li>\n            <li>Adicione uma <strong>Média Móvel de 200 períodos</strong> na janela do VH.</li>\n            <li>No gráfico intraday (5 min), observe onde a média está posicionada e trace uma linha.</li>\n            <li>Busque os valores da média de 200, considerando os <strong>últimos 3 meses</strong>.</li>\n            <li>No gráfico diário, utilize o valor das <strong>Bandas de Pisani</strong> e a média dos candles.</li>\n          </ol>\n          <div class=\"sep\"></div>\n          <div style=\"font-size:10px;color:var(--dim)\">Ao configurar corretamente a volatilidade e o nível de risco, o número de operações permitidas é calculado automaticamente.</div>\n        </div>\n      </div>\n    </div>\n\n    <!-- DIREITA: Cálculo de Trading em Ações -->\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">📋 Cálculo de Trading em Ações</div></div>\n      <div class=\"sec-body\">\n        <div class=\"fr2\" style=\"gap:8px;margin-bottom:10px\">\n          <div class=\"field\" style=\"margin:0\"><label>Risco Financeiro (R$)</label><div class=\"iu\"><input type=\"number\" id=\"acRisco\" value=\"250\" oninput=\"sh_calcAcoes()\"><span class=\"u\">R$</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Dif. Compra/Venda (R$)</label><div class=\"iu\"><input type=\"number\" id=\"acDif\" value=\"0.45\" step=\"0.01\" oninput=\"sh_calcAcoes()\"><span class=\"u\">R$</span></div></div>\n        </div>\n        <div class=\"field\" style=\"margin-bottom:12px\"><label>Tx. Corretagem (R$)</label><div class=\"iu\"><input type=\"number\" id=\"acCorr\" value=\"0\" step=\"0.01\" oninput=\"sh_calcAcoes()\"><span class=\"u\">R$</span></div></div>\n        <div style=\"background:var(--bg1);border:1px solid var(--border);border-radius:6px;padding:12px 14px\">\n          <div class=\"out-lbl\" style=\"margin-bottom:4px\">Quantidade Permitida (Ações)</div>\n          <div class=\"out-big cb\" id=\"acQtd\">—</div>\n          <div style=\"font-size:10px;color:var(--dim);margin-top:4px\">Acima de 75 pode arredondar pra cima</div>\n        </div>\n      </div>\n    </div>\n\n  </div><!-- /g2 -->\n\n</div><!-- /tab2 -->\n</div><!-- #app --></div><!-- /mod-plano -->\n\n<!-- ──────────── MÓDULO 2: TRADE SIMULATOR ──────────── -->\n<div class=\"hub-module\" id=\"mod-tradesim\">\n  <div style=\"padding:12px 20px;border-bottom:1px solid var(--border);background:var(--bg1);display:flex;align-items:center;justify-content:space-between\">\n    <span style=\"font-size:11px;color:var(--muted)\">Monte Carlo · Sequências · Distribuição de Resultados</span>\n    <button class=\"run-btn\" onclick=\"sh_tsRunAll()\">\n      <svg viewBox=\"0 0 16 16\" fill=\"currentColor\"><path d=\"M3 3l10 5-10 5V3z\"/></svg>\n      Simular\n    </button>\n  </div>\n<div class=\"ts-layout\">\n\n<!-- ─── SIDEBAR ─── -->\n<div class=\"ts-sidebar\">\n<div class=\"ts-sidebar-inner\">\n\n  <div class=\"ts-sidebar-group\">\n    <div class=\"ts-sidebar-group-label\">// Capital & Risco</div>\n    <div class=\"field\">\n      <label>Capital Inicial <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Inicial</b><p>Saldo de partida do simulador. Todas as simulações partem deste valor. Com juros compostos ativos, o risco em $ por trade muda conforme o saldo evolui a cada operação.</p></span></span></label>\n      <div class=\"input-unit\">\n        <input type=\"number\" id=\"ts-capital\" value=\"10000\" min=\"100\" step=\"100\">\n        <span class=\"unit\">$</span>\n      </div>\n    </div>\n    <div class=\"field\">\n      <label>Risco por Trade <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade %</b><p>Percentual do capital arriscado por operação. Com juros compostos, o valor em $ muda a cada trade conforme o saldo cresce ou diminui.</p></span></span></label>\n      <div class=\"range-row\">\n        <input type=\"range\" id=\"riskRange\" min=\"0.1\" max=\"5\" step=\"0.1\" value=\"1\" oninput=\"sh_syncRange('risk','riskRange',this.value,'%')\">\n        <span class=\"range-val\" id=\"riskRangeVal\">1.0%</span>\n      </div>\n      <div class=\"input-unit\" style=\"margin-top:6px\">\n        <input type=\"number\" id=\"risk\" value=\"1\" min=\"0.1\" max=\"10\" step=\"0.1\" oninput=\"sh_syncInput('risk','riskRange',this.value,'%')\">\n        <span class=\"unit\">%</span>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"ts-sidebar-group\">\n    <div class=\"ts-sidebar-group-label\">// Limites Diários</div>\n    <div class=\"field-row\">\n      <div class=\"field\">\n        <label>Stop Diário <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Diário %</b><p>Limite de perda total no dia. Se o saldo cair abaixo deste percentual do capital inicial, o dia encerra automaticamente na simulação — prevenindo overtrading em dias ruins.</p></span></span></label>\n        <div class=\"input-unit\">\n          <input type=\"number\" id=\"dailyStop\" value=\"2\" min=\"0.1\" max=\"20\" step=\"0.1\">\n          <span class=\"unit\">%</span>\n        </div>\n      </div>\n      <div class=\"field\">\n        <label>Meta Diária <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Diária %</b><p>Alvo de lucro por dia simulado. Se atingido antes do máximo de trades, o dia encerra automaticamente — modelando uma gestão de encerrar quando o alvo é batido.</p></span></span></label>\n        <div class=\"input-unit\">\n          <input type=\"number\" id=\"dailyTarget\" value=\"1\" min=\"0.1\" max=\"20\" step=\"0.1\">\n          <span class=\"unit\">%</span>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"ts-sidebar-group\">\n    <div class=\"ts-sidebar-group-label\">// Por Operação (RRR)</div>\n    <div class=\"field-row\">\n      <div class=\"field\">\n        <label>Stop/Trade <span class=\"tip\">?<span class=\"tip-box\"><b>Stop por Trade %</b><p>Percentual do capital que representa o stop loss desta operação. Junto com o Alvo, define o RRR calculado abaixo. Valores em % do capital — não em pips.</p></span></span></label>\n        <div class=\"input-unit\">\n          <input type=\"number\" id=\"sl\" value=\"1\" min=\"0.01\" max=\"10\" step=\"0.01\">\n          <span class=\"unit\">%</span>\n        </div>\n      </div>\n      <div class=\"field\">\n        <label>Alvo/Trade <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo por Trade %</b><p>Percentual do capital que representa o take profit. RRR = Alvo ÷ Stop. Ex: Stop 1% e Alvo 2% = RRR 2:1.</p></span></span></label>\n        <div class=\"input-unit\">\n          <input type=\"number\" id=\"tp\" value=\"1\" min=\"0.01\" max=\"10\" step=\"0.01\">\n          <span class=\"unit\">%</span>\n        </div>\n      </div>\n    </div>\n    <div class=\"field\">\n      <label>RRR calculado <span class=\"tip\">?<span class=\"tip-box\"><b>RRR Calculado</b><p>Relação risco:retorno resultante dos valores de Stop e Alvo definidos. Exibido em tempo real conforme você altera os campos acima.</p></span></span></label>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--blue)\" id=\"rrrDisplay\">1 : 1.00</div>\n    </div>\n    <div style=\"font-size:10px;color:var(--muted);margin-top:4px;\">\n      Risco/Retorno calculado a partir de Stop e Alvo acima.<br>\n      <span style=\"color:var(--dim)\">Estes valores são % do capital em conta (não pips).</span>\n    </div>\n  </div>\n\n  <div class=\"ts-sidebar-group\">\n    <div class=\"ts-sidebar-group-label\">// Operações & Win Rate</div>\n    <div class=\"field\">\n      <label>Max Trades/Dia <span class=\"tip\">?<span class=\"tip-box\"><b>Máximo de Trades por Dia</b><p>Limite de operações por sessão simulada. Controla a frequência e modela uma gestão anti-overtrading. O dia encerra quando o stop diário, a meta diária ou este limite é atingido.</p></span></span></label>\n      <div class=\"range-row\">\n        <input type=\"range\" id=\"tradesRange\" min=\"1\" max=\"20\" step=\"1\" value=\"10\" oninput=\"sh_syncRange('trades','tradesRange',this.value,'')\">\n        <span class=\"range-val\" id=\"tradesRangeVal\">10</span>\n      </div>\n      <input type=\"number\" id=\"trades\" value=\"10\" min=\"1\" max=\"50\" step=\"1\" oninput=\"sh_syncInput('trades','tradesRange',this.value,'')\">\n    </div>\n    <div class=\"field\">\n      <label>Win Rate Estimado <span class=\"tip\">?<span class=\"tip-box\"><b>Win Rate Estimado</b><p>Probabilidade de cada trade ser vencedor. A simulação usa esse percentual aleatoriamente para resolver cada trade. Use o win rate histórico do seu setup para resultados mais realistas.</p></span></span></label>\n      <div class=\"range-row\">\n        <input type=\"range\" id=\"wrRange\" min=\"10\" max=\"90\" step=\"1\" value=\"55\" oninput=\"sh_syncRange('wr','wrRange',this.value,'%')\">\n        <span class=\"range-val\" id=\"wrRangeVal\">55%</span>\n      </div>\n      <div class=\"input-unit\">\n        <input type=\"number\" id=\"wr\" value=\"55\" min=\"0\" max=\"100\" step=\"1\" oninput=\"sh_syncInput('wr','wrRange',this.value,'%')\">\n        <span class=\"unit\">%</span>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"ts-sidebar-group\">\n    <div class=\"ts-sidebar-group-label\">// Simulação</div>\n    <div class=\"field-row\">\n      <div class=\"field\">\n        <label>Dias Úteis <span class=\"tip\">?<span class=\"tip-box\"><b>Dias Úteis</b><p>Horizonte de tempo da simulação. Representa o número de sessões de trading simuladas. Use 20–22 para um mês, 60 para um trimestre, 252 para o ano completo.</p></span></span></label>\n        <input type=\"number\" id=\"days\" value=\"60\" min=\"5\" max=\"500\" step=\"5\">\n      </div>\n      <div class=\"field\">\n        <label>Ciclos (MC) <span class=\"tip\">?<span class=\"tip-box\"><b>Ciclos Monte Carlo</b><p>Quantidade de simulações independentes executadas para gerar a distribuição de resultados. Mais ciclos = maior precisão estatística. 200 já é suficiente; acima de 500 o ganho marginal é mínimo.</p></span></span></label>\n        <input type=\"number\" id=\"cycles\" value=\"200\" min=\"10\" max=\"1000\" step=\"10\">\n      </div>\n    </div>\n    <div class=\"field-row\">\n      <div class=\"field\">\n        <label>Seq. de Trades <span class=\"tip\">?<span class=\"tip-box\"><b>Sequência de Trades</b><p>Total de operações simuladas no gráfico de Sequência Aleatória. Permite visualizar como wins e losses se distribuem numa série de N trades com o win rate configurado.</p></span></span></label>\n        <input type=\"number\" id=\"seqTrades\" value=\"40\" min=\"5\" max=\"200\" step=\"5\">\n      </div>\n      <div class=\"field\">\n        <label>Trades/Ciclo <span class=\"tip\">?<span class=\"tip-box\"><b>Trades por Ciclo</b><p>Número de operações por ciclo no gráfico de Ciclos Fixos. Define o tamanho de cada período — ex.: 10 trades/ciclo em 60 dias gera múltiplos ciclos e mostra o crescimento composto ciclo a ciclo.</p></span></span></label>\n        <input type=\"number\" id=\"tradesPerCycle\" value=\"10\" min=\"1\" max=\"50\" step=\"1\">\n      </div>\n    </div>\n  </div>\n\n</div><!-- end ts-sidebar-inner -->\n</div>\n<!-- end sidebar -->\n\n<!-- ─── MAIN ─── -->\n<div class=\"ts-main\">\n\n  <!-- WARNING -->\n  <div class=\"warning-box\" id=\"warningBox\">\n    <div class=\"icon\">⚠️</div>\n    <p id=\"warningText\">Carregando análise...</p>\n  </div>\n\n  <!-- METRICS -->\n  <div class=\"metrics-row\">\n    <div class=\"ts-metric m-blue\">\n      <div class=\"ts-metric-label\">Breakeven WR <span class=\"tip\">?<span class=\"tip-box\"><b>Win Rate de Breakeven</b><p>Percentual mínimo de acertos necessário para o setup não perder dinheiro no longo prazo, dado o RRR configurado. Fórmula: 1 ÷ (1 + RRR). Com WR abaixo disso, o setup é matematicamente destruidor.</p></span></span></div>\n      <div class=\"ts-metric-value col-blue\" id=\"mBeWR\">—</div>\n      <div class=\"ts-metric-sub\">win rate mínimo</div>\n    </div>\n    <div class=\"ts-metric m-yellow\">\n      <div class=\"ts-metric-label\">Expectativa/Trade <span class=\"tip\">?<span class=\"tip-box\"><b>Expectativa por Trade</b><p>Retorno médio esperado por operação em dólares, considerando WR × ganho − (1−WR) × perda. Positivo = setup lucrativo no longo prazo. Negativo = setup destrutivo.</p></span></span></div>\n      <div class=\"ts-metric-value\" id=\"mEV\">—</div>\n      <div class=\"ts-metric-sub\">valor esperado</div>\n    </div>\n    <div class=\"ts-metric m-green\">\n      <div class=\"ts-metric-label\">Espect. Diária <span class=\"tip\">?<span class=\"tip-box\"><b>Expectativa Diária</b><p>Retorno médio esperado por dia útil: Expectativa/Trade × Max Trades/Dia. Representa o ganho esperado se você executar o setup com consistência todos os dias.</p></span></span></div>\n      <div class=\"ts-metric-value\" id=\"mDailyEV\">—</div>\n      <div class=\"ts-metric-sub\">por dia útil</div>\n    </div>\n    <div class=\"ts-metric m-red\">\n      <div class=\"ts-metric-label\">Max SL Consec. <span class=\"tip\">?<span class=\"tip-box\"><b>Máximo de Stops Consecutivos</b><p>Número máximo de losses seguidos antes de atingir o Stop Diário configurado. Use para se preparar psicologicamente: saber que pode levar X stops seguidos sem quebrar o dia ajuda a manter a disciplina.</p></span></span></div>\n      <div class=\"ts-metric-value col-red\" id=\"mMaxSL\">—</div>\n      <div class=\"ts-metric-sub\">antes de stop diário</div>\n    </div>\n    <div class=\"ts-metric m-purple\">\n      <div class=\"ts-metric-label\">Proj. 20 dias <span class=\"tip\">?<span class=\"tip-box\"><b>Projeção em 20 Dias</b><p>Estimativa de resultado acumulado em 20 dias úteis (~1 mês), calculada com a expectativa diária. É uma projeção matemática — não considera variância. O Monte Carlo abaixo mostra a distribuição real de cenários.</p></span></span></div>\n      <div class=\"ts-metric-value col-purple\" id=\"mProj20\">—</div>\n      <div class=\"ts-metric-sub\">com WR atual</div>\n    </div>\n  </div>\n\n  <!-- MONTE CARLO EQUITY CURVE -->\n  <div class=\"ts-panel ts-panel-full\">\n    <div class=\"ts-panel-header\">\n      <div class=\"ts-panel-title\"><span class=\"icon\">📈</span> Curva de Equity — Monte Carlo <span class=\"tip\">?<span class=\"tip-box\"><b>Curva de Equity — Monte Carlo</b><p>Simulação de múltiplos cenários aleatórios com os parâmetros configurados. Cada linha representa uma sequência possível de trades. A dispersão mostra a variância do setup — quanto mais espalhadas as curvas, maior a instabilidade dos resultados mesmo com edge positivo.</p></span></span></div>\n      <div style=\"font-size:10px;color:var(--muted)\" id=\"mcInfo\">—</div>\n    </div>\n    <div class=\"ts-panel-body\">\n      <div class=\"legend\" id=\"mcLegend\"></div>\n      <div class=\"chart-container\" style=\"height:240px\">\n        <canvas id=\"mcCanvas\" height=\"240\"></canvas>\n      </div>\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px\" id=\"mcStats\"></div>\n    </div>\n  </div>\n\n  <!-- TWO PANELS -->\n  <div class=\"panels-grid\">\n\n    <!-- CENÁRIOS -->\n    <div class=\"ts-panel\">\n      <div class=\"ts-panel-header\">\n        <div class=\"ts-panel-title\"><span class=\"icon\">📊</span> Cenários — N dias úteis <span class=\"tip\">?<span class=\"tip-box\"><b>Cenários Simulados</b><p>Cada linha é um período simulado com trades aleatórios. Mostra a distribuição de resultados possíveis: alguns dias terminam no stop, outros na meta, outros no meio do caminho. Use para entender a variância real do setup no prazo configurado.</p></span></span></div>\n      </div>\n      <div class=\"ts-panel-body\" style=\"padding:0\">\n        <table class=\"data-table\" id=\"scenarioTable\">\n          <thead>\n            <tr>\n              <th>Cenário</th><th>WR</th><th>Gains</th><th>Stops</th><th>Result %</th><th>$Capital</th><th>Status</th>\n            </tr>\n          </thead>\n          <tbody></tbody>\n        </table>\n      </div>\n    </div>\n\n    <!-- RECUPERAÇÃO -->\n    <div class=\"ts-panel\">\n      <div class=\"ts-panel-header\">\n        <div class=\"ts-panel-title\"><span class=\"icon\">🔁</span> Análise de Recuperação <span class=\"tip\">?<span class=\"tip-box\"><b>Análise de Recuperação</b><p>Para cada nível de perda sofrida, mostra quantos dias são necessários para recuperar o capital com o setup configurado, e qual win rate mínimo seria necessário para recuperar em tempo razoável.</p></span></span></div>\n      </div>\n      <div class=\"ts-panel-body\" style=\"padding:0\">\n        <table class=\"data-table\" id=\"recoveryTable\">\n          <thead>\n            <tr>\n              <th>Situação</th><th>Perda</th><th>Dias p/ recuperar</th><th>WR necessário</th>\n            </tr>\n          </thead>\n          <tbody></tbody>\n        </table>\n      </div>\n    </div>\n\n  </div>\n\n  <!-- SEQUENCE + CYCLE -->\n  <div class=\"panels-grid\">\n\n    <!-- SEQUÊNCIA DE TRADES -->\n    <div class=\"ts-panel\">\n      <div class=\"ts-tab-bar\">\n        <button class=\"ts-tab-btn active\" onclick=\"sh_tsTab(this,'seqRandom')\">Sequência Aleatória <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Sequência Aleatória</b><p>Simula uma sequência de N trades com o win rate configurado, resolvendo cada operação aleatoriamente. Útil para visualizar como sequências de loss/win se distribuem na prática — e por que o drawdown médio é inevitável mesmo em setups lucrativos.</p></span></span></button>\n        <button class=\"ts-tab-btn\" onclick=\"sh_tsTab(this,'seqFixed')\">Ciclos Fixos <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Ciclos Fixos</b><p>Divide o total de dias em ciclos de N trades cada e mostra como o capital evolui ciclo a ciclo. Útil para planejar metas por período e entender o crescimento composto ao longo do tempo.</p></span></span></button>\n      </div>\n      <div class=\"ts-tab-content active\" id=\"seqRandom\">\n        <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:10px\">\n          <div style=\"font-size:11px;color:var(--muted)\">Simulação de <span id=\"seqN\" class=\"mono col-blue\">40</span> trades com win rate configurado</div>\n          <button onclick=\"sh_tsRunAll()\" style=\"background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:4px 12px;border-radius:5px;cursor:pointer;font-size:11px\">↺ Novo</button>\n        </div>\n        <div class=\"trade-seq\" id=\"tradeSeqViz\"></div>\n        <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px\" id=\"seqStats\"></div>\n      </div>\n      <div class=\"ts-tab-content\" id=\"seqFixed\">\n        <div style=\"font-size:11px;color:var(--muted);margin-bottom:10px\">Ciclos de <span id=\"cycleN\" class=\"mono col-blue\">10</span> trades — progressão do capital</div>\n        <div class=\"chart-container\" style=\"height:180px\">\n          <canvas id=\"cycleCanvas\" height=\"180\"></canvas>\n        </div>\n        <div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px\" id=\"cycleStats\"></div>\n      </div>\n    </div>\n\n    <!-- IMPACTO POR DIA -->\n    <div class=\"ts-panel\">\n      <div class=\"ts-panel-header\">\n        <div class=\"ts-panel-title\"><span class=\"icon\">🎯</span> Impacto Intraday <span class=\"tip\">?<span class=\"tip-box\"><b>Impacto Intraday</b><p>Simule cenários do dia com SL e Stop Diário independentes. O RRR é calculado a partir do SL local e do RRR configurado na sidebar. Win Rate necessário é o breakeven para o setup atual.</p></span></span></div>\n      </div>\n      <div class=\"ts-panel-body\">\n        <div style=\"display:flex;align-items:flex-end;gap:16px;margin-bottom:12px;flex-wrap:wrap\">\n          <div class=\"field\" style=\"margin:0;flex:0 0 auto\">\n            <label style=\"font-size:10px;color:var(--muted);margin-bottom:4px;display:block\">SL/Trade</label>\n            <div class=\"input-unit\" style=\"width:90px\">\n              <input type=\"number\" id=\"id-sl\" value=\"1\" min=\"0.01\" max=\"10\" step=\"0.01\" oninput=\"sh_buildIntraday()\">\n              <span class=\"unit\">%</span>\n            </div>\n          </div>\n          <div class=\"field\" style=\"margin:0;flex:0 0 auto\">\n            <label style=\"font-size:10px;color:var(--muted);margin-bottom:4px;display:block\">Stop do Dia</label>\n            <div class=\"input-unit\" style=\"width:90px\">\n              <input type=\"number\" id=\"id-dailyStop\" value=\"2\" min=\"0.1\" max=\"20\" step=\"0.1\" oninput=\"sh_buildIntraday()\">\n              <span class=\"unit\">%</span>\n            </div>\n          </div>\n          <div style=\"display:flex;flex-direction:column;gap:2px\">\n            <span style=\"font-size:10px;color:var(--muted)\">RRR calculado</span>\n            <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:5px 10px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--blue);white-space:nowrap\" id=\"id-rrrDisplay\">1 : 1.00</div>\n          </div>\n          <div style=\"display:flex;flex-direction:column;gap:2px\">\n            <span style=\"font-size:10px;color:var(--muted)\">Alvo/Trade</span>\n            <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:5px 10px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--green);white-space:nowrap\" id=\"id-tpDisplay\">1.00%</div>\n          </div>\n        </div>\n        <table class=\"data-table\" id=\"intradayTable\">\n          <thead>\n            <tr><th>#Trades</th><th>Todos Win</th><th>50% Acerto</th><th>Todos Loss</th><th>Stop Diário em</th><th>WR Necessário</th></tr>\n          </thead>\n          <tbody></tbody>\n        </table>\n      </div>\n    </div>\n\n  </div>\n\n  <!-- DISTRIBUIÇÃO DE RESULTADOS -->\n  <div class=\"ts-panel ts-panel-full\">\n    <div class=\"ts-panel-header\">\n      <div class=\"ts-panel-title\"><span class=\"icon\">📉</span> Distribuição de Resultados Finais (Monte Carlo) <span class=\"tip\">?<span class=\"tip-box\"><b>Distribuição de Resultados Finais</b><p>Histograma dos resultados finais de todas as simulações Monte Carlo. Mostra com que frequência o setup termina em cada faixa de resultado. Curva deslocada para a direita = setup com edge positivo. Cauda esquerda longa = risco de drawdown severo em alguns cenários.</p></span></span></div>\n    </div>\n    <div class=\"ts-panel-body\">\n      <div class=\"chart-container\" style=\"height:180px\">\n        <canvas id=\"distCanvas\" height=\"180\"></canvas>\n      </div>\n      <div style=\"display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:14px\" id=\"distStats\"></div>\n    </div>\n  </div>\n\n</div><!-- end main -->\n</div><!-- end layout --></div><!-- /mod-tradesim -->\n\n<!-- ──────────── MÓDULO 3: FERRAMENTAS MENTAIS ──────────── -->\n<div class=\"hub-module\" id=\"mod-mental\">\n<span id=\"tinfo\" style=\"display:none\"></span>\n  <div style=\"padding:12px 20px;border-bottom:1px solid var(--border);background:var(--bg1);display:flex;align-items:center;justify-content:space-between\">\n    <span style=\"font-size:11px;color:var(--muted)\">Simulação de Blocos de Risco · Análise de Ruína</span>\n    <button class=\"run-btn\" onclick=\"sh_fmSimular()\">\n      <svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"currentColor\"><path d=\"M3 2.5l10 5.5-10 5.5V2.5z\"/></svg>\n      Simular\n    </button>\n  </div>\n<div id=\"fm-app\">\n<div class=\"fm-layout\">\n\n  <!-- ── SIDEBAR ── -->\n  <div class=\"fm-sidebar\">\n  <div class=\"fm-sidebar-inner\">\n\n    <div class=\"sg\">\n      <div class=\"sgl\">Configuração</div>\n      <div class=\"field\">\n        <label>Capital Inicial ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Inicial</b><p>Saldo de partida para as colunas de simulação por bloco de risco. Cada coluna aplica um percentual diferente do capital como risco por trade, mostrando como o resultado varia conforme o tamanho da posição.</p></span></span></label>\n        <div class=\"iu\"><input type=\"number\" id=\"fm-capital\" value=\"1000\" min=\"100\" step=\"100\" oninput=\"sh_atualizarTabelaRec()\"><span class=\"u\">$</span></div>\n      </div>\n      <div class=\"field\">\n        <label>Nº de Trades <span class=\"tip\">?<span class=\"tip-box\"><b>Número de Trades</b><p>Total de operações por simulação. Cada clique em \"Simular\" roda N trades aleatórios com os parâmetros definidos e registra o resultado no histórico.</p></span></span></label>\n        <div class=\"iu\"><input type=\"number\" id=\"nTrades\" value=\"20\" min=\"5\" max=\"500\" step=\"5\" oninput=\"sh_atualizarTopbar()\"><span class=\"u\">#</span></div>\n        <div style=\"display:flex;gap:6px;margin-top:6px\">\n          <button class=\"sbtn\" onclick=\"sh_setN(20)\">20</button>\n          <button class=\"sbtn\" onclick=\"sh_setN(50)\">50</button>\n          <button class=\"sbtn\" onclick=\"sh_setN(100)\">100</button>\n        </div>\n      </div>\n      <div class=\"field\">\n        <label>RRR — Risk:Reward <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Proporção entre o alvo e o stop. Junto com o Win Rate define a expectância matemática do setup. Expectância = WR × RRR − (1 − WR).</p><div class=\"tr\"><span>Expectância zero</span><span>WR = 1 ÷ (1 + RRR)</span></div></span></span></label>\n        <div class=\"iu\"><input type=\"number\" id=\"rrr\" value=\"1\" min=\"0.1\" max=\"10\" step=\"0.1\" oninput=\"sh_atualizarTabelaRec()\"><span class=\"u\">R</span></div>\n      </div>\n    </div>\n\n    <div class=\"sg\">\n      <div class=\"sgl\">Assertividade</div>\n      <div class=\"fr\">\n        <div class=\"field\">\n          <label>Ganha (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Win Rate</b><p>Percentual de trades vencedores. Deve somar 100% com Perde%. Alterar aqui atualiza Perde% automaticamente.</p></span></span></label>\n          <div class=\"iu\"><input type=\"number\" id=\"winRate\" value=\"55\" min=\"1\" max=\"99\" step=\"1\" oninput=\"sh_syncLoss();sh_atualizarTabelaRec()\"><span class=\"u\">%</span></div>\n        </div>\n        <div class=\"field\">\n          <label>Perde (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Loss Rate</b><p>Percentual de trades perdedores. Calculado automaticamente como 100% − Win Rate. Edite diretamente se quiser um valor com decimal diferente.</p></span></span></label>\n          <div class=\"iu\"><input type=\"number\" id=\"lossRate\" value=\"45\" min=\"1\" max=\"99\" step=\"1\" oninput=\"sh_syncWin()\"><span class=\"u\">%</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"sg\">\n      <div class=\"sgl\">\n        Zona de Perigo\n        <span class=\"tip\">?<span class=\"tip-box\"><b>Zona de Perigo</b><p>Se o saldo cair abaixo deste percentual do capital inicial, a coluna entra em Zona de Perigo (vermelho). Ex: 20% = saldo abaixo de $200 numa banca de $1000.</p><p>A recuperação a partir daí exige ganhos proporcionalmente muito maiores — é a matemática assimétrica das perdas.</p><div class=\"tr\"><span>10%</span><span>Muito agressivo</span></div><div class=\"tr\"><span>20%</span><span>Padrão</span></div><div class=\"tr\"><span>30%+</span><span>Conservador</span></div></span></span>\n      </div>\n      <div class=\"field\">\n        <label>Saldo abaixo de (% do capital) <span class=\"tip\">?<span class=\"tip-box\"><b>Limite da Zona de Perigo</b><p>Percentual mínimo do capital inicial que define a entrada na zona crítica. Abaixo disso, a recuperação exige ganhos cada vez mais desproporcionais.</p></span></span></label>\n        <div class=\"iu\"><input type=\"number\" id=\"perigoPct\" value=\"20\" min=\"5\" max=\"80\" step=\"5\" oninput=\"sh_atualizarTopbar();sh_atualizarTabelaRec()\"><span class=\"u\">%</span></div>\n        <div style=\"display:flex;gap:6px;margin-top:6px\">\n          <button class=\"sbtn\" onclick=\"sh_setRP(10)\">10%</button>\n          <button class=\"sbtn\" onclick=\"sh_setRP(20)\">20%</button>\n          <button class=\"sbtn\" onclick=\"sh_setRP(30)\">30%</button>\n          <button class=\"sbtn\" onclick=\"sh_setRP(50)\">50%</button>\n        </div>\n      </div>\n\n      <!-- Tabela de recuperação -->\n      <div style=\"margin-top:2px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px\">Quanto precisa recuperar <span class=\"tip\" style=\"font-size:8px;text-transform:none\">?<span class=\"tip-box\"><b>Tabela de Recuperação</b><p>Quanto você precisa ganhar para recuperar cada nível de perda. A assimetria matemática: perder 50% exige ganhar 100%. Quanto maior a perda, mais difícil a recuperação — por isso controlar o risco por trade é mais importante que maximizar ganhos.</p></span></span></div>\n        <table class=\"recov-table\" id=\"recovTable\"></table>\n      </div>\n    </div>\n\n    <div class=\"sg\">\n      <div class=\"sgl\">Blocos de Risco</div>\n      <div class=\"binfo\"><div class=\"bname\"><span class=\"dot\" style=\"background:var(--blue)\"></span>Bloco 1 — Ultra-Baixo</div><div class=\"brange\">0.25% → 4.25%</div></div>\n      <div class=\"binfo\"><div class=\"bname\"><span class=\"dot\" style=\"background:var(--green)\"></span>Bloco 2 — Baixo-Moderado</div><div class=\"brange\">2.5% → 10%</div></div>\n      <div class=\"binfo\"><div class=\"bname\"><span class=\"dot\" style=\"background:var(--yellow)\"></span>Bloco 3 — Elevado</div><div class=\"brange\">5% → 20%</div></div>\n      <div class=\"binfo\"><div class=\"bname\"><span class=\"dot\" style=\"background:var(--red)\"></span>Bloco 4 — Extremo</div><div class=\"brange\">25% → 50%</div></div>\n    </div>\n\n    <div class=\"sg\">\n      <div class=\"sgl\">Legenda de Cores</div>\n      <div class=\"lrow\"><div class=\"lswatch\" style=\"background:rgba(63,185,80,.10);border:1px solid rgba(95,216,126,.3)\"></div><span style=\"color:var(--muted);font-size:11px\">Acima do capital inicial</span></div>\n      <div class=\"lrow\"><div class=\"lswatch\" style=\"background:rgba(227,179,65,.10);border:1px solid rgba(212,168,74,.3)\"></div><span style=\"color:var(--muted);font-size:11px\">Negativo — ainda vivo</span></div>\n      <div class=\"lrow\"><div class=\"lswatch\" style=\"background:rgba(248,81,73,.20);border:1px solid rgba(248,81,73,.45)\"></div><span style=\"color:var(--red);font-size:11px\">Zona de Perigo</span></div>\n      <div style=\"font-size:10px;color:var(--dim);font-family:'JetBrains Mono',monospace;margin-top:6px;line-height:1.5\">\n        Zona de Perigo = saldo tão baixo que a recuperação exige ganhos absurdos. Equivale à ruína na prática.\n      </div>\n    </div>\n\n  </div><!-- end fm-sidebar-inner -->\n  </div>\n\n  <!-- ── MAIN ── -->\n  <div class=\"fm-main\">\n\n    <!-- MÉTRICAS -->\n    <div class=\"mrow\">\n      <div class=\"metric mb\"><div class=\"mlabel\">Capital</div><div class=\"mval cb\" id=\"m-cap\">$1.000</div><div class=\"msub\">banca inicial</div></div>\n      <div class=\"metric mg\"><div class=\"mlabel\">Win Rate</div><div class=\"mval cg\" id=\"m-wr\">55%</div><div class=\"msub\" id=\"m-wr-sub\">RRR 1:1.00</div></div>\n      <div class=\"metric my\"><div class=\"mlabel\">Trades</div><div class=\"mval cy\" id=\"m-trades\">20</div><div class=\"msub\">por simulação</div></div>\n      <div class=\"metric mo\"><div class=\"mlabel\">Zona de Perigo</div><div class=\"mval co\" id=\"m-perigo\">20%</div><div class=\"msub\" id=\"m-perigo-sub\">saldo &lt; $200</div></div>\n      <div class=\"metric mp\"><div class=\"mlabel\">Simulações</div><div class=\"mval cp\" id=\"m-sims\">0</div><div class=\"msub\">no histórico</div></div>\n    </div>\n\n    <div class=\"warn\" id=\"warnBox\">⚠ Assertividade não fecha 100%! Corrija Ganha% + Perde%.</div>\n\n    <!-- BLOCOS -->\n    <div class=\"bgrid-outer\">\n      <div class=\"bgrid\" id=\"blocosGrid\"></div>\n    </div>\n\n    <!-- ANALYTICS ACUMULADO -->\n    <div class=\"analytics-wrap\" id=\"analyticsWrap\">\n      <div class=\"sep-label\">Analytics Acumulado — Histórico de Simulações</div>\n\n      <div id=\"analyticsEmpty\" style=\"background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:24px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim)\">\n        Rode ao menos 2 simulações para ver os analytics acumulados.\n      </div>\n\n      <div id=\"analyticsPanel\" style=\"display:none\">\n        <!-- Totais gerais (inclui Total Sims) -->\n        <div class=\"a-totals\" id=\"analyticsTotals\"></div>\n        <!-- Por bloco -->\n        <div class=\"analytics-grid\" id=\"analyticsGrid\"></div>\n      </div>\n    </div>\n\n    <!-- LOG -->\n    <div class=\"logwrap\">\n      <div class=\"loghdr\" onclick=\"sh_toggleLog()\">\n        <div class=\"logtit\">Histórico de Simulações <span class=\"logcnt\" id=\"logcnt\">0 registros</span></div>\n        <div class=\"logacts\" onclick=\"event.stopPropagation()\">\n          <button class=\"lbtn\" onclick=\"sh_exportLog()\">Exportar CSV</button>\n          <button class=\"lbtn\" onclick=\"sh_clearLog()\">Limpar</button>\n          <span style=\"font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);padding:5px 6px\" id=\"logchev\">▼</span>\n        </div>\n      </div>\n      <div class=\"logbody\">\n        <div class=\"logscroll\" id=\"logscroll\">\n          <div class=\"logempty\" id=\"logempty\">Nenhuma simulação registrada. Clique em Simular para começar.</div>\n          <table class=\"ltable\" id=\"logtable\" style=\"display:none\">\n            <thead><tr>\n              <th style=\"width:32px\">#</th>\n              <th style=\"width:68px\">Hora</th>\n              <th style=\"width:52px\">Trades</th>\n              <th style=\"width:68px\">Capital</th>\n              <th style=\"width:48px\">WR%</th>\n              <th style=\"width:52px\">RRR</th>\n              <th style=\"width:62px\">Perigo%</th>\n              <th>Resultado por Bloco (✓pos ~neg ⬛perigo 🔴zero)</th>\n              <th style=\"width:80px\">Status</th>\n            </tr></thead>\n            <tbody id=\"logtbody\"></tbody>\n          </table>\n        </div>\n      </div>\n    </div>\n\n  </div>\n</div>\n\n\n</div><!-- #app --></div><!-- /mod-mental -->";
  host.dataset.loaded = '1';
})();

(function(){
const shSafe = (fn, label = 'legacy') => {
  try { return fn(); }
  catch (err) { console.error('[StudyHub Legacy]', label, err); return undefined; }
};
const shAddLoad = (fn) => {
  const run = () => shSafe(fn, 'load');
  if (document.readyState === 'complete') setTimeout(run, 0);
  else window.addEventListener('load', run);
};
if (typeof window.Chart !== 'function') {
  window.Chart = class { constructor(){} destroy(){} };
}

/* ══════════════════════════════════════
   HUB — navegação e cotação global
══════════════════════════════════════ */
const HUB_MODULES = ['mod-propfirm','mod-plano','mod-tradesim','mod-mental'];
const HUB_MODULE_MAP = {propfirm:0,plano:1,tradesim:2,mental:3};
let hubCotVal = 5.80;

function hubSwitch(i) {
  document.querySelectorAll('.hub-tab').forEach((b,j) => b.classList.toggle('active', j===i));
  HUB_MODULES.forEach((id,j) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', j===i);
  });
  // Acionar resize de canvas ao trocar de aba
  setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);
}

function hubSetCot(v) {
  if (!v || v < 0.1) return;
  hubCotVal = v;
  document.getElementById('hubCotBadge').textContent = 'R$ ' + v.toFixed(2).replace('.',',');
  // Propagar para módulos que usam cotação
  const pfEl = document.getElementById('gCot');
  if (pfEl) { pfEl.value = v; if(typeof pfSetCot==='function') pfSetCot(v); }
  const ptEl = document.getElementById('cotInput');
  if (ptEl) { ptEl.value = v; if(typeof ptSetCot==='function') ptSetCot(v); }
}

async function hubFetchCot() {
  const badge = document.getElementById('hubCotBadge');
  badge.textContent = '...';
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const d = await r.json();
    const rate = parseFloat(d.USDBRL.bid);
    document.getElementById('hubCot').value = rate.toFixed(2);
    hubSetCot(rate);
  } catch(e) {
    badge.textContent = 'Erro API';
    setTimeout(() => hubSetCot(hubCotVal), 2000);
  }
}

function hubToast(msg, type='info') {
  const t = document.getElementById('hubToast');
  t.textContent = msg;
  t.style.borderColor = type==='ok' ? 'var(--green2)' : type==='err' ? 'var(--red2)' : 'var(--border2)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function hubApplyEmbedMode() {
  const params = new URLSearchParams(window.location.search);
  const embed = params.get('embed') === '1';
  const moduleKey = (params.get('module') || '').toLowerCase();
  if (embed) document.getElementById('studyHubLegacyApp')?.classList.add('embed-mode');
  if (HUB_MODULE_MAP[moduleKey] != null) hubSwitch(HUB_MODULE_MAP[moduleKey]);
}

// Init
shAddLoad( () => {
  hubSetCot(parseFloat(document.getElementById('hubCot').value) || 5.80);
  hubApplyEmbedMode();
});



// ═══════════════════════════════════════════════════════════
// GLOBALS
// ═══════════════════════════════════════════════════════════
let globalCot = parseFloat(localStorage.getItem('pfCot') || '5.80');
const pfCharts = {};

function pfMkChart(id, cfg) {
  const cv = document.getElementById(id);
  if (!cv) return;
  if (pfCharts[id]) pfCharts[id].destroy();
  pfCharts[id] = new Chart(cv, cfg);
  return pfCharts[id];
}

const pfF2  = v => v.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
const pfFR  = v => 'R$' + pfF2(v);
const fU  = v => '$' + pfF2(v);
const fP  = v => (v * 100).toFixed(2) + '%';
const ceil = (v) => Math.ceil(v);
const flr  = (v) => Math.floor(v);

const baseOpts = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
  plugins: { legend: { labels: { color: 'var(--muted)', font: { family: 'JetBrains Mono', size: 9 } } } },
  scales: {
    x: { ticks: { color: 'var(--dim)', font: { size: 8 }, maxTicksLimit: 16 }, grid: { color: 'rgba(30,45,61,.4)' } },
    y: { ticks: { color: 'var(--dim)', font: { size: 8 } }, grid: { color: 'rgba(30,45,61,.4)' } }
  }
};

// ═══════════════════════════════════════════════════════════
// COTAÇÃO GLOBAL
// ═══════════════════════════════════════════════════════════
function pfSetCot(v) {
  globalCot = v;
  localStorage.setItem('pfCot', v);
  document.getElementById('cotBadge').textContent = 'R$ ' + v.toFixed(2).replace('.', ',');
  // Propagar para todos os inputs de cotação
  ['s_cot','m_cot','sq_cot'].forEach(id => { const el=document.getElementById(id); if(el) el.value=v.toFixed(2); });
  // Recalcular tudo
  calcSimulador(); calcMulti(); calcSaque(); calcPropFirm(); calcGrandes();
  calc2Fases(); calc1Fase(); calcInstant(); calcRRR();
}

async function pfFetchCot() {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const d = await r.json();
    const v = parseFloat(d.USDBRL.bid);
    document.getElementById('gCot').value = v.toFixed(2);
    pfSetCot(v);
  } catch(e) {
    document.getElementById('cotBadge').textContent = 'Offline';
  }
}

// ═══════════════════════════════════════════════════════════
// LUCRO LÍQUIDO — fórmula padrão
// liq = lucroUSD * payout * cot * (1-ir) * (1-taxa)
// ═══════════════════════════════════════════════════════════
function liqBRL(lucroUSD, payout, cot, ir, taxa) {
  return lucroUSD * (payout/100) * cot * (1 - ir/100) * (1 - taxa/100);
}

// ═══════════════════════════════════════════════════════════
// HELPERS — TABELA DE RISCO POR NÍVEL
// ═══════════════════════════════════════════════════════════
function buildNiveisTable(conta, ddmax, stops, cot, metas, entradas, payout, ir, taxa) {
  const niveis = [1, 0.75, 0.5, 0.25];
  const labels = ['100% Cheio', '75% (3/4)', '50% Meia', '25% (1/4)'];
  const riscoPct = (ddmax/100) / stops;   // risco base por trade (decimal)

  const metrics = [
    { label: 'Risco/Entrada %',    fn: n => (riscoPct*n*100).toFixed(3)+'%' },
    { label: 'Risco/Entrada USD',  fn: n => fU(conta*riscoPct*n) },
    { label: 'Risco/Entrada BRL',  fn: n => pfFR(conta*riscoPct*n*cot) },
    { label: 'Stops → Perder Conta',  fn: n => flr((ddmax/100)/(riscoPct*n))+' stops' },
    { label: 'Stops → Limite Diário', fn: n => flr((ddmax/100/5)/(riscoPct*n))+' stops' }, // DD Diário ≈ DD/5 conservador
  ];

  let rows = metrics.map(m =>
    `<tr><td class="al cm">${m.label}</td>${niveis.map(n=>`<td>${m.fn(n)}</td>`).join('')}</tr>`
  ).join('');

  metas.forEach(meta => {
    const metaUSD = conta*(meta.pct/100);
    rows += `<tr style="background:rgba(99,169,255,.06)">
      <td class="al" style="color:var(--blue);font-weight:700;font-size:10px">${meta.label} — Meta ${meta.pct}%</td>` +
      niveis.map(n => {
        const riscoEf  = riscoPct*n;
        const alvoTrade = conta*riscoEf; // RRR=1 base
        const trades   = ceil(metaUSD/alvoTrade);
        const dias     = ceil(trades/entradas);
        const liq      = liqBRL(metaUSD, payout, cot, ir, taxa);
        return `<td class="cb">${trades}T / ${dias}d<br><span style="font-size:9px;color:var(--green)">${pfFR(liq)}</span></td>`;
      }).join('') + '</tr>';
  });

  return `<div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th class="al">Métrica</th>${labels.map(l=>`<th>${l}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// HELPER: gerar steps dinâmicos (começa em step, não em 0)
// Usa inteiros internamente para evitar erro de ponto flutuante
// ═══════════════════════════════════════════════════════════
function genSteps(step, fim) {
  const out = [];
  let s = Math.round(parseFloat(step) * 10000);
  let f = Math.round(parseFloat(fim)  * 10000);
  if (!s || s <= 0) s = 2500;
  if (!f || f <= 0) f = 100000;
  let count = 0;
  for (let v = s; v <= f + 1 && count < 200; v += s, count++) {
    out.push(parseFloat((v / 10000).toFixed(4)));
  }
  return out;
}

// ═══════════════════════════════════════════════════════════
// ABA 0: SIMULADOR
// ═══════════════════════════════════════════════════════════
function calcSimulador() {
  const conta  = parseFloat(document.getElementById('s_conta').value)   || 100000;
  const payout = parseFloat(document.getElementById('s_payout').value)  || 80;
  const ddmax  = parseFloat(document.getElementById('s_ddmax').value)   || 10;
  const dddai  = parseFloat(document.getElementById('s_dddaily').value) || 5;
  const ir     = parseFloat(document.getElementById('s_ir').value)      || 6;
  const taxa   = parseFloat(document.getElementById('s_taxa').value)    || 2;
  const rrr    = parseFloat(document.getElementById('s_rrr').value)     || 1;
  const stops  = parseFloat(document.getElementById('s_stops').value)   || 40;
  const step   = parseFloat(document.getElementById('s_step').value)    || 0.25;
  const fim    = parseFloat(document.getElementById('s_fim').value)     || 10;
  const cot    = globalCot;

  const riscoEf  = (ddmax/100) / stops;           // risco % por trade (decimal)
  const riscoUSD = conta * riscoEf;               // risco em USD por trade
  const alvoUSD  = riscoUSD * rrr;               // alvo em USD por trade
  const ddMaxUSD = conta * ddmax/100;
  const ddDiaUSD = conta * dddai/100;
  const stopsMax = flr(ddMaxUSD / riscoUSD);     // stops até perder conta (DD Max)
  const stopsDia = flr(ddDiaUSD / riscoUSD);     // stops até limite diário

  document.getElementById('s_risco_ent').textContent  = fP(riscoEf);
  document.getElementById('s_risco_usd').textContent  = fU(riscoUSD);
  document.getElementById('s_alvo_usd').textContent   = fU(alvoUSD);
  document.getElementById('s_ddmax_usd').textContent  = fU(ddMaxUSD);
  document.getElementById('s_stops_max').textContent  = stopsMax + ' stops p/ perder conta';
  document.getElementById('s_dd_usd').textContent     = fU(ddDiaUSD);
  document.getElementById('s_stops_dia').textContent  = stopsDia + ' stops p/ limite diário';

  // Meta de referência = Fim% do intervalo
  const metaRef = parseFloat(document.getElementById('s_fim').value) || 10;
  document.getElementById('s_meta_trades').textContent = ceil((conta * metaRef/100) / alvoUSD) + ' trades';

  const rows = genSteps(step, fim).map(pct => {
    const lucroUSD = conta * (pct/100);
    const payBrUSD = lucroUSD * (payout/100);
    const payBrBRL = payBrUSD * cot;
    const aposIR   = payBrBRL * (1 - ir/100);
    const liqFinal = aposIR   * (1 - taxa/100);
    // ✅ Fórmula correta: trades = ceil(metaUSD / alvoUSD)
    const trades   = alvoUSD > 0 ? ceil(lucroUSD / alvoUSD) : 0;
    return { pct, lucroUSD, payBrUSD, payBrBRL, aposIR, liqFinal, trades, liqTrade: trades>0 ? liqFinal/trades : 0 };
  });

  document.getElementById('simTbody').innerHTML = rows.map(r =>
    `<tr><td class="al cy">${r.pct.toFixed(2)}%</td><td class="cb">${fU(r.lucroUSD)}</td><td>${fU(r.payBrUSD)}</td><td>${pfFR(r.payBrBRL)}</td><td class="cr">−${pfFR(r.payBrBRL-r.aposIR)}</td><td class="cg">${pfFR(r.liqFinal)}</td><td class="cp">${r.trades}</td><td class="cm">${pfFR(r.liqTrade)}</td></tr>`
  ).join('');

  pfMkChart('pfSimChart', { type:'bar', data:{ labels:rows.map(r=>r.pct.toFixed(2)+'%'), datasets:[{ label:'Líquido BRL', data:rows.map(r=>r.liqFinal), backgroundColor:'rgba(63,185,80,.4)', borderColor:'rgba(63,185,80,.8)', borderWidth:1, borderRadius:2 }] }, options:{...baseOpts,plugins:{...baseOpts.plugins,legend:{display:false}}} });
  saveState();
}

// ═══════════════════════════════════════════════════════════
// ABA 1: MULTI-PAYOUT — com coluna Custom
// ═══════════════════════════════════════════════════════════
const MULTI_PAYOUTS = [50,55,60,65,70,75,80,85,90];

function calcMulti() {
  const conta  = parseFloat(document.getElementById('m_conta').value)  || 100000;
  const ir     = parseFloat(document.getElementById('m_ir').value)     || 6;
  const taxa   = parseFloat(document.getElementById('m_taxa').value)   || 2;
  const step   = parseFloat(document.getElementById('m_step').value)   || 0.25;
  const fim    = parseFloat(document.getElementById('m_fim').value)    || 10;
  const custom = parseFloat(document.getElementById('m_custom').value) || 88;
  const cot    = globalCot;

  document.getElementById('multiTbody').innerHTML = genSteps(step, fim).map(pct => {
    const lucroUSD = conta * (pct/100);
    const cols = MULTI_PAYOUTS.map(p => {
      const liq = liqBRL(lucroUSD, p, cot, ir, taxa);
      return `<td class="${p>=80?'cg':p>=65?'cy':'cm'}">${pfFR(liq)}</td>`;
    }).join('');
    const liqCustom = liqBRL(lucroUSD, custom, cot, ir, taxa);
    return `<tr><td class="al cy">${pct.toFixed(2)}%</td><td class="cb">${fU(lucroUSD)}</td>${cols}<td class="cp" style="font-weight:700">${pfFR(liqCustom)}</td></tr>`;
  }).join('');
  saveState();
}

// ═══════════════════════════════════════════════════════════
// ABA 2: CALCULADORA — assertividade, SL/Gain dia
// ═══════════════════════════════════════════════════════════
function calcSaque() {} // removido

function calcPropFirm() {
  const conta    = parseFloat(document.getElementById('pf_conta').value)    || 100000;
  const ddmax    = parseFloat(document.getElementById('pf_ddmax').value)    || 10;
  const dddaily  = parseFloat(document.getElementById('pf_dddaily').value)  || 5;
  const meta     = parseFloat(document.getElementById('pf_meta').value)     || 8;
  const stops    = parseFloat(document.getElementById('pf_stops').value)    || 20;
  const entradas = parseFloat(document.getElementById('pf_entradas').value) || 4;
  const rrr      = parseFloat(document.getElementById('pf_rrr').value)      || 1;
  const assert_  = parseFloat(document.getElementById('pf_assert').value)   || 60;
  const payout   = parseFloat(document.getElementById('pf_payout').value)   || 80;
  const ir       = parseFloat(document.getElementById('pf_ir').value)       || 15;
  const taxa     = parseFloat(document.getElementById('pf_taxa').value)     || 2;
  const slPct    = parseFloat(document.getElementById('pf_sl_dia').value)   || 1;    // % da conta
  const gainPct  = parseFloat(document.getElementById('pf_gain_dia').value) || 2;   // % da conta
  const cot      = globalCot;

  const riscoPct   = (ddmax/100) / stops;
  const riscoUSD   = conta * riscoPct;
  const alvoTrade  = riscoUSD * rrr;
  const ddMaxUSD   = conta * ddmax/100;
  const ddDailyUSD = conta * dddaily/100;
  const stopsMax   = flr(ddMaxUSD / riscoUSD);
  const stopsDia   = flr(ddDailyUSD / riscoUSD);
  const metaUSD    = conta * (meta/100);
  const trades     = alvoTrade > 0 ? ceil(metaUSD / alvoTrade) : 0;
  const dias       = ceil(trades / entradas);
  const expectativa = (assert_/100) * rrr - (1 - assert_/100);
  const tradesAssert = expectativa > 0 ? ceil(metaUSD / (riscoUSD * expectativa)) : null;
  const liq        = liqBRL(metaUSD, payout, cot, ir, taxa);
  const slUSD      = conta * (slPct/100);
  const gainUSD    = conta * (gainPct/100);

  document.getElementById('pf_r1').textContent         = fP(riscoPct);
  document.getElementById('pf_r2').textContent         = fU(riscoUSD);
  document.getElementById('pf_ddmax_usd').textContent  = fU(ddMaxUSD);
  document.getElementById('pf_stops_max').textContent  = stopsMax + ' stops p/ perder conta';
  document.getElementById('pf_dddaily_usd').textContent= fU(ddDailyUSD);
  document.getElementById('pf_r3').textContent         = stopsDia + ' stops p/ limite diário';
  document.getElementById('pf_r4').textContent         = fU(metaUSD);
  document.getElementById('pf_r5').textContent         = trades + ' trades';
  document.getElementById('pf_r5sub').textContent      = tradesAssert ? `Com ${assert_}% assertividade: ~${tradesAssert} trades` : 'Expectativa negativa neste RRR';
  document.getElementById('pf_r6').textContent         = dias + ' dias úteis';
  document.getElementById('pf_alvo_usd').textContent   = fU(alvoTrade);
  document.getElementById('pf_sl_usd').textContent     = fU(slUSD);
  document.getElementById('pf_gain_usd').textContent   = fU(gainUSD);
  document.getElementById('pf_r7').textContent         = pfFR(liq);
  document.getElementById('pf_r7sub').textContent      = `meta ${meta}% → ${fU(metaUSD)} · Expect: ${expectativa>=0?'+':''}${(expectativa*100).toFixed(2)}%/trade`;
  saveState();
}

// ═══════════════════════════════════════════════════════════
// ABA 3: GRANDES CONTAS — sem ini, sem nganhos
// ═══════════════════════════════════════════════════════════
const GC_SIZES = [1000,2000,5000,10000,25000,50000,75000,100000,150000,200000,300000,400000];

function calcGrandes() {
  const payout = parseFloat(document.getElementById('gc_payout').value) || 80;
  const ir     = parseFloat(document.getElementById('gc_ir').value)     || 6;
  const taxa   = parseFloat(document.getElementById('gc_taxa').value)   || 2;
  const alvoR  = parseFloat(document.getElementById('gc_alvo').value)   || 5000;
  const step   = parseFloat(document.getElementById('gc_step').value)   || 0.25;
  const fim    = parseFloat(document.getElementById('gc_fim').value)    || 10;
  const cot    = globalCot;

  document.getElementById('grandesTbody').innerHTML = genSteps(step, fim).map(pct => {
    const cols = GC_SIZES.map(sz => {
      const liq = liqBRL(sz * (pct/100), payout, cot, ir, taxa);
      const cls = liq >= alvoR ? 'cg' : liq >= alvoR*0.5 ? 'cy' : 'cm';
      return `<td class="${cls}">${pfFR(liq)}</td>`;
    }).join('');
    return `<tr><td class="al cy">${pct.toFixed(2)}%</td>${cols}</tr>`;
  }).join('');
  saveState();
}

// ═══════════════════════════════════════════════════════════
// HELPER FASES — renderiza todos os blocos da planilha
// ═══════════════════════════════════════════════════════════
const RRR_LABELS = ['0.618','1:1','1.141','1.618','1:2'];
const RRR_VALS   = [0.618, 1, 1.141, 1.618, 2];
const NIV_LABELS = ['100% Cheio','75% (3/4)','50% Meia','25% (1/4)'];
const NIV_FACTS  = [1, 0.75, 0.5, 0.25];

function secLabel(icon, title) {
  return `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.1em;padding:8px 0 5px;margin-top:14px;border-top:1px solid var(--border)">${icon} ${title}</div>`;
}

function renderFase(targetId, p) {
  // p = { conta, ddmax, dddaily, stops, entradas, payout, ir, taxa, metas:[{label,pct}], assert_, nAssert }
  const cot     = globalCot;
  const rBase   = (p.ddmax/100) / p.stops;   // risco cheio decimal

  // ── 1. RISCO POR NÍVEL ──────────────────────────────────
  let html = secLabel('📊','Risco por Nível');
  html += `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th class="al">Métrica</th>${NIV_LABELS.map(l=>`<th>${l}</th>`).join('')}
  </tr></thead><tbody>`;

  const nivelRows = [
    { label:'Risco/Entrada %',                fn: f => (rBase*f*100).toFixed(3)+'%' },
    { label:'Risco/Entrada USD',              fn: f => fU(p.conta*rBase*f) },
    { label:'Risco/Entrada BRL',              fn: f => pfFR(p.conta*rBase*f*cot) },
    { label:'Stops p/ Perder DD Máximo',      fn: f => flr((p.ddmax/100)/(rBase*f))+' stops' },
    { label:'Stops p/ Perder DD Diário',      fn: f => flr((p.dddaily/100)/(rBase*f))+' stops' },
    { label:'Stop Diário USD (fixo)',         fn: f => f===1 ? fU(p.conta*p.dddaily/100) : '—' },
  ];
  html += nivelRows.map(r =>
    `<tr><td class="al cm">${r.label}</td>${NIV_FACTS.map(f=>`<td>${r.fn(f)}</td>`).join('')}</tr>`
  ).join('');
  html += '</tbody></table></div>';

  // ── 2. ALVOS POR RRR × NÍVEL ────────────────────────────
  html += secLabel('🎯','Alvos por RRR × Nível de Risco');
  html += `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th class="al">RRR</th>${NIV_LABELS.map(l=>`<th>${l} (USD)</th>`).join('')}<th class="al cm">Descrição</th>
  </tr></thead><tbody>`;
  const rrrDesc = ['Take parcial / Fibonacci 61,8%','Par — risco igual ao retorno','Raiz quadrada de 1,3','Golden Ratio (φ)','Dobro do risco'];
  html += RRR_VALS.map((rv,ri) =>
    `<tr><td class="al cb">${RRR_LABELS[ri]}</td>${NIV_FACTS.map(f=>`<td class="cg">${fU(p.conta*rBase*f*rv)}</td>`).join('')}<td class="al cm" style="font-size:10px">${rrrDesc[ri]}</td></tr>`
  ).join('');
  html += '</tbody></table></div>';

  // ── 3. EXPOSIÇÃO AO RISCO ───────────────────────────────
  html += secLabel('⚠️','Exposição ao Risco — Risco Cheio (100%)');
  html += `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th class="al">Período</th><th>Dias</th><th>Entradas</th><th>Risco %</th><th>Risco USD</th><th>% do DD Max</th>
  </tr></thead><tbody>`;
  [[1,'Diário'],[5,'Semanal'],[10,'Quinzenal'],[22,'Mensal']].forEach(([dias, label]) => {
    const ents    = dias * p.entradas;
    const riscPct = ents * rBase;
    const riscUSD = riscPct * p.conta;
    const pctDD   = riscPct / (p.ddmax/100);
    const cls     = pctDD > 0.8 ? 'cr' : pctDD > 0.5 ? 'cy' : 'cg';
    html += `<tr><td class="al cm">${label}</td><td>${dias}</td><td>${ents}</td>
      <td class="${cls}">${(riscPct*100).toFixed(2)}%</td>
      <td class="${cls}">${fU(riscUSD)}</td>
      <td class="${cls}">${(pctDD*100).toFixed(1)}%</td></tr>`;
  });
  html += '</tbody></table></div>';

  // ── 4. GAINS POR FASE (trades para bater meta) ──────────
  p.metas.forEach(meta => {
    html += secLabel('📈', `Gains — ${meta.label} (Meta ${meta.pct}% → ${fU(p.conta*meta.pct/100)})`);
    html += `<div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th class="al">RRR</th>${NIV_LABELS.map(l=>`<th>${l}</th>`).join('')}
    </tr></thead><tbody>`;
    html += RRR_VALS.map((rv,ri) => {
      const cells = NIV_FACTS.map(f => {
        const alvoT  = p.conta * rBase * f * rv;
        const trades = ceil((meta.pct/100) / (rBase*f*rv));
        const dias   = ceil(trades / p.entradas);
        const liq    = liqBRL(p.conta*meta.pct/100, p.payout, cot, p.ir, p.taxa);
        return `<td><span class="cp">${trades} trades</span> / <span class="cm">${dias}d</span><br><span style="font-size:9px;color:var(--green)">${pfFR(liq)}</span></td>`;
      }).join('');
      return `<tr><td class="al cb">${RRR_LABELS[ri]}</td>${cells}</tr>`;
    }).join('');
    html += '</tbody></table></div>';
  });

  // ── 5. SIMULAÇÃO POR ASSERTIVIDADE ──────────────────────
  html += secLabel('🔢','Simulação por Assertividade');
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
    <div class="field" style="margin:0"><label>Assertividade %</label><div class="iu"><input type="number" id="${targetId}_assert" value="${p.assert_}" step="1" min="1" max="100" oninput="recalcAssert('${targetId}')"><span class="u">%</span></div></div>
    <div class="field" style="margin:0"><label>Total de Entradas</label><input type="number" id="${targetId}_nent" value="${p.nAssert}" min="1" oninput="recalcAssert('${targetId}')"></div>
  </div>
  <div id="${targetId}_assertTable"></div>`;

  document.getElementById(targetId).innerHTML = html;

  // Preencher tabela de assertividade após render
  renderAssertTable(targetId, p.conta, rBase, p.assert_, p.nAssert, cot);
}

function renderAssertTable(targetId, conta, rBase, assertPct, nEnt, cot) {
  const wr  = assertPct / 100;
  const gains = Math.round(wr * nEnt);
  const stops = nEnt - gains;
  let rows = '';
  RRR_VALS.forEach((rv, ri) => {
    NIV_FACTS.forEach((f, fi) => {
      const lucPct  = gains  * rBase * f * rv;
      const perdPct = stops  * rBase * f;
      const resPct  = lucPct - perdPct;
      const resUSD  = resPct * conta;
      const expTrade = resUSD / nEnt;
      const cls = resPct > 0 ? 'cg' : resPct < 0 ? 'cr' : 'cm';
      rows += `<tr>
        <td class="al" style="font-size:10px">${RRR_LABELS[ri]} × ${NIV_LABELS[fi]}</td>
        <td class="cg">${gains}</td><td class="cr">${stops}</td>
        <td class="${cls}">${(lucPct*100).toFixed(2)}%</td>
        <td class="cr">−${(perdPct*100).toFixed(2)}%</td>
        <td class="${cls}">${(resPct*100).toFixed(2)}%</td>
        <td class="${cls}">${fU(resUSD)}</td>
        <td class="${cls}">${fU(expTrade)}/trade</td>
      </tr>`;
    });
  });
  const el = document.getElementById(targetId+'_assertTable');
  if (el) el.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th class="al">RRR × Nível</th><th>Gains</th><th>Stops</th>
    <th>Lucro %</th><th>Perda %</th><th>Result %</th><th>Result USD</th><th>Expect/Trade</th>
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function recalcAssert(targetId) {
  const a  = parseFloat(document.getElementById(targetId+'_assert').value) || 50;
  const n  = parseFloat(document.getElementById(targetId+'_nent').value)   || 20;
  // Recalcular rBase do targetId
  let rBase, conta;
  if (targetId === 'f2Results') {
    conta = parseFloat(document.getElementById('f2_conta').value)||100000;
    rBase = ((parseFloat(document.getElementById('f2_ddmax').value)||10)/100) / (parseFloat(document.getElementById('f2_stops').value)||40);
  } else if (targetId === 'f1Results') {
    conta = parseFloat(document.getElementById('f1_conta').value)||50000;
    rBase = ((parseFloat(document.getElementById('f1_ddmax').value)||6)/100) / (parseFloat(document.getElementById('f1_stops').value)||20);
  } else {
    conta = parseFloat(document.getElementById('in_conta').value)||50000;
    rBase = ((parseFloat(document.getElementById('in_ddmax').value)||5)/100) / (parseFloat(document.getElementById('in_stops').value)||20);
  }
  renderAssertTable(targetId, conta, rBase, a, n, globalCot);
}

function renderFaseResult(targetId, conta, ddmax, stops, cot, metas, entradas, payout, ir, taxa) {
  renderFase(targetId, { conta, ddmax, dddaily: ddmax/2, stops, entradas, payout, ir, taxa, metas, assert_: 53, nAssert: 40 });
}

function calc2Fases() {
  const conta = parseFloat(document.getElementById('f2_conta').value) || 100000;
  const sl    = parseFloat(document.getElementById('f2_sl').value)    || 1;
  const gain  = parseFloat(document.getElementById('f2_gain').value)  || 2;
  document.getElementById('f2_sl_usd').textContent   = fU(conta * sl/100);
  document.getElementById('f2_gain_usd').textContent = fU(conta * gain/100);
  const p = {
    conta,
    ddmax:    parseFloat(document.getElementById('f2_ddmax').value)    || 10,
    dddaily:  parseFloat(document.getElementById('f2_dddaily').value)  || 5,
    stops:    parseFloat(document.getElementById('f2_stops').value)    || 40,
    meta1:    parseFloat(document.getElementById('f2_meta1').value)    || 8,
    meta2:    parseFloat(document.getElementById('f2_meta2').value)    || 5,
    metaf:    parseFloat(document.getElementById('f2_metaf').value)    || 5,
    entradas: parseFloat(document.getElementById('f2_entradas').value) || 4,
    payout:   parseFloat(document.getElementById('f2_payout').value)   || 80,
    ir:       parseFloat(document.getElementById('f2_ir').value)       || 15,
    taxa:     parseFloat(document.getElementById('f2_taxa').value)     || 2,
    assert_: 53, nAssert: 40,
  };
  renderFase('f2Results', { ...p, metas: [
    { label:'Fase 1', pct: p.meta1 },
    { label:'Fase 2', pct: p.meta2 },
    { label:'Funded Mensal', pct: p.metaf },
  ]});
  saveState();
}

function calc1Fase() {
  const conta = parseFloat(document.getElementById('f1_conta').value) || 50000;
  const sl    = parseFloat(document.getElementById('f1_sl').value)    || 1;
  const gain  = parseFloat(document.getElementById('f1_gain').value)  || 2;
  document.getElementById('f1_sl_usd').textContent   = fU(conta * sl/100);
  document.getElementById('f1_gain_usd').textContent = fU(conta * gain/100);
  const p = {
    conta,
    ddmax:    parseFloat(document.getElementById('f1_ddmax').value)    || 6,
    dddaily:  parseFloat(document.getElementById('f1_dddaily').value)  || 3,
    stops:    parseFloat(document.getElementById('f1_stops').value)    || 20,
    metap:    parseFloat(document.getElementById('f1_metap').value)    || 10,
    metaf:    parseFloat(document.getElementById('f1_metaf').value)    || 5,
    entradas: parseFloat(document.getElementById('f1_entradas').value) || 4,
    payout:   parseFloat(document.getElementById('f1_payout').value)   || 80,
    ir:       parseFloat(document.getElementById('f1_ir').value)       || 15,
    taxa:     parseFloat(document.getElementById('f1_taxa').value)     || 2,
    assert_: 50, nAssert: 20,
  };
  renderFase('f1Results', { ...p, metas: [
    { label:'Prova / Phase', pct: p.metap },
    { label:'Funded Mensal', pct: p.metaf },
  ]});
  saveState();
}

function calcInstant() {
  const conta = parseFloat(document.getElementById('in_conta').value) || 50000;
  const sl    = parseFloat(document.getElementById('in_sl').value)    || 1;
  const gain  = parseFloat(document.getElementById('in_gain').value)  || 2;
  document.getElementById('in_sl_usd').textContent   = fU(conta * sl/100);
  document.getElementById('in_gain_usd').textContent = fU(conta * gain/100);
  const p = {
    conta,
    ddmax:    parseFloat(document.getElementById('in_ddmax').value)    || 5,
    dddaily:  parseFloat(document.getElementById('in_dddaily').value)  || 3,
    stops:    parseFloat(document.getElementById('in_stops').value)    || 20,
    metaf:    parseFloat(document.getElementById('in_metaf').value)    || 5,
    entradas: parseFloat(document.getElementById('in_entradas').value) || 4,
    payout:   parseFloat(document.getElementById('in_payout').value)   || 95,
    ir:       parseFloat(document.getElementById('in_ir').value)       || 15,
    taxa:     parseFloat(document.getElementById('in_taxa').value)     || 2,
    assert_: 50, nAssert: 20,
  };
  renderFase('inResults', { ...p, metas: [
    { label:'Funded Mensal', pct: p.metaf },
  ]});
  saveState();
}

// ═══════════════════════════════════════════════════════════
// ABA 7: RRR UNIFICADO
// ═══════════════════════════════════════════════════════════
const RRR_VALUES = [
  { label: '0.618', v: 0.618 },
  { label: '1:1',   v: 1.000 },
  { label: '1.141', v: 1.141 },
  { label: '1.618', v: 1.618 },
  { label: '1:2',   v: 2.000 },
];

function gerarCenarios(rrr) {
  const out = [];
  for (let n = 1; n <= 10; n++) {
    for (let w = n; w >= 0; w--) {
      const l = n - w;
      const pnl = w * rrr - l;
      const icon = pnl > 0.001 ? '🏆' : pnl < -0.001 ? '💀' : '🔄';
      const type = pnl > 0.001 ? 'pos' : pnl < -0.001 ? 'neg' : 'zero';
      out.push({ n, w, l, pnl, icon, type, label: `${icon} ${w}W ${l}L` });
    }
  }
  return out;
}

function calcRRR() {
  const conta   = parseFloat(document.getElementById('r_conta').value)   || 50000;
  const ddmax   = parseFloat(document.getElementById('r_ddmax').value)   || 10;
  const dddaily = parseFloat(document.getElementById('r_dddaily').value) || 5;
  const stops   = parseFloat(document.getElementById('r_stops').value)   || 20;
  const slPct   = parseFloat(document.getElementById('r_sl').value)      || 1;
  const gainPct = parseFloat(document.getElementById('r_gain').value)    || 2;
  const cot     = globalCot;
  const riscoPct = (ddmax/100) / stops;

  // Painel nível de risco (4 boxes) — agora com stops DD Max E DD Diário
  const niveis = [{n:'100% Cheio',f:1},{n:'75% (3/4)',f:0.75},{n:'50% Meia',f:0.5},{n:'25% (1/4)',f:0.25}];
  document.getElementById('rrrInfo').innerHTML = niveis.map(nv => {
    const rp      = riscoPct * nv.f;
    const rUSD    = conta * rp;
    const stopsMax = flr((ddmax/100)   / rp);
    const stopsDia = flr((dddaily/100) / rp);
    return `<div class="out-box" style="padding:8px">
      <div class="out-lbl" style="color:var(--blue)">${nv.n}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--yellow);margin:3px 0">${(rp*100).toFixed(3)}% · ${fU(rUSD)}</div>
      <div style="font-size:10px;color:var(--red)">${stopsMax} stops p/ perder conta (DD Máx)</div>
      <div style="font-size:10px;color:var(--orange)">${stopsDia} stops p/ limite diário (DD Diário)</div>
      <div style="font-size:10px;color:var(--dim)">${pfFR(rUSD * cot)} / trade (BRL)</div>
    </div>`;
  }).join('');

  // Painel metas do dia (DD, SL, Gain em USD)
  document.getElementById('rrrDayInfo').innerHTML = [
    { lbl:'DD Máximo (USD)',    val: fU(conta*ddmax/100),  cls:'cr' },
    { lbl:'DD Diário (USD)',    val: fU(conta*dddaily/100), cls:'cr' },
    { lbl:'Meta SL / dia (USD)',val: fU(conta*slPct/100),  cls:'cr' },
    { lbl:'Meta Gain / dia (USD)',val:fU(conta*gainPct/100),cls:'cg' },
  ].map(b => `<div class="out-box" style="padding:8px;text-align:center">
    <div class="out-lbl">${b.lbl}</div>
    <div class="out-big ${b.cls}" style="font-size:16px">${b.val}</div>
  </div>`).join('');

  // 5 colunas RRR
  const grid = document.getElementById('rrrGrid');
  grid.innerHTML = RRR_VALUES.map(rr => {
    const cenarios = gerarCenarios(rr.v);
    let curN = 0;
    const rows = cenarios.map(c => {
      let sep = '';
      if (c.n !== curN) {
        curN = c.n;
        sep = `<tr><td colspan="4" style="background:var(--bg3);color:var(--dim);font-size:9px;padding:3px 6px;font-family:'JetBrains Mono',monospace;text-align:center;letter-spacing:.08em">— ${c.n} Op${c.n>1?'s':''} —</td></tr>`;
      }
      const pnlUSD = c.pnl * riscoPct * conta;
      const pnlBRL = pnlUSD * cot;
      const cls    = c.type==='pos'?'cg':c.type==='neg'?'cr':'cm';
      return `${sep}<tr>
        <td class="al" style="font-size:10px;padding:3px 5px">${c.label}</td>
        <td class="${cls}" style="font-size:10px;padding:3px 4px">${c.pnl>=0?'+':''}${(c.pnl*100).toFixed(1)}%</td>
        <td class="${cls}" style="font-size:10px;padding:3px 4px">${c.pnl>=0?'+':''}${fU(pnlUSD)}</td>
        <td class="${cls}" style="font-size:10px;padding:3px 4px">${c.pnl>=0?'+':''}${pfFR(pnlBRL)}</td>
      </tr>`;
    }).join('');
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <div style="background:var(--bg3);padding:6px 10px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:var(--blue);border-bottom:1px solid var(--border)">RRR ${rr.label}</div>
      <table class="tbl" style="font-size:10px">
        <thead><tr><th class="al" style="font-size:8px">Cenário</th><th style="font-size:8px">%</th><th style="font-size:8px">USD</th><th style="font-size:8px">BRL</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');
  saveState();
}

function calcRRRManual() {} // removido

// ═══════════════════════════════════════════════════════════
// PERSISTÊNCIA — JSON
// ═══════════════════════════════════════════════════════════
function collectState() {
  const ids = ['s_conta','s_payout','s_ddmax','s_dddaily','s_ir','s_taxa','s_rrr','s_stops',
    'm_conta','m_ir','m_taxa',
    'sq_conta','sq_lucro','sq_payout','sq_ir','sq_taxa',
    'pf_conta','pf_ddmax','pf_dddaily','pf_meta','pf_stops','pf_entradas','pf_rrr','pf_payout','pf_ir','pf_taxa',
    'gc_payout','gc_ir','gc_taxa',
    'f2_conta','f2_ddmax','f2_dddaily','f2_stops','f2_meta1','f2_meta2','f2_metaf','f2_entradas','f2_payout','f2_ir','f2_taxa',
    'f1_conta','f1_ddmax','f1_dddaily','f1_stops','f1_metap','f1_metaf','f1_entradas','f1_payout','f1_ir','f1_taxa',
    'in_conta','in_ddmax','in_dddaily','in_stops','in_metaf','in_entradas','in_payout','in_ir','in_taxa',
    'r_conta','r_ddmax','r_stops','r_pos','r_stop_m','r_rrr_m'];
  const state = { cot: globalCot, v: '1.0', ts: Date.now() };
  ids.forEach(id => { const el = document.getElementById(id); if(el) state[id] = el.value; });
  return state;
}

function applyState(state) {
  if (state.cot) { globalCot = parseFloat(state.cot); document.getElementById('gCot').value = globalCot.toFixed(2); pfSetCot(globalCot); }
  Object.keys(state).forEach(k => { const el = document.getElementById(k); if(el) el.value = state[k]; });
}

function saveState() {
  try { localStorage.setItem('pfState', JSON.stringify(collectState())); } catch(e) {}
}

function exportState() {
  const s = collectState();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }));
  a.download = 'propfirm_config_' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function importState(e) {
  const f = e.target.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ev => {
    try {
      const s = JSON.parse(ev.target.result);
      applyState(s);
      calcAll();
    } catch(err) { alert('Arquivo inválido'); }
  };
  rd.readAsText(f);
}

// Upload por fase (CSV ou JSON)
function importFase(e, key) {
  const f = e.target.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ev => {
    try {
      if (f.name.endsWith('.json')) {
        const s = JSON.parse(ev.target.result);
        applyState(s);
        calcAll();
      } else {
        // CSV simples key=value
        const lines = ev.target.result.split('\n');
        lines.forEach(l => {
          const [k, v] = l.split(',');
          if(k && v) { const el = document.getElementById(k.trim()); if(el) el.value = v.trim(); }
        });
        calcAll();
      }
    } catch(err) { alert('Erro ao importar arquivo'); }
  };
  rd.readAsText(f);
}

function exportFase(key) {
  exportState(); // por simplicidade exporta o estado completo
}

// ═══════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════
function pfTab(i) {
  const scope = document.getElementById('pf-app') || document;
  scope.querySelectorAll('.tab-btn').forEach((b, j) => b.classList.toggle('active', j===i));
  scope.querySelectorAll('.tab-panel').forEach((p, j) => p.classList.toggle('active', j===i));
}

// ═══════════════════════════════════════════════════════════
// CALCULAR TUDO
// ═══════════════════════════════════════════════════════════
function calcAll() {
  calcSimulador(); calcMulti(); calcSaque(); calcPropFirm();
  calcGrandes(); calc2Fases(); calc1Fase(); calcInstant(); calcRRR();
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
shAddLoad( () => {
  // Restaurar estado salvo
  try {
    const saved = localStorage.getItem('pfState');
    if (saved) applyState(JSON.parse(saved));
  } catch(e) {}

  // Usar cotação do hub (já propagada via hubSetCot)
  const hubCotEl = document.getElementById('hubCot');
  if (hubCotEl) { globalCot = parseFloat(hubCotEl.value) || globalCot; }

  document.getElementById('gCot').value = globalCot.toFixed(2);
  document.getElementById('cotBadge').textContent = 'R$ ' + globalCot.toFixed(2).replace('.', ',');

  calcAll();
});



// ══ GLOBALS ══
let cotacao = parseFloat(localStorage.getItem('cot')||'5.80');
const ptCharts = {};
function ptMkChart(id,cfg){const cv=document.getElementById(id);if(!cv)return;if(ptCharts[id])ptCharts[id].destroy();ptCharts[id]=new Chart(cv,cfg);return ptCharts[id];}
const ptF2=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const ptFR=v=>'R$'+ptF2(v); const ptFU=v=>'$'+ptF2(v);
const ptBaseOpts={responsive:true,maintainAspectRatio:false,animation:{duration:200},
  plugins:{legend:{labels:{color:'var(--muted)',font:{family:'JetBrains Mono',size:9}}}},
  scales:{x:{ticks:{color:'var(--dim)',font:{size:8},maxTicksLimit:12},grid:{color:'rgba(30,45,61,.4)'}},
          y:{ticks:{color:'var(--dim)',font:{size:8}},grid:{color:'rgba(30,45,61,.4)'}}}};

// ══ COTAÇÃO ══
function ptSetCot(v){cotacao=v;localStorage.setItem('cot',v);document.getElementById('cotDisp').textContent='USD/BRL: '+cotacao.toFixed(2);document.getElementById('plCot').value=cotacao.toFixed(2);calcCiclos();}
async function ptFetchCot(){try{const r=await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');const d=await r.json();const v=parseFloat(d.USDBRL.bid);document.getElementById('cotInput').value=v.toFixed(2);ptSetCot(v);}catch(e){document.getElementById('cotDisp').textContent='USD/BRL: '+cotacao.toFixed(2)+' (offline)';}}

// ══ CICLOS ══
let ciclosRows=[{nome:'Ciclo 1',capInicio:1000,gains:200,rrr:1},{nome:'Ciclo 2',capInicio:4500,gains:200,rrr:1},{nome:'Ciclo 3',capInicio:32500,gains:200,rrr:0.618},{nome:'Ciclo 4',capInicio:87600,gains:200,rrr:0.618}];

function getCicloParams(idx){
  const riscoIni=parseFloat(document.getElementById('cicRisco').value)||1;
  const redRisco=parseFloat(document.getElementById('cicRedRisco').value)||0;
  const intRisco=parseInt(document.getElementById('cicIntRisco').value)||1;
  const rrrIni=parseFloat(document.getElementById('cicRRR').value)||1;
  const deltaRRR=parseFloat(document.getElementById('cicDeltaRRR').value)||0;
  const intRRR=parseInt(document.getElementById('cicIntRRR').value)||1;
  const nops=parseInt(document.getElementById('cicNOps').value)||200;
  const risco=Math.max(0.01, riscoIni - Math.floor(idx/intRisco)*redRisco);
  const rrr=deltaRRR===0?rrrIni:Math.max(0.1, rrrIni + Math.floor(idx/intRRR)*deltaRRR);
  return {risco, rrr, nops};
}

function calcCapFinal(cap,risco,rrr,n){let s=cap;for(let i=0;i<n;i++)s+=s*(risco/100)*rrr;return s;}

function addCiclo(){const last=ciclosRows[ciclosRows.length-1];ciclosRows.push({nome:'Ciclo '+(ciclosRows.length+1),capInicio:last?last.capInicio:1000,gains:200,rrr:1});renderCiclos();}
function removeCiclo(i){ciclosRows.splice(i,1);renderCiclos();}
function calcCiclos(){if(ciclosRows.length>0)ciclosRows[0].capInicio=parseFloat(document.getElementById('cicCap').value)||1000;renderCiclos();}

function renderCiclos(){
  const co=cotacao;
  const tb=document.getElementById('ciclosTbody');
  const labels=[],dataUSD=[];
  // Propaga capital final de cada ciclo para o próximo automaticamente
  for(let i=1;i<ciclosRows.length;i++){
    const prev=ciclosRows[i-1];
    const {risco,rrr,nops}=getCicloParams(i-1);
    ciclosRows[i].capInicio=calcCapFinal(prev.capInicio,risco,rrr,nops);
  }
  tb.innerHTML=ciclosRows.map((c,i)=>{
    const {risco,rrr,nops}=getCicloParams(i);
    const capF=calcCapFinal(c.capInicio,risco,rrr,nops);
    const ganhoUSD=capF-c.capInicio;
    const ganhoR=ganhoUSD*co;
    const ganhoPerOp=c.capInicio*(risco/100)*rrr;
    labels.push(c.nome);dataUSD.push(ganhoUSD);
    return `<tr>
      <td class="al" style="color:var(--text);font-weight:600">${c.nome}</td>
      <td><input type="number" value="${c.capInicio.toFixed(2)}" step="1" ${i===0?`oninput="ciclosRows[0].capInicio=+this.value;document.getElementById('cicCap').value=this.value;renderCiclos()"`:'readonly'} style="width:85px;background:${i===0?'var(--bg3)':'transparent'};border:${i===0?'1px solid var(--border2)':'none'};border-radius:4px;color:${i===0?'var(--text)':'var(--muted)'};font-family:'JetBrains Mono',monospace;font-size:11px;padding:3px 6px;text-align:right"></td>
      <td class="cy">${risco.toFixed(2)}%</td>
      <td class="cb">${rrr.toFixed(3)}</td>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)">${nops}</span></td>
      <td class="cg">${ptFU(capF)}</td>
      <td style="color:var(--muted)">+${ptFU(ganhoPerOp)}</td>
      <td class="cg">+${ptFU(ganhoUSD)}</td>
      <td class="${ganhoR>=0?'cg':'cr'}">${ptFR(ganhoR)}</td>
      <td><button class="btn danger" onclick="removeCiclo(${i})" style="padding:2px 7px">✕</button></td>
    </tr>`;
  }).join('');
  ptMkChart('ciclosChart',{type:'bar',data:{labels,datasets:[{label:'Ganho ($)',data:dataUSD,backgroundColor:dataUSD.map(v=>v>=0?'rgba(63,185,80,.5)':'rgba(248,81,73,.5)'),borderColor:dataUSD.map(v=>v>=0?'rgba(63,185,80,.8)':'rgba(248,81,73,.8)'),borderWidth:1,borderRadius:4}]},options:{...ptBaseOpts,plugins:{...ptBaseOpts.plugins,legend:{display:false},tooltip:{callbacks:{label:ctx=>{const u=ctx.parsed.y;return[`Ganho: $${ptF2(u)}`,`Em R$: R$${ptF2(u*cotacao)}`];}}}}}});

  localStorage.setItem('hubCiclos', JSON.stringify(ciclosRows));
}

// ══ PARCIAIS ══
const PARC_REF=[
  {d:'100% @ 0.618',p:[100,0,0],r:[0.618,1,1]},{d:'75/25 @ 0.618+1',p:[75,25,0],r:[0.618,1,1]},
  {d:'50/50 @ 0.618+1',p:[50,50,0],r:[0.618,1,1]},{d:'50/50 @ 1+1.141',p:[50,50,0],r:[1,1.141,1]},
  {d:'50/25/25 @ 0.618+1+1.141',p:[50,25,25],r:[0.618,1,1.141]},{d:'25/50/25 @ 0.618+1+1.141',p:[25,50,25],r:[0.618,1,1.141]},
  {d:'25/25/50 @ 0.618+1+1.141',p:[25,25,50],r:[0.618,1,1.141]},{d:'50/25/25 @ 0.618+1+1.618',p:[50,25,25],r:[0.618,1,1.618]},
  {d:'25/50/25 @ 0.618+1+1.618',p:[25,50,25],r:[0.618,1,1.618]},{d:'25/25/50 @ 0.618+1+1.618',p:[25,25,50],r:[0.618,1,1.618]},
  {d:'50/25/25 @ 1+1.141+1.618',p:[50,25,25],r:[1,1.141,1.618]},{d:'25/50/25 @ 1+1.141+1.618',p:[25,50,25],r:[1,1.141,1.618]},
  {d:'25/25/50 @ 1+1.141+1.618',p:[25,25,50],r:[1,1.141,1.618]},
];
function calcParcMedia(p,r){const t=p.reduce((a,b)=>a+b,0);return t===0?0:p.reduce((s,v,i)=>s+(v/t)*r[i],0);}
function calcParciais(){
  const p1=+document.getElementById('p1p').value||0,r1=+document.getElementById('p1r').value||0;
  const p2=+document.getElementById('p2p').value||0,r2=+document.getElementById('p2r').value||0;
  const p3=+document.getElementById('p3p').value||0,r3=+document.getElementById('p3r').value||0;
  const soma=p1+p2+p3,rrr=calcParcMedia([p1,p2,p3],[r1,r2,r3]),exc=soma-100;
  document.getElementById('pRRR').textContent='~'+rrr.toFixed(3)+'R';
  const se=document.getElementById('pSoma');se.textContent=soma+'%';se.style.color=Math.abs(exc)<0.5?'var(--green)':'var(--red)';
  const ee=document.getElementById('pExc');ee.style.color=Math.abs(exc)<0.5?'var(--green)':exc>0?'var(--red)':'var(--yellow)';
  ee.textContent=exc>0.5?'+'+exc.toFixed(1)+'% excede':exc<-0.5?exc.toFixed(1)+'% faltam':'✓ ok';
  document.getElementById('parcRefTbody').innerHTML=PARC_REF.map(ref=>{const rv=calcParcMedia(ref.p,ref.r);const cl=Math.abs(rv-rrr)<0.02;return`<tr class="${cl?'parc-row active':'parc-row'}"><td class="al" style="font-size:10px">${ref.d}</td><td class="${rv>=1?'cg':rv>=0.618?'cy':'cr'}">~${rv.toFixed(3)}R</td></tr>`;}).join('');
}

// ══ SIMULAÇÃO BR ══
const BR_MULT={WDO:10,WIN:0.2};
function calcBR(){
  const mercado=document.getElementById('brMercado').value;
  const mult=BR_MULT[mercado];
  const stop=parseFloat(document.getElementById('brStop').value)||12;
  const total=parseInt(document.getElementById('brContratos').value)||3;
  const cts=[+document.getElementById('brA1').value,+document.getElementById('brA2').value,+document.getElementById('brA3').value,+document.getElementById('brA4').value];
  const mults=[0.618,1,1.618,2];
  const labels=['Alvo 1 (61,8%)','Alvo 2 (100%)','Alvo 3 (161,8%)','Alvo 4 (200%)'];
  // Stop em R$ por contrato = stop_pts × mult
  const stopR = stop * mult;
  const stopTotal = stopR * total;
  let lucroTotal=0,totalCtt=0;
  document.getElementById('brAlvosTbody').innerHTML=mults.map((m,i)=>{
    const pts=stop*m;
    const lucroC=pts*mult;
    const lucroA=lucroC*cts[i];
    lucroTotal+=lucroA;totalCtt+=cts[i];
    const pct=total>0?(cts[i]/total*100).toFixed(0)+'%':'—';
    return`<tr><td class="al">${labels[i]}</td><td class="cm">${m}</td><td>${pts.toFixed(3)}</td><td class="cr">${ptFR(stopR)}</td><td class="cg">${ptFR(lucroC)}</td><td>${cts[i]}</td><td class="cg">${ptFR(lucroA)}</td><td class="cm">${pct}</td></tr>`;
  }).join('');
  document.getElementById('brStopTotal').textContent=ptFR(stopTotal);
  document.getElementById('brLucroTotal').textContent=ptFR(lucroTotal);
  document.getElementById('brLucroMedio').textContent=total>0?ptFR(lucroTotal/total):'—';
  const ok=totalCtt===total;
  document.getElementById('brStatus').textContent=ok?'✅ OK':'❌ '+totalCtt+'/'+total+' contratos alocados';
  document.getElementById('brStatus').style.color=ok?'var(--green)':'var(--red)';
}

// ══ RECUPERAÇÃO ══
const RECOV_STEPS=[0.5,1,2,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95];
function calcRecov(){
  const cap=parseFloat(document.getElementById('recovCap').value)||1000;
  document.getElementById('recovTbody').innerHTML=RECOV_STEPS.map(p=>{
    const saldo=cap*(1-p/100),perda=cap-saldo,ganho=(cap/saldo-1)*100;
    const cls=p<=10?'cg':p<=30?'cy':'cr';
    return`<tr><td class="${cls} al">${p}%</td><td>${ptFU(saldo)}</td><td class="${cls}">-${ptFU(perda)}</td><td class="${cls}">${ganho.toFixed(2)}%</td></tr>`;
  }).join('');
}

// ══ METAS ══
function calcMetas(){
  const cap=parseFloat(document.getElementById('mCapUSD').value)||1000;
  const risco=parseFloat(document.getElementById('mRisco').value)||1;
  const rrr=parseFloat(document.getElementById('mRRR').value)||1.141;
  const meta=parseFloat(document.getElementById('mMeta').value)||1000;
  const riscoU=cap*(risco/100),lucroU=riscoU*rrr;
  document.getElementById('mRiscoU').textContent=ptFU(riscoU);
  document.getElementById('mLucroU').textContent=ptFU(lucroU);
  const acTot=lucroU>0?Math.ceil(meta/lucroU):0;
  document.getElementById('metasTbody').innerHTML=[1,2,3,4].map(m=>{
    const dias=22*m,acP=acTot/m;
    return`<tr><td>${m} mês${m>1?'es':''}</td><td>${dias}</td><td class="cb">${acP.toFixed(0)}</td><td class="cy">${(acP/4).toFixed(1)}</td><td class="cm">${(acP/22).toFixed(2)}</td></tr>`;
  }).join('');
}

// ══ LOSSES ══
function calcLosses(){
  const wr=parseFloat(document.getElementById('wrSlider').value)/100,N=100,lr=1-wr;
  const labels=[],vals=[];let rows='';
  for(let x=1;x<=10;x++){
    const p=1-Math.pow(1-Math.pow(lr,x),N-x+1),pct=(p*100).toFixed(1);
    const bar='█'.repeat(Math.round(p*20))+'░'.repeat(20-Math.round(p*20));
    const cls=p>0.5?'cr':p>0.2?'cy':'cg';
    rows+=`<tr><td class="cm">${x} seguidos</td><td class="${cls}">${pct}%</td><td style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--${p>0.5?'red':p>0.2?'yellow':'green'})">${bar}</td></tr>`;
    labels.push(x+' consec.');vals.push(parseFloat(pct));
  }
  document.getElementById('lossTbody').innerHTML=rows;
  ptMkChart('lossChart',{type:'line',data:{labels,datasets:[{label:'P(%)',data:vals,borderColor:'rgba(99,169,255,.9)',backgroundColor:'rgba(99,169,255,.1)',fill:true,tension:0.3,pointBackgroundColor:'rgba(99,169,255,.9)',pointRadius:3}]},options:{...ptBaseOpts,scales:{x:{ticks:{color:'var(--dim)',font:{size:8}},grid:{color:'rgba(30,45,61,.4)'}},y:{min:0,max:100,ticks:{color:'var(--dim)',font:{size:8},callback:v=>v+'%'},grid:{color:'rgba(30,45,61,.4)'}}}}});
}

// ══ HEATMAP ══
function buildHeatmap(){
  const wrs=[20,25,30,35,40,45,50,55,60,65,70,75,80],rrrs=[0.5,0.75,1.0,1.141,1.25,1.5,1.618,2.0,2.5,3.0];
  const tbl=document.getElementById('heatTbl');
  let h='<thead><tr><th style="text-align:center">WR\\RRR</th>'+rrrs.map(r=>`<th style="text-align:center">${r}</th>`).join('')+'</tr></thead><tbody>';
  wrs.forEach(wr=>{
    h+=`<tr><th style="font-weight:700;color:var(--muted);font-size:9px;text-align:center;padding:5px 6px">${wr}%</th>`;
    rrrs.forEach(rrr=>{const exp=(wr/100)*rrr-(1-wr/100),be=Math.abs(exp)<0.015;const cls=be?'hm-be':exp>0?'hm-pos':'hm-neg';h+=`<td class="${cls}" style="padding:5px 4px;text-align:center">${exp>=0?'+':''}${exp.toFixed(2)}</td>`;});
    h+='</tr>';
  });
  tbl.innerHTML=h+'</tbody>';
}

// ══ DD ══
let ddHist=[];
function clearDDHist(){ddHist=[];renderDDHist();}
function renderDDHist(){
  if(ddHist.length<2){document.getElementById('ddHistBox').style.display='none';return;}
  document.getElementById('ddHistBox').style.display='block';
  document.getElementById('ddHistCount').textContent=ddHist.length;
  const meds=ddHist.map(h=>h.med);
  const avg=Math.round(meds.reduce((a,b)=>a+b,0)/meds.length),mn=Math.min(...meds),mx=Math.max(...meds);
  document.getElementById('ddHistChips').innerHTML=[['Média',avg,'blue'],['Mínimo',mn,'green'],['Máximo',mx,'red']].map(([l,v,c])=>`<div style="background:var(--bg3);border:1px solid var(--border2);border-radius:5px;padding:3px 10px;font-family:'JetBrains Mono',monospace;font-size:10px;display:flex;gap:5px;align-items:center"><span style="color:var(--muted)">${l}</span><span style="color:var(--${c});font-weight:700">${v} trades</span></div>`).join('');
}
function calcDDModo(){
  const m=document.getElementById('ddModo').value;
  document.getElementById('ddInputsAlvo').style.display=m==='alvo'?'grid':'none';
  document.getElementById('ddInputsPct').style.display=m==='pct'?'block':'none';
  document.getElementById('ddInputsUSD').style.display=m==='usd'?'block':'none';
}
function calcDDFromPct(){
  const cap=parseFloat(document.getElementById('ddCapOrig').value)||1000;
  const pct=parseFloat(document.getElementById('ddPerdaPct').value)||0;
  const atual=cap*(1-pct/100);
  document.getElementById('ddAtual').value=atual.toFixed(2);
  document.getElementById('ddAlvo').value=cap.toFixed(2);
  calcDD();
}
function calcDDFromUSD(){
  const cap=parseFloat(document.getElementById('ddCapOrig2').value)||1000;
  const perdaU=parseFloat(document.getElementById('ddPerdaUSD').value)||0;
  const atual=cap-perdaU;
  document.getElementById('ddAtual').value=atual.toFixed(2);
  document.getElementById('ddAlvo').value=cap.toFixed(2);
  calcDD();
}
function calcDD(){
  const atual=parseFloat(document.getElementById('ddAtual').value)||700;
  const alvo=parseFloat(document.getElementById('ddAlvo').value)||1000;
  const wr=parseFloat(document.getElementById('ddWR').value)/100;
  const rrr=parseFloat(document.getElementById('ddRRR').value)||1.141;
  const risco=parseFloat(document.getElementById('ddRisco').value)/100;
  const ddPct=((alvo-atual)/alvo*100).toFixed(1);
  document.getElementById('ddPctOut').textContent='-'+ddPct+'%';
  if(atual>=alvo){document.getElementById('ddMedOut').textContent='0';document.getElementById('ddRangeOut').textContent='Já atingiu';return;}
  const SIMS=5000,MAX=10000,counts=[];
  for(let s=0;s<SIMS;s++){let bal=atual,n=0;while(bal<alvo&&n<MAX){const g=Math.random()<wr?bal*risco*rrr:-bal*risco;bal=Math.max(0,bal+g);n++;if(bal<=0)break;}counts.push(n);}
  counts.sort((a,b)=>a-b);
  const med=counts[Math.floor(SIMS/2)],p10=counts[Math.floor(SIMS*.1)],p90=counts[Math.floor(SIMS*.9)];
  document.getElementById('ddMedOut').textContent=med+' trades';
  document.getElementById('ddRangeOut').textContent=p10+' — '+p90+' trades';
  ddHist.push({med,p10,p90});renderDDHist();
  let bal2=atual;const sl=[atual];
  for(let i=0;i<Math.min(med*3,500);i++){const fr=Math.round(1/wr);const g=(i%fr===0)?bal2*risco*rrr:-bal2*risco;bal2=Math.max(0,bal2+g);sl.push(bal2);if(bal2>=alvo)break;}
  const histDs=ddHist.length>1?[{label:'Tendência',data:Array(sl.length).fill(null).map((_,i)=>atual+(alvo-atual)*(i/(sl.length-1))),borderColor:'rgba(188,140,255,.5)',borderDash:[3,3],borderWidth:1,pointRadius:0,fill:false}]:[];
  ptMkChart('ddChart',{type:'line',data:{labels:sl.map((_,i)=>i===0?'Início':i),datasets:[{label:'Simulação ($)',data:sl,borderColor:'rgba(99,169,255,.9)',backgroundColor:'rgba(99,169,255,.07)',fill:true,tension:0.2,pointRadius:0,borderWidth:1.5},{label:'Alvo',data:Array(sl.length).fill(alvo),borderColor:'rgba(63,185,80,.5)',borderDash:[4,3],borderWidth:1,pointRadius:0,fill:false},{label:'Atual',data:Array(sl.length).fill(atual),borderColor:'rgba(248,81,73,.4)',borderDash:[3,3],borderWidth:1,pointRadius:0,fill:false},...histDs]},options:{...ptBaseOpts,scales:{x:{ticks:{color:'var(--dim)',font:{size:8},maxTicksLimit:10},grid:{color:'rgba(30,45,61,.3)'}},y:{ticks:{color:'var(--dim)',font:{size:8}},grid:{color:'rgba(30,45,61,.3)'}}}}});
}

// ══ PLANILHA ══
function renderPlanilha(){
  const cap=parseFloat(document.getElementById('plCap').value)||1000;
  const risco=parseFloat(document.getElementById('plRisco').value)/100||0.01;
  const rrr=parseFloat(document.getElementById('plRRR').value)||1.141;
  const co=parseFloat(document.getElementById('plCot').value)||cotacao;
  const N=200;const tb=document.getElementById('planilhaTbody');
  let rows='',s=cap;const chartData=[cap];
  rows+=`<tr><td class="al cm">Início</td><td>${ptFU(s)}</td><td class="cm">—</td><td class="cm">—</td><td class="cm">—</td><td class="cm">${ptFR(s*co)}</td></tr>`;
  for(let i=1;i<=N;i++){const prev=s,diff=prev*risco*rrr;s=prev+diff;chartData.push(s);rows+=`<tr><td class="al cm">${i}</td><td class="cg">${ptFU(s)}</td><td class="cg">+${ptFU(diff)}</td><td class="cg">+1</td><td class="cg">+${ptFR(diff*co)}</td><td class="cb">${ptFR(s*co)}</td></tr>`;}
  tb.innerHTML=rows;
  const labels=['Início',...Array.from({length:N},(_,i)=>i+1)];
  ptMkChart('planilhaChart',{type:'line',data:{labels,datasets:[{label:'Capital ($)',data:chartData,borderColor:'rgba(99,169,255,.9)',backgroundColor:'rgba(99,169,255,.07)',fill:true,tension:0.2,pointRadius:0,borderWidth:1.5}]},options:{...ptBaseOpts,scales:{x:{ticks:{color:'var(--dim)',font:{size:8},maxTicksLimit:15},grid:{color:'rgba(30,45,61,.3)'}},y:{ticks:{color:'var(--dim)',font:{size:8},callback:v=>'$'+v.toLocaleString('pt-BR')},grid:{color:'rgba(30,45,61,.3)'}}}}});
}

// ══ DIÁRIO ══
function loadDiary(){return JSON.parse(localStorage.getItem('diary2026')||'[]');}
function saveDiary(d){localStorage.setItem('diary2026',JSON.stringify(d));}
function renderDiary(){
  const diaryTbody = document.getElementById('diaryTbody');
  if (!diaryTbody) return;
  diaryTbody.innerHTML=loadDiary().map((r,i)=>`<tr><td><input type="date" value="${r.data}" oninput="updateD(${i},'data',this.value)" style="width:108px"></td><td><input type="number" value="${r.ciclo}" oninput="updateD(${i},'ciclo',+this.value)" style="width:40px"></td><td><input type="number" value="${r.bU}" step="0.01" oninput="updateD(${i},'bU',+this.value)" style="width:70px"></td><td class="cm" style="font-size:10px">${ptFR(r.bU*cotacao)}</td><td><input type="number" value="${r.risco}" step="0.1" oninput="updateD(${i},'risco',+this.value)" style="width:45px"></td><td><input type="number" value="${r.rrr}" step="0.001" oninput="updateD(${i},'rrr',+this.value)" style="width:52px"></td><td><select onchange="updateD(${i},'res',this.value)" style="width:52px;padding:4px"><option ${r.res==='W'?'selected':''}>W</option><option ${r.res==='L'?'selected':''}>L</option></select></td><td><input class="al" value="${r.obs||''}" oninput="updateD(${i},'obs',this.value)" style="width:100%"></td><td><button class="btn danger" onclick="deleteD(${i})" style="padding:2px 6px">✕</button></td></tr>`).join('');
}
function addDiary(){const d=loadDiary();d.push({data:new Date().toISOString().split('T')[0],ciclo:1,bU:1000,risco:1,rrr:1.141,res:'W',obs:''});saveDiary(d);renderDiary();}
function updateD(i,k,v){const d=loadDiary();d[i][k]=v;saveDiary(d);}
function deleteD(i){const d=loadDiary();d.splice(i,1);saveDiary(d);renderDiary();}
function exportDiary(){const d=loadDiary();if(!d.length)return;const hdr='Data,Ciclo,Banca USD,Risco%,RRR,Resultado,Observação';const rows=d.map(r=>[r.data,r.ciclo,r.bU,r.risco,r.rrr,r.res,'"'+(r.obs||'')+'"'].join(','));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([[hdr,...rows].join('\n')],{type:'text/csv'}));a.download='diario_trade_2026.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);}
function importDiary(e){const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=ev=>{const lines=ev.target.result.split('\n').slice(1).filter(l=>l.trim());const d=lines.map(l=>{const c=l.split(',');return{data:c[0],ciclo:+c[1],bU:+c[2],risco:+c[3],rrr:+c[4],res:c[5],obs:(c[6]||'').replace(/"/g,'')};});saveDiary(d);renderDiary();};rd.readAsText(f);}

// ══ ABA 2 LOSS ══
function gerarContinuo(cap,risco,n){const t=[];let s=cap;for(let i=0;i<n;i++){const pnl=-(s*risco);s=Math.max(0,s+pnl);t.push({n:i+1,res:'L',pnl,saldo:s});}return t;}
function gerarAlternado(cap,risco,rrr,n){const t=[];let s=cap,isL=true;for(let i=0;i<n;i++){const pnl=isL?-(s*risco):s*risco*rrr;s=Math.max(0,s+pnl);t.push({n:i+1,res:isL?'L':'W',pnl,saldo:s});isL=!isL;}return t;}
function renderSimTable(id,trades,cap){document.getElementById(id).innerHTML=trades.map(t=>{const pct=((t.saldo-cap)/cap*100).toFixed(1),dd=((cap-t.saldo)/cap*100).toFixed(1),cls=t.res==='W'?'sw':'sl',rc=t.res==='W'?'row-ws':'row-ls';return`<tr class="${rc}"><td class="cm">${t.n}</td><td class="${cls}">${t.res}</td><td class="${t.pnl>=0?'cg':'cr'}">${t.pnl>=0?'+':''}${ptFR(t.pnl)}</td><td>${ptFR(t.saldo)}</td><td class="cm">${id==='cTbody'?'-'+dd+'%':(pct>=0?'+':'')+pct+'%'}</td></tr>`}).join('');}
function renderSimLine(id,trades,cap){const labels=['Início',...trades.map(t=>t.n)],data=[cap,...trades.map(t=>t.saldo)];ptMkChart(id,{type:'line',data:{labels,datasets:[{label:'Saldo (R$)',data,borderColor:'rgba(99,169,255,.9)',backgroundColor:'rgba(99,169,255,.07)',fill:true,tension:0.1,pointRadius:0,borderWidth:1.5},{label:'Capital Inicial',data:Array(data.length).fill(cap),borderColor:'rgba(107,125,143,.35)',borderDash:[4,3],borderWidth:1,pointRadius:0,fill:false}]},options:{...ptBaseOpts,scales:{x:{ticks:{color:'var(--dim)',font:{size:8},maxTicksLimit:12},grid:{color:'rgba(30,45,61,.3)'}},y:{ticks:{color:'var(--dim)',font:{size:8},callback:v=>'R$'+v.toLocaleString('pt-BR')},grid:{color:'rgba(30,45,61,.3)'}}}}});}
function runSim(){
  const cap=parseFloat(document.getElementById('sCap').value)||5000;
  const risco=parseFloat(document.getElementById('sRisco').value)/100||0.02;
  const rrr=parseFloat(document.getElementById('sRRR').value)||1;
  const n=parseInt(document.getElementById('sN').value)||100;
  const tC=gerarContinuo(cap,risco,n),tA=gerarAlternado(cap,risco,rrr,n);
  const cFinal=tC[tC.length-1].saldo,cDD=((cap-cFinal)/cap*100).toFixed(1);
  document.getElementById('cFinal').textContent=ptFR(cFinal);document.getElementById('cFinal').style.color=cFinal>=cap?'var(--green)':'var(--red)';
  document.getElementById('cDD').textContent='-'+cDD+'%';
  const aFinal=tA[tA.length-1].saldo,aMin=Math.min(...tA.map(t=>t.saldo)),aDD=((cap-aMin)/cap*100).toFixed(1);
  document.getElementById('aFinal').textContent=ptFR(aFinal);document.getElementById('aFinal').style.color=aFinal>=cap?'var(--green)':'var(--red)';
  document.getElementById('aRet').textContent='-'+aDD+'%';
  renderSimTable('cTbody',tC,cap);renderSimTable('aTbody',tA,cap);
  renderSimLine('cChart',tC,cap);renderSimLine('aChart',tA,cap);
}

// ══ DT CALC ══
const DT_CFG={sp:{mult:50,br:false},nq:{mult:20,br:false},cl:{mult:1000,br:false},wd:{mult:10,br:true},wi:{mult:0.2,br:true}};
function calcDT(k){
  const qtd=parseFloat(document.getElementById(k+'Qtd').value)||1;
  const entrada=parseFloat(document.getElementById(k+'Entrada').value)||0;
  const stop=parseFloat(document.getElementById(k+'Stop').value)||0;
  const alvo=parseFloat(document.getElementById(k+'Alvo').value)||0;
  const m=DT_CFG[k].mult;
  // Risco  = |entrada - stop| × mult × qtd  (sempre positivo)
  // Lucro  = |alvo - entrada| × mult × qtd  (sempre positivo)
  const risco = Math.abs(entrada - stop) * m * qtd;
  const lucro = Math.abs(alvo - entrada) * m * qtd;
  const fmt=DT_CFG[k].br?ptFR:ptFU;
  document.getElementById(k+'Risco').textContent = fmt(risco);
  document.getElementById(k+'Lucro').textContent = fmt(lucro);
  const rrrEl = document.getElementById(k+'RRRout');
  if(rrrEl) rrrEl.textContent = risco>0 ? (lucro/risco).toFixed(2)+'R' : '—';
}
function calcDTVol(k){
  const ult=parseFloat(document.getElementById(k+'Ult').value)||0;
  const volPct=parseFloat(document.getElementById(k+'VolPct').value)/100||0;
  const qtd=parseFloat(document.getElementById(k+'VolQtd').value)||1;
  const m=DT_CFG[k].mult;
  const volPts=ult*volPct;          // vol histórica em pontos
  const vol20=volPts*0.2;           // 20% da vol = movimento esperado do pivô
  const riscoLote=vol20*m;          // risco por lote = 20%vol × mult
  const riscoTot=riscoLote*qtd;     // risco total = risco/lote × qtd contratos
  const fmt=DT_CFG[k].br?ptFR:ptFU;
  document.getElementById(k+'VolPts').textContent=volPts.toFixed(2);
  document.getElementById(k+'Vol20').textContent=vol20.toFixed(2);
  document.getElementById(k+'RiscoLote').textContent=fmt(riscoLote);
  document.getElementById(k+'RiscoTot').textContent=fmt(riscoTot);

  // ── Alimentar automaticamente os inputs do Gerenciamento de Risco ──
  // WIN (wi) → winVolStop;  DOL (wd) → dolVolStop
  if(k==='wi'){
    document.getElementById('winVolStop').value=riscoLote.toFixed(2);
    calcGerRisco();
  }
  if(k==='wd'){
    document.getElementById('dolVolStop').value=riscoLote.toFixed(2);
    calcGerRisco();
  }
}

// ══ CÁLCULO DE AÇÕES — isolado ══
function calcAcoes(){
  const risco = parseFloat(document.getElementById('acRisco').value) || 250;
  const dif   = parseFloat(document.getElementById('acDif').value)   || 0.45;
  document.getElementById('acQtd').textContent = (risco / dif).toFixed(0);
}

// ══ GERENCIAMENTO WIN/WDO — independente do bloco de Ações ══
function calcGerRisco(){
  // Volatilidade — Máx Risco/Trade (preenchido pelo vol-strip ou manualmente)
  const wVol = parseFloat(document.getElementById('winVolStop').value) || 0;
  const dVol = parseFloat(document.getElementById('dolVolStop').value) || 0;
  document.getElementById('winMRT').textContent = ptFR(wVol);
  document.getElementById('winDia').textContent = ptFR(wVol * 3);
  document.getElementById('winSem').textContent = ptFR(wVol * 6);
  document.getElementById('winMes').textContent = ptFR(wVol * 12);
  document.getElementById('dolMRT').textContent = ptFR(dVol);
  document.getElementById('dolDia').textContent = ptFR(dVol * 3);
  document.getElementById('dolSem').textContent = ptFR(dVol * 6);
  document.getElementById('dolMes').textContent = ptFR(dVol * 12);

  // Por Pontos — cada linha tem seu próprio risco de referência
  const winRiscoRef = parseFloat(document.getElementById('winRiscoRef').value) || 250;
  const dolRiscoRef = parseFloat(document.getElementById('dolRiscoRef').value) || 250;
  const winPts = parseFloat(document.getElementById('winPts').value) || 150;
  const dolPts = parseFloat(document.getElementById('dolPts').value) || 10;
  const winPPt = winPts * 0.2;   // WIN: ponto = R$0,20
  const dolPPt = dolPts * 10;    // DOL: ponto = R$10
  document.getElementById('winPorPto').textContent = ptFR(winPPt);
  document.getElementById('winNctt').textContent   = (winRiscoRef / winPPt).toFixed(2);
  document.getElementById('dolPorPto').textContent = ptFR(dolPPt);
  document.getElementById('dolNctt').textContent   = (dolRiscoRef / dolPPt).toFixed(2);

}

// Botão ▶ Atualizar chama ambos
function calcAcoesFull(){ calcAcoes(); calcGerRisco(); }

// ══ TABS ══
function ptTab(i){
  const scope = document.getElementById('pt-app') || document;
  scope.querySelectorAll('.tab-btn').forEach((b,j)=>b.classList.toggle('active',j===i));
  scope.querySelectorAll('.tab-panel').forEach((p,j)=>p.classList.toggle('active',j===i));
}

// ══ INIT ══
shAddLoad(()=>{
  document.getElementById('cotInput').value=cotacao.toFixed(2);
  document.getElementById('cotDisp').textContent='USD/BRL: '+cotacao.toFixed(2);
  document.getElementById('plCot').value=cotacao.toFixed(2);
  const savedCiclos = localStorage.getItem('hubCiclos');
  if(savedCiclos){try{ciclosRows=JSON.parse(savedCiclos);}catch(e){}}
  calcCiclos();calcParciais();calcBR();calcRecov();calcMetas();calcLosses();buildHeatmap();renderPlanilha();renderDiary();
  // inicializar Loss com defaults
  runSim();
  // DT
  ['sp','nq','cl','wd','wi'].forEach(k=>{calcDT(k);calcDTVol(k);});
  calcAcoes(); calcGerRisco();
  ptFetchCot();
});



// ─── SYNC RANGE/INPUT ───
function syncRange(inputId, rangeId, val, unit) {
  document.getElementById(inputId).value = val;
  document.getElementById(rangeId+'Val').textContent = val + unit;
  recalcRRR(); recalcAll();
}
function syncInput(inputId, rangeId, val, unit) {
  document.getElementById(rangeId).value = val;
  document.getElementById(rangeId+'Val').textContent = val + unit;
  recalcRRR(); recalcAll();
}

function recalcAll() {
  recalcMetrics();
  buildScenarios();
  buildRecovery();
  buildIntraday();
}

document.getElementById('sl')?.addEventListener('input', () => { recalcRRR(); recalcAll(); });
document.getElementById('tp')?.addEventListener('input', () => { recalcRRR(); recalcAll(); });
['ts-capital','risk','dailyStop','dailyTarget','trades','wr','days','cycles','seqTrades','tradesPerCycle'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', recalcAll);
});

function recalcRRR() {
  const sl = parseFloat(document.getElementById('sl').value) || 1;
  const tp = parseFloat(document.getElementById('tp').value) || 1;
  document.getElementById('rrrDisplay').textContent = `1 : ${(tp/sl).toFixed(2)}`;
}

// ─── GET PARAMS ───
function P() {
  return {
    capital: parseFloat(document.getElementById('ts-capital').value) || 10000,
    risk: parseFloat(document.getElementById('risk').value) || 1,
    dailyStop: parseFloat(document.getElementById('dailyStop').value) || 2,
    dailyTarget: parseFloat(document.getElementById('dailyTarget').value) || 1,
    sl: parseFloat(document.getElementById('sl').value) || 1,
    tp: parseFloat(document.getElementById('tp').value) || 1,
    trades: parseInt(document.getElementById('trades').value) || 10,
    wr: parseFloat(document.getElementById('wr').value) / 100 || 0.55,
    days: parseInt(document.getElementById('days').value) || 60,
    cycles: parseInt(document.getElementById('cycles').value) || 200,
    seqTrades: parseInt(document.getElementById('seqTrades').value) || 40,
    tradesPerCycle: parseInt(document.getElementById('tradesPerCycle').value) || 10,
  };
}

// ─── METRICS ───
function recalcMetrics() {
  const p = P();
  const rrr = p.tp / p.sl;
  const beWR = 1 / (1 + rrr);
  const ev = (p.wr * p.tp) - ((1 - p.wr) * p.sl);
  const dailyEV = ev * p.trades; // simplified (ignoring daily stop)
  const maxSL = Math.floor(p.dailyStop / p.sl);
  const proj20 = Math.pow(1 + ev/100, p.trades * 20) * p.capital;

  const beColor = p.wr > beWR ? 'col-green' : p.wr > beWR * 0.9 ? 'col-yellow' : 'col-red';
  const evColor = ev > 0 ? 'col-green' : 'col-red';

  document.getElementById('mBeWR').textContent = (beWR * 100).toFixed(1) + '%';
  document.getElementById('mBeWR').className = 'metric-value ' + (p.wr > beWR ? 'col-green' : 'col-red');
  document.getElementById('mEV').textContent = (ev >= 0 ? '+' : '') + ev.toFixed(3) + '%';
  document.getElementById('mEV').className = 'metric-value ' + evColor;
  document.getElementById('mDailyEV').textContent = (dailyEV >= 0 ? '+' : '') + dailyEV.toFixed(2) + '%';
  document.getElementById('mDailyEV').className = 'metric-value ' + evColor;
  document.getElementById('mMaxSL').textContent = maxSL + ' SL';
  document.getElementById('mProj20').textContent = (proj20 >= p.capital ? '+' : '') + '$' + Math.round(proj20 - p.capital).toLocaleString('pt-BR');
  document.getElementById('mProj20').className = 'metric-value ' + (proj20 >= p.capital ? 'col-green' : 'col-red');

  // Warning
  const warn = document.getElementById('warningText');
  const warnBox = document.getElementById('warningBox');
  if (p.wr < beWR) {
    warnBox.style.background = 'rgba(248,81,73,.08)';
    warnBox.style.borderColor = 'rgba(248,81,73,.3)';
    warn.innerHTML = `❌ Seu win rate de <strong>${(p.wr*100).toFixed(0)}%</strong> está <strong>abaixo do breakeven (${(beWR*100).toFixed(1)}%)</strong>. Com este setup, cada trade operado gera expectativa negativa de <strong>${Math.abs(ev).toFixed(3)}%</strong>. A conta vai a zero no longo prazo.`;
    warn.style.color = 'var(--red)';
  } else if (p.wr < beWR * 1.1) {
    warnBox.style.background = 'rgba(227,179,65,.07)';
    warnBox.style.borderColor = 'rgba(227,179,65,.25)';
    warn.innerHTML = `⚠️ Seu win rate de <strong>${(p.wr*100).toFixed(0)}%</strong> está apenas <strong>${((p.wr - beWR)*100).toFixed(1)}% acima do breakeven</strong>. A margem de segurança é pequena — qualquer período de drawdown pode virar a conta.`;
    warn.style.color = 'var(--yellow)';
  } else {
    warnBox.style.background = 'rgba(63,185,80,.07)';
    warnBox.style.borderColor = 'rgba(63,185,80,.25)';
    warn.innerHTML = `✅ Win rate de <strong>${(p.wr*100).toFixed(0)}%</strong> está <strong>${((p.wr - beWR)*100).toFixed(1)}% acima do breakeven (${(beWR*100).toFixed(1)}%)</strong>. Expectativa positiva de <strong>+${ev.toFixed(3)}%</strong> por trade. Continue monitorando a consistência.`;
    warn.style.color = 'var(--green)';
  }

  document.getElementById('seqN').textContent = p.seqTrades;
  document.getElementById('cycleN').textContent = p.tradesPerCycle;
  recalcRRR();
}

// ─── SCENARIO TABLE ───
function buildScenarios() {
  const p = P();
  const body = document.querySelector('#scenarioTable tbody');
  body.innerHTML = '';
  const scenarios = [
    { name: 'Muito Ruim', wr: 0.20, color: 'rgba(248,81,73,.9)' },
    { name: 'Ruim', wr: 0.35, color: 'rgba(240,136,62,.9)' },
    { name: 'Mediano', wr: 0.50, color: 'rgba(227,179,65,.9)' },
    { name: 'Breakeven', wr: p.sl / (p.sl + p.tp), color: 'rgba(107,125,143,.9)' },
    { name: 'Bom', wr: 0.60, color: 'rgba(99,169,255,.9)' },
    { name: 'Muito Bom', wr: 0.70, color: 'rgba(63,185,80,.9)' },
    { name: 'Seu WR', wr: p.wr, color: 'rgba(188,140,255,.9)' },
  ];
  scenarios.forEach(s => {
    const days = p.days;
    const winD = Math.round(s.wr * days);
    const lossD = days - winD;
    const result = (winD * p.dailyTarget) - (lossD * p.dailyStop);
    const finalCap = p.capital * (1 + result/100);
    const diff = finalCap - p.capital;
    let badge = result > 2 ? 'badge-green' : result >= 0 ? 'badge-yellow' : result > -10 ? 'badge-red' : 'badge-red';
    let label = result > 2 ? 'Lucrativo' : result >= -1 ? 'Breakeven' : 'Prejuízo';
    const isYou = s.name === 'Seu WR';
    body.innerHTML += `
      <tr style="${isYou ? 'background:rgba(188,140,255,0.04)' : ''}">
        <td><span style="display:inline-flex;align-items:center;gap:6px">
          <span style="width:7px;height:7px;border-radius:50%;background:${s.color};flex-shrink:0"></span>
          <span style="${isYou ? 'color:var(--purple);font-weight:600' : ''}">${s.name}</span>
        </span></td>
        <td class="mono" style="color:${s.color}">${(s.wr*100).toFixed(0)}%</td>
        <td class="mono col-green">${winD}</td>
        <td class="mono col-red">${lossD}</td>
        <td class="mono ${result >= 0 ? 'col-green' : 'col-red'}">${result >= 0 ? '+' : ''}${result.toFixed(1)}%</td>
        <td class="mono ${diff >= 0 ? 'col-green' : 'col-red'}">${diff >= 0 ? '+' : ''}$${Math.abs(diff).toFixed(0)}</td>
        <td><span class="badge ${badge}">${label}</span></td>
      </tr>`;
  });
}

// ─── RECOVERY TABLE ───
function buildRecovery() {
  const p = P();
  const body = document.querySelector('#recoveryTable tbody');
  body.innerHTML = '';
  const situations = [
    { label: '1 stop diário', stops: 1, missedGains: 0 },
    { label: '2 stops consecutivos', stops: 2, missedGains: 0 },
    { label: '3 stops consecutivos', stops: 3, missedGains: 0 },
    { label: '1 stop + 1 dia sem entrar', stops: 1, missedGains: 1 },
    { label: '1 stop + 2 dias sem entrar', stops: 1, missedGains: 2 },
    { label: '2 stops + 2 dias sem entrar', stops: 2, missedGains: 2 },
  ];
  situations.forEach(s => {
    const totalLoss = s.stops * p.sl;
    const missedReturn = s.missedGains * p.tp;
    const effectiveLoss = totalLoss;
    const daysNeeded = Math.ceil(effectiveLoss / p.tp);
    const needed = (effectiveLoss / (1 - effectiveLoss/100)).toFixed(2);
    const severity = daysNeeded <= 2 ? 'badge-yellow' : daysNeeded <= 5 ? 'badge-red' : 'badge-red';
    body.innerHTML += `
      <tr>
        <td style="font-size:11px">${s.label}${s.missedGains > 0 ? ` <span style="color:var(--dim);font-size:10px">(+${s.missedGains} dias perdidos)</span>` : ''}</td>
        <td class="mono col-red">−${totalLoss.toFixed(1)}%</td>
        <td class="mono col-yellow">${daysNeeded} dias</td>
        <td class="mono col-blue">+${needed}%</td>
      </tr>`;
  });
}

// ─── INTRADAY TABLE ───
function buildIntraday() {
  const p = P();
  const sl   = parseFloat(document.getElementById('id-sl').value) || p.sl;
  const dStop = parseFloat(document.getElementById('id-dailyStop').value) || p.dailyStop;
  const rrr  = p.tp / p.sl;
  const tp   = sl * rrr;
  const beWR = 1 / (1 + rrr);

  document.getElementById('id-rrrDisplay').textContent = `1 : ${rrr.toFixed(2)}`;
  document.getElementById('id-tpDisplay').textContent  = `${tp.toFixed(3)}%`;

  const body = document.querySelector('#intradayTable tbody');
  body.innerHTML = '';
  const stopAt = Math.max(1, Math.floor(dStop / sl));
  const maxT = Math.min(p.trades, stopAt + 2, 15);
  for (let n = 1; n <= maxT; n++) {
    const allWin  = (n * tp).toFixed(2);
    const half    = (n % 2 === 0) ? ((n/2 * tp) - (n/2 * sl)).toFixed(2) : '—';
    const allLoss = (n * sl).toFixed(2);
    const hitStop = n >= stopAt;
    const halfVal = half === '—' ? null : parseFloat(half);
    body.innerHTML += `
      <tr${hitStop ? ' style="opacity:0.5"' : ''}>
        <td class="mono col-blue">${n}</td>
        <td class="mono col-green">+${allWin}%</td>
        <td class="mono col-yellow">${half === '—' ? half : ((halfVal >= 0 ? '+' : '') + half + '%')}</td>
        <td class="mono col-red">−${allLoss}%</td>
        <td>${hitStop ? `<span class="badge badge-red">⛔ ${stopAt}º trade</span>` : `<span class="badge badge-muted">${stopAt - n} SL restantes</span>`}</td>
        <td class="mono col-blue">${(beWR * 100).toFixed(1)}%</td>
      </tr>`;
  }
}

// ─── SEQUENCE VIZ ───
function runSequence() {
  const p = P();
  const container = document.getElementById('tradeSeqViz');
  container.innerHTML = '';
  let equity = p.capital;
  let wins = 0, losses = 0, biggestLoss = 0, biggestWin = 0;
  let streak = 0, maxStreak = 0, lstreak = 0, maxLoss = 0;
  let dailyPnl = 0, tradeInDay = 0, dailyStopped = false;
  const dayResults = [];

  for (let i = 0; i < p.seqTrades; i++) {
    if (tradeInDay >= p.trades || dailyStopped) {
      dayResults.push(dailyPnl);
      dailyPnl = 0; tradeInDay = 0; dailyStopped = false;
    }
    const win = Math.random() < p.wr;
    const cell = document.createElement('div');
    cell.className = 'trade-cell';

    if (win) {
      const gain = p.risk * (p.tp / p.sl);
      equity *= (1 + gain/100);
      dailyPnl += gain;
      wins++;
      streak++; lstreak = 0;
      if (streak > maxStreak) maxStreak = streak;
      if (gain > biggestWin) biggestWin = gain;
      cell.classList.add('win');
      cell.textContent = 'W';
      cell.title = `+${gain.toFixed(2)}%`;
    } else {
      equity *= (1 - p.risk/100);
      dailyPnl -= p.risk;
      losses++;
      lstreak++; streak = 0;
      if (lstreak > maxLoss) maxLoss = lstreak;
      if (p.risk > biggestLoss) biggestLoss = p.risk;
      // check daily stop
      if (Math.abs(dailyPnl) >= p.dailyStop) {
        cell.classList.add('daily-stop');
        cell.textContent = '⛔';
        cell.title = `Stop diário atingido (${dailyPnl.toFixed(2)}%)`;
        dailyStopped = true;
      } else {
        cell.classList.add('loss');
        cell.textContent = 'L';
        cell.title = `-${p.risk.toFixed(2)}%`;
      }
    }
    tradeInDay++;
    container.appendChild(cell);
  }

  const totalReturn = ((equity - p.capital) / p.capital * 100);
  const stats = document.getElementById('seqStats');
  stats.innerHTML = `
    <div class="stat-card"><div class="lbl">Wins</div><div class="val col-green">${wins}</div><div class="sub">${(wins/(wins+losses)*100).toFixed(0)}% acerto</div></div>
    <div class="stat-card"><div class="lbl">Losses</div><div class="val col-red">${losses}</div><div class="sub">max ${maxLoss} consec.</div></div>
    <div class="stat-card"><div class="lbl">Retorno</div><div class="val ${totalReturn >= 0 ? 'col-green' : 'col-red'}">${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%</div><div class="sub">$${equity.toFixed(0)}</div></div>
    <div class="stat-card"><div class="lbl">Max Streak+</div><div class="val col-blue">${maxStreak}</div><div class="sub">trades seguidos</div></div>
  `;
}

// ─── CYCLE CANVAS ───
function buildCycles() {
  const p = P();
  const canvas = document.getElementById('cycleCanvas');
  const W = canvas.offsetWidth || 500;
  const H = 180;
  canvas.width = W * (window.devicePixelRatio||1);
  canvas.height = H * (window.devicePixelRatio||1);
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio||1, window.devicePixelRatio||1);

  // Total de ciclos baseado nos dias e trades configurados
  const totalCycles = Math.max(2, Math.min(40, Math.floor(p.days * p.trades / p.tradesPerCycle)));
  const numPaths = 20;
  const allSeries = [];
  const finalVals = [];

  for (let path = 0; path < numPaths; path++) {
    let eq = p.capital;
    const series = [eq]; // series[0] = capital inicial, series[c] = capital ao fim do ciclo c
    for (let c = 0; c < totalCycles; c++) {
      for (let t = 0; t < p.tradesPerCycle; t++) {
        const win = Math.random() < p.wr;
        eq = win ? eq * (1 + p.risk*(p.tp/p.sl)/100) : eq * (1 - p.risk/100);
      }
      series.push(eq);
    }
    allSeries.push(series);
    finalVals.push(eq);
  }

  const allVals = allSeries.flat();
  const minV = Math.min(...allVals) * 0.97;
  const maxV = Math.max(...allVals) * 1.03;
  const pad = { l: 55, r: 10, t: 10, b: 25 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  function toX(c) { return pad.l + (c / totalCycles) * cW; }
  function toY(v) { return pad.t + (1 - (v - minV)/(maxV - minV)) * cH; }

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = '#1e2533'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i/4)*cH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l+cW, y); ctx.stroke();
    const v = minV + ((4-i)/4)*(maxV-minV);
    ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'right';
    ctx.fillText('$'+v.toFixed(0), pad.l-4, y+3);
  }

  // baseline
  const baseY = toY(p.capital);
  ctx.strokeStyle = '#253447'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(pad.l, baseY); ctx.lineTo(pad.l+cW, baseY); ctx.stroke();
  ctx.setLineDash([]);

  // paths
  allSeries.forEach(s => {
    const final = s[s.length-1];
    const col = final > p.capital ? 'rgba(63,185,80,0.35)' : 'rgba(248,81,73,0.35)';
    ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    ctx.beginPath();
    s.forEach((v, c) => c === 0 ? ctx.moveTo(toX(c), toY(v)) : ctx.lineTo(toX(c), toY(v)));
    ctx.stroke();
  });

  // x axis labels (ciclos)
  ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
  const labelPoints = [0, Math.round(totalCycles/2), totalCycles];
  labelPoints.forEach(c => ctx.fillText('C'+c, toX(c), H-8));

  const winsN = finalVals.filter(v => v >= p.capital).length;
  const avgFinal = finalVals.reduce((a,b) => a+b, 0) / finalVals.length;
  document.getElementById('cycleStats').innerHTML = `
    <div class="stat-card"><div class="lbl">Paths Positivos</div><div class="val col-green">${winsN}/${numPaths}</div><div class="sub">${(winsN/numPaths*100).toFixed(0)}%</div></div>
    <div class="stat-card"><div class="lbl">Média Final</div><div class="val ${avgFinal >= p.capital ? 'col-green':'col-red'}">$${avgFinal.toFixed(0)}</div><div class="sub">${((avgFinal/p.capital-1)*100).toFixed(1)}%</div></div>
    <div class="stat-card"><div class="lbl">Melhor/Pior</div><div class="val col-blue">${((Math.max(...finalVals)/p.capital-1)*100).toFixed(1)}%</div><div class="sub">/ ${((Math.min(...finalVals)/p.capital-1)*100).toFixed(1)}%</div></div>
  `;
}

// ─── MONTE CARLO EQUITY ───
function buildMC() {
  const p = P();
  const canvas = document.getElementById('mcCanvas');
  const W = canvas.offsetWidth || 800;
  const H = 240;
  canvas.width = W * (window.devicePixelRatio||1);
  canvas.height = H * (window.devicePixelRatio||1);
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio||1, window.devicePixelRatio||1);

  const numCycles = Math.min(p.cycles, 500);
  const days = p.days;
  const allSeries = [];
  const finalVals = [];

  for (let c = 0; c < numCycles; c++) {
    let eq = p.capital;
    const series = [eq];
    for (let d = 0; d < days; d++) {
      let dayPnl = 0;
      for (let t = 0; t < p.trades; t++) {
        if (dayPnl <= -p.dailyStop) break;
        if (dayPnl >= p.dailyTarget) break;
        const win = Math.random() < p.wr;
        if (win) dayPnl += p.risk * (p.tp / p.sl);
        else dayPnl -= p.risk;
      }
      eq *= (1 + Math.max(-p.dailyStop, Math.min(p.dailyTarget, dayPnl))/100);
      series.push(eq);
    }
    allSeries.push(series);
    finalVals.push(series[series.length-1]);
  }

  finalVals.sort((a,b) => a-b);
  const p10 = finalVals[Math.floor(numCycles * 0.10)];
  const p25 = finalVals[Math.floor(numCycles * 0.25)];
  const p50 = finalVals[Math.floor(numCycles * 0.50)];
  const p75 = finalVals[Math.floor(numCycles * 0.75)];
  const p90 = finalVals[Math.floor(numCycles * 0.90)];
  const avgFinal = finalVals.reduce((a,b) => a+b, 0) / numCycles;
  const winPct = finalVals.filter(v => v >= p.capital).length / numCycles;

  const allVals = allSeries.flat();
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.05;
  const pad = { l: 70, r: 20, t: 15, b: 30 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  function toX(d) { return pad.l + (d/days)*cW; }
  function toY(v) { return pad.t + (1-(v-minV)/(maxV-minV))*cH; }

  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = '#131920'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + (i/5)*cH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l+cW, y); ctx.stroke();
    const v = minV + ((5-i)/5)*(maxV-minV);
    ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'right';
    ctx.fillText('$'+v.toFixed(0), pad.l-6, y+3);
  }
  for (let i = 0; i <= 6; i++) {
    const x = pad.l + (i/6)*cW;
    ctx.strokeStyle = '#131920';
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t+cH); ctx.stroke();
    ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
    ctx.fillText('D'+Math.round((i/6)*days), x, H-8);
  }

  // all paths (faded)
  allSeries.forEach(s => {
    const final = s[s.length-1];
    ctx.strokeStyle = final > p.capital ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    s.forEach((v, d) => d === 0 ? ctx.moveTo(toX(d), toY(v)) : ctx.lineTo(toX(d), toY(v)));
    ctx.stroke();
  });

  // Percentile bands
  function getPercentileSeries(pct) {
    return Array.from({length: days+1}, (_, d) => {
      const vals = allSeries.map(s => s[d]).sort((a,b) => a-b);
      return vals[Math.floor(pct * vals.length)];
    });
  }
  const s10 = getPercentileSeries(0.1);
  const s25 = getPercentileSeries(0.25);
  const s50 = getPercentileSeries(0.5);
  const s75 = getPercentileSeries(0.75);
  const s90 = getPercentileSeries(0.9);

  // Band fill 10-90
  ctx.fillStyle = 'rgba(99,169,255,0.05)';
  ctx.beginPath();
  s10.forEach((v, d) => d === 0 ? ctx.moveTo(toX(d), toY(v)) : ctx.lineTo(toX(d), toY(v)));
  for (let d = days; d >= 0; d--) ctx.lineTo(toX(d), toY(s90[d]));
  ctx.closePath(); ctx.fill();

  // Band fill 25-75
  ctx.fillStyle = 'rgba(99,169,255,0.10)';
  ctx.beginPath();
  s25.forEach((v, d) => d === 0 ? ctx.moveTo(toX(d), toY(v)) : ctx.lineTo(toX(d), toY(v)));
  for (let d = days; d >= 0; d--) ctx.lineTo(toX(d), toY(s75[d]));
  ctx.closePath(); ctx.fill();

  // Percentile lines
  [[s10,'#f85149',1,'P10'],[s25,'#f0883e',1,'P25'],[s50,'#63a9ff',2,'P50'],[s75,'#3fb950',1,'P75'],[s90,'#3fb950',1,'P90']].forEach(([s,col,lw,lbl]) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(lw === 2 ? [] : [3,3]);
    ctx.beginPath();
    s.forEach((v, d) => d === 0 ? ctx.moveTo(toX(d), toY(v)) : ctx.lineTo(toX(d), toY(v)));
    ctx.stroke();
    ctx.setLineDash([]);
    // end label
    const last = s[s.length-1];
    ctx.fillStyle = col; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'left';
    ctx.fillText(lbl, toX(days)+3, toY(last)+3);
  });

  // Baseline
  const baseY = toY(p.capital);
  ctx.strokeStyle = '#253447'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(pad.l, baseY); ctx.lineTo(pad.l+cW, baseY); ctx.stroke();
  ctx.setLineDash([]);

  document.getElementById('mcInfo').textContent = `${numCycles} ciclos · ${days} dias`;

  document.getElementById('mcLegend').innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:#f85149;border-top:2px dashed #f85149"></div>P10 pior 10%</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f0883e;border-top:2px dashed #f0883e"></div>P25</div>
    <div class="legend-item"><div class="legend-dot" style="background:#63a9ff;height:3px"></div>Mediana (P50)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#3fb950;border-top:2px dashed #3fb950"></div>P75 / P90</div>
    <div class="legend-item"><div class="legend-dot" style="background:rgba(63,185,80,0.4)"></div>Verde = lucro · Vermelho = prejuízo</div>
  `;

  document.getElementById('mcStats').innerHTML = `
    <div class="stat-card">
      <div class="lbl">% Ciclos Positivos</div>
      <div class="val ${winPct >= 0.5 ? 'col-green':'col-red'}">${(winPct*100).toFixed(0)}%</div>
      <div class="sub">${Math.round(winPct*numCycles)} de ${numCycles} ciclos</div>
      <div class="prog-bar" style="margin-top:6px"><div class="prog-fill" style="width:${winPct*100}%;background:${winPct>=0.5?'var(--green)':'var(--red)'}"></div></div>
    </div>
    <div class="stat-card">
      <div class="lbl">Mediana Final</div>
      <div class="val ${p50 >= p.capital ? 'col-green':'col-red'}">$${p50.toFixed(0)}</div>
      <div class="sub">${((p50/p.capital-1)*100).toFixed(1)}% vs inicial</div>
    </div>
    <div class="stat-card">
      <div class="lbl">Pior 10% (P10)</div>
      <div class="val col-red">$${p10.toFixed(0)}</div>
      <div class="sub">${((p10/p.capital-1)*100).toFixed(1)}%</div>
    </div>
    <div class="stat-card">
      <div class="lbl">Melhor 10% (P90)</div>
      <div class="val col-green">$${p90.toFixed(0)}</div>
      <div class="sub">+${((p90/p.capital-1)*100).toFixed(1)}%</div>
    </div>
  `;

  buildDistribution(finalVals);
}

// ─── DISTRIBUTION ───
function buildDistribution(finalVals) {
  const p = P();
  const canvas = document.getElementById('distCanvas');
  const W = canvas.offsetWidth || 800;
  const H = 180;
  canvas.width = W * (window.devicePixelRatio||1);
  canvas.height = H * (window.devicePixelRatio||1);
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio||1, window.devicePixelRatio||1);

  const returns = finalVals.map(v => ((v/p.capital)-1)*100);
  const minR = Math.min(...returns);
  const maxR = Math.max(...returns);
  const bins = 40;
  const binW = (maxR - minR) / bins;
  const counts = Array(bins).fill(0);
  returns.forEach(r => {
    const bi = Math.min(bins-1, Math.floor((r - minR)/binW));
    counts[bi]++;
  });
  const maxCount = Math.max(...counts);

  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, W, H);

  const pad = { l: 45, r: 15, t: 10, b: 28 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const bw = cW / bins;

  counts.forEach((c, i) => {
    const x = pad.l + i * bw;
    const bh = (c / maxCount) * cH;
    const y = pad.t + cH - bh;
    const binStart = minR + i * binW;
    const isPositive = binStart >= 0;
    ctx.fillStyle = isPositive ? 'rgba(63,185,80,0.7)' : 'rgba(248,81,73,0.7)';
    ctx.fillRect(x + 1, y, bw - 2, bh);
  });

  // Zero line
  const zeroX = pad.l + ((-minR) / (maxR - minR)) * cW;
  ctx.strokeStyle = '#253447'; ctx.lineWidth = 1.5; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(zeroX, pad.t); ctx.lineTo(zeroX, pad.t+cH); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
  ctx.fillText('0%', zeroX, H-8);

  // x axis labels
  [minR, 0, maxR].forEach(v => {
    const x = pad.l + ((v - minR)/(maxR - minR))*cW;
    ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
    if (Math.abs(v) > 0.1) ctx.fillText(v.toFixed(1)+'%', x, H-8);
  });

  // y axis
  ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'right';
  ctx.fillText('freq', pad.l-4, pad.t+12);

  const posCount = returns.filter(r => r >= 0).length;
  const negCount = returns.length - posCount;
  const avg = returns.reduce((a,b) => a+b, 0) / returns.length;
  const median = returns.sort((a,b) => a-b)[Math.floor(returns.length/2)];
  const p5 = returns[Math.floor(returns.length*0.05)];
  const p95 = returns[Math.floor(returns.length*0.95)];

  document.getElementById('distStats').innerHTML = `
    <div class="stat-card"><div class="lbl">Positivos</div><div class="val col-green">${posCount}</div><div class="sub">${(posCount/returns.length*100).toFixed(0)}%</div></div>
    <div class="stat-card"><div class="lbl">Negativos</div><div class="val col-red">${negCount}</div><div class="sub">${(negCount/returns.length*100).toFixed(0)}%</div></div>
    <div class="stat-card"><div class="lbl">Média</div><div class="val ${avg>=0?'col-green':'col-red'}">${avg>=0?'+':''}${avg.toFixed(1)}%</div><div class="sub">retorno médio</div></div>
    <div class="stat-card"><div class="lbl">P5 (cauda)</div><div class="val col-red">${p5.toFixed(1)}%</div><div class="sub">pior 5%</div></div>
    <div class="stat-card"><div class="lbl">P95 (cauda)</div><div class="val col-green">+${p95.toFixed(1)}%</div><div class="sub">melhor 5%</div></div>
  `;
}

// ─── SWITCH TAB ───
function tsTab(btn, contentId) {
  const panel = btn.closest('.ts-panel');
  panel.querySelectorAll('.ts-tab-btn').forEach(b => b.classList.remove('active'));
  panel.querySelectorAll('.ts-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(contentId).classList.add('active');
  if (contentId === 'seqFixed') buildCycles();
  else if (contentId === 'seqRandom') runSequence();
}

// ─── RUN ALL ───
function tsRunAll() {
  const p = P();
  document.getElementById('id-sl').value = p.sl;
  document.getElementById('id-dailyStop').value = p.dailyStop;
  recalcMetrics();
  buildScenarios();
  buildRecovery();
  buildIntraday();
  runSequence();
  buildCycles();
  buildMC();
}

// Init
shAddLoad( () => {
  setTimeout(tsRunAll, 100);
});
window.addEventListener('resize', () => {
  buildMC();
  buildCycles();
});



// ── CONFIG ───────────────────────────────────────────────────────────────────
const BLOCOS=[
  {id:1,nome:'Bloco 1 — Ultra-Baixo',   desc:'Conta pequena',         badge:'bb1',cor:'#63a9ff',taxas:[.0025,.005,.01,.02,.03,.0425]},
  {id:2,nome:'Bloco 2 — Baixo-Moderado',desc:'Faixa profissional',    badge:'bb2',cor:'#3fb950',taxas:[.025,.03,.04,.05,.07,.10]},
  {id:3,nome:'Bloco 3 — Elevado',       desc:'Alto crescimento/risco',badge:'bb3',cor:'#e3b341',taxas:[.05,.07,.10,.12,.15,.20]},
  {id:4,nome:'Bloco 4 — Extremo',       desc:'Ruína quase certa',     badge:'bb4',cor:'#f85149',taxas:[.25,.30,.35,.40,.45,.50]},
];

const LOG=[];
let logOpen=true;
const ACC={};
for(const b of BLOCOS) ACC[b.id]={pos:new Array(6).fill(0),neg:new Array(6).fill(0),dan:new Array(6).fill(0),zer:new Array(6).fill(0),total:0};

// ── HELPERS ──────────────────────────────────────────────────────────────────
function gerarSeq(wr,n){const s=[];for(let i=0;i<n;i++)s.push(Math.random()<wr?1:-1);return s;}

// ── CÁLCULO DE UMA COLUNA ──────────────────────────────────────────────────
// taxa  = % do saldo arriscado por trade (ex: 0.01 = 1%)
// rrr   = Risk:Reward (ex: 1.5 = ganho 1.5x o risco)
// Ganho: saldo_atual × taxa × rrr         (compounding sobre saldo atual)
// Perda: saldo_atual × taxa × (-1)        (compounding sobre saldo atual)
// perigoLim = saldo mínimo antes de entrar em Zona de Perigo
function calcCol(cap,rrr,taxa,seq,perigoLim){
  const r=[];let s=cap,dead=false;
  for(const res of seq){
    if(dead){r.push({s:0,dead:true,danger:false,res});continue;}
    const g=res===1 ? s*taxa*rrr : -(s*taxa);   // +ganho ou -perda
    s=Math.max(0,s+g);
    if(s<=0){s=0;dead=true;}
    r.push({s,dead,danger:!dead&&s>0&&s<perigoLim,res});
  }
  return r;
}

const fmtC=v=>{
  if(v<=0) return '$0';
  if(v>=1000) return '$'+(v/1000).toFixed(2)+'k';
  if(v<1)    return '$'+v.toFixed(4);  // valores muito baixos (zona extrema)
  return '$'+v.toFixed(2);
};
const fmtP=v=>(v*100).toFixed(v<.01?2:0)+'%';
const h2r=(hex,a)=>{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;};
function getPerigoLim(){
  const cap=parseFloat(document.getElementById('fm-capital').value)||1000;
  const pp=parseFloat(document.getElementById('perigoPct').value)||20;
  return cap*(pp/100);
}

// ── TABELA RECUPERAÇÃO ───────────────────────────────────────────────────────
function atualizarTabelaRec(){
  const pp=parseFloat(document.getElementById('perigoPct').value)||20;
  const cap=parseFloat(document.getElementById('fm-capital').value)||1000;
  const rrr=parseFloat(document.getElementById('rrr').value)||1;
  const wr=parseFloat(document.getElementById('winRate').value)/100;
  const lr=1-wr;
  const expR=wr*rrr-lr;          // expectativa em R por trade
  const riskRef=0.01;            // 1% de risco por trade para calcular trades

  const perdas=[10,20,30,pp,40,50,60,70,80,90].filter((v,i,a)=>a.indexOf(v)===i&&v>0&&v<100).sort((a,b)=>a-b);
  let h='<thead><tr><th>Perda</th><th>Saldo</th><th>Rec. p/ BE</th><th>Trades~</th></tr></thead><tbody>';
  for(const p of perdas){
    const saldo=cap*(1-p/100);
    const recPct=p>=100?Infinity:((cap-saldo)/saldo*100);
    let tradesNeeded='—';
    if(expR>0){
      // n trades a 1% risco com compounding para saldo→cap
      const gain=riskRef*rrr,loss=riskRef;
      const expPerTrade=wr*gain-lr*loss;
      if(expPerTrade>0){
        const n=Math.ceil(Math.log(cap/saldo)/Math.log(1+expPerTrade));
        tradesNeeded=n>9999?'>9999':n.toString();
      }
    }
    const isPerigo=p>=pp;
    const isWarn=!isPerigo&&p>=pp*0.7;
    const cls=isPerigo?'rt-ruin':isWarn?'rt-warn':'rt-ok';
    // triângulo inline à direita do texto de perda, apenas nas linhas de perigo
    const icon=isPerigo?` <span class="rt-icon">⚠</span>`:'';
    h+=`<tr class="${cls}"><td>${p}%${icon}</td><td>${fmtC(saldo)}</td><td>${recPct.toFixed(1)}%</td><td>${tradesNeeded}</td></tr>`;
  }
  h+='</tbody>';
  document.getElementById('recovTable').innerHTML=h;
}

// ── CHART EQUITY ─────────────────────────────────────────────────────────────
function drawEquityChart(id,cols,cor,cap,perigoLim){
  const cv=document.getElementById(id);if(!cv)return;
  const ctx=cv.getContext('2d');
  const W=cv.offsetWidth||320,H=80;
  cv.width=W;cv.height=H;ctx.clearRect(0,0,W,H);
  let all=[];for(const c of cols)all=all.concat(c.map(d=>d.s));
  const mn=Math.min(...all,cap*.05),mx=Math.max(...all,cap*1.05);
  const rng=mx-mn||1,n=cols[0].length;
  const pL=4,pR=4,pT=8,pB=4,w=W-pL-pR,h=H-pT-pB;
  const px=i=>pL+(n>1?(i/(n-1))*w:w/2);
  const py=v=>pT+h-((v-mn)/rng)*h;
  ctx.save();ctx.setLineDash([3,4]);
  // linha capital
  ctx.strokeStyle='rgba(107,125,143,.3)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pL,py(cap));ctx.lineTo(W-pR,py(cap));ctx.stroke();
  // linha zona de perigo
  if(perigoLim>0&&perigoLim<cap){
    ctx.strokeStyle='rgba(248,81,73,.5)';
    ctx.beginPath();ctx.moveTo(pL,py(perigoLim));ctx.lineTo(W-pR,py(perigoLim));ctx.stroke();
  }
  ctx.restore();
  cols.forEach((serie,si)=>{
    const alpha=.15+(si/cols.length)*.75;
    ctx.beginPath();ctx.moveTo(px(0),py(serie[0].s));
    for(let i=1;i<serie.length;i++)ctx.lineTo(px(i),py(serie[i].s));
    ctx.strokeStyle=h2r(cor,alpha);ctx.lineWidth=si===cols.length-1?1.8:1;ctx.stroke();
  });
}

// ── CHART ANALYTICS ──────────────────────────────────────────────────────────
function drawAnalyticsChart(id,serPos,serNeg,serDan,serZer){
  const cv=document.getElementById(id);if(!cv)return;
  const ctx=cv.getContext('2d');
  const W=cv.offsetWidth||200,H=100;
  cv.width=W;cv.height=H;ctx.clearRect(0,0,W,H);
  const n=serPos.length;if(!n)return;
  const tot6=BLOCOS[0].taxas.length;
  const pL=2,pR=2,pT=6,pB=2,w=W-pL-pR,h=H-pT-pB;
  const bw=Math.max(1,Math.floor(w/n)-1);
  for(let i=0;i<n;i++){
    const x=pL+i*(w/n);
    const sP=serPos[i]/tot6,sN=serNeg[i]/tot6,sD=serDan[i]/tot6,sZ=serZer[i]/tot6;
    let y=pT+h;
    const draw=(frac,col)=>{const bh=frac*h;ctx.fillStyle=col;ctx.fillRect(x,y-bh,bw,bh);y-=bh;};
    draw(sP,h2r('#3fb950',.8));draw(sN,h2r('#e3b341',.75));draw(sD,h2r('#f85149',.85));draw(sZ,h2r('#f85149',.85));
  }
  // linha tendência de perigo+zero
  if(n>2){
    const vals=serDan.map((v,i)=>v+serZer[i]);
    ctx.save();ctx.setLineDash([2,3]);ctx.strokeStyle='rgba(248,81,73,.55)';ctx.lineWidth=1;
    ctx.beginPath();
    for(let i=0;i<n;i++){
      const x=pL+i*(w/n)+bw/2;
      const y=pT+h-(vals[i]/tot6)*h;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();ctx.restore();
  }
}

// ── RENDER BLOCO ─────────────────────────────────────────────────────────────
function renderBloco(bloco,seq,cap,rrr,perigoLim){
  const N=seq.length;
  const cols=bloco.taxas.map(t=>calcCol(cap,rrr,t,seq,perigoLim));
  const fins=cols.map(c=>c[N-1]);
  const zeros  =fins.filter(f=>f.dead||f.s<=0).length;
  const dangers=fins.filter(f=>!f.dead&&f.s>0&&f.s<perigoLim).length;
  const negs   =fins.filter(f=>!f.dead&&f.s>=perigoLim&&f.s<cap).length;
  const pos    =fins.filter(f=>f.s>=cap).length;

  // acumular histórico
  cols.forEach((col,ci)=>{
    const fin=col[N-1];
    if(fin.dead||fin.s<=0)          ACC[bloco.id].zer[ci]++;
    else if(fin.s<perigoLim)         ACC[bloco.id].dan[ci]++;
    else if(fin.s<cap)               ACC[bloco.id].neg[ci]++;
    else                             ACC[bloco.id].pos[ci]++;
  });
  ACC[bloco.id].total++;

  // chips simulação atual — sem Zeradas
  const mkChip=(cls,label,val,color)=>
    `<div class="chip ${cls}"><span class="cl">${label}</span><span class="cv" style="color:${color}">${val}/${cols.length}</span></div>`;
  const chipD  =dangers>0?mkChip('chip-r','Perigo',dangers,'var(--red)'):mkChip('chip-p','Perigo',0,'var(--green)');
  const chipN  =negs   >0?mkChip('chip-n','Negativas',negs,'var(--yellow)'):mkChip('chip-p','Negativas',0,'var(--green)');
  const chipPos=mkChip('chip-p','Positivas',pos,'var(--green)');

  // chips histórico
  const a=ACC[bloco.id],tot=a.total;
  const avgP =(a.pos.reduce((s,v)=>s+v,0)/cols.length/tot*100).toFixed(0);
  const avgN =(a.neg.reduce((s,v)=>s+v,0)/cols.length/tot*100).toFixed(0);
  const avgD =(a.dan.reduce((s,v)=>s+v,0)/cols.length/tot*100).toFixed(0);
  const avgZ =(a.zer.reduce((s,v)=>s+v,0)/cols.length/tot*100).toFixed(0);
  const hchips=tot>1?`<div class="hchips">
    <div class="hchip-label">Histórico acumulado (${tot} sims)</div>
    <div class="chip chip-p" style="flex:1"><span class="cl">✓ Pos</span><span class="cv cg">${avgP}%</span></div>
    <div class="chip chip-n" style="flex:1"><span class="cl">~ Neg</span><span class="cv cy">${avgN}%</span></div>
    <div class="chip chip-r" style="flex:1"><span class="cl">Perigo</span><span class="cv cr">${avgD}%</span></div>
  </div>`:'';

  // tabela
  const ths=bloco.taxas.map(t=>`<th>${fmtP(t)}</th>`).join('');
  let rows='';
  for(let i=0;i<N;i++){
    const sym=seq[i]===1?'▲':'▼',wl=seq[i]===1?'w':'l';
    const tds=cols.map(col=>{
      const{s,dead,danger}=col[i];
      let cls;
      if(dead||s<=0) cls='cz';
      else if(danger) cls='cd';
      else if(s>=cap) cls='ca';
      else            cls='cn';
      return`<td class="${cls}">${dead?'🔴':fmtC(s)}</td>`;
    }).join('');
    rows+=`<tr><td class="tdn">${i+1}</td><td class="tdr ${wl}">${sym}</td>${tds}</tr>`;
  }
  const finTds=cols.map(col=>{
    const v=col[N-1].s,diff=v-cap,pctStr=((diff/cap)*100).toFixed(1);
    // cor do texto na linha Final: verde=acima capital, amarelo=abaixo mas vivo, vermelho=perigo ou zerado
    const color=v<=0?'var(--red)':v<perigoLim?'var(--red)':v>=cap?'var(--green)':'var(--yellow)';
    const badge=v>0&&v<perigoLim?'<span class="rd">PERIGO</span>':'';
    return`<td style="color:${color}">${fmtC(v)}<br><span style="font-size:8px;opacity:.7">${diff>=0?'+':''}${pctStr}%</span>${badge}</td>`;
  }).join('');

  const cid=`chart-b${bloco.id}`;
  return{
    html:`<div class="panel">
      <div class="phdr">
        <div class="ptitle"><span style="color:${bloco.cor}">■</span> ${bloco.nome}</div>
        <span class="pbadge ${bloco.badge}">${bloco.desc}</span>
      </div>
      <div class="pbody">
        <div class="schips">${chipD}${chipN}${chipPos}</div>
        ${hchips}
        <div class="cw">
          <div class="clabel">
            <span>Curva de Capital — ${N} trades</span>
            <div class="clabel-hint">
              <span><span class="cleg" style="background:rgba(107,125,143,.5);border-top:1px dashed rgba(107,125,143,.5)"></span> capital</span>
              <span><span class="cleg" style="background:rgba(248,81,73,.7)"></span> perigo</span>
            </div>
          </div>
          <canvas class="mc" id="${cid}" height="80"></canvas>
        </div>
        <div class="twrap">
          <table class="bt">
            <thead><tr><th class="thn">#</th><th class="thr">Res</th>${ths}</tr></thead>
            <tbody>${rows}<tr class="rf"><td colspan="2" class="rl">Final</td>${finTds}</tr></tbody>
          </table>
        </div>
      </div>
    </div>`,
    cols,stats:{zeros,dangers,negs,pos}
  };
}

// ── ANALYTICS ────────────────────────────────────────────────────────────────
function renderAnalytics(){
  const n=LOG.length;
  if(n<2){
    document.getElementById('analyticsEmpty').style.display='';
    document.getElementById('analyticsPanel').style.display='none';
    return;
  }
  document.getElementById('analyticsEmpty').style.display='none';
  document.getElementById('analyticsPanel').style.display='';

  let totP=0,totN=0,totD=0,totZ=0;
  for(const b of BLOCOS){
    const a=ACC[b.id];
    totP+=a.pos.reduce((s,v)=>s+v,0);totN+=a.neg.reduce((s,v)=>s+v,0);
    totD+=a.dan.reduce((s,v)=>s+v,0);totZ+=a.zer.reduce((s,v)=>s+v,0);
  }
  const tot=totP+totN+totD+totZ||1;

  // Total Sims junto com os outros cards
  document.getElementById('analyticsTotals').innerHTML=`
    <div class="metric mg" style="margin:0"><div class="mlabel">✓ Positivas</div><div class="mval cg">${(totP/tot*100).toFixed(1)}%</div><div class="msub">${totP} de ${tot} cols</div></div>
    <div class="metric my" style="margin:0"><div class="mlabel">~ Negativas</div><div class="mval cy">${(totN/tot*100).toFixed(1)}%</div><div class="msub">${totN} de ${tot}</div></div>
    <div class="metric mr" style="margin:0"><div class="mlabel">Zona de Perigo</div><div class="mval cr">${(totD/tot*100).toFixed(1)}%</div><div class="msub">${totD} de ${tot}</div></div>
    <div class="metric mp" style="margin:0"><div class="mlabel">Total Sims</div><div class="mval cp">${n}</div><div class="msub">simulações rodadas</div></div>`;

  // Painéis por bloco
  const grid=document.getElementById('analyticsGrid');
  grid.innerHTML='';
  for(const b of BLOCOS){
    const a=ACC[b.id];const nt=a.total;
    const serPos=[],serNeg=[],serDan=[],serZer=[];
    for(let i=LOG.length-1;i>=0;i--){
      const s=LOG[i].statsBlocos[b.id-1];
      serPos.push(s.pos);serNeg.push(s.negs);serDan.push(s.dangers);serZer.push(s.zeros);
    }
    const c6=b.taxas.length;
    const aP=(a.pos.reduce((s,v)=>s+v,0)/c6/nt*100).toFixed(1);
    const aN=(a.neg.reduce((s,v)=>s+v,0)/c6/nt*100).toFixed(1);
    const aD=(a.dan.reduce((s,v)=>s+v,0)/c6/nt*100).toFixed(1);
    const aZ=(a.zer.reduce((s,v)=>s+v,0)/c6/nt*100).toFixed(1);
    const cid=`achart-b${b.id}`;
    grid.innerHTML+=`
    <div class="a-panel">
      <div class="a-phdr">
        <div class="a-ptitle"><span style="color:${b.cor}">■</span>${b.nome}</div>
      </div>
      <div class="a-pbody">
        <canvas class="ac" id="${cid}" height="100"></canvas>
        <div class="stackbar">
          <div class="sb-pos" style="width:${aP}%"></div>
          <div class="sb-neg" style="width:${aN}%"></div>
          <div class="sb-dan" style="width:${aD}%"></div>
        </div>
        <div class="stackbar-legend">
          <span><span class="sl-dot" style="background:var(--green)"></span>Pos ${aP}%</span>
          <span><span class="sl-dot" style="background:var(--yellow)"></span>Neg ${aN}%</span>
          <span><span class="sl-dot" style="background:var(--red)"></span>Perigo ${aD}%</span>
        </div>
        <div class="a-stats">
          <div class="a-stat"><div class="asl">Menor risco</div><div class="asv cb">${fmtP(b.taxas[0])}</div></div>
          <div class="a-stat"><div class="asl">Perigo médio</div><div class="asv cr">${aD}%</div></div>
          <div class="a-stat"><div class="asl">Maior risco</div><div class="asv cy">${fmtP(b.taxas[b.taxas.length-1])}</div></div>
        </div>
      </div>
    </div>`;
    requestAnimationFrame(()=>drawAnalyticsChart(cid,serPos,serNeg,serDan,serZer));
  }
}

// ── SIMULAR ───────────────────────────────────────────────────────────────────
function fmSimular(){
  const cap=parseFloat(document.getElementById('fm-capital').value)||1000;
  const N=parseInt(document.getElementById('nTrades').value)||20;
  const rrr=parseFloat(document.getElementById('rrr').value)||1;
  const wr=parseFloat(document.getElementById('winRate').value)/100;
  const lr=parseFloat(document.getElementById('lossRate').value)/100;
  const pp=parseFloat(document.getElementById('perigoPct').value)||20;
  const perigoLim=cap*(pp/100);

  if(Math.abs((wr+lr)-1)>.005){document.getElementById('warnBox').classList.add('show');return;}
  document.getElementById('warnBox').classList.remove('show');

  // atualizar métricas
  document.getElementById('m-cap').textContent=cap>=1000?'$'+(cap/1000).toFixed(1)+'k':'$'+cap;
  document.getElementById('m-wr').textContent=(wr*100).toFixed(0)+'%';
  document.getElementById('m-wr-sub').textContent='RRR 1:'+rrr.toFixed(2);
  document.getElementById('m-trades').textContent=N;
  document.getElementById('m-perigo').textContent=pp+'%';
  document.getElementById('m-perigo-sub').textContent='saldo < '+fmtC(perigoLim);
  document.getElementById('m-sims').textContent=LOG.length+1;
  atualizarTopbar();atualizarTabelaRec();

  const seq=gerarSeq(wr,N);
  const grid=document.getElementById('blocosGrid');
  grid.innerHTML='';
  const all=[];
  for(const b of BLOCOS){
    const{html,cols,stats}=renderBloco(b,seq,cap,rrr,perigoLim);
    grid.innerHTML+=html;
    all.push({bloco:b,cols,stats});
  }
  requestAnimationFrame(()=>{
    for(const{bloco,cols}of all) drawEquityChart(`chart-b${bloco.id}`,cols,bloco.cor,cap,perigoLim);
  });

  // LOG
  const hora=new Date().toLocaleTimeString('pt-BR',{hour12:false});
  const statsBlocos=all.map(d=>d.stats);
  const blocoRes=all.map(({bloco,stats})=>{
    const hasPerigo=stats.zeros>0||stats.dangers>0;
    const allPos=stats.pos===bloco.taxas.length;
    const tag=stats.zeros>0?'ltn':stats.dangers>0?'lto':allPos?'ltp':'ltm';
    return`<span class="ltag ${tag}">B${bloco.id}: ${stats.pos}✓ ${stats.negs}~ ${stats.dangers}⬛ ${stats.zeros}🔴</span>`;
  }).join(' ');
  const totRisco=all.reduce((a,d)=>a+d.stats.zeros+d.stats.dangers,0);
  const totC=all.reduce((a,d)=>a+d.bloco.taxas.length,0);
  const st=totRisco===0?`<span class="ltag ltp">sem riscos</span>`:totRisco>=totC/2?`<span class="ltag ltn">${totRisco} riscos</span>`:`<span class="ltag ltm">${totRisco} riscos</span>`;

  LOG.unshift({hora,cap,N,wr,rrr,pp,blocoRes,st,statsBlocos,
    raw:{cap,N,wr:(wr*100).toFixed(0),rrr,pp,blocos:statsBlocos}});
  renderLog();
  renderAnalytics();
  document.getElementById('m-sims').textContent=LOG.length;
}

// ── LOG ───────────────────────────────────────────────────────────────────────
function renderLog(){
  const cnt=LOG.length;
  document.getElementById('logcnt').textContent=`${cnt} registro${cnt!==1?'s':''}`;
  const empty=document.getElementById('logempty'),table=document.getElementById('logtable'),tbody=document.getElementById('logtbody');
  if(!cnt){empty.style.display='block';table.style.display='none';return;}
  empty.style.display='none';table.style.display='table';
  tbody.innerHTML=LOG.map((e,i)=>`<tr>
    <td style="color:var(--dim)">${LOG.length-i}</td>
    <td style="color:var(--muted)">${e.hora}</td>
    <td style="color:var(--blue)">${e.N}</td>
    <td>$${e.cap.toLocaleString('pt-BR')}</td>
    <td style="color:var(--green)">${(e.wr*100).toFixed(0)}%</td>
    <td style="color:var(--yellow)">1:${e.rrr.toFixed(2)}</td>
    <td style="color:var(--orange)">&lt;${e.pp}%</td>
    <td>${e.blocoRes}</td>
    <td>${e.st}</td>
  </tr>`).join('');
}

function toggleLog(){
  logOpen=!logOpen;
  document.getElementById('logscroll').style.display=logOpen?'':'none';
  document.getElementById('logchev').textContent=logOpen?'▼':'▶';
}
function clearLog(){
  LOG.length=0;
  for(const b of BLOCOS) ACC[b.id]={pos:new Array(6).fill(0),neg:new Array(6).fill(0),dan:new Array(6).fill(0),zer:new Array(6).fill(0),total:0};
  document.getElementById('m-sims').textContent=0;
  renderLog();renderAnalytics();
}
function exportLog(){
  if(!LOG.length)return;
  const hdr='#,Hora,Trades,Capital,WR%,RRR,Perigo%,B1_pos,B1_neg,B1_perigo,B1_zero,B2_pos,B2_neg,B2_perigo,B2_zero,B3_pos,B3_neg,B3_perigo,B3_zero,B4_pos,B4_neg,B4_perigo,B4_zero';
  const rows=LOG.map((e,i)=>{
    const b=e.raw.blocos;
    return[LOG.length-i,e.hora,e.N,e.cap,e.raw.wr,e.rrr,e.pp,
      b[0].pos,b[0].negs,b[0].dangers,b[0].zeros,
      b[1].pos,b[1].negs,b[1].dangers,b[1].zeros,
      b[2].pos,b[2].negs,b[2].dangers,b[2].zeros,
      b[3].pos,b[3].negs,b[3].dangers,b[3].zeros,
    ].join(',');
  });
  const csv=[hdr,...rows].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download='ferramentas_mentais_historico.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function syncLoss(){const w=parseFloat(document.getElementById('winRate').value)||0;document.getElementById('lossRate').value=+(100-w).toFixed(1);}
function syncWin(){const l=parseFloat(document.getElementById('lossRate').value)||0;document.getElementById('winRate').value=+(100-l).toFixed(1);}
function setN(v){document.getElementById('nTrades').value=v;atualizarTopbar();}
function setRP(v){document.getElementById('perigoPct').value=v;atualizarTopbar();atualizarTabelaRec();}
function atualizarTopbar(){
  const n=parseInt(document.getElementById('nTrades').value)||20;
  const pp=parseFloat(document.getElementById('perigoPct').value)||20;
  document.getElementById('tinfo').textContent=`${n} trades · 4 blocos · perigo <${pp}%`;
}

shAddLoad(()=>{atualizarTabelaRec();fmSimular();});

// ── TOOLTIP MANAGER (position:fixed no body, escapa qualquer stacking context) ──
(function(){
  const fl=document.createElement('div');
  fl.className='tip-float';
  const tipHost=document.getElementById('studyHubLegacyApp')||document.body;
  const tipMount=tipHost&&typeof tipHost.appendChild==='function'?tipHost:document.body;
  tipMount.appendChild(fl);
  let tid=null;

  function show(el){
    const box=el.querySelector('.tip-box');
    if(!box)return;
    fl.innerHTML=box.innerHTML;
    fl.classList.add('visible');
    fl.style.transition='none';
    fl.style.opacity='1';
    reposition(el);
  }
  function hide(){
    fl.classList.remove('visible');
    fl.style.opacity='0';
  }
  function reposition(el){
    const GAP=8;
    const r=el.getBoundingClientRect();
    const fw=fl.offsetWidth||240;
    const fh=fl.offsetHeight||120;
    let top=r.top-fh-GAP;
    let left=r.left+r.width/2-fw/2;
    // se sai pelo topo, coloca abaixo
    if(top<4){top=r.bottom+GAP;}
    // clamp horizontal
    left=Math.max(4,Math.min(left,window.innerWidth-fw-4));
    fl.style.top=top+'px';
    fl.style.left=left+'px';
  }

  document.addEventListener('mouseover',function(e){
    const tip=e.target.closest('.tip');
    if(tip){clearTimeout(tid);show(tip);}
  });
  document.addEventListener('mouseout',function(e){
    const tip=e.target.closest('.tip');
    if(tip){tid=setTimeout(hide,80);}
  });
  document.addEventListener('focusin',function(e){
    const tip=e.target.closest('.tip');
    if(tip){clearTimeout(tid);show(tip);}
  });
  document.addEventListener('focusout',function(e){
    const tip=e.target.closest('.tip');
    if(tip){tid=setTimeout(hide,80);}
  });
})();



function shCall(fn, name) {
  if (typeof fn !== 'function') return;
  shSafe(() => fn(), name || fn.name || 'legacy fn');
}
function shInitLegacyModule(moduleKey) {
  const cotEl = document.getElementById('hubCot');
  const cot = parseFloat(cotEl && cotEl.value) || 5.80;
  const groups = {
    propfirm: [() => pfSetCot(cot), calcSimulador, calcMulti, calcPropFirm, calcGrandes, calc2Fases, calc1Fase, calcInstant, calcRRR],
    plano: [() => ptSetCot(cot), calcCiclos, calcParciais, calcBR, calcMetas, calcRecov, calcLosses, calcDD, renderPlanilha, runSim, () => ['sp','nq','cl','wd','wi'].forEach(k => calcDT(k)), () => ['sp','nq','cl','wd','wi'].forEach(k => calcDTVol(k)), calcAcoesFull],
    tradesim: [tsRunAll],
    mental: [atualizarTabelaRec, atualizarTopbar],
  };
  (groups[moduleKey] || groups.propfirm).forEach((fn, idx) => shCall(fn, moduleKey + ':' + idx));
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}
window.sh_legacyInit = (moduleKey) => shSafe(() => shInitLegacyModule(moduleKey), 'legacyInit');

window.sh_pfTab = (...args) => shSafe(() => pfTab(...args), 'pfTab');
window.sh_calcSimulador = (...args) => shSafe(() => calcSimulador(...args), 'calcSimulador');
window.sh_calcMulti = (...args) => shSafe(() => calcMulti(...args), 'calcMulti');
window.sh_calcPropFirm = (...args) => shSafe(() => calcPropFirm(...args), 'calcPropFirm');
window.sh_calcGrandes = (...args) => shSafe(() => calcGrandes(...args), 'calcGrandes');
window.sh_calc2Fases = (...args) => shSafe(() => calc2Fases(...args), 'calc2Fases');
window.sh_importFase = (...args) => shSafe(() => importFase(...args), 'importFase');
window.sh_exportFase = (...args) => shSafe(() => exportFase(...args), 'exportFase');
window.sh_calc1Fase = (...args) => shSafe(() => calc1Fase(...args), 'calc1Fase');
window.sh_calcInstant = (...args) => shSafe(() => calcInstant(...args), 'calcInstant');
window.sh_calcRRR = (...args) => shSafe(() => calcRRR(...args), 'calcRRR');
window.sh_ptTab = (...args) => shSafe(() => ptTab(...args), 'ptTab');
window.sh_addCiclo = (...args) => shSafe(() => addCiclo(...args), 'addCiclo');
window.sh_calcCiclos = (...args) => shSafe(() => calcCiclos(...args), 'calcCiclos');
window.sh_calcParciais = (...args) => shSafe(() => calcParciais(...args), 'calcParciais');
window.sh_calcBR = (...args) => shSafe(() => calcBR(...args), 'calcBR');
window.sh_calcMetas = (...args) => shSafe(() => calcMetas(...args), 'calcMetas');
window.sh_calcRecov = (...args) => shSafe(() => calcRecov(...args), 'calcRecov');
window.sh_calcLosses = (...args) => shSafe(() => calcLosses(...args), 'calcLosses');
window.sh_calcDD = (...args) => shSafe(() => calcDD(...args), 'calcDD');
window.sh_clearDDHist = (...args) => shSafe(() => clearDDHist(...args), 'clearDDHist');
window.sh_calcDDModo = (...args) => shSafe(() => calcDDModo(...args), 'calcDDModo');
window.sh_calcDDFromPct = (...args) => shSafe(() => calcDDFromPct(...args), 'calcDDFromPct');
window.sh_calcDDFromUSD = (...args) => shSafe(() => calcDDFromUSD(...args), 'calcDDFromUSD');
window.sh_renderPlanilha = (...args) => shSafe(() => renderPlanilha(...args), 'renderPlanilha');
window.sh_runSim = (...args) => shSafe(() => runSim(...args), 'runSim');
window.sh_calcDT = (...args) => shSafe(() => calcDT(...args), 'calcDT');
window.sh_calcDTVol = (...args) => shSafe(() => calcDTVol(...args), 'calcDTVol');
window.sh_calcAcoesFull = (...args) => shSafe(() => calcAcoesFull(...args), 'calcAcoesFull');
window.sh_calcAcoes = (...args) => shSafe(() => calcAcoes(...args), 'calcAcoes');
window.sh_calcGerRisco = (...args) => shSafe(() => calcGerRisco(...args), 'calcGerRisco');
window.sh_tsRunAll = (...args) => shSafe(() => tsRunAll(...args), 'tsRunAll');
window.sh_syncRange = (...args) => shSafe(() => syncRange(...args), 'syncRange');
window.sh_syncInput = (...args) => shSafe(() => syncInput(...args), 'syncInput');
window.sh_tsTab = (...args) => shSafe(() => tsTab(...args), 'tsTab');
window.sh_buildIntraday = (...args) => shSafe(() => buildIntraday(...args), 'buildIntraday');
window.sh_fmSimular = (...args) => shSafe(() => fmSimular(...args), 'fmSimular');
window.sh_atualizarTabelaRec = (...args) => shSafe(() => atualizarTabelaRec(...args), 'atualizarTabelaRec');
window.sh_atualizarTopbar = (...args) => shSafe(() => atualizarTopbar(...args), 'atualizarTopbar');
window.sh_setN = (...args) => shSafe(() => setN(...args), 'setN');
window.sh_syncLoss = (...args) => shSafe(() => syncLoss(...args), 'syncLoss');
window.sh_syncWin = (...args) => shSafe(() => syncWin(...args), 'syncWin');
window.sh_setRP = (...args) => shSafe(() => setRP(...args), 'setRP');
window.sh_toggleLog = (...args) => shSafe(() => toggleLog(...args), 'toggleLog');
window.sh_exportLog = (...args) => shSafe(() => exportLog(...args), 'exportLog');
window.sh_clearLog = (...args) => shSafe(() => clearLog(...args), 'clearLog');
window.sh_hubSwitch = (...args) => shSafe(() => hubSwitch(...args), 'hubSwitch');
window.sh_hubSetCot = (...args) => shSafe(() => hubSetCot(...args), 'hubSetCot');
})();

/* END STUDYHUB INTEGRATED BUNDLE */

/* BEGIN STUDYHUB NATIVE INTRADAY IMPACT */
(function(){
  const pct = (value, digits = 2) => `${Number(value || 0).toFixed(digits)}%`;
  const signedPct = (value, digits = 2) => `${value >= 0 ? '+' : ''}${Number(value || 0).toFixed(digits)}%`;
  const money = (value) => '$' + Math.abs(Number(value || 0)).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const signedMoney = (value) => `${value >= 0 ? '+' : '-'}${money(value)}`;
  const readNum = (id, fallback = 0) => {
    const el = document.getElementById(id);
    const value = el ? parseFloat(el.value) : NaN;
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  const setInput = (id, value) => {
    const el = document.getElementById(id);
    if (el && Number.isFinite(value)) el.value = String(+value.toFixed(4));
  };
  const write = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  function studyHubIntradayParams() {
    const capital = readNum('ts-capital', 10000);
    const riskPct = readNum('risk', 1);
    const stopPct = readNum('id-sl', readNum('sl', 1));
    const gainPct = readNum('id-intradayGain', readNum('tp', Math.max(stopPct, 1)));
    const dailyStopPct = readNum('id-dailyStop', readNum('dailyStop', stopPct * 2));
    const dailyTargetPct = readNum('id-intradayTarget', readNum('dailyTarget', gainPct));
    const rrr = stopPct > 0 ? gainPct / stopPct : 0;
    const accountGainPct = riskPct * rrr;
    return {
      capital,
      riskPct,
      stopPct,
      gainPct,
      accountGainPct,
      dailyStopPct,
      dailyTargetPct,
      rrr,
      breakeven: rrr > 0 ? 1 / (1 + rrr) : 0,
      stopValue: capital * riskPct / 100,
      gainValue: capital * accountGainPct / 100,
      dailyStopValue: capital * dailyStopPct / 100,
      dailyTargetValue: capital * dailyTargetPct / 100,
      stopAt: Math.max(1, Math.ceil(dailyStopPct / Math.max(riskPct, 0.0001))),
      targetAt: Math.max(1, Math.ceil(dailyTargetPct / Math.max(accountGainPct, 0.0001))),
    };
  }

  function studyHubBuildIntradayRows(params) {
    const maxRows = Math.min(Math.max(6, params.stopAt, params.targetAt) + 2, 20);
    const rows = [];
    for (let n = 1; n <= maxRows; n++) {
      const winsAlt = Math.ceil(n / 2);
      const lossesAlt = Math.floor(n / 2);
      const allGainPct = n * params.accountGainPct;
      const allStopPct = -(n * params.riskPct);
      const altPct = (winsAlt * params.accountGainPct) - (lossesAlt * params.riskPct);
      rows.push({
        n,
        allGainPct,
        allGainValue: params.capital * allGainPct / 100,
        allStopPct,
        allStopValue: params.capital * allStopPct / 100,
        altPct,
        altValue: params.capital * altPct / 100,
        hitStop: Math.abs(allStopPct) >= params.dailyStopPct,
        hitTarget: allGainPct >= params.dailyTargetPct,
        stopRemaining: Math.max(0, params.dailyStopPct - Math.abs(allStopPct)),
        targetRemaining: Math.max(0, params.dailyTargetPct - allGainPct),
      });
    }
    return rows;
  }

  function studyHubEnsurePercentUnit(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const parent = input.parentElement;
    const hasUnit = (node) => Array.from(node?.children || []).some((child) => (
      child.classList?.contains('unit') || child.classList?.contains('u')
    ));

    if (parent?.classList?.contains('input-unit') || parent?.classList?.contains('iu')) {
      if (!hasUnit(parent)) {
        const unit = document.createElement('span');
        unit.className = parent.classList.contains('iu') ? 'u' : 'unit';
        unit.textContent = '%';
        parent.appendChild(unit);
      }
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'input-unit';
    wrapper.style.cssText = 'width:90px';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const unit = document.createElement('span');
    unit.className = 'unit';
    unit.textContent = '%';
    wrapper.appendChild(unit);
  }

  function studyHubRemovePercentUnit(inputId) {
    const input = document.getElementById(inputId);
    const parent = input?.parentElement;
    if (!parent) return;
    parent.querySelectorAll(':scope > .unit, :scope > .u').forEach((unit) => unit.remove());
  }

  function studyHubNormalizeIntradayPercentUnits() {
    studyHubEnsurePercentUnit('id-intradayRisk');
    studyHubRemovePercentUnit('id-sl');
    studyHubRemovePercentUnit('id-intradayGain');
    studyHubEnsurePercentUnit('id-dailyStop');
    studyHubEnsurePercentUnit('id-intradayTarget');
  }

  function studyHubEnsureIntradayMarkup() {
    const table = document.getElementById('intradayTable');
    const body = table && typeof table.closest === 'function' ? table.closest('.ts-panel-body') : null;
    if (!table || !body) return false;

    const controls = body.querySelector('div[style*="align-items:flex-end"]') || body.firstElementChild;
    const stopField = document.getElementById('id-sl')?.closest('.field');
    const dailyStopField = document.getElementById('id-dailyStop')?.closest('.field');
    const stopLabel = stopField?.querySelector('label');
    const dailyStopLabel = dailyStopField?.querySelector('label');
    if (stopLabel) stopLabel.textContent = 'SL p/ RRR';
    if (dailyStopLabel) dailyStopLabel.textContent = 'Meta de Loss';

    if (!document.getElementById('id-intradayRisk') && controls) {
      const riskField = document.createElement('div');
      riskField.className = 'field';
      riskField.style.cssText = 'margin:0;flex:0 0 auto';
      riskField.innerHTML = `
        <label style="font-size:10px;color:var(--muted);margin-bottom:4px;display:block">Risco/Trade</label>
        <div class="input-unit" style="width:90px">
          <input type="number" id="id-intradayRisk" value="${readNum('risk', 1)}" min="0.01" max="20" step="0.01">
          <span class="unit">%</span>
        </div>`;
      if (stopField) controls.insertBefore(riskField, stopField);
      else controls.appendChild(riskField);
    }

    if (!document.getElementById('id-intradayGain') && controls) {
      const gainField = document.createElement('div');
      gainField.className = 'field';
      gainField.style.cssText = 'margin:0;flex:0 0 auto';
      gainField.innerHTML = `
        <label style="font-size:10px;color:var(--muted);margin-bottom:4px;display:block">Alvo p/ RRR</label>
        <div class="input-unit" style="width:90px">
          <input type="number" id="id-intradayGain" value="${readNum('tp', 1)}" min="0.01" max="50" step="0.01">
        </div>`;

      const targetField = document.createElement('div');
      targetField.className = 'field';
      targetField.style.cssText = 'margin:0;flex:0 0 auto';
      targetField.innerHTML = `
        <label style="font-size:10px;color:var(--muted);margin-bottom:4px;display:block">Meta de Gain</label>
        <div class="input-unit" style="width:90px">
          <input type="number" id="id-intradayTarget" value="${readNum('dailyTarget', 1)}" min="0.1" max="50" step="0.1">
          <span class="unit">%</span>
        </div>`;

      if (stopField?.nextSibling) controls.insertBefore(gainField, stopField.nextSibling);
      else controls.appendChild(gainField);
      if (dailyStopField?.nextSibling) controls.insertBefore(targetField, dailyStopField.nextSibling);
      else controls.appendChild(targetField);
    }

    studyHubNormalizeIntradayPercentUnits();

    if (!document.getElementById('intradayRiskModelNote')) {
      const note = document.createElement('div');
      note.id = 'intradayRiskModelNote';
      note.style.cssText = 'border:1px solid rgba(34,211,238,.16);background:rgba(34,211,238,.055);color:var(--text);border-radius:10px;padding:10px 12px;margin:0 0 12px;font-size:11px;line-height:1.45';
      note.innerHTML = '<strong>RRR = Alvo / SL.</strong> Valor financeiro usa Capital Inicial x Risco/Trade; SL/Alvo so definem proporcao do setup.';
      if (controls?.nextSibling) body.insertBefore(note, controls.nextSibling);
      else body.insertBefore(note, table);
    }

    if (!document.getElementById('intradayImpactMetrics')) {
      const metrics = document.createElement('div');
      metrics.id = 'intradayImpactMetrics';
      metrics.style.cssText = 'display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:8px;margin:0 0 12px';
      metrics.innerHTML = `
        <div class="metric"><div class="metric-label">Valor do Stop</div><div class="metric-value col-red" id="id-intradayStopValue">—</div><div class="metric-sub" id="id-intradayStopPct">—</div></div>
        <div class="metric"><div class="metric-label">Valor do Gain</div><div class="metric-value col-green" id="id-intradayGainValue">—</div><div class="metric-sub" id="id-intradayGainPct">—</div></div>
        <div class="metric"><div class="metric-label">RRR calculado</div><div class="metric-value col-blue" id="id-intradayRRR">—</div><div class="metric-sub" id="id-intradayBreakeven">—</div></div>
        <div class="metric"><div class="metric-label">Stop do Dia</div><div class="metric-value col-red" id="id-intradayDailyStopValue">—</div><div class="metric-sub" id="id-intradayDailyStopPct">—</div></div>
        <div class="metric"><div class="metric-label">Meta de Gain</div><div class="metric-value col-green" id="id-intradayDailyTargetValue">—</div><div class="metric-sub" id="id-intradayDailyTargetPct">—</div></div>
        <div class="metric"><div class="metric-label">Limites</div><div class="metric-value col-yellow" id="id-intradayLimits">—</div><div class="metric-sub">stops / gains ate limite</div></div>`;
      if (controls?.nextSibling) body.insertBefore(metrics, controls.nextSibling);
      else body.insertBefore(metrics, table);
    }

    return true;
  }

  function studyHubSyncIntradayInputs() {
    const map = {
      'id-intradayRisk': 'risk',
      'id-sl': 'sl',
      'id-intradayGain': 'tp',
      'id-dailyStop': 'dailyStop',
      'id-intradayTarget': 'dailyTarget',
    };
    Object.entries(map).forEach(([localId, sourceId]) => {
      const local = document.getElementById(localId);
      if (!local) return;
      const sourceValue = readNum(sourceId, parseFloat(local.value) || 1);
      if (!local.dataset.studyHubBound) {
        local.value = String(sourceValue);
        local.dataset.studyHubBound = '1';
        local.oninput = () => {
          const value = readNum(localId, sourceValue);
          setInput(sourceId, value);
          if (sourceId === 'tp') write('rrrDisplay', `1 : ${(value / readNum('sl', 1)).toFixed(2)}`);
          studyHubRenderIntradayImpact();
        };
      } else if (document.activeElement !== local) {
        local.value = String(sourceValue);
      }
    });
  }

  function studyHubBindIntradaySources() {
    ['ts-capital','risk','dailyStop','dailyTarget','sl','tp','riskRange','dailyStopRange','dailyTargetRange','slRange','tpRange'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.dataset.studyHubIntradaySourceBound) return;
      el.dataset.studyHubIntradaySourceBound = '1';
      el.addEventListener('input', () => requestAnimationFrame(studyHubRenderIntradayImpact));
    });
  }

  function studyHubRenderIntradayImpact() {
    if (!studyHubEnsureIntradayMarkup()) return;
    studyHubSyncIntradayInputs();
    studyHubBindIntradaySources();
    const params = studyHubIntradayParams();
    const rows = studyHubBuildIntradayRows(params);

    write('id-rrrDisplay', `1 : ${params.rrr.toFixed(2)}`);
    write('id-tpDisplay', `${pct(params.gainPct, 3)} / ${money(params.gainValue)}`);
    write('id-intradayStopValue', money(params.stopValue));
    write('id-intradayStopPct', `${pct(params.riskPct)} risco / ${pct(params.stopPct)} SL`);
    write('id-intradayGainValue', money(params.gainValue));
    write('id-intradayGainPct', `${pct(params.accountGainPct)} retorno / ${pct(params.gainPct)} alvo`);
    write('id-intradayRRR', `1 : ${params.rrr.toFixed(2)}`);
    write('id-intradayBreakeven', `WR BE ${pct(params.breakeven * 100, 1)}`);
    write('id-intradayDailyStopValue', money(params.dailyStopValue));
    write('id-intradayDailyStopPct', `${pct(params.dailyStopPct)} / ${params.stopAt} stops`);
    write('id-intradayDailyTargetValue', money(params.dailyTargetValue));
    write('id-intradayDailyTargetPct', `${pct(params.dailyTargetPct)} / ${params.targetAt} gains`);
    write('id-intradayLimits', `${params.stopAt} SL / ${params.targetAt} G`);

    const table = document.getElementById('intradayTable');
    const tbody = table?.querySelector('tbody');
    if (!table || !tbody) return;
    const head = table.querySelector('thead tr');
    if (head) {
      head.innerHTML = '<th>#Trades</th><th>Todos Gain</th><th>Alternado W/L</th><th>Todos Stop</th><th>Stop do Dia</th><th>Meta de Gain</th><th>WR BE</th>';
    }
    tbody.innerHTML = rows.map((row) => `
      <tr${row.hitStop || row.hitTarget ? ' style="opacity:.92"' : ''}>
        <td class="mono col-blue">${row.n}</td>
        <td class="mono col-green">${signedPct(row.allGainPct)}<br><span style="font-size:9px;color:var(--dim)">${signedMoney(row.allGainValue)}</span></td>
        <td class="mono ${row.altPct >= 0 ? 'col-green' : 'col-red'}">${signedPct(row.altPct)}<br><span style="font-size:9px;color:var(--dim)">${signedMoney(row.altValue)}</span></td>
        <td class="mono col-red">${signedPct(row.allStopPct)}<br><span style="font-size:9px;color:var(--dim)">${signedMoney(row.allStopValue)}</span></td>
        <td>${row.hitStop ? `<span class="badge badge-red">stop no ${row.n}o trade</span>` : `<span class="badge badge-yellow">faltam ${pct(row.stopRemaining)}</span>`}</td>
        <td>${row.hitTarget ? `<span class="badge badge-green">meta no ${row.n}o trade</span>` : `<span class="badge badge-blue">faltam ${pct(row.targetRemaining)}</span>`}</td>
        <td class="mono col-blue">${pct(params.breakeven * 100, 1)}</td>
      </tr>`).join('');
  }

  function studyHubEnhanceIntradayImpact() {
    if (!document.getElementById('mod-tradesim')) return;
    studyHubRenderIntradayImpact();
    if (!window.__studyHubIntradayWrapped) {
      const originalBuild = window.sh_buildIntraday;
      const originalRunAll = window.sh_tsRunAll;
      window.sh_buildIntraday = (...args) => {
        const result = typeof originalBuild === 'function' ? originalBuild(...args) : undefined;
        requestAnimationFrame(studyHubRenderIntradayImpact);
        return result;
      };
      window.sh_tsRunAll = (...args) => {
        const result = typeof originalRunAll === 'function' ? originalRunAll(...args) : undefined;
        requestAnimationFrame(studyHubRenderIntradayImpact);
        return result;
      };
      window.__studyHubIntradayWrapped = true;
    }
  }

  window.studyHubBuildIntradayRows = studyHubBuildIntradayRows;
  window.studyHubEnhanceIntradayImpact = studyHubEnhanceIntradayImpact;
  if (document.readyState === 'complete') requestAnimationFrame(studyHubEnhanceIntradayImpact);
  else window.addEventListener('load', () => requestAnimationFrame(studyHubEnhanceIntradayImpact), { once: true });
})();
/* END STUDYHUB NATIVE INTRADAY IMPACT */
