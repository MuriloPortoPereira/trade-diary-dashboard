// Delimited text rows for the existing CSV import format.
globalThis.TradeDiaryDelimitedRows = (() => {
  function normalizeCSVRow(value){
    return String(value||'').trim().replace(/^"|"$/g,'');
  }

  function splitDelimitedRows(text){
    const lines=String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length);
    if(!lines.length)return[];
    const first=lines[0];
    const delimiter=first.includes(';')?';':first.includes('\t')?'\t':',';
    return lines.map(line=>line.split(delimiter).map(c=>normalizeCSVRow(c)));
  }

  return {normalizeCSVRow,splitDelimitedRows};
})();
