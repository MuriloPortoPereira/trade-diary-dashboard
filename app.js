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




const SIMULATION_ENTRY_DEFAULTS = Object.freeze({
  riskPct:1,
  rrr:1.1,
  goalPct:10,
  stopPct:2,
});

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



function calculateSimulationSizing({balance=0,riskPct=0,goalPct=0,stopPct=0}={}){
  return TradeDiarySimulationSizing.calculateSimulationSizing({balance,riskPct,goalPct,stopPct});
}










function buildMonteCarloBalanceProjection({balance,trades,winRate,rrr,riskUsd,goalUsd,stopUsd,scenarioCount=100}){
  return TradeDiarySimulationProjection.buildMonteCarloBalanceProjection({balance,trades,winRate,rrr,riskUsd,goalUsd,stopUsd,scenarioCount});
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












function getClosedTradesWithSubjectiveEmotion(list=[]){
  return (Array.isArray(list)?list:[]).filter(t=>['WIN','LOSS','BE'].includes(t?.status)&&String(t?.emotion||'').trim());
}

function getClosedTradesWithPlanTag(list=[]){
  return (Array.isArray(list)?list:[]).filter(t=>['WIN','LOSS','BE'].includes(t?.status)&&['sim','parcial','nao'].includes(String(t?.followedPlan||'').trim()));
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






function triggerFileInput(id){
  document.getElementById(id)?.click();
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
