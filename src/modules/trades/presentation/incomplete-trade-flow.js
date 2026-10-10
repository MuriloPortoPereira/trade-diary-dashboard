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
