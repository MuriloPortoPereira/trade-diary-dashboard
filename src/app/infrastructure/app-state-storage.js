// Browser IO for the six legacy state keys; save retains sequential access to legacy globals.
function save(){
  localStorage.setItem('tl_trades',JSON.stringify(trades));
  localStorage.setItem('tl_config',JSON.stringify(config));
  localStorage.setItem('tl_pm',JSON.stringify(preMarketData));
  localStorage.setItem('tl_accounts',JSON.stringify(accounts));
  localStorage.setItem('tl_activeAccount',activeAccountId);
  localStorage.setItem('tl_studyhub',JSON.stringify(studyHubState));
}

function readPersistedAppState(){
  const t=localStorage.getItem('tl_trades'),c=localStorage.getItem('tl_config');
  const pm=localStorage.getItem('tl_pm');
  const ac=localStorage.getItem('tl_accounts'),ai=localStorage.getItem('tl_activeAccount');
  const sh=localStorage.getItem('tl_studyhub');
  return {trades:t,config:c,preMarketData:pm,accounts:ac,activeAccountId:ai,studyHubState:sh};
}
