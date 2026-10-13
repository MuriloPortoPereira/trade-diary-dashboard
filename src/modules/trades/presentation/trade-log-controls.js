function sortLog(col){
  if(sortState.col===col){sortState.dir=sortState.dir==='asc'?'desc':'asc';}
  else{sortState.col=col;sortState.dir=col==='date'?'desc':'asc';}
  document.querySelectorAll('.sort-ind').forEach(el=>el.textContent='');
  const ind=document.getElementById('si-'+col);
  if(ind)ind.textContent=sortState.dir==='asc'?'↑':'↓';
  renderLog();
}

function clearLogDateRange(){
  const start=document.getElementById('filterDateStart');
  const end=document.getElementById('filterDateEnd');
  if(start)start.value='';
  if(end)end.value='';
  renderLog();
}

function toggleSelectAll(el){
  const tbody=document.getElementById('logTbody');
  tbody.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.checked=el.checked;
    const row=cb.closest('tr');
    if(row)row.classList.toggle('selected',el.checked);
    if(el.checked)selectedTrades.add(cb.dataset.id);
    else selectedTrades.delete(cb.dataset.id);
  });
  updateBulkBar();
}

function toggleRowSelect(cb,id){
  if(cb.checked)selectedTrades.add(id);
  else selectedTrades.delete(id);
  const row=cb.closest('tr');
  if(row)row.classList.toggle('selected',cb.checked);
  updateBulkBar();
}

function clearSelection(){
  selectedTrades.clear();
  document.querySelectorAll('#logTbody input[type=checkbox]').forEach(cb=>{cb.checked=false;cb.closest('tr')?.classList.remove('selected');});
  const ca=document.getElementById('chkAll');if(ca)ca.checked=false;
  updateBulkBar();
}
