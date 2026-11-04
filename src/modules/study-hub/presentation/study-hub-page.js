const STUDY_HUB_INFO = {
  propfirm:{
    label:'PropFirm',
    title:'PropFirm Simulator',
    frameTitle:'PropFirm Simulator',
    frameMeta:'Leitura nativa de payout, metas e drawdown dentro do Mukas Hub.',
    summary:'Calculadoras de payout, meta, drawdown e sizing rodam direto no núcleo do Mukas Hub, sem ponte externa e sem troca de contexto.',
    features:[
      {title:'Payout e metas',copy:'Calcula alvo, retirada e leitura de esforço da conta no mesmo fluxo de risco do app.'},
      {title:'Limites de drawdown',copy:'Cruza drawdown diário, drawdown total e risco por trade sem sair do Mukas Hub.'},
      {title:'Modelos de prop',copy:'Centraliza sizing, payout líquido e esforço até a meta em leitura direta e rápida.'},
      {title:'Leitura de risco',copy:'Vira base para decidir lote, agressividade e proteção antes da sessão começar.'},
    ],
  },
  plano:{
    label:'Plano de Trade',
    title:'Plano de Trade',
    frameTitle:'Plano de Trade',
    frameMeta:'Playbook nativo dentro do fluxo principal do app.',
    summary:'Playbook da sessão, filtros, invalidação e revisão ficam centralizados no fluxo nativo do Mukas Hub.',
    features:[
      {title:'Playbook operacional',copy:'Reúne contexto, gatilho, invalidação e regras de execução em bloco único.'},
      {title:'Checklist da sessão',copy:'Mantém preparação, filtros e disciplina próximos da conta ativa.'},
      {title:'Regras de não trade',copy:'Centraliza quando parar, reduzir e simplesmente não entrar.'},
      {title:'Processo antes da entrada',copy:'Deixa leitura pré-mercado e revisão no mesmo ecossistema do diário.'},
    ],
  },
  tradesim:{
    label:'Trade Simulator',
    title:'Trade Simulator',
    frameTitle:'Trade Simulator',
    frameMeta:'Simulação nativa ligada ao estado real da conta.',
    summary:'Motor de expectativa, cenários e Monte Carlo integrado ao estado da conta, sem iframe e sem carga paralela.',
    features:[
      {title:'Ciclos e variância',copy:'Projeta faixa provável de capital e ajuda a ler sequência ruim antes dela acontecer.'},
      {title:'Teste de agressividade',copy:'Ajuda a validar se o risco por trade cabe dentro do plano antes de subir lote.'},
      {title:'Leitura de capital',copy:'Compara mediana, cauda ruim e cauda boa em cima do capital atual.'},
      {title:'Decisão mais fria',copy:'Vira laboratório de hipótese antes de levar mudança para conta real.'},
    ],
  },
  mental:{
    label:'Ferramentas Mentais',
    title:'Ferramentas Mentais',
    frameTitle:'Ferramentas Mentais',
    frameMeta:'Check-in mental nativo dentro do Mukas Hub.',
    summary:'Check-in mental, âncoras e cortes emocionais agora vivem dentro do próprio Mukas Hub, no mesmo padrão do restante do diário.',
    features:[
      {title:'Âncora de execução',copy:'Ajuda a voltar para o plano quando a sessão pesa ou acelera demais.'},
      {title:'Cortes e limites',copy:'Centraliza gatilhos de proteção para evitar overtrade e revenge.'},
      {title:'Preparação da sessão',copy:'Organiza foco, contexto e disciplina dentro do próprio app.'},
      {title:'Disciplina acima de tudo',copy:'Usa leitura emocional como proteção direta da conta e do drawdown do dia.'},
    ],
  },
};

function getStudyPropForm(){
  const base=studyHubState.propfirm;
  const num=(id,fallback)=>{const el=document.getElementById(id);return el?parseFloat(el.value)||fallback:fallback;};
  return {
    accountSize:num('studyPropAccount',base.accountSize),
    payoutPct:num('studyPropPayout',base.payoutPct),
    maxDdPct:num('studyPropMaxDd',base.maxDdPct),
    dailyDdPct:num('studyPropDailyDd',base.dailyDdPct),
    riskPct:num('studyPropRisk',base.riskPct),
    targetPct:num('studyPropTarget',base.targetPct),
    rrr:num('studyPropRrr',base.rrr),
    fxRate:num('studyPropFx',base.fxRate),
    taxPct:num('studyPropTax',base.taxPct),
    feePct:num('studyPropFee',base.feePct),
  };
}

function getStudyPlanForm(){
  const base=studyHubState.plan;
  const val=(id,fallback)=>document.getElementById(id)?.value ?? fallback;
  const num=(id,fallback)=>{const el=document.getElementById(id);return el?parseFloat(el.value)||fallback:fallback;};
  return {
    title:val('studyPlanTitle',base.title),
    market:val('studyPlanMarket',base.market),
    window:val('studyPlanWindow',base.window),
    setup:val('studyPlanSetup',base.setup),
    invalidation:val('studyPlanInvalidation',base.invalidation),
    noTrade:val('studyPlanNoTrade',base.noTrade),
    dailyGoal:num('studyPlanDailyGoal',base.dailyGoal),
    dailyStop:num('studyPlanDailyStop',base.dailyStop),
    maxTrades:parseInt(document.getElementById('studyPlanMaxTrades')?.value)||base.maxTrades,
    checklist:val('studyPlanChecklist',base.checklist),
    execution:val('studyPlanExecution',base.execution),
    review:val('studyPlanReview',base.review),
  };
}

function getStudySimForm(){
  const base=studyHubState.simulator;
  const num=(id,fallback)=>{const el=document.getElementById(id);return el?parseFloat(el.value)||fallback:fallback;};
  return {
    capital:num('studySimCapital',base.capital),
    riskPct:num('studySimRisk',base.riskPct),
    winRate:num('studySimWinRate',base.winRate),
    rrr:num('studySimRrr',base.rrr),
    trades:parseInt(document.getElementById('studySimTrades')?.value)||base.trades,
    runs:parseInt(document.getElementById('studySimRuns')?.value)||base.runs,
    seed:base.seed||Date.now(),
  };
}

function getStudyMentalForm(){
  const base=studyHubState.mental;
  const num=(id,fallback)=>{const el=document.getElementById(id);return el?parseInt(el.value)||fallback:fallback;};
  const val=(id,fallback)=>document.getElementById(id)?.value ?? fallback;
  return {
    focus:num('studyMentalFocus',base.focus),
    energy:num('studyMentalEnergy',base.energy),
    stress:num('studyMentalStress',base.stress),
    discipline:num('studyMentalDiscipline',base.discipline),
    anchor:val('studyMentalAnchor',base.anchor),
    triggers:val('studyMentalTriggers',base.triggers),
    cutoff:val('studyMentalCutoff',base.cutoff),
  };
}

function countStudyChecklistItems(text){
  return TradeDiaryStudyHubCalculations.countStudyChecklistItems(text);
}

function seededRand(seed){
  return TradeDiaryStudyHubCalculations.seededRand(seed);
}

function getStudyPropSnapshot(prop=studyHubState.propfirm){
  return TradeDiaryStudyHubCalculations.getStudyPropSnapshot(prop);
}

function getStudyMentalSnapshot(mental=studyHubState.mental){
  return TradeDiaryStudyHubCalculations.getStudyMentalSnapshot(mental);
}

function saveStudyPropFirm(){
  studyHubState.propfirm=getStudyPropForm();
  save();
  renderStudyHub();
}

function saveStudyPlan(){
  studyHubState.plan=getStudyPlanForm();
  save();
  renderStudyHub();
}

function saveStudyMental(){
  studyHubState.mental=getStudyMentalForm();
  save();
  renderStudyHub();
}

function syncStudySimulatorFromPropfirm(){
  const prop=getStudyPropForm();
  studyHubState.propfirm=prop;
  studyHubState.simulator={
    ...studyHubState.simulator,
    capital:prop.accountSize,
    riskPct:prop.riskPct,
    rrr:prop.rrr,
    seed:Date.now(),
  };
  save();
  renderStudyHub();
}

function setStudyHubLegacyValue(id, value){
  const el=document.getElementById(id);
  if(!el || value==null)return;
  el.value=String(value);
  try{el.dispatchEvent(new Event('input'));}catch{}
  try{el.dispatchEvent(new Event('change'));}catch{}
}

function setStudyHubLegacySelectValue(id, value){
  const el=document.getElementById(id);
  if(!el || value==null)return;
  const target=String(value);
  const options=Array.from(el.options||[]);
  const exact=options.find(opt=>String(opt.value)===target);
  const near=exact || options.find(opt=>{
    const parsed=parseFloat(opt.value);
    return Number.isFinite(parsed) && Math.abs(parsed-Number(value))<0.0001;
  });
  el.value=(near&&near.value) || (options.some(opt=>opt.value==='custom') ? 'custom' : target);
  try{el.dispatchEvent(new Event('input'));}catch{}
  try{el.dispatchEvent(new Event('change'));}catch{}
}

function syncStudyHubLegacyInputs(moduleKey){
  const prop=studyHubState.propfirm;
  const sim=studyHubState.simulator;
  const goal=prop.targetPct;
  const stop=prop.dailyDdPct;
  const risk=prop.riskPct;
  const rrr=prop.rrr;

  if(moduleKey==='propfirm'){
    ['s_conta','pf_conta','f2_conta','f1_conta','in_conta','r_conta'].forEach(id=>setStudyHubLegacyValue(id,prop.accountSize));
    ['s_payout','pf_payout','f2_payout','f1_payout','in_payout'].forEach(id=>setStudyHubLegacyValue(id,prop.payoutPct));
    ['s_ddmax','pf_ddmax','f2_ddmax','f1_ddmax','in_ddmax','r_ddmax'].forEach(id=>setStudyHubLegacyValue(id,prop.maxDdPct));
    ['s_dddaily','pf_dddaily','f2_dddaily','f1_dddaily','in_dddaily','r_dddaily'].forEach(id=>setStudyHubLegacyValue(id,stop));
    ['s_ir','pf_ir','f2_ir','f1_ir','in_ir'].forEach(id=>setStudyHubLegacyValue(id,prop.taxPct));
    ['s_taxa','pf_taxa','f2_taxa','f1_taxa','in_taxa'].forEach(id=>setStudyHubLegacyValue(id,prop.feePct));
    ['pf_meta','s_fim','f2_meta1','f2_metaf','f1_metap','f1_metaf','in_metaf'].forEach(id=>setStudyHubLegacyValue(id,goal));
    ['pf_sl_dia','f2_sl','f1_sl','in_sl','r_sl'].forEach(id=>setStudyHubLegacyValue(id,stop));
    ['pf_gain_dia','f2_gain','f1_gain','in_gain','r_gain'].forEach(id=>setStudyHubLegacyValue(id,goal));
    setStudyHubLegacyValue('s_step',risk);
    ['s_rrr','pf_rrr'].forEach(id=>setStudyHubLegacySelectValue(id,rrr));
    return;
  }

  if(moduleKey==='tradesim'){
    setStudyHubLegacyValue('ts-capital',sim.capital);
    setStudyHubLegacyValue('risk',sim.riskPct);
    setStudyHubLegacyValue('riskRange',sim.riskPct);
    const riskRangeVal=document.getElementById('riskRangeVal');
    if(riskRangeVal)riskRangeVal.textContent=`${sim.riskPct}%`;
    setStudyHubLegacyValue('dailyStop',prop.dailyDdPct);
    setStudyHubLegacyValue('dailyTarget',prop.targetPct);
    setStudyHubLegacyValue('sl',prop.riskPct);
    setStudyHubLegacyValue('tp',+(prop.riskPct*prop.rrr).toFixed(3));
    const rrrDisplay=document.getElementById('rrrDisplay');
    if(rrrDisplay)rrrDisplay.textContent=`1 : ${prop.rrr.toFixed(2)}`;
  }
}

function updateStudyMentalRange(name,value){
  const el=document.getElementById(`studyMental${name}Val`);
  if(el)el.textContent=`${value}/5`;
}

function buildStudySimulation(params=studyHubState.simulator){
  return TradeDiaryStudyHubCalculations.buildStudySimulation(params);
}

function renderStudyPropFirm(){
  const prop=studyHubState.propfirm;
  const setVal=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
  setVal('studyPropAccount',prop.accountSize);
  setVal('studyPropPayout',prop.payoutPct);
  setVal('studyPropMaxDd',prop.maxDdPct);
  setVal('studyPropDailyDd',prop.dailyDdPct);
  setVal('studyPropRisk',prop.riskPct);
  setVal('studyPropTarget',prop.targetPct);
  setVal('studyPropRrr',prop.rrr);
  setVal('studyPropFx',prop.fxRate);
  setVal('studyPropTax',prop.taxPct);
  setVal('studyPropFee',prop.feePct);

  const snap=getStudyPropSnapshot(prop);
  const metrics=document.getElementById('studyPropMetrics');
  if(metrics){
    const riskTradeTip=`<strong>Risco / Trade</strong><p>Valor em dólares que você arrisca por trade, calculado com base no percentual de risco configurado sobre o capital da conta.</p>`;
    const ddDiarioTip=`<strong>DD Diário</strong><p>Limite máximo de perda para a sessão do dia. Indica quantos stops cheios você pode levar antes de encerrar o dia obrigatoriamente.</p>`;
    const ddMaxTip=`<strong>DD Máximo</strong><p>Limite total de drawdown da conta. Representa o piso absoluto de capital — ao atingir, a conta precisa ser pausada e revisada.</p>`;
    const metaTip=`<strong>Meta Líquida</strong><p>Valor de payout já descontados impostos e taxas, considerando a taxa de câmbio configurada para conversão em BRL.</p>`;
    metrics.innerHTML=[
      {cls:'c-blue',lbl:'Risco / trade',val:fR(snap.riskUsd),sub:`${f2(prop.riskPct)}% da conta`,tip:riskTradeTip},
      {cls:'c-red',lbl:'DD diário',val:fR(snap.dailyLimitUsd),sub:`até ${snap.dailyStopTrades} stop(s)`,tip:ddDiarioTip},
      {cls:'c-red',lbl:'DD máximo',val:fR(snap.maxLimitUsd),sub:`até ${snap.maxStopTrades} stop(s)`,tip:ddMaxTip},
      {cls:'c-green',lbl:'Meta líquida',val:fR(snap.payoutNetUsd),sub:fR(snap.payoutNetBrl)+' em BRL',tip:metaTip},
    ].map(mkCard).join('');
  }

  renderStatusList('studyPropSummary',[
    {tone:'info',title:'Meta operacional',summary:`Meta de ${f2(prop.targetPct)}% exige ${snap.tradesToTarget||0} trade(s) cheios em ${prop.rrr.toFixed(3)}R.`,value:fR(snap.targetUsd)},
    {tone:snap.dailyStopTrades<=2?'danger':snap.dailyStopTrades<=4?'warn':'safe',title:'Proteção diária',summary:`Você suporta ${snap.dailyStopTrades} stop(s) inteiros antes de romper o limite do dia.`,value:fR(snap.dailyLimitUsd)},
    {tone:'warn',title:'Breakeven teórico',summary:`Com RRR de ${prop.rrr.toFixed(3)}, o breakeven mínimo fica em ${snap.breakevenWr.toFixed(1)}% de acerto.`,value:`WR ${snap.breakevenWr.toFixed(1)}%`},
    {tone:'safe',title:'Payout no alvo',summary:`Depois de payout, imposto e intermediação, o alvo devolve ${fR(snap.payoutNetUsd)} líquidos.`,value:fR(snap.payoutNetBrl)},
  ],'Defina os parâmetros da conta para gerar a leitura.');

  const ladderEl=document.getElementById('studyPropLadder');
  if(ladderEl){
    const rawSteps=[prop.riskPct,prop.riskPct*2,Math.max(prop.targetPct/2,prop.riskPct),prop.targetPct,prop.targetPct+prop.riskPct*2]
      .filter(v=>v>0).map(v=>+v.toFixed(2));
    const steps=[...new Set(rawSteps)].sort((a,b)=>a-b);
    ladderEl.innerHTML=steps.map(step=>{
      const profitUsd=prop.accountSize*(step/100);
      const gross=profitUsd*(prop.payoutPct/100);
      const net=gross*(1-clamp((prop.taxPct+prop.feePct)/100,0,0.95));
      const trades=snap.tradeTargetUsd>0?Math.ceil(profitUsd/snap.tradeTargetUsd):0;
      return`<tr>
        <td class="mono">${step.toFixed(2)}%</td>
        <td class="mono">${fR(profitUsd)}</td>
        <td class="mono">${fR(gross)}</td>
        <td class="mono">${fR(net)}</td>
        <td class="mono">${fR(net*(prop.fxRate||1))}</td>
        <td class="mono">${trades}</td>
      </tr>`;
    }).join('');
  }
}

function renderStudyPlan(){
  const plan=studyHubState.plan;
  const setVal=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
  setVal('studyPlanTitle',plan.title);
  setVal('studyPlanMarket',plan.market);
  setVal('studyPlanWindow',plan.window);
  setVal('studyPlanSetup',plan.setup);
  setVal('studyPlanInvalidation',plan.invalidation);
  setVal('studyPlanNoTrade',plan.noTrade);
  setVal('studyPlanDailyGoal',plan.dailyGoal);
  setVal('studyPlanDailyStop',plan.dailyStop);
  setVal('studyPlanMaxTrades',plan.maxTrades);
  setVal('studyPlanChecklist',plan.checklist);
  setVal('studyPlanExecution',plan.execution);
  setVal('studyPlanReview',plan.review);

  renderStatusList('studyPlanSummary',[
    {tone:'info',title:plan.title||'Plano ativo',summary:`Mercado: ${plan.market||'—'} · Janela: ${plan.window||'—'}`,value:`${plan.maxTrades||0} trade(s)`},
    {tone:'safe',title:'Risco do dia',summary:`Meta diária em ${f2(plan.dailyGoal||0)}% e stop diário em ${f2(plan.dailyStop||0)}%.`,value:`Stop ${f2(plan.dailyStop||0)}%`},
    {tone:countStudyChecklistItems(plan.checklist)>=4?'safe':'warn',title:'Checklist operacional',summary:`Checklist com ${countStudyChecklistItems(plan.checklist)} item(ns) cadastrados para a abertura.`,value:'Pré-sessão'},
    {tone:'warn',title:'Condição de não trade',summary:plan.noTrade||'Defina quando você não deve operar.',value:'Disciplina'},
  ],'Preencha o plano da sessão para ver o resumo.');
}

function renderStudySimulation(){
  const sim=studyHubState.simulator;
  const setVal=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
  setVal('studySimCapital',sim.capital);
  setVal('studySimRisk',sim.riskPct);
  setVal('studySimWinRate',sim.winRate);
  setVal('studySimRrr',sim.rrr);
  setVal('studySimTrades',sim.trades);
  setVal('studySimRuns',sim.runs);

  const result=buildStudySimulation(sim);
  const expectancyPct=(sim.winRate/100)*(sim.riskPct*sim.rrr)-(1-sim.winRate/100)*sim.riskPct;
  const finalP10=result.p10[result.p10.length-1]||0;
  const finalP50=result.p50[result.p50.length-1]||0;
  const finalP90=result.p90[result.p90.length-1]||0;
  const metrics=document.getElementById('studySimMetrics');
  if(metrics){
    metrics.innerHTML=[
      {cls:expectancyPct>=0?'c-green':'c-red',lbl:'Expectância / trade',val:`${expectancyPct>=0?'+':''}${expectancyPct.toFixed(3)}%`,sub:'sobre o capital',tip:TIPS.expPct},
      {cls:'c-blue',lbl:'Mediana final',val:fR(finalP50),sub:`${((finalP50/sim.capital-1)*100).toFixed(1)}%`,tip:TIPS.p50},
      {cls:'c-red',lbl:'P10 final',val:fR(finalP10),sub:'cauda adversa',tip:TIPS.p10},
      {cls:'c-green',lbl:'P90 final',val:fR(finalP90),sub:'cauda favorável',tip:TIPS.p90},
    ].map(mkCard).join('');
  }

  renderStatusList('studySimSummary',[
    {tone:expectancyPct>=0?'safe':'danger',title:'Expectância matemática',summary:expectancyPct>=0?`Seu setup mantém expectativa positiva de ${expectancyPct.toFixed(3)}% por trade.`:`Seu setup gera expectativa negativa de ${Math.abs(expectancyPct).toFixed(3)}% por trade.`,value:`WR ${f2(sim.winRate)}%`},
    {tone:result.positiveRate>=0.6?'safe':result.positiveRate>=0.4?'warn':'danger',title:'Ciclos positivos',summary:`${(result.positiveRate*100).toFixed(0)}% das simulações terminaram acima do capital inicial.`,value:`${sim.runs} sims`},
    {tone:'info',title:'Zona mediana',summary:`A mediana projeta ${fR(finalP50)} após ${sim.trades} trade(s).`,value:`RRR ${sim.rrr.toFixed(3)}`},
    {tone:'warn',title:'Cauda ruim',summary:`No cenário P10, o capital cai para ${fR(finalP10)}. Use isso para calibrar agressividade.`,value:fR(finalP10)},
  ],'Rode a simulação para ler o cenário.');

  mkChart('studySimChart',{
    type:'line',
    data:{
      labels:result.labels,
      datasets:[
        {label:'P10',data:result.p10,borderColor:'rgba(255,93,104,.75)',backgroundColor:'rgba(255,93,104,.08)',borderWidth:1.5,pointRadius:0,tension:.28},
        {label:'P50',data:result.p50,borderColor:'#22d5ed',backgroundColor:'rgba(34,213,237,.08)',borderWidth:2,pointRadius:0,tension:.28},
        {label:'P90',data:result.p90,borderColor:'rgba(69,224,123,.85)',backgroundColor:'rgba(69,224,123,.08)',borderWidth:1.5,pointRadius:0,tension:.28},
      ],
    },
    options:{...CHART_OPTS,plugins:{...CHART_OPTS.plugins,legend:{labels:{color:'#8ba3ad'}}}},
  });
}

function runStudySimulation(){
  const current=getStudySimForm();
  studyHubState.simulator={...current,seed:Date.now()};
  save();
  renderStudyHub();
}

function renderStudyMental(){
  const mental=studyHubState.mental;
  const acctTrades=getAccountTrades(activeAccountId).filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const setVal=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
  setVal('studyMentalFocus',mental.focus);
  setVal('studyMentalEnergy',mental.energy);
  setVal('studyMentalStress',mental.stress);
  setVal('studyMentalDiscipline',mental.discipline);
  setVal('studyMentalAnchor',mental.anchor);
  setVal('studyMentalTriggers',mental.triggers);
  setVal('studyMentalCutoff',mental.cutoff);
  updateStudyMentalRange('Focus',mental.focus);
  updateStudyMentalRange('Energy',mental.energy);
  updateStudyMentalRange('Stress',mental.stress);
  updateStudyMentalRange('Discipline',mental.discipline);

  const snapshot=getStudyMentalSnapshot(mental);
  const emoMap={};
  acctTrades.forEach(t=>{
    if(!String(t.emotion||'').trim())return;
    const key=t.emotion;
    if(!emoMap[key])emoMap[key]={n:0,w:0};
    emoMap[key].n++;
    if(t.status==='WIN')emoMap[key].w++;
  });
  const emotionRows=Object.entries(emoMap).map(([emotion,data])=>({emotion,wr:data.n?(data.w/data.n)*100:0,n:data.n})).sort((a,b)=>b.wr-a.wr||b.n-a.n);
  const bestEmotion=emotionRows[0];
  const planTaggedTrades=getClosedTradesWithPlanTag(acctTrades);
  const followed=planTaggedTrades.filter(t=>t.followedPlan==='sim').length;
  const followRate=planTaggedTrades.length?(followed/planTaggedTrades.length)*100:0;
  const hesitations=acctTrades.filter(t=>t.hesitation).length;
  const metrics=document.getElementById('studyMentalMetrics');
  if(metrics){
    const mentalReadyTip=`<strong>Prontidão Mental</strong><p>Score calculado com base nas respostas do checklist pré-sessão (sono, foco, estado emocional). Quanto maior, mais preparado você está para operar com processo.</p><div class="tip-row"><span>Abaixo de 55%</span><span>Evite operar ou reduza o tamanho</span></div><div class="tip-row"><span>75% ou mais</span><span>Condição ideal para execução</span></div>`;
    const bestEmoTip=`<strong>Melhor Emoção</strong><p>Estado emocional com maior win rate nos trades registrados. Use como referência: quando estiver nessa emoção, o seu edge tende a se manifestar mais.</p>`;
    metrics.innerHTML=[
      {cls:snapshot.tone==='safe'?'c-green':snapshot.tone==='warn'?'c-yellow':'c-red',lbl:'Prontidão mental',val:`${snapshot.score}%`,sub:'sessão atual',tip:mentalReadyTip},
      {cls:'c-blue',lbl:'Seguiu o plano',val:`${followRate.toFixed(0)}%`,sub:`${followed} trade(s)`,tip:TIPS.followedPlan},
      {cls:'c-purple',lbl:'Melhor emoção',val:bestEmotion?.emotion||'—',sub:bestEmotion?`${bestEmotion.wr.toFixed(0)}% WR`: 'sem dados',tip:bestEmoTip},
      {cls:'c-red',lbl:'Hesitações',val:String(hesitations),sub:'operações perdidas / travadas',tip:TIPS.hesitation},
    ].map(mkCard).join('');
  }

  renderStatusList('studyMentalSummary',[
    {tone:snapshot.tone,title:'Leitura da sessão',summary:snapshot.score>=75?'Você está em boa faixa para operar sem forçar a mão.':snapshot.score>=55?'Sessão operável, mas exige vigilância e processo rígido.':'Estado frágil para manter consistência; proteja a conta.',value:`${snapshot.score}%`},
    {tone:'info',title:'Âncora de execução',summary:mental.anchor||'Defina a frase ou regra que te recoloca no plano quando a cabeça dispersa.',value:'Execução'},
    {tone:'warn',title:'Triggers de risco',summary:mental.triggers||'Liste aqui os gatilhos que normalmente te empurram para fora do plano.',value:'Auto-observação'},
    {tone:'danger',title:'Limite emocional',summary:mental.cutoff||'Defina qual condição encerra a sessão antes do prejuízo emocional contaminar a conta.',value:'Corte'},
  ],'Registre seu estado mental para alimentar a disciplina da sessão.');
}

function buildStudyHubStatuses(moduleKey, acct, acctTrades, risk){
  const closedTrades=acctTrades.filter(t=>['WIN','LOSS','BE'].includes(t.status));
  const deviations=acctTrades.filter(t=>t.followedPlan==='nao'||t.followedPlan==='parcial').length;
  const hesitations=acctTrades.filter(t=>t.hesitation).length;
  const usage=Math.max(risk.dayUsage||0,risk.totalUsage||0);

  if(moduleKey==='propfirm'){
    return [
      {tone:'info',title:'Leitura nativa',summary:'O módulo roda no núcleo do Mukas Hub e usa os mesmos estados da conta ativa para risco, meta e sizing.',value:'Sem iframe'},
      {tone:usageTone(usage),title:'Conta ativa em foco',summary:`${acct.name} opera com ${risk.riskLabel} de risco e está usando ${Math.round((risk.dayUsage||0)*100)}% do limite diário no recorte atual.`,value:risk.anchorLabel},
      {tone:'safe',title:'Melhor uso desta aba',summary:'Feche payout, meta e drawdown aqui antes de decidir lote, contratos ou agressividade da sessão.',value:'Pré-sessão'},
    ];
  }

  if(moduleKey==='plano'){
    return [
      {tone:'info',title:'Plano centralizado',summary:'Seu playbook agora fica na própria tela do Mukas Hub, conectado ao risco, conta ativa e disciplina operacional.',value:'Fluxo nativo'},
      {tone:'safe',title:'Limites da conta ativa',summary:`A conta ${acct.name} está configurada com stop diário de ${f2(acct.ddDaily||0)}% e meta total de ${f2(acct.goalPct||0)}%.`,value:`Stop ${f2(acct.ddDaily||0)}%`},
      {tone:deviations>0?'warn':'safe',title:'Disciplina observada',summary:deviations>0?`Existem ${deviations} operação(ões) fora ou parcial no plano. Use esta aba para endurecer o processo antes da próxima sessão.`:'Nenhum desvio de plano relevante foi encontrado no recorte atual.',value:`${closedTrades.length} trade(s)`},
    ];
  }

  if(moduleKey==='tradesim'){
    return [
      {tone:'info',title:'Simulação integrada',summary:'A leitura de cenários usa o estado atual da conta e conversa direto com o fluxo do Mukas Hub.',value:'Nativo'},
      {tone:closedTrades.length>=20?'safe':'warn',title:'Base real disponível',summary:`A conta ${acct.name} possui ${closedTrades.length} trade(s) fechado(s) para comparar com os cenários do simulador.`,value:`${closedTrades.length} trade(s)`},
      {tone:usageTone(usage),title:'Agressividade sob controle',summary:`Use o simulador considerando o risco atual de ${risk.riskLabel} e os limites da conta antes de escalar tamanho.`,value:'Risco atual'},
    ];
  }

  return [
    {tone:'info',title:'Rotina mental nativa',summary:'A leitura psicológica agora fica dentro do Mukas Hub e cruza disciplina, emoções e hesitações da conta ativa.',value:'Sem dependência externa'},
    {tone:deviations===0&&hesitations===0?'safe':deviations<=2&&hesitations<=2?'warn':'danger',title:'Leitura de disciplina',summary:`Há ${deviations} desvio(s) de plano e ${hesitations} hesitação(ões) registrados na conta ativa.`,value:`${closedTrades.length} trade(s)`},
    {tone:'warn',title:'Risco passa pela cabeça',summary:'Quando o estado mental sair do lugar, o objetivo deixa de ser ganhar mais e passa a ser proteger o drawdown do dia.',value:risk.anchorLabel},
  ];
}

function getStudyHubSummaryTarget(moduleKey){
  return {
    propfirm:'studyPropSummary',
    plano:'studyPlanSummary',
    tradesim:'studySimSummary',
    mental:'studyMentalSummary',
  }[moduleKey] || 'studyPropSummary';
}

function buildStudyHubFeatureList(features=[]){
  return features.map(feature=>`
    <div class="study-feature-item">
      <span class="study-feature-dot"></span>
      <div class="study-feature-copy">
        <strong>${escapeHtml(feature.title||'Módulo')}</strong>
        <small>${escapeHtml(feature.copy||'')}</small>
      </div>
    </div>
  `).join('');
}

function buildStudyHubSidebar(moduleKey){
  const current=STUDY_HUB_INFO[moduleKey]||STUDY_HUB_INFO.propfirm;
  const summaryId=getStudyHubSummaryTarget(moduleKey);
  return `
    <div class="study-side-stack">
      <div class="chart-card study-hub-note">
        <div class="setup-card-title">${escapeHtml(current.title||'Simulações')}</div>
        <div class="study-note-copy">${escapeHtml(current.summary||'')}</div>
        <div class="study-feature-list">${buildStudyHubFeatureList(current.features||[])}</div>
      </div>
      <div class="chart-card">
        <div class="setup-card-title">Conta ativa</div>
        <div id="studyHubRuntimeStatus" class="status-list compact"></div>
      </div>
      <div class="chart-card">
        <div class="setup-card-title">Leitura do módulo</div>
        <div id="${summaryId}" class="status-list compact"></div>
      </div>
    </div>
  `;
}

function buildStudyHubPropFirmMarkup(){
  return `
    <div class="study-section-stack">
      <div class="setup-card">
        <div class="table-header study-card-header">
          <div>
            <div class="setup-card-title">PropFirm Simulator</div>
            <div class="text-muted study-form-copy">Payout, drawdown, meta líquida e sizing em leitura nativa dentro do Mukas Hub.</div>
          </div>
          <div class="study-inline-actions">
            <button class="btn btn-primary btn-sm" onclick="saveStudyPropFirm()">Atualizar leitura</button>
            <button class="btn btn-ghost btn-sm" onclick="syncStudySimulatorFromPropfirm()">Enviar para Trade Simulator</button>
          </div>
        </div>
        <div class="form-grid fg-4">
          <div class="field-group"><label>Conta (USD)</label><input type="number" id="studyPropAccount" step="100" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>Payout %</label><input type="number" id="studyPropPayout" step="1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>DD máximo %</label><input type="number" id="studyPropMaxDd" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>DD diário %</label><input type="number" id="studyPropDailyDd" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>Risco / trade %</label><input type="number" id="studyPropRisk" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>Meta %</label><input type="number" id="studyPropTarget" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>RRR</label><input type="number" id="studyPropRrr" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>USD/BRL</label><input type="number" id="studyPropFx" step="0.01" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>Imposto %</label><input type="number" id="studyPropTax" step="0.1" onchange="saveStudyPropFirm()"></div>
          <div class="field-group"><label>Intermediação %</label><input type="number" id="studyPropFee" step="0.1" onchange="saveStudyPropFirm()"></div>
        </div>
      </div>
      <div class="chart-card">
        <div class="setup-card-title">Leitura quantitativa</div>
        <div id="studyPropMetrics" class="hero-metric-grid"></div>
      </div>
      <div class="table-card">
        <div class="table-header">
          <div class="table-title">Escada de payout</div>
          <div class="text-muted text-mono">cenários em percentual da conta</div>
        </div>
        <table class="tbl">
          <thead>
            <tr><th>Lucro %</th><th>Lucro USD</th><th>Payout bruto</th><th>Líquido USD</th><th>Líquido BRL</th><th>Trades</th></tr>
          </thead>
          <tbody id="studyPropLadder"></tbody>
        </table>
      </div>
    </div>
  `;
}

function buildStudyHubPlanMarkup(){
  return `
    <div class="study-section-stack">
      <div class="setup-card">
        <div class="table-header study-card-header">
          <div>
            <div class="setup-card-title">Plano de Trade</div>
            <div class="text-muted study-form-copy">Playbook operacional, limites da sessão e revisão pós-mercado conectados ao estado atual da conta.</div>
          </div>
          <div class="study-inline-actions">
            <button class="btn btn-primary btn-sm" onclick="saveStudyPlan()">Salvar plano</button>
          </div>
        </div>
        <div class="form-grid fg-3">
          <div class="field-group"><label>Título</label><input type="text" id="studyPlanTitle" onchange="saveStudyPlan()"></div>
          <div class="field-group"><label>Mercado</label><input type="text" id="studyPlanMarket" onchange="saveStudyPlan()"></div>
          <div class="field-group"><label>Janela</label><input type="text" id="studyPlanWindow" onchange="saveStudyPlan()"></div>
          <div class="field-group"><label>Setup</label><textarea id="studyPlanSetup" onchange="saveStudyPlan()"></textarea></div>
          <div class="field-group"><label>Invalidação</label><textarea id="studyPlanInvalidation" onchange="saveStudyPlan()"></textarea></div>
          <div class="field-group"><label>Condição de não trade</label><textarea id="studyPlanNoTrade" onchange="saveStudyPlan()"></textarea></div>
        </div>
      </div>
      <div class="study-native-grid">
        <div class="setup-card">
          <div class="setup-card-title">Regras da sessão</div>
          <div class="form-grid fg-3">
            <div class="field-group"><label>Meta diária %</label><input type="number" id="studyPlanDailyGoal" step="0.1" onchange="saveStudyPlan()"></div>
            <div class="field-group"><label>Stop diário %</label><input type="number" id="studyPlanDailyStop" step="0.1" onchange="saveStudyPlan()"></div>
            <div class="field-group"><label>Máx. trades</label><input type="number" id="studyPlanMaxTrades" step="1" onchange="saveStudyPlan()"></div>
          </div>
        </div>
        <div class="setup-card">
          <div class="setup-card-title">Checklist pré-sessão</div>
          <div class="field-group"><textarea id="studyPlanChecklist" onchange="saveStudyPlan()"></textarea></div>
        </div>
      </div>
      <div class="study-native-grid">
        <div class="setup-card">
          <div class="setup-card-title">Execução</div>
          <div class="field-group"><textarea id="studyPlanExecution" onchange="saveStudyPlan()"></textarea></div>
        </div>
        <div class="setup-card">
          <div class="setup-card-title">Revisão</div>
          <div class="field-group"><textarea id="studyPlanReview" onchange="saveStudyPlan()"></textarea></div>
        </div>
      </div>
    </div>
  `;
}

function buildStudyHubSimulationMarkup(){
  return `
    <div class="study-section-stack">
      <div class="setup-card">
        <div class="table-header study-card-header">
          <div>
            <div class="setup-card-title">Trade Simulator</div>
            <div class="text-muted study-form-copy">Monte Carlo nativo para leitura de expectativa, mediana e cauda adversa com base no risco da conta.</div>
          </div>
          <div class="study-inline-actions">
            <button class="btn btn-primary btn-sm" onclick="runStudySimulation()">Rodar simulação</button>
          </div>
        </div>
        <div class="form-grid fg-3">
          <div class="field-group"><label>Capital</label><input type="number" id="studySimCapital" step="100" onchange="runStudySimulation()"></div>
          <div class="field-group"><label>Risco %</label><input type="number" id="studySimRisk" step="0.1" onchange="runStudySimulation()"></div>
          <div class="field-group"><label>Win Rate %</label><input type="number" id="studySimWinRate" step="1" min="1" max="99" onchange="runStudySimulation()"></div>
          <div class="field-group"><label>RRR</label><input type="number" id="studySimRrr" step="0.1" onchange="runStudySimulation()"></div>
          <div class="field-group"><label>Trades</label><input type="number" id="studySimTrades" step="1" onchange="runStudySimulation()"></div>
          <div class="field-group"><label>Simulações</label><input type="number" id="studySimRuns" step="10" onchange="runStudySimulation()"></div>
        </div>
      </div>
      <div class="chart-card">
        <div class="setup-card-title">Leitura estatística</div>
        <div id="studySimMetrics" class="hero-metric-grid"></div>
      </div>
      <div class="chart-card">
        <div class="table-header">
          <div class="table-title">Monte Carlo</div>
          <div class="text-muted text-mono">p10 · p50 · p90</div>
        </div>
        <div class="study-sim-chart-wrap">
          <canvas id="studySimChart"></canvas>
        </div>
      </div>
    </div>
  `;
}

function buildStudyHubMentalMarkup(){
  return `
    <div class="study-section-stack">
      <div class="setup-card">
        <div class="table-header study-card-header">
          <div>
            <div class="setup-card-title">Ferramentas Mentais</div>
            <div class="text-muted study-form-copy">Check-in psicológico, âncora de execução e gatilhos de corte conectados à disciplina real da conta.</div>
          </div>
          <div class="study-inline-actions">
            <button class="btn btn-primary btn-sm" onclick="saveStudyMental()">Salvar leitura</button>
          </div>
        </div>
        <div class="study-range-grid">
          <div class="study-range-card">
            <div class="range-row"><span>Foco</span><span id="studyMentalFocusVal">4/5</span></div>
            <input type="range" id="studyMentalFocus" min="1" max="5" step="1" oninput="updateStudyMentalRange('Focus',this.value)" onchange="saveStudyMental()">
          </div>
          <div class="study-range-card">
            <div class="range-row"><span>Energia</span><span id="studyMentalEnergyVal">4/5</span></div>
            <input type="range" id="studyMentalEnergy" min="1" max="5" step="1" oninput="updateStudyMentalRange('Energy',this.value)" onchange="saveStudyMental()">
          </div>
          <div class="study-range-card">
            <div class="range-row"><span>Stress</span><span id="studyMentalStressVal">2/5</span></div>
            <input type="range" id="studyMentalStress" min="1" max="5" step="1" oninput="updateStudyMentalRange('Stress',this.value)" onchange="saveStudyMental()">
          </div>
          <div class="study-range-card">
            <div class="range-row"><span>Disciplina</span><span id="studyMentalDisciplineVal">4/5</span></div>
            <input type="range" id="studyMentalDiscipline" min="1" max="5" step="1" oninput="updateStudyMentalRange('Discipline',this.value)" onchange="saveStudyMental()">
          </div>
        </div>
      </div>
      <div class="chart-card">
        <div class="setup-card-title">Leitura emocional</div>
        <div id="studyMentalMetrics" class="hero-metric-grid"></div>
      </div>
      <div class="study-native-grid">
        <div class="setup-card">
          <div class="setup-card-title">Âncora</div>
          <div class="field-group"><textarea id="studyMentalAnchor" onchange="saveStudyMental()"></textarea></div>
        </div>
        <div class="setup-card">
          <div class="setup-card-title">Triggers</div>
          <div class="field-group"><textarea id="studyMentalTriggers" onchange="saveStudyMental()"></textarea></div>
        </div>
      </div>
      <div class="setup-card">
        <div class="setup-card-title">Corte da sessão</div>
        <div class="field-group"><textarea id="studyMentalCutoff" onchange="saveStudyMental()"></textarea></div>
      </div>
    </div>
  `;
}

function buildStudyHubModuleMarkup(moduleKey){
  if(moduleKey==='plano')return buildStudyHubPlanMarkup();
  if(moduleKey==='tradesim')return buildStudyHubSimulationMarkup();
  if(moduleKey==='mental')return buildStudyHubMentalMarkup();
  return buildStudyHubPropFirmMarkup();
}

function buildStudyHubNativeMarkup(moduleKey){
  return `
    <div class="study-tab-panel active" id="studyHubPanel-${moduleKey}">
      <div class="study-hub-shell-native">
        ${buildStudyHubModuleMarkup(moduleKey)}
        ${buildStudyHubSidebar(moduleKey)}
      </div>
    </div>
  `;
}

function switchStudyHubTab(tab, btn){
  if(!STUDY_HUB_INFO[tab])return;
  studyHubTab=tab;
  if(btn){
    document.querySelectorAll('#studyHubTabs .tab-btn').forEach(node=>node.classList.remove('active'));
    btn.classList.add('active');
  }
  renderStudyHub();
}

function renderStudyHub(){
  const moduleKey=STUDY_HUB_INFO[studyHubTab]?studyHubTab:'propfirm';
  studyHubTab=moduleKey;
  const host=document.getElementById('studyHubLegacyApp');
  const acct=getActiveAccount();
  const acctTrades=getAccountTrades(activeAccountId);
  const risk=calcAccountRiskState(acct,acctTrades);
  const moduleIndex={propfirm:0,plano:1,tradesim:2,mental:3}[moduleKey] ?? 0;

  document.querySelectorAll('#studyHubTabs .tab-btn').forEach(btn=>{
    const active=btn.getAttribute('onclick')?.includes(`'${moduleKey}'`);
    btn.classList.toggle('active',!!active);
  });

  if(host){
    host.classList.add('embed-mode');
    if(typeof window.sh_hubSwitch==='function') window.sh_hubSwitch(moduleIndex);
    else {
      ['mod-propfirm','mod-plano','mod-tradesim','mod-mental'].forEach((id,idx)=>{
        const el=document.getElementById(id);
        if(el) el.classList.toggle('active', idx===moduleIndex);
      });
    }
    syncStudyHubLegacyInputs(moduleKey);
    if(typeof window.sh_legacyInit==='function') window.sh_legacyInit(moduleKey);
    if(moduleKey==='tradesim'&&typeof window.studyHubEnhanceIntradayImpact==='function'){
      requestAnimationFrame(()=>window.studyHubEnhanceIntradayImpact());
    }
  }

  renderStatusList('studyHubRuntimeStatus',buildStudyHubStatuses(moduleKey,acct,acctTrades,risk),'Conta ativa sem alertas críticos.');
  if(moduleKey==='propfirm')renderStudyPropFirm();
  else if(moduleKey==='plano')renderStudyPlan();
  else if(moduleKey==='tradesim')renderStudySimulation();
  else renderStudyMental();
}
