// CSV format adapter. Classic-script namespace retained during migration.
globalThis.TradeDiaryTradesCSV = (() => {
  const TRADE_CSV_HEADERS = ['date','symbol','direction','placedTime','openTime','exitDate','exitTime','entry','exit','stop','tp','qty','riskUsd','riskPct','r','pnl','status','market','strategy','emotion','errors','remarks'];

  function csvCell(value){
    const raw=Array.isArray(value)?value.join('; '):value;
    const text=raw==null?'':String(raw);
    return `"${text.replace(/"/g,'""')}"`;
  }

  function buildTradesCSV(list){
    const rows=(Array.isArray(list)?list:[]).map(t=>TRADE_CSV_HEADERS.map(h=>csvCell(t[h])).join(','));
    return TRADE_CSV_HEADERS.join(',')+'\n'+rows.join('\n');
  }

  return { TRADE_CSV_HEADERS, csvCell, buildTradesCSV };
})();
