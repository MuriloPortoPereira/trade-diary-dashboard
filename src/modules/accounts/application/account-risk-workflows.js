function calcAccountRiskState(acct, acctTrades, period){
  const ordered=getOrderedTrades(acctTrades);
  const anchorStr=getAnchorTradeDate(acctTrades);
  const anchorDate=new Date(anchorStr+'T12:00:00');

  const todayStr=new Date().toISOString().split('T')[0];
  const todayDate=new Date(todayStr+'T12:00:00');
  const weekStart=new Date(todayDate);
  weekStart.setDate(todayDate.getDate()-todayDate.getDay());
  weekStart.setHours(0,0,0,0);
  const weekEnd=new Date(weekStart);
  weekEnd.setDate(weekStart.getDate()+6);
  weekEnd.setHours(23,59,59,999);

  const {dayPnl,weekPnl,monthPnl,scopePnl,scopeLoss}=TradeDiaryRiskPeriodPnl.calculateRiskPeriodPnl({
    acctTrades,period,todayStr,todayDate,weekStart,weekEnd,
  });

  const cashflow=calcAccountCashflow(acct);
  const initialBalance=acct.balance||0;
  const capitalBase=initialBalance+cashflow.net;
  const goalBase=initialBalance+cashflow.deposits;
  const {current,peak,currentDdPct,currentDdUsd}=TradeDiaryBalanceDrawdown.calculateBalanceDrawdown(capitalBase,ordered);

  const goalMoney=pct=>parseFloat((goalBase*((pct||0)/100)).toFixed(2));
  const {dayLimit,weekLimit,monthLimit,riskPerTradeUsd}=TradeDiaryRiskLimits.calculateRiskThresholds(acct,capitalBase);
  const totalPnl=current-capitalBase;

  // Meta cíclica: usa goalBase (capital + depósitos) como patamar inicial.
  const {cicloAtual,cicloBase,cicloAlvo,goalTarget,pnlNoCiclo,goalProgress}=TradeDiaryGoalCycle.calculateGoalCycle({
    configuredGoalPct:acct.goalPct,goalBase,current,
  });

  // DD total: calculado sobre o saldo do início do ciclo atual — protege o lucro já conquistado
  const ddBase=cicloBase;
  const {totalLimit,dayLoss,weekLoss,monthLoss,dayExcessUsd,weekExcessUsd,monthExcessUsd,totalExcessUsd,
    scopeLimit,scopeLimitPct,scopeExcessUsd,scopeUsageRaw}=TradeDiaryRiskLimits.calculateRiskConsumption({
    acct,cicloBase,currentDdUsd,dayPnl,weekPnl,monthPnl,scopeLoss,period,dayLimit,weekLimit,monthLimit,
  });
  const pctExcess=amount=>capitalBase>0?parseFloat((amount/capitalBase*100).toFixed(2)):0;
  const scopeUsage=clamp(scopeUsageRaw,0,1);

  const todayLabel=todayDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
  const anchorLabelFmt=anchorDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
  const weekStartLabel=weekStart.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  const weekEndLabel=weekEnd.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  const activePeriod=period||'all';
  return {
    anchorStr,
    todayStr,
    anchorLabel:anchorStr===todayStr?`Hoje (${todayLabel})`:anchorLabelFmt,
    todayLabel,
    weekStartLabel,
    weekEndLabel,
    activePeriod,
    scopePnl,
    scopeLoss,
    scopeLimit,
    scopeLimitPct,
    scopeExcessUsd,
    scopeUsageRaw,
    scopeUsage,
    initialBalance,
    cashflowDeposits:cashflow.deposits,
    cashflowWithdrawals:cashflow.withdrawals,
    cashflowNet:cashflow.net,
    capitalBase,
    goalBase,
    currentBalance:current,
    totalPnl,
    dayPnl,
    weekPnl,
    monthPnl,
    dayLimit,
    weekLimit,
    monthLimit,
    totalLimit,
    riskPerTradeUsd,
    dayLoss,
    weekLoss,
    monthLoss,
    dayUsageRaw:dayLimit>0?dayLoss/dayLimit:0,
    weekUsageRaw:weekLimit>0?weekLoss/weekLimit:0,
    monthUsageRaw:monthLimit>0?monthLoss/monthLimit:0,
    totalUsageRaw:totalLimit>0?currentDdUsd/totalLimit:0,
    dayUsage:dayLimit>0?clamp(dayLoss/dayLimit,0,1):0,
    weekUsage:weekLimit>0?clamp(weekLoss/weekLimit,0,1):0,
    monthUsage:monthLimit>0?clamp(monthLoss/monthLimit,0,1):0,
    totalUsage:totalLimit>0?clamp(currentDdUsd/totalLimit,0,1):0,
    dayExcessUsd,
    weekExcessUsd,
    monthExcessUsd,
    totalExcessUsd,
    dayExcessPct:pctExcess(dayExcessUsd),
    weekExcessPct:pctExcess(weekExcessUsd),
    monthExcessPct:pctExcess(monthExcessUsd),
    totalExcessPct:pctExcess(totalExcessUsd),
    goalProgress,
    goalTarget,
    pnlNoCiclo,
    cicloAtual,
    cicloBase,
    cicloAlvo,
    ddBase,
    currentDdPct,
    currentDdUsd,
    peakBalance:peak,
    riskLabel:isFuturesAccount(acct)?fR(acct.risk||0):`${f2(acct.risk||0)}%`,
    riskSub:isFuturesAccount(acct)
      ? `Conta em modo futuro · multiplicador padrao ${f2(acct.mult||1)}`
      : `Saldo inicial ${fR(initialBalance)} · aportes líquidos ${fR(cashflow.net)} · meta ${f2(acct.goalPct||10)}%`,
  };
}

function getTradeWeekKey(dateStr){
  if(!dateStr)return'';
  const d=new Date(dateStr+'T12:00:00');
  if(Number.isNaN(d.getTime()))return'';
  const weekStart=new Date(d);
  weekStart.setDate(d.getDate()-d.getDay());
  return weekStart.toISOString().slice(0,10);
}

function buildStopFeeAnalysis(acct, acctTrades=[]){
  const closed=acctTrades.filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const risk=calcAccountRiskState(acct,acctTrades);
  const dayLimit=Number(risk.dayLimit)||0;
  const weekLimit=Number(risk.weekLimit)||0;
  const monthLimit=Number(risk.monthLimit)||0;
  const groupPnl=(keyFn)=>{
    const map={};
    closed.forEach(t=>{
      const key=keyFn(t);
      if(!key)return;
      map[key]=(map[key]||0)+(Number(t.pnl)||0);
    });
    return map;
  };
  const dayPnl=groupPnl(t=>t.date||'');
  const weekPnl=groupPnl(t=>getTradeWeekKey(t.date));
  const monthPnl=groupPnl(t=>t.date?String(t.date).slice(0,7):'');
  const countOver=(map,limit)=>limit>0?Object.values(map).filter(v=>Math.max(-v,0)>limit).length:0;
  const pct=(count,total)=>total?parseFloat((count/total*100).toFixed(1)):0;
  const totalFees=closed.reduce((sum,t)=>sum+Math.abs(Number(t.fees)||0),0);
  const netPnl=closed.reduce((sum,t)=>sum+(Number(t.pnl)||0),0);
  const pnlBeforeFees=netPnl+totalFees;
  const feePerTrade=closed.length?totalFees/closed.length:0;
  const expectancyBeforeFees=closed.length?pnlBeforeFees/closed.length:0;
  const expectancyAfterFees=closed.length?netPnl/closed.length:0;
  const edgeRemovedPct=expectancyBeforeFees>0?clamp(((expectancyBeforeFees-expectancyAfterFees)/expectancyBeforeFees)*100,0,999):0;
  const feeDragPct=Math.abs(pnlBeforeFees)>0?Math.abs(totalFees/pnlBeforeFees)*100:0;
  const feesInR=risk.riskPerTradeUsd>0?totalFees/risk.riskPerTradeUsd:0;
  const days=Object.keys(dayPnl).length;
  const weeks=Object.keys(weekPnl).length;
  const months=Object.keys(monthPnl).length;
  const daysOverDailyStop=countOver(dayPnl,dayLimit);
  const weeksOverWeeklyStop=countOver(weekPnl,weekLimit);
  const monthsOverMonthlyStop=countOver(monthPnl,monthLimit);
  return {
    closedTrades:closed.length,
    dayLimit,
    weekLimit,
    monthLimit,
    days,
    weeks,
    months,
    daysOverDailyStop,
    weeksOverWeeklyStop,
    monthsOverMonthlyStop,
    daysOverDailyStopPct:pct(daysOverDailyStop,days),
    weeksOverWeeklyStopPct:pct(weeksOverWeeklyStop,weeks),
    monthsOverMonthlyStopPct:pct(monthsOverMonthlyStop,months),
    totalFees:parseFloat(totalFees.toFixed(2)),
    netPnl:parseFloat(netPnl.toFixed(2)),
    pnlBeforeFees:parseFloat(pnlBeforeFees.toFixed(2)),
    feePerTrade:parseFloat(feePerTrade.toFixed(2)),
    expectancyBeforeFees:parseFloat(expectancyBeforeFees.toFixed(2)),
    expectancyAfterFees:parseFloat(expectancyAfterFees.toFixed(2)),
    edgeRemovedPct:parseFloat(edgeRemovedPct.toFixed(1)),
    feeDragPct:parseFloat(feeDragPct.toFixed(1)),
    feesInR:parseFloat(feesInR.toFixed(2)),
  };
}
