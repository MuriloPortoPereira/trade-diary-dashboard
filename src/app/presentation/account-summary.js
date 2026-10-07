function renderTopbarAccount(){
  const a=getActiveAccount();
  if(!a)return;
  const dot=document.getElementById('acctDot');
  const name=document.getElementById('acctPillName');
  const type=document.getElementById('acctPillType');
  if(dot)dot.style.background=a.color;
  if(name)name.textContent=a.name;
  if(type)type.textContent=acctTypeLabel(a.type);
}
