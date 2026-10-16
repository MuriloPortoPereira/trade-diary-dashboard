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
