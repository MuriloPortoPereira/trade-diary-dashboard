function togglePlanDeviation(){
  const pd=document.getElementById('t-plan-deviation');
  if(!pd)return;
  pd.disabled=false;
  pd.style.opacity='1';
  const followed=document.getElementById('t-followedplan')?.value||'';
  pd.placeholder=followed==='sim'
    ? 'Opcional: algum detalhe mesmo seguindo o plano?'
    : 'O que mudou na execução, entrada, saída ou gestão?';
  autoDisc();
}
