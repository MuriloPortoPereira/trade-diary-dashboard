// Transitional application workflow: legacy state and adapters are composed by app.js.
function restoreBackupData(data){
  validateBackupData(data);
  if(Array.isArray(data.trades))trades=data.trades;
  if(data.config&&typeof data.config==='object')config=ensureDefaultStrategies({...config,...data.config});
  else config=ensureDefaultStrategies(config);
  if(data.preMarketData&&typeof data.preMarketData==='object'&&!Array.isArray(data.preMarketData))preMarketData=data.preMarketData;
  if(Array.isArray(data.accounts)&&data.accounts.length)accounts=data.accounts.map(normalizeAccount);
  if(data.activeAccountId)activeAccountId=data.activeAccountId;
  if(!activeAccountId&&accounts[0])activeAccountId=accounts[0].id;
  if(data.studyHubState)studyHubState=mergeStudyHubState(data.studyHubState);
  return summarizeBackupData(createBackupPayload());
}
