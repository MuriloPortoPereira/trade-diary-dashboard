globalThis.TradeDiaryStudyHubTradeSim = function createStudyHubTradeSim(shAddLoad) {
// ─── SYNC RANGE/INPUT ───
function syncRange(inputId, rangeId, val, unit) {
  document.getElementById(inputId).value = val;
  document.getElementById(rangeId+'Val').textContent = val + unit;
  recalcRRR(); recalcAll();
}
function syncInput(inputId, rangeId, val, unit) {
  document.getElementById(rangeId).value = val;
  document.getElementById(rangeId+'Val').textContent = val + unit;
  recalcRRR(); recalcAll();
}

function recalcAll() {
  recalcMetrics();
  buildScenarios();
  buildRecovery();
  buildIntraday();
}

document.getElementById('sl')?.addEventListener('input', () => { recalcRRR(); recalcAll(); });
document.getElementById('tp')?.addEventListener('input', () => { recalcRRR(); recalcAll(); });
['ts-capital','risk','dailyStop','dailyTarget','trades','wr','days','cycles','seqTrades','tradesPerCycle'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', recalcAll);
});

function recalcRRR() {
  const sl = parseFloat(document.getElementById('sl').value) || 1;
  const tp = parseFloat(document.getElementById('tp').value) || 1;
  document.getElementById('rrrDisplay').textContent = `1 : ${(tp/sl).toFixed(2)}`;
}

// ─── GET PARAMS ───
function P() {
  return {
    capital: parseFloat(document.getElementById('ts-capital').value) || 10000,
    risk: parseFloat(document.getElementById('risk').value) || 1,
    dailyStop: parseFloat(document.getElementById('dailyStop').value) || 2,
    dailyTarget: parseFloat(document.getElementById('dailyTarget').value) || 1,
    sl: parseFloat(document.getElementById('sl').value) || 1,
    tp: parseFloat(document.getElementById('tp').value) || 1,
    trades: parseInt(document.getElementById('trades').value) || 10,
    wr: parseFloat(document.getElementById('wr').value) / 100 || 0.55,
    days: parseInt(document.getElementById('days').value) || 60,
    cycles: parseInt(document.getElementById('cycles').value) || 200,
    seqTrades: parseInt(document.getElementById('seqTrades').value) || 40,
    tradesPerCycle: parseInt(document.getElementById('tradesPerCycle').value) || 10,
  };
}

// ─── METRICS ───
function recalcMetrics() {
  const p = P();
  const rrr = p.tp / p.sl;
  const beWR = 1 / (1 + rrr);
  const ev = (p.wr * p.tp) - ((1 - p.wr) * p.sl);
  const dailyEV = ev * p.trades; // simplified (ignoring daily stop)
  const maxSL = Math.floor(p.dailyStop / p.sl);
  const proj20 = Math.pow(1 + ev/100, p.trades * 20) * p.capital;

  const beColor = p.wr > beWR ? 'col-green' : p.wr > beWR * 0.9 ? 'col-yellow' : 'col-red';
  const evColor = ev > 0 ? 'col-green' : 'col-red';

  document.getElementById('mBeWR').textContent = (beWR * 100).toFixed(1) + '%';
  document.getElementById('mBeWR').className = 'metric-value ' + (p.wr > beWR ? 'col-green' : 'col-red');
  document.getElementById('mEV').textContent = (ev >= 0 ? '+' : '') + ev.toFixed(3) + '%';
  document.getElementById('mEV').className = 'metric-value ' + evColor;
  document.getElementById('mDailyEV').textContent = (dailyEV >= 0 ? '+' : '') + dailyEV.toFixed(2) + '%';
  document.getElementById('mDailyEV').className = 'metric-value ' + evColor;
  document.getElementById('mMaxSL').textContent = maxSL + ' SL';
  document.getElementById('mProj20').textContent = (proj20 >= p.capital ? '+' : '') + '$' + Math.round(proj20 - p.capital).toLocaleString('pt-BR');
  document.getElementById('mProj20').className = 'metric-value ' + (proj20 >= p.capital ? 'col-green' : 'col-red');

  // Warning
  const warn = document.getElementById('warningText');
  const warnBox = document.getElementById('warningBox');
  if (p.wr < beWR) {
    warnBox.style.background = 'rgba(248,81,73,.08)';
    warnBox.style.borderColor = 'rgba(248,81,73,.3)';
    warn.innerHTML = `❌ Seu win rate de <strong>${(p.wr*100).toFixed(0)}%</strong> está <strong>abaixo do breakeven (${(beWR*100).toFixed(1)}%)</strong>. Com este setup, cada trade operado gera expectativa negativa de <strong>${Math.abs(ev).toFixed(3)}%</strong>. A conta vai a zero no longo prazo.`;
    warn.style.color = 'var(--red)';
  } else if (p.wr < beWR * 1.1) {
    warnBox.style.background = 'rgba(227,179,65,.07)';
    warnBox.style.borderColor = 'rgba(227,179,65,.25)';
    warn.innerHTML = `⚠️ Seu win rate de <strong>${(p.wr*100).toFixed(0)}%</strong> está apenas <strong>${((p.wr - beWR)*100).toFixed(1)}% acima do breakeven</strong>. A margem de segurança é pequena — qualquer período de drawdown pode virar a conta.`;
    warn.style.color = 'var(--yellow)';
  } else {
    warnBox.style.background = 'rgba(63,185,80,.07)';
    warnBox.style.borderColor = 'rgba(63,185,80,.25)';
    warn.innerHTML = `✅ Win rate de <strong>${(p.wr*100).toFixed(0)}%</strong> está <strong>${((p.wr - beWR)*100).toFixed(1)}% acima do breakeven (${(beWR*100).toFixed(1)}%)</strong>. Expectativa positiva de <strong>+${ev.toFixed(3)}%</strong> por trade. Continue monitorando a consistência.`;
    warn.style.color = 'var(--green)';
  }

  document.getElementById('seqN').textContent = p.seqTrades;
  document.getElementById('cycleN').textContent = p.tradesPerCycle;
  recalcRRR();
}

// ─── SCENARIO TABLE ───
function buildScenarios() {
  const p = P();
  const body = document.querySelector('#scenarioTable tbody');
  body.innerHTML = '';
  const scenarios = [
    { name: 'Muito Ruim', wr: 0.20, color: 'rgba(248,81,73,.9)' },
    { name: 'Ruim', wr: 0.35, color: 'rgba(240,136,62,.9)' },
    { name: 'Mediano', wr: 0.50, color: 'rgba(227,179,65,.9)' },
    { name: 'Breakeven', wr: p.sl / (p.sl + p.tp), color: 'rgba(107,125,143,.9)' },
    { name: 'Bom', wr: 0.60, color: 'rgba(99,169,255,.9)' },
    { name: 'Muito Bom', wr: 0.70, color: 'rgba(63,185,80,.9)' },
    { name: 'Seu WR', wr: p.wr, color: 'rgba(188,140,255,.9)' },
  ];
  scenarios.forEach(s => {
    const days = p.days;
    const winD = Math.round(s.wr * days);
    const lossD = days - winD;
    const result = (winD * p.dailyTarget) - (lossD * p.dailyStop);
    const finalCap = p.capital * (1 + result/100);
    const diff = finalCap - p.capital;
    let badge = result > 2 ? 'badge-green' : result >= 0 ? 'badge-yellow' : result > -10 ? 'badge-red' : 'badge-red';
    let label = result > 2 ? 'Lucrativo' : result >= -1 ? 'Breakeven' : 'Prejuízo';
    const isYou = s.name === 'Seu WR';
    body.innerHTML += `
      <tr style="${isYou ? 'background:rgba(188,140,255,0.04)' : ''}">
        <td><span style="display:inline-flex;align-items:center;gap:6px">
          <span style="width:7px;height:7px;border-radius:50%;background:${s.color};flex-shrink:0"></span>
          <span style="${isYou ? 'color:var(--purple);font-weight:600' : ''}">${s.name}</span>
        </span></td>
        <td class="mono" style="color:${s.color}">${(s.wr*100).toFixed(0)}%</td>
        <td class="mono col-green">${winD}</td>
        <td class="mono col-red">${lossD}</td>
        <td class="mono ${result >= 0 ? 'col-green' : 'col-red'}">${result >= 0 ? '+' : ''}${result.toFixed(1)}%</td>
        <td class="mono ${diff >= 0 ? 'col-green' : 'col-red'}">${diff >= 0 ? '+' : ''}$${Math.abs(diff).toFixed(0)}</td>
        <td><span class="badge ${badge}">${label}</span></td>
      </tr>`;
  });
}

// ─── RECOVERY TABLE ───
function buildRecovery() {
  const p = P();
  const body = document.querySelector('#recoveryTable tbody');
  body.innerHTML = '';
  const situations = [
    { label: '1 stop diário', stops: 1, missedGains: 0 },
    { label: '2 stops consecutivos', stops: 2, missedGains: 0 },
    { label: '3 stops consecutivos', stops: 3, missedGains: 0 },
    { label: '1 stop + 1 dia sem entrar', stops: 1, missedGains: 1 },
    { label: '1 stop + 2 dias sem entrar', stops: 1, missedGains: 2 },
    { label: '2 stops + 2 dias sem entrar', stops: 2, missedGains: 2 },
  ];
  situations.forEach(s => {
    const totalLoss = s.stops * p.sl;
    const missedReturn = s.missedGains * p.tp;
    const effectiveLoss = totalLoss;
    const daysNeeded = Math.ceil(effectiveLoss / p.tp);
    const needed = (effectiveLoss / (1 - effectiveLoss/100)).toFixed(2);
    const severity = daysNeeded <= 2 ? 'badge-yellow' : daysNeeded <= 5 ? 'badge-red' : 'badge-red';
    body.innerHTML += `
      <tr>
        <td style="font-size:11px">${s.label}${s.missedGains > 0 ? ` <span style="color:var(--dim);font-size:10px">(+${s.missedGains} dias perdidos)</span>` : ''}</td>
        <td class="mono col-red">−${totalLoss.toFixed(1)}%</td>
        <td class="mono col-yellow">${daysNeeded} dias</td>
        <td class="mono col-blue">+${needed}%</td>
      </tr>`;
  });
}

// ─── INTRADAY TABLE ───
function buildIntraday() {
  const p = P();
  const sl   = parseFloat(document.getElementById('id-sl').value) || p.sl;
  const dStop = parseFloat(document.getElementById('id-dailyStop').value) || p.dailyStop;
  const rrr  = p.tp / p.sl;
  const tp   = sl * rrr;
  const beWR = 1 / (1 + rrr);

  document.getElementById('id-rrrDisplay').textContent = `1 : ${rrr.toFixed(2)}`;
  document.getElementById('id-tpDisplay').textContent  = `${tp.toFixed(3)}%`;

  const body = document.querySelector('#intradayTable tbody');
  body.innerHTML = '';
  const stopAt = Math.max(1, Math.floor(dStop / sl));
  const maxT = Math.min(p.trades, stopAt + 2, 15);
  for (let n = 1; n <= maxT; n++) {
    const allWin  = (n * tp).toFixed(2);
    const half    = (n % 2 === 0) ? ((n/2 * tp) - (n/2 * sl)).toFixed(2) : '—';
    const allLoss = (n * sl).toFixed(2);
    const hitStop = n >= stopAt;
    const halfVal = half === '—' ? null : parseFloat(half);
    body.innerHTML += `
      <tr${hitStop ? ' style="opacity:0.5"' : ''}>
        <td class="mono col-blue">${n}</td>
        <td class="mono col-green">+${allWin}%</td>
        <td class="mono col-yellow">${half === '—' ? half : ((halfVal >= 0 ? '+' : '') + half + '%')}</td>
        <td class="mono col-red">−${allLoss}%</td>
        <td>${hitStop ? `<span class="badge badge-red">⛔ ${stopAt}º trade</span>` : `<span class="badge badge-muted">${stopAt - n} SL restantes</span>`}</td>
        <td class="mono col-blue">${(beWR * 100).toFixed(1)}%</td>
      </tr>`;
  }
}

// ─── SEQUENCE VIZ ───
function runSequence() {
  const p = P();
  const container = document.getElementById('tradeSeqViz');
  container.innerHTML = '';
  let equity = p.capital;
  let wins = 0, losses = 0, biggestLoss = 0, biggestWin = 0;
  let streak = 0, maxStreak = 0, lstreak = 0, maxLoss = 0;
  let dailyPnl = 0, tradeInDay = 0, dailyStopped = false;
  const dayResults = [];

  for (let i = 0; i < p.seqTrades; i++) {
    if (tradeInDay >= p.trades || dailyStopped) {
      dayResults.push(dailyPnl);
      dailyPnl = 0; tradeInDay = 0; dailyStopped = false;
    }
    const win = Math.random() < p.wr;
    const cell = document.createElement('div');
    cell.className = 'trade-cell';

    if (win) {
      const gain = p.risk * (p.tp / p.sl);
      equity *= (1 + gain/100);
      dailyPnl += gain;
      wins++;
      streak++; lstreak = 0;
      if (streak > maxStreak) maxStreak = streak;
      if (gain > biggestWin) biggestWin = gain;
      cell.classList.add('win');
      cell.textContent = 'W';
      cell.title = `+${gain.toFixed(2)}%`;
    } else {
      equity *= (1 - p.risk/100);
      dailyPnl -= p.risk;
      losses++;
      lstreak++; streak = 0;
      if (lstreak > maxLoss) maxLoss = lstreak;
      if (p.risk > biggestLoss) biggestLoss = p.risk;
      // check daily stop
      if (Math.abs(dailyPnl) >= p.dailyStop) {
        cell.classList.add('daily-stop');
        cell.textContent = '⛔';
        cell.title = `Stop diário atingido (${dailyPnl.toFixed(2)}%)`;
        dailyStopped = true;
      } else {
        cell.classList.add('loss');
        cell.textContent = 'L';
        cell.title = `-${p.risk.toFixed(2)}%`;
      }
    }
    tradeInDay++;
    container.appendChild(cell);
  }

  const totalReturn = ((equity - p.capital) / p.capital * 100);
  const stats = document.getElementById('seqStats');
  stats.innerHTML = `
    <div class="stat-card"><div class="lbl">Wins</div><div class="val col-green">${wins}</div><div class="sub">${(wins/(wins+losses)*100).toFixed(0)}% acerto</div></div>
    <div class="stat-card"><div class="lbl">Losses</div><div class="val col-red">${losses}</div><div class="sub">max ${maxLoss} consec.</div></div>
    <div class="stat-card"><div class="lbl">Retorno</div><div class="val ${totalReturn >= 0 ? 'col-green' : 'col-red'}">${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%</div><div class="sub">$${equity.toFixed(0)}</div></div>
    <div class="stat-card"><div class="lbl">Max Streak+</div><div class="val col-blue">${maxStreak}</div><div class="sub">trades seguidos</div></div>
  `;
}

// ─── CYCLE CANVAS ───
function buildCycles() {
  const p = P();
  const canvas = document.getElementById('cycleCanvas');
  const W = canvas.offsetWidth || 500;
  const H = 180;
  canvas.width = W * (window.devicePixelRatio||1);
  canvas.height = H * (window.devicePixelRatio||1);
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio||1, window.devicePixelRatio||1);

  // Total de ciclos baseado nos dias e trades configurados
  const totalCycles = Math.max(2, Math.min(40, Math.floor(p.days * p.trades / p.tradesPerCycle)));
  const numPaths = 20;
  const allSeries = [];
  const finalVals = [];

  for (let path = 0; path < numPaths; path++) {
    let eq = p.capital;
    const series = [eq]; // series[0] = capital inicial, series[c] = capital ao fim do ciclo c
    for (let c = 0; c < totalCycles; c++) {
      for (let t = 0; t < p.tradesPerCycle; t++) {
        const win = Math.random() < p.wr;
        eq = win ? eq * (1 + p.risk*(p.tp/p.sl)/100) : eq * (1 - p.risk/100);
      }
      series.push(eq);
    }
    allSeries.push(series);
    finalVals.push(eq);
  }

  const allVals = allSeries.flat();
  const minV = Math.min(...allVals) * 0.97;
  const maxV = Math.max(...allVals) * 1.03;
  const pad = { l: 55, r: 10, t: 10, b: 25 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  function toX(c) { return pad.l + (c / totalCycles) * cW; }
  function toY(v) { return pad.t + (1 - (v - minV)/(maxV - minV)) * cH; }

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = '#1e2533'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i/4)*cH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l+cW, y); ctx.stroke();
    const v = minV + ((4-i)/4)*(maxV-minV);
    ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'right';
    ctx.fillText('$'+v.toFixed(0), pad.l-4, y+3);
  }

  // baseline
  const baseY = toY(p.capital);
  ctx.strokeStyle = '#253447'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(pad.l, baseY); ctx.lineTo(pad.l+cW, baseY); ctx.stroke();
  ctx.setLineDash([]);

  // paths
  allSeries.forEach(s => {
    const final = s[s.length-1];
    const col = final > p.capital ? 'rgba(63,185,80,0.35)' : 'rgba(248,81,73,0.35)';
    ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    ctx.beginPath();
    s.forEach((v, c) => c === 0 ? ctx.moveTo(toX(c), toY(v)) : ctx.lineTo(toX(c), toY(v)));
    ctx.stroke();
  });

  // x axis labels (ciclos)
  ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
  const labelPoints = [0, Math.round(totalCycles/2), totalCycles];
  labelPoints.forEach(c => ctx.fillText('C'+c, toX(c), H-8));

  const winsN = finalVals.filter(v => v >= p.capital).length;
  const avgFinal = finalVals.reduce((a,b) => a+b, 0) / finalVals.length;
  document.getElementById('cycleStats').innerHTML = `
    <div class="stat-card"><div class="lbl">Paths Positivos</div><div class="val col-green">${winsN}/${numPaths}</div><div class="sub">${(winsN/numPaths*100).toFixed(0)}%</div></div>
    <div class="stat-card"><div class="lbl">Média Final</div><div class="val ${avgFinal >= p.capital ? 'col-green':'col-red'}">$${avgFinal.toFixed(0)}</div><div class="sub">${((avgFinal/p.capital-1)*100).toFixed(1)}%</div></div>
    <div class="stat-card"><div class="lbl">Melhor/Pior</div><div class="val col-blue">${((Math.max(...finalVals)/p.capital-1)*100).toFixed(1)}%</div><div class="sub">/ ${((Math.min(...finalVals)/p.capital-1)*100).toFixed(1)}%</div></div>
  `;
}

// ─── MONTE CARLO EQUITY ───
function buildMC() {
  const p = P();
  const canvas = document.getElementById('mcCanvas');
  const W = canvas.offsetWidth || 800;
  const H = 240;
  canvas.width = W * (window.devicePixelRatio||1);
  canvas.height = H * (window.devicePixelRatio||1);
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio||1, window.devicePixelRatio||1);

  const numCycles = Math.min(p.cycles, 500);
  const days = p.days;
  const allSeries = [];
  const finalVals = [];

  for (let c = 0; c < numCycles; c++) {
    let eq = p.capital;
    const series = [eq];
    for (let d = 0; d < days; d++) {
      let dayPnl = 0;
      for (let t = 0; t < p.trades; t++) {
        if (dayPnl <= -p.dailyStop) break;
        if (dayPnl >= p.dailyTarget) break;
        const win = Math.random() < p.wr;
        if (win) dayPnl += p.risk * (p.tp / p.sl);
        else dayPnl -= p.risk;
      }
      eq *= (1 + Math.max(-p.dailyStop, Math.min(p.dailyTarget, dayPnl))/100);
      series.push(eq);
    }
    allSeries.push(series);
    finalVals.push(series[series.length-1]);
  }

  finalVals.sort((a,b) => a-b);
  const p10 = finalVals[Math.floor(numCycles * 0.10)];
  const p25 = finalVals[Math.floor(numCycles * 0.25)];
  const p50 = finalVals[Math.floor(numCycles * 0.50)];
  const p75 = finalVals[Math.floor(numCycles * 0.75)];
  const p90 = finalVals[Math.floor(numCycles * 0.90)];
  const avgFinal = finalVals.reduce((a,b) => a+b, 0) / numCycles;
  const winPct = finalVals.filter(v => v >= p.capital).length / numCycles;

  const allVals = allSeries.flat();
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.05;
  const pad = { l: 70, r: 20, t: 15, b: 30 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  function toX(d) { return pad.l + (d/days)*cW; }
  function toY(v) { return pad.t + (1-(v-minV)/(maxV-minV))*cH; }

  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = '#131920'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + (i/5)*cH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l+cW, y); ctx.stroke();
    const v = minV + ((5-i)/5)*(maxV-minV);
    ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'right';
    ctx.fillText('$'+v.toFixed(0), pad.l-6, y+3);
  }
  for (let i = 0; i <= 6; i++) {
    const x = pad.l + (i/6)*cW;
    ctx.strokeStyle = '#131920';
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t+cH); ctx.stroke();
    ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
    ctx.fillText('D'+Math.round((i/6)*days), x, H-8);
  }

  // all paths (faded)
  allSeries.forEach(s => {
    const final = s[s.length-1];
    ctx.strokeStyle = final > p.capital ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    s.forEach((v, d) => d === 0 ? ctx.moveTo(toX(d), toY(v)) : ctx.lineTo(toX(d), toY(v)));
    ctx.stroke();
  });

  // Percentile bands
  function getPercentileSeries(pct) {
    return Array.from({length: days+1}, (_, d) => {
      const vals = allSeries.map(s => s[d]).sort((a,b) => a-b);
      return vals[Math.floor(pct * vals.length)];
    });
  }
  const s10 = getPercentileSeries(0.1);
  const s25 = getPercentileSeries(0.25);
  const s50 = getPercentileSeries(0.5);
  const s75 = getPercentileSeries(0.75);
  const s90 = getPercentileSeries(0.9);

  // Band fill 10-90
  ctx.fillStyle = 'rgba(99,169,255,0.05)';
  ctx.beginPath();
  s10.forEach((v, d) => d === 0 ? ctx.moveTo(toX(d), toY(v)) : ctx.lineTo(toX(d), toY(v)));
  for (let d = days; d >= 0; d--) ctx.lineTo(toX(d), toY(s90[d]));
  ctx.closePath(); ctx.fill();

  // Band fill 25-75
  ctx.fillStyle = 'rgba(99,169,255,0.10)';
  ctx.beginPath();
  s25.forEach((v, d) => d === 0 ? ctx.moveTo(toX(d), toY(v)) : ctx.lineTo(toX(d), toY(v)));
  for (let d = days; d >= 0; d--) ctx.lineTo(toX(d), toY(s75[d]));
  ctx.closePath(); ctx.fill();

  // Percentile lines
  [[s10,'#f85149',1,'P10'],[s25,'#f0883e',1,'P25'],[s50,'#63a9ff',2,'P50'],[s75,'#3fb950',1,'P75'],[s90,'#3fb950',1,'P90']].forEach(([s,col,lw,lbl]) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(lw === 2 ? [] : [3,3]);
    ctx.beginPath();
    s.forEach((v, d) => d === 0 ? ctx.moveTo(toX(d), toY(v)) : ctx.lineTo(toX(d), toY(v)));
    ctx.stroke();
    ctx.setLineDash([]);
    // end label
    const last = s[s.length-1];
    ctx.fillStyle = col; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'left';
    ctx.fillText(lbl, toX(days)+3, toY(last)+3);
  });

  // Baseline
  const baseY = toY(p.capital);
  ctx.strokeStyle = '#253447'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(pad.l, baseY); ctx.lineTo(pad.l+cW, baseY); ctx.stroke();
  ctx.setLineDash([]);

  document.getElementById('mcInfo').textContent = `${numCycles} ciclos · ${days} dias`;

  document.getElementById('mcLegend').innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:#f85149;border-top:2px dashed #f85149"></div>P10 pior 10%</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f0883e;border-top:2px dashed #f0883e"></div>P25</div>
    <div class="legend-item"><div class="legend-dot" style="background:#63a9ff;height:3px"></div>Mediana (P50)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#3fb950;border-top:2px dashed #3fb950"></div>P75 / P90</div>
    <div class="legend-item"><div class="legend-dot" style="background:rgba(63,185,80,0.4)"></div>Verde = lucro · Vermelho = prejuízo</div>
  `;

  document.getElementById('mcStats').innerHTML = `
    <div class="stat-card">
      <div class="lbl">% Ciclos Positivos</div>
      <div class="val ${winPct >= 0.5 ? 'col-green':'col-red'}">${(winPct*100).toFixed(0)}%</div>
      <div class="sub">${Math.round(winPct*numCycles)} de ${numCycles} ciclos</div>
      <div class="prog-bar" style="margin-top:6px"><div class="prog-fill" style="width:${winPct*100}%;background:${winPct>=0.5?'var(--green)':'var(--red)'}"></div></div>
    </div>
    <div class="stat-card">
      <div class="lbl">Mediana Final</div>
      <div class="val ${p50 >= p.capital ? 'col-green':'col-red'}">$${p50.toFixed(0)}</div>
      <div class="sub">${((p50/p.capital-1)*100).toFixed(1)}% vs inicial</div>
    </div>
    <div class="stat-card">
      <div class="lbl">Pior 10% (P10)</div>
      <div class="val col-red">$${p10.toFixed(0)}</div>
      <div class="sub">${((p10/p.capital-1)*100).toFixed(1)}%</div>
    </div>
    <div class="stat-card">
      <div class="lbl">Melhor 10% (P90)</div>
      <div class="val col-green">$${p90.toFixed(0)}</div>
      <div class="sub">+${((p90/p.capital-1)*100).toFixed(1)}%</div>
    </div>
  `;

  buildDistribution(finalVals);
}

// ─── DISTRIBUTION ───
function buildDistribution(finalVals) {
  const p = P();
  const canvas = document.getElementById('distCanvas');
  const W = canvas.offsetWidth || 800;
  const H = 180;
  canvas.width = W * (window.devicePixelRatio||1);
  canvas.height = H * (window.devicePixelRatio||1);
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio||1, window.devicePixelRatio||1);

  const returns = finalVals.map(v => ((v/p.capital)-1)*100);
  const minR = Math.min(...returns);
  const maxR = Math.max(...returns);
  const bins = 40;
  const binW = (maxR - minR) / bins;
  const counts = Array(bins).fill(0);
  returns.forEach(r => {
    const bi = Math.min(bins-1, Math.floor((r - minR)/binW));
    counts[bi]++;
  });
  const maxCount = Math.max(...counts);

  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, W, H);

  const pad = { l: 45, r: 15, t: 10, b: 28 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const bw = cW / bins;

  counts.forEach((c, i) => {
    const x = pad.l + i * bw;
    const bh = (c / maxCount) * cH;
    const y = pad.t + cH - bh;
    const binStart = minR + i * binW;
    const isPositive = binStart >= 0;
    ctx.fillStyle = isPositive ? 'rgba(63,185,80,0.7)' : 'rgba(248,81,73,0.7)';
    ctx.fillRect(x + 1, y, bw - 2, bh);
  });

  // Zero line
  const zeroX = pad.l + ((-minR) / (maxR - minR)) * cW;
  ctx.strokeStyle = '#253447'; ctx.lineWidth = 1.5; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(zeroX, pad.t); ctx.lineTo(zeroX, pad.t+cH); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
  ctx.fillText('0%', zeroX, H-8);

  // x axis labels
  [minR, 0, maxR].forEach(v => {
    const x = pad.l + ((v - minR)/(maxR - minR))*cW;
    ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
    if (Math.abs(v) > 0.1) ctx.fillText(v.toFixed(1)+'%', x, H-8);
  });

  // y axis
  ctx.fillStyle = '#6b7d8f'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'right';
  ctx.fillText('freq', pad.l-4, pad.t+12);

  const posCount = returns.filter(r => r >= 0).length;
  const negCount = returns.length - posCount;
  const avg = returns.reduce((a,b) => a+b, 0) / returns.length;
  const median = returns.sort((a,b) => a-b)[Math.floor(returns.length/2)];
  const p5 = returns[Math.floor(returns.length*0.05)];
  const p95 = returns[Math.floor(returns.length*0.95)];

  document.getElementById('distStats').innerHTML = `
    <div class="stat-card"><div class="lbl">Positivos</div><div class="val col-green">${posCount}</div><div class="sub">${(posCount/returns.length*100).toFixed(0)}%</div></div>
    <div class="stat-card"><div class="lbl">Negativos</div><div class="val col-red">${negCount}</div><div class="sub">${(negCount/returns.length*100).toFixed(0)}%</div></div>
    <div class="stat-card"><div class="lbl">Média</div><div class="val ${avg>=0?'col-green':'col-red'}">${avg>=0?'+':''}${avg.toFixed(1)}%</div><div class="sub">retorno médio</div></div>
    <div class="stat-card"><div class="lbl">P5 (cauda)</div><div class="val col-red">${p5.toFixed(1)}%</div><div class="sub">pior 5%</div></div>
    <div class="stat-card"><div class="lbl">P95 (cauda)</div><div class="val col-green">+${p95.toFixed(1)}%</div><div class="sub">melhor 5%</div></div>
  `;
}

// ─── SWITCH TAB ───
function tsTab(btn, contentId) {
  const panel = btn.closest('.ts-panel');
  panel.querySelectorAll('.ts-tab-btn').forEach(b => b.classList.remove('active'));
  panel.querySelectorAll('.ts-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(contentId).classList.add('active');
  if (contentId === 'seqFixed') buildCycles();
  else if (contentId === 'seqRandom') runSequence();
}

// ─── RUN ALL ───
function tsRunAll() {
  const p = P();
  document.getElementById('id-sl').value = p.sl;
  document.getElementById('id-dailyStop').value = p.dailyStop;
  recalcMetrics();
  buildScenarios();
  buildRecovery();
  buildIntraday();
  runSequence();
  buildCycles();
  buildMC();
}

// Init
shAddLoad( () => {
  setTimeout(tsRunAll, 100);
});
window.addEventListener('resize', () => {
  buildMC();
  buildCycles();
});

return {tsRunAll, syncRange, syncInput, tsTab, buildIntraday};
};
