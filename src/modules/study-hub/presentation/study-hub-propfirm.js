globalThis.TradeDiaryStudyHubPropFirm = function createStudyHubPropFirm(shAddLoad) {
let globalCot = TradeDiaryStudyHubStorage.readPropFirmRate();
const pfCharts = {};

function pfMkChart(id, cfg) {
  const cv = document.getElementById(id);
  if (!cv) return;
  if (pfCharts[id]) pfCharts[id].destroy();
  pfCharts[id] = new Chart(cv, cfg);
  return pfCharts[id];
}

const pfF2  = v => v.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
const pfFR  = v => 'R$' + pfF2(v);
const fU  = v => '$' + pfF2(v);
const fP  = v => (v * 100).toFixed(2) + '%';
const ceil = (v) => Math.ceil(v);
const flr  = (v) => Math.floor(v);

const baseOpts = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
  plugins: { legend: { labels: { color: 'var(--muted)', font: { family: 'JetBrains Mono', size: 9 } } } },
  scales: {
    x: { ticks: { color: 'var(--dim)', font: { size: 8 }, maxTicksLimit: 16 }, grid: { color: 'rgba(30,45,61,.4)' } },
    y: { ticks: { color: 'var(--dim)', font: { size: 8 } }, grid: { color: 'rgba(30,45,61,.4)' } }
  }
};

// ═══════════════════════════════════════════════════════════
// COTAÇÃO GLOBAL
// ═══════════════════════════════════════════════════════════
function pfSetCot(v) {
  globalCot = v;
  TradeDiaryStudyHubStorage.writePropFirmRate(v);
  document.getElementById('cotBadge').textContent = 'R$ ' + v.toFixed(2).replace('.', ',');
  // Propagar para todos os inputs de cotação
  ['s_cot','m_cot','sq_cot'].forEach(id => { const el=document.getElementById(id); if(el) el.value=v.toFixed(2); });
  // Recalcular tudo
  calcSimulador(); calcMulti(); calcSaque(); calcPropFirm(); calcGrandes();
  calc2Fases(); calc1Fase(); calcInstant(); calcRRR();
}

async function pfFetchCot() {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const d = await r.json();
    const v = parseFloat(d.USDBRL.bid);
    document.getElementById('gCot').value = v.toFixed(2);
    pfSetCot(v);
  } catch(e) {
    document.getElementById('cotBadge').textContent = 'Offline';
  }
}

// ═══════════════════════════════════════════════════════════
// LUCRO LÍQUIDO — fórmula padrão
// liq = lucroUSD * payout * cot * (1-ir) * (1-taxa)
// ═══════════════════════════════════════════════════════════
function liqBRL(lucroUSD, payout, cot, ir, taxa) {
  return TradeDiaryStudyHubCalculations.liqBRL(lucroUSD, payout, cot, ir, taxa);
}

// ═══════════════════════════════════════════════════════════
// HELPERS — TABELA DE RISCO POR NÍVEL
// ═══════════════════════════════════════════════════════════
function buildNiveisTable(conta, ddmax, stops, cot, metas, entradas, payout, ir, taxa) {
  const niveis = [1, 0.75, 0.5, 0.25];
  const labels = ['100% Cheio', '75% (3/4)', '50% Meia', '25% (1/4)'];
  const riscoPct = (ddmax/100) / stops;   // risco base por trade (decimal)

  const metrics = [
    { label: 'Risco/Entrada %',    fn: n => (riscoPct*n*100).toFixed(3)+'%' },
    { label: 'Risco/Entrada USD',  fn: n => fU(conta*riscoPct*n) },
    { label: 'Risco/Entrada BRL',  fn: n => pfFR(conta*riscoPct*n*cot) },
    { label: 'Stops → Perder Conta',  fn: n => flr((ddmax/100)/(riscoPct*n))+' stops' },
    { label: 'Stops → Limite Diário', fn: n => flr((ddmax/100/5)/(riscoPct*n))+' stops' }, // DD Diário ≈ DD/5 conservador
  ];

  let rows = metrics.map(m =>
    `<tr><td class="al cm">${m.label}</td>${niveis.map(n=>`<td>${m.fn(n)}</td>`).join('')}</tr>`
  ).join('');

  metas.forEach(meta => {
    const metaUSD = conta*(meta.pct/100);
    rows += `<tr style="background:rgba(99,169,255,.06)">
      <td class="al" style="color:var(--blue);font-weight:700;font-size:10px">${meta.label} — Meta ${meta.pct}%</td>` +
      niveis.map(n => {
        const riscoEf  = riscoPct*n;
        const alvoTrade = conta*riscoEf; // RRR=1 base
        const trades   = ceil(metaUSD/alvoTrade);
        const dias     = ceil(trades/entradas);
        const liq      = liqBRL(metaUSD, payout, cot, ir, taxa);
        return `<td class="cb">${trades}T / ${dias}d<br><span style="font-size:9px;color:var(--green)">${pfFR(liq)}</span></td>`;
      }).join('') + '</tr>';
  });

  return `<div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th class="al">Métrica</th>${labels.map(l=>`<th>${l}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// HELPER: gerar steps dinâmicos (começa em step, não em 0)
// Usa inteiros internamente para evitar erro de ponto flutuante
// ═══════════════════════════════════════════════════════════
function genSteps(step, fim) {
  return TradeDiaryStudyHubCalculations.genSteps(step, fim);
}

// ═══════════════════════════════════════════════════════════
// ABA 0: SIMULADOR
// ═══════════════════════════════════════════════════════════
function calcSimulador() {
  const conta  = parseFloat(document.getElementById('s_conta').value)   || 100000;
  const payout = parseFloat(document.getElementById('s_payout').value)  || 80;
  const ddmax  = parseFloat(document.getElementById('s_ddmax').value)   || 10;
  const dddai  = parseFloat(document.getElementById('s_dddaily').value) || 5;
  const ir     = parseFloat(document.getElementById('s_ir').value)      || 6;
  const taxa   = parseFloat(document.getElementById('s_taxa').value)    || 2;
  const rrr    = parseFloat(document.getElementById('s_rrr').value)     || 1;
  const stops  = parseFloat(document.getElementById('s_stops').value)   || 40;
  const step   = parseFloat(document.getElementById('s_step').value)    || 0.25;
  const fim    = parseFloat(document.getElementById('s_fim').value)     || 10;
  const cot    = globalCot;

  const riscoEf  = (ddmax/100) / stops;           // risco % por trade (decimal)
  const riscoUSD = conta * riscoEf;               // risco em USD por trade
  const alvoUSD  = riscoUSD * rrr;               // alvo em USD por trade
  const ddMaxUSD = conta * ddmax/100;
  const ddDiaUSD = conta * dddai/100;
  const stopsMax = flr(ddMaxUSD / riscoUSD);     // stops até perder conta (DD Max)
  const stopsDia = flr(ddDiaUSD / riscoUSD);     // stops até limite diário

  document.getElementById('s_risco_ent').textContent  = fP(riscoEf);
  document.getElementById('s_risco_usd').textContent  = fU(riscoUSD);
  document.getElementById('s_alvo_usd').textContent   = fU(alvoUSD);
  document.getElementById('s_ddmax_usd').textContent  = fU(ddMaxUSD);
  document.getElementById('s_stops_max').textContent  = stopsMax + ' stops p/ perder conta';
  document.getElementById('s_dd_usd').textContent     = fU(ddDiaUSD);
  document.getElementById('s_stops_dia').textContent  = stopsDia + ' stops p/ limite diário';

  // Meta de referência = Fim% do intervalo
  const metaRef = parseFloat(document.getElementById('s_fim').value) || 10;
  document.getElementById('s_meta_trades').textContent = ceil((conta * metaRef/100) / alvoUSD) + ' trades';

  const rows = genSteps(step, fim).map(pct => {
    const lucroUSD = conta * (pct/100);
    const payBrUSD = lucroUSD * (payout/100);
    const payBrBRL = payBrUSD * cot;
    const aposIR   = payBrBRL * (1 - ir/100);
    const liqFinal = aposIR   * (1 - taxa/100);
    // ✅ Fórmula correta: trades = ceil(metaUSD / alvoUSD)
    const trades   = alvoUSD > 0 ? ceil(lucroUSD / alvoUSD) : 0;
    return { pct, lucroUSD, payBrUSD, payBrBRL, aposIR, liqFinal, trades, liqTrade: trades>0 ? liqFinal/trades : 0 };
  });

  document.getElementById('simTbody').innerHTML = rows.map(r =>
    `<tr><td class="al cy">${r.pct.toFixed(2)}%</td><td class="cb">${fU(r.lucroUSD)}</td><td>${fU(r.payBrUSD)}</td><td>${pfFR(r.payBrBRL)}</td><td class="cr">−${pfFR(r.payBrBRL-r.aposIR)}</td><td class="cg">${pfFR(r.liqFinal)}</td><td class="cp">${r.trades}</td><td class="cm">${pfFR(r.liqTrade)}</td></tr>`
  ).join('');

  pfMkChart('pfSimChart', { type:'bar', data:{ labels:rows.map(r=>r.pct.toFixed(2)+'%'), datasets:[{ label:'Líquido BRL', data:rows.map(r=>r.liqFinal), backgroundColor:'rgba(63,185,80,.4)', borderColor:'rgba(63,185,80,.8)', borderWidth:1, borderRadius:2 }] }, options:{...baseOpts,plugins:{...baseOpts.plugins,legend:{display:false}}} });
  saveState();
}

// ═══════════════════════════════════════════════════════════
// ABA 1: MULTI-PAYOUT — com coluna Custom
// ═══════════════════════════════════════════════════════════
const MULTI_PAYOUTS = [50,55,60,65,70,75,80,85,90];

function calcMulti() {
  const conta  = parseFloat(document.getElementById('m_conta').value)  || 100000;
  const ir     = parseFloat(document.getElementById('m_ir').value)     || 6;
  const taxa   = parseFloat(document.getElementById('m_taxa').value)   || 2;
  const step   = parseFloat(document.getElementById('m_step').value)   || 0.25;
  const fim    = parseFloat(document.getElementById('m_fim').value)    || 10;
  const custom = parseFloat(document.getElementById('m_custom').value) || 88;
  const cot    = globalCot;

  document.getElementById('multiTbody').innerHTML = genSteps(step, fim).map(pct => {
    const lucroUSD = conta * (pct/100);
    const cols = MULTI_PAYOUTS.map(p => {
      const liq = liqBRL(lucroUSD, p, cot, ir, taxa);
      return `<td class="${p>=80?'cg':p>=65?'cy':'cm'}">${pfFR(liq)}</td>`;
    }).join('');
    const liqCustom = liqBRL(lucroUSD, custom, cot, ir, taxa);
    return `<tr><td class="al cy">${pct.toFixed(2)}%</td><td class="cb">${fU(lucroUSD)}</td>${cols}<td class="cp" style="font-weight:700">${pfFR(liqCustom)}</td></tr>`;
  }).join('');
  saveState();
}

// ═══════════════════════════════════════════════════════════
// ABA 2: CALCULADORA — assertividade, SL/Gain dia
// ═══════════════════════════════════════════════════════════
function calcSaque() {} // removido

function calcPropFirm() {
  const conta    = parseFloat(document.getElementById('pf_conta').value)    || 100000;
  const ddmax    = parseFloat(document.getElementById('pf_ddmax').value)    || 10;
  const dddaily  = parseFloat(document.getElementById('pf_dddaily').value)  || 5;
  const meta     = parseFloat(document.getElementById('pf_meta').value)     || 8;
  const stops    = parseFloat(document.getElementById('pf_stops').value)    || 20;
  const entradas = parseFloat(document.getElementById('pf_entradas').value) || 4;
  const rrr      = parseFloat(document.getElementById('pf_rrr').value)      || 1;
  const assert_  = parseFloat(document.getElementById('pf_assert').value)   || 60;
  const payout   = parseFloat(document.getElementById('pf_payout').value)   || 80;
  const ir       = parseFloat(document.getElementById('pf_ir').value)       || 15;
  const taxa     = parseFloat(document.getElementById('pf_taxa').value)     || 2;
  const slPct    = parseFloat(document.getElementById('pf_sl_dia').value)   || 1;    // % da conta
  const gainPct  = parseFloat(document.getElementById('pf_gain_dia').value) || 2;   // % da conta
  const cot      = globalCot;

  const riscoPct   = (ddmax/100) / stops;
  const riscoUSD   = conta * riscoPct;
  const alvoTrade  = riscoUSD * rrr;
  const ddMaxUSD   = conta * ddmax/100;
  const ddDailyUSD = conta * dddaily/100;
  const stopsMax   = flr(ddMaxUSD / riscoUSD);
  const stopsDia   = flr(ddDailyUSD / riscoUSD);
  const metaUSD    = conta * (meta/100);
  const trades     = alvoTrade > 0 ? ceil(metaUSD / alvoTrade) : 0;
  const dias       = ceil(trades / entradas);
  const expectativa = (assert_/100) * rrr - (1 - assert_/100);
  const tradesAssert = expectativa > 0 ? ceil(metaUSD / (riscoUSD * expectativa)) : null;
  const liq        = liqBRL(metaUSD, payout, cot, ir, taxa);
  const slUSD      = conta * (slPct/100);
  const gainUSD    = conta * (gainPct/100);

  document.getElementById('pf_r1').textContent         = fP(riscoPct);
  document.getElementById('pf_r2').textContent         = fU(riscoUSD);
  document.getElementById('pf_ddmax_usd').textContent  = fU(ddMaxUSD);
  document.getElementById('pf_stops_max').textContent  = stopsMax + ' stops p/ perder conta';
  document.getElementById('pf_dddaily_usd').textContent= fU(ddDailyUSD);
  document.getElementById('pf_r3').textContent         = stopsDia + ' stops p/ limite diário';
  document.getElementById('pf_r4').textContent         = fU(metaUSD);
  document.getElementById('pf_r5').textContent         = trades + ' trades';
  document.getElementById('pf_r5sub').textContent      = tradesAssert ? `Com ${assert_}% assertividade: ~${tradesAssert} trades` : 'Expectativa negativa neste RRR';
  document.getElementById('pf_r6').textContent         = dias + ' dias úteis';
  document.getElementById('pf_alvo_usd').textContent   = fU(alvoTrade);
  document.getElementById('pf_sl_usd').textContent     = fU(slUSD);
  document.getElementById('pf_gain_usd').textContent   = fU(gainUSD);
  document.getElementById('pf_r7').textContent         = pfFR(liq);
  document.getElementById('pf_r7sub').textContent      = `meta ${meta}% → ${fU(metaUSD)} · Expect: ${expectativa>=0?'+':''}${(expectativa*100).toFixed(2)}%/trade`;
  saveState();
}

// ═══════════════════════════════════════════════════════════
// ABA 3: GRANDES CONTAS — sem ini, sem nganhos
// ═══════════════════════════════════════════════════════════
const GC_SIZES = [1000,2000,5000,10000,25000,50000,75000,100000,150000,200000,300000,400000];

function calcGrandes() {
  const payout = parseFloat(document.getElementById('gc_payout').value) || 80;
  const ir     = parseFloat(document.getElementById('gc_ir').value)     || 6;
  const taxa   = parseFloat(document.getElementById('gc_taxa').value)   || 2;
  const alvoR  = parseFloat(document.getElementById('gc_alvo').value)   || 5000;
  const step   = parseFloat(document.getElementById('gc_step').value)   || 0.25;
  const fim    = parseFloat(document.getElementById('gc_fim').value)    || 10;
  const cot    = globalCot;

  document.getElementById('grandesTbody').innerHTML = genSteps(step, fim).map(pct => {
    const cols = GC_SIZES.map(sz => {
      const liq = liqBRL(sz * (pct/100), payout, cot, ir, taxa);
      const cls = liq >= alvoR ? 'cg' : liq >= alvoR*0.5 ? 'cy' : 'cm';
      return `<td class="${cls}">${pfFR(liq)}</td>`;
    }).join('');
    return `<tr><td class="al cy">${pct.toFixed(2)}%</td>${cols}</tr>`;
  }).join('');
  saveState();
}

// ═══════════════════════════════════════════════════════════
// HELPER FASES — renderiza todos os blocos da planilha
// ═══════════════════════════════════════════════════════════
const RRR_LABELS = ['0.618','1:1','1.141','1.618','1:2'];
const RRR_VALS   = [0.618, 1, 1.141, 1.618, 2];
const NIV_LABELS = ['100% Cheio','75% (3/4)','50% Meia','25% (1/4)'];
const NIV_FACTS  = [1, 0.75, 0.5, 0.25];

function secLabel(icon, title) {
  return `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.1em;padding:8px 0 5px;margin-top:14px;border-top:1px solid var(--border)">${icon} ${title}</div>`;
}

function renderFase(targetId, p) {
  // p = { conta, ddmax, dddaily, stops, entradas, payout, ir, taxa, metas:[{label,pct}], assert_, nAssert }
  const cot     = globalCot;
  const rBase   = (p.ddmax/100) / p.stops;   // risco cheio decimal

  // ── 1. RISCO POR NÍVEL ──────────────────────────────────
  let html = secLabel('📊','Risco por Nível');
  html += `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th class="al">Métrica</th>${NIV_LABELS.map(l=>`<th>${l}</th>`).join('')}
  </tr></thead><tbody>`;

  const nivelRows = [
    { label:'Risco/Entrada %',                fn: f => (rBase*f*100).toFixed(3)+'%' },
    { label:'Risco/Entrada USD',              fn: f => fU(p.conta*rBase*f) },
    { label:'Risco/Entrada BRL',              fn: f => pfFR(p.conta*rBase*f*cot) },
    { label:'Stops p/ Perder DD Máximo',      fn: f => flr((p.ddmax/100)/(rBase*f))+' stops' },
    { label:'Stops p/ Perder DD Diário',      fn: f => flr((p.dddaily/100)/(rBase*f))+' stops' },
    { label:'Stop Diário USD (fixo)',         fn: f => f===1 ? fU(p.conta*p.dddaily/100) : '—' },
  ];
  html += nivelRows.map(r =>
    `<tr><td class="al cm">${r.label}</td>${NIV_FACTS.map(f=>`<td>${r.fn(f)}</td>`).join('')}</tr>`
  ).join('');
  html += '</tbody></table></div>';

  // ── 2. ALVOS POR RRR × NÍVEL ────────────────────────────
  html += secLabel('🎯','Alvos por RRR × Nível de Risco');
  html += `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th class="al">RRR</th>${NIV_LABELS.map(l=>`<th>${l} (USD)</th>`).join('')}<th class="al cm">Descrição</th>
  </tr></thead><tbody>`;
  const rrrDesc = ['Take parcial / Fibonacci 61,8%','Par — risco igual ao retorno','Raiz quadrada de 1,3','Golden Ratio (φ)','Dobro do risco'];
  html += RRR_VALS.map((rv,ri) =>
    `<tr><td class="al cb">${RRR_LABELS[ri]}</td>${NIV_FACTS.map(f=>`<td class="cg">${fU(p.conta*rBase*f*rv)}</td>`).join('')}<td class="al cm" style="font-size:10px">${rrrDesc[ri]}</td></tr>`
  ).join('');
  html += '</tbody></table></div>';

  // ── 3. EXPOSIÇÃO AO RISCO ───────────────────────────────
  html += secLabel('⚠️','Exposição ao Risco — Risco Cheio (100%)');
  html += `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th class="al">Período</th><th>Dias</th><th>Entradas</th><th>Risco %</th><th>Risco USD</th><th>% do DD Max</th>
  </tr></thead><tbody>`;
  [[1,'Diário'],[5,'Semanal'],[10,'Quinzenal'],[22,'Mensal']].forEach(([dias, label]) => {
    const ents    = dias * p.entradas;
    const riscPct = ents * rBase;
    const riscUSD = riscPct * p.conta;
    const pctDD   = riscPct / (p.ddmax/100);
    const cls     = pctDD > 0.8 ? 'cr' : pctDD > 0.5 ? 'cy' : 'cg';
    html += `<tr><td class="al cm">${label}</td><td>${dias}</td><td>${ents}</td>
      <td class="${cls}">${(riscPct*100).toFixed(2)}%</td>
      <td class="${cls}">${fU(riscUSD)}</td>
      <td class="${cls}">${(pctDD*100).toFixed(1)}%</td></tr>`;
  });
  html += '</tbody></table></div>';

  // ── 4. GAINS POR FASE (trades para bater meta) ──────────
  p.metas.forEach(meta => {
    html += secLabel('📈', `Gains — ${meta.label} (Meta ${meta.pct}% → ${fU(p.conta*meta.pct/100)})`);
    html += `<div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th class="al">RRR</th>${NIV_LABELS.map(l=>`<th>${l}</th>`).join('')}
    </tr></thead><tbody>`;
    html += RRR_VALS.map((rv,ri) => {
      const cells = NIV_FACTS.map(f => {
        const alvoT  = p.conta * rBase * f * rv;
        const trades = ceil((meta.pct/100) / (rBase*f*rv));
        const dias   = ceil(trades / p.entradas);
        const liq    = liqBRL(p.conta*meta.pct/100, p.payout, cot, p.ir, p.taxa);
        return `<td><span class="cp">${trades} trades</span> / <span class="cm">${dias}d</span><br><span style="font-size:9px;color:var(--green)">${pfFR(liq)}</span></td>`;
      }).join('');
      return `<tr><td class="al cb">${RRR_LABELS[ri]}</td>${cells}</tr>`;
    }).join('');
    html += '</tbody></table></div>';
  });

  // ── 5. SIMULAÇÃO POR ASSERTIVIDADE ──────────────────────
  html += secLabel('🔢','Simulação por Assertividade');
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
    <div class="field" style="margin:0"><label>Assertividade %</label><div class="iu"><input type="number" id="${targetId}_assert" value="${p.assert_}" step="1" min="1" max="100" oninput="recalcAssert('${targetId}')"><span class="u">%</span></div></div>
    <div class="field" style="margin:0"><label>Total de Entradas</label><input type="number" id="${targetId}_nent" value="${p.nAssert}" min="1" oninput="recalcAssert('${targetId}')"></div>
  </div>
  <div id="${targetId}_assertTable"></div>`;

  document.getElementById(targetId).innerHTML = html;

  // Preencher tabela de assertividade após render
  renderAssertTable(targetId, p.conta, rBase, p.assert_, p.nAssert, cot);
}

function renderAssertTable(targetId, conta, rBase, assertPct, nEnt, cot) {
  const wr  = assertPct / 100;
  const gains = Math.round(wr * nEnt);
  const stops = nEnt - gains;
  let rows = '';
  RRR_VALS.forEach((rv, ri) => {
    NIV_FACTS.forEach((f, fi) => {
      const lucPct  = gains  * rBase * f * rv;
      const perdPct = stops  * rBase * f;
      const resPct  = lucPct - perdPct;
      const resUSD  = resPct * conta;
      const expTrade = resUSD / nEnt;
      const cls = resPct > 0 ? 'cg' : resPct < 0 ? 'cr' : 'cm';
      rows += `<tr>
        <td class="al" style="font-size:10px">${RRR_LABELS[ri]} × ${NIV_LABELS[fi]}</td>
        <td class="cg">${gains}</td><td class="cr">${stops}</td>
        <td class="${cls}">${(lucPct*100).toFixed(2)}%</td>
        <td class="cr">−${(perdPct*100).toFixed(2)}%</td>
        <td class="${cls}">${(resPct*100).toFixed(2)}%</td>
        <td class="${cls}">${fU(resUSD)}</td>
        <td class="${cls}">${fU(expTrade)}/trade</td>
      </tr>`;
    });
  });
  const el = document.getElementById(targetId+'_assertTable');
  if (el) el.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th class="al">RRR × Nível</th><th>Gains</th><th>Stops</th>
    <th>Lucro %</th><th>Perda %</th><th>Result %</th><th>Result USD</th><th>Expect/Trade</th>
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function recalcAssert(targetId) {
  const a  = parseFloat(document.getElementById(targetId+'_assert').value) || 50;
  const n  = parseFloat(document.getElementById(targetId+'_nent').value)   || 20;
  // Recalcular rBase do targetId
  let rBase, conta;
  if (targetId === 'f2Results') {
    conta = parseFloat(document.getElementById('f2_conta').value)||100000;
    rBase = ((parseFloat(document.getElementById('f2_ddmax').value)||10)/100) / (parseFloat(document.getElementById('f2_stops').value)||40);
  } else if (targetId === 'f1Results') {
    conta = parseFloat(document.getElementById('f1_conta').value)||50000;
    rBase = ((parseFloat(document.getElementById('f1_ddmax').value)||6)/100) / (parseFloat(document.getElementById('f1_stops').value)||20);
  } else {
    conta = parseFloat(document.getElementById('in_conta').value)||50000;
    rBase = ((parseFloat(document.getElementById('in_ddmax').value)||5)/100) / (parseFloat(document.getElementById('in_stops').value)||20);
  }
  renderAssertTable(targetId, conta, rBase, a, n, globalCot);
}

function renderFaseResult(targetId, conta, ddmax, stops, cot, metas, entradas, payout, ir, taxa) {
  renderFase(targetId, { conta, ddmax, dddaily: ddmax/2, stops, entradas, payout, ir, taxa, metas, assert_: 53, nAssert: 40 });
}

function calc2Fases() {
  const conta = parseFloat(document.getElementById('f2_conta').value) || 100000;
  const sl    = parseFloat(document.getElementById('f2_sl').value)    || 1;
  const gain  = parseFloat(document.getElementById('f2_gain').value)  || 2;
  document.getElementById('f2_sl_usd').textContent   = fU(conta * sl/100);
  document.getElementById('f2_gain_usd').textContent = fU(conta * gain/100);
  const p = {
    conta,
    ddmax:    parseFloat(document.getElementById('f2_ddmax').value)    || 10,
    dddaily:  parseFloat(document.getElementById('f2_dddaily').value)  || 5,
    stops:    parseFloat(document.getElementById('f2_stops').value)    || 40,
    meta1:    parseFloat(document.getElementById('f2_meta1').value)    || 8,
    meta2:    parseFloat(document.getElementById('f2_meta2').value)    || 5,
    metaf:    parseFloat(document.getElementById('f2_metaf').value)    || 5,
    entradas: parseFloat(document.getElementById('f2_entradas').value) || 4,
    payout:   parseFloat(document.getElementById('f2_payout').value)   || 80,
    ir:       parseFloat(document.getElementById('f2_ir').value)       || 15,
    taxa:     parseFloat(document.getElementById('f2_taxa').value)     || 2,
    assert_: 53, nAssert: 40,
  };
  renderFase('f2Results', { ...p, metas: [
    { label:'Fase 1', pct: p.meta1 },
    { label:'Fase 2', pct: p.meta2 },
    { label:'Funded Mensal', pct: p.metaf },
  ]});
  saveState();
}

function calc1Fase() {
  const conta = parseFloat(document.getElementById('f1_conta').value) || 50000;
  const sl    = parseFloat(document.getElementById('f1_sl').value)    || 1;
  const gain  = parseFloat(document.getElementById('f1_gain').value)  || 2;
  document.getElementById('f1_sl_usd').textContent   = fU(conta * sl/100);
  document.getElementById('f1_gain_usd').textContent = fU(conta * gain/100);
  const p = {
    conta,
    ddmax:    parseFloat(document.getElementById('f1_ddmax').value)    || 6,
    dddaily:  parseFloat(document.getElementById('f1_dddaily').value)  || 3,
    stops:    parseFloat(document.getElementById('f1_stops').value)    || 20,
    metap:    parseFloat(document.getElementById('f1_metap').value)    || 10,
    metaf:    parseFloat(document.getElementById('f1_metaf').value)    || 5,
    entradas: parseFloat(document.getElementById('f1_entradas').value) || 4,
    payout:   parseFloat(document.getElementById('f1_payout').value)   || 80,
    ir:       parseFloat(document.getElementById('f1_ir').value)       || 15,
    taxa:     parseFloat(document.getElementById('f1_taxa').value)     || 2,
    assert_: 50, nAssert: 20,
  };
  renderFase('f1Results', { ...p, metas: [
    { label:'Prova / Phase', pct: p.metap },
    { label:'Funded Mensal', pct: p.metaf },
  ]});
  saveState();
}

function calcInstant() {
  const conta = parseFloat(document.getElementById('in_conta').value) || 50000;
  const sl    = parseFloat(document.getElementById('in_sl').value)    || 1;
  const gain  = parseFloat(document.getElementById('in_gain').value)  || 2;
  document.getElementById('in_sl_usd').textContent   = fU(conta * sl/100);
  document.getElementById('in_gain_usd').textContent = fU(conta * gain/100);
  const p = {
    conta,
    ddmax:    parseFloat(document.getElementById('in_ddmax').value)    || 5,
    dddaily:  parseFloat(document.getElementById('in_dddaily').value)  || 3,
    stops:    parseFloat(document.getElementById('in_stops').value)    || 20,
    metaf:    parseFloat(document.getElementById('in_metaf').value)    || 5,
    entradas: parseFloat(document.getElementById('in_entradas').value) || 4,
    payout:   parseFloat(document.getElementById('in_payout').value)   || 95,
    ir:       parseFloat(document.getElementById('in_ir').value)       || 15,
    taxa:     parseFloat(document.getElementById('in_taxa').value)     || 2,
    assert_: 50, nAssert: 20,
  };
  renderFase('inResults', { ...p, metas: [
    { label:'Funded Mensal', pct: p.metaf },
  ]});
  saveState();
}

// ═══════════════════════════════════════════════════════════
// ABA 7: RRR UNIFICADO
// ═══════════════════════════════════════════════════════════
const RRR_VALUES = [
  { label: '0.618', v: 0.618 },
  { label: '1:1',   v: 1.000 },
  { label: '1.141', v: 1.141 },
  { label: '1.618', v: 1.618 },
  { label: '1:2',   v: 2.000 },
];

function gerarCenarios(rrr) {
  return TradeDiaryStudyHubCalculations.gerarCenarios(rrr);
}

function calcRRR() {
  const conta   = parseFloat(document.getElementById('r_conta').value)   || 50000;
  const ddmax   = parseFloat(document.getElementById('r_ddmax').value)   || 10;
  const dddaily = parseFloat(document.getElementById('r_dddaily').value) || 5;
  const stops   = parseFloat(document.getElementById('r_stops').value)   || 20;
  const slPct   = parseFloat(document.getElementById('r_sl').value)      || 1;
  const gainPct = parseFloat(document.getElementById('r_gain').value)    || 2;
  const cot     = globalCot;
  const riscoPct = (ddmax/100) / stops;

  // Painel nível de risco (4 boxes) — agora com stops DD Max E DD Diário
  const niveis = [{n:'100% Cheio',f:1},{n:'75% (3/4)',f:0.75},{n:'50% Meia',f:0.5},{n:'25% (1/4)',f:0.25}];
  document.getElementById('rrrInfo').innerHTML = niveis.map(nv => {
    const rp      = riscoPct * nv.f;
    const rUSD    = conta * rp;
    const stopsMax = flr((ddmax/100)   / rp);
    const stopsDia = flr((dddaily/100) / rp);
    return `<div class="out-box" style="padding:8px">
      <div class="out-lbl" style="color:var(--blue)">${nv.n}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--yellow);margin:3px 0">${(rp*100).toFixed(3)}% · ${fU(rUSD)}</div>
      <div style="font-size:10px;color:var(--red)">${stopsMax} stops p/ perder conta (DD Máx)</div>
      <div style="font-size:10px;color:var(--orange)">${stopsDia} stops p/ limite diário (DD Diário)</div>
      <div style="font-size:10px;color:var(--dim)">${pfFR(rUSD * cot)} / trade (BRL)</div>
    </div>`;
  }).join('');

  // Painel metas do dia (DD, SL, Gain em USD)
  document.getElementById('rrrDayInfo').innerHTML = [
    { lbl:'DD Máximo (USD)',    val: fU(conta*ddmax/100),  cls:'cr' },
    { lbl:'DD Diário (USD)',    val: fU(conta*dddaily/100), cls:'cr' },
    { lbl:'Meta SL / dia (USD)',val: fU(conta*slPct/100),  cls:'cr' },
    { lbl:'Meta Gain / dia (USD)',val:fU(conta*gainPct/100),cls:'cg' },
  ].map(b => `<div class="out-box" style="padding:8px;text-align:center">
    <div class="out-lbl">${b.lbl}</div>
    <div class="out-big ${b.cls}" style="font-size:16px">${b.val}</div>
  </div>`).join('');

  // 5 colunas RRR
  const grid = document.getElementById('rrrGrid');
  grid.innerHTML = RRR_VALUES.map(rr => {
    const cenarios = gerarCenarios(rr.v);
    let curN = 0;
    const rows = cenarios.map(c => {
      let sep = '';
      if (c.n !== curN) {
        curN = c.n;
        sep = `<tr><td colspan="4" style="background:var(--bg3);color:var(--dim);font-size:9px;padding:3px 6px;font-family:'JetBrains Mono',monospace;text-align:center;letter-spacing:.08em">— ${c.n} Op${c.n>1?'s':''} —</td></tr>`;
      }
      const pnlUSD = c.pnl * riscoPct * conta;
      const pnlBRL = pnlUSD * cot;
      const cls    = c.type==='pos'?'cg':c.type==='neg'?'cr':'cm';
      return `${sep}<tr>
        <td class="al" style="font-size:10px;padding:3px 5px">${c.label}</td>
        <td class="${cls}" style="font-size:10px;padding:3px 4px">${c.pnl>=0?'+':''}${(c.pnl*100).toFixed(1)}%</td>
        <td class="${cls}" style="font-size:10px;padding:3px 4px">${c.pnl>=0?'+':''}${fU(pnlUSD)}</td>
        <td class="${cls}" style="font-size:10px;padding:3px 4px">${c.pnl>=0?'+':''}${pfFR(pnlBRL)}</td>
      </tr>`;
    }).join('');
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <div style="background:var(--bg3);padding:6px 10px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:var(--blue);border-bottom:1px solid var(--border)">RRR ${rr.label}</div>
      <table class="tbl" style="font-size:10px">
        <thead><tr><th class="al" style="font-size:8px">Cenário</th><th style="font-size:8px">%</th><th style="font-size:8px">USD</th><th style="font-size:8px">BRL</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');
  saveState();
}

function calcRRRManual() {} // removido

// ═══════════════════════════════════════════════════════════
// PERSISTÊNCIA — JSON
// ═══════════════════════════════════════════════════════════
function collectState() {
  const ids = ['s_conta','s_payout','s_ddmax','s_dddaily','s_ir','s_taxa','s_rrr','s_stops',
    'm_conta','m_ir','m_taxa',
    'sq_conta','sq_lucro','sq_payout','sq_ir','sq_taxa',
    'pf_conta','pf_ddmax','pf_dddaily','pf_meta','pf_stops','pf_entradas','pf_rrr','pf_payout','pf_ir','pf_taxa',
    'gc_payout','gc_ir','gc_taxa',
    'f2_conta','f2_ddmax','f2_dddaily','f2_stops','f2_meta1','f2_meta2','f2_metaf','f2_entradas','f2_payout','f2_ir','f2_taxa',
    'f1_conta','f1_ddmax','f1_dddaily','f1_stops','f1_metap','f1_metaf','f1_entradas','f1_payout','f1_ir','f1_taxa',
    'in_conta','in_ddmax','in_dddaily','in_stops','in_metaf','in_entradas','in_payout','in_ir','in_taxa',
    'r_conta','r_ddmax','r_stops','r_pos','r_stop_m','r_rrr_m'];
  const state = { cot: globalCot, v: '1.0', ts: Date.now() };
  ids.forEach(id => { const el = document.getElementById(id); if(el) state[id] = el.value; });
  return state;
}

function applyState(state) {
  if (state.cot) { globalCot = parseFloat(state.cot); document.getElementById('gCot').value = globalCot.toFixed(2); pfSetCot(globalCot); }
  Object.keys(state).forEach(k => { const el = document.getElementById(k); if(el) el.value = state[k]; });
}

function saveState() {
  try { TradeDiaryStudyHubStorage.writePropFirmState(collectState()); } catch(e) {}
}

function exportState() {
  const s = collectState();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }));
  a.download = 'propfirm_config_' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function importState(e) {
  const f = e.target.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ev => {
    try {
      const s = JSON.parse(ev.target.result);
      applyState(s);
      calcAll();
    } catch(err) { alert('Arquivo inválido'); }
  };
  rd.readAsText(f);
}

// Upload por fase (CSV ou JSON)
function importFase(e, key) {
  const f = e.target.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ev => {
    try {
      if (f.name.endsWith('.json')) {
        const s = JSON.parse(ev.target.result);
        applyState(s);
        calcAll();
      } else {
        // CSV simples key=value
        const lines = ev.target.result.split('\n');
        lines.forEach(l => {
          const [k, v] = l.split(',');
          if(k && v) { const el = document.getElementById(k.trim()); if(el) el.value = v.trim(); }
        });
        calcAll();
      }
    } catch(err) { alert('Erro ao importar arquivo'); }
  };
  rd.readAsText(f);
}

function exportFase(key) {
  exportState(); // por simplicidade exporta o estado completo
}

// ═══════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════
function pfTab(i) {
  const scope = document.getElementById('pf-app') || document;
  scope.querySelectorAll('.tab-btn').forEach((b, j) => b.classList.toggle('active', j===i));
  scope.querySelectorAll('.tab-panel').forEach((p, j) => p.classList.toggle('active', j===i));
}

// ═══════════════════════════════════════════════════════════
// CALCULAR TUDO
// ═══════════════════════════════════════════════════════════
function calcAll() {
  calcSimulador(); calcMulti(); calcSaque(); calcPropFirm();
  calcGrandes(); calc2Fases(); calc1Fase(); calcInstant(); calcRRR();
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
shAddLoad( () => {
  // Restaurar estado salvo
  try {
    const saved = TradeDiaryStudyHubStorage.readPropFirmState();
    if (saved) applyState(JSON.parse(saved));
  } catch(e) {}

  // Usar cotação do hub (já propagada via hubSetCot)
  const hubCotEl = document.getElementById('hubCot');
  if (hubCotEl) { globalCot = parseFloat(hubCotEl.value) || globalCot; }

  document.getElementById('gCot').value = globalCot.toFixed(2);
  document.getElementById('cotBadge').textContent = 'R$ ' + globalCot.toFixed(2).replace('.', ',');

  calcAll();
});

return {pfSetCot, pfTab, calcSimulador, calcMulti, calcPropFirm, calcGrandes, calc2Fases, calc1Fase, calcInstant, calcRRR, importFase, exportFase};
};
