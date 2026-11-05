globalThis.TradeDiaryStudyHubMental = function createStudyHubMental(shAddLoad) {
// ── CONFIG ───────────────────────────────────────────────────────────────────
const BLOCOS=[
  {id:1,nome:'Bloco 1 — Ultra-Baixo',   desc:'Conta pequena',         badge:'bb1',cor:'#63a9ff',taxas:[.0025,.005,.01,.02,.03,.0425]},
  {id:2,nome:'Bloco 2 — Baixo-Moderado',desc:'Faixa profissional',    badge:'bb2',cor:'#3fb950',taxas:[.025,.03,.04,.05,.07,.10]},
  {id:3,nome:'Bloco 3 — Elevado',       desc:'Alto crescimento/risco',badge:'bb3',cor:'#e3b341',taxas:[.05,.07,.10,.12,.15,.20]},
  {id:4,nome:'Bloco 4 — Extremo',       desc:'Ruína quase certa',     badge:'bb4',cor:'#f85149',taxas:[.25,.30,.35,.40,.45,.50]},
];

const LOG=[];
let logOpen=true;
const ACC={};
for(const b of BLOCOS) ACC[b.id]={pos:new Array(6).fill(0),neg:new Array(6).fill(0),dan:new Array(6).fill(0),zer:new Array(6).fill(0),total:0};

// ── HELPERS ──────────────────────────────────────────────────────────────────
function gerarSeq(wr,n){const s=[];for(let i=0;i<n;i++)s.push(Math.random()<wr?1:-1);return s;}

// ── CÁLCULO DE UMA COLUNA ──────────────────────────────────────────────────
// taxa  = % do saldo arriscado por trade (ex: 0.01 = 1%)
// rrr   = Risk:Reward (ex: 1.5 = ganho 1.5x o risco)
// Ganho: saldo_atual × taxa × rrr         (compounding sobre saldo atual)
// Perda: saldo_atual × taxa × (-1)        (compounding sobre saldo atual)
// perigoLim = saldo mínimo antes de entrar em Zona de Perigo
function calcCol(cap,rrr,taxa,seq,perigoLim){return TradeDiaryStudyHubCalculations.calcCol(cap,rrr,taxa,seq,perigoLim);}

const fmtC=v=>{
  if(v<=0) return '$0';
  if(v>=1000) return '$'+(v/1000).toFixed(2)+'k';
  if(v<1)    return '$'+v.toFixed(4);  // valores muito baixos (zona extrema)
  return '$'+v.toFixed(2);
};
const fmtP=v=>(v*100).toFixed(v<.01?2:0)+'%';
const h2r=(hex,a)=>{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;};
function getPerigoLim(){
  const cap=parseFloat(document.getElementById('fm-capital').value)||1000;
  const pp=parseFloat(document.getElementById('perigoPct').value)||20;
  return cap*(pp/100);
}

// ── TABELA RECUPERAÇÃO ───────────────────────────────────────────────────────
function atualizarTabelaRec(){
  const pp=parseFloat(document.getElementById('perigoPct').value)||20;
  const cap=parseFloat(document.getElementById('fm-capital').value)||1000;
  const rrr=parseFloat(document.getElementById('rrr').value)||1;
  const wr=parseFloat(document.getElementById('winRate').value)/100;
  const lr=1-wr;
  const expR=wr*rrr-lr;          // expectativa em R por trade
  const riskRef=0.01;            // 1% de risco por trade para calcular trades

  const perdas=[10,20,30,pp,40,50,60,70,80,90].filter((v,i,a)=>a.indexOf(v)===i&&v>0&&v<100).sort((a,b)=>a-b);
  let h='<thead><tr><th>Perda</th><th>Saldo</th><th>Rec. p/ BE</th><th>Trades~</th></tr></thead><tbody>';
  for(const p of perdas){
    const saldo=cap*(1-p/100);
    const recPct=p>=100?Infinity:((cap-saldo)/saldo*100);
    let tradesNeeded='—';
    if(expR>0){
      // n trades a 1% risco com compounding para saldo→cap
      const gain=riskRef*rrr,loss=riskRef;
      const expPerTrade=wr*gain-lr*loss;
      if(expPerTrade>0){
        const n=Math.ceil(Math.log(cap/saldo)/Math.log(1+expPerTrade));
        tradesNeeded=n>9999?'>9999':n.toString();
      }
    }
    const isPerigo=p>=pp;
    const isWarn=!isPerigo&&p>=pp*0.7;
    const cls=isPerigo?'rt-ruin':isWarn?'rt-warn':'rt-ok';
    // triângulo inline à direita do texto de perda, apenas nas linhas de perigo
    const icon=isPerigo?` <span class="rt-icon">⚠</span>`:'';
    h+=`<tr class="${cls}"><td>${p}%${icon}</td><td>${fmtC(saldo)}</td><td>${recPct.toFixed(1)}%</td><td>${tradesNeeded}</td></tr>`;
  }
  h+='</tbody>';
  document.getElementById('recovTable').innerHTML=h;
}

// ── CHART EQUITY ─────────────────────────────────────────────────────────────
function drawEquityChart(id,cols,cor,cap,perigoLim){
  const cv=document.getElementById(id);if(!cv)return;
  const ctx=cv.getContext('2d');
  const W=cv.offsetWidth||320,H=80;
  cv.width=W;cv.height=H;ctx.clearRect(0,0,W,H);
  let all=[];for(const c of cols)all=all.concat(c.map(d=>d.s));
  const mn=Math.min(...all,cap*.05),mx=Math.max(...all,cap*1.05);
  const rng=mx-mn||1,n=cols[0].length;
  const pL=4,pR=4,pT=8,pB=4,w=W-pL-pR,h=H-pT-pB;
  const px=i=>pL+(n>1?(i/(n-1))*w:w/2);
  const py=v=>pT+h-((v-mn)/rng)*h;
  ctx.save();ctx.setLineDash([3,4]);
  // linha capital
  ctx.strokeStyle='rgba(107,125,143,.3)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pL,py(cap));ctx.lineTo(W-pR,py(cap));ctx.stroke();
  // linha zona de perigo
  if(perigoLim>0&&perigoLim<cap){
    ctx.strokeStyle='rgba(248,81,73,.5)';
    ctx.beginPath();ctx.moveTo(pL,py(perigoLim));ctx.lineTo(W-pR,py(perigoLim));ctx.stroke();
  }
  ctx.restore();
  cols.forEach((serie,si)=>{
    const alpha=.15+(si/cols.length)*.75;
    ctx.beginPath();ctx.moveTo(px(0),py(serie[0].s));
    for(let i=1;i<serie.length;i++)ctx.lineTo(px(i),py(serie[i].s));
    ctx.strokeStyle=h2r(cor,alpha);ctx.lineWidth=si===cols.length-1?1.8:1;ctx.stroke();
  });
}

// ── CHART ANALYTICS ──────────────────────────────────────────────────────────
function drawAnalyticsChart(id,serPos,serNeg,serDan,serZer){
  const cv=document.getElementById(id);if(!cv)return;
  const ctx=cv.getContext('2d');
  const W=cv.offsetWidth||200,H=100;
  cv.width=W;cv.height=H;ctx.clearRect(0,0,W,H);
  const n=serPos.length;if(!n)return;
  const tot6=BLOCOS[0].taxas.length;
  const pL=2,pR=2,pT=6,pB=2,w=W-pL-pR,h=H-pT-pB;
  const bw=Math.max(1,Math.floor(w/n)-1);
  for(let i=0;i<n;i++){
    const x=pL+i*(w/n);
    const sP=serPos[i]/tot6,sN=serNeg[i]/tot6,sD=serDan[i]/tot6,sZ=serZer[i]/tot6;
    let y=pT+h;
    const draw=(frac,col)=>{const bh=frac*h;ctx.fillStyle=col;ctx.fillRect(x,y-bh,bw,bh);y-=bh;};
    draw(sP,h2r('#3fb950',.8));draw(sN,h2r('#e3b341',.75));draw(sD,h2r('#f85149',.85));draw(sZ,h2r('#f85149',.85));
  }
  // linha tendência de perigo+zero
  if(n>2){
    const vals=serDan.map((v,i)=>v+serZer[i]);
    ctx.save();ctx.setLineDash([2,3]);ctx.strokeStyle='rgba(248,81,73,.55)';ctx.lineWidth=1;
    ctx.beginPath();
    for(let i=0;i<n;i++){
      const x=pL+i*(w/n)+bw/2;
      const y=pT+h-(vals[i]/tot6)*h;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();ctx.restore();
  }
}

// ── RENDER BLOCO ─────────────────────────────────────────────────────────────
function renderBloco(bloco,seq,cap,rrr,perigoLim){
  const N=seq.length;
  const cols=bloco.taxas.map(t=>calcCol(cap,rrr,t,seq,perigoLim));
  const fins=cols.map(c=>c[N-1]);
  const zeros  =fins.filter(f=>f.dead||f.s<=0).length;
  const dangers=fins.filter(f=>!f.dead&&f.s>0&&f.s<perigoLim).length;
  const negs   =fins.filter(f=>!f.dead&&f.s>=perigoLim&&f.s<cap).length;
  const pos    =fins.filter(f=>f.s>=cap).length;

  // acumular histórico
  cols.forEach((col,ci)=>{
    const fin=col[N-1];
    if(fin.dead||fin.s<=0)          ACC[bloco.id].zer[ci]++;
    else if(fin.s<perigoLim)         ACC[bloco.id].dan[ci]++;
    else if(fin.s<cap)               ACC[bloco.id].neg[ci]++;
    else                             ACC[bloco.id].pos[ci]++;
  });
  ACC[bloco.id].total++;

  // chips simulação atual — sem Zeradas
  const mkChip=(cls,label,val,color)=>
    `<div class="chip ${cls}"><span class="cl">${label}</span><span class="cv" style="color:${color}">${val}/${cols.length}</span></div>`;
  const chipD  =dangers>0?mkChip('chip-r','Perigo',dangers,'var(--red)'):mkChip('chip-p','Perigo',0,'var(--green)');
  const chipN  =negs   >0?mkChip('chip-n','Negativas',negs,'var(--yellow)'):mkChip('chip-p','Negativas',0,'var(--green)');
  const chipPos=mkChip('chip-p','Positivas',pos,'var(--green)');

  // chips histórico
  const a=ACC[bloco.id],tot=a.total;
  const avgP =(a.pos.reduce((s,v)=>s+v,0)/cols.length/tot*100).toFixed(0);
  const avgN =(a.neg.reduce((s,v)=>s+v,0)/cols.length/tot*100).toFixed(0);
  const avgD =(a.dan.reduce((s,v)=>s+v,0)/cols.length/tot*100).toFixed(0);
  const avgZ =(a.zer.reduce((s,v)=>s+v,0)/cols.length/tot*100).toFixed(0);
  const hchips=tot>1?`<div class="hchips">
    <div class="hchip-label">Histórico acumulado (${tot} sims)</div>
    <div class="chip chip-p" style="flex:1"><span class="cl">✓ Pos</span><span class="cv cg">${avgP}%</span></div>
    <div class="chip chip-n" style="flex:1"><span class="cl">~ Neg</span><span class="cv cy">${avgN}%</span></div>
    <div class="chip chip-r" style="flex:1"><span class="cl">Perigo</span><span class="cv cr">${avgD}%</span></div>
  </div>`:'';

  // tabela
  const ths=bloco.taxas.map(t=>`<th>${fmtP(t)}</th>`).join('');
  let rows='';
  for(let i=0;i<N;i++){
    const sym=seq[i]===1?'▲':'▼',wl=seq[i]===1?'w':'l';
    const tds=cols.map(col=>{
      const{s,dead,danger}=col[i];
      let cls;
      if(dead||s<=0) cls='cz';
      else if(danger) cls='cd';
      else if(s>=cap) cls='ca';
      else            cls='cn';
      return`<td class="${cls}">${dead?'🔴':fmtC(s)}</td>`;
    }).join('');
    rows+=`<tr><td class="tdn">${i+1}</td><td class="tdr ${wl}">${sym}</td>${tds}</tr>`;
  }
  const finTds=cols.map(col=>{
    const v=col[N-1].s,diff=v-cap,pctStr=((diff/cap)*100).toFixed(1);
    // cor do texto na linha Final: verde=acima capital, amarelo=abaixo mas vivo, vermelho=perigo ou zerado
    const color=v<=0?'var(--red)':v<perigoLim?'var(--red)':v>=cap?'var(--green)':'var(--yellow)';
    const badge=v>0&&v<perigoLim?'<span class="rd">PERIGO</span>':'';
    return`<td style="color:${color}">${fmtC(v)}<br><span style="font-size:8px;opacity:.7">${diff>=0?'+':''}${pctStr}%</span>${badge}</td>`;
  }).join('');

  const cid=`chart-b${bloco.id}`;
  return{
    html:`<div class="panel">
      <div class="phdr">
        <div class="ptitle"><span style="color:${bloco.cor}">■</span> ${bloco.nome}</div>
        <span class="pbadge ${bloco.badge}">${bloco.desc}</span>
      </div>
      <div class="pbody">
        <div class="schips">${chipD}${chipN}${chipPos}</div>
        ${hchips}
        <div class="cw">
          <div class="clabel">
            <span>Curva de Capital — ${N} trades</span>
            <div class="clabel-hint">
              <span><span class="cleg" style="background:rgba(107,125,143,.5);border-top:1px dashed rgba(107,125,143,.5)"></span> capital</span>
              <span><span class="cleg" style="background:rgba(248,81,73,.7)"></span> perigo</span>
            </div>
          </div>
          <canvas class="mc" id="${cid}" height="80"></canvas>
        </div>
        <div class="twrap">
          <table class="bt">
            <thead><tr><th class="thn">#</th><th class="thr">Res</th>${ths}</tr></thead>
            <tbody>${rows}<tr class="rf"><td colspan="2" class="rl">Final</td>${finTds}</tr></tbody>
          </table>
        </div>
      </div>
    </div>`,
    cols,stats:{zeros,dangers,negs,pos}
  };
}

// ── ANALYTICS ────────────────────────────────────────────────────────────────
function renderAnalytics(){
  const n=LOG.length;
  if(n<2){
    document.getElementById('analyticsEmpty').style.display='';
    document.getElementById('analyticsPanel').style.display='none';
    return;
  }
  document.getElementById('analyticsEmpty').style.display='none';
  document.getElementById('analyticsPanel').style.display='';

  let totP=0,totN=0,totD=0,totZ=0;
  for(const b of BLOCOS){
    const a=ACC[b.id];
    totP+=a.pos.reduce((s,v)=>s+v,0);totN+=a.neg.reduce((s,v)=>s+v,0);
    totD+=a.dan.reduce((s,v)=>s+v,0);totZ+=a.zer.reduce((s,v)=>s+v,0);
  }
  const tot=totP+totN+totD+totZ||1;

  // Total Sims junto com os outros cards
  document.getElementById('analyticsTotals').innerHTML=`
    <div class="metric mg" style="margin:0"><div class="mlabel">✓ Positivas</div><div class="mval cg">${(totP/tot*100).toFixed(1)}%</div><div class="msub">${totP} de ${tot} cols</div></div>
    <div class="metric my" style="margin:0"><div class="mlabel">~ Negativas</div><div class="mval cy">${(totN/tot*100).toFixed(1)}%</div><div class="msub">${totN} de ${tot}</div></div>
    <div class="metric mr" style="margin:0"><div class="mlabel">Zona de Perigo</div><div class="mval cr">${(totD/tot*100).toFixed(1)}%</div><div class="msub">${totD} de ${tot}</div></div>
    <div class="metric mp" style="margin:0"><div class="mlabel">Total Sims</div><div class="mval cp">${n}</div><div class="msub">simulações rodadas</div></div>`;

  // Painéis por bloco
  const grid=document.getElementById('analyticsGrid');
  grid.innerHTML='';
  for(const b of BLOCOS){
    const a=ACC[b.id];const nt=a.total;
    const serPos=[],serNeg=[],serDan=[],serZer=[];
    for(let i=LOG.length-1;i>=0;i--){
      const s=LOG[i].statsBlocos[b.id-1];
      serPos.push(s.pos);serNeg.push(s.negs);serDan.push(s.dangers);serZer.push(s.zeros);
    }
    const c6=b.taxas.length;
    const aP=(a.pos.reduce((s,v)=>s+v,0)/c6/nt*100).toFixed(1);
    const aN=(a.neg.reduce((s,v)=>s+v,0)/c6/nt*100).toFixed(1);
    const aD=(a.dan.reduce((s,v)=>s+v,0)/c6/nt*100).toFixed(1);
    const aZ=(a.zer.reduce((s,v)=>s+v,0)/c6/nt*100).toFixed(1);
    const cid=`achart-b${b.id}`;
    grid.innerHTML+=`
    <div class="a-panel">
      <div class="a-phdr">
        <div class="a-ptitle"><span style="color:${b.cor}">■</span>${b.nome}</div>
      </div>
      <div class="a-pbody">
        <canvas class="ac" id="${cid}" height="100"></canvas>
        <div class="stackbar">
          <div class="sb-pos" style="width:${aP}%"></div>
          <div class="sb-neg" style="width:${aN}%"></div>
          <div class="sb-dan" style="width:${aD}%"></div>
        </div>
        <div class="stackbar-legend">
          <span><span class="sl-dot" style="background:var(--green)"></span>Pos ${aP}%</span>
          <span><span class="sl-dot" style="background:var(--yellow)"></span>Neg ${aN}%</span>
          <span><span class="sl-dot" style="background:var(--red)"></span>Perigo ${aD}%</span>
        </div>
        <div class="a-stats">
          <div class="a-stat"><div class="asl">Menor risco</div><div class="asv cb">${fmtP(b.taxas[0])}</div></div>
          <div class="a-stat"><div class="asl">Perigo médio</div><div class="asv cr">${aD}%</div></div>
          <div class="a-stat"><div class="asl">Maior risco</div><div class="asv cy">${fmtP(b.taxas[b.taxas.length-1])}</div></div>
        </div>
      </div>
    </div>`;
    requestAnimationFrame(()=>drawAnalyticsChart(cid,serPos,serNeg,serDan,serZer));
  }
}

// ── SIMULAR ───────────────────────────────────────────────────────────────────
function fmSimular(){
  const cap=parseFloat(document.getElementById('fm-capital').value)||1000;
  const N=parseInt(document.getElementById('nTrades').value)||20;
  const rrr=parseFloat(document.getElementById('rrr').value)||1;
  const wr=parseFloat(document.getElementById('winRate').value)/100;
  const lr=parseFloat(document.getElementById('lossRate').value)/100;
  const pp=parseFloat(document.getElementById('perigoPct').value)||20;
  const perigoLim=cap*(pp/100);

  if(Math.abs((wr+lr)-1)>.005){document.getElementById('warnBox').classList.add('show');return;}
  document.getElementById('warnBox').classList.remove('show');

  // atualizar métricas
  document.getElementById('m-cap').textContent=cap>=1000?'$'+(cap/1000).toFixed(1)+'k':'$'+cap;
  document.getElementById('m-wr').textContent=(wr*100).toFixed(0)+'%';
  document.getElementById('m-wr-sub').textContent='RRR 1:'+rrr.toFixed(2);
  document.getElementById('m-trades').textContent=N;
  document.getElementById('m-perigo').textContent=pp+'%';
  document.getElementById('m-perigo-sub').textContent='saldo < '+fmtC(perigoLim);
  document.getElementById('m-sims').textContent=LOG.length+1;
  atualizarTopbar();atualizarTabelaRec();

  const seq=gerarSeq(wr,N);
  const grid=document.getElementById('blocosGrid');
  grid.innerHTML='';
  const all=[];
  for(const b of BLOCOS){
    const{html,cols,stats}=renderBloco(b,seq,cap,rrr,perigoLim);
    grid.innerHTML+=html;
    all.push({bloco:b,cols,stats});
  }
  requestAnimationFrame(()=>{
    for(const{bloco,cols}of all) drawEquityChart(`chart-b${bloco.id}`,cols,bloco.cor,cap,perigoLim);
  });

  // LOG
  const hora=new Date().toLocaleTimeString('pt-BR',{hour12:false});
  const statsBlocos=all.map(d=>d.stats);
  const blocoRes=all.map(({bloco,stats})=>{
    const hasPerigo=stats.zeros>0||stats.dangers>0;
    const allPos=stats.pos===bloco.taxas.length;
    const tag=stats.zeros>0?'ltn':stats.dangers>0?'lto':allPos?'ltp':'ltm';
    return`<span class="ltag ${tag}">B${bloco.id}: ${stats.pos}✓ ${stats.negs}~ ${stats.dangers}⬛ ${stats.zeros}🔴</span>`;
  }).join(' ');
  const totRisco=all.reduce((a,d)=>a+d.stats.zeros+d.stats.dangers,0);
  const totC=all.reduce((a,d)=>a+d.bloco.taxas.length,0);
  const st=totRisco===0?`<span class="ltag ltp">sem riscos</span>`:totRisco>=totC/2?`<span class="ltag ltn">${totRisco} riscos</span>`:`<span class="ltag ltm">${totRisco} riscos</span>`;

  LOG.unshift({hora,cap,N,wr,rrr,pp,blocoRes,st,statsBlocos,
    raw:{cap,N,wr:(wr*100).toFixed(0),rrr,pp,blocos:statsBlocos}});
  renderLog();
  renderAnalytics();
  document.getElementById('m-sims').textContent=LOG.length;
}

// ── LOG ───────────────────────────────────────────────────────────────────────
function renderLog(){
  const cnt=LOG.length;
  document.getElementById('logcnt').textContent=`${cnt} registro${cnt!==1?'s':''}`;
  const empty=document.getElementById('logempty'),table=document.getElementById('logtable'),tbody=document.getElementById('logtbody');
  if(!cnt){empty.style.display='block';table.style.display='none';return;}
  empty.style.display='none';table.style.display='table';
  tbody.innerHTML=LOG.map((e,i)=>`<tr>
    <td style="color:var(--dim)">${LOG.length-i}</td>
    <td style="color:var(--muted)">${e.hora}</td>
    <td style="color:var(--blue)">${e.N}</td>
    <td>$${e.cap.toLocaleString('pt-BR')}</td>
    <td style="color:var(--green)">${(e.wr*100).toFixed(0)}%</td>
    <td style="color:var(--yellow)">1:${e.rrr.toFixed(2)}</td>
    <td style="color:var(--orange)">&lt;${e.pp}%</td>
    <td>${e.blocoRes}</td>
    <td>${e.st}</td>
  </tr>`).join('');
}

function toggleLog(){
  logOpen=!logOpen;
  document.getElementById('logscroll').style.display=logOpen?'':'none';
  document.getElementById('logchev').textContent=logOpen?'▼':'▶';
}
function clearLog(){
  LOG.length=0;
  for(const b of BLOCOS) ACC[b.id]={pos:new Array(6).fill(0),neg:new Array(6).fill(0),dan:new Array(6).fill(0),zer:new Array(6).fill(0),total:0};
  document.getElementById('m-sims').textContent=0;
  renderLog();renderAnalytics();
}
function exportLog(){
  if(!LOG.length)return;
  const hdr='#,Hora,Trades,Capital,WR%,RRR,Perigo%,B1_pos,B1_neg,B1_perigo,B1_zero,B2_pos,B2_neg,B2_perigo,B2_zero,B3_pos,B3_neg,B3_perigo,B3_zero,B4_pos,B4_neg,B4_perigo,B4_zero';
  const rows=LOG.map((e,i)=>{
    const b=e.raw.blocos;
    return[LOG.length-i,e.hora,e.N,e.cap,e.raw.wr,e.rrr,e.pp,
      b[0].pos,b[0].negs,b[0].dangers,b[0].zeros,
      b[1].pos,b[1].negs,b[1].dangers,b[1].zeros,
      b[2].pos,b[2].negs,b[2].dangers,b[2].zeros,
      b[3].pos,b[3].negs,b[3].dangers,b[3].zeros,
    ].join(',');
  });
  const csv=[hdr,...rows].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download='ferramentas_mentais_historico.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function syncLoss(){const w=parseFloat(document.getElementById('winRate').value)||0;document.getElementById('lossRate').value=+(100-w).toFixed(1);}
function syncWin(){const l=parseFloat(document.getElementById('lossRate').value)||0;document.getElementById('winRate').value=+(100-l).toFixed(1);}
function setN(v){document.getElementById('nTrades').value=v;atualizarTopbar();}
function setRP(v){document.getElementById('perigoPct').value=v;atualizarTopbar();atualizarTabelaRec();}
function atualizarTopbar(){
  const n=parseInt(document.getElementById('nTrades').value)||20;
  const pp=parseFloat(document.getElementById('perigoPct').value)||20;
  document.getElementById('tinfo').textContent=`${n} trades · 4 blocos · perigo <${pp}%`;
}

shAddLoad(()=>{atualizarTabelaRec();fmSimular();});

return {atualizarTabelaRec, atualizarTopbar, fmSimular, setN, syncLoss, syncWin, setRP, toggleLog, exportLog, clearLog};
};
