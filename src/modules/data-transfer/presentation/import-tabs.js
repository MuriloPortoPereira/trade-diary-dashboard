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
