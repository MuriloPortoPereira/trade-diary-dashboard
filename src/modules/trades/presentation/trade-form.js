// Incomplete trade editing flow and modal state; classic global compatibility.
function isBulkIncompleteFlowTrade(tradeId){
  return !!tradeId&&bulkIncompleteEditIds.includes(tradeId);
}

function clearBulkIncompleteFlow(){
  bulkIncompleteEditIds=[];
  bulkIncompleteEditIndex=-1;
  updateTradeModalFlowUI();
}

function openBulkIncompleteTradeAt(index){
  const queue=bulkIncompleteEditIds.filter(id=>getAccountTrades(activeAccountId).some(t=>t.id===id&&t.incomplete));
  bulkIncompleteEditIds=[...new Set(queue)];
  if(!bulkIncompleteEditIds.length){
    clearBulkIncompleteFlow();
    return false;
  }
  bulkIncompleteEditIndex=Math.max(0,Math.min(index,bulkIncompleteEditIds.length-1));
  return openModal('tradeModal',bulkIncompleteEditIds[bulkIncompleteEditIndex]);
}

function openPreviousBulkIncompleteTrade(){
  if(bulkIncompleteEditIndex<=0)return;
  openBulkIncompleteTradeAt(bulkIncompleteEditIndex-1);
}

function openNextBulkIncompleteTrade(){
  if(bulkIncompleteEditIndex<0||bulkIncompleteEditIndex>=bulkIncompleteEditIds.length-1)return;
  openBulkIncompleteTradeAt(bulkIncompleteEditIndex+1);
}

function startBulkIncompleteFlow(ids=[]){
  bulkIncompleteEditIds=[...new Set(ids.filter(id=>getAccountTrades(activeAccountId).some(t=>t.id===id&&t.incomplete)))];
  if(!bulkIncompleteEditIds.length){
    clearBulkIncompleteFlow();
    showAppNotice(t('notice.incomplete'),t('notice.noIncomplete'));
    return false;
  }
  bulkIncompleteEditIndex=0;
  return openBulkIncompleteTradeAt(0);
}

function getNextBulkIncompleteTradeAfterSave(currentId){
  if(!bulkIncompleteEditIds.length)return null;
  bulkIncompleteEditIds=[...new Set(bulkIncompleteEditIds.filter(id=>getAccountTrades(activeAccountId).some(t=>t.id===id&&t.incomplete)))];
  if(!bulkIncompleteEditIds.length){
    clearBulkIncompleteFlow();
    return null;
  }
  const nextId=bulkIncompleteEditIds.find(id=>id!==currentId)||null;
  if(!nextId){
    clearBulkIncompleteFlow();
    return null;
  }
  bulkIncompleteEditIndex=Math.max(0,bulkIncompleteEditIds.indexOf(nextId));
  return nextId;
}

function updateTradeModalFlowUI(){
  const title=document.getElementById('tradeModalTitle');
  const flow=document.getElementById('tradeModalFlow');
  const label=document.getElementById('tradeModalFlowLabel');
  const prev=document.getElementById('tradeModalPrevBtn');
  const next=document.getElementById('tradeModalNextBtn');
  const saveBtn=document.getElementById('tradeModalSaveBtn');
  const active=bulkIncompleteEditIds.length>0&&bulkIncompleteEditIndex>=0&&isBulkIncompleteFlowTrade(editingId);

  if(title)title.textContent=editingId
    ? active?'Completar Trade Incompleto':'Editar Trade'
    : 'Registrar Trade';

  if(saveBtn)saveBtn.textContent=active&&bulkIncompleteEditIds.length>1?'Salvar e continuar':'Salvar Trade';
  if(!flow||!label||!prev||!next)return;

  if(!active){
    flow.style.display='none';
    label.textContent='';
    prev.disabled=true;
    next.disabled=true;
    return;
  }

  const total=bulkIncompleteEditIds.length;
  const currentTrade=trades.find(t=>t.id===editingId);
  flow.style.display='flex';
  label.textContent=`Completar incompletos ${bulkIncompleteEditIndex+1} de ${total}${currentTrade?.symbol?` · ${currentTrade.symbol}`:''}`;
  prev.disabled=bulkIncompleteEditIndex<=0;
  next.disabled=bulkIncompleteEditIndex>=total-1;
}

let _incompleteBannerDismissed=false;

function updateIncompleteBanner(){
  const count=getAccountTrades(activeAccountId).filter(t=>t.incomplete).length;
  const el=document.getElementById('incompleteAlert');
  const countEl=document.getElementById('incompleteCount');
  if(el)el.style.display=count&&!_incompleteBannerDismissed?'block':'none';
  if(countEl)countEl.textContent=count;
}

function dismissIncompleteBanner(){
  _incompleteBannerDismissed=true;
  updateIncompleteBanner();
}

function renderErrorChips(){
  const el=document.getElementById('errorChips');
  if(!el)return;
  const labels=[...DEFAULT_TRADE_ERRORS,...selectedErrors]
    .map(e=>String(e||'').trim())
    .filter(Boolean)
    .filter((e,i,arr)=>arr.indexOf(e)===i);
  el.innerHTML=labels.map(label=>{
    const on=selectedErrors.includes(label);
    return `<button type="button" class="err-chip ${on?'on':''}" onclick="toggleTradeError(decodeURIComponent('${encodeURIComponent(label)}'))">${escapeHtml(label)}</button>`;
  }).join('');
}

function autoDisc(force=false){
  const disc=document.getElementById('t-discipline');
  if(!disc)return;
  if(disc.dataset.manual==='1'&&!force)return;

  const get=id=>document.getElementById(id)?.value||'';
  const isChecked=id=>!!document.getElementById(id)?.checked;
  const riskyEmotions=['FOMO','Raiva','Culpa','Frustração','Medo','Euforia'];
  const severeErrors=['Revenge trade','Aumentou lote no prejuízo','Não aceitou stop','Risco maior que o plano','Entrou sem gatilho','Overtrade','FOMO'];
  let score=96;
  const reasons=[];

  const followed=get('t-followedplan');
  if(followed==='nao'){score-=30;reasons.push('plano não seguido');}
  else if(followed==='parcial'){score-=15;reasons.push('plano parcial');}
  else if(followed==='sim')score+=2;

  const errors=selectedErrors.map(e=>String(e||'').trim()).filter(Boolean);
  if(errors.length){
    const errorPenalty=errors.reduce((sum,e)=>sum+(severeErrors.includes(e)?12:8),0);
    score-=Math.min(48,errorPenalty);
    reasons.push(`${errors.length} erro${errors.length>1?'s':''} marcado${errors.length>1?'s':''}`);
  }

  const mistake=get('t-mistake').trim();
  if(mistake&&!errors.length){score-=6;reasons.push('erro descrito');}

  const deviation=get('t-plan-deviation').trim();
  if(deviation){
    const normalizedDeviation=normalizeLooseText(deviation);
    let deviationPenalty=followed==='sim'?4:followed==='parcial'?10:followed==='nao'?14:8;
    if(['horario','acelerou','gatilho','agressividade','revenge','fomo','stop','pressa','lote'].some(token=>normalizedDeviation.includes(token))){
      deviationPenalty+=4;
    }
    score-=deviationPenalty;
    reasons.push('desvio descrito');
  }

  const emotions=[get('t-emo-before'),get('t-emotion'),get('t-emo-after')].filter(Boolean);
  const riskyCount=[...new Set(emotions.filter(e=>riskyEmotions.includes(e)))].length;
  if(riskyCount){score-=Math.min(18,riskyCount*6);reasons.push('emoção de risco');}

  const confidence=parseInt(get('t-confidence'),10);
  if(Number.isFinite(confidence)){
    if(confidence<40){score-=12;reasons.push('confiança baixa');}
    else if(confidence<60){score-=6;reasons.push('confiança moderada');}
    else if(confidence>=80)score+=2;
    if(confidence>=85&&(errors.length||riskyCount||followed==='nao')){score-=6;reasons.push('excesso de confiança');}
    if(confidence<40&&(errors.length||riskyCount||followed==='parcial'||followed==='nao')){score-=6;reasons.push('executou sem clareza');}
  }

  if(isChecked('t-hesitation')){score-=10;reasons.push('hesitação');}
  if(!followed&&(errors.length||mistake||deviation||isChecked('t-hesitation'))){score-=8;reasons.push('plano indefinido');}

  const result=get('t-result-type');
  if(result==='BE')score-=2;

  const finalScore=clampDisciplineScore(score);
  disc.value=finalScore;
  disc.dataset.manual='';
  const label=document.getElementById('t-disc-val');
  if(label)label.textContent=finalScore+'%';
  const explain=document.getElementById('discExplain');
  if(explain)explain.textContent=reasons.length?`Auto: ${reasons.join(' · ')}.`:'Auto: execução limpa.';
}

function resetForm(){
  ['t-symbol','t-date','t-entry','t-stop','t-tp','t-exit',
   't-riskpct','t-riskusd','t-r','t-pnl',
   't-qty','t-mult','t-riskabs','t-pnl-abs','t-r-abs',
   't-fees','t-strategy','t-market','t-emotion','t-emo-before','t-emo-after',
   't-followedplan','t-plan-deviation','t-mistake','t-remarks','t-exitdate','t-result-type',
   't-placedtime','t-opentime','t-exittime','t-duration'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const f=document.getElementById('t-fees');if(f)f.value='0';
  const h=document.getElementById('t-hesitation');if(h)h.checked=false;
  const conf=document.getElementById('t-confidence');if(conf)conf.value=60;
  const confV=document.getElementById('t-conf-val');if(confV)confV.textContent='60%';
  const disc=document.getElementById('t-discipline');if(disc){disc.value=70;disc.dataset.manual='';}
  const discV=document.getElementById('t-disc-val');if(discV)discV.textContent='70%';
  const de=document.getElementById('discExplain');if(de)de.textContent='';
  const pd=document.getElementById('t-plan-deviation');
  if(pd){pd.disabled=false;pd.style.opacity='1';pd.placeholder='O que mudou na execução, entrada, saída ou gestão?';}
  const a=getActiveAccount();
  const rp=document.getElementById('t-riskpct');if(rp&&a.risk)rp.value=a.risk;
  const mp=document.getElementById('t-mult');if(mp&&a.mult)mp.value=a.mult;
  const pEl=document.getElementById('modePercentFields');
  const aEl=document.getElementById('modeAbsFields');
  if(pEl)pEl.style.display=isFuturesAccount(a)?'none':'';
  if(aEl)aEl.style.display=isFuturesAccount(a)?'':'none';
  selectedErrors=[];
  tradeImages=[];
  const imgInput=document.getElementById('t-images');if(imgInput)imgInput.value='';
  renderErrorChips();
  renderImagePreviews();
  updateTradeDurationField();
}

function fillForm(t){
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v;};
  set('t-symbol',t.symbol);set('t-date',t.date);set('t-entry',t.entry);
  set('t-stop',t.stop);set('t-tp',t.tp);set('t-exit',t.exit);
  set('t-fees',t.fees||0);set('t-strategy',t.strategy);set('t-market',t.market);set('t-direction',t.direction);
  set('t-emotion',t.emotion);set('t-emo-before',t.emoBefore);set('t-emo-after',t.emoAfter);
  set('t-followedplan',t.followedPlan);
  set('t-result-type',t.resultType||'');set('t-mistake',t.mistake);set('t-remarks',t.remarks);set('t-exitdate',t.exitDate);
  set('t-placedtime',normalizeClockTime(t.placedTime));set('t-opentime',normalizeClockTime(t.openTime));set('t-exittime',normalizeClockTime(t.exitTime));
  const h=document.getElementById('t-hesitation');if(h)h.checked=t.hesitation||false;
  const confVal=t.confidence!=null?(t.confidence<=5?t.confidence*20:t.confidence):60;
  const discVal=t.discipline!=null?(t.discipline<=5?t.discipline*20:t.discipline):70;
  const conf=document.getElementById('t-confidence');if(conf)conf.value=confVal;
  const confV=document.getElementById('t-conf-val');if(confV)confV.textContent=confVal+'%';
  const disc=document.getElementById('t-discipline');if(disc){disc.value=discVal;disc.dataset.manual='1';}
  const discV=document.getElementById('t-disc-val');if(discV)discV.textContent=discVal+'%';
  const pd=document.getElementById('t-plan-deviation');
  if(pd){pd.value=t.planDeviation||'';pd.disabled=false;pd.style.opacity='1';}
  set('t-riskpct',t.riskPct);set('t-riskusd',t.riskUsd);set('t-r',t.r);set('t-pnl',t.pnl);
  set('t-qty',t.qty);set('t-mult',t.mult);set('t-riskabs',t.riskUsd);set('t-r-abs',t.r);set('t-pnl-abs',t.pnl);
  const acctSel=document.getElementById('t-account');
  if(acctSel)acctSel.value=t.accountId||activeAccountId;
  selectedErrors=Array.isArray(t.errors)?[...t.errors]:[];renderErrorChips();
  const a=accounts.find(x=>x.id===(t.accountId||activeAccountId))||getActiveAccount();
  const pEl=document.getElementById('modePercentFields');const aEl=document.getElementById('modeAbsFields');
  if(pEl)pEl.style.display=isFuturesAccount(a)?'none':'';
  if(aEl)aEl.style.display=isFuturesAccount(a)?'':'none';
  tradeImages=normalizeDocImages(t.images);
  const imgInput=document.getElementById('t-images');if(imgInput)imgInput.value='';
  renderImagePreviews();
  updateTradeDurationField();
}

function calcRR(){
  const g=id=>{const el=document.getElementById(id);return el?parseFloat(el.value)||0:0;};
  const gs=id=>{const el=document.getElementById(id);return el?el.value:'';};
  const entry=g('t-entry'),stop_=g('t-stop'),exit_=g('t-exit'),tp_=g('t-tp');
  const dir=gs('t-direction')||'Long';
  const riskPts=(entry&&stop_)?Math.abs(entry-stop_):0;

  if(config.mode==='percent'){
    const riskPct=g('t-riskpct');
    const bal=getAccountWorkingBalance(getTradeFormAccount());
    const riskUsd=bal*(riskPct/100);
    const elRU=document.getElementById('t-riskusd');
    if(elRU&&riskPct>0)elRU.value=riskUsd.toFixed(2);

    if(entry&&stop_&&riskPts>0){
      const exitP=exit_||tp_;
      if(exitP){
        const pnlPts=dir==='Long'?(exitP-entry):(entry-exitP);
        const r=parseFloat((pnlPts/riskPts).toFixed(3));
        const elR=document.getElementById('t-r');if(elR)elR.value=r;
        const actualRisk=riskUsd||g('t-riskusd');
        const pnlUsd=r*actualRisk;
        const elP=document.getElementById('t-pnl');
        if(elP)elP.value=pnlUsd.toFixed(2);
      }
    }
  } else {
    const qty=g('t-qty'),mult=g('t-mult')||config.mult||1;
    const elRA=document.getElementById('t-riskabs');
    if(entry&&stop_&&qty&&riskPts>0){
      const riskUsd=riskPts*qty*mult;
      if(elRA)elRA.value=riskUsd.toFixed(2);
      const exitP=exit_||tp_;
      if(exitP){
        const pnlPts=dir==='Long'?(exitP-entry):(entry-exitP);
        const r=parseFloat((pnlPts/riskPts).toFixed(3));
        const pnlUsd=pnlPts*qty*mult;
        const elR=document.getElementById('t-r-abs');if(elR)elR.value=r;
        const elP=document.getElementById('t-pnl-abs');if(elP)elP.value=pnlUsd.toFixed(2);
      }
    }
  }
}

function updateTradeDurationField(){
  const el=document.getElementById('t-duration');
  if(!el)return;
  const trade={
    date:document.getElementById('t-date')?.value||'',
    exitDate:document.getElementById('t-exitdate')?.value||document.getElementById('t-date')?.value||'',
    openTime:document.getElementById('t-opentime')?.value||'',
    exitTime:document.getElementById('t-exittime')?.value||'',
  };
  const minutes=getTradeDurationMinutes(trade);
  el.value=minutes!=null?formatDurationMinutes(minutes):'';
}

function togglePlanDeviation(){
  const pd=document.getElementById('t-plan-deviation');
  if(!pd)return;
  pd.disabled=false;
  pd.style.opacity='1';
  const followed=document.getElementById('t-followedplan')?.value||'';
  pd.placeholder=followed==='sim'
    ? 'Opcional: algum detalhe mesmo seguindo o plano?'
    : 'O que mudou na execução, entrada, saída ou gestão?';
  autoDisc();
}

function populateSelects(){
  const emoOpts='<option value="">—</option>'+config.emotions.map(s=>`<option>${s}</option>`).join('');
  ['t-emotion','t-emo-before','t-emo-after'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=emoOpts;});
  const strat=document.getElementById('t-strategy');
  if(strat)strat.innerHTML='<option value="">— Estratégia —</option>'+config.strategies.map(s=>`<option>${s}</option>`).join('');
  const mkt=document.getElementById('t-market');
  if(mkt)mkt.innerHTML='<option value="">— Mercado —</option>'+config.markets.map(s=>`<option>${s}</option>`).join('');
  const acctSel=document.getElementById('t-account');
  if(acctSel){acctSel.innerHTML=accounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');acctSel.value=activeAccountId;}
  const dl=document.getElementById('symbolsList');
  if(dl)dl.innerHTML=(config.symbols||[]).map(s=>`<option value="${s}">`).join('');
  onAccountChange();
  selectedErrors=[];renderErrorChips();
}

function toggleTradeError(label){
  const key=String(label||'').trim();
  if(!key)return;
  selectedErrors=selectedErrors.includes(key)
    ? selectedErrors.filter(e=>e!==key)
    : [...selectedErrors,key];
  renderErrorChips();
  autoDisc(true);
}

function onAccountChange(){
  const selId=document.getElementById('t-account')?.value;
  const a=accounts.find(x=>x.id===selId)||getActiveAccount();
  const rp=document.getElementById('t-riskpct');if(rp)rp.value=a.risk;
  const mp=document.getElementById('t-mult');if(mp)mp.value=a.mult||1;
  const pEl=document.getElementById('modePercentFields');
  const aEl=document.getElementById('modeAbsFields');
  if(pEl)pEl.style.display=isFuturesAccount(a)?'none':'';
  if(aEl)aEl.style.display=isFuturesAccount(a)?'':'none';
  const infoEl=document.getElementById('t-acct-info');
  if(infoEl){const acctTrades=getAccountTrades(a.id);const risk=calcAccountRiskState(a,acctTrades);infoEl.innerHTML=`<span style="color:var(--muted)">Saldo: <b style="color:var(--text)">${fR(risk.currentBalance)}</b></span><br><span style="color:var(--muted)">Aportes líquidos: ${fR(risk.cashflowNet)} · Meta: ${a.goalPct}%</span>`;}
  calcRR();
}

function updateMarketFromSymbol(){
  const sym=document.getElementById('t-symbol')?.value;
  const mkt=getMarket(sym);
  const sel=document.getElementById('t-market');if(sel&&mkt)sel.value=mkt;
}

function renderImagePreviews(){
  const preview=document.getElementById('t-images-preview');if(!preview)return;
  preview.innerHTML=tradeImages.map((img,i)=>`<div style="position:relative;display:inline-block"><img src="${img.dataUrl}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border2)" title="${img.name}"><button onclick="removeTradeImage(${i})" style="position:absolute;top:-4px;right:-4px;background:var(--red);border:none;border-radius:50%;width:16px;height:16px;color:white;font-size:10px">✕</button></div>`).join('');
}
