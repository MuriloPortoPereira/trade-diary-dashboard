function renderDashboard(){
  const acct=getActiveAccount();
  const acctTrades=getAccountTrades(acct.id);
  const acctRisk=syncAccountBalanceChrome(acct,acctTrades);
  const period=document.getElementById('dashPeriod')?.value||'all';
  const arr=filterByPeriod(acctTrades,period);
  const m=calcMetrics(arr,acct.id);
  const pLabels={all:t('dash.period.all'),today:t('dash.period.today'),month:t('dash.period.month'),week:t('dash.period.week'),year:t('dash.period.year')};
  document.getElementById('dashSub').textContent=`${arr.length} trades · ${pLabels[period]} · ${m.closed.length} ${t('misc.closed','fechados')}`;
  const bal=acctRisk?.currentBalance??getAccountCurrentBalance(acct,acctTrades);
  const dashboardBase=acctRisk?.capitalBase??getAccountCapitalBase(acct);
  document.getElementById('dashMetrics').innerHTML=[
    {cls:'c-green',lbl:t('metric.netPnl','Lucro líquido'),val:(m.totalPnl>=0?'+':'')+fR(m.totalPnl),sub:`${t('metric.currentBalance','saldo atual')} ${fR(bal)}`,tip:TIPS.pnl},
    {cls:'c-blue',lbl:t('metric.pf','Fator de lucro'),val:isFinite(m.pf)?m.pf.toFixed(2):'∞',sub:`${t('metric.exp','expectância')} ${m.exp>=0?'+':''}${m.exp.toFixed(2)}R ${mkTip(TIPS.exp)}`,tip:TIPS.pf},
    {cls:'c-yellow',lbl:t('metric.wr','Assertividade'),val:(m.wr*100).toFixed(1)+'%',sub:`${m.wins.length}W · ${m.losses.length}L`,tip:TIPS.wr},
    {cls:'c-red',lbl:t('metric.maxDD','Drawdown máximo'),val:(m.maxDD*100).toFixed(1)+'%',sub:`recovery ${isFinite(m.recovery)?m.recovery.toFixed(2):'—'} ${mkTip(TIPS.recovery)}`,tip:TIPS.dd},
  ].map(mkCard).join('');

  let running=dashboardBase;const eqPts=[{x:'Início',y:running,pct:0}];
  [...m.closed].reverse().forEach(t=>{running+=(t.pnl||0);eqPts.push({x:t.date||'',y:parseFloat(running.toFixed(2)),pct:parseFloat(((running-dashboardBase)/(dashboardBase||1)*100).toFixed(2))});});
  const eqData=eqMode==='value'?eqPts.map(p=>p.y):eqPts.map(p=>p.pct);
  mkChart('equityChart',{type:'line',data:{labels:eqPts.map(p=>p.x),datasets:[buildSignedEquityDataset(eqData,{pointRadius:1})]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  mkChart('wlChart',{type:'doughnut',data:{labels:['Wins','Losses','Breakeven'],datasets:[{data:[m.wins.length,m.losses.length,m.bes?.length||0],backgroundColor:['rgba(0,214,143,.7)','rgba(255,77,106,.7)','rgba(255,206,103,.78)'],borderColor:'transparent',borderWidth:2}]},options:{...CHART_OPTS,scales:{x:{display:false},y:{display:false}},plugins:{...CHART_OPTS.plugins,legend:{labels:{color:'#8ba3ad',font:{size:10}}}}}});
  const rs=m.closed.filter(t=>t.r!=null).map(t=>t.r);
  mkChart('rBarChart',{type:'bar',data:{labels:rs.map((_,i)=>i+1),datasets:[{data:rs,backgroundColor:rs.map(r=>r>=0?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:2}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const wdMap={[t('day.sun','Dom')]:0,[t('day.mon','Seg')]:0,[t('day.tue','Ter')]:0,[t('day.wed','Qua')]:0,[t('day.thu','Qui')]:0,[t('day.fri','Sex')]:0,[t('day.sat','Sáb')]:0};
  const wdKeys=[t('day.sun','Dom'),t('day.mon','Seg'),t('day.tue','Ter'),t('day.wed','Qua'),t('day.thu','Qui'),t('day.fri','Sex'),t('day.sat','Sáb')];
  m.closed.forEach(t=>{if(t.date){const d=new Date(t.date+'T12:00').getDay();wdMap[wdKeys[d]]+=(t.pnl||0);}});
  const wdVals=wdKeys.map(k=>wdMap[k]);
  mkChart('wdayChart',{type:'bar',data:{labels:wdKeys,datasets:[{data:wdVals,backgroundColor:wdVals.map(v=>v>=0?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const mthMap={};
  m.closed.forEach(t=>{if(t.date){const k=t.date.slice(0,7);mthMap[k]=(mthMap[k]||0)+(t.pnl||0);}});
  const mthKeys=Object.keys(mthMap).sort();
  mkChart('monthEvChart',{type:'bar',data:{labels:mthKeys,datasets:[{data:mthKeys.map(k=>mthMap[k]),backgroundColor:mthKeys.map(k=>mthMap[k]>=0?'rgba(77,124,254,.6)':'rgba(255,93,104,.50)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const stratMap={};
  m.closed.forEach(t=>{const s=t.strategy||'—';if(!stratMap[s])stratMap[s]=0;stratMap[s]+=(t.pnl||0);});
  const sk=Object.keys(stratMap);
  const sv=sk.map(k=>stratMap[k]);
  mkChart('stratDashChart',{type:'bar',data:{labels:sk.map(s=>s.length>18?s.slice(0,18)+'…':s),datasets:[{data:sv,backgroundColor:sv.map(v=>v>=0?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,indexAxis:'y',plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const emoMap={};
  m.closed.forEach(t=>{const e=t.emotion||'—';if(!emoMap[e])emoMap[e]={w:0,l:0};t.status==='WIN'?emoMap[e].w++:emoMap[e].l++;});
  const ek=Object.keys(emoMap);
  const ewr=ek.map(k=>emoMap[k].w+emoMap[k].l>0?+(emoMap[k].w/(emoMap[k].w+emoMap[k].l)*100).toFixed(1):0);
  mkChart('emoDashChart',{type:'bar',data:{labels:ek,datasets:[{label:'Win Rate %',data:ewr,backgroundColor:'rgba(99,169,255,.62)',borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,scales:{...CHART_OPTS.scales,y:{...CHART_OPTS.scales.y,max:100}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  renderRiskBoard(acct,acctTrades);
  renderDashStrategyBoard(arr);
  renderDashboardCalendar(arr);

  // Injetar tooltips nos títulos dos gráficos e painel de risco (apenas uma vez por render)
  const tipTitles=[
    ['equityChartTitle','equityChart',TIPS.equityChart],
    ['wlChartTitle',null,TIPS.wlChart],
    ['rBarChartTitle',null,TIPS.rMultiplos],
    ['wdayChartTitle',null,TIPS.wdayChart],
    ['monthEvChartTitle',null,TIPS.monthEvChart],
    ['stratDashChartTitle',null,TIPS.stratDashChart],
    ['emoDashChartTitle',null,TIPS.emoDashChart],
    ['riskIdealLabel',null,TIPS.riscoIdeal],
  ];
  tipTitles.forEach(([id,,tip])=>{
    const el=document.getElementById(id);
    if(!el||el.querySelector('.m-tip-icon'))return;
    if(false){/* reserved */} else {
      el.innerHTML=el.textContent+' '+mkTip(tip);
    }
  });
  document.getElementById('recentTrades').innerHTML=[...arr].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,20).map(t=>tradeRow(t,false)).join('')||`<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:16px">${t('misc.noTrades')}</td></tr>`;
  updateTopbarStats();
}

function toggleEqMode(){
  eqMode=eqMode==='value'?'pct':'value';
  const btn=document.getElementById('eqModeBtn');
  if(btn)btn.textContent=eqMode==='value'?'% retorno':'$ valor';
  renderDashboard();
}

function renderStrategyRows(targetId, rows, limit=5){
  const el=document.getElementById(targetId);
  if(!el)return;
  if(!rows.length){
    el.innerHTML='<div class="strategy-row"><div class="strategy-row-title">Sem trades suficientes</div><div class="strategy-row-meta"><span>Registre operações fechadas para ranquear setups.</span></div></div>';
    return;
  }
  const sliced=rows.slice(0,limit);
  const maxPnl=Math.max(...sliced.map(r=>Math.abs(r.pnl)),1);
  el.innerHTML=sliced.map(row=>`
    <div class="strategy-row">
      <div class="strategy-row-head">
        <div class="strategy-row-title">${escapeHtml(row.name)}</div>
        <div class="strategy-row-pnl ${row.pnl>=0?'text-green':'text-red'}">${row.pnl>=0?'+':''}${fR(row.pnl)}</div>
      </div>
      <div class="strategy-progress"><span style="width:${Math.max((Math.abs(row.pnl)/maxPnl)*100,8)}%;background:${row.pnl>=0?'linear-gradient(90deg, var(--accent), var(--green))':'linear-gradient(90deg, var(--red), #ff9aa1)'}"></span></div>
      <div class="strategy-row-meta">
        <span>${row.n} trades</span>
        <span>${row.wr.toFixed(0)}% WR</span>
        <span>FR ${formatStrategyRatio(row.recovery)}</span>
      </div>
    </div>`).join('');
}

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

function switchStatTab(id,el){
  ['overview','strategy','time','psych','simulation'].forEach(t=>{
    const div=document.getElementById('statTab-'+t);
    if(div)div.style.display=t===id?'block':'none';
  });
  document.querySelectorAll('#statTabNav .tab-btn').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  if(id==='psych')renderStatsPsych();
  else if(id==='simulation'){resetSimulationEntryDefaults();renderSimulation();}
  else renderStats();
}

function toggleCustomPeriod(){
  const period=document.getElementById('statPeriod')?.value||'custom';
  const bar=document.getElementById('customPeriodBar');
  if(bar)bar.style.display=period==='custom'?'flex':'none';
  renderStats();
}

function onStatsAccountChange(){
  statsAccountPinned=true;
  renderStats();
}

function renderStats(){
  const acctSel=document.getElementById('statAccount');
  if(acctSel){
    const current=acctSel.value;
    acctSel.innerHTML=`<option value="all">${t('stats.allAccounts')}</option>`+accounts.map(a=>`<option value="${a.id}">${escapeHtml(a.name||a.id)}</option>`).join('');
    const allowed=['all',...accounts.map(a=>a.id)];
    const nextValue=statsAccountPinned&&allowed.includes(current)?current:activeAccountId;
    acctSel.value=allowed.includes(nextValue)?nextValue:activeAccountId;
  }
  const acctId=document.getElementById('statAccount')?.value||activeAccountId;
  const scopedAcctId=acctId==='all'?activeAccountId:acctId;
  const arr=getStatsPeriodTrades();
  const m=calcMetrics(arr, scopedAcctId);
  document.getElementById('statsMetrics').innerHTML=[
    {cls:'c-green',lbl:'P/L Total',val:(m.totalPnl>=0?'+':'')+fR(m.totalPnl),sub:m.closed.length+' fechados',tip:TIPS.pnl},
    {cls:'c-blue',lbl:'Win Rate',val:(m.wr*100).toFixed(1)+'%',sub:m.wins.length+'W · '+m.losses.length+'L'+(m.bes?.length?` · ${m.bes.length}BE`:'' ),tip:TIPS.wr},
    {cls:'c-yellow',lbl:'Expectância',val:(m.exp>=0?'+':'')+m.exp.toFixed(3)+'R',sub:'por trade',tip:TIPS.exp},
    {cls:'c-purple',lbl:'Profit Factor',val:isFinite(m.pf)?m.pf.toFixed(2):'∞',sub:'bruto/perda',tip:TIPS.pf},
    {cls:'c-red',lbl:'Max DD',val:(m.maxDD*100).toFixed(1)+'%',sub:`recovery ${isFinite(m.recovery)?m.recovery.toFixed(2):'—'} ${mkTip(TIPS.recovery)}`,tip:TIPS.dd},
    {cls:'c-blue',lbl:'Sharpe',val:isFinite(m.sharpe)?m.sharpe.toFixed(2):'—',sub:'retorno/risco',tip:TIPS.sharpe},
    {cls:'c-teal',lbl:'Sortino',val:isFinite(m.sortino)?m.sortino.toFixed(2):'—',sub:'downside risk',tip:TIPS.sortino},
    {cls:'c-yellow',lbl:'Calmar',val:isFinite(m.calmar)?m.calmar.toFixed(2):'—',sub:'retorno/DD',tip:TIPS.calmar},
  ].map(mkCard).join('');
  const riskAcct=accounts.find(a=>a.id===scopedAcctId)||getActiveAccount();
  const riskTrades=acctId==='all'?arr.filter(t=>(t.accountId||activeAccountId)===riskAcct.id):arr;
  renderStopFeeAnalysis('statsRiskLeakageRows',riskAcct,riskTrades);
  const startBal=m.startBal||1000;
  let run=startBal;const eqPts=[startBal];
  [...m.closed].reverse().forEach(t=>{run+=(t.pnl||0);eqPts.push(parseFloat(run.toFixed(2)));});
  mkChart('stEqChart',{type:'line',data:{labels:eqPts.map((_,i)=>i),datasets:[buildSignedEquityDataset(eqPts)]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  mkChart('stWLChart',{type:'doughnut',data:{labels:['Wins','Losses','Breakeven'],datasets:[{data:[m.wins.length,m.losses.length,m.bes?.length||0],backgroundColor:['rgba(0,214,143,.7)','rgba(255,77,106,.7)','rgba(255,206,103,.78)'],borderColor:'transparent'}]},options:{...CHART_OPTS,scales:{x:{display:false},y:{display:false}},plugins:{...CHART_OPTS.plugins,legend:{labels:{color:'#8ba3ad'}}}}});
  const rs=m.closed.filter(t=>t.r!=null).map(t=>t.r);
  mkChart('stRChart',{type:'bar',data:{labels:rs.map((_,i)=>i+1),datasets:[{data:rs,backgroundColor:rs.map(r=>r>=0?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:2}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const wd=[0,0,0,0,0,0,0];
  m.closed.forEach(t=>{if(t.date)wd[new Date(t.date+'T12:00').getDay()]+=(t.pnl||0);});
  const wdLbls=[t('day.sun','Dom'),t('day.mon','Seg'),t('day.tue','Ter'),t('day.wed','Qua'),t('day.thu','Qui'),t('day.fri','Sex'),t('day.sat','Sáb')];
  mkChart('stWdChart',{type:'bar',data:{labels:wdLbls,datasets:[{data:wd,backgroundColor:wd.map(v=>v>=0?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const mthMap={};m.closed.forEach(t=>{if(t.date){const k=t.date.slice(0,7);mthMap[k]=(mthMap[k]||0)+(t.pnl||0);}});
  const mk=Object.keys(mthMap).sort();
  mkChart('stMonthChart',{type:'bar',data:{labels:mk,datasets:[{data:mk.map(k=>mthMap[k]),backgroundColor:mk.map(k=>mthMap[k]>=0?'rgba(77,124,254,.6)':'rgba(255,93,104,.50)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  let pk=startBal,cur2=startBal;const ddArr=[];
  [...m.closed].reverse().forEach(t=>{cur2+=(t.pnl||0);if(cur2>pk)pk=cur2;ddArr.push(parseFloat(((pk-cur2)/pk*100).toFixed(2)));});
  mkChart('stDdChart',{type:'line',data:{labels:eqPts.slice(1).map((_,i)=>i+1),datasets:[buildSignedEquityDataset(eqPts.slice(1),{label:'Equity',borderWidth:1.5,yAxisID:'y'}),{label:'DD%',data:ddArr,borderColor:'rgba(255,77,106,.7)',borderWidth:1,pointRadius:0,tension:.3,fill:true,backgroundColor:'rgba(255,77,106,.07)',yAxisID:'y1'}]},options:{...CHART_OPTS,scales:{x:CHART_OPTS.scales.x,y:{...CHART_OPTS.scales.y,position:'left'},y1:{...CHART_OPTS.scales.y,position:'right',reverse:true,grid:{display:false}}}}});
  const pnlVals=m.closed.filter(t=>t.pnl!=null).map(t=>t.pnl);
  if(pnlVals.length>1){
    const mn=Math.min(...pnlVals),mx=Math.max(...pnlVals),bk=10,st=(mx-mn)/bk||1;
    const hist=Array(bk).fill(0);
    pnlVals.forEach(v=>{let b=Math.min(Math.floor((v-mn)/st),bk-1);hist[b]++;});
    mkChart('stHistChart',{type:'bar',data:{labels:hist.map((_,i)=>fR(mn+i*st)),datasets:[{data:hist,backgroundColor:'rgba(34,213,237,.62)',borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  }
  const avgWin=m.avgWin||0;
  const avgLoss=m.avgLoss||0;
  const rrr=avgLoss>0?avgWin/avgLoss:0;
  const beWR=rrr>0?1/(1+rrr)*100:0;
  const openTrades=arr.filter(t=>t.status==='OPEN').length;
  const beTrades=m.bes?.length||0;
  const grossWin=(m.wins||[]).reduce((s,t)=>s+(t.pnl||0),0);
  const grossLoss=Math.abs((m.losses||[]).reduce((s,t)=>s+(t.pnl||0),0));
  const metRow=(label,value,tip,colorFn)=>{
    const style=typeof colorFn==='function'?colorFn(value):typeof colorFn==='string'?colorFn:'';
    return`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)">
    <span style="font-size:11px;color:var(--muted);display:inline-flex;align-items:center;gap:4px">${label}${tip?' '+mkTip(tip):''}</span>
    <span style="font-family:'DM Mono',monospace;font-size:11px;${style}">${value}</span>
  </div>`;
  };
  document.getElementById('statsMetTable').innerHTML=[
    metRow('Total de trades',m.closed.length,`<strong>Total de Trades</strong><p>Número de trades fechados (WIN, LOSS ou BE) no período selecionado. Trades em aberto não entram no cálculo.</p>`),
    metRow('Wins / Losses / BE',`${m.wins.length}W · ${m.losses.length}L · ${beTrades}BE`,`<strong>Distribuição de Resultados</strong><p>Contagem de trades vencedores, perdedores e empatados. BE (breakeven) são trades que fecharam no zero a zero.</p>`),
    metRow('Win Rate',(m.wr*100).toFixed(1)+'%',TIPS.wr,v=>m.wr>=0.5?'color:var(--green)':'color:var(--yellow)'),
    metRow('Win Rate necessário',beWR.toFixed(1)+'%',`<strong>Win Rate Necessário (Breakeven)</strong><p>Percentual mínimo de acertos para o setup não perder dinheiro, dado o RRR médio atual. Fórmula: 1 ÷ (1 + RRR).</p><div class="tip-row"><span>Seu WR acima deste valor</span><span>Setup lucrativo no longo prazo</span></div>`,v=>m.wr*100>beWR?'color:var(--green)':'color:var(--red)'),
    metRow('P/L Total',(m.totalPnl>=0?'+':'')+fR(m.totalPnl),TIPS.pnl,v=>m.totalPnl>=0?'color:var(--green)':'color:var(--red)'),
    metRow('Ganho bruto','+'+fR(grossWin),`<strong>Ganho Bruto</strong><p>Soma de todos os P/L positivos no período, sem descontar as perdas.</p>`,'color:var(--green)'),
    metRow('Perda bruta','-'+fR(grossLoss),`<strong>Perda Bruta</strong><p>Soma absoluta de todos os P/L negativos no período.</p>`,'color:var(--red)'),
    metRow('Profit Factor',isFinite(m.pf)?m.pf.toFixed(2):'∞',TIPS.pf,v=>parseFloat(v)>=1.5?'color:var(--green)':parseFloat(v)>=1?'color:var(--yellow)':'color:var(--red)'),
    metRow('Expectância',(m.exp>=0?'+':'')+m.exp.toFixed(3)+'R',TIPS.exp,v=>m.exp>=0.2?'color:var(--green)':m.exp>=0?'color:var(--yellow)':'color:var(--red)'),
    metRow('RRR médio',rrr.toFixed(2),`<strong>RRR Médio (Risk-Reward Ratio)</strong><p>Razão entre o ganho médio e a perda média em múltiplos de R. Um RRR de 1.5 significa que os wins valem 1.5x mais que os losses.</p><div class="tip-row"><span>Abaixo de 1.0</span><span>Precisa de WR alto (&gt;60%)</span></div><div class="tip-row"><span>1.0–2.0</span><span>Faixa saudável</span></div><div class="tip-row"><span>Acima de 2.0</span><span>Excelente — WR baixo aceitável</span></div>`,v=>rrr>=1?'color:var(--green)':'color:var(--yellow)'),
    metRow('Avg Win / Avg Loss','+'+avgWin.toFixed(2)+'R · -'+avgLoss.toFixed(2)+'R',`<strong>Média dos Wins e Losses</strong><p>Resultado médio dos trades vencedores e perdedores em R. Comparar os dois revela o RRR real do setup.</p>`),
    metRow('Max Drawdown',(m.maxDD*100).toFixed(2)+'%',TIPS.dd,v=>m.maxDD<0.1?'color:var(--green)':m.maxDD<0.2?'color:var(--yellow)':'color:var(--red)'),
    metRow('Recovery Factor',isFinite(m.recovery)?m.recovery.toFixed(2):'—',TIPS.recovery,v=>parseFloat(v)>=2?'color:var(--green)':parseFloat(v)>=1?'color:var(--yellow)':'color:var(--red)'),
    metRow('Sharpe',isFinite(m.sharpe)?m.sharpe.toFixed(2):'—',TIPS.sharpe,v=>parseFloat(v)>=1?'color:var(--green)':parseFloat(v)>=0?'color:var(--yellow)':'color:var(--red)'),
    metRow('Sortino',isFinite(m.sortino)?m.sortino.toFixed(2):'—',TIPS.sortino,v=>parseFloat(v)>=1?'color:var(--green)':parseFloat(v)>=0?'color:var(--yellow)':'color:var(--red)'),
    metRow('Calmar',isFinite(m.calmar)?m.calmar.toFixed(2):'—',TIPS.calmar,v=>parseFloat(v)>=1?'color:var(--green)':parseFloat(v)>=0?'color:var(--yellow)':'color:var(--red)'),
  ].join('');
  document.getElementById('statsStreakRows').innerHTML=[
    metRow('Maior sequência de wins',m.maxWS+' trades',`<strong>Maior Sequência de Wins</strong><p>Maior número de trades consecutivos vencedores no período. Útil para entender a consistência do setup.</p>`),
    metRow('Maior sequência de losses',m.maxLS+' trades',`<strong>Maior Sequência de Losses</strong><p>Maior número de trades consecutivos perdedores. Importante para calibrar a resiliência psicológica e o tamanho de posição.</p>`,v=>parseInt(v)>=5?'color:var(--red)':parseInt(v)>=3?'color:var(--yellow)':''),
    metRow('Em aberto',openTrades,`<strong>Trades em Aberto</strong><p>Número de trades com status OPEN no período — ainda não fechados e sem resultado registrado.</p>`),
    metRow('Breakevens',beTrades,`<strong>Breakevens</strong><p>Trades que fecharam no zero a zero (sem lucro nem perda). Podem indicar boa gestão de stop ou trades que não desenvolveram.</p>`),
  ].join('');
  const symp={};m.closed.forEach(t=>{const s=t.symbol||'—';if(!symp[s])symp[s]={w:0,l:0,pnl:0};t.status==='WIN'?symp[s].w++:symp[s].l++;symp[s].pnl+=(t.pnl||0);});
  const symEntries=Object.entries(symp);
  const symEl=document.getElementById('stSymRows');
  if(symEl){
    if(!symEntries.length){symEl.innerHTML=`<div style="padding:10px 0;font-size:11px;color:var(--muted);text-align:center">Sem dados</div>`;}
    else{
      const symTip=`<strong>Performance por Símbolo</strong><p>Resumo de trades agrupados por ativo/símbolo. Útil para identificar quais ativos contribuem mais para o resultado.</p>`;
      symEl.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0 6px;border-bottom:1px solid rgba(255,255,255,.1)">
        <span style="font-size:10px;color:var(--dim);font-weight:600;letter-spacing:.04em;text-transform:uppercase">Símbolo ${mkTip(symTip)}</span>
        <span style="display:flex;gap:24px"><span style="font-size:10px;color:var(--dim);font-weight:600;letter-spacing:.04em;text-transform:uppercase;width:36px;text-align:right">N</span><span style="font-size:10px;color:var(--dim);font-weight:600;letter-spacing:.04em;text-transform:uppercase;width:40px;text-align:right">WR</span><span style="font-size:10px;color:var(--dim);font-weight:600;letter-spacing:.04em;text-transform:uppercase;width:54px;text-align:right">P/L</span></span>
      </div>`+symEntries.sort((a,b)=>b[1].pnl-a[1].pnl).map(([s,d])=>{const tot=d.w+d.l;const wr=tot?(d.w/tot*100).toFixed(0)+'%':'—';const pnlStr=(d.pnl>=0?'+':'')+fR(d.pnl);const pnlColor=d.pnl>=0?'color:var(--green)':'color:var(--red)';return`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span style="font-size:11px;color:var(--text);font-weight:500">${s}</span><span style="display:flex;gap:24px;font-family:'DM Mono',monospace;font-size:11px"><span style="width:36px;text-align:right;color:var(--muted)">${tot}</span><span style="width:40px;text-align:right;color:var(--muted)">${wr}</span><span style="width:54px;text-align:right;${pnlColor}">${pnlStr}</span></span></div>`;}).join('');
    }
  }
  const strategyRows=getStrategySnapshots(m.closed,scopedAcctId);
  const stratSels=[document.getElementById('stStratA'),document.getElementById('stStratB')];
  const strats=strategyRows.map(row=>row.name);
  stratSels.forEach(sel=>{if(!sel)return;const v=sel.value;sel.innerHTML='<option value="">—</option>'+strats.map(s=>`<option>${s}</option>`).join('');sel.value=v;});
  const sk=strategyRows.map(row=>row.name);
  const sPnl=strategyRows.map(row=>row.pnl);
  const sWR=strategyRows.map(row=>+row.wr.toFixed(1));
  mkChart('stStratPnlChart',{type:'bar',data:{labels:sk.map(s=>s.length>15?s.slice(0,15)+'…':s),datasets:[{data:sPnl,backgroundColor:sPnl.map(v=>v>=0?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,indexAxis:'y',plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  mkChart('stStratWRChart',{type:'bar',data:{labels:sk.map(s=>s.length>15?s.slice(0,15)+'…':s),datasets:[{data:sWR,backgroundColor:'rgba(34,213,237,.62)',borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,indexAxis:'y',scales:{...CHART_OPTS.scales,x:{...CHART_OPTS.scales.x,max:100}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  document.getElementById('stStratBody').innerHTML=strategyRows.map(row=>`<tr><td>${escapeHtml(row.name)}</td><td class="mono">${row.n}</td><td class="mono text-green">${row.wins}</td><td class="mono">${row.wr.toFixed(1)}%</td><td class="mono ${row.pnl>=0?'text-green':'text-red'}">${(row.pnl>=0?'+':'')+fR(row.pnl)}</td><td class="mono">${row.avgR.toFixed(2)+'R'}</td><td class="mono">${isFinite(row.pf)?row.pf.toFixed(2):'∞'}</td><td class="mono">${(row.exp>=0?'+':'')+row.exp.toFixed(3)+'R'}</td><td class="mono">${formatStrategyRatio(row.sharpe)}</td><td class="mono">${formatStrategyRatio(row.sortino)}</td><td class="mono">${formatStrategyRatio(row.calmar)}</td><td class="mono">${formatStrategyRatio(row.recovery)}</td></tr>`).join('');
  renderStrategyCompareCards(strategyRows);
  mkChart('stMonthPnlChart',{type:'bar',data:{labels:mk,datasets:[{data:mk.map(k=>mthMap[k]),backgroundColor:mk.map(k=>mthMap[k]>=0?'rgba(77,124,254,.6)':'rgba(255,93,104,.50)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const wdWR=[0,0,0,0,0,0,0];const wdN=[0,0,0,0,0,0,0];
  m.closed.forEach(t=>{if(t.date){const d=new Date(t.date+'T12:00').getDay();wdN[d]++;if(t.status==='WIN')wdWR[d]++;}});
  const wdWRPct=wdWR.map((w,i)=>wdN[i]>0?+(w/wdN[i]*100).toFixed(1):0);
  mkChart('stWdWRChart',{type:'bar',data:{labels:wdLbls,datasets:[{label:'Win Rate %',data:wdWRPct,backgroundColor:'rgba(34,213,237,.62)',borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,scales:{...CHART_OPTS.scales,y:{...CHART_OPTS.scales.y,max:100}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const timeStats=getTradeTimingStats(m.closed);
  const timeCards=document.getElementById('stTimeCards');
  if(timeCards){
    const timeTip=`<strong>Horários de Trading</strong><p>Médias calculadas sobre todos os trades fechados no período. Ajuda a identificar os melhores horários de operação.</p>`;
    const durTip=`<strong>Duração das Operações</strong><p>Tempo médio entre a abertura e o fechamento do trade. Compare WIN vs LOSS para identificar se manter trades por mais tempo melhora ou piora os resultados.</p>`;
    timeCards.innerHTML=[
      {cls:'c-blue',lbl:t('timing.avgOrder','Ordem média'),val:formatClockMinutes(timeStats.overall.avgPlacedMinutes),sub:`${timeStats.overall.count||0} trade(s)`,tip:timeTip},
      {cls:'c-green',lbl:t('timing.avgEntry','Entrada média'),val:formatClockMinutes(timeStats.overall.avgOpenMinutes),sub:t('timing.triggered','hora acionada'),tip:timeTip},
      {cls:'c-purple',lbl:t('timing.avgExit','Saída média'),val:formatClockMinutes(timeStats.overall.avgExitMinutes),sub:t('timing.closed','hora encerrada'),tip:timeTip},
      {cls:'c-yellow',lbl:t('timing.avgDuration','Duração média'),val:formatDurationMinutes(timeStats.overall.avgDurationMinutes),sub:t('timing.closedTrades','operações fechadas'),tip:durTip},
      {cls:'c-green',lbl:t('timing.durationWin','Duração WIN'),val:formatDurationMinutes(timeStats.wins.avgDurationMinutes),sub:`${timeStats.wins.count||0} WIN`,tip:durTip},
      {cls:'c-red',lbl:t('timing.durationLoss','Duração LOSS'),val:formatDurationMinutes(timeStats.losses.avgDurationMinutes),sub:`${timeStats.losses.count||0} LOSS`,tip:durTip},
    ].map(c=>`<div class="metric-card ${c.cls} time-metric-card"><div class="m-label-row"><span class="m-label">${c.lbl}</span>${c.tip?mkTip(c.tip):''}</div><div class="m-value">${c.val}</div><div class="m-sub">${c.sub}</div></div>`).join('');
  }
  const heatHours={};
  m.closed.forEach(t=>{
    const minutes=clockToMinutes(t.openTime);
    if(minutes==null)return;
    const h=Math.floor(minutes/60);
    if(!heatHours[h])heatHours[h]={n:0,pnl:0};
    heatHours[h].n++;
    heatHours[h].pnl+=(t.pnl||0);
  });
  const heatEl=document.getElementById('stHourHeatmap');
  if(heatEl){const maxPnl=Math.max(...Object.values(heatHours).map(h=>Math.abs(h.pnl)),1);
    heatEl.innerHTML='<div style="display:flex;gap:4px;flex-wrap:wrap">'+[...Array(24)].map((_,h)=>{const d=heatHours[h];if(!d)return`<div style="width:36px;height:36px;border-radius:5px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--dim)">${h}h</div>`;const intensity=Math.min(d.pnl/maxPnl,1);const bg=d.pnl>=0?`rgba(0,214,143,${0.15+Math.abs(intensity)*0.6})`:`rgba(255,77,106,${0.15+Math.abs(intensity)*0.6})`;return`<div style="width:36px;height:36px;border-radius:5px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center" title="${h}h: ${d.n} trades, P/L ${fR(d.pnl)}"><span style="font-size:9px;color:var(--text);font-weight:600">${h}h</span><span style="font-size:8px;color:var(--muted)">${d.n}T</span></div>`;}).join('')+'</div>';
  }
  document.getElementById('stTimeBody').innerHTML=[...wdLbls.map((d,i)=>{const ts=m.closed.filter(t=>t.date&&new Date(t.date+'T12:00').getDay()===i);const w=ts.filter(t=>t.status==='WIN').length;const pnl=ts.reduce((a,t)=>a+(t.pnl||0),0);const avg_r2=ts.filter(t=>t.r!=null).length?ts.filter(t=>t.r!=null).reduce((a,t)=>a+(t.r||0),0)/ts.filter(t=>t.r!=null).length:0;return ts.length?`<tr><td>${d}</td><td class="mono">${ts.length}</td><td class="mono">${(w/ts.length*100).toFixed(0)}%</td><td class="mono ${pnl>=0?'text-green':'text-red'}">${(pnl>=0?'+':'')+fR(pnl)}</td><td class="mono">${avg_r2.toFixed(2)+'R'}</td></tr>`:'';})].join('');
  const timeStrategyBody=document.getElementById('stTimeStrategyBody');
  if(timeStrategyBody){
    timeStrategyBody.innerHTML=timeStats.byStrategy.length
      ? timeStats.byStrategy.map(row=>`<tr><td><b>${escapeHtml(row.name)}</b></td><td class="mono">${row.count}</td><td class="mono">${formatClockMinutes(row.avgPlacedMinutes)}</td><td class="mono">${formatClockMinutes(row.avgOpenMinutes)}</td><td class="mono">${formatClockMinutes(row.avgExitMinutes)}</td><td class="mono">${formatDurationMinutes(row.avgDurationMinutes)}</td></tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Sem horários suficientes no período.</td></tr>';
  }
  // Inject tooltips into chart/section titles (Análises)
  // Format: [contentId, titleText, tip] — contentId is ANY element inside the target card/table
  [
    ['stEqChart','Curva de Equity',TIPS.stEqChart],
    ['stWLChart','Distribuição W/L',TIPS.stWLChart],
    ['stRChart','R-Múltiplos',TIPS.stRChart],
    ['stWdChart','P/L por Dia da Semana',TIPS.stWdChart],
    ['stMonthChart','Evolução Mensal',TIPS.stMonthChart],
    ['stDdChart','Equity × Drawdown',TIPS.stDdChart],
    ['stHistChart','Histograma P/L',TIPS.stHistChart],
    ['statsMetTable','Tabela de Métricas',TIPS.stMetTable],
    ['statsStreakRows','Streak & Sequências',TIPS.stStreak],
    ['stMonthPnlChart','P/L por Mês',TIPS.stMonthPnlChart],
    ['stWdWRChart','Win Rate por Dia da Semana',TIPS.stWdWRChart],
    ['stHourHeatmap','Trades por Horário (acionamento)',TIPS.stHeatmap],
    ['stTimeBody','Desempenho por Dia da Semana',TIPS.stWdTable],
    ['stTimeStrategyBody','Timing por Estratégia',TIPS.stTimingStrat],
    ['stStratPnlChart','P/L por Estratégia',TIPS.stStratPnl],
    ['stStratWRChart','Win Rate por Estratégia',TIPS.stStratWR],
    ['stStratBody','Comparativo de Estratégias',TIPS.stStratTable],
    // Psicológico
    ['statEmoWRChart','Win Rate por Emoção (durante)',TIPS.stEmoWR],
    ['statEmoPnlChart','P/L médio por Emoção',TIPS.stEmoPnl],
    ['statDiscWRChart','Disciplina × Win Rate',TIPS.stDiscWR],
    ['statErrorsChart','Erros mais frequentes',TIPS.stErrors],
    ['statHesitationWrap','Trades por hesitação (perdidos)',TIPS.stHesitation],
    ['statPlanChart','P/L por status de plano seguido',TIPS.stPlanChart],
    ['statEmoBody','Análise por Emoção',TIPS.stEmoTable],
    // Simulação
    ['simChart','Monte Carlo — 100 cenários de curva de equity',TIPS.simMonteCarlo],
  ].forEach(([contentId,titleText,tip])=>{
    const el=document.getElementById(contentId);
    if(!el)return;
    const card=el.closest('.chart-card')||el.closest('.table-card')||el.closest('.setup-card');
    if(!card)return;
    const titleEl=Array.from(card.querySelectorAll('.chart-title,.table-title,.setup-card-title')).find(t=>t.textContent.trim()===titleText);
    if(!titleEl||titleEl.querySelector('.m-tip-icon'))return;
    titleEl.innerHTML=titleEl.textContent+' '+mkTip(tip);
  });
  renderSimulation();
}

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

function getStatsPeriodTrades(){
  const period=document.getElementById('statPeriod')?.value||'all';
  const acctFilter=document.getElementById('statAccount')?.value||activeAccountId;
  let arr=acctFilter==='all'?accounts.flatMap(a=>getAccountTrades(a.id)):getAccountTrades(acctFilter);
  if(period==='custom'){
    const from=document.getElementById('statDateFrom')?.value;
    const to=document.getElementById('statDateTo')?.value;
    if(from||to){arr=arr.filter(t=>{if(!t.date)return false;return(!from||t.date>=from)&&(!to||t.date<=to);});}
  } else {arr=filterByPeriod(arr,period);}
  return arr;
}

function deleteStrategy(idx){
  const name=config.strategies[idx];if(!name)return;
  const count=strategyUsageCount(name);
  const msg=count
    ? `Excluir "${name}" da lista de estratégias?\n\nEla aparece em ${count} trade(s). Os trades antigos continuam com esse nome no histórico.`
    : `Excluir "${name}" da lista de estratégias?`;
  showAppConfirm('Excluir estratégia',msg,()=>{
    rememberDeletedDefaultStrategy(name);
    config.strategies.splice(idx,1);
    config.strategyDefaultsSeeded=true;
    save();renderSetup();
  },{danger:true,confirmText:'Excluir'});
}

function rememberDeletedDefaultStrategy(name){
  const defaultMatch=DEFAULT_STRATEGIES.find(s=>normalizeStrategyName(s)===normalizeStrategyName(name));
  if(defaultMatch){
    if(!Array.isArray(config.deletedDefaultStrategies))config.deletedDefaultStrategies=[];
    if(!config.deletedDefaultStrategies.some(s=>normalizeStrategyName(s)===normalizeStrategyName(defaultMatch))){
      config.deletedDefaultStrategies.push(defaultMatch);
    }
  }
}

function renameStrategy(idx,newName){
  const oldName=config.strategies?.[idx];if(!oldName)return false;
  const next=cleanMTCell(newName);
  if(!next)return false;
  const nextKey=normalizeStrategyName(next);
  const oldKey=normalizeStrategyName(oldName);
  if(!nextKey||nextKey===oldKey)return false;
  const exists=config.strategies.some((name,i)=>i!==idx&&normalizeStrategyName(name)===nextKey);
  if(exists){showAppNotice('Estratégia duplicada','Já existe: '+next);return false;}
  rememberDeletedDefaultStrategy(oldName);
  config.strategies[idx]=next;
  trades.forEach(t=>{if(t.strategy===oldName)t.strategy=next;});
  config.strategyDefaultsSeeded=true;
  save();renderSetup();
  return true;
}

function editStrategy(idx){
  const name=config.strategies?.[idx];if(!name)return;
  showAppPrompt('Editar estratégia','Renomear estratégia:',name,next=>renameStrategy(idx,next),{confirmText:'Salvar'});
}

function strategyUsageCount(name){
  return getAccountTrades(activeAccountId).filter(t=>t.strategy===name).length;
}

function renderDashStrategyBoard(arr){
  renderStrategyRows('dashStrategyBoard',getStrategySnapshots(arr),5);
}
