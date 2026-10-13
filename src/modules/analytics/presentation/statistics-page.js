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
