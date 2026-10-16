// Legacy tabular format adapters; live trades, IDs, clock and normalizers remain supplied by app.js.
function parseMT5Rows(rows,filename){
  const existingIds=new Set(trades.map(t=>t.positionId).filter(Boolean));
  const result=[];
  const mappings=[
    {kind:'mt5-position',time:0,id:1,symbol:2,type:3,volume:4,entry:5,sl:6,tp:7,exitTime:8,exit:9,commission:10,swap:11,pnl:12},
    {kind:'mt5-position-html',time:0,id:1,symbol:2,type:3,dealDir:4,volume:5,entry:6,sl:7,tp:8,exitTime:9,exit:10,commission:11,swap:12,pnl:13},
    {kind:'mt4-statement',time:0,id:1,type:2,volume:3,symbol:4,entry:5,sl:6,tp:7,exitTime:8,exit:9,commission:10,tax:11,swap:12,pnl:13},
  ];
  const parseRow=(r,map)=>{
    if(!r||r.length<10)return null;
    const posId=cleanMTCell(r[map.id]);
    if(!/^\d+$/.test(posId))return null;
    const tipo=cleanMTCell(r[map.type]).toLowerCase();
    if(tipo!=='buy'&&tipo!=='sell')return null;
    const dealDir=map.dealDir!=null?cleanMTCell(r[map.dealDir]).toLowerCase():'';
    if(dealDir==='in'||dealDir==='out'||dealDir==='in/out')return null;
    const volRaw=cleanMTCell(r[map.volume]);
    if(!volRaw||volRaw.includes('/'))return null;
    const vol=parseMTNumber(volRaw);
    if(!vol||vol<=0)return null;
    const en=parseMTNumber(r[map.entry]);
    const ex=parseMTNumber(r[map.exit]);
    if(!en||en<=0||!ex||ex<=0)return null;
    const sym=cleanMTCell(r[map.symbol]).toUpperCase().replace(/\s/g,'');
    if(!sym||sym==='BALANCE')return null;
    const slRaw=parseMTNumber(r[map.sl]),tpRaw=parseMTNumber(r[map.tp]);
    const sl=slRaw&&slRaw>0?slRaw:null,tp=tpRaw&&tpRaw>0?tpRaw:null;
    const pnl=parseMTNumber(r[map.pnl]);
    const pnlV=pnl==null?null:parseFloat(pnl.toFixed(2));
    const comm=parseMTNumber(r[map.commission])||0;
    const tax=map.tax!=null?(parseMTNumber(r[map.tax])||0):0;
    const swap=parseMTNumber(r[map.swap])||0;
    return{posId,tipo,vol,en,ex,sym,sl,tp,pnlV,fees:parseFloat((comm+tax+swap).toFixed(2)),time:r[map.time],exitTime:r[map.exitTime]};
  };
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    const parsed=mappings.map(m=>parseRow(r,m)).find(Boolean);
    if(!parsed||existingIds.has(parsed.posId))continue;
    const dir=parsed.tipo==='buy'?'Long':'Short';
    let rVal=null;
    if(parsed.sl&&Math.abs(parsed.en-parsed.sl)>0){const pts=Math.abs(parsed.en-parsed.sl);rVal=parseFloat(((dir==='Long'?parsed.ex-parsed.en:parsed.en-parsed.ex)/pts).toFixed(3));}
    const status=mtTradeStatus(parsed.pnlV);
    result.push({id:uid(),positionId:parsed.posId,symbol:parsed.sym,date:normalizeDate(parsed.time),
      exitDate:normalizeDate(parsed.exitTime),placedTime:'',openTime:normalizeClockTime(parsed.time),exitTime:normalizeClockTime(parsed.exitTime),
      market:getMarket(parsed.sym),direction:dir,entry:parsed.en,stop:parsed.sl,tp:parsed.tp,exit:parsed.ex,qty:parsed.vol,mult:null,
      riskPct:null,riskUsd:null,r:rVal,pnl:parsed.pnlV,pnlPct:null,fees:parsed.fees,
      strategy:'',emoBefore:'',emotion:'',emoAfter:'',followedPlan:'',planDeviation:'',
      errors:[],discipline:null,confidence:null,mistake:'',remarks:'',images:[],hesitation:false,
      resultType:status==='OPEN'?'':status,status,mode:'absolute',
      incomplete:!parsed.sl,missing_fields:parsed.sl?[]:['stop'],
      createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    existingIds.add(parsed.posId);
  }
  return result;
}

function parseGenericTradeRows(rows,filename='csv'){
  if(!Array.isArray(rows)||!rows.length)return[];
  const aliases={
    date:['date','data','horario','hora','opentime','abertura','horariodaabertura'],
    exitDate:['exitdate','datasaida','closetime','fechamento'],
    placedTime:['placedtime','horariocolocado','horadecolocacao','horaordem','ordertime','horarioordem'],
    openTime:['opentime','horaentrada','horarioentrada','horarioacionado','horaacionada','horaacionou','entrytime'],
    exitTime:['exittime','horasaida','horariosaida','horafechamento','closetimeonly'],
    symbol:['symbol','simbolo','ativo','ticker','item','instrumento'],
    direction:['direction','direcao','dir','tipo','type','lado'],
    entry:['entry','entrada','precoentrada','openprice'],
    stop:['stop','sl','s/l','stoploss'],
    tp:['tp','takeprofit','alvo','target','t/p'],
    exit:['exit','saida','precosaida','closeprice','fechamento'],
    pnl:['pnl','profit','lucro','resultado','pl'],
    qty:['qty','qtd','quantidade','volume','size','lote'],
    fees:['fees','taxas','comissao','commission','custos'],
    strategy:['strategy','estrategia','setup'],
    emotion:['emotion','emocao'],
    market:['market','mercado'],
    ticket:['ticket','position','posicao','ordem','order'],
  };
  const findHeader=()=>{
    for(let i=0;i<Math.min(rows.length,20);i++){
      const norm=(rows[i]||[]).map(normalizeImportHeader);
      const hasSymbol=aliases.symbol.some(a=>norm.includes(a));
      const hasDate=aliases.date.some(a=>norm.includes(a));
      if(hasSymbol&&hasDate)return i;
    }
    return 0;
  };
  const headerIndex=findHeader();
  const headers=(rows[headerIndex]||[]).map(normalizeImportHeader);
  const idx=names=>names.map(n=>headers.indexOf(n)).find(i=>i>=0);
  const col={};
  Object.keys(aliases).forEach(k=>{col[k]=idx(aliases[k]);});
  if(col.symbol==null||col.date==null)return[];
  const get=(r,k)=>col[k]!=null?cleanMTCell(r[col[k]]):'';
  const result=[];
  for(let i=headerIndex+1;i<rows.length;i++){
    const r=rows[i]||[];
    const symbol=get(r,'symbol').toUpperCase().replace(/\s/g,'');
    const rawDate=get(r,'date');
    const rawExitDate=get(r,'exitDate');
    const date=normalizeDate(rawDate);
    if(!symbol||!date||symbol==='BALANCE')continue;
    const entry=parseMTNumber(get(r,'entry'));
    const stop=parseMTNumber(get(r,'stop'));
    const tp=parseMTNumber(get(r,'tp'));
    const exit=parseMTNumber(get(r,'exit'));
    const pnl=parseMTNumber(get(r,'pnl'));
    if(entry==null&&exit==null&&pnl==null)continue;
    const dirRaw=get(r,'direction').toLowerCase();
    const direction=/(sell|short|venda)/.test(dirRaw)?'Short':'Long';
    let rVal=null;
    if(entry!=null&&stop!=null&&exit!=null&&Math.abs(entry-stop)>0){
      const pts=Math.abs(entry-stop);
      rVal=parseFloat(((direction==='Long'?exit-entry:entry-exit)/pts).toFixed(3));
    }
    const pnlV=pnl==null?null:parseFloat(pnl.toFixed(2));
    const missing=[];if(entry==null)missing.push('entry');if(stop==null)missing.push('stop');
    const fees=parseMTNumber(get(r,'fees'))||0;
    const ticket=get(r,'ticket');
    result.push({id:uid(),positionId:ticket||undefined,symbol,date,exitDate:normalizeDate(rawExitDate),
      market:get(r,'market')||getMarket(symbol),direction,entry,stop,tp,exit,qty:parseMTNumber(get(r,'qty')),mult:null,
      riskPct:null,riskUsd:null,r:rVal,pnl:pnlV,pnlPct:null,fees,strategy:get(r,'strategy'),emotion:get(r,'emotion'),
      placedTime:normalizeClockTime(get(r,'placedTime')),
      openTime:normalizeClockTime(get(r,'openTime')||rawDate),
      exitTime:normalizeClockTime(get(r,'exitTime')||rawExitDate),
      emoBefore:'',emoAfter:'',followedPlan:'',planDeviation:'',errors:[],discipline:null,confidence:null,
      mistake:'',remarks:'',images:[],hesitation:false,resultType:pnlV==null?'':mtTradeStatus(pnlV),
      status:mtTradeStatus(pnlV),mode:'absolute',incomplete:missing.length>0,missing_fields:missing,
      createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  }
  return result;
}

function parseSpreadsheetRows(rows,filename='spreadsheet'){
  const mtRows=parseMT5Rows(rows,filename);
  return mtRows.length?mtRows:parseGenericTradeRows(rows,filename);
}

function parseMT4Raw(text){
  const rows=text.split('\n').map(l=>l.trim().split(/\t|,/).map(c=>c.replace(/^"|"$/g,'')));
  return parseMT5Rows(rows,'text');
}
