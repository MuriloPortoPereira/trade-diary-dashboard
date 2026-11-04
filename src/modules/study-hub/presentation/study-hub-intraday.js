/* BEGIN STUDYHUB NATIVE INTRADAY IMPACT */
(function(){
  const pct = (value, digits = 2) => `${Number(value || 0).toFixed(digits)}%`;
  const signedPct = (value, digits = 2) => `${value >= 0 ? '+' : ''}${Number(value || 0).toFixed(digits)}%`;
  const money = (value) => '$' + Math.abs(Number(value || 0)).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const signedMoney = (value) => `${value >= 0 ? '+' : '-'}${money(value)}`;
  const readNum = (id, fallback = 0) => {
    const el = document.getElementById(id);
    const value = el ? parseFloat(el.value) : NaN;
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  const setInput = (id, value) => {
    const el = document.getElementById(id);
    if (el && Number.isFinite(value)) el.value = String(+value.toFixed(4));
  };
  const write = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  function studyHubIntradayParams() {
    const capital = readNum('ts-capital', 10000);
    const riskPct = readNum('risk', 1);
    const stopPct = readNum('id-sl', readNum('sl', 1));
    const gainPct = readNum('id-intradayGain', readNum('tp', Math.max(stopPct, 1)));
    const dailyStopPct = readNum('id-dailyStop', readNum('dailyStop', stopPct * 2));
    const dailyTargetPct = readNum('id-intradayTarget', readNum('dailyTarget', gainPct));
    const rrr = stopPct > 0 ? gainPct / stopPct : 0;
    const accountGainPct = riskPct * rrr;
    return {
      capital,
      riskPct,
      stopPct,
      gainPct,
      accountGainPct,
      dailyStopPct,
      dailyTargetPct,
      rrr,
      breakeven: rrr > 0 ? 1 / (1 + rrr) : 0,
      stopValue: capital * riskPct / 100,
      gainValue: capital * accountGainPct / 100,
      dailyStopValue: capital * dailyStopPct / 100,
      dailyTargetValue: capital * dailyTargetPct / 100,
      stopAt: Math.max(1, Math.ceil(dailyStopPct / Math.max(riskPct, 0.0001))),
      targetAt: Math.max(1, Math.ceil(dailyTargetPct / Math.max(accountGainPct, 0.0001))),
    };
  }

  function studyHubBuildIntradayRows(params) {
    const maxRows = Math.min(Math.max(6, params.stopAt, params.targetAt) + 2, 20);
    const rows = [];
    for (let n = 1; n <= maxRows; n++) {
      const winsAlt = Math.ceil(n / 2);
      const lossesAlt = Math.floor(n / 2);
      const allGainPct = n * params.accountGainPct;
      const allStopPct = -(n * params.riskPct);
      const altPct = (winsAlt * params.accountGainPct) - (lossesAlt * params.riskPct);
      rows.push({
        n,
        allGainPct,
        allGainValue: params.capital * allGainPct / 100,
        allStopPct,
        allStopValue: params.capital * allStopPct / 100,
        altPct,
        altValue: params.capital * altPct / 100,
        hitStop: Math.abs(allStopPct) >= params.dailyStopPct,
        hitTarget: allGainPct >= params.dailyTargetPct,
        stopRemaining: Math.max(0, params.dailyStopPct - Math.abs(allStopPct)),
        targetRemaining: Math.max(0, params.dailyTargetPct - allGainPct),
      });
    }
    return rows;
  }

  function studyHubEnsurePercentUnit(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const parent = input.parentElement;
    const hasUnit = (node) => Array.from(node?.children || []).some((child) => (
      child.classList?.contains('unit') || child.classList?.contains('u')
    ));

    if (parent?.classList?.contains('input-unit') || parent?.classList?.contains('iu')) {
      if (!hasUnit(parent)) {
        const unit = document.createElement('span');
        unit.className = parent.classList.contains('iu') ? 'u' : 'unit';
        unit.textContent = '%';
        parent.appendChild(unit);
      }
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'input-unit';
    wrapper.style.cssText = 'width:90px';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const unit = document.createElement('span');
    unit.className = 'unit';
    unit.textContent = '%';
    wrapper.appendChild(unit);
  }

  function studyHubRemovePercentUnit(inputId) {
    const input = document.getElementById(inputId);
    const parent = input?.parentElement;
    if (!parent) return;
    parent.querySelectorAll(':scope > .unit, :scope > .u').forEach((unit) => unit.remove());
  }

  function studyHubNormalizeIntradayPercentUnits() {
    studyHubEnsurePercentUnit('id-intradayRisk');
    studyHubRemovePercentUnit('id-sl');
    studyHubRemovePercentUnit('id-intradayGain');
    studyHubEnsurePercentUnit('id-dailyStop');
    studyHubEnsurePercentUnit('id-intradayTarget');
  }

  function studyHubEnsureIntradayMarkup() {
    const table = document.getElementById('intradayTable');
    const body = table && typeof table.closest === 'function' ? table.closest('.ts-panel-body') : null;
    if (!table || !body) return false;

    const controls = body.querySelector('div[style*="align-items:flex-end"]') || body.firstElementChild;
    const stopField = document.getElementById('id-sl')?.closest('.field');
    const dailyStopField = document.getElementById('id-dailyStop')?.closest('.field');
    const stopLabel = stopField?.querySelector('label');
    const dailyStopLabel = dailyStopField?.querySelector('label');
    if (stopLabel) stopLabel.textContent = 'SL p/ RRR';
    if (dailyStopLabel) dailyStopLabel.textContent = 'Meta de Loss';

    if (!document.getElementById('id-intradayRisk') && controls) {
      const riskField = document.createElement('div');
      riskField.className = 'field';
      riskField.style.cssText = 'margin:0;flex:0 0 auto';
      riskField.innerHTML = `
        <label style="font-size:10px;color:var(--muted);margin-bottom:4px;display:block">Risco/Trade</label>
        <div class="input-unit" style="width:90px">
          <input type="number" id="id-intradayRisk" value="${readNum('risk', 1)}" min="0.01" max="20" step="0.01">
          <span class="unit">%</span>
        </div>`;
      if (stopField) controls.insertBefore(riskField, stopField);
      else controls.appendChild(riskField);
    }

    if (!document.getElementById('id-intradayGain') && controls) {
      const gainField = document.createElement('div');
      gainField.className = 'field';
      gainField.style.cssText = 'margin:0;flex:0 0 auto';
      gainField.innerHTML = `
        <label style="font-size:10px;color:var(--muted);margin-bottom:4px;display:block">Alvo p/ RRR</label>
        <div class="input-unit" style="width:90px">
          <input type="number" id="id-intradayGain" value="${readNum('tp', 1)}" min="0.01" max="50" step="0.01">
        </div>`;

      const targetField = document.createElement('div');
      targetField.className = 'field';
      targetField.style.cssText = 'margin:0;flex:0 0 auto';
      targetField.innerHTML = `
        <label style="font-size:10px;color:var(--muted);margin-bottom:4px;display:block">Meta de Gain</label>
        <div class="input-unit" style="width:90px">
          <input type="number" id="id-intradayTarget" value="${readNum('dailyTarget', 1)}" min="0.1" max="50" step="0.1">
          <span class="unit">%</span>
        </div>`;

      if (stopField?.nextSibling) controls.insertBefore(gainField, stopField.nextSibling);
      else controls.appendChild(gainField);
      if (dailyStopField?.nextSibling) controls.insertBefore(targetField, dailyStopField.nextSibling);
      else controls.appendChild(targetField);
    }

    studyHubNormalizeIntradayPercentUnits();

    if (!document.getElementById('intradayRiskModelNote')) {
      const note = document.createElement('div');
      note.id = 'intradayRiskModelNote';
      note.style.cssText = 'border:1px solid rgba(34,211,238,.16);background:rgba(34,211,238,.055);color:var(--text);border-radius:10px;padding:10px 12px;margin:0 0 12px;font-size:11px;line-height:1.45';
      note.innerHTML = '<strong>RRR = Alvo / SL.</strong> Valor financeiro usa Capital Inicial x Risco/Trade; SL/Alvo so definem proporcao do setup.';
      if (controls?.nextSibling) body.insertBefore(note, controls.nextSibling);
      else body.insertBefore(note, table);
    }

    if (!document.getElementById('intradayImpactMetrics')) {
      const metrics = document.createElement('div');
      metrics.id = 'intradayImpactMetrics';
      metrics.style.cssText = 'display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:8px;margin:0 0 12px';
      metrics.innerHTML = `
        <div class="metric"><div class="metric-label">Valor do Stop</div><div class="metric-value col-red" id="id-intradayStopValue">—</div><div class="metric-sub" id="id-intradayStopPct">—</div></div>
        <div class="metric"><div class="metric-label">Valor do Gain</div><div class="metric-value col-green" id="id-intradayGainValue">—</div><div class="metric-sub" id="id-intradayGainPct">—</div></div>
        <div class="metric"><div class="metric-label">RRR calculado</div><div class="metric-value col-blue" id="id-intradayRRR">—</div><div class="metric-sub" id="id-intradayBreakeven">—</div></div>
        <div class="metric"><div class="metric-label">Stop do Dia</div><div class="metric-value col-red" id="id-intradayDailyStopValue">—</div><div class="metric-sub" id="id-intradayDailyStopPct">—</div></div>
        <div class="metric"><div class="metric-label">Meta de Gain</div><div class="metric-value col-green" id="id-intradayDailyTargetValue">—</div><div class="metric-sub" id="id-intradayDailyTargetPct">—</div></div>
        <div class="metric"><div class="metric-label">Limites</div><div class="metric-value col-yellow" id="id-intradayLimits">—</div><div class="metric-sub">stops / gains ate limite</div></div>`;
      if (controls?.nextSibling) body.insertBefore(metrics, controls.nextSibling);
      else body.insertBefore(metrics, table);
    }

    return true;
  }

  function studyHubSyncIntradayInputs() {
    const map = {
      'id-intradayRisk': 'risk',
      'id-sl': 'sl',
      'id-intradayGain': 'tp',
      'id-dailyStop': 'dailyStop',
      'id-intradayTarget': 'dailyTarget',
    };
    Object.entries(map).forEach(([localId, sourceId]) => {
      const local = document.getElementById(localId);
      if (!local) return;
      const sourceValue = readNum(sourceId, parseFloat(local.value) || 1);
      if (!local.dataset.studyHubBound) {
        local.value = String(sourceValue);
        local.dataset.studyHubBound = '1';
        local.oninput = () => {
          const value = readNum(localId, sourceValue);
          setInput(sourceId, value);
          if (sourceId === 'tp') write('rrrDisplay', `1 : ${(value / readNum('sl', 1)).toFixed(2)}`);
          studyHubRenderIntradayImpact();
        };
      } else if (document.activeElement !== local) {
        local.value = String(sourceValue);
      }
    });
  }

  function studyHubBindIntradaySources() {
    ['ts-capital','risk','dailyStop','dailyTarget','sl','tp','riskRange','dailyStopRange','dailyTargetRange','slRange','tpRange'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.dataset.studyHubIntradaySourceBound) return;
      el.dataset.studyHubIntradaySourceBound = '1';
      el.addEventListener('input', () => requestAnimationFrame(studyHubRenderIntradayImpact));
    });
  }

  function studyHubRenderIntradayImpact() {
    if (!studyHubEnsureIntradayMarkup()) return;
    studyHubSyncIntradayInputs();
    studyHubBindIntradaySources();
    const params = studyHubIntradayParams();
    const rows = studyHubBuildIntradayRows(params);

    write('id-rrrDisplay', `1 : ${params.rrr.toFixed(2)}`);
    write('id-tpDisplay', `${pct(params.gainPct, 3)} / ${money(params.gainValue)}`);
    write('id-intradayStopValue', money(params.stopValue));
    write('id-intradayStopPct', `${pct(params.riskPct)} risco / ${pct(params.stopPct)} SL`);
    write('id-intradayGainValue', money(params.gainValue));
    write('id-intradayGainPct', `${pct(params.accountGainPct)} retorno / ${pct(params.gainPct)} alvo`);
    write('id-intradayRRR', `1 : ${params.rrr.toFixed(2)}`);
    write('id-intradayBreakeven', `WR BE ${pct(params.breakeven * 100, 1)}`);
    write('id-intradayDailyStopValue', money(params.dailyStopValue));
    write('id-intradayDailyStopPct', `${pct(params.dailyStopPct)} / ${params.stopAt} stops`);
    write('id-intradayDailyTargetValue', money(params.dailyTargetValue));
    write('id-intradayDailyTargetPct', `${pct(params.dailyTargetPct)} / ${params.targetAt} gains`);
    write('id-intradayLimits', `${params.stopAt} SL / ${params.targetAt} G`);

    const table = document.getElementById('intradayTable');
    const tbody = table?.querySelector('tbody');
    if (!table || !tbody) return;
    const head = table.querySelector('thead tr');
    if (head) {
      head.innerHTML = '<th>#Trades</th><th>Todos Gain</th><th>Alternado W/L</th><th>Todos Stop</th><th>Stop do Dia</th><th>Meta de Gain</th><th>WR BE</th>';
    }
    tbody.innerHTML = rows.map((row) => `
      <tr${row.hitStop || row.hitTarget ? ' style="opacity:.92"' : ''}>
        <td class="mono col-blue">${row.n}</td>
        <td class="mono col-green">${signedPct(row.allGainPct)}<br><span style="font-size:9px;color:var(--dim)">${signedMoney(row.allGainValue)}</span></td>
        <td class="mono ${row.altPct >= 0 ? 'col-green' : 'col-red'}">${signedPct(row.altPct)}<br><span style="font-size:9px;color:var(--dim)">${signedMoney(row.altValue)}</span></td>
        <td class="mono col-red">${signedPct(row.allStopPct)}<br><span style="font-size:9px;color:var(--dim)">${signedMoney(row.allStopValue)}</span></td>
        <td>${row.hitStop ? `<span class="badge badge-red">stop no ${row.n}o trade</span>` : `<span class="badge badge-yellow">faltam ${pct(row.stopRemaining)}</span>`}</td>
        <td>${row.hitTarget ? `<span class="badge badge-green">meta no ${row.n}o trade</span>` : `<span class="badge badge-blue">faltam ${pct(row.targetRemaining)}</span>`}</td>
        <td class="mono col-blue">${pct(params.breakeven * 100, 1)}</td>
      </tr>`).join('');
  }

  function studyHubEnhanceIntradayImpact() {
    if (!document.getElementById('mod-tradesim')) return;
    studyHubRenderIntradayImpact();
    if (!window.__studyHubIntradayWrapped) {
      const originalBuild = window.sh_buildIntraday;
      const originalRunAll = window.sh_tsRunAll;
      window.sh_buildIntraday = (...args) => {
        const result = typeof originalBuild === 'function' ? originalBuild(...args) : undefined;
        requestAnimationFrame(studyHubRenderIntradayImpact);
        return result;
      };
      window.sh_tsRunAll = (...args) => {
        const result = typeof originalRunAll === 'function' ? originalRunAll(...args) : undefined;
        requestAnimationFrame(studyHubRenderIntradayImpact);
        return result;
      };
      window.__studyHubIntradayWrapped = true;
    }
  }

  window.studyHubBuildIntradayRows = studyHubBuildIntradayRows;
  window.studyHubEnhanceIntradayImpact = studyHubEnhanceIntradayImpact;
  if (document.readyState === 'complete') requestAnimationFrame(studyHubEnhanceIntradayImpact);
  else window.addEventListener('load', () => requestAnimationFrame(studyHubEnhanceIntradayImpact), { once: true });
})();
/* END STUDYHUB NATIVE INTRADAY IMPACT */
