// Pure simulation sizing. Classic-script namespace retained during migration.
globalThis.TradeDiarySimulationSizing = (() => {
  function toSimulationNumber(value, fallback=0){
    const n=parseFloat(value);
    return Number.isFinite(n)?n:fallback;
  }

  function roundSimulationMoney(value){
    return Math.round((toSimulationNumber(value,0)+Number.EPSILON)*100)/100;
  }

  function calculateSimulationSizing({balance=0,riskPct=0,goalPct=0,stopPct=0}={}){
    const cleanBalance=roundSimulationMoney(Math.max(0,toSimulationNumber(balance,0)));
    const cleanRiskPct=Math.max(0,toSimulationNumber(riskPct,0));
    const cleanGoalPct=Math.max(0,toSimulationNumber(goalPct,0));
    const cleanStopPct=Math.max(0,toSimulationNumber(stopPct,0));
    return {
      balance:cleanBalance,
      riskPct:cleanRiskPct,
      goalPct:cleanGoalPct,
      stopPct:cleanStopPct,
      riskUsd:roundSimulationMoney(cleanBalance*cleanRiskPct/100),
      goalUsd:roundSimulationMoney(cleanBalance*cleanGoalPct/100),
      stopUsd:roundSimulationMoney(cleanBalance*cleanStopPct/100),
    };
  }

  return { toSimulationNumber, roundSimulationMoney, calculateSimulationSizing };
})();
