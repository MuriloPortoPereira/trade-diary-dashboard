// Restore and normalize app state through the raw readPersistedAppState IO contract.
function load(){
  try{
    const {trades:t,config:c,preMarketData:pm,accounts:ac,activeAccountId:ai,studyHubState:sh}=readPersistedAppState();
    if(t)trades=JSON.parse(t);
    if(c)config={...config,...JSON.parse(c)};
    config=ensureDefaultStrategies(config);
    config=ensurePartnerHubConfig(config);
    if(pm)preMarketData=JSON.parse(pm);
    if(ac)accounts=JSON.parse(ac).map(normalizeAccount);
    if(ai)activeAccountId=ai;
    if(sh){
      studyHubState=mergeStudyHubState(JSON.parse(sh));
    }
    recomputeAllIncomplete();
  }catch(e){}
}

function normalizeStrategyName(value){
  return cleanMTCell(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w]+/g,'');
}

function tagConfigKey(type){
  return type==='strategy'?'strategies':type+'s';
}

function ensureDefaultStrategies(cfg=config){
  const next={...cfg};
  if(!Array.isArray(next.strategies))next.strategies=[];
  if(Array.isArray(next.strategys)){
    const existingLegacy=new Set(next.strategies.map(normalizeStrategyName));
    next.strategys.forEach(name=>{
      const clean=cleanMTCell(name);
      const key=normalizeStrategyName(clean);
      if(clean&&key&&!existingLegacy.has(key)){next.strategies.push(clean);existingLegacy.add(key);}
    });
    delete next.strategys;
  }
  if(!Array.isArray(next.deletedDefaultStrategies))next.deletedDefaultStrategies=[];
  const deleted=new Set(next.deletedDefaultStrategies.map(normalizeStrategyName));
  const existing=new Set(next.strategies.map(normalizeStrategyName));
  DEFAULT_STRATEGIES.forEach(name=>{
    const key=normalizeStrategyName(name);
    if(!deleted.has(key)&&!existing.has(key)){next.strategies.push(name);existing.add(key);}
  });
  next.strategyDefaultsSeeded=true;
  return next;
}
