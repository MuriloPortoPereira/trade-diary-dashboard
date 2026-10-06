function renderStrategyHub(){
  const acctTrades=getAccountTrades(activeAccountId);
  const rows=getStrategySnapshots(acctTrades,activeAccountId);
  const el=document.getElementById('strategyHubMetrics');
  const profitable=rows.filter(row=>row.pnl>0);
  const best=rows[0];
  const worst=[...rows].reverse().find(row=>row.n>=2)||rows[rows.length-1];
  if(el){
    const stratLeaderTip=`<strong>Setup Líder</strong><p>Estratégia com maior P/L total no período. Use como referência para aumentar frequência e alocação nesse contexto específico.</p>`;
    const stratWeakTip=`<strong>Setup Mais Fraco</strong><p>Estratégia com pior resultado no período (mínimo 2 trades). Avalie se o contexto de mercado mudou, se o gatilho está correto ou se precisa de pausa.</p>`;
    const stratPosTip=`<strong>Estratégias Positivas</strong><p>Quantidade de setups com P/L positivo no período. Uma proporção alta indica diversificação saudável de contextos operacionais.</p>`;
    el.innerHTML=[
      {cls:'c-blue',lbl:'Estratégias ativas',val:rows.length||0,sub:'com trades fechados'},
      {cls:'c-green',lbl:'Setup líder',val:best?best.name:'—',sub:best?`${best.pnl>=0?'+':''}${fR(best.pnl)}`:'sem dados',tip:stratLeaderTip},
      {cls:'c-red',lbl:'Setup mais fraco',val:worst?worst.name:'—',sub:worst?`${worst.pnl>=0?'+':''}${fR(worst.pnl)}`:'sem dados',tip:stratWeakTip},
      {cls:'c-yellow',lbl:'Estratégias positivas',val:profitable.length,sub:`de ${rows.length||0} no período`,tip:stratPosTip},
    ].map(card=>`<div class="metric-card ${card.cls}"><div class="m-label-row"><span class="m-label">${card.lbl}</span>${card.tip?mkTip(card.tip):''}</div><div class="m-value">${escapeHtml(String(card.val))}</div><div class="m-sub">${escapeHtml(card.sub)}</div></div>`).join('');
  }
  renderStrategyRows('strategyHubBoard',rows,rows.length||5);
  renderStatusList('strategyHubFocus',[
    best?{tone:best.pnl>=0?'safe':'warn',title:'Alocar atenção onde funciona',summary:`${best.name} apresenta ${best.wr.toFixed(0)}% de win rate com ${best.n} trade(s).`,value:`${best.avgR>=0?'+':''}${best.avgR.toFixed(2)}R`,actionPage:'log',actionLabel:'Ver histórico'}:null,
    worst?{tone:'warn',title:'Reduzir exposição no setup fraco',summary:`${worst.name} está exigindo revisão de contexto, gatilho ou stop.`,value:`${worst.avgR>=0?'+':''}${worst.avgR.toFixed(2)}R`,actionPage:'documents',actionLabel:'Documentar'}:null,
    {tone:'info',title:'Biblioteca operacional',summary:'Use Risco & Setup para renomear, remover ou adicionar estratégias à base.',value:'Ajuste local',actionPage:'setup',actionLabel:'Abrir setup'},
  ].filter(Boolean),'As recomendações por estratégia aparecerão aqui.');
  const tbody=document.getElementById('strategyHubTable');
  if(tbody){
    tbody.innerHTML=rows.length?rows.map(row=>`<tr>
      <td><b>${escapeHtml(row.name)}</b></td>
      <td class="mono">${row.n}</td>
      <td class="mono">${row.wr.toFixed(1)}%</td>
      <td class="mono ${row.pnl>=0?'text-green':'text-red'}">${row.pnl>=0?'+':''}${fR(row.pnl)}</td>
      <td class="mono ${row.avgR>=0?'text-green':'text-red'}">${row.avgR>=0?'+':''}${row.avgR.toFixed(2)}R</td>
      <td class="mono">${formatStrategyRatio(row.sharpe)}</td>
      <td class="mono">${formatStrategyRatio(row.sortino)}</td>
      <td class="mono">${formatStrategyRatio(row.calmar)}</td>
      <td class="mono">${formatStrategyRatio(row.recovery)}</td>
      <td class="mono">${row.best!=null?`${row.best>=0?'+':''}${fR(row.best)}`:'—'}</td>
      <td class="mono">${row.lastDate?formatDocDate(row.lastDate):'—'}</td>
    </tr>`).join(''):'<tr><td colspan="11" class="text-muted">Sem dados suficientes para montar o comparativo.</td></tr>';
  }
}
