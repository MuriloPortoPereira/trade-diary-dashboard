function saveTrade(){
  const get=id=>document.getElementById(id)?.value||'';
  const sym=get('t-symbol').trim();
  const date=get('t-date');
  if(!sym||!date){showAppNotice('Campo obrigatório','Símbolo e data são obrigatórios.');return;}

  const entry=parseFloat(get('t-entry'))||null;
  const stop=parseFloat(get('t-stop'))||null;
  const tp=parseFloat(get('t-tp'))||null;
  const exit=parseFloat(get('t-exit'))||null;
  const dir=get('t-direction');
  const fees=parseFloat(get('t-fees'))||0;
  const placedTime=normalizeClockTime(get('t-placedtime'));
  const openTime=normalizeClockTime(get('t-opentime'));
  const exitTime=normalizeClockTime(get('t-exittime'));

  const acctId=document.getElementById('t-account')?.value||activeAccountId;
  const acct=accounts.find(a=>a.id===acctId)||getActiveAccount();
  const acctBalance=getAccountWorkingBalance(acct);
  const isFut=isFuturesAccount(acct);

  let pnl,r,riskUsd,riskPct,qty,mult;
  if(!isFut){
    pnl=parseFloat(get('t-pnl'))||null;
    r=parseFloat(get('t-r'))||null;
    riskPct=parseFloat(get('t-riskpct'))||null;
    riskUsd=parseFloat(get('t-riskusd'))||null;
  } else {
    pnl=parseFloat(get('t-pnl-abs'))||null;
    r=parseFloat(get('t-r-abs'))||null;
    riskUsd=parseFloat(get('t-riskabs'))||null;
    qty=parseFloat(get('t-qty'))||null;
    mult=parseFloat(get('t-mult'))||acct.mult||null;
  }

  if(!isFut&&riskPct!=null&&(!Number.isFinite(riskUsd)||riskUsd<=0))riskUsd=parseFloat((acctBalance*(riskPct/100)).toFixed(2));

  if(entry&&stop&&exit&&!r){
    const riskPts=Math.abs(entry-stop);
    if(riskPts>0){const pnlPts=dir==='Long'?exit-entry:entry-exit; r=parseFloat((pnlPts/riskPts).toFixed(3));}
  }
  if(r!=null&&riskUsd&&!pnl) pnl=parseFloat((r*riskUsd).toFixed(2));

  const pnlPct=pnl!=null&&acctBalance?pnl/acctBalance:null;
  const missing=[];
  if(!entry)missing.push('entry');
  if(!stop)missing.push('stop');
  if(!get('t-strategy'))missing.push('strategy');
  if(!get('t-emotion'))missing.push('emotion');
  if(!get('t-followedplan'))missing.push('followedPlan');

  const resultType=get('t-result-type');
  let status='OPEN';
  if(resultType==='BE') status='BE';
  else if(resultType==='WIN') status='WIN';
  else if(resultType==='LOSS') status='LOSS';
  else if(exit){
    if(pnl!=null){
      const bePct=Math.abs(pnl)/(riskUsd||1)*100;
      status=pnl>0?'WIN':(bePct<(config.beBreakeven||10))?'BE':'LOSS';
    } else status='OPEN';
  }

  const confVal=parseInt(document.getElementById('t-confidence')?.value)||60;
  const discVal=parseInt(document.getElementById('t-discipline')?.value)||70;

  const trade={
    id: editingId||uid(),
    accountId: acctId,
    symbol:sym, date, market:get('t-market')||getMarket(sym), direction:dir,
    entry, stop, tp, exit,
    qty, mult, riskPct, riskUsd,
    pnl, pnlPct, r, fees,
    strategy:get('t-strategy'), exitDate:get('t-exitdate'), placedTime, openTime, exitTime,
    emoBefore:get('t-emo-before'),
    emotion:get('t-emotion'),
    emoAfter:get('t-emo-after'),
    followedPlan:get('t-followedplan'),
    planDeviation:get('t-plan-deviation'),
    errors:[...selectedErrors],
    resultType,
    discipline:discVal,
    confidence:confVal,
    mistake:get('t-mistake'), remarks:get('t-remarks'),
    images:normalizeDocImages(tradeImages),
    hesitation:document.getElementById('t-hesitation')?.checked||false,
    mode:isFut?'absolute':'percent',
    status,
    incomplete: missing.length>0,
    missing_fields: missing,
    createdAt: editingId?trades.find(t=>t.id===editingId)?.createdAt:new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if(entry&&stop&&exit){
    const riskPts=Math.abs(entry-stop);
    const pnlPts=trade.direction==='Long'?exit-entry:entry-exit;
    trade.r=riskPts>0?parseFloat((pnlPts/riskPts).toFixed(3)):null;
    trade.status=pnlPts>0?'WIN':'LOSS';
  }

  const hadBulkIncompleteFlow=isBulkIncompleteFlowTrade(editingId);
  if(editingId){trades=trades.map(t=>t.id===editingId?trade:t);} else{trades.unshift(trade);}
  save();
  const nextBulkIncompleteId=getNextBulkIncompleteTradeAfterSave(trade.id);
  refreshAll();
  if(nextBulkIncompleteId){
    openModal('tradeModal',nextBulkIncompleteId);
    return;
  }
  closeModal('tradeModal');
  if(hadBulkIncompleteFlow&&trade.incomplete===false&&selectedTrades.size){
    const selectedIncomplete=getSelectedIncompleteTrades().length;
    if(selectedIncomplete===0&&trade.id)showAppNotice('Incompletos revisados','Trades incompletos selecionados foram revisados.');
  }
}

function getSelectedTradeList(){
  return [...selectedTrades].map(id=>trades.find(t=>t.id===id)).filter(Boolean);
}

function getSelectedIncompleteTrades(){
  return getSelectedTradeList().filter(t=>t.incomplete);
}


function showTradeDeleteDoubleConfirm({title, introMessage, finalMessage, onConfirm}){
  showAppConfirm(
    title,
    introMessage,
    ()=>{
      showAppConfirm(
        'Última confirmação',
        finalMessage,
        onConfirm,
        {danger:true,confirmText:'Excluir agora'}
      );
    },
    {danger:true,confirmText:'Continuar'}
  );
}

function bulkDelete(){
  if(!selectedTrades.size)return;
  if(showLogAccountEditLockNotice('excluir'))return;
  const count=selectedTrades.size;
  showTradeDeleteDoubleConfirm({
    title:'Excluir selecionados',
    introMessage:`Você selecionou ${count} trade(s). Quer seguir para confirmação final da exclusão?`,
    finalMessage:`${count} trade(s) selecionado(s) serão removido(s) do histórico.\n\nEsta ação não poderá ser desfeita.`,
    onConfirm:()=>{
    trades=trades.filter(t=>!selectedTrades.has(t.id));
    selectedTrades.clear();
    save();refreshAll();
    }
  });
}

function editSelectedTrades(){
  if(!selectedTrades.size)return;
  if(showLogAccountEditLockNotice('editar'))return;
  const selected=getSelectedTradeList();
  if(selected.length!==1){
    showAppNotice('Editar selecionados','Selecione apenas 1 trade para editar. Para vários trades, use duplicar, excluir ou completar incompletos.');
    return;
  }
  clearBulkIncompleteFlow();
  openModal('tradeModal',selected[0].id);
}

function completeSelectedIncompleteTrades(){
  if(!selectedTrades.size)return;
  if(showLogAccountEditLockNotice('editar'))return;
  const incomplete=getSelectedIncompleteTrades()
    .sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||'').localeCompare(b.createdAt||''));
  if(!incomplete.length){
    showAppNotice(t('notice.incomplete'),t('notice.noIncomplete'));
    return;
  }
  startBulkIncompleteFlow(incomplete.map(t=>t.id));
}

function completeAllIncompleteTrades(){
  if(showLogAccountEditLockNotice('editar'))return;
  const incomplete=getAccountTrades(activeAccountId)
    .filter(t=>t.incomplete)
    .sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||'').localeCompare(b.createdAt||''));
  if(!incomplete.length){
    showAppNotice('Incompletos','Não há trades incompletos nesta conta.');
    return;
  }
  startBulkIncompleteFlow(incomplete.map(t=>t.id));
}

function cloneTradeForDuplicate(source, now=new Date().toISOString()){
  const clone=JSON.parse(JSON.stringify(source||{}));
  clone.id=uid();
  delete clone.positionId;
  clone.createdAt=now;
  clone.updatedAt=now;
  clone.errors=Array.isArray(source?.errors)?[...source.errors]:[];
  clone.images=normalizeDocImages(source?.images);
  return clone;
}

function finishTradeMutation(){
  save();
  if(document.querySelector('.page.active'))refreshAll();
}

function duplicateTrade(id){
  if(showLogAccountEditLockNotice('duplicar'))return;
  const original=trades.find(t=>t.id===id);
  if(!original)return;
  trades.unshift(cloneTradeForDuplicate(original));
  finishTradeMutation();
}

function duplicateSelectedTrades(){
  if(!selectedTrades.size)return;
  if(showLogAccountEditLockNotice('duplicar'))return;
  const copies=[...selectedTrades].map(id=>trades.find(t=>t.id===id)).filter(Boolean).map(t=>cloneTradeForDuplicate(t));
  if(!copies.length)return;
  trades=[...copies,...trades];
  selectedTrades.clear();
  finishTradeMutation();
}

function getLogFilteredTrades({accountId='active',strategy='',startDate='',endDate=''}={}){
  const acctId=accountId==='active'?activeAccountId:(accountId||'active');
  let filtered=acctId==='all'?accounts.flatMap(a=>getAccountTrades(a.id)):[...getAccountTrades(acctId)];
  filtered=filtered.filter(t=>isTradeInLogDateRange(t,startDate,endDate));
  if(strategy)filtered=filtered.filter(t=>t.strategy===strategy);
  return getSortedTrades(filtered);
}

function getLogAccountTrades(accountId='active',dateRange={}){
  const acctId=accountId==='active'?activeAccountId:(accountId||'active');
  const source=acctId==='all'?accounts.flatMap(a=>getAccountTrades(a.id)):getAccountTrades(acctId);
  return source.filter(t=>isTradeInLogDateRange(t,dateRange.startDate,dateRange.endDate));
}

function deleteTrade(id){
  if(showLogAccountEditLockNotice('excluir'))return;
  showTradeDeleteDoubleConfirm({
    title:'Excluir trade',
    introMessage:'Excluir este trade do histórico? Você ainda passará por uma última confirmação.',
    finalMessage:'Este trade será removido do histórico.\n\nEsta ação não poderá ser desfeita.',
    onConfirm:()=>{
    trades=trades.filter(t=>t.id!==id);
    selectedTrades.delete(id);
    save();refreshAll();
    }
  });
}

function getOrderedTrades(arr){
  return [...arr].filter(t=>t?.date).sort((a,b)=>{
    if(a.date===b.date){
      return String(a.createdAt||'').localeCompare(String(b.createdAt||''));
    }
    return String(a.date).localeCompare(String(b.date));
  });
}

function getAnchorTradeDate(arr){
  const ordered=getOrderedTrades(arr);
  return ordered.length ? ordered[ordered.length-1].date : new Date().toISOString().split('T')[0];
}

function filterByPeriod(arr, period){
  const now=new Date(),y=now.getFullYear(),mo=now.getMonth();
  if(period==='today'){const today=now.toISOString().slice(0,10);return arr.filter(t=>t.date===today);}
  if(period==='month') return arr.filter(t=>{if(!t.date)return false;const d=new Date(t.date+'T12:00');return d.getFullYear()===y&&d.getMonth()===mo;});
  if(period==='year')  return arr.filter(t=>{if(!t.date)return false;return new Date(t.date+'T12:00').getFullYear()===y;});
  if(period==='week'){const ws=new Date(now);ws.setDate(now.getDate()-now.getDay());return arr.filter(t=>{if(!t.date)return false;return new Date(t.date+'T12:00')>=ws;});}
  return arr;
}

function mtTradeStatus(pnl){return pnl==null?'OPEN':Math.abs(pnl)<0.005?'BE':pnl>0?'WIN':'LOSS';}

function recomputeAllIncomplete(){
  trades=trades.map(trade=>{
    const missing=calcImportMissingFields(trade,trade.status);
    const incomplete=missing.length>0;
    if(incomplete===!!trade.incomplete&&JSON.stringify(missing)===JSON.stringify(trade.missing_fields||[]))return trade;
    return {...trade,incomplete,missing_fields:missing};
  });
}
