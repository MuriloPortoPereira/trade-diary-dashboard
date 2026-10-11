function toggleEqMode(){
  eqMode=eqMode==='value'?'pct':'value';
  const btn=document.getElementById('eqModeBtn');
  if(btn)btn.textContent=eqMode==='value'?'% retorno':'$ valor';
  renderDashboard();
}
