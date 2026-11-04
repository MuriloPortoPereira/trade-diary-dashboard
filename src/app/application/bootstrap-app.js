window.addEventListener('load',()=>{
  load();
  if(!trades.length)loadSampleData();
  else save();
  if(!accounts||!accounts.length)accounts=[{id:'default',name:'Conta Principal',type:'cfd_pct',color:'#22d5ed',balance:1000,risk:1,mult:1,ddDaily:2,ddWeekly:5,ddMonthly:8,ddTotal:10,goalPct:10,goalWeek:200,goalMonth:500,goalTotal:2000}];
  accounts=accounts.map(normalizeAccount);
  if(!Array.isArray(config.generalDocs))config.generalDocs=[
    {id:'playbook',title:'Playbook operacional',content:`# Playbook Operacional

## Regras de entrada
- Aguardar fechamento do candle de confirmação
- Setup deve estar alinhado com o contexto da sessão
- Não operar contra a tendência principal sem confluência clara

## Regras de saída
- Respeitar o stop definido antes da entrada
- Parcial no primeiro alvo (1R); stop no breakeven após 1.5R
- Não mover stop contra a posição

## Gestão de risco
- Máximo 1-2% de risco por trade
- Parar operações ao atingir o stop diário
- Revisar semana ao atingir 50% do stop semanal

## Revisão pós-trade
- Registrar emoção, contexto e lição em cada operação
- Revisar trades da semana todo sábado
- Atualizar este playbook mensalmente`,images:[],updatedAt:new Date().toISOString()},
    {id:'risk-map',title:'Mapa de risco',content:`# Mapa de Risco

## Limites por sessão
- **Stop diário:** 2% do capital — parar imediatamente ao atingir
- **Meta diária:** 1% do capital — reduzir tamanho após atingir

## Limites semanais
- **Stop semanal:** 5% do capital
- **Meta semanal:** definida na rotina de pré-mercado

## Limites mensais
- **Stop mensal:** 8% do capital
- **Drawdown máximo:** 10% — parar e revisar o processo

## Regras de escalonamento
- Aumentar lote apenas após 20 trades consecutivos dentro dos limites
- Reduzir lote após 3 stops consecutivos
- Nunca dobrar posição para recuperar perda`,images:[],updatedAt:new Date().toISOString()},
  ];
  // Remove docs gerais criados em branco automaticamente (sem conteúdo e sem título customizado)
  if(Array.isArray(config.generalDocs)){
    config.generalDocs=config.generalDocs.filter(doc=>
      (doc.content||'').trim()||['playbook','risk-map'].includes(doc.id)
    );
  }
  config=ensurePartnerHubConfig(config);
  if(!activeAccountId)activeAccountId=accounts[0].id;
  window.addEventListener('resize',()=>{if(window.innerWidth>1080)toggleSidebar(false);fitTopbarDensity();});
  syncCalPicker();
  renderTopbarAccount();
  updateTopbarStats();
  renderDashboard();
  updateIncompleteBanner();
  initLanguageSelector();
  initCotacao();
});
