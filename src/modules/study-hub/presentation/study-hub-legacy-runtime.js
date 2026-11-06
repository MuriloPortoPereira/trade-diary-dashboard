/* BEGIN STUDYHUB INTEGRATED BUNDLE */
(() => {
  const host = document.getElementById('studyHubLegacyApp');
  if (!host || host.dataset.loaded === '1') return;
  host.classList.add('embed-mode');
  host.innerHTML = TradeDiaryStudyHubTemplate;
  host.dataset.loaded = '1';
})();

(function(){
const shSafe = (fn, label = 'legacy') => {
  try { return fn(); }
  catch (err) { console.error('[StudyHub Legacy]', label, err); return undefined; }
};
const shAddLoad = (fn) => {
  const run = () => shSafe(fn, 'load');
  if (document.readyState === 'complete') setTimeout(run, 0);
  else window.addEventListener('load', run);
};
if (typeof window.Chart !== 'function') {
  window.Chart = class { constructor(){} destroy(){} };
}

/* ══════════════════════════════════════
   HUB — navegação e cotação global
══════════════════════════════════════ */
const HUB_MODULES = ['mod-propfirm','mod-plano','mod-tradesim','mod-mental'];
const HUB_MODULE_MAP = {propfirm:0,plano:1,tradesim:2,mental:3};
let hubCotVal = 5.80;

function hubSwitch(i) {
  document.querySelectorAll('.hub-tab').forEach((b,j) => b.classList.toggle('active', j===i));
  HUB_MODULES.forEach((id,j) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', j===i);
  });
  // Acionar resize de canvas ao trocar de aba
  setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);
}

function hubSetCot(v) {
  if (!v || v < 0.1) return;
  hubCotVal = v;
  document.getElementById('hubCotBadge').textContent = 'R$ ' + v.toFixed(2).replace('.',',');
  // Propagar para módulos que usam cotação
  const pfEl = document.getElementById('gCot');
  if (pfEl) { pfEl.value = v; if(typeof pfSetCot==='function') pfSetCot(v); }
  const ptEl = document.getElementById('cotInput');
  if (ptEl) { ptEl.value = v; if(typeof ptSetCot==='function') ptSetCot(v); }
}

async function hubFetchCot() {
  const badge = document.getElementById('hubCotBadge');
  badge.textContent = '...';
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const d = await r.json();
    const rate = parseFloat(d.USDBRL.bid);
    document.getElementById('hubCot').value = rate.toFixed(2);
    hubSetCot(rate);
  } catch(e) {
    badge.textContent = 'Erro API';
    setTimeout(() => hubSetCot(hubCotVal), 2000);
  }
}

function hubToast(msg, type='info') {
  const t = document.getElementById('hubToast');
  t.textContent = msg;
  t.style.borderColor = type==='ok' ? 'var(--green2)' : type==='err' ? 'var(--red2)' : 'var(--border2)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function hubApplyEmbedMode() {
  const params = new URLSearchParams(window.location.search);
  const embed = params.get('embed') === '1';
  const moduleKey = (params.get('module') || '').toLowerCase();
  if (embed) document.getElementById('studyHubLegacyApp')?.classList.add('embed-mode');
  if (HUB_MODULE_MAP[moduleKey] != null) hubSwitch(HUB_MODULE_MAP[moduleKey]);
}

// Init
shAddLoad( () => {
  hubSetCot(parseFloat(document.getElementById('hubCot').value) || 5.80);
  hubApplyEmbedMode();
});



// ═══════════════════════════════════════════════════════════
// GLOBALS
// ═══════════════════════════════════════════════════════════
const {pfSetCot, pfTab, calcSimulador, calcMulti, calcPropFirm, calcGrandes, calc2Fases, calc1Fase, calcInstant, calcRRR, importFase, exportFase} = TradeDiaryStudyHubPropFirm(shAddLoad);



const {ptSetCot, ptTab, addCiclo, calcCiclos, calcParciais, calcBR, calcMetas, calcRecov, calcLosses, calcDD, clearDDHist, calcDDModo, calcDDFromPct, calcDDFromUSD, renderPlanilha, runSim, calcDT, calcDTVol, calcAcoesFull, calcAcoes, calcGerRisco} = TradeDiaryStudyHubPlan(shAddLoad);



const {tsRunAll, syncRange, syncInput, tsTab, buildIntraday} = TradeDiaryStudyHubTradeSim(shAddLoad);



const {atualizarTabelaRec, atualizarTopbar, fmSimular, setN, syncLoss, syncWin, setRP, toggleLog, exportLog, clearLog} = TradeDiaryStudyHubMental(shAddLoad);

// ── TOOLTIP MANAGER (position:fixed no body, escapa qualquer stacking context) ──
(function(){
  const fl=document.createElement('div');
  fl.className='tip-float';
  const tipHost=document.getElementById('studyHubLegacyApp')||document.body;
  const tipMount=tipHost&&typeof tipHost.appendChild==='function'?tipHost:document.body;
  tipMount.appendChild(fl);
  let tid=null;

  function show(el){
    const box=el.querySelector('.tip-box');
    if(!box)return;
    fl.innerHTML=box.innerHTML;
    fl.classList.add('visible');
    fl.style.transition='none';
    fl.style.opacity='1';
    reposition(el);
  }
  function hide(){
    fl.classList.remove('visible');
    fl.style.opacity='0';
  }
  function reposition(el){
    const GAP=8;
    const r=el.getBoundingClientRect();
    const fw=fl.offsetWidth||240;
    const fh=fl.offsetHeight||120;
    let top=r.top-fh-GAP;
    let left=r.left+r.width/2-fw/2;
    // se sai pelo topo, coloca abaixo
    if(top<4){top=r.bottom+GAP;}
    // clamp horizontal
    left=Math.max(4,Math.min(left,window.innerWidth-fw-4));
    fl.style.top=top+'px';
    fl.style.left=left+'px';
  }

  document.addEventListener('mouseover',function(e){
    const tip=e.target.closest('.tip');
    if(tip){clearTimeout(tid);show(tip);}
  });
  document.addEventListener('mouseout',function(e){
    const tip=e.target.closest('.tip');
    if(tip){tid=setTimeout(hide,80);}
  });
  document.addEventListener('focusin',function(e){
    const tip=e.target.closest('.tip');
    if(tip){clearTimeout(tid);show(tip);}
  });
  document.addEventListener('focusout',function(e){
    const tip=e.target.closest('.tip');
    if(tip){tid=setTimeout(hide,80);}
  });
})();



function shCall(fn, name) {
  if (typeof fn !== 'function') return;
  shSafe(() => fn(), name || fn.name || 'legacy fn');
}
function shInitLegacyModule(moduleKey) {
  const cotEl = document.getElementById('hubCot');
  const cot = parseFloat(cotEl && cotEl.value) || 5.80;
  const groups = {
    propfirm: [() => pfSetCot(cot), calcSimulador, calcMulti, calcPropFirm, calcGrandes, calc2Fases, calc1Fase, calcInstant, calcRRR],
    plano: [() => ptSetCot(cot), calcCiclos, calcParciais, calcBR, calcMetas, calcRecov, calcLosses, calcDD, renderPlanilha, runSim, () => ['sp','nq','cl','wd','wi'].forEach(k => calcDT(k)), () => ['sp','nq','cl','wd','wi'].forEach(k => calcDTVol(k)), calcAcoesFull],
    tradesim: [tsRunAll],
    mental: [atualizarTabelaRec, atualizarTopbar],
  };
  (groups[moduleKey] || groups.propfirm).forEach((fn, idx) => shCall(fn, moduleKey + ':' + idx));
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}
window.sh_legacyInit = (moduleKey) => shSafe(() => shInitLegacyModule(moduleKey), 'legacyInit');

window.sh_pfTab = (...args) => shSafe(() => pfTab(...args), 'pfTab');
window.sh_calcSimulador = (...args) => shSafe(() => calcSimulador(...args), 'calcSimulador');
window.sh_calcMulti = (...args) => shSafe(() => calcMulti(...args), 'calcMulti');
window.sh_calcPropFirm = (...args) => shSafe(() => calcPropFirm(...args), 'calcPropFirm');
window.sh_calcGrandes = (...args) => shSafe(() => calcGrandes(...args), 'calcGrandes');
window.sh_calc2Fases = (...args) => shSafe(() => calc2Fases(...args), 'calc2Fases');
window.sh_importFase = (...args) => shSafe(() => importFase(...args), 'importFase');
window.sh_exportFase = (...args) => shSafe(() => exportFase(...args), 'exportFase');
window.sh_calc1Fase = (...args) => shSafe(() => calc1Fase(...args), 'calc1Fase');
window.sh_calcInstant = (...args) => shSafe(() => calcInstant(...args), 'calcInstant');
window.sh_calcRRR = (...args) => shSafe(() => calcRRR(...args), 'calcRRR');
window.sh_ptTab = (...args) => shSafe(() => ptTab(...args), 'ptTab');
window.sh_addCiclo = (...args) => shSafe(() => addCiclo(...args), 'addCiclo');
window.sh_calcCiclos = (...args) => shSafe(() => calcCiclos(...args), 'calcCiclos');
window.sh_calcParciais = (...args) => shSafe(() => calcParciais(...args), 'calcParciais');
window.sh_calcBR = (...args) => shSafe(() => calcBR(...args), 'calcBR');
window.sh_calcMetas = (...args) => shSafe(() => calcMetas(...args), 'calcMetas');
window.sh_calcRecov = (...args) => shSafe(() => calcRecov(...args), 'calcRecov');
window.sh_calcLosses = (...args) => shSafe(() => calcLosses(...args), 'calcLosses');
window.sh_calcDD = (...args) => shSafe(() => calcDD(...args), 'calcDD');
window.sh_clearDDHist = (...args) => shSafe(() => clearDDHist(...args), 'clearDDHist');
window.sh_calcDDModo = (...args) => shSafe(() => calcDDModo(...args), 'calcDDModo');
window.sh_calcDDFromPct = (...args) => shSafe(() => calcDDFromPct(...args), 'calcDDFromPct');
window.sh_calcDDFromUSD = (...args) => shSafe(() => calcDDFromUSD(...args), 'calcDDFromUSD');
window.sh_renderPlanilha = (...args) => shSafe(() => renderPlanilha(...args), 'renderPlanilha');
window.sh_runSim = (...args) => shSafe(() => runSim(...args), 'runSim');
window.sh_calcDT = (...args) => shSafe(() => calcDT(...args), 'calcDT');
window.sh_calcDTVol = (...args) => shSafe(() => calcDTVol(...args), 'calcDTVol');
window.sh_calcAcoesFull = (...args) => shSafe(() => calcAcoesFull(...args), 'calcAcoesFull');
window.sh_calcAcoes = (...args) => shSafe(() => calcAcoes(...args), 'calcAcoes');
window.sh_calcGerRisco = (...args) => shSafe(() => calcGerRisco(...args), 'calcGerRisco');
window.sh_tsRunAll = (...args) => shSafe(() => tsRunAll(...args), 'tsRunAll');
window.sh_syncRange = (...args) => shSafe(() => syncRange(...args), 'syncRange');
window.sh_syncInput = (...args) => shSafe(() => syncInput(...args), 'syncInput');
window.sh_tsTab = (...args) => shSafe(() => tsTab(...args), 'tsTab');
window.sh_buildIntraday = (...args) => shSafe(() => buildIntraday(...args), 'buildIntraday');
window.sh_fmSimular = (...args) => shSafe(() => fmSimular(...args), 'fmSimular');
window.sh_atualizarTabelaRec = (...args) => shSafe(() => atualizarTabelaRec(...args), 'atualizarTabelaRec');
window.sh_atualizarTopbar = (...args) => shSafe(() => atualizarTopbar(...args), 'atualizarTopbar');
window.sh_setN = (...args) => shSafe(() => setN(...args), 'setN');
window.sh_syncLoss = (...args) => shSafe(() => syncLoss(...args), 'syncLoss');
window.sh_syncWin = (...args) => shSafe(() => syncWin(...args), 'syncWin');
window.sh_setRP = (...args) => shSafe(() => setRP(...args), 'setRP');
window.sh_toggleLog = (...args) => shSafe(() => toggleLog(...args), 'toggleLog');
window.sh_exportLog = (...args) => shSafe(() => exportLog(...args), 'exportLog');
window.sh_clearLog = (...args) => shSafe(() => clearLog(...args), 'clearLog');
window.sh_hubSwitch = (...args) => shSafe(() => hubSwitch(...args), 'hubSwitch');
window.sh_hubSetCot = (...args) => shSafe(() => hubSetCot(...args), 'hubSetCot');
})();

/* END STUDYHUB INTEGRATED BUNDLE */
