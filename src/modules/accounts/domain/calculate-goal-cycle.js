// Pure cyclic goal calculation for account risk.
globalThis.TradeDiaryGoalCycle = (() => {
  function calculateGoalCycle({configuredGoalPct,goalBase,current}){
    const goalPct=(configuredGoalPct||10)/100;
    const cicloAtual=goalPct>0&&goalBase>0
      ? Math.max(0,Math.floor(Math.log(current/goalBase)/Math.log(1+goalPct)))
      : 0;
    const cicloBase=parseFloat((goalBase*Math.pow(1+goalPct,cicloAtual)).toFixed(2));
    const cicloAlvo=parseFloat((goalBase*Math.pow(1+goalPct,cicloAtual+1)).toFixed(2));
    const goalTarget=parseFloat((cicloAlvo-cicloBase).toFixed(2));
    const pnlNoCiclo=parseFloat((current-cicloBase).toFixed(2));
    const goalProgress=goalTarget>0?Math.min(1,Math.max(0,pnlNoCiclo/goalTarget)):0;
    return {cicloAtual,cicloBase,cicloAlvo,goalTarget,pnlNoCiclo,goalProgress};
  }

  return {calculateGoalCycle};
})();
