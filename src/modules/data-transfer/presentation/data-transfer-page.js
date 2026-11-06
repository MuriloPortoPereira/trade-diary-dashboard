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
// Legacy import handlers and preview; parsers and persistence remain composed by app.js.
function importJSON(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      validateBackupData(data);
      renderBackupSummary(data);
      showAppConfirm('Importar backup completo',`Este backup contém: ${formatBackupSummary(data)}.\n\nRestaurar agora?`,()=>{
        restoreBackupData(data);
        save();refreshAll();renderBackupSummary(createBackupPayload());
        showAppNotice('Backup restaurado','Backup completo importado com sucesso.');
      },{confirmText:'Importar backup'});
    } catch(err){showAppNotice('Erro ao ler backup',err.message,{danger:true});}
  };
  r.readAsText(f);
}

function handleCSVUpload(event){
  const files=Array.from(event.target.files||[]);
  if(!files.length)return;
  const f=files[0];
  const ext=f.name.toLowerCase().split('.').pop();
  const prev=document.getElementById('csvPreview');
  if(ext==='xlsx'){
    if(prev)prev.innerHTML=`<div class="alert alert-info">\u23f3 Processando ${f.name}...</div>`;
    loadSheetJS(()=>{const reader=new FileReader();reader.onload=ev=>{try{const wb=XLSX.read(ev.target.result,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:false});const prepared=prepareImportedTrades(parseSpreadsheetRows(rows,f.name),{accountId:activeAccountId,seedLabel:f.name});setPendingImport(prepared,{accountId:activeAccountId,source:'xlsx'});if(!pendingImport.length){if(prev)prev.innerHTML='<div class="alert alert-warn">Nenhum trade encontrado no XLSX.</div>';showAppNotice('Importação','Nenhum trade encontrado no XLSX.');return;}if(prev)prev.innerHTML=`<div class="alert alert-info">\u2713 ${pendingImport.length} trades detectados.</div>`;showImportPreview(pendingImport);openModal('csvConfirmModal');}catch(err){if(prev)prev.innerHTML=`<div class="alert alert-warn">\u274c Erro: ${err.message}</div>`;}};reader.readAsArrayBuffer(f);});
    return;
  }
  const reader=new FileReader();
  reader.onload=ev=>{
    const prepared=prepareImportedTrades(parseCSVText(ev.target.result || ''),{accountId:activeAccountId,seedLabel:f.name});
    setPendingImport(prepared,{accountId:activeAccountId,source:'csv'});
    if(!pendingImport.length){showAppNotice('Importação','Nenhum trade encontrado no CSV.');return;}
    showImportPreview(pendingImport);openModal('csvConfirmModal');
  };
  reader.readAsText(f,'UTF-8');
}

function parseMT4(){
  const text=document.getElementById('mt4Input')?.value||'';
  if(!text.trim()){showAppNotice('Campo vazio','Cole o conteúdo do relatório histórico no campo.');return;}
  const result=prepareImportedTrades(parseMT4Raw(text),{accountId:activeAccountId,seedLabel:'mt4-text'});
  if(!result.length){showAppNotice('Importação','Nenhum trade detectado. Verifique o conteúdo.');return;}
  setPendingImport(result,{accountId:activeAccountId,source:'mt4'});
  showImportPreview(result);openModal('csvConfirmModal');
}

function showImportPreview(list){
  const ic=document.getElementById('importCount');if(ic)ic.textContent=String(list.length);
  const prev=document.getElementById('csvConfirmPreview');
  if(!prev)return;
  const inc=list.filter(t=>t.incomplete);
  const targetAccountId=getPendingImportAccountId();
  const target=accounts.find(a=>a.id===targetAccountId)?.name||'Conta ativa';
  prev.innerHTML=`<div class="alert alert-info">\ud83d\udcca ${list.length} trades detectados${inc.length?' · \u26a0 '+inc.length+' incompletos':''} · conta alvo: <b>${escapeHtml(target)}</b></div>
    <div style="overflow-x:auto;max-height:280px;overflow-y:auto">
    <table class="tbl"><thead><tr><th>Data</th><th>Símbolo</th><th>Mercado</th><th>Dir</th><th>Entrada</th><th>Saída</th><th>P/L</th><th>Status</th></tr></thead>
    <tbody>${list.slice(0,80).map(t=>`<tr>
      <td class="mono">${fDate(t.date)}</td><td><b>${t.symbol}</b></td>
      <td style="font-size:10px">${t.market||'—'}</td>
      <td><span class="badge ${(t.direction||'').toLowerCase()}">${t.direction}</span></td>
      <td class="mono">${t.entry||'—'}</td><td class="mono">${t.exit||'—'}</td>
      <td class="mono ${(t.pnl||0)>0?'text-green':(t.pnl||0)<0?'text-red':''}">${t.pnl!=null?((t.pnl>=0?'+':'')+fR(t.pnl)):'—'}</td>
      <td><span class="badge ${(t.status||'open').toLowerCase()}">${t.status}</span></td>
    </tr>`).join('')}
    ${list.length>80?`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:8px">...e mais ${list.length-80} trades</td></tr>`:''}</tbody>
    </table></div>`;
}

function confirmImport(){
  const targetAccountId=getPendingImportAccountId();
  const isNewTrade=TradeDiaryImportTradeRules.createImportedTradeFilter(trades,t=>getTradeImportPositionKey(t,targetAccountId));
  const newTrades=pendingImport.filter(isNewTrade);
  trades=[...newTrades,...trades];
  clearPendingImport();
  _incompleteBannerDismissed=false;
  save();closeModal('csvConfirmModal');refreshAll();
  const importedIncomplete=newTrades
    .filter(t=>t.incomplete)
    .sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  if(importedIncomplete.length){
    showAppNotice('Importação concluída',`\u2713 ${newTrades.length} trades importados · ${importedIncomplete.length} precisam ser completados. Abrindo editor...`);
    setTimeout(()=>{
      showPage('log');
      startBulkIncompleteFlow(importedIncomplete.map(t=>t.id));
    },600);
  } else {
    showAppNotice('Importação concluída','\u2713 '+newTrades.length+' trades importados!');
  }
}

function handleMT5Upload(e){
  const f=e.target.files[0];if(!f)return;
  const ext=f.name.toLowerCase().split('.').pop();
  const prev=document.getElementById('csvPreview')||document.getElementById('mt4Preview');
  if(prev)prev.innerHTML=`<div class="alert alert-info">\u23f3 Processando ${f.name}...</div>`;
  if(ext==='xlsx'){
    loadSheetJS(()=>{const r=new FileReader();r.onload=ev=>{try{const wb=XLSX.read(ev.target.result,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:false});handleMT5Result(parseSpreadsheetRows(rows,f.name),prev);}catch(err){if(prev)prev.innerHTML=`<div class="alert alert-warn">\u274c Erro: ${err.message}</div>`;}};r.readAsArrayBuffer(f);});
  } else if(ext==='html'||ext==='htm'){
    const r=new FileReader();r.onload=ev=>{handleMT5Result(parseMT5HTML(ev.target.result,f.name),prev);};r.readAsText(f,'utf-16');
  } else {const r=new FileReader();r.onload=ev=>{handleMT5Result(parseMT4Raw(ev.target.result),prev);};r.readAsText(f);}
}

function handleReportUpload(e){
  const f=e.target.files[0];if(!f)return;
  const ext=f.name.toLowerCase().split('.').pop();
  if(ext==='html'||ext==='htm')handleMT5Upload(e);
  else handleCSVUpload(e);
}

function handleHistoryUpload(e){
  handleReportUpload(e);
}

function handleMT5Result(result,prevEl){
  if(!result.length){if(prevEl)prevEl.innerHTML=`<div class="alert alert-warn">\u274c Nenhum trade detectado. Verifique se é um relatório histórico válido (XLSX, HTML ou CSV).</div>`;return;}
  setPendingImport(prepareImportedTrades(result,{accountId:activeAccountId,seedLabel:'upload'}),{accountId:activeAccountId,source:'upload'});
  if(prevEl)prevEl.innerHTML=`<div class="alert alert-info">\u2713 ${result.length} trades detectados.</div>`;
  showImportPreview(pendingImport);openModal('csvConfirmModal');
}
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


function triggerFileInput(id){
  document.getElementById(id)?.click();
}

function clearAll(){
  showAppPrompt('Limpar todos os dados',
    `Isso apagará TODOS os ${trades.length} trades e dados de pré-mercado.\n\nPara confirmar, digite exatamente: APAGAR TUDO`,
    '',
    ()=>{
      trades=[];preMarketData={};
      save();refreshAll();showAppNotice('Dados apagados','Todos os dados foram apagados.');
    },
    {danger:true,confirmText:'Limpar tudo',inputLabel:'Confirmação',requiredValue:'APAGAR TUDO',errorText:'Digite APAGAR TUDO para confirmar.'}
  );
}
