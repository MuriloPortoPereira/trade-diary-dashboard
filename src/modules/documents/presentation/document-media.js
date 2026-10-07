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
