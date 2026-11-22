// Regras de importação com registros e resolvedor de posições recebidos, sem acesso ao estado ou à persistência.
globalThis.TradeDiaryImportTradeRules = (() => {
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

  function createImportedTradeFilter(existingTrades,getPositionKey){
    // Rejeita duplicatas já salvas e repetidas dentro do próprio lote importado.
    const existingPos=new Set(existingTrades.map(t=>getPositionKey(t)).filter(Boolean));
    const existingIds=new Set(existingTrades.map(t=>t.id));
    const seenPos=new Set();
    const seenIds=new Set();
    return t=>{
      const positionKey=getPositionKey(t);
      if(positionKey&&(existingPos.has(positionKey)||seenPos.has(positionKey)))return false;
      if(existingIds.has(t.id)||seenIds.has(t.id))return false;
      if(positionKey)seenPos.add(positionKey);
      seenIds.add(t.id);
      return true;
    };
  }

  return {calcImportMissingFields,createImportedTradeFilter};
})();
