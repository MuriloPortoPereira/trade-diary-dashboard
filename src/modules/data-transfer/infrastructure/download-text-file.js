// Browser download adapter; no work runs until the global API is called.
function downloadTextFile(content,filename,type='text/csv'){
  const a=document.createElement('a');
  const url=URL.createObjectURL(new Blob([content],{type}));
  a.href=url;
  a.download=filename;
  a.click();
  if(URL.revokeObjectURL)setTimeout(()=>URL.revokeObjectURL(url),1000);
}
