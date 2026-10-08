function renderLogReadOnlyNotice(accountFilter){
  const el=document.getElementById('logReadOnlyNotice');
  if(!el)return;
  const lock=getLogAccountEditLock({accountFilter,requireActivePage:false});
  if(!lock.locked){
    el.style.display='none';
    el.innerHTML='';
    return;
  }
  const target=lock.allAccounts?'todas as contas':lock.accountName;
  const actionText=lock.allAccounts
    ? 'Escolha uma conta específica como conta ativa para adicionar, editar, duplicar ou excluir operações.'
    : `Troque a conta ativa para ${escapeHtml(lock.accountName)} antes de adicionar, editar, duplicar ou excluir operações.`;
  el.style.display='block';
  el.innerHTML=`<div class="alert alert-info"><b>Modo visualização.</b> Você está consultando ${escapeHtml(target)}. ${actionText}</div>`;
}
