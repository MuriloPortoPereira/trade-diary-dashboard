function renderStrategyCompareCards(rows){
  const wrap=document.getElementById('stStratCompare');
  if(!wrap)return;
  const selectedA=document.getElementById('stStratA')?.value||'';
  const selectedB=document.getElementById('stStratB')?.value||'';
  const byName=new Map(rows.map(row=>[row.name,row]));
  const rowA=byName.get(selectedA);
  const rowB=byName.get(selectedB);
  const cardsEl=document.getElementById('stCmpCards');
  const insightsEl=document.getElementById('stCmpInsights');
  const summaryEl=document.getElementById('stCmpSummaryBody');
  const metricExplainEl=document.getElementById('stCmpMetricExplain');
  const outcomeExplainEl=document.getElementById('stCmpOutcomeExplain');
  const timingExplainEl=document.getElementById('stCmpTimingExplain');
  const emptyEl=document.getElementById('stCmpEmpty');
  const fullEl=document.getElementById('stCmpFull');
  const defs=getStrategyCompareMetricDefs();
  wrap.style.display='block';
  const renderEmptyState=(message,subMessage='')=>{
    if(fullEl)fullEl.style.display='none';
    if(emptyEl){
      emptyEl.style.display='grid';
      emptyEl.innerHTML=`<div>
        <div class="table-title">Escolha Estratégia A e Estratégia B</div>
        <div class="strategy-compare-note">${escapeHtml(message)}</div>
      </div>
      <div class="strategy-compare-empty-grid">
        <div class="strategy-compare-empty-card">
          <span>Estratégia A</span>
          <strong>${escapeHtml(selectedA||'Aguardando seleção')}</strong>
        </div>
        <div class="strategy-compare-empty-card">
          <span>Estratégia B</span>
          <strong>${escapeHtml(selectedB||'Aguardando seleção')}</strong>
        </div>
        <div class="strategy-compare-empty-card">
          <span>Próximo passo</span>
          <strong>${escapeHtml(subMessage||'Selecione as duas estratégias para liberar curva, gráficos e resumo final.')}</strong>
        </div>
      </div>`;
    }
    if(cardsEl)cardsEl.innerHTML='';
    if(summaryEl)summaryEl.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted)">Selecione Estratégia A e Estratégia B para ver o comparativo completo.</td></tr>';
    if(insightsEl)insightsEl.textContent='Comparação completa liberada quando as duas estratégias estiverem escolhidas.';
    if(metricExplainEl)metricExplainEl.textContent='';
    if(outcomeExplainEl)outcomeExplainEl.textContent='';
    if(timingExplainEl)timingExplainEl.textContent='';
    renderAnalysisSummary('stCmpMetricSummary',[]);
    renderAnalysisSummary('stCmpOutcomeSummary',[]);
    renderAnalysisSummary('stCmpTimingSummary',[]);
  };
  const renderDetailCard=(targetId,label,row,leaderCount=0)=>{
    const el=document.getElementById(targetId);
    if(!el)return;
    if(!row){
      el.innerHTML=`<div class="chart-title">${label}</div><div style="font-size:12px;color:var(--muted);padding:8px 0">Selecione uma estratégia para comparar.</div>`;
      return;
    }
    const timing=getTradeTimingStats(row.trades).overall;
    el.innerHTML=`<div class="chart-title">${label}: ${escapeHtml(row.name)}</div>
      <div class="analysis-summary-grid">
        <div class="analysis-summary-chip info"><div class="analysis-summary-label">Trades</div><div class="analysis-summary-value">${row.n}</div><div class="analysis-summary-sub">${row.wins} WIN · ${row.n-row.wins} não-WIN</div></div>
        <div class="analysis-summary-chip ${row.pnl>=0?'safe':'danger'}"><div class="analysis-summary-label">P/L</div><div class="analysis-summary-value">${row.pnl>=0?'+':''}${fR(row.pnl)}</div><div class="analysis-summary-sub">melhor ${row.best!=null?(row.best>=0?'+':'')+fR(row.best):'—'}</div></div>
        <div class="analysis-summary-chip"><div class="analysis-summary-label">Timing</div><div class="analysis-summary-value">${formatClockMinutes(timing.avgOpenMinutes)}</div><div class="analysis-summary-sub">dur. ${formatDurationMinutes(timing.avgDurationMinutes)}</div></div>
        <div class="analysis-summary-chip ${leaderCount>0?'safe':'info'}"><div class="analysis-summary-label">Destaque</div><div class="analysis-summary-value">${leaderCount}</div><div class="analysis-summary-sub">métrica(s) lideradas</div></div>
      </div>`;
    el.innerHTML+=`<div class="strategy-compare-note">${row.n<10?'Amostra ainda curta para leitura definitiva.':'Base mais firme para comparar consistência e execução.'} Último trade em ${fDate(row.lastDate)}.</div>`;
  };
  const buildTopCard=row=>{
    if(!row)return'';
    const timing=getTradeTimingStats(row.trades).overall;
    return `<div class="chart-card strategy-compare-card">
      <div class="chart-title">${escapeHtml(row.name)}</div>
      <div class="strategy-compare-metrics">
        ${defs.map(def=>`<div class="strategy-compare-metric"><span>${def.label}</span><strong>${def.format(def.get(row))}</strong></div>`).join('')}
        <div class="strategy-compare-metric"><span>Hora média</span><strong>${formatClockMinutes(timing.avgOpenMinutes)}</strong></div>
      </div>
      <div class="strategy-compare-note">${row.n<10?'Amostra pequena: use como leitura inicial.':'Amostra forte o bastante para comparar padrão de resultado e timing.'}</div>
    </div>`;
  };
  if(!rows.length){
    renderEmptyState('Ainda não há trades fechados suficientes por estratégia nesse período.','Registre operações fechadas com setup preenchido para comparar desempenho.');
    renderDetailCard('stCmpA','Estratégia A',null,0);
    renderDetailCard('stCmpB','Estratégia B',null,0);
    return;
  }
  if(!rowA||!rowB||rowA.name===rowB.name){
    renderEmptyState(
      rowA&&rowB&&rowA.name===rowB.name
        ? 'Escolha duas estratégias diferentes para evitar comparação duplicada.'
        : 'Selecione as duas estratégias para abrir a curva, os gráficos e o resumo comparativo.',
      rowA&&rowB&&rowA.name===rowB.name
        ? 'Troque uma das estratégias e o painel completo aparece em seguida.'
        : 'Quando A e B estiverem preenchidas, a comparação completa aparece aqui.'
    );
    renderDetailCard('stCmpA','Estratégia A',rowA,0);
    renderDetailCard('stCmpB','Estratégia B',rowB,0);
    return;
  }
  if(emptyEl)emptyEl.style.display='none';
  if(fullEl)fullEl.style.display='grid';

  const outcomeA=getStrategyOutcomeStats(rowA);
  const outcomeB=getStrategyOutcomeStats(rowB);
  const timingA=getTradeTimingStats(rowA.trades).overall;
  const timingB=getTradeTimingStats(rowB.trades).overall;
  const dominantA=getDominantTimingWindow(rowA.trades,30);
  const dominantB=getDominantTimingWindow(rowB.trades,30);
  const leaderCounts={[rowA.name]:0,[rowB.name]:0,Empate:0};
  if(cardsEl)cardsEl.innerHTML=[buildTopCard(rowA),buildTopCard(rowB)].filter(Boolean).join('');
  if(summaryEl){
    summaryEl.innerHTML=defs.map(def=>{
      const winner=getStrategyMetricWinner(def,rowA,rowB);
      if(leaderCounts[winner]!=null)leaderCounts[winner]++;
      const winnerClass=winner==='Empate'?'text-muted':'strategy-compare-winner';
      return `<tr>
        <td>${def.label}</td>
        <td class="mono">${def.format(def.get(rowA))}</td>
        <td class="mono">${def.format(def.get(rowB))}</td>
        <td class="${winnerClass}">${escapeHtml(winner)}</td>
      </tr>`;
    }).join('');
  }
  renderDetailCard('stCmpA','Estratégia A',rowA,leaderCounts[rowA.name]||0);
  renderDetailCard('stCmpB','Estratégia B',rowB,leaderCounts[rowB.name]||0);
  if(insightsEl){
    const leadName=(leaderCounts[rowA.name]||0)===(leaderCounts[rowB.name]||0)
      ? 'Empate técnico'
      : (leaderCounts[rowA.name]||0)>(leaderCounts[rowB.name]||0)?rowA.name:rowB.name;
    const leadCount=Math.max(leaderCounts[rowA.name]||0,leaderCounts[rowB.name]||0);
    const sampleNote=rowA.n<10||rowB.n<10?' · Base curta em pelo menos uma das estratégias.':'';
    insightsEl.textContent=leadName==='Empate técnico'
      ? `Empate técnico nas métricas principais${sampleNote}`
      : `${leadName} lidera em ${leadCount} de ${defs.length} métricas${sampleNote}`;
  }
  if(metricExplainEl){
    metricExplainEl.textContent='Barras normalizadas por métrica: 100 marca o líder daquele critério. Use o resumo abaixo para ler os valores reais sem misturar unidades diferentes.';
  }
  renderAnalysisSummary('stCmpMetricSummary',[
    {tone:'safe',label:'Retorno',value:getStrategyMetricWinner(defs.find(def=>def.key==='pnl'),rowA,rowB),sub:`${rowA.name} ${(rowA.pnl>=0?'+':'')+fR(rowA.pnl)} · ${rowB.name} ${(rowB.pnl>=0?'+':'')+fR(rowB.pnl)}`},
    {tone:'info',label:'Expectância',value:getStrategyMetricWinner(defs.find(def=>def.key==='exp'),rowA,rowB),sub:`${rowA.exp>=0?'+':''}${rowA.exp.toFixed(3)}R · ${rowB.exp>=0?'+':''}${rowB.exp.toFixed(3)}R`},
    {tone:'warn',label:'Profit Factor',value:getStrategyMetricWinner(defs.find(def=>def.key==='pf'),rowA,rowB),sub:`${formatStrategyRatio(rowA.pf)} · ${formatStrategyRatio(rowB.pf)}`},
    {tone:'danger',label:'Drawdown',value:getStrategyMetricWinner(defs.find(def=>def.key==='maxDD'),rowA,rowB),sub:`${((rowA.maxDD||0)*100).toFixed(1)}% · ${((rowB.maxDD||0)*100).toFixed(1)}%`},
  ]);

  const equityA=buildStrategyEquitySeries(rowA);
  const equityB=buildStrategyEquitySeries(rowB);
  const maxLen=Math.max(equityA.points.length,equityB.points.length,1);
  const labels=Array.from({length:maxLen},(_,i)=>i===0?'Início':`T${i}`);
  const padSeries=(points)=>Array.from({length:maxLen},(_,i)=>i<points.length?points[i]:null);
  mkChart('stCmpEquityChart',{
    type:'line',
    data:{
      labels,
      datasets:[
        buildSignedEquityDataset(padSeries(equityA.points),{label:rowA.name,borderColor:'rgba(34,213,237,.95)',pointBackgroundColor:'rgba(34,213,237,.95)',pointBorderColor:'rgba(34,213,237,.95)',backgroundColor:'rgba(34,213,237,.12)',fill:false,spanGaps:false}),
        buildSignedEquityDataset(padSeries(equityB.points),{label:rowB.name,borderColor:'rgba(255,206,103,.95)',pointBackgroundColor:'rgba(255,206,103,.95)',pointBorderColor:'rgba(255,206,103,.95)',backgroundColor:'rgba(255,206,103,.12)',fill:false,spanGaps:false}),
      ],
    },
    options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:true,labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}}},
  });

  const metricChartDefs=defs.filter(def=>def.key!=='n');
  const metricScores=metricChartDefs.map(def=>getStrategyCompareScores(def,rowA,rowB));
  mkChart('stCmpMetricBarsChart',{
    type:'bar',
    data:{
      labels:metricChartDefs.map(def=>def.label),
      datasets:[
        {label:rowA.name,data:metricScores.map(score=>score[0]),backgroundColor:'rgba(34,213,237,.62)',borderColor:'transparent',borderRadius:4,maxBarThickness:28},
        {label:rowB.name,data:metricScores.map(score=>score[1]),backgroundColor:'rgba(255,206,103,.62)',borderColor:'transparent',borderRadius:4,maxBarThickness:28},
      ],
    },
    options:{...CHART_OPTS,indexAxis:'y',scales:{...CHART_OPTS.scales,x:{...CHART_OPTS.scales.x,max:100},y:{...CHART_OPTS.scales.y}},plugins:{...CHART_OPTS.plugins,legend:{display:true,labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}}},
  });

  if(outcomeExplainEl){
    outcomeExplainEl.textContent='Composição WIN/LOSS/BE por estratégia. O resumo destaca mediana por trade, extremos e a qualidade média dos ganhos e perdas.';
  }
  mkChart('stCmpOutcomeChart',{
    type:'bar',
    data:{
      labels:[rowA.name,rowB.name],
      datasets:[
        {label:'WIN',data:[outcomeA.wins,outcomeB.wins],backgroundColor:'rgba(69,224,123,.68)',borderColor:'transparent',borderRadius:4,maxBarThickness:40,stack:'results'},
        {label:'LOSS',data:[outcomeA.losses,outcomeB.losses],backgroundColor:'rgba(255,93,104,.68)',borderColor:'transparent',borderRadius:4,maxBarThickness:40,stack:'results'},
        {label:'BE',data:[outcomeA.bes,outcomeB.bes],backgroundColor:'rgba(255,206,103,.72)',borderColor:'transparent',borderRadius:4,maxBarThickness:40,stack:'results'},
      ],
    },
    options:{...CHART_OPTS,scales:{...CHART_OPTS.scales,x:{...CHART_OPTS.scales.x,stacked:true},y:{...CHART_OPTS.scales.y,stacked:true}},plugins:{...CHART_OPTS.plugins,legend:{display:true,labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}}},
  });
  const medianWinner=(outcomeA.medianPnl??-Infinity)===(outcomeB.medianPnl??-Infinity)?'Empate':(outcomeA.medianPnl??-Infinity)>(outcomeB.medianPnl??-Infinity)?rowA.name:rowB.name;
  const bestWinner=(outcomeA.bestPnl??-Infinity)===(outcomeB.bestPnl??-Infinity)?'Empate':(outcomeA.bestPnl??-Infinity)>(outcomeB.bestPnl??-Infinity)?rowA.name:rowB.name;
  const worstWinner=(outcomeA.worstPnl??-Infinity)===(outcomeB.worstPnl??-Infinity)?'Empate':(outcomeA.worstPnl??-Infinity)>(outcomeB.worstPnl??-Infinity)?rowA.name:rowB.name;
  renderAnalysisSummary('stCmpOutcomeSummary',[
    {tone:'info',label:'Mediana',value:medianWinner,sub:`${outcomeA.medianPnl!=null?(outcomeA.medianPnl>=0?'+':'')+fR(outcomeA.medianPnl):'—'} · ${outcomeB.medianPnl!=null?(outcomeB.medianPnl>=0?'+':'')+fR(outcomeB.medianPnl):'—'}`},
    {tone:'safe',label:'Melhor trade',value:bestWinner,sub:`${outcomeA.bestPnl!=null?(outcomeA.bestPnl>=0?'+':'')+fR(outcomeA.bestPnl):'—'} · ${outcomeB.bestPnl!=null?(outcomeB.bestPnl>=0?'+':'')+fR(outcomeB.bestPnl):'—'}`},
    {tone:'danger',label:'Pior trade',value:worstWinner,sub:`${outcomeA.worstPnl!=null?(outcomeA.worstPnl>=0?'+':'')+fR(outcomeA.worstPnl):'—'} · ${outcomeB.worstPnl!=null?(outcomeB.worstPnl>=0?'+':'')+fR(outcomeB.worstPnl):'—'}`},
    {tone:'warn',label:'WIN/LOSS/BE',value:`${outcomeA.winRatePct.toFixed(0)}/${outcomeA.lossRatePct.toFixed(0)}/${outcomeA.beRatePct.toFixed(0)} · ${outcomeB.winRatePct.toFixed(0)}/${outcomeB.lossRatePct.toFixed(0)}/${outcomeB.beRatePct.toFixed(0)}`,sub:`Avg WIN ${outcomeA.avgWinPnl!=null?(outcomeA.avgWinPnl>=0?'+':'')+fR(outcomeA.avgWinPnl):'—'} · ${outcomeB.avgWinPnl!=null?(outcomeB.avgWinPnl>=0?'+':'')+fR(outcomeB.avgWinPnl):'—'}`},
  ]);

  if(timingExplainEl){
    timingExplainEl.textContent='Timing compara hora média de acionamento, hora média de saída e duração média. Entrada e saída usam o eixo esquerdo (horário do dia); duração usa o eixo direito (minutos).';
  }
  mkChart('stCmpTimingChart',{
    type:'bar',
    data:{
      labels:[rowA.name,rowB.name],
      datasets:[
        {label:'Entrada média',data:[timingA.avgOpenMinutes||0,timingB.avgOpenMinutes||0],backgroundColor:'rgba(34,213,237,.62)',borderColor:'transparent',borderRadius:4,maxBarThickness:30,yAxisID:'y'},
        {label:'Saída média',data:[timingA.avgExitMinutes||0,timingB.avgExitMinutes||0],backgroundColor:'rgba(99,169,255,.58)',borderColor:'transparent',borderRadius:4,maxBarThickness:30,yAxisID:'y'},
        {type:'line',label:'Duração média',data:[timingA.avgDurationMinutes||0,timingB.avgDurationMinutes||0],borderColor:'rgba(255,206,103,.92)',backgroundColor:'rgba(255,206,103,.22)',borderWidth:2,pointRadius:3,pointHoverRadius:4,tension:.24,yAxisID:'y1'},
      ],
    },
    options:{...CHART_OPTS,scales:{...CHART_OPTS.scales,y:{...CHART_OPTS.scales.y,position:'left',ticks:{...CHART_OPTS.scales.y.ticks,callback:value=>formatClockMinutes(value)}},y1:{...CHART_OPTS.scales.y,position:'right',grid:{display:false},ticks:{...CHART_OPTS.scales.y.ticks,callback:value=>`${Math.round(Number(value)||0)} min`}}},plugins:{...CHART_OPTS.plugins,legend:{display:true,labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}}},
  });
  renderAnalysisSummary('stCmpTimingSummary',[
    {tone:'info',label:'Entrada média',value:`${formatClockMinutes(timingA.avgOpenMinutes)} · ${formatClockMinutes(timingB.avgOpenMinutes)}`,sub:'hora de acionamento'},
    {tone:'info',label:'Saída média',value:`${formatClockMinutes(timingA.avgExitMinutes)} · ${formatClockMinutes(timingB.avgExitMinutes)}`,sub:'hora de encerramento'},
    {tone:'warn',label:'Duração média',value:`${formatDurationMinutes(timingA.avgDurationMinutes)} · ${formatDurationMinutes(timingB.avgDurationMinutes)}`,sub:'tempo típico por operação'},
    {tone:'safe',label:'Janela dominante',value:`${dominantA.label} · ${dominantB.label}`,sub:`${dominantA.count} trades · ${dominantB.count} trades`},
  ]);
}
