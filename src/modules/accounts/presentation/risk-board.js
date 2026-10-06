function renderRiskBoard(acct, acctTrades){
  const riskVal=document.getElementById('riskIdealTrade');
  const riskSub=document.getElementById('riskIdealTradeSub');
  const progressEl=document.getElementById('riskProgress');
  const signalsEl=document.getElementById('riskSignals');
  if(!riskVal||!riskSub||!progressEl||!signalsEl)return;

  const period=document.getElementById('dashPeriod')?.value||'all';
  const state=calcAccountRiskState(acct,acctTrades,period);

  // Painel esquerdo — risco ideal com mini-stats
  const dayPnlColor=state.dayPnl>=0?'var(--green)':'var(--red)';
  const totalPnlColor=state.totalPnl>=0?'var(--green)':'var(--red)';
  riskVal.textContent=state.riskLabel;
  riskSub.innerHTML=`
    <div class="risk-ideal-stats">
      <div class="risk-ideal-stat">
        <span>Saldo atual</span>
        <strong>${fR(state.currentBalance)}</strong>
      </div>
      <div class="risk-ideal-stat">
        <span>P/L hoje</span>
        <strong style="color:${dayPnlColor}">${state.dayPnl>=0?'+':''}${fR(state.dayPnl)}</strong>
      </div>
      <div class="risk-ideal-stat">
        <span>P/L total</span>
        <strong style="color:${totalPnlColor}">${state.totalPnl>=0?'+':''}${fR(state.totalPnl)}</strong>
      </div>
      <div class="risk-ideal-stat">
        <span>Ciclo</span>
        <strong>${state.cicloAtual+1} · ${f2(state.goalProgress*100)}%</strong>
      </div>
      <div class="risk-ideal-stat">
        <span>Risco / trade</span>
        <strong>${f2(acct.risk||0)}% · ${fR(state.riskPerTradeUsd)}</strong>
      </div>
    </div>`;

  // helpers de formatação
  const pctOf=(usd,base)=>base>0?` (${f2(usd/base*100)}%)`:' (—%)';

  const totalUsedPct=f2((state.totalUsageRaw||state.totalUsage)*100);
  const totalLimitPct=f2(acct.ddTotal||10);

  // Stop da sessão — hoje
  const barSessao={
    name:'Stop da sessão',tip:TIPS.stopSessao,
    badge:state.dayExcessUsd>0?'EXCEDEU':null,
    value:`${f2((state.dayUsageRaw||state.dayUsage)*100)}% de ${f2(acct.ddDaily||2)}%`,
    left:state.dayExcessUsd>0
      ? `Excedeu ${fR(state.dayExcessUsd)}${pctOf(state.dayExcessUsd,state.capitalBase)}`
      : `Perdido ${fR(state.dayLoss)}${pctOf(state.dayLoss,state.capitalBase)} · Restante ${fR(Math.max(state.dayLimit-state.dayLoss,0))}`,
    right:`Limite ${fR(state.dayLimit)} · P/L hoje ${state.dayPnl>=0?'+':''}${fR(state.dayPnl)}`,
    usage:state.dayUsage,
    tone:state.dayExcessUsd>0?'danger':usageTone(state.dayUsage),
  };

  // Stop da semana — semana corrente dom-sáb
  const barSemana={
    name:'Stop da semana',tip:TIPS.stopSemana,
    badge:state.weekExcessUsd>0?'EXCEDEU':null,
    value:`${f2((state.weekUsageRaw||state.weekUsage)*100)}% de ${f2(acct.ddWeekly||5)}%`,
    left:state.weekExcessUsd>0
      ? `Excedeu ${fR(state.weekExcessUsd)}${pctOf(state.weekExcessUsd,state.capitalBase)}`
      : `Perdido ${fR(state.weekLoss)}${pctOf(state.weekLoss,state.capitalBase)} · Restante ${fR(Math.max(state.weekLimit-state.weekLoss,0))}`,
    right:`Limite ${fR(state.weekLimit)} · P/L semana ${state.weekPnl>=0?'+':''}${fR(state.weekPnl)} · ${state.weekStartLabel}–${state.weekEndLabel}`,
    usage:state.weekUsage,
    tone:state.weekExcessUsd>0?'danger':usageTone(state.weekUsage),
  };

  // Drawdown total
  const barDD={
    name:'Drawdown total',tip:TIPS.ddTotal,
    badge:state.totalExcessUsd>0?'EXCEDEU':null,
    value:`${totalUsedPct}% de ${totalLimitPct}% · DD ${f2(state.currentDdPct*100)}%`,
    left:state.totalExcessUsd>0
      ? `Excedeu ${fR(state.totalExcessUsd)}${pctOf(state.totalExcessUsd,state.ddBase)}`
      : `DD atual ${fR(state.currentDdUsd)}${pctOf(state.currentDdUsd,state.ddBase)} · Saldo ${fR(state.currentBalance)}`
        +(state.cicloAtual>0?` · ciclo ${state.cicloAtual+1}`:''),
    right:`Limite ${fR(state.totalLimit)} · Base ${fR(state.cicloBase)}`,
    usage:state.totalUsage,
    tone:state.totalExcessUsd>0?'danger':usageTone(state.totalUsage),
  };

  // Meta da conta
  const metaFalta=Math.max(state.goalTarget-state.pnlNoCiclo,0);
  const barMeta={
    name:'Meta da conta',tip:TIPS.meta,
    badge:state.goalProgress>=1?'ATINGIDA':null,
    value:`Ciclo ${state.cicloAtual+1} · ${f2(state.goalProgress*100)}% concluído`,
    left:`P/L ciclo ${state.pnlNoCiclo>=0?'+':''}${fR(state.pnlNoCiclo)}${pctOf(Math.abs(state.pnlNoCiclo),state.cicloBase)} · total ${state.totalPnl>=0?'+':''}${fR(state.totalPnl)}`,
    right:metaFalta>0?`Falta ${fR(metaFalta)} · alvo ${fR(state.cicloAlvo)} · +${f2(acct.goalPct||10)}%`:`Meta atingida · próximo alvo ${fR(state.cicloAlvo)}`,
    usage:state.goalProgress,
    tone:state.goalProgress>=1?'safe':'neutral',
  };

  const progressItems=[barSessao, barSemana, barDD, barMeta];

  progressEl.innerHTML=progressItems.map(item=>`
    <div class="risk-progress-item">
      <div class="risk-progress-head">
        <span class="risk-progress-name">${item.name}${item.tip?' '+mkTip(item.tip):''}${item.badge?` <span class="risk-badge risk-badge-${item.tone}">${item.badge}</span>`:''}</span>
        <span class="risk-progress-value risk-progress-value--${item.tone}">${item.value}</span>
      </div>
      <div class="risk-progress-track">
        <div class="risk-progress-fill ${item.tone==='warn'?'warn':item.tone==='danger'?'danger':item.tone==='safe'?'safe':''}" style="width:${Math.max(item.usage*100,4)}%"></div>
      </div>
      <div class="risk-progress-meta">
        <span>${item.left}</span>
        <span>${item.right}</span>
      </div>
    </div>`).join('');

  // Chips de sinais — concisos e com números
  const signals=[
    state.totalExcessUsd>0
      ? {tone:'danger', text:`DD excedeu ${fR(state.totalExcessUsd)} (${f2(state.totalExcessPct)}%)`}
      : state.totalUsage>=0.85
        ? {tone:'warn', text:`DD em ${f2(state.totalUsage*100)}% do limite — atenção`}
        : {tone:'safe', text:`DD ${f2(state.currentDdPct*100)}% · limite ${f2(acct.ddTotal||10)}%`},
    state.dayExcessUsd>0
      ? {tone:'danger', text:`Sessão excedeu limite em ${fR(state.dayExcessUsd)}`}
      : state.dayUsage>=0.8
        ? {tone:'warn', text:`Sessão ${f2(state.dayUsage*100)}% do stop · cuidado`}
        : {tone:'safe', text:`Sessão P/L ${state.dayPnl>=0?'+':''}${fR(state.dayPnl)} · ${f2(state.dayUsage*100)}% do stop`},
    state.weekExcessUsd>0
      ? {tone:'danger', text:`Semana excedeu limite em ${fR(state.weekExcessUsd)}`}
      : state.weekPnl<0
        ? {tone:'warn', text:`Semana ${fR(state.weekPnl)} · ${f2(state.weekUsage*100)}% do stop`}
        : {tone:'safe', text:`Semana +${fR(state.weekPnl)} · stop livre`},
    state.goalProgress>=1
      ? {tone:'safe', text:`Meta do ciclo ${state.cicloAtual+1} atingida`}
      : {tone:'neutral', text:`Meta ${f2(state.goalProgress*100)}% · falta ${fR(metaFalta)}`},
  ];
  signalsEl.innerHTML=signals.map(s=>`<div class="risk-alert-chip ${s.tone}">${s.text}</div>`).join('');
}
