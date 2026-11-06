function setDocumentEntryImages(entry,images){
  if(!entry)return;
  const next=normalizeDocImages(images);
  const now=new Date().toISOString();
  if(entry.kind==='trade'){
    const idx=trades.findIndex(trade=>trade.id===entry.tradeId);
    if(idx>=0){
      trades[idx].images=next;
      trades[idx].updatedAt=now;
    }
    return;
  }
  if(entry.kind==='daily'){
    if(!preMarketData[entry.date])preMarketData[entry.date]={};
    preMarketData[entry.date].images=next;
    preMarketData[entry.date].savedAt=now;
    return;
  }
  if(entry.kind==='general'){
    const idx=(config.generalDocs||[]).findIndex(doc=>doc.id===entry.docId);
    if(idx>=0){
      config.generalDocs[idx].images=next;
      config.generalDocs[idx].updatedAt=now;
    }
  }
}

function triggerDocumentImageUpload(){
  const entry=getCurrentDocumentEntry();
  if(!entry){showAppNotice('Selecione um documento','Selecione uma nota antes de adicionar imagem.');return;}
  document.getElementById('docImageInput')?.click();
}

function addDocumentImages(e){
  const entry=getCurrentDocumentEntry();
  const files=Array.from(e.target.files||[]);
  if(!entry||!files.length)return;
  const target={...entry};
  files.forEach(file=>{
    if(!file.type.startsWith('image/'))return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const images=[...getDocumentEntryImages(target),{name:file.name,dataUrl:ev.target.result}];
      target.images=images;
      setDocumentEntryImages(target,images);
      save();
      renderDocumentsPage();
    };
    reader.readAsDataURL(file);
  });
  e.target.value='';
}

function removeDocumentImage(index){
  const entry=getCurrentDocumentEntry();
  if(!entry)return;
  const images=getDocumentEntryImages(entry);
  images.splice(index,1);
  setDocumentEntryImages(entry,images);
  save();
  renderDocumentsPage();
}

function getDocumentEntries(folderId=activeDocFolder){
  if(folderId==='tradeNotes'){
    return getOrderedTrades(getAccountTrades(activeAccountId))
      .filter(trade=>(trade.remarks||'').trim())
      .map(trade=>{
        const images=normalizeDocImages(trade.images);
        const pnlStr=trade.pnl!=null?((trade.pnl>=0?'+':'')+fR(trade.pnl)):'—';
        const rStr=(trade.r!=null&&Number.isFinite(trade.r))?((trade.r>=0?'+':'')+trade.r.toFixed(2)+'R'):'';
        return {
          id:`trade:${trade.id}`,
          kind:'trade',
          tradeId:trade.id,
          status:trade.status||'OPEN',
          pnl:trade.pnl,
          title:`${trade.symbol||'Trade'} · ${formatDocDate(trade.date)}`,
          meta:`${trade.strategy||'Sem estratégia'}${rStr?' · '+rStr:''} · ${pnlStr}`,
          body:trade.remarks||'',
          images,
          media:images[0]?.dataUrl||null,
          updatedAt:trade.updatedAt||trade.createdAt||'',
        };
      });
  }
  if(folderId==='dailyNotes'){
    return Object.entries(preMarketData)
      .filter(([,entry])=>entry?.docCreatedAt||(entry?.notes||'').trim())
      .sort((a,b)=>b[0].localeCompare(a[0]))
      .map(([date,entry])=>{
        const images=normalizeDocImages(entry.images);
        const parts=[];
        if(entry.mood)parts.push(`Humor ${entry.mood}/5`);
        if(entry.energy)parts.push(`Energia ${entry.energy}/5`);
        if(entry.stress)parts.push(`Estresse ${entry.stress}/5`);
        return {
          id:`daily:${date}`,
          kind:'daily',
          date,
          title:`${formatDocDate(date)}`,
          meta:parts.length?parts.join(' · '):'Nota do dia',
          body:entry.notes||'',
          images,
          media:images[0]?.dataUrl||null,
          updatedAt:entry.savedAt||'',
        };
      });
  }
  return (config.generalDocs||[])
    .map(doc=>{
      const images=normalizeDocImages(doc.images);
      const wordCount=(doc.content||'').trim().split(/\s+/).filter(Boolean).length;
      const updatedStr=doc.updatedAt?new Date(doc.updatedAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'—';
      return {
        id:`general:${doc.id}`,
        kind:'general',
        docId:doc.id,
        title:doc.title||'Documento geral',
        meta:`${wordCount} ${wordCount===1?'palavra':'palavras'} · atualizado ${updatedStr}`,
        hasContent:wordCount>0,
        body:doc.content||'',
        images,
        media:images[0]?.dataUrl||null,
        updatedAt:doc.updatedAt||'',
      };
    })
    .sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
}

function getDocumentFolders(){
  return [
    {id:'tradeNotes',  label:'Trades',      desc:'Observações registradas nos trades',  icon:'file',     count:getDocumentEntries('tradeNotes').length},
    {id:'dailyNotes',  label:'Diário',       desc:'Notas do dia criadas na rotina',      icon:'calendar', count:getDocumentEntries('dailyNotes').length},
    {id:'generalNotes',label:'Documentos',   desc:'Playbook, mapa de risco e anotações', icon:'folder',   count:getDocumentEntries('generalNotes').length},
  ];
}

function selectDocumentFolder(folderId){
  activeDocFolder=folderId;
  activeDocId=null;
  renderDocumentsPage();
}

function selectDocumentEntry(entryId){
  activeDocId=entryId;
  renderDocumentsPage();
}

function getCurrentDocumentEntry(){
  return getDocumentEntries(activeDocFolder).find(entry=>entry.id===activeDocId)||null;
}

function openDocumentTrade(){
  const entry=getCurrentDocumentEntry();
  if(entry?.kind!=='trade'||!entry.tradeId)return;
  openModal('tradeModal',entry.tradeId);
}

function createGeneralDocument(){
  const id=uid();
  if(!Array.isArray(config.generalDocs))config.generalDocs=[];
  config.generalDocs.unshift({
    id,
    title:'Nova anotação geral',
    content:'',
    images:[],
    updatedAt:new Date().toISOString(),
  });
  activeDocFolder='generalNotes';
  activeDocId=`general:${id}`;
  save();
  renderDocumentsPage();
}

function createDailyDocument(){
  const date=new Date().toISOString().split('T')[0];
  const now=new Date().toISOString();
  if(!preMarketData[date])preMarketData[date]={};
  preMarketData[date]={
    ...preMarketData[date],
    notes:preMarketData[date].notes||'',
    docCreatedAt:preMarketData[date].docCreatedAt||now,
    savedAt:now,
  };
  activeDocFolder='dailyNotes';
  activeDocId=`daily:${date}`;
  save();
  renderDocumentsPage();
}

function createDocumentFromActiveFolder(){
  if(activeDocFolder==='dailyNotes'){createDailyDocument();return;}
  if(activeDocFolder==='tradeNotes'){
    showAppNotice('Notas de trades','Notas de trades são criadas ao preencher o campo "Observações / Análise" dentro de um trade. Abra ou registre um trade para começar.');
    return;
  }
  createGeneralDocument();
}

function getDocumentCreateLabel(){
  return ({
    dailyNotes:'Nova nota do dia',
    tradeNotes:'Como criar',
    generalNotes:'Nova anotação',
  })[activeDocFolder]||'Nova anotação';
}

function getDocumentCreateDesc(){
  return ({
    dailyNotes:'Abre nota do dia atual',
    tradeNotes:'Notas vêm do campo de observações do trade',
    generalNotes:'Cria documento editável',
  })[activeDocFolder]||'Cria documento editável';
}

function saveCurrentDocument(){
  const entry=getCurrentDocumentEntry();
  const titleEl=document.getElementById('docEditorTitle');
  const bodyEl=document.getElementById('docEditorBody');
  if(!entry||!titleEl||!bodyEl){showAppNotice('Selecione um documento','Selecione um documento antes de salvar.');return;}
  const body=bodyEl.value||'';
  const title=titleEl.value||'Documento';
  const now=new Date().toISOString();

  if(entry.kind==='trade'){
    const idx=trades.findIndex(trade=>trade.id===entry.tradeId);
    if(idx>=0){
      trades[idx].remarks=body;
      trades[idx].updatedAt=now;
    }
  } else if(entry.kind==='daily'){
    if(!preMarketData[entry.date])preMarketData[entry.date]={};
    preMarketData[entry.date].notes=body;
    preMarketData[entry.date].docCreatedAt=preMarketData[entry.date].docCreatedAt||now;
    preMarketData[entry.date].savedAt=now;
  } else if(entry.kind==='general'){
    const idx=(config.generalDocs||[]).findIndex(doc=>doc.id===entry.docId);
    if(idx>=0){
      config.generalDocs[idx].title=title;
      config.generalDocs[idx].content=body;
      config.generalDocs[idx].updatedAt=now;
    }
  }

  save();
  refreshAll();
  showAppNotice('Documento salvo','✓ Documento salvo!');
}

function deleteDocumentEntry(entry){
  if(!entry)return false;
  const now=new Date().toISOString();
  if(entry.kind==='trade'){
    const idx=trades.findIndex(trade=>trade.id===entry.tradeId);
    if(idx<0)return false;
    trades[idx].remarks='';
    trades[idx].images=[];
    trades[idx].updatedAt=now;
  } else if(entry.kind==='daily'){
    if(!preMarketData[entry.date])return false;
    preMarketData[entry.date]={
      ...preMarketData[entry.date],
      notes:'',
      images:[],
      savedAt:now,
    };
    delete preMarketData[entry.date].docCreatedAt;
  } else if(entry.kind==='general'){
    const before=(config.generalDocs||[]).length;
    config.generalDocs=(config.generalDocs||[]).filter(doc=>doc.id!==entry.docId);
    if(config.generalDocs.length===before)return false;
  } else {
    return false;
  }
  activeDocId=null;
  return true;
}

function deleteCurrentDocument(){
  const entry=getCurrentDocumentEntry();
  if(!entry){showAppNotice('Excluir documento','Selecione uma anotação antes de excluir.');return;}
  const label=entry.kind==='trade'
    ? 'Limpar a anotação deste trade? O trade será mantido.'
    : entry.kind==='daily'
      ? 'Excluir esta anotação diária? A rotina do dia será mantida.'
      : `Excluir "${entry.title}"?`;
  showAppConfirm('Excluir anotação',label,()=>{
    if(deleteDocumentEntry(entry)){
      save();
      renderDocumentsPage();
      showAppNotice('Anotação excluída','Anotação removida com sucesso.');
    }
  },{danger:true,confirmText:'Excluir'});
}

function renderDocumentsPage(){
  const folders=getDocumentFolders();
  if(!folders.some(folder=>folder.id===activeDocFolder))activeDocFolder='generalNotes';
  const entries=getDocumentEntries(activeDocFolder);
  if(!entries.some(entry=>entry.id===activeDocId))activeDocId=entries[0]?.id||null;

  const folderEl=document.getElementById('docFolders');
  if(folderEl){
    folderEl.innerHTML=`
      <div class="doc-folder-section-label">Pastas</div>
      ${folders.map(folder=>`
      <button class="doc-folder ${folder.id===activeDocFolder?'active':''}" onclick="selectDocumentFolder('${folder.id}')">
        ${renderDocFolderIcon(folder.icon)}
        <span class="doc-folder-copy">
          <span>${escapeHtml(folder.label)}</span>
          <small>${escapeHtml(folder.desc)}</small>
        </span>
        <strong>${folder.count}</strong>
      </button>`).join('')}
      <div class="doc-folder-separator"></div>
      <button class="doc-folder doc-folder-create" onclick="createDocumentFromActiveFolder()">
        ${renderDocFolderIcon('plus')}
        <span class="doc-folder-copy">
          <span>${getDocumentCreateLabel()}</span>
          <small>${getDocumentCreateDesc()}</small>
        </span>
      </button>`;
  }

  const createBtn=document.getElementById('docCreateBtn');
  if(createBtn){
    createBtn.textContent=`+ ${getDocumentCreateLabel()}`;
    createBtn.style.display=activeDocFolder==='tradeNotes'?'none':'inline-flex';
  }
  const deleteBtn=document.getElementById('docDeleteBtn');
  if(deleteBtn)deleteBtn.style.display=getCurrentDocumentEntry()&&activeDocFolder!=='tradeNotes'?'inline-flex':'none';

  const activeFolder=folders.find(f=>f.id===activeDocFolder);
  const titleEl=document.getElementById('docListTitle');
  const countEl=document.getElementById('docListCount');
  if(titleEl)titleEl.textContent=activeFolder?.label||'Notas';
  if(countEl)countEl.textContent=`${entries.length} ${entries.length===1?'item':'itens'}`;

  const entriesEl=document.getElementById('docEntries');
  if(entriesEl){
    const emptyText={
      tradeNotes:'Nenhuma observação registrada ainda. Abra um trade e preencha o campo "Observações / Análise" — ele aparece aqui automaticamente.',
      dailyNotes:'Nenhuma nota do dia ainda. Clique em "Nova nota do dia" para criar.',
      generalNotes:'Nenhum documento ainda. Clique em "Nova anotação" para começar.',
    }[activeDocFolder]||'Nenhum documento encontrado.';
    entriesEl.innerHTML=entries.length?entries.map(entry=>{
      const statusBadge=entry.kind==='trade'&&entry.status
        ?`<span class="badge ${entry.status.toLowerCase()} doc-entry-badge">${entry.status}</span>`
        :'';
      const kindIcon={
        trade:'◈',
        daily:'◷',
        general:'◻',
      }[entry.kind]||'';
      const preview=entry.body?(entry.body.replace(/[#*`>\-]/g,'').trim().slice(0,60)+'…'):'';
      return `<button class="doc-entry ${entry.id===activeDocId?'active':''}${entry.kind==='general'&&!entry.hasContent?' doc-entry-empty':''}" onclick="selectDocumentEntry('${entry.id}')">
        <span class="doc-entry-top">
          <span class="doc-entry-kind">${kindIcon}</span>
          <span class="doc-entry-title">${escapeHtml(entry.title)}</span>
          ${statusBadge}
        </span>
        <span class="doc-entry-meta">${escapeHtml(entry.meta)}</span>
        ${preview?`<span class="doc-entry-preview">${escapeHtml(preview)}</span>`:''}
      </button>`;
    }).join(''):`<div class="doc-empty">${emptyText}</div>`;
  }

  const current=getCurrentDocumentEntry();
  const heading=document.getElementById('docEditorHeading');
  const meta=document.getElementById('docEditorMeta');
  const editorTitle=document.getElementById('docEditorTitle');
  const editorBody=document.getElementById('docEditorBody');
  const media=document.getElementById('docMedia');
  const tradeBtn=document.getElementById('docOpenTradeBtn');
  if(!heading||!meta||!editorTitle||!editorBody||!media||!tradeBtn)return;
  if(!current){
    const emptyHeadings={
      tradeNotes:'Nenhum trade selecionado',
      dailyNotes:'Nenhuma nota do dia selecionada',
      generalNotes:'Nenhum documento selecionado',
    };
    const emptyHints={
      tradeNotes:'Selecione um trade ao lado ou abra um trade e preencha o campo Observações — ele aparece aqui automaticamente.',
      dailyNotes:'Selecione uma data ao lado ou clique em "Nova nota do dia" para criar.',
      generalNotes:'Selecione um documento ao lado ou clique em "Nova anotação" para criar.',
    };
    heading.textContent=emptyHeadings[activeDocFolder]||'Nenhum documento selecionado';
    meta.textContent=emptyHints[activeDocFolder]||'Selecione um item ao lado para editar.';
    editorTitle.value='';
    editorBody.value='';
    editorTitle.disabled=true;
    editorBody.disabled=true;
    tradeBtn.style.display='none';
    media.innerHTML='<div class="doc-media-empty">Nenhuma mídia vinculada.</div>';
    return;
  }

  heading.textContent=current.title;
  meta.textContent=current.meta;
  editorTitle.value=current.title;
  editorBody.value=current.body||'';
  editorTitle.disabled=current.kind!=='general';
  editorBody.disabled=false;
  tradeBtn.style.display=current.kind==='trade'?'inline-flex':'none';
  media.innerHTML=renderDocumentMedia(current);

  // Painel de contexto do trade linkado
  const tradeCtx=document.getElementById('docTradeContext');
  if(tradeCtx){
    if(current.kind==='trade'){
      const tr=getAccountTrades(activeAccountId).find(t=>t.id===current.tradeId);
      if(tr){
        const pnlStr=tr.pnl!=null?((tr.pnl>=0?'+':'')+fR(tr.pnl)):'—';
        const rStr=(tr.r!=null&&Number.isFinite(tr.r))?((tr.r>=0?'+':'')+tr.r.toFixed(2)+'R'):'—';
        tradeCtx.style.display='flex';
        tradeCtx.innerHTML=`
          <span class="badge ${(tr.status||'open').toLowerCase()}">${tr.status||'OPEN'}</span>
          <span class="doc-ctx-item"><span class="doc-ctx-label">Símbolo</span><strong>${escapeHtml(tr.symbol||'—')}</strong></span>
          <span class="doc-ctx-sep">·</span>
          <span class="doc-ctx-item"><span class="doc-ctx-label">Direção</span><strong>${tr.direction||'—'}</strong></span>
          <span class="doc-ctx-sep">·</span>
          <span class="doc-ctx-item"><span class="doc-ctx-label">Entrada</span><strong class="mono">${tr.entry||'—'}</strong></span>
          <span class="doc-ctx-sep">·</span>
          <span class="doc-ctx-item"><span class="doc-ctx-label">R</span><strong class="mono ${tr.r>=0?'text-green':'text-red'}">${rStr}</strong></span>
          <span class="doc-ctx-sep">·</span>
          <span class="doc-ctx-item"><span class="doc-ctx-label">P/L</span><strong class="mono ${(tr.pnl||0)>=0?'text-green':'text-red'}">${pnlStr}</strong></span>
          ${tr.strategy?`<span class="doc-ctx-sep">·</span><span class="doc-ctx-item"><span class="doc-ctx-label">Setup</span><strong>${escapeHtml(tr.strategy)}</strong></span>`:''}
        `;
      } else { tradeCtx.style.display='none'; }
    } else { tradeCtx.style.display='none'; }
  }
}
