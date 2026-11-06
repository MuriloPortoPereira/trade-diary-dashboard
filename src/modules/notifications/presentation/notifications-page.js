function buildOperationalAlerts(acct, acctTrades){
  const closed=acctTrades.filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const risk=calcAccountRiskState(acct,acctTrades);
  const strategies=getStrategySnapshots(acctTrades);
  const weakStrategy=strategies.find(row=>row.n>=3&&row.pnl<0);
  const bestStrategy=strategies[0];
  const incomplete=acctTrades.filter(t=>t.incomplete).length;
  const hesitation=acctTrades.filter(t=>t.hesitation).length;
  const missingNotes=closed.filter(t=>t.status==='LOSS'&&!(t.remarks||'').trim()).length;
  const tradedDays=[...new Set(closed.map(t=>t.date).filter(Boolean))];
  const missingPMDates=tradedDays.filter(date=>!preMarketData[date]||!Array.isArray(preMarketData[date].habits)).sort().reverse();
  const missingPremarket=missingPMDates.length;
  const alerts=[];

  alerts.push({
    tone:risk.dayUsage>=0.8?'danger':risk.dayUsage>=0.55?'warn':'safe',
    title:'Risco diário',
    summary:risk.dayUsage>=0.8
      ? `A sessão de ${risk.anchorLabel} consumiu ${Math.round(risk.dayUsage*100)}% do limite diário.`
      : `Uso atual do stop da sessão em ${Math.round(risk.dayUsage*100)}% do permitido.`,
    value:fR(Math.max(risk.dayLimit-Math.max(-risk.dayPnl,0),0)),
    actionPage:'setup',
    actionLabel:'Revisar risco',
  });

  alerts.push({
    tone:risk.weekPnl<0?'warn':'safe',
    title:'Semana operacional',
    summary:risk.weekPnl<0?`Semana negativa em ${fR(risk.weekPnl)}.`:`Semana positiva em ${(risk.weekPnl>=0?'+':'')+fR(risk.weekPnl)}.`,
    value:`DD ${(risk.currentDdPct*100).toFixed(2)}%`,
    actionPage:'stats',
    actionLabel:'Ver análises',
  });

  if(weakStrategy){
    alerts.push({
      tone:'warn',
      title:'Estratégia pressionada',
      summary:`${weakStrategy.name} está com ${weakStrategy.n} trades e resultado de ${(weakStrategy.pnl>=0?'+':'')+fR(weakStrategy.pnl)}.`,
      value:`WR ${weakStrategy.wr.toFixed(0)}%`,
      actionPage:'strategyHub',
      actionLabel:'Abrir estratégias',
    });
  }

  if(bestStrategy){
    alerts.push({
      tone:bestStrategy.pnl>=0?'safe':'warn',
      title:'Melhor tração atual',
      summary:`${bestStrategy.name} lidera o período com ${bestStrategy.n} trades registrados.`,
      value:`${bestStrategy.pnl>=0?'+':''}${fR(bestStrategy.pnl)}`,
      actionPage:'strategyHub',
      actionLabel:'Detalhar',
    });
  }

  if(incomplete){
    alerts.push({
      tone:'warn',
      title:'Trades incompletos',
      summary:`Existem ${incomplete} operações com campos faltando e isso contamina as leituras.`,
      value:`${incomplete} pendente(s)`,
      actionPage:'log',
      actionLabel:'Abrir trades',
    });
  }

  if(missingNotes){
    alerts.push({
      tone:'info',
      title:'Losses sem documentação',
      summary:`Você ainda tem ${missingNotes} loss(es) sem nota registrada no módulo Documentos.`,
      value:'Registrar revisão',
      actionPage:'documents',
      actionLabel:'Abrir documentos',
    });
  }

  if(missingPremarket){
    const shown=missingPMDates.slice(0,4).map(d=>fDate(d)).join(', ');
    const extra=missingPMDates.length>4?` +${missingPMDates.length-4} mais`:'';
    const oldestMonth=missingPMDates[missingPMDates.length-1]?.slice(0,7)||'';
    alerts.push({
      tone:'info',
      title:'Rotina não registrada',
      summary:`${missingPremarket} dia(s) sem checklist: ${shown}${extra}.`,
      value:'Ir ao mês',
      actionFn:`openPMMonth('${oldestMonth}')`,
      actionLabel:'Abrir rotina',
    });
  }

  if(hesitation){
    alerts.push({
      tone:'warn',
      title:'Hesitação operacional',
      summary:`${hesitation} trade(s) foram marcados como hesitação ou não execução do plano.`,
      value:`${hesitation} marcação(ões)`,
      actionPage:'psych',
      actionLabel:'Ver psicológico',
    });
  }

  const order={danger:0,warn:1,info:2,safe:3};
  return alerts.sort((a,b)=>(order[a.tone]??9)-(order[b.tone]??9));
}

function renderNotificationsPage(){
  const acct=getActiveAccount();
  const alerts=buildOperationalAlerts(acct,getAccountTrades(activeAccountId)).map(alert=>({
    ...alert,
    summary:alert.summary,
  }));
  renderStatusList('notificationFeed',alerts,'Tudo dentro do esperado agora.');
}
