globalThis.TradeDiaryStudyHubPlan = function createStudyHubPlan(shAddLoad) {
// ══ GLOBALS ══
let cotacao = TradeDiaryStudyHubStorage.readPlanRate();
const ptCharts = {};
function ptMkChart(id,cfg){const cv=document.getElementById(id);if(!cv)return;if(ptCharts[id])ptCharts[id].destroy();ptCharts[id]=new Chart(cv,cfg);return ptCharts[id];}
const ptF2=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const ptFR=v=>'R$'+ptF2(v); const ptFU=v=>'$'+ptF2(v);
const ptBaseOpts={responsive:true,maintainAspectRatio:false,animation:{duration:200},
  plugins:{legend:{labels:{color:'var(--muted)',font:{family:'JetBrains Mono',size:9}}}},
  scales:{x:{ticks:{color:'var(--dim)',font:{size:8},maxTicksLimit:12},grid:{color:'rgba(30,45,61,.4)'}},
          y:{ticks:{color:'var(--dim)',font:{size:8}},grid:{color:'rgba(30,45,61,.4)'}}}};

// ══ COTAÇÃO ══
function ptSetCot(v){cotacao=v;TradeDiaryStudyHubStorage.writePlanRate(v);document.getElementById('cotDisp').textContent='USD/BRL: '+cotacao.toFixed(2);document.getElementById('plCot').value=cotacao.toFixed(2);calcCiclos();}
async function ptFetchCot(){try{const r=await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');const d=await r.json();const v=parseFloat(d.USDBRL.bid);document.getElementById('cotInput').value=v.toFixed(2);ptSetCot(v);}catch(e){document.getElementById('cotDisp').textContent='USD/BRL: '+cotacao.toFixed(2)+' (offline)';}}

// ══ CICLOS ══
let ciclosRows=[{nome:'Ciclo 1',capInicio:1000,gains:200,rrr:1},{nome:'Ciclo 2',capInicio:4500,gains:200,rrr:1},{nome:'Ciclo 3',capInicio:32500,gains:200,rrr:0.618},{nome:'Ciclo 4',capInicio:87600,gains:200,rrr:0.618}];

function getCicloParams(idx){
  const riscoIni=parseFloat(document.getElementById('cicRisco').value)||1;
  const redRisco=parseFloat(document.getElementById('cicRedRisco').value)||0;
  const intRisco=parseInt(document.getElementById('cicIntRisco').value)||1;
  const rrrIni=parseFloat(document.getElementById('cicRRR').value)||1;
  const deltaRRR=parseFloat(document.getElementById('cicDeltaRRR').value)||0;
  const intRRR=parseInt(document.getElementById('cicIntRRR').value)||1;
  const nops=parseInt(document.getElementById('cicNOps').value)||200;
  const risco=Math.max(0.01, riscoIni - Math.floor(idx/intRisco)*redRisco);
  const rrr=deltaRRR===0?rrrIni:Math.max(0.1, rrrIni + Math.floor(idx/intRRR)*deltaRRR);
  return {risco, rrr, nops};
}

function calcCapFinal(cap,risco,rrr,n){return TradeDiaryStudyHubCalculations.calcCapFinal(cap,risco,rrr,n);}

function addCiclo(){const last=ciclosRows[ciclosRows.length-1];ciclosRows.push({nome:'Ciclo '+(ciclosRows.length+1),capInicio:last?last.capInicio:1000,gains:200,rrr:1});renderCiclos();}
function removeCiclo(i){ciclosRows.splice(i,1);renderCiclos();}
function calcCiclos(){if(ciclosRows.length>0)ciclosRows[0].capInicio=parseFloat(document.getElementById('cicCap').value)||1000;renderCiclos();}

function renderCiclos(){
  const co=cotacao;
  const tb=document.getElementById('ciclosTbody');
  const labels=[],dataUSD=[];
  // Propaga capital final de cada ciclo para o próximo automaticamente
  for(let i=1;i<ciclosRows.length;i++){
    const prev=ciclosRows[i-1];
    const {risco,rrr,nops}=getCicloParams(i-1);
    ciclosRows[i].capInicio=calcCapFinal(prev.capInicio,risco,rrr,nops);
  }
  tb.innerHTML=ciclosRows.map((c,i)=>{
    const {risco,rrr,nops}=getCicloParams(i);
    const capF=calcCapFinal(c.capInicio,risco,rrr,nops);
    const ganhoUSD=capF-c.capInicio;
    const ganhoR=ganhoUSD*co;
    const ganhoPerOp=c.capInicio*(risco/100)*rrr;
    labels.push(c.nome);dataUSD.push(ganhoUSD);
    return `<tr>
      <td class="al" style="color:var(--text);font-weight:600">${c.nome}</td>
      <td><input type="number" value="${c.capInicio.toFixed(2)}" step="1" ${i===0?`oninput="ciclosRows[0].capInicio=+this.value;document.getElementById('cicCap').value=this.value;renderCiclos()"`:'readonly'} style="width:85px;background:${i===0?'var(--bg3)':'transparent'};border:${i===0?'1px solid var(--border2)':'none'};border-radius:4px;color:${i===0?'var(--text)':'var(--muted)'};font-family:'JetBrains Mono',monospace;font-size:11px;padding:3px 6px;text-align:right"></td>
      <td class="cy">${risco.toFixed(2)}%</td>
      <td class="cb">${rrr.toFixed(3)}</td>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)">${nops}</span></td>
      <td class="cg">${ptFU(capF)}</td>
      <td style="color:var(--muted)">+${ptFU(ganhoPerOp)}</td>
      <td class="cg">+${ptFU(ganhoUSD)}</td>
      <td class="${ganhoR>=0?'cg':'cr'}">${ptFR(ganhoR)}</td>
      <td><button class="btn danger" onclick="removeCiclo(${i})" style="padding:2px 7px">✕</button></td>
    </tr>`;
  }).join('');
  ptMkChart('ciclosChart',{type:'bar',data:{labels,datasets:[{label:'Ganho ($)',data:dataUSD,backgroundColor:dataUSD.map(v=>v>=0?'rgba(63,185,80,.5)':'rgba(248,81,73,.5)'),borderColor:dataUSD.map(v=>v>=0?'rgba(63,185,80,.8)':'rgba(248,81,73,.8)'),borderWidth:1,borderRadius:4}]},options:{...ptBaseOpts,plugins:{...ptBaseOpts.plugins,legend:{display:false},tooltip:{callbacks:{label:ctx=>{const u=ctx.parsed.y;return[`Ganho: $${ptF2(u)}`,`Em R$: R$${ptF2(u*cotacao)}`];}}}}}});

  TradeDiaryStudyHubStorage.writeCycles(ciclosRows);
}

// ══ PARCIAIS ══
const PARC_REF=[
  {d:'100% @ 0.618',p:[100,0,0],r:[0.618,1,1]},{d:'75/25 @ 0.618+1',p:[75,25,0],r:[0.618,1,1]},
  {d:'50/50 @ 0.618+1',p:[50,50,0],r:[0.618,1,1]},{d:'50/50 @ 1+1.141',p:[50,50,0],r:[1,1.141,1]},
  {d:'50/25/25 @ 0.618+1+1.141',p:[50,25,25],r:[0.618,1,1.141]},{d:'25/50/25 @ 0.618+1+1.141',p:[25,50,25],r:[0.618,1,1.141]},
  {d:'25/25/50 @ 0.618+1+1.141',p:[25,25,50],r:[0.618,1,1.141]},{d:'50/25/25 @ 0.618+1+1.618',p:[50,25,25],r:[0.618,1,1.618]},
  {d:'25/50/25 @ 0.618+1+1.618',p:[25,50,25],r:[0.618,1,1.618]},{d:'25/25/50 @ 0.618+1+1.618',p:[25,25,50],r:[0.618,1,1.618]},
  {d:'50/25/25 @ 1+1.141+1.618',p:[50,25,25],r:[1,1.141,1.618]},{d:'25/50/25 @ 1+1.141+1.618',p:[25,50,25],r:[1,1.141,1.618]},
  {d:'25/25/50 @ 1+1.141+1.618',p:[25,25,50],r:[1,1.141,1.618]},
];
function calcParcMedia(p,r){return TradeDiaryStudyHubCalculations.calcParcMedia(p,r);}
function calcParciais(){
  const p1=+document.getElementById('p1p').value||0,r1=+document.getElementById('p1r').value||0;
  const p2=+document.getElementById('p2p').value||0,r2=+document.getElementById('p2r').value||0;
  const p3=+document.getElementById('p3p').value||0,r3=+document.getElementById('p3r').value||0;
  const soma=p1+p2+p3,rrr=calcParcMedia([p1,p2,p3],[r1,r2,r3]),exc=soma-100;
  document.getElementById('pRRR').textContent='~'+rrr.toFixed(3)+'R';
  const se=document.getElementById('pSoma');se.textContent=soma+'%';se.style.color=Math.abs(exc)<0.5?'var(--green)':'var(--red)';
  const ee=document.getElementById('pExc');ee.style.color=Math.abs(exc)<0.5?'var(--green)':exc>0?'var(--red)':'var(--yellow)';
  ee.textContent=exc>0.5?'+'+exc.toFixed(1)+'% excede':exc<-0.5?exc.toFixed(1)+'% faltam':'✓ ok';
  document.getElementById('parcRefTbody').innerHTML=PARC_REF.map(ref=>{const rv=calcParcMedia(ref.p,ref.r);const cl=Math.abs(rv-rrr)<0.02;return`<tr class="${cl?'parc-row active':'parc-row'}"><td class="al" style="font-size:10px">${ref.d}</td><td class="${rv>=1?'cg':rv>=0.618?'cy':'cr'}">~${rv.toFixed(3)}R</td></tr>`;}).join('');
}

// ══ SIMULAÇÃO BR ══
const BR_MULT={WDO:10,WIN:0.2};
function calcBR(){
  const mercado=document.getElementById('brMercado').value;
  const mult=BR_MULT[mercado];
  const stop=parseFloat(document.getElementById('brStop').value)||12;
  const total=parseInt(document.getElementById('brContratos').value)||3;
  const cts=[+document.getElementById('brA1').value,+document.getElementById('brA2').value,+document.getElementById('brA3').value,+document.getElementById('brA4').value];
  const mults=[0.618,1,1.618,2];
  const labels=['Alvo 1 (61,8%)','Alvo 2 (100%)','Alvo 3 (161,8%)','Alvo 4 (200%)'];
  // Stop em R$ por contrato = stop_pts × mult
  const stopR = stop * mult;
  const stopTotal = stopR * total;
  let lucroTotal=0,totalCtt=0;
  document.getElementById('brAlvosTbody').innerHTML=mults.map((m,i)=>{
    const pts=stop*m;
    const lucroC=pts*mult;
    const lucroA=lucroC*cts[i];
    lucroTotal+=lucroA;totalCtt+=cts[i];
    const pct=total>0?(cts[i]/total*100).toFixed(0)+'%':'—';
    return`<tr><td class="al">${labels[i]}</td><td class="cm">${m}</td><td>${pts.toFixed(3)}</td><td class="cr">${ptFR(stopR)}</td><td class="cg">${ptFR(lucroC)}</td><td>${cts[i]}</td><td class="cg">${ptFR(lucroA)}</td><td class="cm">${pct}</td></tr>`;
  }).join('');
  document.getElementById('brStopTotal').textContent=ptFR(stopTotal);
  document.getElementById('brLucroTotal').textContent=ptFR(lucroTotal);
  document.getElementById('brLucroMedio').textContent=total>0?ptFR(lucroTotal/total):'—';
  const ok=totalCtt===total;
  document.getElementById('brStatus').textContent=ok?'✅ OK':'❌ '+totalCtt+'/'+total+' contratos alocados';
  document.getElementById('brStatus').style.color=ok?'var(--green)':'var(--red)';
}

// ══ RECUPERAÇÃO ══
const RECOV_STEPS=[0.5,1,2,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95];
function calcRecov(){
  const cap=parseFloat(document.getElementById('recovCap').value)||1000;
  document.getElementById('recovTbody').innerHTML=RECOV_STEPS.map(p=>{
    const saldo=cap*(1-p/100),perda=cap-saldo,ganho=(cap/saldo-1)*100;
    const cls=p<=10?'cg':p<=30?'cy':'cr';
    return`<tr><td class="${cls} al">${p}%</td><td>${ptFU(saldo)}</td><td class="${cls}">-${ptFU(perda)}</td><td class="${cls}">${ganho.toFixed(2)}%</td></tr>`;
  }).join('');
}

// ══ METAS ══
function calcMetas(){
  const cap=parseFloat(document.getElementById('mCapUSD').value)||1000;
  const risco=parseFloat(document.getElementById('mRisco').value)||1;
  const rrr=parseFloat(document.getElementById('mRRR').value)||1.141;
  const meta=parseFloat(document.getElementById('mMeta').value)||1000;
  const riscoU=cap*(risco/100),lucroU=riscoU*rrr;
  document.getElementById('mRiscoU').textContent=ptFU(riscoU);
  document.getElementById('mLucroU').textContent=ptFU(lucroU);
  const acTot=lucroU>0?Math.ceil(meta/lucroU):0;
  document.getElementById('metasTbody').innerHTML=[1,2,3,4].map(m=>{
    const dias=22*m,acP=acTot/m;
    return`<tr><td>${m} mês${m>1?'es':''}</td><td>${dias}</td><td class="cb">${acP.toFixed(0)}</td><td class="cy">${(acP/4).toFixed(1)}</td><td class="cm">${(acP/22).toFixed(2)}</td></tr>`;
  }).join('');
}

// ══ LOSSES ══
function calcLosses(){
  const wr=parseFloat(document.getElementById('wrSlider').value)/100,N=100,lr=1-wr;
  const labels=[],vals=[];let rows='';
  for(let x=1;x<=10;x++){
    const p=1-Math.pow(1-Math.pow(lr,x),N-x+1),pct=(p*100).toFixed(1);
    const bar='█'.repeat(Math.round(p*20))+'░'.repeat(20-Math.round(p*20));
    const cls=p>0.5?'cr':p>0.2?'cy':'cg';
    rows+=`<tr><td class="cm">${x} seguidos</td><td class="${cls}">${pct}%</td><td style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--${p>0.5?'red':p>0.2?'yellow':'green'})">${bar}</td></tr>`;
    labels.push(x+' consec.');vals.push(parseFloat(pct));
  }
  document.getElementById('lossTbody').innerHTML=rows;
  ptMkChart('lossChart',{type:'line',data:{labels,datasets:[{label:'P(%)',data:vals,borderColor:'rgba(99,169,255,.9)',backgroundColor:'rgba(99,169,255,.1)',fill:true,tension:0.3,pointBackgroundColor:'rgba(99,169,255,.9)',pointRadius:3}]},options:{...ptBaseOpts,scales:{x:{ticks:{color:'var(--dim)',font:{size:8}},grid:{color:'rgba(30,45,61,.4)'}},y:{min:0,max:100,ticks:{color:'var(--dim)',font:{size:8},callback:v=>v+'%'},grid:{color:'rgba(30,45,61,.4)'}}}}});
}

// ══ HEATMAP ══
function buildHeatmap(){
  const wrs=[20,25,30,35,40,45,50,55,60,65,70,75,80],rrrs=[0.5,0.75,1.0,1.141,1.25,1.5,1.618,2.0,2.5,3.0];
  const tbl=document.getElementById('heatTbl');
  let h='<thead><tr><th style="text-align:center">WR\\RRR</th>'+rrrs.map(r=>`<th style="text-align:center">${r}</th>`).join('')+'</tr></thead><tbody>';
  wrs.forEach(wr=>{
    h+=`<tr><th style="font-weight:700;color:var(--muted);font-size:9px;text-align:center;padding:5px 6px">${wr}%</th>`;
    rrrs.forEach(rrr=>{const exp=(wr/100)*rrr-(1-wr/100),be=Math.abs(exp)<0.015;const cls=be?'hm-be':exp>0?'hm-pos':'hm-neg';h+=`<td class="${cls}" style="padding:5px 4px;text-align:center">${exp>=0?'+':''}${exp.toFixed(2)}</td>`;});
    h+='</tr>';
  });
  tbl.innerHTML=h+'</tbody>';
}

// ══ DD ══
let ddHist=[];
function clearDDHist(){ddHist=[];renderDDHist();}
function renderDDHist(){
  if(ddHist.length<2){document.getElementById('ddHistBox').style.display='none';return;}
  document.getElementById('ddHistBox').style.display='block';
  document.getElementById('ddHistCount').textContent=ddHist.length;
  const meds=ddHist.map(h=>h.med);
  const avg=Math.round(meds.reduce((a,b)=>a+b,0)/meds.length),mn=Math.min(...meds),mx=Math.max(...meds);
  document.getElementById('ddHistChips').innerHTML=[['Média',avg,'blue'],['Mínimo',mn,'green'],['Máximo',mx,'red']].map(([l,v,c])=>`<div style="background:var(--bg3);border:1px solid var(--border2);border-radius:5px;padding:3px 10px;font-family:'JetBrains Mono',monospace;font-size:10px;display:flex;gap:5px;align-items:center"><span style="color:var(--muted)">${l}</span><span style="color:var(--${c});font-weight:700">${v} trades</span></div>`).join('');
}
function calcDDModo(){
  const m=document.getElementById('ddModo').value;
  document.getElementById('ddInputsAlvo').style.display=m==='alvo'?'grid':'none';
  document.getElementById('ddInputsPct').style.display=m==='pct'?'block':'none';
  document.getElementById('ddInputsUSD').style.display=m==='usd'?'block':'none';
}
function calcDDFromPct(){
  const cap=parseFloat(document.getElementById('ddCapOrig').value)||1000;
  const pct=parseFloat(document.getElementById('ddPerdaPct').value)||0;
  const atual=cap*(1-pct/100);
  document.getElementById('ddAtual').value=atual.toFixed(2);
  document.getElementById('ddAlvo').value=cap.toFixed(2);
  calcDD();
}
function calcDDFromUSD(){
  const cap=parseFloat(document.getElementById('ddCapOrig2').value)||1000;
  const perdaU=parseFloat(document.getElementById('ddPerdaUSD').value)||0;
  const atual=cap-perdaU;
  document.getElementById('ddAtual').value=atual.toFixed(2);
  document.getElementById('ddAlvo').value=cap.toFixed(2);
  calcDD();
}
function calcDD(){
  const atual=parseFloat(document.getElementById('ddAtual').value)||700;
  const alvo=parseFloat(document.getElementById('ddAlvo').value)||1000;
  const wr=parseFloat(document.getElementById('ddWR').value)/100;
  const rrr=parseFloat(document.getElementById('ddRRR').value)||1.141;
  const risco=parseFloat(document.getElementById('ddRisco').value)/100;
  const ddPct=((alvo-atual)/alvo*100).toFixed(1);
  document.getElementById('ddPctOut').textContent='-'+ddPct+'%';
  if(atual>=alvo){document.getElementById('ddMedOut').textContent='0';document.getElementById('ddRangeOut').textContent='Já atingiu';return;}
  const SIMS=5000,MAX=10000,counts=[];
  for(let s=0;s<SIMS;s++){let bal=atual,n=0;while(bal<alvo&&n<MAX){const g=Math.random()<wr?bal*risco*rrr:-bal*risco;bal=Math.max(0,bal+g);n++;if(bal<=0)break;}counts.push(n);}
  counts.sort((a,b)=>a-b);
  const med=counts[Math.floor(SIMS/2)],p10=counts[Math.floor(SIMS*.1)],p90=counts[Math.floor(SIMS*.9)];
  document.getElementById('ddMedOut').textContent=med+' trades';
  document.getElementById('ddRangeOut').textContent=p10+' — '+p90+' trades';
  ddHist.push({med,p10,p90});renderDDHist();
  let bal2=atual;const sl=[atual];
  for(let i=0;i<Math.min(med*3,500);i++){const fr=Math.round(1/wr);const g=(i%fr===0)?bal2*risco*rrr:-bal2*risco;bal2=Math.max(0,bal2+g);sl.push(bal2);if(bal2>=alvo)break;}
  const histDs=ddHist.length>1?[{label:'Tendência',data:Array(sl.length).fill(null).map((_,i)=>atual+(alvo-atual)*(i/(sl.length-1))),borderColor:'rgba(188,140,255,.5)',borderDash:[3,3],borderWidth:1,pointRadius:0,fill:false}]:[];
  ptMkChart('ddChart',{type:'line',data:{labels:sl.map((_,i)=>i===0?'Início':i),datasets:[{label:'Simulação ($)',data:sl,borderColor:'rgba(99,169,255,.9)',backgroundColor:'rgba(99,169,255,.07)',fill:true,tension:0.2,pointRadius:0,borderWidth:1.5},{label:'Alvo',data:Array(sl.length).fill(alvo),borderColor:'rgba(63,185,80,.5)',borderDash:[4,3],borderWidth:1,pointRadius:0,fill:false},{label:'Atual',data:Array(sl.length).fill(atual),borderColor:'rgba(248,81,73,.4)',borderDash:[3,3],borderWidth:1,pointRadius:0,fill:false},...histDs]},options:{...ptBaseOpts,scales:{x:{ticks:{color:'var(--dim)',font:{size:8},maxTicksLimit:10},grid:{color:'rgba(30,45,61,.3)'}},y:{ticks:{color:'var(--dim)',font:{size:8}},grid:{color:'rgba(30,45,61,.3)'}}}}});
}

// ══ PLANILHA ══
function renderPlanilha(){
  const cap=parseFloat(document.getElementById('plCap').value)||1000;
  const risco=parseFloat(document.getElementById('plRisco').value)/100||0.01;
  const rrr=parseFloat(document.getElementById('plRRR').value)||1.141;
  const co=parseFloat(document.getElementById('plCot').value)||cotacao;
  const N=200;const tb=document.getElementById('planilhaTbody');
  let rows='',s=cap;const chartData=[cap];
  rows+=`<tr><td class="al cm">Início</td><td>${ptFU(s)}</td><td class="cm">—</td><td class="cm">—</td><td class="cm">—</td><td class="cm">${ptFR(s*co)}</td></tr>`;
  for(let i=1;i<=N;i++){const prev=s,diff=prev*risco*rrr;s=prev+diff;chartData.push(s);rows+=`<tr><td class="al cm">${i}</td><td class="cg">${ptFU(s)}</td><td class="cg">+${ptFU(diff)}</td><td class="cg">+1</td><td class="cg">+${ptFR(diff*co)}</td><td class="cb">${ptFR(s*co)}</td></tr>`;}
  tb.innerHTML=rows;
  const labels=['Início',...Array.from({length:N},(_,i)=>i+1)];
  ptMkChart('planilhaChart',{type:'line',data:{labels,datasets:[{label:'Capital ($)',data:chartData,borderColor:'rgba(99,169,255,.9)',backgroundColor:'rgba(99,169,255,.07)',fill:true,tension:0.2,pointRadius:0,borderWidth:1.5}]},options:{...ptBaseOpts,scales:{x:{ticks:{color:'var(--dim)',font:{size:8},maxTicksLimit:15},grid:{color:'rgba(30,45,61,.3)'}},y:{ticks:{color:'var(--dim)',font:{size:8},callback:v=>'$'+v.toLocaleString('pt-BR')},grid:{color:'rgba(30,45,61,.3)'}}}}});
}

// ══ DIÁRIO ══
function loadDiary(){return TradeDiaryStudyHubStorage.readDiary();}
function saveDiary(d){TradeDiaryStudyHubStorage.writeDiary(d);}
function renderDiary(){
  const diaryTbody = document.getElementById('diaryTbody');
  if (!diaryTbody) return;
  diaryTbody.innerHTML=loadDiary().map((r,i)=>`<tr><td><input type="date" value="${r.data}" oninput="updateD(${i},'data',this.value)" style="width:108px"></td><td><input type="number" value="${r.ciclo}" oninput="updateD(${i},'ciclo',+this.value)" style="width:40px"></td><td><input type="number" value="${r.bU}" step="0.01" oninput="updateD(${i},'bU',+this.value)" style="width:70px"></td><td class="cm" style="font-size:10px">${ptFR(r.bU*cotacao)}</td><td><input type="number" value="${r.risco}" step="0.1" oninput="updateD(${i},'risco',+this.value)" style="width:45px"></td><td><input type="number" value="${r.rrr}" step="0.001" oninput="updateD(${i},'rrr',+this.value)" style="width:52px"></td><td><select onchange="updateD(${i},'res',this.value)" style="width:52px;padding:4px"><option ${r.res==='W'?'selected':''}>W</option><option ${r.res==='L'?'selected':''}>L</option></select></td><td><input class="al" value="${r.obs||''}" oninput="updateD(${i},'obs',this.value)" style="width:100%"></td><td><button class="btn danger" onclick="deleteD(${i})" style="padding:2px 6px">✕</button></td></tr>`).join('');
}
function addDiary(){const d=loadDiary();d.push({data:new Date().toISOString().split('T')[0],ciclo:1,bU:1000,risco:1,rrr:1.141,res:'W',obs:''});saveDiary(d);renderDiary();}
function updateD(i,k,v){const d=loadDiary();d[i][k]=v;saveDiary(d);}
function deleteD(i){const d=loadDiary();d.splice(i,1);saveDiary(d);renderDiary();}
function exportDiary(){const d=loadDiary();if(!d.length)return;const hdr='Data,Ciclo,Banca USD,Risco%,RRR,Resultado,Observação';const rows=d.map(r=>[r.data,r.ciclo,r.bU,r.risco,r.rrr,r.res,'"'+(r.obs||'')+'"'].join(','));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([[hdr,...rows].join('\n')],{type:'text/csv'}));a.download='diario_trade_2026.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);}
function importDiary(e){const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=ev=>{const lines=ev.target.result.split('\n').slice(1).filter(l=>l.trim());const d=lines.map(l=>{const c=l.split(',');return{data:c[0],ciclo:+c[1],bU:+c[2],risco:+c[3],rrr:+c[4],res:c[5],obs:(c[6]||'').replace(/"/g,'')};});saveDiary(d);renderDiary();};rd.readAsText(f);}

// ══ ABA 2 LOSS ══
function gerarContinuo(cap,risco,n){return TradeDiaryStudyHubCalculations.gerarContinuo(cap,risco,n);}
function gerarAlternado(cap,risco,rrr,n){return TradeDiaryStudyHubCalculations.gerarAlternado(cap,risco,rrr,n);}
function renderSimTable(id,trades,cap){document.getElementById(id).innerHTML=trades.map(t=>{const pct=((t.saldo-cap)/cap*100).toFixed(1),dd=((cap-t.saldo)/cap*100).toFixed(1),cls=t.res==='W'?'sw':'sl',rc=t.res==='W'?'row-ws':'row-ls';return`<tr class="${rc}"><td class="cm">${t.n}</td><td class="${cls}">${t.res}</td><td class="${t.pnl>=0?'cg':'cr'}">${t.pnl>=0?'+':''}${ptFR(t.pnl)}</td><td>${ptFR(t.saldo)}</td><td class="cm">${id==='cTbody'?'-'+dd+'%':(pct>=0?'+':'')+pct+'%'}</td></tr>`}).join('');}
function renderSimLine(id,trades,cap){const labels=['Início',...trades.map(t=>t.n)],data=[cap,...trades.map(t=>t.saldo)];ptMkChart(id,{type:'line',data:{labels,datasets:[{label:'Saldo (R$)',data,borderColor:'rgba(99,169,255,.9)',backgroundColor:'rgba(99,169,255,.07)',fill:true,tension:0.1,pointRadius:0,borderWidth:1.5},{label:'Capital Inicial',data:Array(data.length).fill(cap),borderColor:'rgba(107,125,143,.35)',borderDash:[4,3],borderWidth:1,pointRadius:0,fill:false}]},options:{...ptBaseOpts,scales:{x:{ticks:{color:'var(--dim)',font:{size:8},maxTicksLimit:12},grid:{color:'rgba(30,45,61,.3)'}},y:{ticks:{color:'var(--dim)',font:{size:8},callback:v=>'R$'+v.toLocaleString('pt-BR')},grid:{color:'rgba(30,45,61,.3)'}}}}});}
function runSim(){
  const cap=parseFloat(document.getElementById('sCap').value)||5000;
  const risco=parseFloat(document.getElementById('sRisco').value)/100||0.02;
  const rrr=parseFloat(document.getElementById('sRRR').value)||1;
  const n=parseInt(document.getElementById('sN').value)||100;
  const tC=gerarContinuo(cap,risco,n),tA=gerarAlternado(cap,risco,rrr,n);
  const cFinal=tC[tC.length-1].saldo,cDD=((cap-cFinal)/cap*100).toFixed(1);
  document.getElementById('cFinal').textContent=ptFR(cFinal);document.getElementById('cFinal').style.color=cFinal>=cap?'var(--green)':'var(--red)';
  document.getElementById('cDD').textContent='-'+cDD+'%';
  const aFinal=tA[tA.length-1].saldo,aMin=Math.min(...tA.map(t=>t.saldo)),aDD=((cap-aMin)/cap*100).toFixed(1);
  document.getElementById('aFinal').textContent=ptFR(aFinal);document.getElementById('aFinal').style.color=aFinal>=cap?'var(--green)':'var(--red)';
  document.getElementById('aRet').textContent='-'+aDD+'%';
  renderSimTable('cTbody',tC,cap);renderSimTable('aTbody',tA,cap);
  renderSimLine('cChart',tC,cap);renderSimLine('aChart',tA,cap);
}

// ══ DT CALC ══
const DT_CFG={sp:{mult:50,br:false},nq:{mult:20,br:false},cl:{mult:1000,br:false},wd:{mult:10,br:true},wi:{mult:0.2,br:true}};
function calcDT(k){
  const qtd=parseFloat(document.getElementById(k+'Qtd').value)||1;
  const entrada=parseFloat(document.getElementById(k+'Entrada').value)||0;
  const stop=parseFloat(document.getElementById(k+'Stop').value)||0;
  const alvo=parseFloat(document.getElementById(k+'Alvo').value)||0;
  const m=DT_CFG[k].mult;
  // Risco  = |entrada - stop| × mult × qtd  (sempre positivo)
  // Lucro  = |alvo - entrada| × mult × qtd  (sempre positivo)
  const risco = Math.abs(entrada - stop) * m * qtd;
  const lucro = Math.abs(alvo - entrada) * m * qtd;
  const fmt=DT_CFG[k].br?ptFR:ptFU;
  document.getElementById(k+'Risco').textContent = fmt(risco);
  document.getElementById(k+'Lucro').textContent = fmt(lucro);
  const rrrEl = document.getElementById(k+'RRRout');
  if(rrrEl) rrrEl.textContent = risco>0 ? (lucro/risco).toFixed(2)+'R' : '—';
}
function calcDTVol(k){
  const ult=parseFloat(document.getElementById(k+'Ult').value)||0;
  const volPct=parseFloat(document.getElementById(k+'VolPct').value)/100||0;
  const qtd=parseFloat(document.getElementById(k+'VolQtd').value)||1;
  const m=DT_CFG[k].mult;
  const volPts=ult*volPct;          // vol histórica em pontos
  const vol20=volPts*0.2;           // 20% da vol = movimento esperado do pivô
  const riscoLote=vol20*m;          // risco por lote = 20%vol × mult
  const riscoTot=riscoLote*qtd;     // risco total = risco/lote × qtd contratos
  const fmt=DT_CFG[k].br?ptFR:ptFU;
  document.getElementById(k+'VolPts').textContent=volPts.toFixed(2);
  document.getElementById(k+'Vol20').textContent=vol20.toFixed(2);
  document.getElementById(k+'RiscoLote').textContent=fmt(riscoLote);
  document.getElementById(k+'RiscoTot').textContent=fmt(riscoTot);

  // ── Alimentar automaticamente os inputs do Gerenciamento de Risco ──
  // WIN (wi) → winVolStop;  DOL (wd) → dolVolStop
  if(k==='wi'){
    document.getElementById('winVolStop').value=riscoLote.toFixed(2);
    calcGerRisco();
  }
  if(k==='wd'){
    document.getElementById('dolVolStop').value=riscoLote.toFixed(2);
    calcGerRisco();
  }
}

// ══ CÁLCULO DE AÇÕES — isolado ══
function calcAcoes(){
  const risco = parseFloat(document.getElementById('acRisco').value) || 250;
  const dif   = parseFloat(document.getElementById('acDif').value)   || 0.45;
  document.getElementById('acQtd').textContent = (risco / dif).toFixed(0);
}

// ══ GERENCIAMENTO WIN/WDO — independente do bloco de Ações ══
function calcGerRisco(){
  // Volatilidade — Máx Risco/Trade (preenchido pelo vol-strip ou manualmente)
  const wVol = parseFloat(document.getElementById('winVolStop').value) || 0;
  const dVol = parseFloat(document.getElementById('dolVolStop').value) || 0;
  document.getElementById('winMRT').textContent = ptFR(wVol);
  document.getElementById('winDia').textContent = ptFR(wVol * 3);
  document.getElementById('winSem').textContent = ptFR(wVol * 6);
  document.getElementById('winMes').textContent = ptFR(wVol * 12);
  document.getElementById('dolMRT').textContent = ptFR(dVol);
  document.getElementById('dolDia').textContent = ptFR(dVol * 3);
  document.getElementById('dolSem').textContent = ptFR(dVol * 6);
  document.getElementById('dolMes').textContent = ptFR(dVol * 12);

  // Por Pontos — cada linha tem seu próprio risco de referência
  const winRiscoRef = parseFloat(document.getElementById('winRiscoRef').value) || 250;
  const dolRiscoRef = parseFloat(document.getElementById('dolRiscoRef').value) || 250;
  const winPts = parseFloat(document.getElementById('winPts').value) || 150;
  const dolPts = parseFloat(document.getElementById('dolPts').value) || 10;
  const winPPt = winPts * 0.2;   // WIN: ponto = R$0,20
  const dolPPt = dolPts * 10;    // DOL: ponto = R$10
  document.getElementById('winPorPto').textContent = ptFR(winPPt);
  document.getElementById('winNctt').textContent   = (winRiscoRef / winPPt).toFixed(2);
  document.getElementById('dolPorPto').textContent = ptFR(dolPPt);
  document.getElementById('dolNctt').textContent   = (dolRiscoRef / dolPPt).toFixed(2);

}

// Botão ▶ Atualizar chama ambos
function calcAcoesFull(){ calcAcoes(); calcGerRisco(); }

// ══ TABS ══
function ptTab(i){
  const scope = document.getElementById('pt-app') || document;
  scope.querySelectorAll('.tab-btn').forEach((b,j)=>b.classList.toggle('active',j===i));
  scope.querySelectorAll('.tab-panel').forEach((p,j)=>p.classList.toggle('active',j===i));
}

// ══ INIT ══
shAddLoad(()=>{
  document.getElementById('cotInput').value=cotacao.toFixed(2);
  document.getElementById('cotDisp').textContent='USD/BRL: '+cotacao.toFixed(2);
  document.getElementById('plCot').value=cotacao.toFixed(2);
  const savedCiclos = TradeDiaryStudyHubStorage.readCycles();
  if(savedCiclos){try{ciclosRows=JSON.parse(savedCiclos);}catch(e){}}
  calcCiclos();calcParciais();calcBR();calcRecov();calcMetas();calcLosses();buildHeatmap();renderPlanilha();renderDiary();
  // inicializar Loss com defaults
  runSim();
  // DT
  ['sp','nq','cl','wd','wi'].forEach(k=>{calcDT(k);calcDTVol(k);});
  calcAcoes(); calcGerRisco();
  ptFetchCot();
});

return {ptSetCot, ptTab, addCiclo, calcCiclos, calcParciais, calcBR, calcMetas, calcRecov, calcLosses, calcDD, clearDDHist, calcDDModo, calcDDFromPct, calcDDFromUSD, renderPlanilha, runSim, calcDT, calcDTVol, calcAcoesFull, calcAcoes, calcGerRisco};
};
