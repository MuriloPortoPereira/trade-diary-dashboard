function renderBackupSummary(data=createBackupPayload()){
  const el=document.getElementById('backupSummary');
  if(!el)return;
  el.textContent=t('backup.current','Backup atual')+': '+formatBackupSummary(data);
}

function renderExportAccountFilter(){
  const el=document.getElementById('exportAccount');
  if(!el)return;
  const current=el.value;
  el.innerHTML='<option value="">Todas</option>'+accounts.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  el.value=[...el.options].some(o=>o.value===current)?current:'';
}

function switchImportTab(id){
  ['csv','export'].forEach(tab=>{
    const el=document.getElementById('importTab-'+tab);
    if(el)el.style.display=tab===id?'':'none';
  });
  document.querySelectorAll('#page-import .tab-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.getAttribute('onclick')?.includes(`'${id}'`));
  });
  if(id==='export'){renderBackupSummary(createBackupPayload());renderExportAccountFilter();}
}
