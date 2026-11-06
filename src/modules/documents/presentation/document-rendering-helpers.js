function formatDocDate(date){
  return date ? new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}) : 'Sem data';
}

function normalizeDocImages(images){
  if(!Array.isArray(images))return[];
  return images
    .filter(img=>img&&img.dataUrl)
    .map(img=>({name:img.name||'imagem',dataUrl:img.dataUrl}));
}

function formatDocumentSelection(type){
  const editor=document.getElementById('docEditorBody');
  if(!editor||editor.disabled)return;
  const start=editor.selectionStart??editor.value.length;
  const end=editor.selectionEnd??editor.value.length;
  const selected=editor.value.slice(start,end);
  const fallback={
    bold:'texto em negrito',
    italic:'texto em italico',
    underline:'texto sublinhado',
    h1:'Titulo',
    h2:'Subtitulo',
    list:'item da lista',
    quote:'citacao',
  }[type]||'texto';
  const text=selected||fallback;
  let replacement=text;
  let caretStart=start;
  let caretEnd=start+replacement.length;
  const prefixLines=prefix=>text.split(/\r?\n/).map(line=>`${prefix}${line}`).join('\n');

  if(type==='bold'){
    replacement=`**${text}**`;
    caretStart=start+2;
    caretEnd=caretStart+text.length;
  } else if(type==='italic'){
    replacement=`_${text}_`;
    caretStart=start+1;
    caretEnd=caretStart+text.length;
  } else if(type==='underline'){
    replacement=`<u>${text}</u>`;
    caretStart=start+3;
    caretEnd=caretStart+text.length;
  } else if(type==='h1'){
    replacement=prefixLines('# ');
  } else if(type==='h2'){
    replacement=prefixLines('## ');
  } else if(type==='list'){
    replacement=prefixLines('- ');
  } else if(type==='quote'){
    replacement=prefixLines('> ');
  }

  editor.setRangeText(replacement,start,end,'end');
  if(!selected&&['bold','italic','underline'].includes(type))editor.setSelectionRange(caretStart,caretEnd);
  editor.focus();
}

function getDocumentEntryImages(entry){
  return normalizeDocImages(entry?.images);
}

function renderDocumentMedia(entry){
  const images=getDocumentEntryImages(entry);
  if(!images.length){
    return `<div class="doc-media-empty">${entry?.kind==='trade'?'Nenhuma imagem salva neste trade.':'Sem mídia vinculada a este documento.'}</div>`;
  }
  return `<div class="doc-media-grid">${images.map((img,i)=>`
    <div class="doc-media-item">
      <img src="${img.dataUrl}" alt="${escapeHtml(img.name||'Mídia vinculada')}" class="doc-media-image">
      <button type="button" class="doc-media-remove" onclick="removeDocumentImage(${i})" title="Remover imagem">x</button>
    </div>`).join('')}</div>`;
}

function renderDocFolderIcon(type){
  const icons={
    plus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/></svg>',
    file:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h6l4 4v14H6V3h2Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    folder:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>',
  };
  return `<span class="doc-folder-icon">${icons[type]||icons.file}</span>`;
}
