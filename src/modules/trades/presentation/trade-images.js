function renderImagePreviews(){
  const preview=document.getElementById('t-images-preview');if(!preview)return;
  preview.innerHTML=tradeImages.map((img,i)=>`<div style="position:relative;display:inline-block"><img src="${img.dataUrl}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border2)" title="${img.name}"><button onclick="removeTradeImage(${i})" style="position:absolute;top:-4px;right:-4px;background:var(--red);border:none;border-radius:50%;width:16px;height:16px;color:white;font-size:10px">✕</button></div>`).join('');
}
