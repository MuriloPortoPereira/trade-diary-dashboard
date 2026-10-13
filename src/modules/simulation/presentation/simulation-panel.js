function applySimulationAccountSnapshot(accountId){
  const snapshot=getSimulationAccountSnapshot(accountId);
  const balanceEl=document.getElementById('simBalance');
  if(balanceEl){
    balanceEl.value=snapshot.balance.toFixed(2);
    balanceEl.readOnly=accountId&&accountId!=='manual';
  }
  setSimulationInputValue('simWR',clampSimulationWinRatePct(snapshot.winRatePct),1);
  setSimulationInputValue('simRiskPct',snapshot.riskPct,2);
  setSimulationInputValue('simGoalPct',snapshot.goalPct,2);
  setSimulationInputValue('simStopPct',snapshot.stopPct,2);
  setSimulationRrrInput(snapshot.rrr);
  syncSimulationMoneyFromPercent();
}

function resetSimulationEntryDefaults(){
  const selected=document.getElementById('simAccount')?.value;
  const accountId=selected&&selected!=='manual'?selected:activeAccountId;
  applySimulationAccountSnapshot(accountId||'manual');
}

function loadSimFromAccount(){
  const id=document.getElementById('simAccount')?.value;
  const balanceEl=document.getElementById('simBalance');
  if(!id||id==='manual'){
    if(balanceEl)balanceEl.readOnly=false;
    applySimulationAccountSnapshot('manual');
    renderSimulation();
    return;
  }
  applySimulationAccountSnapshot(id);
  renderSimulation();
}

function renderSimulation(){
  const acctSel=document.getElementById('simAccount');
  if(acctSel&&acctSel.options.length<=1){
    const currentValue=acctSel.value;
    accounts.forEach(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name;acctSel.appendChild(o);});
    if(currentValue==='manual'){
      acctSel.value='manual';
    } else if(currentValue&&accounts.some(a=>a.id===currentValue)){
      acctSel.value=currentValue;
      applySimulationAccountSnapshot(currentValue);
    } else if(activeAccountId&&accounts.some(a=>a.id===activeAccountId)){
      acctSel.value=activeAccountId;
      applySimulationAccountSnapshot(activeAccountId);
    }
  }
  const rrrSel=document.getElementById('simRRR');
  const rrrCustom=document.getElementById('simRRRCustom');
  if(rrrSel&&rrrCustom){const isCustom=rrrSel.value==='custom';rrrCustom.style.display=isCustom?'block':'none';}
  const sizing=syncSimulationMoneyFromPercent();
  const N=parseInt(document.getElementById('simN')?.value)||20;
  const wrEl=document.getElementById('simWR');
  const wrPct=clampSimulationWinRatePct(wrEl?.value);
  const wr=wrPct/100;
  const rrrRaw=document.getElementById('simRRR')?.value;
  const rrr=rrrRaw==='custom'?parseFloat(document.getElementById('simRRRCustom')?.value)||1:parseFloat(rrrRaw)||1;
  const risk=Number.isFinite(sizing.riskUsd)?sizing.riskUsd:toSimulationNumber(document.getElementById('simRisk')?.value,10);
  const goalDay=Number.isFinite(sizing.goalUsd)?sizing.goalUsd:toSimulationNumber(document.getElementById('simGoalDay')?.value,50);
  const stopDay=Number.isFinite(sizing.stopUsd)?sizing.stopUsd:toSimulationNumber(document.getElementById('simStopDay')?.value,30);
  const balance=toSimulationNumber(document.getElementById('simBalance')?.value,1000);
  const expectancy=wr*rrr*risk-(1-wr)*risk;
  const exp_N=expectancy*N;
  const pf_=wr>0?(wr*rrr)/((1-wr)||0.001):0;
  const projection=buildMonteCarloBalanceProjection({balance,trades:N,winRate:wr,rrr,riskUsd:risk,goalUsd:goalDay,stopUsd:stopDay,scenarioCount:100});
  document.getElementById('simCards').innerHTML=[
    {cls:'c-yellow',lbl:'Expectância/trade',val:(expectancy>=0?'+':'')+fR(expectancy),tip:TIPS.exp},
    {cls:'c-green',lbl:'Resultado esperado (N)',val:(exp_N>=0?'+':'')+fR(exp_N),tip:TIPS.expN},
    {cls:'c-purple',lbl:'Profit Factor',val:isFinite(pf_)?pf_.toFixed(2):'∞',tip:TIPS.pf},
    {cls:'c-blue',lbl:'P(positivo)',val:projection.probPositive+'%',tip:TIPS.probPos},
  ].map(mkCard).join('');
  const sumEl=document.getElementById('simSummary');
  if(sumEl)sumEl.innerHTML=`<b style="color:var(--green)">${projection.probGoal}%</b> de chance de atingir meta (${sizing.goalPct}% / ${fR(goalDay)}) · <b style="color:var(--red)">${projection.probStop}%</b> de bater stop (${sizing.stopPct}% / ${fR(stopDay)}) em ${N} trades com RRR ${rrr}`;
  const plan=buildSimulationPlan({trades:N,winRatePct:wr*100,rrr,riskUsd:risk,goalPct:sizing.goalPct,goalUsd:goalDay,stopPct:sizing.stopPct,stopUsd:stopDay});
  const planEl=document.getElementById('simPlan');
  if(planEl)planEl.innerHTML=`<div class="status-item ${plan.tone}"><div class="status-item-copy"><div class="status-item-title">${escapeHtml(plan.title)}</div><div class="status-item-summary">${escapeHtml(plan.summary)}</div></div><div class="status-item-value">${escapeHtml((plan.expectancyUsd>=0?'+':'')+fR(plan.expectancyUsd)+'/T')}</div></div>`;
  const scenarioDatasets=projection.scenarios.slice(0,30).map(line=>({data:line,borderColor:'rgba(77,124,254,.06)',borderWidth:1,pointRadius:0,tension:.3,showLine:true}));
  mkChart('simChart',{type:'line',data:{labels:projection.labels,datasets:[{label:'Mediana',data:projection.medianLine,borderColor:'#22d5ed',borderWidth:2.5,pointRadius:0,tension:.3},...scenarioDatasets,{label:'Meta',data:projection.labels.map(()=>projection.goalBalance),borderColor:'rgba(0,214,143,.5)',borderWidth:1,borderDash:[4,4],pointRadius:0},{label:'Stop',data:projection.labels.map(()=>projection.stopBalance),borderColor:'rgba(255,93,104,.50)',borderWidth:1,borderDash:[4,4],pointRadius:0}]},options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
}
