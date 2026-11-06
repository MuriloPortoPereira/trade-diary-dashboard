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

// ── FORMATAÇÃO ──
const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

function calcImportMissingFields(trade, status){
  return TradeDiaryImportTradeRules.calcImportMissingFields(trade,status);
}

// Tooltip manager — position:fixed no body, escapa qualquer stacking context ou overflow:hidden
initializeMetricTooltips();

function calcMetrics(data=[], acctId=activeAccountId){
  const acct=accounts.find(a=>a.id===acctId)||getActiveAccount();
  const capitalBase=getAccountCapitalBase(acct);
  const startBal=Number.isFinite(capitalBase)&&capitalBase>0?capitalBase:(acct?.balance||config.balance||1000);
  return TradeDiaryTradeMetrics.calculateTradeMetrics(data,startBal);
}

let calViewMode='week';

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

bindWorkspaceEvents();

// ══════════════════════════════════════════════
// SISTEMA DE IDIOMAS (i18n)
// ══════════════════════════════════════════════
let currentLanguage = localStorage.getItem('appLanguage') || 'pt-BR';
