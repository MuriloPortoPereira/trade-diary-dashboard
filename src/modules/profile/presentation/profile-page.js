function renderProfilePage(){
  const acct=getActiveAccount();
  const acctTrades=getAccountTrades(activeAccountId);
  const m=calcMetrics(acctTrades,acct.id);
  const risk=calcAccountRiskState(acct,acctTrades);
  const hero=document.getElementById('profileHero');
  const riskPanel=document.getElementById('profileRiskPanel');
  const tags=document.getElementById('profileTags');
  if(hero){
    hero.innerHTML=`
      <div class="profile-hero-head">
        <div class="page-kicker">Conta ativa</div>
        <div class="page-title" style="font-size:34px">${escapeHtml(acct.name)}</div>
        <div class="page-sub">${escapeHtml(acctTypeLabel(acct.type))} · ${acctTrades.length} trades registrados</div>
      </div>
      <div class="hero-metric-grid">
        <div class="hero-metric-stat"><span>P/L total</span><strong class="${m.totalPnl>=0?'text-green':'text-red'}">${m.totalPnl>=0?'+':''}${fR(m.totalPnl)}</strong></div>
        <div class="hero-metric-stat"><span>Expectância</span><strong>${m.exp>=0?'+':''}${m.exp.toFixed(3)}R</strong></div>
        <div class="hero-metric-stat"><span>Profit factor</span><strong>${isFinite(m.pf)?m.pf.toFixed(2):'∞'}</strong></div>
        <div class="hero-metric-stat"><span>Meta</span><strong>${Math.round(risk.goalProgress*100)}%</strong></div>
      </div>`;
  }
  if(riskPanel){
    riskPanel.innerHTML=`
      <div class="chart-title">Mandatos de risco</div>
      <div class="status-list compact">
        <div class="status-item info"><div class="status-item-copy"><div class="status-item-title">Risco padrão</div><div class="status-item-summary">${escapeHtml(risk.riskSub)}</div></div><div class="status-item-value">${escapeHtml(risk.riskLabel)}</div></div>
        <div class="status-item ${risk.dayUsage>=0.7?'warn':'safe'}"><div class="status-item-copy"><div class="status-item-title">Limite diário</div><div class="status-item-summary">Uso em ${Math.round(risk.dayUsage*100)}% do limite.</div></div><div class="status-item-value">${fR(risk.dayLimit)}</div></div>
        <div class="status-item ${risk.totalUsage>=0.7?'warn':'safe'}"><div class="status-item-copy"><div class="status-item-title">DD máximo</div><div class="status-item-summary">Drawdown atual de ${(risk.currentDdPct*100).toFixed(2)}%.</div></div><div class="status-item-value">${fR(risk.totalLimit)}</div></div>
      </div>`;
  }
  if(tags){
    tags.innerHTML=`
      <div class="tag-cloud-block">
        <div class="tag-cloud-title">Estratégias</div>
        <div class="tag-list">${config.strategies.map(tag=>`<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      </div>
      <div class="tag-cloud-block">
        <div class="tag-cloud-title">Emoções</div>
        <div class="tag-list">${config.emotions.map(tag=>`<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      </div>
      <div class="tag-cloud-block">
        <div class="tag-cloud-title">Mercados</div>
        <div class="tag-list">${config.markets.map(tag=>`<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      </div>`;
  }
  renderStatusList('profileFocus',buildOperationalAlerts(acct,acctTrades).slice(0,4),'Os focos imediatos aparecem aqui conforme os trades são registrados.');
}
