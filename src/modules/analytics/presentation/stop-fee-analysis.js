function renderStopFeeAnalysis(targetId, acct, acctTrades){
  const el=document.getElementById(targetId);
  if(!el)return;
  const a=buildStopFeeAnalysis(acct,acctTrades);
  const feeTone=a.edgeRemovedPct>=25||a.feeDragPct>=25?'warn':'safe';

  const tipDiasStop=`<strong>Dias acima do stop diário</strong><p>Conta quantos dias do período o P/L diário ultrapassou o limite de perda configurado (ex: 2% do capital).</p><p><b>Como é calculado:</b> agrupa os trades por data, soma o P/L de cada dia e verifica se a perda superou o limite diário.</p><div class="tip-row"><span>0 dias</span><span>Disciplina perfeita no período</span></div><div class="tip-row"><span>1–3 dias</span><span>Ocorrências pontuais — atenção</span></div><div class="tip-row"><span>Frequente</span><span>Problema sistemático de controle de risco</span></div>`;
  const tipStopSemMes=`<strong>Stops de Semana e Mês atingidos</strong><p>Número de semanas e meses em que o P/L acumulado ultrapassou o limite configurado para o período.</p><p><b>Como é calculado:</b> agrupa trades por semana (dom–sáb) e por mês, e verifica se a perda acumulada em cada janela superou os limites de stop semanal e mensal.</p><div class="tip-row"><span>0S · 0M</span><span>Todos os períodos dentro do limite</span></div><div class="tip-row"><span>Semanas frequentes</span><span>Revise o tamanho de posição</span></div>`;
  const tipTaxas=`<strong>Taxas Pagas</strong><p>Total de taxas, comissões e spread pagos no período, com base nos campos de fee registrados nos trades.</p><p><b>Como é calculado:</b> soma o campo <em>fee</em> de todos os trades fechados. O valor em R mostra quantos riscos foram consumidos só pelas taxas.</p><div class="tip-row"><span>Taxas em R baixas (&lt;0.3R)</span><span>Custo operacional saudável</span></div><div class="tip-row"><span>Taxas em R altas (&gt;0.5R)</span><span>Taxas corroendo o edge</span></div>`;
  const tipEdge=`<strong>Edge Removido pelas Taxas</strong><p>Percentual da expectância bruta que foi consumido pelas taxas. Mostra o impacto real do custo operacional no seu setup.</p><p><b>Como é calculado:</b> compara a expectância por trade antes e depois das taxas. Se o setup tem expectância bruta de +0.3R e depois das taxas cai para +0.15R, 50% do edge foi removido.</p><div class="tip-row"><span>Abaixo de 15%</span><span>Custo aceitável</span></div><div class="tip-row"><span>15–30%</span><span>Atenção — avalie o setup</span></div><div class="tip-row"><span>Acima de 30%</span><span>Taxas destruindo a vantagem</span></div>`;

  const cards=[
    {
      tone:a.daysOverDailyStop?'danger':'safe',
      label:'Dias acima do stop',
      tip:tipDiasStop,
      value:`${a.daysOverDailyStop}`,
      badge:`${a.daysOverDailyStopPct}% dos dias`,
      sub:`Limite diário ${fR(a.dayLimit)} · ${a.days} dia(s) no período`,
    },
    {
      tone:a.weeksOverWeeklyStop||a.monthsOverMonthlyStop?'warn':'safe',
      label:'Stops semana / mês',
      tip:tipStopSemMes,
      value:`${a.weeksOverWeeklyStop}S · ${a.monthsOverMonthlyStop}M`,
      badge:a.weeksOverWeeklyStop||a.monthsOverMonthlyStop?'atingido':'dentro do limite',
      sub:`Stop semana ${fR(a.weekLimit)} · Stop mês ${fR(a.monthLimit)}`,
    },
    {
      tone:a.totalFees>0?'warn':'safe',
      label:'Taxas pagas',
      tip:tipTaxas,
      value:fR(a.totalFees),
      badge:`${a.feesInR.toFixed(2)}R consumidos`,
      sub:`${fR(a.feePerTrade)} / trade · ${a.feesInR.toFixed(2)}R total`,
    },
    {
      tone:feeTone,
      label:'Edge removido',
      tip:tipEdge,
      value:a.expectancyBeforeFees>0?`${a.edgeRemovedPct}%`:`${a.feeDragPct}%`,
      badge:feeTone==='warn'?'alto impacto':'aceitável',
      sub:`Expect. antes ${fR(a.expectancyBeforeFees)} · depois ${fR(a.expectancyAfterFees)}`,
    },
  ];
  el.innerHTML=cards.map(card=>`<div class="risk-insight-item ${card.tone}">
    <div class="risk-insight-label">${card.label} ${mkTip(card.tip)}</div>
    <div class="risk-insight-value">${card.value} <span class="risk-insight-badge ${card.tone}">${card.badge}</span></div>
    <div class="risk-insight-sub">${card.sub}</div>
  </div>`).join('');
}
