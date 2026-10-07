function renderSetup(){
  const s=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v;};
  const acct=getActiveAccount();
  s('cfg-balance',acct?.balance??config.balance);
  s('cfg-goal',acct?.goalPct??config.goal??10);
  s('cfg-risk',acct?.risk??config.risk);
  s('cfg-dd-daily',acct?.ddDaily??config.ddDaily??2);
  s('cfg-dd-weekly',acct?.ddWeekly??config.ddWeekly??5);
  s('cfg-dd-monthly',acct?.ddMonthly??config.ddMonthly??8);
  s('cfg-dd',acct?.ddTotal??(config.dd||10));
  s('cfg-tf',config.tf);s('cfg-mult',config.mult||'');
  s('cfg-sym-default',config.symDefault||'');
  const flowDate=document.getElementById('setup-flow-date');if(flowDate&&!flowDate.value)flowDate.value=new Date().toISOString().split('T')[0];
  renderSetupRiskSummary();
  renderSetupCashflowList();
  renderTags('strategy');renderTags('emotion');renderTags('market');
}
