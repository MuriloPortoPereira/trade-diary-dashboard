function buildTickmillDemoImport(){
  const account=ensureTickmillAccount();
  return buildSampleTrades(account.id).slice(0,40).map((trade,index)=>({
    ...trade,
    id:`tickmill-demo-${index+1}`,
    positionId:`tickmill-demo-${index+1}`,
    accountId:account.id,
  }));
}

function loadTickmillDemoImport(){
  const account=ensureTickmillAccount();
  activeAccountId=account.id;
  setPendingImport(buildTickmillDemoImport(),{accountId:account.id,source:'tickmill-demo'});
  save();
  renderTopbarAccount();
  updateTopbarStats();
  showImportPreview(pendingImport);
  openModal('csvConfirmModal');
}

function buildSampleTrades(accountId=activeAccountId, baseDateStr=new Date().toISOString().split('T')[0]){
  const sampleTradeCount=300;
  const account=accounts.find(a=>a.id===accountId)||getActiveAccount();
  const baseBalance=account?.balance||config.balance||1000;
  const seedText=`${accountId}|${baseDateStr}|mukas-sample-trades`;
  let seed=0;
  for(let i=0;i<seedText.length;i++)seed=(seed*31+seedText.charCodeAt(i))>>>0;
  const rnd=()=>{
    seed=(seed*1664525+1013904223)>>>0;
    return seed/4294967296;
  };
  const pick=arr=>arr[Math.floor(rnd()*arr.length)%arr.length];
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const round=(value,symbol)=>{
    const digits=['EURUSD','GBPUSD'].includes(symbol)?5:['USDJPY','XAUUSD'].includes(symbol)?2:2;
    return parseFloat(Number(value).toFixed(digits));
  };
  const toDate=offset=>{
    const d=new Date(baseDateStr+'T12:00:00');
    d.setDate(d.getDate()+offset);
    return d.toISOString().slice(0,10);
  };
  const clampMinutes=minutes=>Math.max(0,Math.min(minutes,23*60+59));
  const buildSampleClockBundle=(strategy,market,status)=>{
    const strategyName=normalizeLooseText(strategy);
    let base=market==='Crypto'?10*60:market==='Forex'?8*60+30:market==='B3'?9*60+10:9*60+30;
    if(strategyName.includes('vwap'))base=market==='Crypto'?9*60+40:market==='Forex'?8*60:9*60+28;
    else if(strategyName.includes('impulso'))base+=20;
    else if(strategyName.includes('brooks'))base+=42;
    const placed=clampMinutes(base-(2+Math.floor(rnd()*12)));
    const opened=clampMinutes(base+Math.floor(rnd()*18));
    const duration=status==='WIN'
      ? 6+Math.floor(rnd()*26)
      : status==='LOSS'
        ? 4+Math.floor(rnd()*28)
        : 3+Math.floor(rnd()*16);
    const exited=clampMinutes(opened+duration);
    return{
      placedTime:formatClockMinutes(placed),
      openTime:formatClockMinutes(opened),
      exitTime:formatClockMinutes(exited),
    };
  };
  const symbolProfiles={
    US30:{base:38200,riskPts:55,qty:1,market:'EUA'},
    US500:{base:5150,riskPts:12,qty:1,market:'EUA'},
    USTEC:{base:18350,riskPts:34,qty:1,market:'EUA'},
    US2000:{base:2040,riskPts:8,qty:1,market:'EUA'},
    EURUSD:{base:1.075,riskPts:0.0022,qty:0.2,market:'Forex'},
    GBPUSD:{base:1.25,riskPts:0.0026,qty:0.2,market:'Forex'},
    USDJPY:{base:155.2,riskPts:0.28,qty:0.2,market:'Forex'},
    XAUUSD:{base:2390,riskPts:5.5,qty:0.1,market:'Forex'},
    BTCUSD:{base:64500,riskPts:650,qty:0.05,market:'Crypto'},
    ETHUSD:{base:3150,riskPts:46,qty:0.4,market:'Crypto'},
  };
  const symbols=Object.keys(symbolProfiles);
  const strategies=[...new Set([...DEFAULT_STRATEGIES,'Al Brooks','Halt Vwap'])];
  const emotions=['Tranquilidade','Neutralidade','Medo','Frustração','Euforia','Clareza mental','FOMO','Raiva','Culpa'];
  const beforeEmotions=['Tranquilidade','Neutralidade','Medo','FOMO','Euforia','Frustração','Clareza mental'];
  const afterByStatus={
    WIN:['Tranquilidade','Clareza mental','Alívio','Neutralidade'],
    LOSS:['Frustração','Culpa','Raiva','Medo'],
    BE:['Alívio','Neutralidade','Tranquilidade'],
  };
  const remarksByStatus={
    WIN:['Gatilho respeitado, gestão controlada e saída coerente com o plano.','Entrada com contexto favorável e execução limpa após confirmação.','Trade bom para estudar repetição de setup vencedor.'],
    LOSS:['Perda útil para revisar execução, risco e reação emocional.','Setup falhou e evidenciou ponto de melhoria no processo.','Trade negativo incluído para testar drawdown e análise de erros.'],
    BE:['Trade protegido cedo, bom para revisar gestão e saída no zero.','Operação sem direção suficiente, encerrada perto do breakeven.','Resultado neutro para comparar disciplina e hesitação.'],
  };
  const specs=[
    {date:-9,symbol:'US500',market:'EUA',direction:'Long',entry:5120.25,stop:5108.25,tp:5144.25,exit:5141.25,qty:1,riskUsd:20,r:1.75,fees:1.8,strategy:'Al Brooks',emotion:'Clareza mental',emoBefore:'Neutralidade',emoAfter:'Tranquilidade',followedPlan:'sim',planDeviation:'',errors:[],discipline:92,confidence:84,hesitation:false,remarks:'Gatilho de pullback claro, entrada no reteste e saída parcial perto da região de liquidez.'},
    {date:-8,symbol:'USTEC',market:'EUA',direction:'Short',entry:18240.5,stop:18272.5,tp:18176.5,exit:18272.5,qty:1,riskUsd:22,r:-1,fees:2.2,strategy:'Halt Vwap',emotion:'Frustração',emoBefore:'Ansiedade',emoAfter:'Frustração',followedPlan:'parcial',planDeviation:'Antecipou confirmação do candle.',errors:['Entrou sem gatilho','FOMO'],discipline:48,confidence:62,hesitation:false,remarks:'Contexto era bom, mas a entrada veio antes do fechamento. Loss de processo.'},
    {date:-7,symbol:'GBPUSD',market:'Forex',direction:'Long',entry:1.2512,stop:1.2492,tp:1.2552,exit:1.2528,qty:0.2,riskUsd:16,r:0.8,fees:0.8,strategy:'PIVÔ Al Brooks',emotion:'Neutralidade',emoBefore:'Tranquilidade',emoAfter:'Alívio',followedPlan:'sim',planDeviation:'',errors:[],discipline:84,confidence:72,hesitation:false,remarks:'Trade menor após notícia. Gestão conservadora, parcial rápida e stop protegido.'},
    {date:-6,symbol:'US30',market:'EUA',direction:'Long',entry:38120,stop:38070,tp:38220,exit:38220,qty:1,riskUsd:25,r:2,fees:2.4,strategy:'Setup VWAP (Rompimento)',emotion:'Tranquilidade',emoBefore:'Clareza mental',emoAfter:'Tranquilidade',followedPlan:'sim',planDeviation:'',errors:[],discipline:96,confidence:88,hesitation:false,remarks:'Rompimento com volume e VWAP sustentando. Trade executado dentro do plano.'},
    {date:-5,symbol:'XAUUSD',market:'Forex',direction:'Short',entry:2386.2,stop:2391.2,tp:2376.2,exit:2386.2,qty:0.1,riskUsd:18,r:0,fees:1.1,strategy:'Al Brooks',emotion:'Medo',emoBefore:'Medo',emoAfter:'Alívio',followedPlan:'sim',planDeviation:'',errors:['Saí cedo'],discipline:70,confidence:58,hesitation:true,remarks:'Houve hesitação na gestão e saída no zero. Registrar para comparar com o alvo original.'},
    {date:-4,symbol:'EURUSD',market:'Forex',direction:'Long',entry:1.0724,stop:1.0704,tp:1.0764,exit:1.0704,qty:0.2,riskUsd:20,r:-1,fees:0.9,strategy:'PIVÔ Al Brooks',emotion:'Culpa',emoBefore:'FOMO',emoAfter:'Culpa',followedPlan:'nao',planDeviation:'Entrou fora do horário planejado.',errors:['Fora do horário','Revenge trade'],discipline:32,confidence:45,hesitation:false,remarks:'Trade tomado para recuperar perda anterior. Deve entrar na revisão de rotina.'},
    {date:-3,symbol:'BTCUSD',market:'Crypto',direction:'Long',entry:64200,stop:63600,tp:65400,exit:64920,qty:0.05,riskUsd:30,r:1.2,fees:3.2,strategy:'Halt Vwap',emotion:'Neutralidade',emoBefore:'Neutralidade',emoAfter:'Clareza mental',followedPlan:'sim',planDeviation:'',errors:[],discipline:86,confidence:76,hesitation:false,remarks:'Entrada menor por volatilidade. Parcial saiu bem e protegeu contra devolução.'},
    {date:-2,symbol:'US500',market:'EUA',direction:'Short',entry:5168.5,stop:5180.5,tp:5144.5,exit:5180.5,qty:1,riskUsd:20,r:-1,fees:1.8,strategy:'Trade de Impulso',emotion:'Raiva',emoBefore:'Frustração',emoAfter:'Raiva',followedPlan:'nao',planDeviation:'Aumentou agressividade após stop anterior.',errors:['Aumentou lote no prejuízo','Não aceitou stop'],discipline:24,confidence:70,hesitation:false,remarks:'Sinal de risco emocional. Encerrar sessão depois desse tipo de leitura.'},
    {date:-1,symbol:'USTEC',market:'EUA',direction:'Long',entry:18310,stop:18280,tp:18370,exit:18358,qty:1,riskUsd:24,r:1.6,fees:2.1,strategy:'Al Brooks',emotion:'Tranquilidade',emoBefore:'Neutralidade',emoAfter:'Tranquilidade',followedPlan:'sim',planDeviation:'',errors:[],discipline:90,confidence:82,hesitation:false,remarks:'Boa espera pelo gatilho, stop técnico respeitado e saída antes da resistência maior.'},
    {date:-1,symbol:'XAUUSD',market:'Forex',direction:'Long',entry:2398.5,stop:2393.5,tp:2408.5,exit:2395,qty:0.1,riskUsd:26,r:-0.7,fees:1.2,strategy:'Halt VWAP (André)',emotion:'Medo',emoBefore:'Neutralidade',emoAfter:'Frustração',followedPlan:'parcial',planDeviation:'Ajustou saída durante candle ainda aberto.',errors:['Saí cedo','Hesitação na execução'],discipline:58,confidence:64,hesitation:true,remarks:'Setup ainda válido, mas a gestão ficou defensiva após candle contra. Útil para revisar hesitação em loss.'},
    {date:0,symbol:'US30',market:'EUA',direction:'Short',entry:38240,stop:38290,tp:38140,exit:38310,qty:1,riskUsd:25,r:-1.4,fees:2.6,strategy:'Trade de Impulso',emotion:'Raiva',emoBefore:'Frustração',emoAfter:'Culpa',followedPlan:'nao',planDeviation:'Insistiu no short após stop técnico e aceitou slippage pior.',errors:['Não aceitou stop','Aumentou lote no prejuízo','Overtrade'],discipline:18,confidence:78,hesitation:false,remarks:'Trade simulado para testar estouro de DD diário: perda acima do risco planejado e quebra clara de processo.'},
    {date:0,symbol:'USTEC',market:'EUA',direction:'Long',entry:18420,stop:18390,tp:18480,exit:18396,qty:1,riskUsd:30,r:-0.8,fees:2.2,strategy:'Halt Vwap',emotion:'FOMO',emoBefore:'Euforia',emoAfter:'Frustração',followedPlan:'nao',planDeviation:'Entrou por medo de perder movimento depois de loss anterior.',errors:['FOMO','Entrou sem gatilho','Operou cansado'],discipline:22,confidence:68,hesitation:false,remarks:'Segundo loss do dia para validar alertas de DD, rotina emocional e análise de erros cometidos.'},
    {date:0,symbol:'BTCUSD',market:'Crypto',direction:'Short',entry:64800,stop:65100,tp:64200,exit:64710,qty:0.05,riskUsd:18,r:0.3,fees:2.9,strategy:'Al Brooks',emotion:'Neutralidade',emoBefore:'Culpa',emoAfter:'Alívio',followedPlan:'sim',planDeviation:'',errors:['Take profit cedo'],discipline:74,confidence:56,hesitation:false,remarks:'Trade pequeno depois do DD. Seguiu plano de reduzir agressividade, mas saiu cedo antes do alvo principal.'},
  ];
  const generated=[];
  for(let i=specs.length;i<sampleTradeCount;i++){
    const symbol=pick(symbols);
    const profile=symbolProfiles[symbol];
    const direction=rnd()>0.48?'Long':'Short';
    const statusRoll=rnd();
    const status=statusRoll<0.48?'WIN':statusRoll<0.93?'LOSS':'BE';
    const r=status==='WIN'
      ? parseFloat((0.35+rnd()*2.4).toFixed(2))
      : status==='LOSS'
        ? parseFloat((-(0.35+rnd()*1.35)).toFixed(2))
        : parseFloat(((rnd()-0.5)*0.16).toFixed(2));
    const date=-Math.floor(i/2);
    const drift=1+(rnd()-0.5)*0.04;
    const entry=round(profile.base*drift,symbol);
    const riskPts=profile.riskPts*(0.75+rnd()*0.65);
    const stop=round(direction==='Long'?entry-riskPts:entry+riskPts,symbol);
    const targetR=Math.max(1.2,Math.abs(r)+0.55);
    const tp=round(direction==='Long'?entry+riskPts*targetR:entry-riskPts*targetR,symbol);
    const exit=round(direction==='Long'?entry+riskPts*r:entry-riskPts*r,symbol);
    const followedPlan=status==='WIN'
      ? (rnd()>0.18?'sim':'parcial')
      : status==='LOSS'
        ? (rnd()>0.62?'sim':rnd()>0.38?'parcial':'nao')
        : (rnd()>0.25?'sim':'parcial');
    const errors=[];
    if(followedPlan!=='sim'||status==='LOSS'||rnd()<0.18){
      const count=followedPlan==='nao'?2:1;
      for(let j=0;j<count;j++){
        const err=pick(DEFAULT_TRADE_ERRORS);
        if(!errors.includes(err))errors.push(err);
      }
    }
    const discipline=followedPlan==='sim'
      ? Math.round(clamp(70+rnd()*27-(status==='LOSS'?10:0),0,100))
      : followedPlan==='parcial'
        ? Math.round(45+rnd()*35)
        : Math.round(15+rnd()*40);
    const riskUsd=parseFloat((12+rnd()*28).toFixed(2));
    generated.push({
      date,
      symbol,
      market:profile.market,
      direction,
      entry,
      stop,
      tp,
      exit,
      qty:profile.qty,
      riskUsd,
      r,
      fees:parseFloat((0.6+rnd()*3.4).toFixed(2)),
      strategy:pick(strategies),
      emotion:pick(emotions),
      emoBefore:pick(beforeEmotions),
      emoAfter:pick(afterByStatus[status]),
      followedPlan,
      planDeviation:followedPlan==='sim'?'':pick(['Entrou antes da confirmação.','Saiu antes do alvo por desconforto.','Aumentou agressividade depois de perda.','Reduziu posição fora do plano original.']),
      errors,
      discipline,
      confidence:Math.round(clamp(42+rnd()*48+(status==='WIN'?8:0),0,100)),
      hesitation:rnd()<0.2||errors.includes('Hesitação na execução'),
      remarks:pick(remarksByStatus[status]),
    });
  }
  return [...specs,...generated].slice(0,sampleTradeCount).map((s,i)=>{
    const pnl=parseFloat((s.r*s.riskUsd).toFixed(2));
    const status=s.r>0?'WIN':s.r<0?'LOSS':'BE';
    const timing=buildSampleClockBundle(s.strategy,s.market,status);
    return {
      id:uid(),
      accountId,
      symbol:s.symbol,
      date:toDate(s.date),
      exitDate:toDate(s.date),
      placedTime:normalizeClockTime(s.placedTime)||timing.placedTime,
      openTime:normalizeClockTime(s.openTime)||timing.openTime,
      exitTime:normalizeClockTime(s.exitTime)||timing.exitTime,
      market:s.market,
      direction:s.direction,
      entry:s.entry,
      stop:s.stop,
      tp:s.tp,
      exit:s.exit,
      qty:s.qty,
      mult:null,
      riskPct:parseFloat((s.riskUsd/baseBalance*100).toFixed(2)),
      riskUsd:s.riskUsd,
      r:s.r,
      pnl,
      pnlPct:parseFloat((pnl/baseBalance).toFixed(4)),
      fees:s.fees,
      strategy:s.strategy,
      emotion:s.emotion,
      emoBefore:s.emoBefore,
      emoAfter:s.emoAfter,
      followedPlan:s.followedPlan,
      planDeviation:s.planDeviation,
      errors:[...s.errors],
      discipline:s.discipline,
      confidence:s.confidence,
      mistake:s.errors[0]||'',
      remarks:s.remarks,
      images:[],
      hesitation:s.hesitation,
      resultType:status,
      status,
      mode:'percent',
      incomplete:false,
      missing_fields:[],
      createdAt:new Date(new Date(baseDateStr+'T12:00:00').getTime()-(specs.length-i)*3600000).toISOString(),
      updatedAt:new Date().toISOString(),
    };
  });
}

function ensureSampleStrategies(){
  ['Al Brooks','Halt Vwap'].forEach(name=>{
    if(!config.strategies.some(s=>normalizeStrategyName(s)===normalizeStrategyName(name))){
      config.strategies.push(name);
    }
  });
}

function loadSampleData(){
  ensureSampleStrategies();
  trades.push(...buildSampleTrades(activeAccountId));
  save();
}

function addSampleTrades(){
  if(showLogAccountEditLockNotice('adicionar'))return;
  const acct=getActiveAccount();
  showAppConfirm('Adicionar dados demo','Adicionar 300 trades simulados na conta atual para testar análises, psicológico, taxas, estratégias e estouro de DD?',()=>{
    ensureSampleStrategies();
    trades.unshift(...buildSampleTrades(acct.id));
    save();refreshAll();
    showAppNotice('Dados demo adicionados','300 trades simulados foram adicionados ao histórico.');
  },{confirmText:'Adicionar'});
}
