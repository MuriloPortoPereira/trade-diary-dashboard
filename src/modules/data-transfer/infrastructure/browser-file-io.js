// Classic-script adapters for spreadsheet loading and HTML report rows.
function loadSheetJS(cb){
  if(window.XLSX){cb();return;}
  const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=cb;document.head.appendChild(s);
}

function parseMT5HTML(html,filename){
  const div=document.createElement('div');div.innerHTML=html;
  const allRows=[];
  div.querySelectorAll('tr').forEach(tr=>{const cells=[...tr.querySelectorAll('td,th')].map(c=>c.textContent.trim());if(cells.length>=10)allRows.push(cells);});
  return parseSpreadsheetRows(allRows,filename);
}
// Browser download adapter; no work runs until the global API is called.
function downloadTextFile(content,filename,type='text/csv'){
  const a=document.createElement('a');
  const url=URL.createObjectURL(new Blob([content],{type}));
  a.href=url;
  a.download=filename;
  a.click();
  if(URL.revokeObjectURL)setTimeout(()=>URL.revokeObjectURL(url),1000);
}
