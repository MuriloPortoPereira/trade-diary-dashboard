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
