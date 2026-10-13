function refreshAll(){
  const active=document.querySelector('.page.active');
  const id=active?.id?.replace('page-','')||'dashboard';
  ({dashboard:renderDashboard,log:renderLog,calendar:renderCalendar,stats:renderStats,psych:renderPsych,setup:renderSetup,premarket:renderPremarket,strategyHub:renderStrategyHub,studyHub:renderStudyHub,documents:renderDocumentsPage,notifications:renderNotificationsPage,accounts:renderAccountsPage,partners:renderPartnersPage,profile:renderProfilePage}[id]||(() => {}))();
  const a=getActiveAccount();
  syncAccountBalanceChrome(a,getAccountTrades(a.id));
  updateTopbarStats();
  updateIncompleteBanner();
}

function toggleSidebar(force){
  const sidebar=document.getElementById('sidebar');
  const overlay=document.getElementById('sidebar-overlay');
  if(!sidebar||!overlay)return;
  const nextState=typeof force==='boolean' ? force : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open',nextState);
  overlay.classList.toggle('show',nextState);
}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('onclick')?.includes("'"+id+"'"))n.classList.add('active');});
  if(id==='dashboard'){const sel=document.getElementById('dashPeriod');if(sel)sel.value='all';}
  if(id==='stats'&&document.getElementById('statTab-simulation')?.style.display==='block')resetSimulationEntryDefaults();
  ({dashboard:renderDashboard,log:renderLog,calendar:renderCalendar,stats:renderStats,psych:renderPsych,setup:renderSetup,premarket:renderPremarket,strategyHub:renderStrategyHub,studyHub:renderStudyHub,documents:renderDocumentsPage,notifications:renderNotificationsPage,accounts:renderAccountsPage,partners:renderPartnersPage,profile:renderProfilePage}[id]||(() => {}))();
  toggleSidebar(false);
}
