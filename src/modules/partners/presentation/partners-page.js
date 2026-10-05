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
