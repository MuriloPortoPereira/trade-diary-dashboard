function normalizePartnerAffiliate(entry={}){
  return {
    id:entry.id||uid(),
    name:String(entry.name||'').trim(),
    url:String(entry.url||'').trim(),
    code:String(entry.code||'').trim(),
    note:String(entry.note||'').trim(),
  };
}

function ensurePartnerHubConfig(base=config){
  const next={...(base||{})};
  const source=next.partnerHub&&typeof next.partnerHub==='object'&&!Array.isArray(next.partnerHub)
    ? next.partnerHub
    : {};
  next.partnerHub={
    affiliates:Array.isArray(source.affiliates)?source.affiliates.map(normalizePartnerAffiliate):[],
    btcAddress:String(source.btcAddress||'').trim(),
    btcQrImage:String(source.btcQrImage||''),
    coffeeUrl:String(source.coffeeUrl||'').trim(),
  };
  return next;
}

function getPartnerHubConfig(){
  config=ensurePartnerHubConfig(config);
  return config.partnerHub;
}

function copyPartnerText(value,label='Conteúdo copiado'){
  const text=String(value||'').trim();
  if(!text){showAppNotice('Nada para copiar','Preencha este campo antes de copiar.');return;}
  const done=()=>showAppNotice(label,text);
  try{
    const clip=globalThis?.navigator?.clipboard;
    if(clip&&typeof clip.writeText==='function'){
      Promise.resolve(clip.writeText(text)).then(done).catch(done);
      return;
    }
  }catch(e){}
  done();
}

function addPartnerAffiliate(){
  const hub=getPartnerHubConfig();
  hub.affiliates.push(normalizePartnerAffiliate({}));
  save();
  renderPartnersPage();
}

function updatePartnerAffiliateField(id,key,value){
  const hub=getPartnerHubConfig();
  const entry=hub.affiliates.find(item=>item.id===id);
  if(!entry)return;
  entry[key]=String(value||'').trim();
  save();
  renderPartnersPage();
}

function removePartnerAffiliate(id){
  const hub=getPartnerHubConfig();
  const entry=hub.affiliates.find(item=>item.id===id);
  if(!entry)return;
  showAppConfirm('Remover afiliado',`Remover ${entry.name||'este afiliado'} da lista?`,()=>{
    hub.affiliates=hub.affiliates.filter(item=>item.id!==id);
    config.partnerHub=hub;
    save();
    renderPartnersPage();
  },{danger:true,confirmText:'Remover'});
}

function updatePartnerSupportField(key,value){
  const hub=getPartnerHubConfig();
  hub[key]=String(value||'').trim();
  save();
  renderPartnersPage();
}

function clearPartnerBtcQr(){
  const hub=getPartnerHubConfig();
  hub.btcQrImage='';
  const input=document.getElementById('partnerBtcQrInput');
  if(input)input.value='';
  save();
  renderPartnersPage();
}

function handlePartnerBtcQrUpload(event){
  const file=Array.from(event?.target?.files||[])[0];
  if(!file)return;
  if(file.type&&!file.type.startsWith('image/')){
    showAppNotice('QR Code BTC','Selecione uma imagem para o QR Code.');
    return;
  }
  const reader=new FileReader();
  reader.onload=ev=>{
    const hub=getPartnerHubConfig();
    hub.btcQrImage=String(ev?.target?.result||'');
    save();
    renderPartnersPage();
  };
  reader.readAsDataURL(file);
  if(event?.target)event.target.value='';
}

function renderPartnersPage(){
  const gridEl=document.getElementById('partnersGrid');
  const affiliatesEl=document.getElementById('partnerAffiliatesEditor');
  const btcAddressEl=document.getElementById('partnerBtcAddress');
  const coffeeEl=document.getElementById('partnerCoffeeUrl');
  const qrPreviewEl=document.getElementById('partnerBtcQrPreview');
  const addBtn=document.getElementById('partnerAddAffiliateBtn');
  if(!affiliatesEl||!btcAddressEl||!coffeeEl||!qrPreviewEl)return;

  const hub=getPartnerHubConfig();
  if(addBtn)addBtn.disabled=false;
  btcAddressEl.value=hub.btcAddress||'';
  coffeeEl.value=hub.coffeeUrl||'';
  qrPreviewEl.innerHTML=hub.btcQrImage
    ? `<div class="partner-qr-shell"><img src="${hub.btcQrImage}" alt="QR Code BTC" class="partner-qr-image"><div class="partner-support-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="triggerFileInput('partnerBtcQrInput')">Trocar QR</button><button class="btn btn-ghost btn-sm" type="button" onclick="clearPartnerBtcQr()">Remover QR</button></div></div>`
    : `<div class="partner-empty-state"><div class="partner-empty-title">QR Code BTC não configurado</div><div class="partner-empty-copy">Envie uma imagem quando quiser mostrar doação por QR.</div><button class="btn btn-ghost btn-sm" type="button" onclick="triggerFileInput('partnerBtcQrInput')">Selecionar QR</button></div>`;

  affiliatesEl.innerHTML=hub.affiliates.length
    ? hub.affiliates.map(entry=>`
      <div class="partner-affiliate-editor-card">
        <div class="partner-affiliate-editor-head">
          <div class="chart-title">${escapeHtml(entry.name||'Novo afiliado')}</div>
          <button class="btn btn-ghost btn-sm btn-icon" type="button" onclick="removePartnerAffiliate('${entry.id}')" title="Remover">✕</button>
        </div>
        <div class="partner-affiliate-form-grid">
          <div class="field-group"><label>Prop Firm</label><input type="text" value="${escapeHtml(entry.name)}" placeholder="Nome da mesa" onchange="updatePartnerAffiliateField('${entry.id}','name',this.value)"></div>
          <div class="field-group"><label>Link afiliado</label><input type="url" value="${escapeHtml(entry.url)}" placeholder="https://..." onchange="updatePartnerAffiliateField('${entry.id}','url',this.value)"></div>
          <div class="field-group"><label>Código / cupom</label><input type="text" value="${escapeHtml(entry.code)}" placeholder="Opcional" onchange="updatePartnerAffiliateField('${entry.id}','code',this.value)"></div>
          <div class="field-group"><label>Benefício / observação</label><input type="text" value="${escapeHtml(entry.note)}" placeholder="Ex: 10% off challenge" onchange="updatePartnerAffiliateField('${entry.id}','note',this.value)"></div>
        </div>
      </div>`).join('')
    : `<div class="partner-empty-state"><div class="partner-empty-title">Nenhum afiliado configurado</div><div class="partner-empty-copy">Adicione mesas prop firms, links afiliados e cupons para deixar esta área pronta.</div><button class="btn btn-ghost btn-sm" type="button" onclick="addPartnerAffiliate()">Adicionar afiliado</button></div>`;
  if(gridEl){
    gridEl.innerHTML='';
    gridEl.style.display='none';
  }
}
