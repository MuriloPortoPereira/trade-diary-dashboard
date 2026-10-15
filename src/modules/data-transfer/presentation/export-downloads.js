// JSON/CSV export actions; global APIs retained for inline handlers and legacy consumers.
function exposeJsonExport(){
  return JSON.stringify(createBackupPayload(),null,2);
}

function exportJSON(){
  const payload=createBackupPayload();
  renderBackupSummary(payload);
  const a=document.createElement('a');
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  a.href=url;
  a.download=`tradelog_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function readCustomExportFilters(){
  return {
    from:document.getElementById('exportStartDate')?.value||'',
    to:document.getElementById('exportEndDate')?.value||'',
    accountId:document.getElementById('exportAccount')?.value||'',
  };
}

function exportTradesCSV(list,baseName){
  const rows=Array.isArray(list)?list:[];
  if(!rows.length){showAppNotice('Exportar CSV','Nenhum trade encontrado para esses filtros.');return;}
  downloadTextFile(buildTradesCSV(rows),`${baseName}_${new Date().toISOString().split('T')[0]}.csv`,'text/csv;charset=utf-8');
}

function exportCSV(){
  exportTradesCSV(getAccountTrades(activeAccountId),'trades_todos');
}

function exportCSVCustom(){
  exportTradesCSV(getTradesForCustomExport(readCustomExportFilters()),'trades_personalizado');
}

function exportCSVMonth(){
  const now=new Date();
  const from=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const to=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`;
  exportTradesCSV(getTradesForCustomExport({from,to,accountId:activeAccountId}),'trades_mes');
}
