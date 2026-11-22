window.addEventListener('load',()=>{
  // Restaura os dados antes de decidir se a demonstração precisa ser criada.
  load();
  if(!trades.length)loadSampleData();
  else save();
  if(!accounts||!accounts.length)accounts=[{id:'default',name:'Conta Principal',type:'cfd_pct',color:'#22d5ed',balance:1000,risk:1,mult:1,ddDaily:2,ddWeekly:5,ddMonthly:8,ddTotal:10,goalPct:10,goalWeek:200,goalMonth:500,goalTotal:2000}];
  accounts=accounts.map(normalizeAccount);
  if(!Array.isArray(config.generalDocs))config.generalDocs=createDefaultGeneralDocuments();
  // Remove documentos sem conteúdo, preservando playbook e risk-map.
  if(Array.isArray(config.generalDocs)){
    config.generalDocs=config.generalDocs.filter(doc=>
      (doc.content||'').trim()||['playbook','risk-map'].includes(doc.id)
    );
  }
  config=ensurePartnerHubConfig(config);
  if(!activeAccountId)activeAccountId=accounts[0].id;
  // A interface só é montada depois de normalizar contas e configurações.
  window.addEventListener('resize',()=>{if(window.innerWidth>1080)toggleSidebar(false);fitTopbarDensity();});
  syncCalPicker();
  renderTopbarAccount();
  updateTopbarStats();
  renderDashboard();
  updateIncompleteBanner();
  initLanguageSelector();
  initCotacao();
});
