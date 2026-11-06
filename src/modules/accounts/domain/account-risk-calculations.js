// Pure account cashflow totals. Classic-script namespace retained during migration.
globalThis.TradeDiaryAccountCashflow = (() => {
  function calculateCashflowTotals(flows=[]){
    return flows.reduce((sum,flow)=>{
      const amount=Math.abs(parseFloat(flow.amount)||0);
      if(flow.type==='withdrawal')sum.withdrawals+=amount;
      else sum.deposits+=amount;
      sum.net=sum.deposits-sum.withdrawals;
      return sum;
    },{deposits:0,withdrawals:0,net:0});
  }

  return {calculateCashflowTotals};
})();

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

// Pure account balance and drawdown calculation over already ordered trades.
globalThis.TradeDiaryBalanceDrawdown = (() => {
  function calculateBalanceDrawdown(capitalBase, orderedTrades){
    let peak=capitalBase;
    let current=capitalBase;
    let currentDdPct=0;
    let currentDdUsd=0;
    orderedTrades.forEach(t=>{
      current+=(t.pnl||0);
      if(current>peak)peak=current;
      currentDdPct=peak>0?Math.max(0,(peak-current)/peak):0;
      currentDdUsd=Math.max(0,peak-current);
    });
    return {current,peak,currentDdPct,currentDdUsd};
  }

  return {calculateBalanceDrawdown};
})();

// Pure account risk P/L over explicit dates and trades.
globalThis.TradeDiaryRiskPeriodPnl = (() => {
  function calculateRiskPeriodPnl({acctTrades,period,todayStr,todayDate,weekStart,weekEnd}){
    const sumPnl=list=>list.reduce((sum,t)=>sum+(t.pnl||0),0);

    // The selected dashboard period controls only the scope progress bars.
    let scopeTrades=acctTrades;
    if(period==='today') scopeTrades=acctTrades.filter(t=>t.date===todayStr);
    else if(period==='week') scopeTrades=acctTrades.filter(t=>{
      if(!t.date)return false;
      const d=new Date(t.date+'T12:00:00');
      return d>=weekStart&&d<=weekEnd;
    });
    else if(period==='month') scopeTrades=acctTrades.filter(t=>{
      if(!t.date)return false;
      const d=new Date(t.date+'T12:00:00');
      return d.getFullYear()===todayDate.getFullYear()&&d.getMonth()===todayDate.getMonth();
    });

    // Fixed day, week and month references are used by other risk signals.
    const dayTrades=acctTrades.filter(t=>t.date===todayStr);
    const weekTrades=acctTrades.filter(t=>{
      if(!t.date)return false;
      const d=new Date(t.date+'T12:00:00');
      return d>=weekStart && d<=weekEnd;
    });
    const monthTrades=acctTrades.filter(t=>{
      if(!t.date)return false;
      const d=new Date(t.date+'T12:00:00');
      return d.getFullYear()===todayDate.getFullYear() && d.getMonth()===todayDate.getMonth();
    });

    const dayPnl=sumPnl(dayTrades);
    const weekPnl=sumPnl(weekTrades);
    const monthPnl=sumPnl(monthTrades);
    const scopePnl=sumPnl(scopeTrades);
    const scopeLoss=Math.max(-scopePnl,0);
    return {dayPnl,weekPnl,monthPnl,scopePnl,scopeLoss};
  }

  return {calculateRiskPeriodPnl};
})();
