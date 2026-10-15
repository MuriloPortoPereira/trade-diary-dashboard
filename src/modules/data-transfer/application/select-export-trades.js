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
