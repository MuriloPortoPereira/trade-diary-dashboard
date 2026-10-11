function switchStatTab(id,el){
  ['overview','strategy','time','psych','simulation'].forEach(t=>{
    const div=document.getElementById('statTab-'+t);
    if(div)div.style.display=t===id?'block':'none';
  });
  document.querySelectorAll('#statTabNav .tab-btn').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  if(id==='psych')renderStatsPsych();
  else if(id==='simulation'){resetSimulationEntryDefaults();renderSimulation();}
  else renderStats();
}
