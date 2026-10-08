function renderTopbarValue(id){
  const item=topbarValueCache[id];
  const el=document.getElementById(id);
  if(!item||!el)return;
  const value=topbarDensity==='compact'?item.compact:item.full;
  el.textContent=value;
  el.title=item.full;
  setTopbarClass(el,item.baseClass,item.cls);
}
