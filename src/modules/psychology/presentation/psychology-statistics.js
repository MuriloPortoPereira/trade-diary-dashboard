function renderStatsPsych(){
  const arr=getStatsPeriodTrades();
  const closed=arr.filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const emotionTrades=getClosedTradesWithSubjectiveEmotion(closed);
  const planTaggedTrades=getClosedTradesWithPlanTag(closed);
  const followedSim=planTaggedTrades.filter(t=>t.followedPlan==='sim');
  const followedRate=planTaggedTrades.length?followedSim.length/planTaggedTrades.length:0;
  const avgDisc=closed.filter(t=>t.discipline!=null).reduce((a,t)=>a+(t.discipline||0),0)/(closed.filter(t=>t.discipline!=null).length||1);
  const hesitations=arr.filter(t=>t.hesitation);
  const hesStats=buildHesitationStats(arr);
  document.getElementById('statPsychCards').innerHTML=[
    {cls:'c-blue',lbl:'Seguiu o plano',val:(followedRate*100).toFixed(0)+'%',sub:followedSim.length+' de '+planTaggedTrades.length,tip:TIPS.followedPlan},
    {cls:'c-purple',lbl:'Disciplina média',val:avgDisc.toFixed(0)+'%',sub:'0–100%',tip:TIPS.discipline},
    {cls:'c-yellow',lbl:'Hesitações',val:hesStats.total,sub:hesStats.wins+' WIN · '+hesStats.losses+' LOSS',tip:TIPS.hesitation},
    {cls:'c-red',lbl:'Total de erros',val:closed.reduce((a,t)=>a+(t.errors?.length||0),0),sub:'erros registrados',tip:TIPS.errors},
  ].map(mkCard).join('');
  const emoMap={};
  emotionTrades.forEach(t=>{const e=t.emotion;if(!emoMap[e])emoMap[e]={w:0,l:0,pnl:0,rs:[]};t.status==='WIN'?emoMap[e].w++:emoMap[e].l++;emoMap[e].pnl+=(t.pnl||0);if(t.r!=null)emoMap[e].rs.push(t.r);});
  const ek=Object.keys(emoMap).filter(e=>emoMap[e].w+emoMap[e].l>=1);
  const ewrData=ek.map(e=>emoMap[e].w+emoMap[e].l>0?+(emoMap[e].w/(emoMap[e].w+emoMap[e].l)*100).toFixed(1):0);
  const epnlData=ek.map(e=>{const d=emoMap[e];return d.w+d.l>0?+(d.pnl/(d.w+d.l)).toFixed(2):0;});
  mkChart('statEmoWRChart',{type:'bar',data:{labels:ek,datasets:[{data:ewrData,backgroundColor:ewrData.map(v=>v>=50?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,scales:{...CHART_OPTS.scales,y:{...CHART_OPTS.scales.y,max:100}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  mkChart('statEmoPnlChart',{type:'bar',data:{labels:ek,datasets:[{data:epnlData,backgroundColor:epnlData.map(v=>v>=0?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const discBuckets=buildDisciplineBuckets(closed);
  mkChart('statDiscWRChart',{type:'bar',data:{labels:discBuckets.map(bucket=>bucket.label),datasets:[{type:'bar',label:'Win Rate %',data:discBuckets.map(bucket=>bucket.winRatePct),backgroundColor:'rgba(99,169,255,.62)',borderColor:'transparent',borderRadius:3,maxBarThickness:34},{type:'line',label:'P/L médio',data:discBuckets.map(bucket=>bucket.avgPnl),borderColor:'rgba(69,224,123,.85)',backgroundColor:'rgba(69,224,123,.22)',borderWidth:2,pointRadius:3,pointHoverRadius:4,tension:.28,yAxisID:'y1'}]},options:{...CHART_OPTS,layout:{padding:{left:8,right:12,top:6,bottom:0}},scales:{...CHART_OPTS.scales,y:{...CHART_OPTS.scales.y,max:100},y1:{...CHART_OPTS.scales.y,position:'right',grid:{display:false}}},plugins:{...CHART_OPTS.plugins,legend:{display:true,labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}}}});
  const filledDiscBuckets=discBuckets.filter(bucket=>bucket.count>0);
  const bestDiscBucket=[...filledDiscBuckets].sort((a,b)=>(b.avgPnl??-Infinity)-(a.avgPnl??-Infinity))[0];
  const worstDiscBucket=[...filledDiscBuckets].sort((a,b)=>(a.avgPnl??Infinity)-(b.avgPnl??Infinity))[0];
  const biggestDiscBucket=[...filledDiscBuckets].sort((a,b)=>b.count-a.count)[0];
  renderAnalysisSummary('statDiscSummary',[
    bestDiscBucket&&{tone:'safe',label:'Faixa forte',value:bestDiscBucket.label,sub:`P/L médio ${(bestDiscBucket.avgPnl>=0?'+':'')+fR(bestDiscBucket.avgPnl||0)}`},
    worstDiscBucket&&{tone:'danger',label:'Faixa fraca',value:worstDiscBucket.label,sub:`P/L médio ${(worstDiscBucket.avgPnl>=0?'+':'')+fR(worstDiscBucket.avgPnl||0)}`},
    biggestDiscBucket&&{tone:'info',label:'Maior amostra',value:biggestDiscBucket.label,sub:`${biggestDiscBucket.count} trade(s)`},
  ]);
  const errCount={};
  closed.forEach(t=>(t.errors||[]).forEach(e=>{errCount[e]=(errCount[e]||0)+1;}));
  const errSorted=Object.entries(errCount).sort((a,b)=>b[1]-a[1]).slice(0,10);
  mkChart('statErrorsChart',{type:'bar',data:{labels:errSorted.map(([k])=>k.length>18?k.slice(0,18)+'…':k),datasets:[{data:errSorted.map(([,v])=>v),backgroundColor:'rgba(255,93,104,.62)',borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,indexAxis:'y',plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const hesEl=document.getElementById('statHesitationWrap');
  if(hesEl){const potentialPnl=hesStats.potentialPnl;hesEl.innerHTML=`<div style="margin-bottom:8px"><div style="font-size:22px;font-weight:700;color:var(--yellow)">${hesStats.total}</div><div style="font-size:10px;color:var(--muted)">trades marcados com hesitação</div></div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-bottom:8px"><div style="padding:6px;background:var(--bg2);border-radius:6px;font-size:11px">WIN perdidos: <b style="color:var(--green)">${hesStats.wins}</b></div><div style="padding:6px;background:var(--bg2);border-radius:6px;font-size:11px">LOSS marcados: <b style="color:var(--red)">${hesStats.losses}</b></div></div><div style="font-size:11px;margin-bottom:4px">P/L potencial perdido: <b style="color:${potentialPnl>=0?'var(--green)':'var(--red)'}">${(potentialPnl>=0?'+':'')+fR(potentialPnl)}</b></div><div style="font-size:11px;color:var(--muted)">Win rate hipotético: <b>${hesStats.wins+hesStats.losses?hesStats.winRatePct+'%':'—'}</b>${hesStats.breakeven||hesStats.other?` · BE/outros: <b>${hesStats.breakeven+hesStats.other}</b>`:''}</div>${hesitations.slice(0,5).map(t=>`<div style="font-size:10px;margin-top:4px;padding:4px 6px;background:var(--bg2);border-radius:5px">${fDate(t.date)} · ${t.symbol||'?'} · ${t.emotion||'—'}</div>`).join('')}`;}
  const planMap={'sim':0,'nao':0,'parcial':0,'':0};const planN={'sim':0,'nao':0,'parcial':0,'':0};
  closed.forEach(t=>{const k=t.followedPlan||'';planMap[k]+=(t.pnl||0);planN[k]++;});
  const planRows=[
    {key:'sim',label:'Sim',tone:'safe',pnl:planMap.sim,count:planN.sim},
    {key:'parcial',label:'Parcial',tone:'warn',pnl:planMap.parcial,count:planN.parcial},
    {key:'nao',label:'Não',tone:'danger',pnl:planMap.nao,count:planN.nao},
    {key:'',label:'N/A',tone:'info',pnl:planMap[''],count:planN['']},
  ];
  mkChart('statPlanChart',{type:'bar',data:{labels:planRows.map(row=>row.label),datasets:[{data:planRows.map(row=>row.pnl),backgroundColor:['rgba(69,224,123,.62)','rgba(255,201,71,.6)','rgba(255,93,104,.62)','rgba(107,113,143,.4)'],borderColor:'transparent',borderRadius:4,maxBarThickness:42,categoryPercentage:.72,barPercentage:.72}]},options:{...CHART_OPTS,layout:{padding:{left:10,right:16,top:10,bottom:0}},scales:{...CHART_OPTS.scales,x:{...CHART_OPTS.scales.x,offset:true,grid:{display:false},ticks:{...CHART_OPTS.scales.x.ticks,align:'center'}}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const planWithCount=planRows.filter(row=>row.count>0);
  const bestPlan=[...planWithCount].sort((a,b)=>b.pnl-a.pnl)[0];
  const weakestPlan=[...planWithCount].sort((a,b)=>a.pnl-b.pnl)[0];
  renderAnalysisSummary('statPlanSummary',[
    bestPlan&&{tone:'safe',label:'Melhor status',value:bestPlan.label,sub:`${bestPlan.count} trade(s) · ${(bestPlan.pnl>=0?'+':'')+fR(bestPlan.pnl)}`},
    weakestPlan&&{tone:'danger',label:'Mais fraco',value:weakestPlan.label,sub:`${weakestPlan.count} trade(s) · ${(weakestPlan.pnl>=0?'+':'')+fR(weakestPlan.pnl)}`},
    planWithCount.length&&{tone:'info',label:'Cobertura',value:`${planWithCount.reduce((sum,row)=>sum+row.count,0)} trades`,sub:'plano classificado'},
  ]);
  document.getElementById('statEmoBody').innerHTML=ek.map(e=>{const d=emoMap[e];const tot=d.w+d.l;const avgRv=d.rs.length?d.rs.reduce((a,v)=>a+v,0)/d.rs.length:0;const emotionPlanBase=emotionTrades.filter(t=>t.emotion===e&&['sim','parcial','nao'].includes(t.followedPlan)).length;const fp=emotionTrades.filter(t=>t.emotion===e&&t.followedPlan==='sim').length;const adis=emotionTrades.filter(t=>t.emotion===e&&t.discipline!=null);const avgDis=adis.length?adis.reduce((a,t)=>a+(t.discipline||0),0)/adis.length:null;return`<tr><td><b>${e}</b></td><td>${tot}</td><td class="${d.w/tot>=.5?'text-green':'text-red'}">${(d.w/tot*100).toFixed(0)}%</td><td class="${d.pnl>=0?'text-green':'text-red'}">${(d.pnl/(tot||1)).toFixed(2)}$</td><td>${avgRv.toFixed(2)}R</td><td>${emotionPlanBase?(fp/emotionPlanBase*100).toFixed(0)+'%':'—'}</td><td>${avgDis!=null?avgDis.toFixed(0)+'%':'—'}</td></tr>`;}).join('');
}
