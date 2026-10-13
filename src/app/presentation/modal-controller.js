function openModal(id,tradeId=null){
  if(id==='tradeModal'&&showLogAccountEditLockNotice(tradeId?'editar':'adicionar'))return false;
  editingId=tradeId;
  document.getElementById(id).classList.add('open');
  if(id==='tradeModal'){
    populateSelects();
    if(tradeId){
      const t=trades.find(x=>x.id===tradeId);
      resetForm();
      if(t)fillForm(t);
    } else {
      resetForm();
      document.getElementById('t-date').value=new Date().toISOString().split('T')[0];
      updateTradeDurationField();
    }
    updateTradeModalFlowUI();
  }
  if(id==='accountModal'){
    renderAccountList();
    document.getElementById('accountForm').style.display='none';
  }
}

function closeModal(id){
  document.getElementById(id).classList.remove('open');
  if(id==='tradeModal')clearBulkIncompleteFlow();
}
