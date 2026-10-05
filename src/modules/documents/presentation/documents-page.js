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
