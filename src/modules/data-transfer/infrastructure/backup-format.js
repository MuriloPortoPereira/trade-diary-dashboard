// Validation and counts for the existing backup data format.
globalThis.TradeDiaryBackupFormat = (() => {
  function summarizeBackupData(data){
    const src=(data&&typeof data==='object')?data:{};
    return {
      trades:Array.isArray(src.trades)?src.trades.length:0,
      accounts:Array.isArray(src.accounts)?src.accounts.length:0,
      preMarketDays:(src.preMarketData&&typeof src.preMarketData==='object'&&!Array.isArray(src.preMarketData))?Object.keys(src.preMarketData).length:0,
      documents:Array.isArray(src.config?.generalDocs)?src.config.generalDocs.length:0,
    };
  }

  function validateBackupData(data){
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Arquivo de backup inválido.');
    const keys=['trades','config','preMarketData','accounts','activeAccountId','studyHubState'];
    if(!keys.some(k=>Object.prototype.hasOwnProperty.call(data,k)))throw new Error('Arquivo não parece ser um backup do diário.');
  }

  return {summarizeBackupData,validateBackupData};
})();
