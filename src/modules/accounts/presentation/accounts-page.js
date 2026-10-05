function renderAccountsPage(){
  const metricsEl=document.getElementById('accountsMetrics');
  const overviewEl=document.getElementById('accountsOverview');
  if(metricsEl){
    const totalCapital=accounts.reduce((sum,acct)=>{
      const risk=calcAccountRiskState(acct,getAccountTrades(acct.id));
      return sum+risk.currentBalance;
    },0);
    const capitalTip=`<strong>Capital Consolidado</strong><p>Soma dos saldos atuais de todas as contas cadastradas (capital base + P/L acumulado). Reflete o patrimônio total sob gestão no diário.</p>`;
    metricsEl.innerHTML=[
      {cls:'c-blue',lbl:'Contas ativas',val:accounts.length,sub:'ambientes monitorados'},
      {cls:'c-green',lbl:'Capital consolidado',val:fR(totalCapital),sub:'saldo base + P/L',tip:capitalTip},
      {cls:'c-yellow',lbl:'Conta em foco',val:getActiveAccount()?.name||'—',sub:acctTypeLabel(getActiveAccount()?.type)},
      {cls:'c-purple',lbl:'Trades totais',val:accounts.reduce((s,a)=>s+getAccountTrades(a.id).length,0),sub:'somado por conta'},
    ].map(card=>`<div class="metric-card ${card.cls}"><div class="m-label-row"><span class="m-label">${card.lbl}</span>${card.tip?mkTip(card.tip):''}</div><div class="m-value">${escapeHtml(String(card.val))}</div><div class="m-sub">${escapeHtml(card.sub)}</div></div>`).join('');
  }
  if(!overviewEl)return;
  overviewEl.innerHTML=accounts.map(acct=>{
    const acctTrades=getAccountTrades(acct.id);
    const m=calcMetrics(acctTrades,acct.id);
    const risk=calcAccountRiskState(acct,acctTrades);
    return `<div class="account-overview-card">
      <div class="account-overview-head">
        <div>
          <div class="account-overview-title"><span class="account-color-dot" style="background:${acct.color}"></span>${escapeHtml(acct.name)}</div>
          <div class="account-overview-sub">${escapeHtml(acctTypeLabel(acct.type))} · ${acctTrades.length} trades</div>
        </div>
        <div class="account-overview-actions">
          ${acct.id===activeAccountId?'<span class="badge long">Ativa</span>':`<button class="btn btn-ghost btn-sm" onclick="selectAccount('${acct.id}')">Usar</button>`}
          <button class="btn btn-ghost btn-sm" onclick="editAccount('${acct.id}')">Editar</button>
        </div>
      </div>
      <div class="account-overview-stats">
        <div><span>Saldo atual</span><strong>${fR(risk.currentBalance)}</strong></div>
        <div><span>Aportes</span><strong class="${risk.cashflowNet>=0?'text-green':'text-red'}">${risk.cashflowNet>=0?'+':''}${fR(risk.cashflowNet)}</strong></div>
        <div><span>P/L</span><strong class="${m.totalPnl>=0?'text-green':'text-red'}">${m.totalPnl>=0?'+':''}${fR(m.totalPnl)}</strong></div>
        <div><span>DD atual</span><strong>${(risk.currentDdPct*100).toFixed(2)}%</strong></div>
      </div>
      <div class="account-risk-bars">
        <div class="account-risk-row"><span>Stop diário</span><div class="mini-progress"><span style="width:${risk.dayUsage*100}%"></span></div><strong>${Math.round(risk.dayUsage*100)}%</strong></div>
        <div class="account-risk-row"><span>Stop semanal</span><div class="mini-progress"><span style="width:${risk.weekUsage*100}%"></span></div><strong>${Math.round(risk.weekUsage*100)}%</strong></div>
        <div class="account-risk-row"><span>Meta</span><div class="mini-progress"><span style="width:${risk.goalProgress*100}%"></span></div><strong>${Math.round(risk.goalProgress*100)}%</strong></div>
      </div>
    </div>`;
  }).join('');
}
