function renderAnalysisSummary(containerId,items=[]){
  const el=document.getElementById(containerId);
  if(!el)return;
  const rows=(Array.isArray(items)?items:[]).filter(Boolean);
  if(!rows.length){
    el.innerHTML='';
    return;
  }
  el.innerHTML=rows.map(item=>`<div class="analysis-summary-chip ${escapeHtml(item.tone||'')}"><div class="analysis-summary-label">${escapeHtml(item.label||'')}</div><div class="analysis-summary-value">${escapeHtml(item.value||'—')}</div><div class="analysis-summary-sub">${escapeHtml(item.sub||'')}</div></div>`).join('');
}

function renderStatusList(targetId, items, emptyMessage='Nada para mostrar no momento.'){
  const el=document.getElementById(targetId);
  if(!el)return;
  if(!items.length){
    el.innerHTML=`<div class="status-item info"><div class="status-item-copy"><div class="status-item-title">Sem alertas críticos</div><div class="status-item-summary">${emptyMessage}</div></div></div>`;
    return;
  }
  el.innerHTML=items.map(item=>`
    <div class="status-item ${item.tone||'info'}">
      <div class="status-item-copy">
        <div class="status-item-title">${escapeHtml(item.title||'Atualização')}</div>
        <div class="status-item-summary">${escapeHtml(item.summary||'')}</div>
      </div>
      ${item.value?`<div class="status-item-value">${escapeHtml(item.value)}</div>`:''}
      ${item.actionFn?`<button class="btn btn-ghost btn-sm" onclick="${item.actionFn}">${escapeHtml(item.actionLabel||'Abrir')}</button>`:item.actionPage?`<button class="btn btn-ghost btn-sm" onclick="showPage('${item.actionPage}')">${escapeHtml(item.actionLabel||'Abrir')}</button>`:''}
    </div>`).join('');
}


const CHART_OPTS = {
  responsive:true,maintainAspectRatio:false,animation:{duration:200},
  plugins:{legend:{labels:{color:'#8ba3ad',font:{family:'DM Mono',size:9}}}},
  scales:{
    x:{ticks:{color:'#506a74',font:{size:8},maxTicksLimit:12},grid:{color:'rgba(255,255,255,.06)'}},
    y:{ticks:{color:'#506a74',font:{size:8}},grid:{color:'rgba(255,255,255,.06)'}}
  }
};

function mkChart(id,cfg){
  const cv=document.getElementById(id);
  if(!cv)return;
  if(charts[id]&&typeof charts[id].destroy==='function')charts[id].destroy();
  charts[id]=new Chart(cv,cfg);
}

function buildSignedEquityDataset(data, overrides={}){
  return {
    data,
    borderColor:'#22d5ed',
    pointBackgroundColor:'#22d5ed',
    pointBorderColor:'#22d5ed',
    backgroundColor:'rgba(34,213,237,.10)',
    borderWidth:2,
    pointRadius:0,
    tension:.3,
    fill:{target:'origin',above:'rgba(69,224,123,.12)',below:'rgba(255,93,104,.12)'},
    ...overrides,
  };
}

const f2 = v => typeof v==='number' ? v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : v;

const fR = v => '$'+f2(v);

const fP = v => (v*100).toFixed(2)+'%';

const fDate = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

const TIPS={
  pnl:`<strong>Lucro Líquido</strong><p>Soma de todos os P/L fechados no período. Inclui wins, losses e breakevens.</p><div class="tip-row"><span>Negativo</span><span>Período com prejuízo</span></div><div class="tip-row"><span>Positivo</span><span>Período lucrativo</span></div>`,
  wr:`<strong>Assertividade / Win Rate</strong><p>Percentual de trades fechados como WIN. Um bom win rate sozinho não garante lucro — depende do RRR.</p><div class="tip-row"><span>Abaixo de 40%</span><span>Precisa de RRR alto (2:1+)</span></div><div class="tip-row"><span>50–60%</span><span>Faixa comum em setups sólidos</span></div><div class="tip-row"><span>Acima de 70%</span><span>Verifique se o RRR não é baixo demais</span></div>`,
  pf:`<strong>Fator de Lucro</strong><p>Razão entre ganhos brutos e perdas brutas. Mede a eficiência do setup independente do número de trades.</p><div class="tip-row"><span>Abaixo de 1.0</span><span>Setup destrutivo</span></div><div class="tip-row"><span>1.0 – 1.5</span><span>Setup marginal</span></div><div class="tip-row"><span>Acima de 1.5</span><span>Setup saudável</span></div>`,
  exp:`<strong>Expectância</strong><p>Retorno médio esperado por trade em múltiplos de R (risco). Responde: "vale a pena entrar nesse setup?"</p><div class="tip-row"><span>Negativa</span><span>Setup perde no longo prazo</span></div><div class="tip-row"><span>+0.2R ou mais</span><span>Setup consistentemente lucrativo</span></div>`,
  expPct:`<strong>Expectância % / trade</strong><p>Retorno médio esperado por trade expresso como percentual do capital. Permite comparar setups com tamanhos de conta diferentes.</p><div class="tip-row"><span>Negativa</span><span>Setup destrói capital a cada trade</span></div><div class="tip-row"><span>Positiva</span><span>Capital cresce com a execução</span></div>`,
  dd:`<strong>Drawdown Máximo</strong><p>Maior queda registrada do pico ao vale da curva de capital no período. Indica o pior momento que você passou.</p><div class="tip-row"><span>Abaixo de 10%</span><span>Risco controlado</span></div><div class="tip-row"><span>10% – 20%</span><span>Zona de atenção</span></div><div class="tip-row"><span>Acima de 20%</span><span>Risco elevado — revisar gestão</span></div>`,
  recovery:`<strong>Fator de Recovery</strong><p>Razão entre o retorno total e o drawdown máximo. Quanto maior, mais eficiente o setup se recupera das perdas.</p><div class="tip-row"><span>Abaixo de 1</span><span>Perdas ainda não recuperadas</span></div><div class="tip-row"><span>1 – 2</span><span>Recuperação adequada</span></div><div class="tip-row"><span>Acima de 2</span><span>Setup com boa resiliência</span></div>`,
  sharpe:`<strong>Índice de Sharpe</strong><p>Mede o retorno ajustado ao risco total (volatilidade). Quanto maior, melhor a relação entre lucro e instabilidade dos resultados.</p><div class="tip-row"><span>Abaixo de 1</span><span>Retorno não justifica o risco</span></div><div class="tip-row"><span>1 – 2</span><span>Bom desempenho ajustado</span></div><div class="tip-row"><span>Acima de 2</span><span>Excelente relação risco/retorno</span></div>`,
  sortino:`<strong>Índice de Sortino</strong><p>Similar ao Sharpe, mas penaliza apenas a volatilidade negativa (perdas). Mais justo para setups que têm ganhos assimétricos.</p><div class="tip-row"><span>Maior que Sharpe</span><span>As perdas são controladas</span></div><div class="tip-row"><span>Menor que Sharpe</span><span>Perdas puxam mais do que os ganhos</span></div>`,
  calmar:`<strong>Índice de Calmar</strong><p>Razão entre o retorno anualizado e o drawdown máximo. Avalia se o lucro compensa a pior sequência de perdas.</p><div class="tip-row"><span>Abaixo de 1</span><span>Drawdown consume o lucro</span></div><div class="tip-row"><span>Acima de 2</span><span>Retorno superior ao risco vivido</span></div>`,
  followedPlan:`<strong>Seguiu o Plano</strong><p>Percentual de trades em que você marcou "Seguiu o plano: Sim". Mede sua disciplina de execução.</p><div class="tip-row"><span>Abaixo de 60%</span><span>Alta frequência de desvios</span></div><div class="tip-row"><span>Acima de 80%</span><span>Execução consistente</span></div>`,
  discipline:`<strong>Disciplina Média</strong><p>Média do score de disciplina (0–100) atribuído a cada trade. Reflete a qualidade da tomada de decisão.</p><div class="tip-row"><span>Abaixo de 60</span><span>Muitos trades impulsivos</span></div><div class="tip-row"><span>Acima de 80</span><span>Execução de alta qualidade</span></div>`,
  hesitation:`<strong>Hesitações</strong><p>Trades em que você marcou que hesitou na entrada. Hesitar pode significar um setup válido perdido ou disciplina evitando uma entrada ruim.</p><div class="tip-row"><span>Alta hesitação em WINs</span><span>Cuida: está perdendo entradas válidas</span></div><div class="tip-row"><span>Alta hesitação em LOSSes</span><span>Sinal de boa intuição — confie mais nela</span></div>`,
  errors:`<strong>Total de Erros</strong><p>Soma de todos os erros de processo marcados nos trades do período. Use para identificar padrões de comportamento a corrigir.</p>`,
  stopSessao:`<strong>Stop da Sessão</strong><p>Limite máximo de perda permitido no dia corrente, calculado como percentual do capital base da conta.</p><p><b>Como é calculado:</b> filtra todos os trades com data igual a hoje e soma as perdas. Se o P/L do dia for negativo, esse valor é comparado com o limite configurado (ex: 2%).</p><div class="tip-row"><span>0–50%</span><span>Sessão tranquila, pode operar</span></div><div class="tip-row"><span>50–80%</span><span>Atenção — reduza o tamanho</span></div><div class="tip-row"><span>Acima de 80%</span><span>Considere encerrar a sessão</span></div><div class="tip-row"><span>100%+</span><span>Limite atingido — pare agora</span></div>`,
  stopSemana:`<strong>Stop da Semana</strong><p>Limite acumulado de perda para a semana corrente (domingo a sábado), calculado como percentual do capital base.</p><p><b>Como é calculado:</b> filtra trades da semana corrente e soma as perdas. A janela reseta todo domingo. Ganhos não reduzem o consumo — só perdas contam.</p><div class="tip-row"><span>0–50%</span><span>Semana sob controle</span></div><div class="tip-row"><span>50–80%</span><span>Sequência ruim — revise os setups</span></div><div class="tip-row"><span>Acima de 80%</span><span>Considere parar de operar na semana</span></div>`,
  ddTotal:`<strong>Drawdown Total</strong><p>Queda acumulada desde o pico do saldo até o valor atual. Protege o capital conquistado a cada ciclo de meta.</p><p><b>Como é calculado:</b> percorre todos os trades em ordem cronológica, rastreia o pico histórico do saldo e compara com o valor atual. O limite é aplicado sobre a base do ciclo atual — ao bater a meta, a base avança e o DD passa a proteger o lucro acumulado.</p><div class="tip-row"><span>Abaixo de 30%</span><span>Conta saudável</span></div><div class="tip-row"><span>30–70%</span><span>Atenção — drawdown se aprofundando</span></div><div class="tip-row"><span>Acima de 85%</span><span>Risco crítico de atingir o limite</span></div>`,
  meta:`<strong>Meta da Conta</strong><p>Sistema de meta cíclica: ao atingir o percentual configurado, a meta se reinicia sobre o novo saldo — protegendo o lucro e sempre avançando.</p><p><b>Como é calculado:</b> o ciclo atual é determinado pelo número de vezes que o saldo cresceu X% sobre o capital inicial mais aportes. A barra mostra o progresso dentro do ciclo corrente.</p><div class="tip-row"><span>Ciclo 1</span><span>Ainda no capital inicial</span></div><div class="tip-row"><span>Ciclo 2+</span><span>Lucros sendo protegidos pela meta</span></div><div class="tip-row"><span>100%</span><span>Meta atingida — ciclo avança</span></div>`,
  riscoIdeal:`<strong>Risco Ideal por Trade</strong><p>Valor sugerido de risco por operação com base no percentual configurado e no capital atual da conta.</p><p>Operar com risco fixo em percentual garante que drawdowns reduzam automaticamente o tamanho das posições, protegendo o capital de sequências negativas.</p><div class="tip-row"><span>Saldo atual</span><span>Capital vivo na conta agora</span></div><div class="tip-row"><span>P/L hoje</span><span>Resultado acumulado do dia corrente</span></div><div class="tip-row"><span>P/L total</span><span>Resultado desde o início da conta</span></div><div class="tip-row"><span>Ciclo</span><span>Quantas metas foram batidas e % do ciclo atual</span></div>`,
  equityChart:`<strong>Curva de Equity</strong><p>Evolução do saldo ao longo do tempo, trade a trade. Mostra se o capital está crescendo de forma consistente ou com alta volatilidade.</p><div class="tip-row"><span>Linha suave e ascendente</span><span>Consistência alta</span></div><div class="tip-row"><span>Quedas bruscas</span><span>Drawdowns relevantes — investigar</span></div>`,
  wlChart:`<strong>Distribuição W/L</strong><p>Proporção visual entre trades vencedores (WIN), perdedores (LOSS) e empatados (BE) no período selecionado.</p>`,
  rMultiplos:`<strong>R-Múltiplos</strong><p>Cada barra representa o resultado de um trade em múltiplos de R (onde 1R = risco assumido no trade). Permite comparar trades de tamanhos diferentes na mesma escala.</p><div class="tip-row"><span>+1R</span><span>Ganhou o equivalente ao risco</span></div><div class="tip-row"><span>-1R</span><span>Perdeu o risco planejado</span></div>`,
  wdayChart:`<strong>P/L por Dia da Semana</strong><p>Soma dos resultados agrupada por dia da semana. Identifica dias com padrão de performance melhor ou pior.</p>`,
  monthEvChart:`<strong>Evolução Mensal</strong><p>P/L total de cada mês. Útil para ver sazonalidade e tendência de longo prazo.</p>`,
  stratDashChart:`<strong>P/L por Estratégia</strong><p>Resultado acumulado de cada estratégia no período. Mostra quais setups estão gerando valor e quais estão destruindo capital.</p>`,
  emoDashChart:`<strong>Win Rate por Emoção</strong><p>Assertividade agrupada pela emoção registrada no trade. Revela quais estados mentais estão correlacionados com melhores resultados.</p>`,
  radarEstrategias:`<strong>Radar de Estratégias</strong><p>Ranking das estratégias por P/L no período selecionado, com win rate e fator R.</p><p>Use para identificar o que está pagando agora e concentrar atenção nos setups mais eficientes.</p>`,
  stopFee:`<strong>Stop consumido por taxas</strong><p>Parcela do stop diário já consumida apenas pelas taxas de corretagem e spread, antes de qualquer resultado de trade.</p>`,
  expN:`<strong>Resultado Esperado (N trades)</strong><p>Projeção matemática do lucro esperado ao executar N trades com os parâmetros inseridos. É a expectância por trade multiplicada pelo número de trades.</p><p>Não garante resultado — mas mostra a direção do setup com volume suficiente de trades.</p>`,
  probPos:`<strong>Probabilidade de Resultado Positivo</strong><p>Percentual de cenários simulados (Monte Carlo) que terminaram acima do capital inicial, com os parâmetros inseridos.</p><div class="tip-row"><span>Abaixo de 50%</span><span>Setup desfavorável</span></div><div class="tip-row"><span>Acima de 65%</span><span>Setup com edge positivo</span></div>`,
  p10:`<strong>P10 (Cauda Adversa)</strong><p>Em 10% dos cenários simulados, o resultado ficou abaixo deste valor. Representa o pior decil — use para calibrar o quanto de drawdown aceitar.</p>`,
  p50:`<strong>Mediana (P50)</strong><p>Em 50% dos cenários simulados, o resultado ficou acima deste valor. É a expectativa mais realista do setup com o volume de trades configurado.</p>`,
  p90:`<strong>P90 (Cauda Favorável)</strong><p>Em 90% dos cenários simulados, o resultado ficou abaixo deste valor. Representa o melhor decil — útil para entender o teto realista de performance.</p>`,
  stEqChart:`<strong>Curva de Equity (Análises)</strong><p>Evolução do saldo trade a trade no período selecionado. Uma curva suave e ascendente indica consistência — quedas bruscas revelam drawdowns a investigar.</p>`,
  stWLChart:`<strong>Distribuição W/L</strong><p>Proporção entre trades vencedores (WIN), perdedores (LOSS) e empatados (BE). Visualiza o win rate de forma intuitiva — mas lembre: win rate sozinho não define lucratividade.</p>`,
  stRChart:`<strong>R-Múltiplos</strong><p>Resultado de cada trade em múltiplos de R (1R = risco assumido). Barras verdes acima de +1R são trades que valeram o risco; abaixo de -1R indicam saídas além do stop.</p><div class="tip-row"><span>+1R ou mais</span><span>Trade ganhou mais do que arriscou</span></div><div class="tip-row"><span>-1R</span><span>Stop respeitado</span></div><div class="tip-row"><span>Abaixo de -1R</span><span>Stop ultrapassado — investigar</span></div>`,
  stWdChart:`<strong>P/L por Dia da Semana</strong><p>Soma dos resultados agrupada por dia. Identifica quais dias da semana têm melhor e pior desempenho histórico — útil para ajustar o calendário de operações.</p>`,
  stMonthChart:`<strong>Evolução Mensal</strong><p>P/L total de cada mês no período selecionado. Permite identificar sazonalidade, meses consistentemente lucrativos ou prejudicados.</p>`,
  stDdChart:`<strong>Equity × Drawdown</strong><p>Sobreposição da curva de capital com a linha de drawdown corrente. Mostra visualmente a profundidade e duração dos períodos adversos em relação à evolução do saldo.</p>`,
  stHistChart:`<strong>Histograma de P/L</strong><p>Distribuição de frequência dos resultados por faixa de valor. Uma distribuição concentrada à direita (valores positivos) indica consistência; cauda longa à esquerda indica perdas atípicas.</p>`,
  stMetTable:`<strong>Tabela de Métricas</strong><p>Conjunto completo de indicadores quantitativos do período selecionado. Cada métrica avalia uma dimensão diferente do desempenho — juntas, formam um diagnóstico preciso do setup.</p>`,
  stStreak:`<strong>Streak & Sequências</strong><p>Análise das maiores sequências consecutivas de wins e losses. Sequências longas de losses revelam fragilidades do setup em certas condições de mercado.</p>`,
  stMonthPnlChart:`<strong>P/L por Mês (Análise Temporal)</strong><p>Resultado total de cada mês. Permite identificar sazonalidade, meses sistematicamente ruins ou bons, e tendências de evolução ao longo do tempo.</p>`,
  stWdWRChart:`<strong>Win Rate por Dia da Semana</strong><p>Assertividade (% de wins) agrupada por dia da semana. Mostra quais dias você fecha mais operações vencedoras — use para focar nos dias de maior edge histórico.</p>`,
  stHeatmap:`<strong>Heatmap de Horários</strong><p>Visualização hora a hora do P/L acumulado. Cores mais intensas indicam maior concentração de resultado (verde = lucro, vermelho = perda). Ajuda a identificar as janelas de horário mais produtivas.</p>`,
  stTimeCards:`<strong>Estatísticas de Timing</strong><p>Médias calculadas sobre todos os trades fechados: hora de colocação, acionamento, saída e duração. Compare WIN vs LOSS para identificar padrões de tempo que afetam o resultado.</p>`,
  stWdTable:`<strong>Desempenho por Dia da Semana</strong><p>Tabela com trades, win rate, P/L e R médio por dia. Mais granular que o gráfico — mostra o volume de amostras por dia para validar a relevância estatística.</p>`,
  stTimingStrat:`<strong>Timing por Estratégia</strong><p>Hora média de colocação, acionamento, saída e duração agrupados por estratégia. Revela se setups específicos têm padrões de horário distintos.</p>`,
  stStratPnl:`<strong>P/L por Estratégia</strong><p>Resultado acumulado de cada estratégia no período. Identifica quais setups estão gerando ou destruindo capital — base para decidir onde concentrar esforço.</p>`,
  stStratWR:`<strong>Win Rate por Estratégia</strong><p>Assertividade de cada estratégia no período. Compare com o P/L para distinguir setups com alta frequência mas baixo RRR dos setups com menos trades e maior qualidade.</p>`,
  stStratTable:`<strong>Comparativo de Estratégias</strong><p>Tabela completa com métricas por estratégia: trades, wins, win rate, P/L, R médio, Profit Factor, Expectância, Sharpe, Sortino, Calmar e Recovery. Use para ranquear e escolher qual estratégia priorizar.</p>`,
  stEmoWR:`<strong>Win Rate por Emoção</strong><p>Assertividade agrupada pela emoção registrada durante o trade. Mostra quais estados emocionais estão correlacionados com mais acertos — e quais prejudicam a tomada de decisão.</p><div class="tip-row"><span>Verde (≥50%)</span><span>Emoção favorável à execução</span></div><div class="tip-row"><span>Vermelho (&lt;50%)</span><span>Emoção que prejudica o resultado</span></div>`,
  stEmoPnl:`<strong>P/L médio por Emoção</strong><p>Resultado financeiro médio por trade agrupado por emoção. Complementa o Win Rate — uma emoção pode ter WR alto mas P/L baixo se os wins forem pequenos.</p>`,
  stDiscWR:`<strong>Disciplina × Win Rate</strong><p>Correlação entre o score de disciplina registrado (0–100) e a assertividade por faixa. Revela se operar com mais disciplina melhora objetivamente o resultado.</p><div class="tip-row"><span>Faixas de disciplina</span><span>0–20%, 21–40%, 41–60%, 61–80%, 81–100%</span></div>`,
  stErrors:`<strong>Erros mais frequentes</strong><p>Ranking dos tipos de erro de processo mais registrados nos trades do período. Use para identificar padrões de comportamento a trabalhar no próximo ciclo.</p>`,
  stHesitation:`<strong>Trades por hesitação (perdidos)</strong><p>Trades em que você marcou que hesitou na entrada. Analisa se a hesitação custou trades vencedores ou protegeu de perdas.</p><div class="tip-row"><span>Muita hesitação em WINs</span><span>Você está perdendo entradas válidas</span></div><div class="tip-row"><span>Muita hesitação em LOSSes</span><span>Intuição bem calibrada — confie mais nela</span></div>`,
  stPlanChart:`<strong>P/L por status de plano seguido</strong><p>Resultado agrupado por como o trade se relacionou com o plano: seguiu, parcial, não seguiu ou sem registro. Quantifica o custo financeiro de desviar do plano.</p>`,
  stEmoTable:`<strong>Análise por Emoção</strong><p>Tabela detalhada com win rate, P/L médio, R médio, taxa de plano seguido e disciplina média por emoção. Permite comparar todas as dimensões de performance emocional de uma vez.</p>`,
  simMonteCarlo:`<strong>Simulação Monte Carlo</strong><p>Projeta 100 cenários aleatórios de curvas de equity para as próximas N trades usando os parâmetros inseridos. Cada linha representa um caminho possível.</p><p>Útil para entender a amplitude de resultados possíveis e calibrar expectativas realistas antes de operar.</p><div class="tip-row"><span>Banda verde</span><span>Cenários favoráveis (P75–P90)</span></div><div class="tip-row"><span>Linha central</span><span>Mediana (P50) — resultado mais provável</span></div><div class="tip-row"><span>Banda vermelha</span><span>Cenários adversos (P10–P25)</span></div>`,
};

const mkTip=tip=>`<span class="m-tip-icon" tabindex="0">?<span class="m-tip-popup">${tip}</span></span>`;

const mkCard=(c)=>`<div class="metric-card ${c.cls||''}"><div class="m-label-row"><span class="m-label">${c.lbl}</span>${c.tip?mkTip(c.tip):''}</div><div class="m-value">${c.val}</div>${c.sub!=null?`<div class="m-sub">${c.sub}</div>`:''}</div>`;

function usageTone(value){
  if(value>=0.85)return'danger';
  if(value>=0.6)return'warn';
  return'safe';
}

function formatRiskLimitMeta(used,limit,excessUsd,excessPct){
  if(excessUsd>0)return `<span class="danger">Excedeu ${fR(excessUsd)} (${f2(excessPct)}%)</span>`;
  return `Restante ${fR(Math.max(limit-used,0))}`;
}

function initializeMetricTooltips(){
  if(typeof document==='undefined'||!document.body)return;
  const fl=document.createElement('div');
  fl.className='m-tip-float';
  document.body.appendChild(fl);
  let tid=null;

  function show(icon){
    const popup=icon.querySelector('.m-tip-popup');
    if(!popup)return;
    fl.innerHTML=popup.innerHTML;
    fl.classList.add('visible');
    reposition(icon);
  }
  function hide(){fl.classList.remove('visible');}
  function reposition(icon){
    const GAP=8;
    const r=icon.getBoundingClientRect();
    const fw=fl.offsetWidth||230;
    const fh=fl.offsetHeight||100;
    let top=r.top-fh-GAP;
    let left=r.left+r.width/2-fw/2;
    if(top<4){top=r.bottom+GAP;}
    left=Math.max(4,Math.min(left,window.innerWidth-fw-4));
    fl.style.top=top+'px';
    fl.style.left=left+'px';
  }

  document.addEventListener('mouseover',function(e){
    const icon=e.target.closest('.m-tip-icon');
    if(icon){clearTimeout(tid);show(icon);}
  });
  document.addEventListener('mouseout',function(e){
    const icon=e.target.closest('.m-tip-icon');
    if(icon){tid=setTimeout(hide,80);}
  });
}
