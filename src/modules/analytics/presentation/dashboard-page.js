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
