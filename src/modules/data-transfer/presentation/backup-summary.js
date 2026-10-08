function renderBackupSummary(data=createBackupPayload()){
  const el=document.getElementById('backupSummary');
  if(!el)return;
  el.textContent=t('backup.current','Backup atual')+': '+formatBackupSummary(data);
}
