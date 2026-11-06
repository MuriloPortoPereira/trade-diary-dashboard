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
