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
