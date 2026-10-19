// Tabular value normalization; classic global APIs and helper lookup behavior retained.
function parseMTNumber(value){
  if(value===null||value===undefined)return null;
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  let s=String(value).trim();
  if(!s||s==='—')return null;
  let neg=false;
  if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1);}
  s=s.replace(/\u00a0/g,' ').replace(/[^\d,.\-+]/g,'').replace(/\s/g,'');
  if(!s)return null;
  const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
  if(comma>-1&&dot>-1){
    const decimal=comma>dot?',':'.';
    const thousand=decimal===','?'.':',';
    s=s.replace(new RegExp('\\'+thousand,'g'),'');
    if(decimal===',')s=s.replace(',','.');
  } else if(comma>-1){
    s=s.replace(/\./g,'').replace(',','.');
  }
  const n=parseFloat(s);
  if(!Number.isFinite(n))return null;
  return neg?-Math.abs(n):n;
}

function normalizeDate(value){
  if(value===null||value===undefined)return'';
  if(value instanceof Date&&!isNaN(value.getTime()))return value.toISOString().slice(0,10);
  const raw=String(value).trim();
  if(!raw)return'';
  const pad=n=>String(n).padStart(2,'0');
  let m=raw.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if(m)return`${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m=raw.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if(m)return`${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  const serial=parseMTNumber(raw);
  if(/^\d+([.,]\d+)?$/.test(raw)&&serial&&serial>20000&&serial<80000){
    const d=new Date(Date.UTC(1899,11,30)+serial*86400000);
    return d.toISOString().slice(0,10);
  }
  const d=new Date(raw);
  return isNaN(d.getTime())?'':d.toISOString().slice(0,10);
}

function cleanMTCell(value){return String(value??'').replace(/\s+/g,' ').trim();}

function normalizeImportHeader(value){
  return cleanMTCell(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w%]+/g,'');
}
