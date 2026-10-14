// Pure monetary limits and consumption for account risk.
globalThis.TradeDiaryRiskLimits = (() => {
  function calculateRiskThresholds(acct, capitalBase){
    const pctMoney=pct=>parseFloat((capitalBase*((pct||0)/100)).toFixed(2));
    return {
      dayLimit:pctMoney(acct.ddDaily||2),
      weekLimit:pctMoney(acct.ddWeekly||5),
      monthLimit:pctMoney(acct.ddMonthly||acct.ddTotal||10),
      riskPerTradeUsd:pctMoney(acct.risk||0),
    };
  }

  function calculateRiskConsumption({acct,cicloBase,currentDdUsd,dayPnl,weekPnl,monthPnl,scopeLoss,period,dayLimit,weekLimit,monthLimit}){
    const totalLimit=parseFloat((cicloBase*((acct.ddTotal||10)/100)).toFixed(2));
    const dayLoss=Math.max(-dayPnl,0);
    const weekLoss=Math.max(-weekPnl,0);
    const monthLoss=Math.max(-monthPnl,0);
    const dayExcessUsd=parseFloat(Math.max(dayLoss-dayLimit,0).toFixed(2));
    const weekExcessUsd=parseFloat(Math.max(weekLoss-weekLimit,0).toFixed(2));
    const monthExcessUsd=parseFloat(Math.max(monthLoss-monthLimit,0).toFixed(2));
    const totalExcessUsd=parseFloat(Math.max(currentDdUsd-totalLimit,0).toFixed(2));
    const scopeLimit=period==='today'?dayLimit:period==='week'?weekLimit:period==='month'?monthLimit:totalLimit;
    const scopeLimitPct=period==='today'?(acct.ddDaily||2):period==='week'?(acct.ddWeekly||5):period==='month'?(acct.ddMonthly||acct.ddTotal||10):(acct.ddTotal||10);
    const scopeExcessUsd=parseFloat(Math.max(scopeLoss-scopeLimit,0).toFixed(2));
    const scopeUsageRaw=scopeLimit>0?scopeLoss/scopeLimit:0;
    return {totalLimit,dayLoss,weekLoss,monthLoss,dayExcessUsd,weekExcessUsd,monthExcessUsd,totalExcessUsd,scopeLimit,scopeLimitPct,scopeExcessUsd,scopeUsageRaw};
  }

  return {calculateRiskThresholds,calculateRiskConsumption};
})();
