function updateBulkBar(){
  const bar=document.getElementById('bulkBar');
  const cnt=document.getElementById('bulkCount');
  const hint=document.getElementById('bulkHint');
  const editBtn=document.getElementById('bulkEditBtn');
  const completeBtn=document.getElementById('bulkCompleteBtn');
  if(!bar)return;
  const selectedCount=selectedTrades.size;
  const incompleteCount=getSelectedIncompleteTrades().length;
  if(selectedCount>0){
    bar.classList.add('show');
    if(cnt)cnt.textContent=incompleteCount>0
      ? `${selectedCount} selecionado(s) · ${incompleteCount} incompleto(s)`
      : `${selectedCount} selecionado(s)`;
    if(hint)hint.style.display='none';
  } else{
    bar.classList.remove('show');
    if(hint)hint.style.display='inline-flex';
  }
  if(editBtn)editBtn.textContent=selectedCount===1?'✏ Editar':'✏ Editar seleção';
  if(completeBtn)completeBtn.textContent=incompleteCount>0
    ? `✓ Completar incompletos (${incompleteCount})`
    : '✓ Completar incompletos';
  const chkAll=document.getElementById('chkAll');
  if(chkAll){const all=document.querySelectorAll('#logTbody input[type=checkbox]');chkAll.checked=all.length>0&&[...all].every(c=>c.checked);}
}
