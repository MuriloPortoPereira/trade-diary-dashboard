// Transitional application workflow: legacy state and adapters are composed by app.js.
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
// Transitional import preparation and pending state; legacy adapters are composed by app.js.
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
// Transitional export query: account state and lookup are supplied by the legacy composition.
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
