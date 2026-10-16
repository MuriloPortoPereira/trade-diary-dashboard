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
