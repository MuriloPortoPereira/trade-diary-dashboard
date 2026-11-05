/* BEGIN STUDYHUB INTEGRATED BUNDLE */
(() => {
  const host = document.getElementById('studyHubLegacyApp');
  if (!host || host.dataset.loaded === '1') return;
  host.classList.add('embed-mode');
  host.innerHTML = "<!-- ──────────── MÓDULO 0: PROPFIRM ──────────── -->\n<div class=\"hub-module active\" id=\"mod-propfirm\">\n<input type=\"hidden\" id=\"gCot\" value=\"5.80\"><span id=\"cotBadge\" style=\"display:none\">R$ 5,80</span>\n<div id=\"pf-app\">\n\n<!-- TABS -->\n<div class=\"tabs-nav\">\n  <button class=\"tab-btn active\" onclick=\"sh_pfTab(0)\">📊 Simulador</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(1)\">📋 Multi-Payout</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(2)\">🧮 Calculadora</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(3)\">💼 Grandes Contas</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(4)\">🎯 2 Fases</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(5)\">🎯 1 Fase</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(6)\">🎯 Instant</button>\n  <button class=\"tab-btn\" onclick=\"sh_pfTab(7)\">📅 RRR Unificado</button>\n</div>\n\n<!-- ══════════════════════ ABA 0: SIMULADOR ══════════════════════ -->\n<div class=\"tab-panel active\" id=\"pf-tab0\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">🏆 Simulador de Payouts — Prop Firms</div>\n      <button class=\"btn primary\" onclick=\"sh_calcSimulador()\">▶ Calcular</button>\n    </div>\n    <div class=\"sec-body\">\n      <!-- Parâmetros principais -->\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital total da conta prop. Base de cálculo para todos os limites e metas em percentual.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_conta\" value=\"100000\" oninput=\"sh_calcSimulador()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro bruto que a prop repassa ao trader. Ex: 80% significa que de cada $100 de lucro, você recebe $80 antes de IR e taxas.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_payout\" value=\"80\" step=\"1\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo %</b><p>Limite máximo de drawdown da conta em percentual do capital. Ao atingir, a conta é encerrada pela prop.</p><div class=\"tr\"><span>5%</span><span>Regra conservadora</span></div><div class=\"tr\"><span>10%</span><span>Padrão do mercado</span></div></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_ddmax\" value=\"10\" step=\"0.5\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário %</b><p>Limite de perda máxima em uma única sessão, em percentual do capital. Resetado a cada dia.</p><p>Ao atingir, você deve parar de operar no dia.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_dddaily\" value=\"5\" step=\"0.5\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR aplicada sobre o lucro líquido recebido. Varia conforme regime tributário e residência fiscal.</p><div class=\"tr\"><span>Brasil (DARF)</span><span>15% a 22,5%</span></div><div class=\"tr\"><span>Ganho mensal &lt; R$20k</span><span>Isento (B3)</span></div></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_ir\" value=\"6\" step=\"1\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Percentual cobrado pela prop ou corretora sobre o payout bruto como taxa de serviço ou gestão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_taxa\" value=\"2\" step=\"0.5\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>RRR Alvo <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Quantas vezes o alvo é maior que o stop. RRR 2 significa que para cada $1 arriscado, o alvo é $2.</p><div class=\"tr\"><span>0.618</span><span>Setup agressivo (alta WR)</span></div><div class=\"tr\"><span>1.5 – 2</span><span>Equilíbrio saudável</span></div><div class=\"tr\"><span>3+</span><span>Setup de tendência / swing</span></div></span></span></label><select id=\"s_rrr\" onchange=\"sh_calcSimulador()\"><option value=\"0.618\">0.618</option><option value=\"1\" selected>1:1</option><option value=\"1.141\">1.141</option><option value=\"1.618\">1.618</option><option value=\"2\">1:2</option></select></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Número de stops cheios consecutivos até bater o DD Máximo. Quanto maior, mais margem para sequências negativas sem encerrar a conta.</p><div class=\"tr\"><span>Menos de 10</span><span>Alta fragilidade</span></div><div class=\"tr\"><span>20 ou mais</span><span>Gestão confortável</span></div></span></span></label><input type=\"number\" id=\"s_stops\" value=\"40\" min=\"1\" oninput=\"sh_calcSimulador()\"></div>\n      </div>\n      <!-- Intervalo personalizado -->\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Intervalo de Metas — começa em 0, Intervalo = seu Risco por trade</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Intervalo % (= Risco por trade) <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Metas</b><p>Cada linha da tabela avança este percentual de lucro. Use o mesmo valor do seu risco por trade — assim cada linha representa exatamente 1R ganho.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_step\" value=\"0.25\" step=\"0.05\" min=\"0.01\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Fim % <span class=\"tip\">?<span class=\"tip-box\"><b>Fim da Tabela</b><p>Até qual percentual de lucro a tabela é gerada. Defina como a meta total de lucro da conta para ver o payout esperado no alvo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"s_fim\" value=\"10\" step=\"0.25\" min=\"0.01\" oninput=\"sh_calcSimulador()\"><span class=\"u\">%</span></div></div>\n        </div>\n      </div>\n      <!-- Outputs rápidos — agora 6 cards: risco + DD Max + DD Diário com stops -->\n      <div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Risco por Entrada % <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Entrada %</b><p>Percentual da conta arriscado em cada operação, calculado a partir do DD Máximo dividido pelo número de stops configurado.</p></span></span></div><div class=\"out-big cb\" id=\"s_risco_ent\" style=\"font-size:15px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Risco USD / trade <span class=\"tip\">?<span class=\"tip-box\"><b>Risco USD por Trade</b><p>Valor em dólares arriscado por operação. É o percentual de risco aplicado sobre o capital da conta.</p></span></span></div><div class=\"out-big cy\" id=\"s_risco_usd\" style=\"font-size:15px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Alvo USD / trade <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo USD por Trade</b><p>Lucro em dólares por operação vencedora, calculado como Risco USD × RRR configurado.</p></span></span></div><div class=\"out-big cg\" id=\"s_alvo_usd\" style=\"font-size:15px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">DD Máximo (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo em USD</b><p>Valor absoluto do drawdown máximo permitido. Ao atingir este valor de perda acumulada, a conta é encerrada pela prop. O sub-valor mostra quantos stops cheios cabem.</p></span></span></div><div class=\"out-big cr\" id=\"s_ddmax_usd\" style=\"font-size:15px\">—</div><div class=\"out-sub\" id=\"s_stops_max\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">DD Diário (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário em USD</b><p>Limite de perda por sessão em valor absoluto. O sub-valor mostra quantos stops cheios cabem dentro deste limite antes de encerrar o dia.</p></span></span></div><div class=\"out-big co\" id=\"s_dd_usd\" style=\"font-size:15px\">—</div><div class=\"out-sub\" id=\"s_stops_dia\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Entradas p/ bater meta <span class=\"tip\">?<span class=\"tip-box\"><b>Entradas para Bater a Meta</b><p>Número de trades vencedores consecutivos necessários para atingir o lucro percentual de cada linha da tabela, considerando o RRR configurado.</p></span></span></div><div class=\"out-big cp\" id=\"s_meta_trades\" style=\"font-size:15px\">—</div></div>\n      </div>\n      <!-- Tabela sem scroll -->\n      <div class=\"tbl-wrap\">\n        <table class=\"tbl\">\n          <thead><tr>\n            <th class=\"al\">Lucro %</th>\n            <th>Lucro USD</th>\n            <th>Payout Bruto USD</th>\n            <th>Payout Bruto BRL</th>\n            <th>Após IR (BRL)</th>\n            <th>Líquido Final BRL</th>\n            <th>Trades p/ Meta</th>\n            <th>Líquido / Trade BRL</th>\n          </tr></thead>\n          <tbody id=\"simTbody\"></tbody>\n        </table>\n      </div>\n      <div class=\"chart-wrap\" style=\"height:180px;margin-top:12px\"><canvas id=\"pfSimChart\"></canvas></div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 1: MULTI-PAYOUT ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab1\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">📋 Comparativo Multi-Payout USD &amp; BRL</div>\n      <button class=\"btn primary\" onclick=\"sh_calcMulti()\">▶ Calcular</button>\n    </div>\n    <div class=\"sec-body\">\n      <div style=\"display:flex;justify-content:center;gap:12px;margin-bottom:10px;flex-wrap:wrap\">\n        <div class=\"field\" style=\"margin:0;width:220px\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital base para converter os percentuais de lucro em valores absolutos em USD e BRL.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_conta\" value=\"100000\" oninput=\"sh_calcMulti()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0;width:180px\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR aplicada sobre cada célula de payout da tabela comparativa.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_ir\" value=\"6\" oninput=\"sh_calcMulti()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0;width:200px\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo de serviço descontado do payout bruto antes do repasse ao trader.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_taxa\" value=\"2\" oninput=\"sh_calcMulti()\"><span class=\"u\">%</span></div></div>\n      </div>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Intervalo — começa em 0, Intervalo = Risco por trade</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Intervalo % (= Risco) <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Lucro</b><p>Incremento entre as linhas da tabela, equivalente ao seu risco por trade. Cada linha representa 1R a mais de lucro acumulado.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_step\" value=\"0.25\" step=\"0.05\" min=\"0.01\" oninput=\"sh_calcMulti()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Fim % <span class=\"tip\">?<span class=\"tip-box\"><b>Fim da Tabela</b><p>Limite superior da tabela comparativa. Defina como a meta total de lucro da conta para ver o payout líquido no alvo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_fim\" value=\"10\" step=\"0.25\" oninput=\"sh_calcMulti()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Payout Custom % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout Personalizado</b><p>Coluna extra da tabela com o percentual de payout que você negociou ou pretende negociar com a prop. Útil para comparar com os percentuais padrão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"m_custom\" value=\"88\" step=\"1\" min=\"1\" max=\"100\" oninput=\"sh_calcMulti()\"><span class=\"u\">%</span></div></div>\n        </div>\n      </div>\n      <div class=\"tbl-wrap\">\n        <table class=\"tbl\">\n          <thead><tr>\n            <th class=\"al\">Lucro %</th>\n            <th>Lucro USD</th>\n            <th class=\"cy\">50%</th><th class=\"cy\">55%</th><th class=\"cy\">60%</th><th class=\"cy\">65%</th>\n            <th class=\"cg\">70%</th><th class=\"cg\">75%</th><th class=\"cg\">80%</th><th class=\"cg\">85%</th><th class=\"cg\">90%</th>\n            <th class=\"cp\">Custom</th>\n          </tr></thead>\n          <tbody id=\"multiTbody\"></tbody>\n        </table>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 2: CALCULADORA ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab2\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\"><div class=\"sec-title\">🧮 Prop Firm — Calculadora Completa</div></div>\n    <div class=\"sec-body\">\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital total da conta prop. Base de cálculo para todos os limites, metas e riscos em percentual.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_conta\" value=\"100000\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo %</b><p>Limite máximo de drawdown da conta. Ao atingir este percentual de queda, a conta é encerrada.</p><div class=\"tr\"><span>Calculado sobre</span><span>capital inicial</span></div></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_ddmax\" value=\"10\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário %</b><p>Perda máxima permitida em uma única sessão. Resetada a cada dia. Ao atingir, encerre o dia imediatamente.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_dddaily\" value=\"5\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta de Lucro % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta de Lucro %</b><p>Percentual de lucro sobre o capital necessário para ser aprovado na fase de avaliação ou para solicitar o payout.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_meta\" value=\"8\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Quantidade de stops cheios seguidos que a conta suporta antes de bater o DD Máximo. Quanto maior, mais segura é a operação.</p></span></span></label><input type=\"number\" id=\"pf_stops\" value=\"20\" oninput=\"sh_calcPropFirm()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Entradas/Dia <span class=\"tip\">?<span class=\"tip-box\"><b>Entradas por Dia</b><p>Número de trades que você planeja executar por sessão. Usado para calcular o número estimado de dias até atingir a meta.</p></span></span></label><input type=\"number\" id=\"pf_entradas\" value=\"4\" oninput=\"sh_calcPropFirm()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>RRR Alvo <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Proporção entre o alvo de ganho e o stop de perda por trade. RRR 2 significa alvo = 2× o risco.</p><div class=\"tr\"><span>1:1</span><span>Precisa de WR &gt; 50%</span></div><div class=\"tr\"><span>2:1</span><span>Breakeven com WR 33%</span></div></span></span></label><select id=\"pf_rrr\" onchange=\"sh_calcPropFirm()\"><option value=\"0.618\">0.618</option><option value=\"1\" selected>1:1</option><option value=\"1.141\">1.141</option><option value=\"1.618\">1.618</option><option value=\"2\">1:2</option></select></div>\n        <div class=\"field\" style=\"margin:0\"><label>Assertividade % <span class=\"tip\">?<span class=\"tip-box\"><b>Assertividade (Win Rate)</b><p>Percentual de trades encerrados como WIN. Combinado com o RRR, determina a expectância do setup.</p><div class=\"tr\"><span>WR mínimo 1:1</span><span>50%</span></div><div class=\"tr\"><span>WR mínimo 2:1</span><span>34%</span></div></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_assert\" value=\"60\" step=\"1\" min=\"1\" max=\"100\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro bruto que a prop repassa ao trader. Calculado antes de IR e taxas de intermediação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_payout\" value=\"80\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR aplicada sobre o valor recebido após payout e taxa de intermediação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_ir\" value=\"15\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo cobrado pela prop ou corretora sobre o payout bruto, antes do repasse ao trader.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_taxa\" value=\"2\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n        <div></div>\n      </div>\n      <!-- Metas do Dia -->\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Metas do Dia</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Stop Loss diário % <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Loss Diário %</b><p>Percentual da conta que você se propõe a perder como máximo por sessão. Diferente do DD Diário da prop — este é o seu limite pessoal de gestão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_sl_dia\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Meta de Gain diária % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta de Gain Diária %</b><p>Alvo de lucro por sessão em percentual da conta. Ao atingir, considere encerrar o dia para proteger o resultado.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"pf_gain_dia\" value=\"2\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcPropFirm()\"><span class=\"u\">%</span></div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Stop Loss USD <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Loss em USD</b><p>Valor absoluto do seu stop pessoal diário convertido para dólares. É quanto você aceita perder no máximo em uma sessão.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--red)\" id=\"pf_sl_usd\">—</div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Meta Gain USD <span class=\"tip\">?<span class=\"tip-box\"><b>Meta de Gain em USD</b><p>Valor absoluto do seu alvo de lucro diário. Ao atingir este valor no dia, considere encerrar a sessão.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--green)\" id=\"pf_gain_usd\">—</div></div>\n        </div>\n      </div>\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Risco/Entrada % <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Entrada %</b><p>Percentual da conta arriscado por operação, calculado a partir do DD Máximo dividido pelo número de stops configurado.</p></span></span></div><div class=\"out-big cy\" id=\"pf_r1\" style=\"font-size:16px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Risco/Entrada USD <span class=\"tip\">?<span class=\"tip-box\"><b>Risco em USD por Trade</b><p>Valor em dólares arriscado por operação — o percentual de risco aplicado sobre o capital da conta.</p></span></span></div><div class=\"out-big co\" id=\"pf_r2\" style=\"font-size:16px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\">\n          <div class=\"out-lbl\">DD Máximo (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo em USD</b><p>Limite absoluto de drawdown da conta. Ao atingir, a conta é encerrada pela prop. Sub-valor: quantos stops cheios cabem antes de bater este limite.</p></span></span></div>\n          <div class=\"out-big cr\" id=\"pf_ddmax_usd\" style=\"font-size:16px\">—</div>\n          <div class=\"out-sub\" id=\"pf_stops_max\">—</div>\n        </div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\">\n          <div class=\"out-lbl\">DD Diário (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário em USD</b><p>Limite de perda por sessão em valor absoluto. Sub-valor: quantos stops cheios cabem dentro deste limite antes de encerrar o dia.</p></span></span></div>\n          <div class=\"out-big co\" id=\"pf_dddaily_usd\" style=\"font-size:16px\">—</div>\n          <div class=\"out-sub\" id=\"pf_r3\">—</div>\n        </div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Meta USD <span class=\"tip\">?<span class=\"tip-box\"><b>Meta em USD</b><p>Valor absoluto da meta de lucro da conta para aprovação ou saque, calculado sobre o capital configurado.</p></span></span></div><div class=\"out-big cb\" id=\"pf_r4\" style=\"font-size:16px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Trades p/ Meta <span class=\"tip\">?<span class=\"tip-box\"><b>Trades para Bater a Meta</b><p>Número de trades vencedores necessários para atingir a meta de lucro, considerando o RRR e o risco por trade configurados.</p></span></span></div><div class=\"out-big cp\" id=\"pf_r5\" style=\"font-size:16px\">—</div><div class=\"out-sub\" id=\"pf_r5sub\"></div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Dias Estimados <span class=\"tip\">?<span class=\"tip-box\"><b>Dias Estimados</b><p>Estimativa de dias úteis para atingir a meta, considerando o número de entradas por dia configurado e os trades necessários. É uma projeção otimista — assume win rate suficiente.</p></span></span></div><div class=\"out-big cm\" id=\"pf_r6\" style=\"font-size:16px\">—</div></div>\n        <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Alvo/trade (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo por Trade em USD</b><p>Lucro esperado por operação vencedora em dólares: Risco USD × RRR configurado.</p></span></span></div><div class=\"out-big cg\" id=\"pf_alvo_usd\" style=\"font-size:16px\">—</div></div>\n      </div>\n      <div class=\"out-box\" style=\"background:rgba(63,185,80,.06);border-color:rgba(63,185,80,.3);padding:14px\">\n        <div class=\"out-lbl\">✅ Líquido Final BRL <span class=\"tip\">?<span class=\"tip-box\"><b>Líquido Final em BRL</b><p>Valor líquido que você recebe ao atingir a meta — após payout, taxa de intermediação, IR e conversão para reais pela cotação atual do dólar.</p></span></span></div>\n        <div class=\"out-big cg\" id=\"pf_r7\" style=\"font-size:28px\">—</div>\n        <div class=\"out-sub\" id=\"pf_r7sub\"></div>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 3: GRANDES CONTAS ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab3\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">💼 Simulação — Grandes Contas até $400k</div>\n      <button class=\"btn primary\" onclick=\"sh_calcGrandes()\">▶ Calcular</button>\n    </div>\n    <div class=\"sec-body\">\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro bruto repassado pela prop ao trader, antes de IR e taxa de intermediação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_payout\" value=\"80\" oninput=\"sh_calcGrandes()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR aplicada sobre o valor recebido após payout e taxa de intermediação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_ir\" value=\"6\" oninput=\"sh_calcGrandes()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo de serviço descontado do payout bruto antes do repasse ao trader.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_taxa\" value=\"2\" oninput=\"sh_calcGrandes()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Alvo Líquido (R$) <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo Líquido em BRL</b><p>Valor em reais que você quer receber no final, já descontados IR e taxas. A tabela mostra qual tamanho de conta e risco por trade são necessários para atingi-lo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_alvo\" value=\"5000\" oninput=\"sh_calcGrandes()\"><span class=\"u\">R$</span></div></div>\n      </div>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Intervalo — começa em 0, Intervalo = Risco por trade</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Intervalo % (= Risco) <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Risco</b><p>Cada linha da tabela avança esse percentual — equivale ao risco por trade. Cada linha = 1R de lucro acumulado.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_step\" value=\"0.25\" step=\"0.05\" min=\"0.01\" oninput=\"sh_calcGrandes()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Fim % <span class=\"tip\">?<span class=\"tip-box\"><b>Fim da Tabela</b><p>Limite superior do risco simulado. Defina como a meta total de lucro para ver o payout líquido esperado no alvo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"gc_fim\" value=\"10\" step=\"0.25\" oninput=\"sh_calcGrandes()\"><span class=\"u\">%</span></div></div>\n        </div>\n      </div>\n      <div class=\"tbl-wrap\">\n        <table class=\"tbl\">\n          <thead><tr>\n            <th class=\"al\">Lucro %</th>\n            <th>$1k</th><th>$2k</th><th>$5k</th><th>$10k</th><th>$25k</th>\n            <th>$50k</th><th>$75k</th><th>$100k</th><th>$150k</th><th>$200k</th>\n            <th>$300k</th><th>$400k</th>\n          </tr></thead>\n          <tbody id=\"grandesTbody\"></tbody>\n        </table>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 4: 2 FASES ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab4\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">🎯 Gerenciamento — 2 Fases</div>\n      <div class=\"btn-row\">\n        <button class=\"btn primary\" onclick=\"sh_calc2Fases()\">▶ Calcular</button>\n        <label class=\"btn success\" style=\"cursor:pointer\">↑ Importar JSON/CSV<input type=\"file\" accept=\".csv,.json\" style=\"display:none\" onchange=\"sh_importFase(event,'2f')\"></label>\n        <button class=\"btn\" onclick=\"sh_exportFase('2f')\">↓ Exportar</button>\n      </div>\n    </div>\n    <div class=\"sec-body\">\n      <!-- Parâmetros -->\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital da conta de avaliação 2 fases. Base para todos os cálculos de risco, metas e payout.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_conta\" value=\"100000\" oninput=\"sh_calc2Fases()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo %</b><p>Drawdown máximo permitido pela prop. Ao atingir em qualquer ponto da avaliação ou na conta funded, ela é encerrada.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_ddmax\" value=\"10\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário %</b><p>Limite de perda por sessão estabelecido pela prop. Diferente do seu stop pessoal — este é o limite regulatório da conta.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_dddaily\" value=\"5\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder Conta <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Quantos stops cheios seguidos cabem antes de bater o DD Máximo. Indica a margem de erro da gestão de risco.</p></span></span></label><input type=\"number\" id=\"f2_stops\" value=\"40\" oninput=\"sh_calc2Fases()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Fase 1 % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Fase 1 %</b><p>Lucro percentual necessário para ser aprovado na primeira fase da avaliação e avançar para a Fase 2.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_meta1\" value=\"8\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Fase 2 % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Fase 2 %</b><p>Lucro percentual necessário para ser aprovado na segunda fase e receber a conta funded.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_meta2\" value=\"5\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Funded Mensal % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Funded Mensal %</b><p>Lucro mensal alvo na conta funded para solicitar o payout. Geralmente não obrigatório — é o seu objetivo de renda.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_metaf\" value=\"5\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Entradas/Dia <span class=\"tip\">?<span class=\"tip-box\"><b>Entradas por Dia</b><p>Número médio de trades por sessão. Usado para estimar o número de dias necessários para atingir as metas de cada fase.</p></span></span></label><input type=\"number\" id=\"f2_entradas\" value=\"4\" oninput=\"sh_calc2Fases()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro que a prop repassa ao trader. Incide sobre o lucro bruto da conta funded.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_payout\" value=\"80\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR sobre o valor recebido após payout. Consulte seu regime tributário para o valor correto.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_ir\" value=\"15\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo de serviço cobrado antes do repasse ao trader, sobre o payout bruto.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_taxa\" value=\"2\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n        <div></div>\n      </div>\n      <!-- Metas operacionais do dia -->\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Metas Operacionais do Dia</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Meta Stop Loss % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal Diário</b><p>Seu limite de perda por sessão — diferente do DD Diário da prop. Serve como proteção proativa antes de chegar no limite regulatório.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_sl\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Meta Gain % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain Diário</b><p>Meta de lucro por sessão. Ao atingir, considere encerrar o dia para proteger o resultado e evitar overtrading.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f2_gain\" value=\"2\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calc2Fases()\"><span class=\"u\">%</span></div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Stop Loss USD <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal em USD</b><p>Valor absoluto do seu stop pessoal diário. Ao atingir esta perda em uma sessão, encerre o dia — mesmo que o DD Diário da prop ainda não tenha sido atingido.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--red)\" id=\"f2_sl_usd\">—</div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Gain USD <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain em USD</b><p>Valor absoluto do seu alvo de lucro diário. Ao atingir, considere encerrar a sessão para proteger o resultado.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--green)\" id=\"f2_gain_usd\">—</div></div>\n        </div>\n      </div>\n      <div id=\"f2Results\"></div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 5: 1 FASE ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab5\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">🎯 Gerenciamento — 1 Fase</div>\n      <div class=\"btn-row\">\n        <button class=\"btn primary\" onclick=\"sh_calc1Fase()\">▶ Calcular</button>\n        <label class=\"btn success\" style=\"cursor:pointer\">↑ Importar JSON/CSV<input type=\"file\" accept=\".csv,.json\" style=\"display:none\" onchange=\"sh_importFase(event,'1f')\"></label>\n        <button class=\"btn\" onclick=\"sh_exportFase('1f')\">↓ Exportar</button>\n      </div>\n    </div>\n    <div class=\"sec-body\">\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital da conta de avaliação 1 fase. Base para todos os cálculos de risco, metas e payout.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_conta\" value=\"50000\" oninput=\"sh_calc1Fase()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo %</b><p>Drawdown máximo permitido pela prop. Ao atingir em qualquer momento da avaliação ou conta funded, ela é encerrada.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_ddmax\" value=\"6\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário %</b><p>Limite de perda por sessão da prop. Resetado diariamente. Ao atingir, encerre imediatamente o dia operacional.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_dddaily\" value=\"3\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Quantidade de stops consecutivos suportados antes de bater o DD Máximo. Quanto mais, maior a margem para drawdowns naturais do setup.</p></span></span></label><input type=\"number\" id=\"f1_stops\" value=\"20\" oninput=\"sh_calc1Fase()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Prova % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta de Prova %</b><p>Lucro percentual necessário para passar na avaliação 1 fase e receber a conta funded.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_metap\" value=\"10\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Funded Mensal % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Funded Mensal %</b><p>Alvo de lucro mensal na conta funded para solicitar payout. Defina com base na sua capacidade de execução sem forçar frequência.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_metaf\" value=\"5\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Entradas/Dia <span class=\"tip\">?<span class=\"tip-box\"><b>Entradas por Dia</b><p>Número médio de trades por sessão. Usado para calcular estimativa de dias para atingir a meta da prova.</p></span></span></label><input type=\"number\" id=\"f1_entradas\" value=\"4\" oninput=\"sh_calc1Fase()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro repassado pela prop ao trader na conta funded.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_payout\" value=\"80\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR sobre o payout recebido. Consulte seu regime tributário.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_ir\" value=\"15\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo de serviço da prop ou corretora sobre o payout bruto, descontado antes do repasse.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_taxa\" value=\"2\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n        <div></div><div></div>\n      </div>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Metas Operacionais do Dia</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Meta Stop Loss % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal Diário</b><p>Seu limite de perda por sessão — proteção antes de atingir o DD Diário da prop. Boa prática: metade do DD Diário da conta.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_sl\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Meta Gain % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain Diário</b><p>Meta de lucro por sessão. Ao atingir, considere encerrar o dia — dias positivos protegidos são mais valiosos do que ganhos extras com risco de reversão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"f1_gain\" value=\"2\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calc1Fase()\"><span class=\"u\">%</span></div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Stop Loss USD <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal em USD</b><p>Valor absoluto do seu stop pessoal diário. Ao atingir esta perda em uma sessão, encerre o dia imediatamente.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--red)\" id=\"f1_sl_usd\">—</div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Gain USD <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain em USD</b><p>Valor absoluto do seu alvo de lucro diário. Ao atingir, considere encerrar a sessão para proteger o resultado.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--green)\" id=\"f1_gain_usd\">—</div></div>\n        </div>\n      </div>\n      <div id=\"f1Results\"></div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 6: INSTANT ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab6\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">🎯 Gerenciamento — Instant</div>\n      <div class=\"btn-row\">\n        <button class=\"btn primary\" onclick=\"sh_calcInstant()\">▶ Calcular</button>\n        <label class=\"btn success\" style=\"cursor:pointer\">↑ Importar JSON/CSV<input type=\"file\" accept=\".csv,.json\" style=\"display:none\" onchange=\"sh_importFase(event,'inst')\"></label>\n        <button class=\"btn\" onclick=\"sh_exportFase('inst')\">↓ Exportar</button>\n      </div>\n    </div>\n    <div class=\"sec-body\">\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital da conta instant funded — sem fase de avaliação, começa operando imediatamente. Base para todos os cálculos de risco e payout.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_conta\" value=\"50000\" oninput=\"sh_calcInstant()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown Máximo %</b><p>Limite total de queda da conta. Instant fundings tendem a ter DD máximo mais restritivo que contas com avaliação — maior risco para a prop.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_ddmax\" value=\"5\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown Diário %</b><p>Limite de perda por sessão. Resetado diariamente. Contas instant costumam ter DD diário mais apertado — atenção redobrada na gestão de risco.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_dddaily\" value=\"3\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Quantos stops cheios consecutivos cabem antes de bater o DD Máximo. Indica a margem de erro da gestão de risco.</p><div class=\"tr\"><span>Menos de 10</span><span>Alta fragilidade</span></div><div class=\"tr\"><span>20 ou mais</span><span>Gestão confortável</span></div></span></span></label><input type=\"number\" id=\"in_stops\" value=\"20\" oninput=\"sh_calcInstant()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Funded Mensal % <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Funded Mensal</b><p>Seu alvo de lucro mensal para solicitar payout. Em contas instant geralmente não há meta obrigatória — use como objetivo de renda pessoal.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_metaf\" value=\"5\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Entradas/Dia <span class=\"tip\">?<span class=\"tip-box\"><b>Entradas por Dia</b><p>Número médio de trades por sessão. Usado para estimar o tempo necessário para atingir a meta mensal.</p></span></span></label><input type=\"number\" id=\"in_entradas\" value=\"4\" oninput=\"sh_calcInstant()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Payout % <span class=\"tip\">?<span class=\"tip-box\"><b>Payout %</b><p>Percentual do lucro bruto repassado pela prop. Instant fundings costumam oferecer payout mais alto (90–95%) como compensação pela ausência de avaliação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_payout\" value=\"95\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>IR % <span class=\"tip\">?<span class=\"tip-box\"><b>Imposto de Renda %</b><p>Alíquota de IR sobre o payout recebido. Consulte seu regime tributário.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_ir\" value=\"15\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Taxa Intermediação % <span class=\"tip\">?<span class=\"tip-box\"><b>Taxa de Intermediação %</b><p>Custo de serviço descontado do payout bruto antes do repasse ao trader.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_taxa\" value=\"2\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n        <div></div><div></div><div></div>\n      </div>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:10px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Metas Operacionais do Dia</div>\n        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Meta Stop Loss % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal Diário</b><p>Seu limite de perda por sessão — mais conservador que o DD Diário da prop. Acionar antes protege a conta de chegar no limite regulatório.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_sl\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Meta Gain % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain Diário</b><p>Meta de lucro por sessão. Atingiu? Considere encerrar o dia. Dias verdes protegidos valem mais que ganhos extras com risco de reversão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"in_gain\" value=\"2\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcInstant()\"><span class=\"u\">%</span></div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Stop Loss USD <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal em USD</b><p>Valor absoluto do seu stop pessoal diário. Em contas instant o DD diário é mais restritivo — seu stop pessoal deve ser ainda mais conservador.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--red)\" id=\"in_sl_usd\">—</div></div>\n          <div class=\"out-box\" style=\"padding:6px;text-align:center;margin:0\"><div class=\"out-lbl\">Gain USD <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain em USD</b><p>Valor absoluto do alvo diário. Ao atingir, proteja o resultado encerrando a sessão.</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--green)\" id=\"in_gain_usd\">—</div></div>\n        </div>\n      </div>\n      <div id=\"inResults\"></div>\n    </div>\n  </div>\n</div>\n\n<!-- ══════════════════════ ABA 7: RRR UNIFICADO ══════════════════════ -->\n<div class=\"tab-panel\" id=\"pf-tab7\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">📅 Simulador de Cenários — RRR Unificado</div>\n      <button class=\"btn primary\" onclick=\"sh_calcRRR()\">▶ Calcular</button>\n    </div>\n    <div class=\"sec-body\">\n      <!-- Parâmetros da conta -->\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\">\n        <div class=\"field\" style=\"margin:0\"><label>Conta (USD) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta (USD)</b><p>Capital base da conta. Usado para converter percentuais de risco, metas e DD em valores absolutos em dólar.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"r_conta\" value=\"50000\" oninput=\"sh_calcRRR()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Máximo % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Máximo %</b><p>Limite total de drawdown da conta. Ao atingir, a conta é encerrada pela prop ou deve ser pausada por gestão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"r_ddmax\" value=\"10\" oninput=\"sh_calcRRR()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>DD Diário % <span class=\"tip\">?<span class=\"tip-box\"><b>DD Diário %</b><p>Limite de perda por sessão estabelecido pela prop. Ao atingir, encerre o dia imediatamente.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"r_dddaily\" value=\"5\" oninput=\"sh_calcRRR()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Stops p/ Perder <span class=\"tip\">?<span class=\"tip-box\"><b>Stops para Perder a Conta</b><p>Quantos stops cheios a conta suporta antes de bater o DD Máximo. Determina o risco máximo por trade.</p></span></span></label><input type=\"number\" id=\"r_stops\" value=\"20\" oninput=\"sh_calcRRR()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Stop Loss % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Pessoal Diário</b><p>Seu limite de perda por sessão — mais conservador que o DD Diário da prop. Acionar antes protege a conta de atingir o limite regulatório.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"r_sl\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcRRR()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Meta Gain % / dia <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Gain Diário</b><p>Meta de lucro por sessão. Atingiu? Considere encerrar o dia. Consistência de dias verdes vale mais do que maximizar cada sessão.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"r_gain\" value=\"2\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcRRR()\"><span class=\"u\">%</span></div></div>\n        <div></div><div></div>\n      </div>\n\n      <!-- Info geral: risco por nível + metas do dia -->\n      <div id=\"rrrInfo\" style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px\"></div>\n      <div id=\"rrrDayInfo\" style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px\"></div>\n\n      <!-- 5 colunas RRR -->\n      <div style=\"display:grid;grid-template-columns:repeat(5,1fr);gap:10px\" id=\"rrrGrid\"></div>\n    </div>\n  </div>\n</div>\n\n</div><!-- #app --></div><!-- /mod-propfirm -->\n\n<!-- ──────────── MÓDULO 1: PLANO DE TRADE ──────────── -->\n<div class=\"hub-module\" id=\"mod-plano\">\n<input type=\"hidden\" id=\"cotInput\" value=\"5.80\"><span id=\"cotDisp\" style=\"display:none\"></span>\n<div id=\"pt-app\">\n<div class=\"tabs-nav\">\n  <button class=\"tab-btn active\" onclick=\"sh_ptTab(0)\">📋 Plano de Trade</button>\n  <button class=\"tab-btn\" onclick=\"sh_ptTab(1)\">📉 Loss Contínuo &amp; Alternado</button>\n  <button class=\"tab-btn\" onclick=\"sh_ptTab(2)\">📊 Cálculos Day Trade</button>\n</div>\n\n<!-- ═══════ ABA 1: PLANO DE TRADE ═══════ -->\n<div class=\"tab-panel active\" id=\"pt-tab0\">\n\n  <!-- CICLOS -->\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">🔄 Simulador de Ciclos</div>\n      <div class=\"btn-row\">\n        <button class=\"btn success\" onclick=\"sh_addCiclo()\">+ Ciclo</button>\n        <button class=\"btn primary\" onclick=\"sh_calcCiclos()\">▶ Calcular</button>\n      </div>\n    </div>\n    <div class=\"sec-body\">\n      <div class=\"fr5\" style=\"margin-bottom:14px;gap:8px\">\n        <div class=\"field\" style=\"margin:0\"><label>Capital Inicial ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Inicial</b><p>Saldo de partida do Ciclo 1. Os ciclos seguintes herdam automaticamente o capital final do ciclo anterior.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicCap\" value=\"1000\" step=\"1\" oninput=\"sh_calcCiclos()\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Risco inicial (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Risco Inicial %</b><p>Percentual do capital arriscado por operação no Ciclo 1. Com juros compostos, o valor em USD cresce a cada ciclo conforme o capital aumenta.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicRisco\" value=\"1\" step=\"0.1\" min=\"0.01\" oninput=\"sh_calcCiclos()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Redução risco (%/cic) <span class=\"tip\">?<span class=\"tip-box\"><b>Redução de Risco por Ciclo</b><p>Quanto o risco percentual diminui a cada ciclo. Permite simular uma gestão mais conservadora à medida que o capital cresce.</p><div class=\"tr\"><span>0</span><span>Risco fixo em todos os ciclos</span></div><div class=\"tr\"><span>0.25</span><span>Reduz 0.25% a cada ciclo</span></div></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicRedRisco\" value=\"0.25\" step=\"0.05\" min=\"0\" oninput=\"sh_calcCiclos()\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>RRR inicial <span class=\"tip\">?<span class=\"tip-box\"><b>RRR Inicial</b><p>Relação Risco:Retorno do Ciclo 1. Define quanto o alvo é maior que o stop. RRR 2 = alvo 2× o risco.</p></span></span></label><input type=\"number\" id=\"cicRRR\" value=\"1\" step=\"0.001\" min=\"0.1\" oninput=\"sh_calcCiclos()\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>Δ RRR por ciclo <span class=\"tip\">?<span class=\"tip-box\"><b>Variação de RRR por Ciclo</b><p>Quanto o RRR aumenta ou diminui a cada ciclo. Use positivo para simular evolução do setup, negativo para conservadorismo, 0 para manter fixo.</p></span></span></label><input type=\"number\" id=\"cicDeltaRRR\" value=\"0\" step=\"0.001\" oninput=\"sh_calcCiclos()\"></div>\n      </div>\n      <div class=\"fr3\" style=\"margin-bottom:14px;gap:8px\">\n        <div class=\"field\" style=\"margin:0\"><label>Intervalo redução risco (ciclos) <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Redução de Risco</b><p>A cada quantos ciclos a redução de risco é aplicada. Ex: 2 = reduz o risco a cada 2 ciclos.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicIntRisco\" value=\"1\" step=\"1\" min=\"1\" oninput=\"sh_calcCiclos()\"><span class=\"u\">#</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Intervalo Δ RRR (ciclos) <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Variação de RRR</b><p>A cada quantos ciclos o delta de RRR é aplicado. Permite progressão gradual do RRR ao longo dos ciclos.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicIntRRR\" value=\"1\" step=\"1\" min=\"1\" oninput=\"sh_calcCiclos()\"><span class=\"u\">#</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>N operações por ciclo <span class=\"tip\">?<span class=\"tip-box\"><b>Operações por Ciclo</b><p>Número de trades executados em cada ciclo. O ganho final de cada ciclo usa juros compostos com esse volume de trades e a expectância do setup.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"cicNOps\" value=\"200\" step=\"1\" min=\"1\" oninput=\"sh_calcCiclos()\"><span class=\"u\">ops</span></div></div>\n      </div>\n      <div class=\"tbl-wrap\">\n        <table class=\"tbl\">\n          <thead><tr><th class=\"al\">Ciclo</th><th>Capital ($)</th><th>Risco%</th><th>RRR</th><th>Ops</th><th>Cap. Final ($)</th><th>Ganho/Op ($)</th><th>Ganho Total ($)</th><th>Em R$</th><th></th></tr></thead>\n          <tbody id=\"ciclosTbody\"></tbody>\n        </table>\n      </div>\n      <div class=\"chart-wrap\" style=\"height:180px\"><canvas id=\"ciclosChart\"></canvas></div>\n    </div>\n  </div>\n\n  <!-- PARCIAIS + SIMULAÇÃO BR + METAS -->\n  <div class=\"g3\" style=\"margin-bottom:16px\">\n\n    <!-- PARCIAIS -->\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">🎯 Parciais — RRR Efetivo</div></div>\n      <div class=\"sec-body\">\n        <div class=\"fr3\" style=\"margin-bottom:10px\">\n          <div>\n            <div class=\"field\"><label>Alvo 1 (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Parcial 1 — % da Posição</b><p>Percentual do tamanho total da posição encerrado neste primeiro alvo. A soma dos três alvos deve ser 100%.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"p1p\" value=\"50\" min=\"0\" max=\"100\" step=\"5\" oninput=\"sh_calcParciais()\"><span class=\"u\">%</span></div></div>\n            <div class=\"field\"><label>RRR 1 <span class=\"tip\">?<span class=\"tip-box\"><b>RRR desta Parcial</b><p>Relação risco:retorno específica deste alvo. O RRR Médio resultante é a média ponderada dos três alvos pelo percentual de posição encerrado em cada um.</p></span></span></label><input type=\"number\" id=\"p1r\" value=\"0.618\" step=\"0.001\" oninput=\"sh_calcParciais()\"></div>\n          </div>\n          <div>\n            <div class=\"field\"><label>Alvo 2 (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Parcial 2 — % da Posição</b><p>Percentual da posição encerrado no segundo alvo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"p2p\" value=\"25\" min=\"0\" max=\"100\" step=\"5\" oninput=\"sh_calcParciais()\"><span class=\"u\">%</span></div></div>\n            <div class=\"field\"><label>RRR 2 <span class=\"tip\">?<span class=\"tip-box\"><b>RRR desta Parcial</b><p>Relação risco:retorno do segundo alvo.</p></span></span></label><input type=\"number\" id=\"p2r\" value=\"1.000\" step=\"0.001\" oninput=\"sh_calcParciais()\"></div>\n          </div>\n          <div>\n            <div class=\"field\"><label>Alvo 3 (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Parcial 3 — % da Posição</b><p>Percentual da posição encerrado no terceiro alvo. O restante não encerrado representa a parcial de tendência ou runner.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"p3p\" value=\"25\" min=\"0\" max=\"100\" step=\"5\" oninput=\"sh_calcParciais()\"><span class=\"u\">%</span></div></div>\n            <div class=\"field\"><label>RRR 3 <span class=\"tip\">?<span class=\"tip-box\"><b>RRR desta Parcial</b><p>Relação risco:retorno do terceiro alvo. Quanto maior, mais o setup aproveitou o movimento.</p></span></span></label><input type=\"number\" id=\"p3r\" value=\"1.141\" step=\"0.001\" oninput=\"sh_calcParciais()\"></div>\n          </div>\n        </div>\n        <div class=\"fr3\" style=\"gap:8px;margin-bottom:10px\">\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">RRR Médio <span class=\"tip\">?<span class=\"tip-box\"><b>RRR Efetivo Médio</b><p>Relação risco:retorno resultante ao fechar os três alvos parciais com os pesos definidos. É a média ponderada de RRR1×%1 + RRR2×%2 + RRR3×%3. Use este valor para calcular a expectância real do setup.</p></span></span></div><div class=\"out-big cb\" id=\"pRRR\">—</div></div>\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Soma % <span class=\"tip\">?<span class=\"tip-box\"><b>Soma dos Percentuais</b><p>Total dos percentuais distribuídos entre os três alvos. Deve ser exatamente 100% para que o cálculo do RRR Médio seja válido.</p></span></span></div><div class=\"out-big\" id=\"pSoma\">—</div></div>\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Excedente <span class=\"tip\">?<span class=\"tip-box\"><b>Excedente</b><p>Diferença entre a soma dos percentuais e 100%. Se positivo, você está distribuindo mais que a posição inteira. Se negativo, há posição não alocada (runner sem alvo definido).</p></span></span></div><div class=\"out-big\" id=\"pExc\">—</div></div>\n        </div>\n        <div class=\"sep\"></div>\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">Referência</div>\n        <div class=\"tbl-wrap tbl-scroll\" style=\"max-height:200px\">\n          <table class=\"tbl\"><thead><tr><th class=\"al\">Combinação</th><th>RRR</th></tr></thead><tbody id=\"parcRefTbody\"></tbody></table>\n        </div>\n      </div>\n    </div>\n\n    <!-- SIMULAÇÃO MERCADO BR (WDO/WIN) -->\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">🇧🇷 Simulação Mercado BR</div></div>\n      <div class=\"sec-body\">\n        <div class=\"fr3\" style=\"margin-bottom:10px;gap:6px\">\n          <div class=\"field\" style=\"margin:0\">\n            <label>Mercado <span class=\"tip\">?<span class=\"tip-box\"><b>Mercado</b><p>WDO = Mini Dólar — cada ponto vale R$10. WIN = Mini Índice — cada ponto vale R$0,20. Define o valor monetário de cada ponto na simulação.</p></span></span></label>\n            <select id=\"brMercado\" onchange=\"sh_calcBR()\">\n              <option value=\"WDO\">WDO (Mini Dólar)</option>\n              <option value=\"WIN\">WIN (Mini Índice)</option>\n            </select>\n          </div>\n          <div class=\"field\" style=\"margin:0\"><label>Total de Contratos <span class=\"tip\">?<span class=\"tip-box\"><b>Total de Contratos</b><p>Número de contratos da posição completa, a ser distribuído entre os alvos parciais definidos abaixo.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"brContratos\" value=\"3\" min=\"1\" step=\"1\" oninput=\"sh_calcBR()\"><span class=\"u\">ctt</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Valor do STOP (pts) <span class=\"tip\">?<span class=\"tip-box\"><b>Stop em Pontos</b><p>Distância em pontos do seu stop loss em relação à entrada. Usado para calcular o risco financeiro total da operação em reais.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"brStop\" value=\"12\" step=\"1\" oninput=\"sh_calcBR()\"><span class=\"u\">pts</span></div></div>\n        </div>\n        <div class=\"fr4\" style=\"gap:6px;margin-bottom:10px\">\n          <div class=\"field\" style=\"margin:0\"><label>Ctt Alvo 1 (61,8%) <span class=\"tip\">?<span class=\"tip-box\"><b>Contratos no Alvo 1</b><p>Quantos contratos encerrar no alvo de 61,8% do stop (nível de Fibonacci). Parcial conservadora para garantir parte do lucro cedo.</p></span></span></label><input type=\"number\" id=\"brA1\" value=\"1\" min=\"0\" step=\"1\" oninput=\"sh_calcBR()\"></div>\n          <div class=\"field\" style=\"margin:0\"><label>Ctt Alvo 2 (100%) <span class=\"tip\">?<span class=\"tip-box\"><b>Contratos no Alvo 2</b><p>Quantos contratos encerrar no alvo de 100% do stop (RRR 1:1). Equilíbrio entre realização e continuidade do trade.</p></span></span></label><input type=\"number\" id=\"brA2\" value=\"1\" min=\"0\" step=\"1\" oninput=\"sh_calcBR()\"></div>\n          <div class=\"field\" style=\"margin:0\"><label>Ctt Alvo 3 (161,8%) <span class=\"tip\">?<span class=\"tip-box\"><b>Contratos no Alvo 3</b><p>Quantos contratos encerrar no alvo de 161,8% do stop (extensão de Fibonacci). Maximiza o lucro em movimentos mais amplos.</p></span></span></label><input type=\"number\" id=\"brA3\" value=\"1\" min=\"0\" step=\"1\" oninput=\"sh_calcBR()\"></div>\n          <div class=\"field\" style=\"margin:0\"><label>Ctt Alvo 4 (200%) <span class=\"tip\">?<span class=\"tip-box\"><b>Contratos no Alvo 4</b><p>Quantos contratos encerrar no alvo de 200% do stop (RRR 2:1). Runner para trades de tendência forte.</p></span></span></label><input type=\"number\" id=\"brA4\" value=\"0\" min=\"0\" step=\"1\" oninput=\"sh_calcBR()\"></div>\n        </div>\n        <div class=\"tbl-wrap\" style=\"margin-bottom:8px\">\n          <table class=\"tbl\" id=\"brAlvosTbl\">\n            <thead><tr><th>Alvo</th><th>Mult.</th><th>Pts</th><th>Stop (R$)</th><th>Lucro/Ctt (R$)</th><th>Contratos</th><th>Lucro Total (R$)</th><th>% Total</th></tr></thead>\n            <tbody id=\"brAlvosTbody\"></tbody>\n          </table>\n        </div>\n        <div style=\"background:var(--bg1);border:1px solid var(--border);border-radius:6px;padding:8px 12px\">\n          <div class=\"fr3\" style=\"gap:8px\">\n            <div style=\"text-align:center\"><div class=\"out-lbl\">Stop Total (R$) <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Total em R$</b><p>Risco financeiro total da operação: Stop em pontos × Valor do ponto × Total de contratos. É quanto você perde se o stop for atingido antes de qualquer parcial.</p></span></span></div><div class=\"out-big cr\" id=\"brStopTotal\">—</div></div>\n            <div style=\"text-align:center\"><div class=\"out-lbl\">Lucro Total (R$) <span class=\"tip\">?<span class=\"tip-box\"><b>Lucro Total em R$</b><p>Ganho financeiro total somando todos os alvos parciais com os contratos alocados em cada um. É o resultado se todos os alvos forem atingidos.</p></span></span></div><div class=\"out-big cg\" id=\"brLucroTotal\">—</div></div>\n            <div style=\"text-align:center\"><div class=\"out-lbl\">Lucro Médio/Ctt (R$) <span class=\"tip\">?<span class=\"tip-box\"><b>Lucro Médio por Contrato</b><p>Média do lucro por contrato considerando a distribuição entre os alvos parciais. Útil para comparar setups com diferentes números de contratos.</p></span></span></div><div class=\"out-big cy\" id=\"brLucroMedio\">—</div></div>\n          </div>\n          <div style=\"display:flex;gap:6px;margin-top:8px;align-items:center;justify-content:center;font-size:11px\">\n            <span style=\"color:var(--muted)\">Status:</span>\n            <span id=\"brStatus\" style=\"font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700\">—</span>\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <!-- METAS -->\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\">\n        <div class=\"sec-title\">🏆 Calculadora de Metas</div>\n        <button class=\"btn primary\" onclick=\"sh_calcMetas()\">▶ Calcular</button>\n      </div>\n      <div class=\"sec-body\">\n        <div class=\"fr2\" style=\"margin-bottom:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Capital atual ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Atual</b><p>Saldo disponível para trading. Base para calcular o valor em dólar do risco e do lucro por trade.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"mCapUSD\" value=\"1000\"><span class=\"u\">$</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Risco por trade (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade %</b><p>Percentual do capital arriscado em cada operação. Combinado com o RRR, determina o lucro esperado por trade vencedor.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"mRisco\" value=\"1\" step=\"0.1\"><span class=\"u\">%</span></div></div>\n        </div>\n        <div class=\"fr2\" style=\"margin-bottom:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>RRR <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Proporção entre o alvo e o stop. Determina o lucro em dólar por trade vencedor.</p></span></span></label><input type=\"number\" id=\"mRRR\" value=\"1.141\" step=\"0.001\"></div>\n          <div class=\"field\" style=\"margin:0\"><label>Meta total ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Total</b><p>Valor em dólar que você quer acumular. A tabela calcula quantos acertos são necessários em diferentes prazos (1 semana, 1 mês, 3 meses, etc.).</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"mMeta\" value=\"1000\"><span class=\"u\">$</span></div></div>\n        </div>\n        <div class=\"fr2\" style=\"gap:8px;margin-bottom:10px\">\n          <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Risco/trade ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade em USD</b><p>Valor em dólares arriscado por operação: Capital × Risco%. Quanto maior, menos trades são necessários para atingir a meta — mas o drawdown em sequências de loss também é maior.</p></span></span></div><div class=\"out-big co\" id=\"mRiscoU\">—</div></div>\n          <div class=\"out-box\" style=\"padding:8px;text-align:center\"><div class=\"out-lbl\">Lucro/trade via RRR ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Lucro por Trade via RRR</b><p>Ganho em dólares por operação vencedora: Risco/trade × RRR. É o valor que entra no saldo a cada WIN. A tabela abaixo usa este valor para calcular quantos acertos são necessários por prazo.</p></span></span></div><div class=\"out-big cg\" id=\"mLucroU\">—</div></div>\n        </div>\n        <div class=\"tbl-wrap\">\n          <table class=\"tbl\"><thead><tr><th>Período</th><th>Dias úteis</th><th>Acertos</th><th>Acertos/sem</th><th>Acertos/dia</th></tr></thead><tbody id=\"metasTbody\"></tbody></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- RECUPERAÇÃO + LOSSES CONSECUTIVOS -->\n  <div class=\"g2\" style=\"margin-bottom:16px\">\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\">\n        <div class=\"sec-title\">🩹 Recuperação de Perdas <span class=\"tip\" style=\"font-size:10px\">?<span class=\"tip-box\"><b>Recuperação de Perdas</b><p>Mostra o quanto você precisa ganhar para recuperar cada nível de perda. Perdas são matematicamente assimétricas: perder 30% exige ganhar 43% para voltar ao ponto inicial.</p><div class=\"tr\"><span>Perda 10%</span><span>Precisa ganhar 11%</span></div><div class=\"tr\"><span>Perda 25%</span><span>Precisa ganhar 33%</span></div><div class=\"tr\"><span>Perda 50%</span><span>Precisa ganhar 100%</span></div></span></span></div>\n        <div class=\"iu\" style=\"width:120px\"><input type=\"number\" id=\"recovCap\" value=\"1000\" min=\"1\" step=\"100\" oninput=\"sh_calcRecov()\"><span class=\"u\">$</span></div>\n      </div>\n      <div class=\"sec-body\" style=\"padding:0\">\n        <div class=\"tbl-wrap\">\n          <table class=\"tbl\"><thead><tr><th class=\"al\">Perda</th><th>Saldo ($)</th><th>Perda ($)</th><th>Ganho p/ recuperar</th></tr></thead><tbody id=\"recovTbody\"></tbody></table>\n        </div>\n      </div>\n    </div>\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\">\n        <div class=\"sec-title\">🎲 Possibilidades de Losses Consecutivos <span class=\"tip\" style=\"font-size:10px\">?<span class=\"tip-box\"><b>Losses Consecutivos</b><p>Probabilidade estatística de sofrer N losses seguidos em 100 trades com o win rate definido. Use para se preparar psicologicamente para o drawdown esperado — sequências de losses são normais em qualquer setup lucrativo.</p></span></span></div>\n        <span class=\"tbadge\">100 trades</span>\n      </div>\n      <div class=\"sec-body\">\n        <div class=\"field\" style=\"margin-bottom:12px\">\n          <label>Win Rate: <span id=\"wrLbl\" class=\"cb\">55%</span> <span class=\"tip\">?<span class=\"tip-box\"><b>Win Rate</b><p>Percentual de trades vencedores do seu setup. Quanto menor o win rate, maior a probabilidade de sequências longas de losses consecutivos — planeje seu risco por trade considerando isso.</p></span></span></label>\n          <input type=\"range\" id=\"wrSlider\" min=\"10\" max=\"90\" step=\"1\" value=\"55\" oninput=\"document.getElementById('wrLbl').textContent=this.value+'%';sh_calcLosses()\">\n        </div>\n        <div class=\"tbl-wrap\" style=\"margin-bottom:10px\">\n          <table class=\"tbl\"><thead><tr><th>Sequência</th><th>P(ao menos X consec.)</th><th>Visual</th></tr></thead><tbody id=\"lossTbody\"></tbody></table>\n        </div>\n        <div class=\"chart-wrap\" style=\"height:160px\"><canvas id=\"lossChart\"></canvas></div>\n      </div>\n    </div>\n  </div>\n\n  <!-- HEATMAP + DD -->\n  <div class=\"g2\" style=\"margin-bottom:16px\">\n    <div class=\"sec\" style=\"margin:0;overflow:hidden\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">🗺️ Mapa de Expectância (WR × RRR) <span class=\"tip\">?<span class=\"tip-box\"><b>Mapa de Expectância</b><p>Heatmap que cruza Win Rate (linhas) com RRR (colunas) e classifica cada combinação em expectativa positiva (verde), breakeven (amarelo) ou negativa (vermelho). Use para identificar quais setups são matematicamente viáveis antes de operar.</p></span></span></div></div>\n      <div class=\"sec-body\" style=\"padding:10px\">\n        <div class=\"tbl-wrap\" style=\"overflow-x:auto\">\n          <table class=\"tbl\" id=\"heatTbl\" style=\"font-size:9px;min-width:0\"></table>\n        </div>\n        <div style=\"display:flex;gap:14px;margin-top:8px;font-size:10px;justify-content:center\">\n          <span><span style=\"display:inline-block;width:10px;height:10px;background:rgba(63,185,80,.18);border-radius:2px;margin-right:4px\"></span>Positiva</span>\n          <span><span style=\"display:inline-block;width:10px;height:10px;background:rgba(227,179,65,.18);border-radius:2px;margin-right:4px\"></span>Breakeven</span>\n          <span><span style=\"display:inline-block;width:10px;height:10px;background:rgba(248,81,73,.18);border-radius:2px;margin-right:4px\"></span>Negativa</span>\n        </div>\n      </div>\n    </div>\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\">\n        <div class=\"sec-title\">📈 Drawdown Recovery <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown Recovery</b><p>Simulação Monte Carlo que estima quantos trades são necessários para recuperar um drawdown sofrido. Insira a conta atual, o alvo e o setup de recuperação — o gráfico mostra a distribuição de cenários possíveis.</p></span></span></div>\n        <div class=\"btn-row\">\n          <button class=\"btn primary\" onclick=\"sh_calcDD()\">▶ Simular</button>\n          <button class=\"btn danger\" onclick=\"sh_clearDDHist()\">Limpar</button>\n        </div>\n      </div>\n      <div class=\"sec-body\">\n        <!-- modo: perda em $ ou % -->\n        <div style=\"display:flex;gap:8px;align-items:center;margin-bottom:10px\">\n          <label style=\"font-size:11px;color:var(--muted);font-weight:500\">Calcular por:</label>\n          <select id=\"ddModo\" onchange=\"sh_calcDDModo()\" style=\"width:120px\">\n            <option value=\"alvo\">Alvo direto ($)</option>\n            <option value=\"pct\">Perda em %</option>\n            <option value=\"usd\">Perda em $</option>\n          </select>\n        </div>\n        <div class=\"fr2\" style=\"margin-bottom:8px\" id=\"ddInputsAlvo\">\n          <div class=\"field\" style=\"margin:0\"><label>Conta atual ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Conta Atual</b><p>Saldo atual após o drawdown sofrido. A simulação projeta quantos trades são necessários para recuperar o capital.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"ddAtual\" value=\"700\" oninput=\"sh_calcDD()\"><span class=\"u\">$</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Alvo ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo de Recuperação</b><p>Capital que você quer atingir. Pode ser o capital original (recuperação total) ou um valor intermediário.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"ddAlvo\" value=\"1000\" oninput=\"sh_calcDD()\"><span class=\"u\">$</span></div></div>\n        </div>\n        <div id=\"ddInputsPct\" style=\"display:none;margin-bottom:8px\">\n          <div class=\"fr2\">\n            <div class=\"field\" style=\"margin:0\"><label>Capital original ($)</label><div class=\"iu\"><input type=\"number\" id=\"ddCapOrig\" value=\"1000\" oninput=\"sh_calcDDFromPct()\"><span class=\"u\">$</span></div></div>\n            <div class=\"field\" style=\"margin:0\"><label>Perda sofrida (%)</label><div class=\"iu\"><input type=\"number\" id=\"ddPerdaPct\" value=\"30\" step=\"1\" oninput=\"sh_calcDDFromPct()\"><span class=\"u\">%</span></div></div>\n          </div>\n        </div>\n        <div id=\"ddInputsUSD\" style=\"display:none;margin-bottom:8px\">\n          <div class=\"fr2\">\n            <div class=\"field\" style=\"margin:0\"><label>Capital original ($)</label><div class=\"iu\"><input type=\"number\" id=\"ddCapOrig2\" value=\"1000\" oninput=\"sh_calcDDFromUSD()\"><span class=\"u\">$</span></div></div>\n            <div class=\"field\" style=\"margin:0\"><label>Perda sofrida ($)</label><div class=\"iu\"><input type=\"number\" id=\"ddPerdaUSD\" value=\"300\" step=\"10\" oninput=\"sh_calcDDFromUSD()\"><span class=\"u\">$</span></div></div>\n          </div>\n        </div>\n        <div class=\"fr2\" style=\"margin-bottom:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Win Rate % <span class=\"tip\">?<span class=\"tip-box\"><b>Win Rate</b><p>Percentual de trades vencedores do setup usado para a recuperação. Afeta diretamente a velocidade e probabilidade de recuperação.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"ddWR\" value=\"55\" min=\"1\" max=\"99\" oninput=\"sh_calcDD()\"><span class=\"u\">%</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>RRR <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Proporção entre alvo e stop do setup de recuperação. RRR maior reduz o número de trades necessários para recuperar.</p></span></span></label><input type=\"number\" id=\"ddRRR\" value=\"1.141\" step=\"0.001\" oninput=\"sh_calcDD()\"></div>\n        </div>\n        <div class=\"fr2\" style=\"margin-bottom:8px\">\n          <div class=\"field\" style=\"margin:0\"><label>Risco % / trade <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade %</b><p>Percentual do capital arriscado por operação durante a fase de recuperação. Evite aumentar o risco para \"recuperar mais rápido\" — isso tende a aprofundar o drawdown.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"ddRisco\" value=\"1\" step=\"0.1\" oninput=\"sh_calcDD()\"><span class=\"u\">%</span></div></div>\n          <div></div>\n        </div>\n        <div class=\"fr2\" style=\"gap:8px;margin-bottom:8px\">\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">DD Atual <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown Atual %</b><p>Percentual de queda do capital atual em relação ao capital original. Quanto maior, mais trades são necessários para a recuperação completa.</p></span></span></div><div class=\"out-big cr\" id=\"ddPctOut\">—</div></div>\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Mediana (trades) <span class=\"tip\">?<span class=\"tip-box\"><b>Mediana de Trades para Recuperar</b><p>Em 50% das simulações Monte Carlo, o capital se recupera em até este número de trades com o setup configurado. É a estimativa mais realista — metade dos cenários termina antes, metade depois.</p></span></span></div><div class=\"out-big cy\" id=\"ddMedOut\">—</div></div>\n        </div>\n        <div class=\"out-box\" style=\"padding:8px;margin-bottom:8px;text-align:center\"><div class=\"out-lbl\">Range P10–P90 <span class=\"tip\">?<span class=\"tip-box\"><b>Intervalo de Confiança P10–P90</b><p>Em 80% dos cenários simulados, a recuperação acontece dentro deste intervalo de trades. P10 = cenário adverso (10% dos casos ficam abaixo). P90 = cenário favorável (90% dos casos terminam antes).</p></span></span></div><div style=\"font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--muted)\" id=\"ddRangeOut\">—</div></div>\n        <div id=\"ddHistBox\" style=\"display:none;background:var(--bg1);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-bottom:8px\">\n          <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px\">Histórico (<span id=\"ddHistCount\">0</span> simulações)</div>\n          <div style=\"display:flex;gap:6px;flex-wrap:wrap\" id=\"ddHistChips\"></div>\n        </div>\n        <div class=\"chart-wrap\" style=\"height:150px\"><canvas id=\"ddChart\"></canvas></div>\n      </div>\n    </div>\n  </div>\n\n  <!-- PROGRESSÃO + DIÁRIO -->\n  <div class=\"sec\" style=\"margin-bottom:16px\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">📊 Progressão de Capital</div>\n      <button class=\"btn primary\" onclick=\"sh_renderPlanilha()\">▶ Calcular</button>\n    </div>\n    <div class=\"sec-body\">\n      <div class=\"fr4\" style=\"margin-bottom:12px\">\n        <div class=\"field\" style=\"margin:0\"><label>Capital Inicial ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Inicial</b><p>Ponto de partida da progressão. Cada linha da tabela representa 1 trade vencedor com juros compostos aplicados sobre o saldo acumulado.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"plCap\" value=\"1000\" step=\"1\"><span class=\"u\">$</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>Risco (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade %</b><p>Percentual arriscado por operação. Com juros compostos, cada trade vencedor aplica esse ganho sobre o saldo acumulado — não sobre o capital inicial.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"plRisco\" value=\"1\" step=\"0.1\" min=\"0.01\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\" style=\"margin:0\"><label>RRR <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Relação entre alvo e stop. Determina o ganho percentual por trade vencedor. Ex: risco 1% com RRR 2 = ganho 2% por trade.</p></span></span></label><input type=\"number\" id=\"plRRR\" value=\"1.141\" step=\"0.001\"></div>\n        <div class=\"field\" style=\"margin:0\"><label>USD/BRL <span class=\"tip\">?<span class=\"tip-box\"><b>Câmbio USD/BRL</b><p>Taxa de câmbio usada para converter os valores de dólar para reais na coluna BRL da tabela. Atualize conforme a cotação atual.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"plCot\" value=\"5.80\" step=\"0.01\"><span class=\"u\">R$</span></div></div>\n      </div>\n      <div class=\"g2\">\n        <div class=\"tbl-wrap tbl-scroll\" style=\"max-height:340px\">\n          <table class=\"tbl\">\n            <thead><tr><th class=\"al\">#</th><th>Capital ($)</th><th>Diferença ($)</th><th>Gain</th><th>Valor (R$)</th><th>Banca (R$)</th></tr></thead>\n            <tbody id=\"planilhaTbody\"></tbody>\n          </table>\n        </div>\n        <div class=\"chart-wrap\" style=\"height:340px;margin-top:0\"><canvas id=\"planilhaChart\"></canvas></div>\n      </div>\n    </div>\n  </div>\n\n\n\n</div><!-- /tab0 -->\n\n<!-- ═══════ ABA 2: LOSS ═══════ -->\n<div class=\"tab-panel\" id=\"pt-tab1\">\n  <div class=\"sec\">\n    <div class=\"sec-hdr\">\n      <div class=\"sec-title\">⚙️ Parâmetros</div>\n      <button class=\"btn primary\" onclick=\"sh_runSim()\">▶ Simular</button>\n    </div>\n    <div class=\"sec-body\">\n      <div class=\"fr4\">\n        <div class=\"field\"><label>Capital Inicial (R$) <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Inicial</b><p>Saldo de partida para as duas simulações. O Contínuo aplica −1R por trade (pior cenário). O Alternado simula L→W→L→W com o RRR definido.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"sCap\" value=\"5000\" step=\"100\"><span class=\"u\">R$</span></div></div>\n        <div class=\"field\"><label>Risco por trade (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade %</b><p>Percentual do saldo arriscado por operação. No modo contínuo, cada loss reduz o saldo nesse percentual cumulativamente.</p></span></span></label><div class=\"iu\"><input type=\"number\" id=\"sRisco\" value=\"2\" step=\"0.1\" min=\"0.01\"><span class=\"u\">%</span></div></div>\n        <div class=\"field\"><label>RRR <span style=\"font-size:9px;color:var(--dim)\">(alternado)</span> <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — modo alternado</b><p>Relação risco:retorno usada no modo L→W→L→W. Não afeta o modo contínuo — que aplica −1R fixo por trade independentemente do RRR.</p></span></span></label><input type=\"number\" id=\"sRRR\" value=\"1\" step=\"0.001\"></div>\n        <div class=\"field\"><label>N trades <span class=\"tip\">?<span class=\"tip-box\"><b>Número de Trades</b><p>Quantidade de operações simuladas. Contínuo = N losses seguidos. Alternado = N pares Loss/Win intercalados.</p></span></span></label><input type=\"number\" id=\"sN\" value=\"100\" min=\"5\" max=\"500\" step=\"5\"></div>\n      </div>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:10px 14px;font-size:11px;color:var(--muted);margin-top:4px\">\n        <strong style=\"color:var(--text)\">Modo Contínuo:</strong> perdas consecutivas de <strong style=\"color:var(--red)\">−1R</strong> (pior cenário) &nbsp;|&nbsp;\n        <strong style=\"color:var(--text)\">Modo Alternado:</strong> L→W→L→W… | Loss = −risco%, Win = +risco%×RRR\n      </div>\n    </div>\n  </div>\n  <div class=\"g2\" id=\"simResults\">\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">📉 Loss Contínuo</div><span style=\"font-size:9px;color:var(--red);font-family:'JetBrains Mono',monospace\">−1R por trade</span></div>\n      <div class=\"sec-body\" style=\"padding:10px\">\n        <div class=\"fr2\" style=\"gap:8px;margin-bottom:10px\">\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Saldo Final <span class=\"tip\">?<span class=\"tip-box\"><b>Saldo Final — Loss Contínuo</b><p>Capital restante após N losses consecutivos de −1R cada. Mostra o pior cenário possível: quanto sobra se você perder todos os trades seguidos.</p></span></span></div><div class=\"out-big cr\" id=\"cFinal\">—</div></div>\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Drawdown Total <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown Total — Loss Contínuo</b><p>Percentual de queda do capital inicial após todos os losses consecutivos. Quanto maior o risco por trade, mais devastador é o drawdown em sequências longas.</p></span></span></div><div class=\"out-big cr\" id=\"cDD\">—</div></div>\n        </div>\n        <div class=\"chart-wrap\" style=\"height:200px;margin-bottom:10px\"><canvas id=\"cChart\"></canvas></div>\n        <div class=\"tbl-wrap tbl-scroll\" style=\"max-height:280px\"><table class=\"tbl\"><thead><tr><th>#</th><th>Res</th><th>P&L (R$)</th><th>Saldo (R$)</th><th>DD%</th></tr></thead><tbody id=\"cTbody\"></tbody></table></div>\n      </div>\n    </div>\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">🔀 Loss/Win Alternado</div><span style=\"font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace\">L→W→L→W</span></div>\n      <div class=\"sec-body\" style=\"padding:10px\">\n        <div class=\"fr2\" style=\"gap:8px;margin-bottom:10px\">\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Saldo Final <span class=\"tip\">?<span class=\"tip-box\"><b>Saldo Final — Alternado</b><p>Capital após N pares L→W alternados. Mostra o efeito do RRR no longo prazo: com RRR &gt; 1 o saldo cresce mesmo com 50% de acerto; com RRR &lt; 1 deteriora progressivamente.</p></span></span></div><div class=\"out-big\" id=\"aFinal\">—</div></div>\n          <div class=\"out-box\" style=\"text-align:center;padding:8px\"><div class=\"out-lbl\">Drawdown <span class=\"tip\">?<span class=\"tip-box\"><b>Drawdown — Alternado</b><p>Maior queda acumulada registrada durante a sequência L→W. Mesmo com resultado final positivo, o drawdown mostra o pior momento que você passou no caminho.</p></span></span></div><div class=\"out-big cr\" id=\"aRet\">—</div></div>\n        </div>\n        <div class=\"chart-wrap\" style=\"height:200px;margin-bottom:10px\"><canvas id=\"aChart\"></canvas></div>\n        <div class=\"tbl-wrap tbl-scroll\" style=\"max-height:280px\"><table class=\"tbl\"><thead><tr><th>#</th><th>Res</th><th>P&L (R$)</th><th>Saldo (R$)</th><th>Acum%</th></tr></thead><tbody id=\"aTbody\"></tbody></table></div>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- ═══════ ABA 3: CÁLCULOS DT ═══════ -->\n<div class=\"tab-panel\" id=\"pt-tab2\">\n\n  <!-- CÁLCULO RÁPIDO DT: Futuros EUA -->\n  <div class=\"sec\" style=\"margin-bottom:16px\">\n    <div class=\"sec-hdr\"><div class=\"sec-title\">🇺🇸 Cálculo Rápido — Futuros EUA</div></div>\n    <div class=\"sec-body\">\n      <div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:12px\">\n        <!-- SP500 -->\n        <div class=\"dt-card\">\n          <div class=\"dt-card-hdr\">SP-500 <span class=\"tip\" style=\"font-size:9px;vertical-align:middle\">?<span class=\"tip-box\"><b>SP-500 (ES/MES)</b><p>Mini S&P 500. ES = contrato cheio ($50/pt) | MES = micro ($5/pt). Mínimo de variação: 0.25 pts. Negocia de domingo a sexta, ~23h/dia.</p></span></span></div>\n          <div class=\"dt-card-body\">\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Entrada <span class=\"tip\">?<span class=\"tip-box\"><b>Preço de Entrada</b><p>Preço do acionamento da ordem. Para futuros EUA, cada 0.25 pts = 1 tick = $12,50 no ES ou $1,25 no MES.</p></span></span></label><input type=\"number\" id=\"spEntrada\" value=\"4100\" step=\"0.25\" oninput=\"sh_calcDT('sp')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>Stop <span class=\"tip\">?<span class=\"tip-box\"><b>Preço de Stop Loss</b><p>Nível de preço onde a perda máxima é atingida e a posição é encerrada automaticamente.</p></span></span></label><input type=\"number\" id=\"spStop\" value=\"4099.75\" step=\"0.25\" oninput=\"sh_calcDT('sp')\"></div>\n            </div>\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Alvo <span class=\"tip\">?<span class=\"tip-box\"><b>Preço de Alvo (Take Profit)</b><p>Nível de preço do seu take profit. O RRR é calculado automaticamente a partir da distância relativa entre Entrada, Stop e Alvo.</p></span></span></label><input type=\"number\" id=\"spAlvo\" value=\"4101\" step=\"0.25\" oninput=\"sh_calcDT('sp')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>QTD <span class=\"tip\">?<span class=\"tip-box\"><b>Quantidade de Contratos</b><p>Número de contratos operados. O risco e lucro totais são multiplicados por este valor.</p></span></span></label><input type=\"number\" id=\"spQtd\" value=\"1\" min=\"1\" step=\"1\" oninput=\"sh_calcDT('sp')\"></div>\n            </div>\n            <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px\">\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Risco ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red)\" id=\"spRisco\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Lucro ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--green)\" id=\"spLucro\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">RRR</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--blue)\" id=\"spRRRout\">—</div></div>\n            </div>\n            <div class=\"vol-strip\">\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Último <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Último Preço</b><p>Cotação atual do ativo. Usada com Vol% para calcular a volatilidade diária em pontos e sugerir stops baseados em volatilidade.</p></span></span></div><input type=\"number\" id=\"spUlt\" value=\"6000\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('sp')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol% <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Volatilidade Diária %</b><p>Variação percentual média diária do ativo. Multiplicada pelo Último Preço para obter Vol pts. Stop sugerido = 20% da volatilidade diária em pontos.</p></span></span></div><input type=\"number\" id=\"spVolPct\" value=\"0.44\" step=\"0.01\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('sp')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol pts</div><div class=\"vc-val\" id=\"spVolPts\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">20% vol</div><div class=\"vc-val cy\" id=\"spVol20\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco/lote</div><div class=\"vc-val co\" id=\"spRiscoLote\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">QTD vol</div><input type=\"number\" id=\"spVolQtd\" value=\"1\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('sp')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco Tot</div><div class=\"vc-val cr\" id=\"spRiscoTot\">—</div></div>\n            </div>\n          </div>\n        </div>\n        <!-- NASDAQ -->\n        <div class=\"dt-card\">\n          <div class=\"dt-card-hdr\">NASDAQ <span class=\"tip\" style=\"font-size:9px;vertical-align:middle\">?<span class=\"tip-box\"><b>NASDAQ (NQ/MNQ)</b><p>Futuros do índice Nasdaq-100. NQ = contrato cheio ($20/pt) | MNQ = micro ($2/pt). Mínimo: 0.25 pts. Alta volatilidade — stop em pts vale mais em $ que no SP500.</p></span></span></div>\n          <div class=\"dt-card-body\">\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Entrada</label><input type=\"number\" id=\"nqEntrada\" value=\"18260\" step=\"0.25\" oninput=\"sh_calcDT('nq')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>Stop</label><input type=\"number\" id=\"nqStop\" value=\"14999.75\" step=\"0.25\" oninput=\"sh_calcDT('nq')\"></div>\n            </div>\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Alvo</label><input type=\"number\" id=\"nqAlvo\" value=\"15001\" step=\"0.25\" oninput=\"sh_calcDT('nq')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>QTD</label><input type=\"number\" id=\"nqQtd\" value=\"1\" min=\"1\" step=\"1\" oninput=\"sh_calcDT('nq')\"></div>\n            </div>\n            <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px\">\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Risco ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red)\" id=\"nqRisco\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Lucro ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--green)\" id=\"nqLucro\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">RRR</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--blue)\" id=\"nqRRRout\">—</div></div>\n            </div>\n            <div class=\"vol-strip\">\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Último <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Último Preço</b><p>Cotação atual do ativo. Usada com Vol% para calcular a volatilidade diária em pontos e sugerir stops baseados em volatilidade.</p></span></span></div><input type=\"number\" id=\"nqUlt\" value=\"21000\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('nq')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol% <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Volatilidade Diária %</b><p>Variação percentual média diária do ativo. Multiplicada pelo Último Preço para obter Vol pts. Stop sugerido = 20% da volatilidade diária em pontos.</p></span></span></div><input type=\"number\" id=\"nqVolPct\" value=\"0.60\" step=\"0.01\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('nq')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol pts</div><div class=\"vc-val\" id=\"nqVolPts\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">20% vol</div><div class=\"vc-val cy\" id=\"nqVol20\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco/lote</div><div class=\"vc-val co\" id=\"nqRiscoLote\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">QTD vol</div><input type=\"number\" id=\"nqVolQtd\" value=\"1\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('nq')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco Tot</div><div class=\"vc-val cr\" id=\"nqRiscoTot\">—</div></div>\n            </div>\n          </div>\n        </div>\n        <!-- OIL CL -->\n        <div class=\"dt-card\">\n          <div class=\"dt-card-hdr\">OIL (CL) <span class=\"tip\" style=\"font-size:9px;vertical-align:middle\">?<span class=\"tip-box\"><b>Petróleo Bruto (CL/MCL)</b><p>Futuro do WTI Crude Oil. CL = contrato cheio ($1.000/pt) | MCL = micro ($100/pt). Mínimo: 0.01 pts. Alta reatividade a notícias geopolíticas e estoques semanais.</p></span></span></div>\n          <div class=\"dt-card-body\">\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Entrada</label><input type=\"number\" id=\"clEntrada\" value=\"63\" step=\"0.01\" oninput=\"sh_calcDT('cl')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>Stop</label><input type=\"number\" id=\"clStop\" value=\"62\" step=\"0.01\" oninput=\"sh_calcDT('cl')\"></div>\n            </div>\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Alvo</label><input type=\"number\" id=\"clAlvo\" value=\"64\" step=\"0.01\" oninput=\"sh_calcDT('cl')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>QTD</label><input type=\"number\" id=\"clQtd\" value=\"1\" min=\"1\" step=\"1\" oninput=\"sh_calcDT('cl')\"></div>\n            </div>\n            <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px\">\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Risco ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red)\" id=\"clRisco\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Lucro ($)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--green)\" id=\"clLucro\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">RRR</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--blue)\" id=\"clRRRout\">—</div></div>\n            </div>\n            <div class=\"vol-strip\">\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Último <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Último Preço</b><p>Cotação atual do ativo. Usada com Vol% para calcular a volatilidade diária em pontos e sugerir stops baseados em volatilidade.</p></span></span></div><input type=\"number\" id=\"clUlt\" value=\"69\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('cl')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol% <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Volatilidade Diária %</b><p>Variação percentual média diária do ativo. Multiplicada pelo Último Preço para obter Vol pts. Stop sugerido = 20% da volatilidade diária em pontos.</p></span></span></div><input type=\"number\" id=\"clVolPct\" value=\"2.70\" step=\"0.01\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('cl')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol pts</div><div class=\"vc-val\" id=\"clVolPts\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">20% vol</div><div class=\"vc-val cy\" id=\"clVol20\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco/lote</div><div class=\"vc-val co\" id=\"clRiscoLote\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">QTD vol</div><input type=\"number\" id=\"clVolQtd\" value=\"1\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('cl')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco Tot</div><div class=\"vc-val cr\" id=\"clRiscoTot\">—</div></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- Futuros BR -->\n  <div class=\"sec\" style=\"margin-bottom:16px\">\n    <div class=\"sec-hdr\"><div class=\"sec-title\">🇧🇷 Cálculo Rápido — Futuros Brasileiros</div></div>\n    <div class=\"sec-body\">\n      <div class=\"g2\">\n        <!-- WDO -->\n        <div class=\"dt-card\">\n          <div class=\"dt-card-hdr\">WDOFUT — Mini Dólar <span class=\"tip\" style=\"font-size:9px;vertical-align:middle\">?<span class=\"tip-box\"><b>WDO — Mini Dólar</b><p>Futuro do dólar comercial na B3. Cada ponto = R$10 por contrato. Liquidado financeiramente no vencimento. Negocia das 9h às 18h (horário de Brasília).</p></span></span></div>\n          <div class=\"dt-card-body\">\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Entrada</label><input type=\"number\" id=\"wdEntrada\" value=\"5000\" step=\"0.5\" oninput=\"sh_calcDT('wd')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>Stop</label><input type=\"number\" id=\"wdStop\" value=\"5017\" step=\"0.5\" oninput=\"sh_calcDT('wd')\"></div>\n            </div>\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Alvo</label><input type=\"number\" id=\"wdAlvo\" value=\"5007\" step=\"0.5\" oninput=\"sh_calcDT('wd')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>QTD</label><input type=\"number\" id=\"wdQtd\" value=\"2\" min=\"1\" step=\"1\" oninput=\"sh_calcDT('wd')\"></div>\n            </div>\n            <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px\">\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Risco (R$)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red)\" id=\"wdRisco\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Lucro (R$)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--green)\" id=\"wdLucro\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">RRR</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--blue)\" id=\"wdRRRout\">—</div></div>\n            </div>\n            <div class=\"vol-strip\">\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Último <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Último Preço</b><p>Cotação atual do ativo. Usada com Vol% para calcular a volatilidade diária em pontos e sugerir stops baseados em volatilidade.</p></span></span></div><input type=\"number\" id=\"wdUlt\" value=\"5700\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wd')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol% <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Volatilidade Diária %</b><p>Variação percentual média diária do ativo. Multiplicada pelo Último Preço para obter Vol pts. Stop sugerido = 20% da volatilidade diária em pontos.</p></span></span></div><input type=\"number\" id=\"wdVolPct\" value=\"1.10\" step=\"0.01\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wd')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol pts</div><div class=\"vc-val\" id=\"wdVolPts\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">20% vol</div><div class=\"vc-val cy\" id=\"wdVol20\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">R$/lote</div><div class=\"vc-val co\" id=\"wdRiscoLote\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">QTD vol</div><input type=\"number\" id=\"wdVolQtd\" value=\"2\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wd')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco R$</div><div class=\"vc-val cr\" id=\"wdRiscoTot\">—</div></div>\n            </div>\n          </div>\n        </div>\n        <!-- WIN -->\n        <div class=\"dt-card\">\n          <div class=\"dt-card-hdr\">WINFUT — Mini Índice <span class=\"tip\" style=\"font-size:9px;vertical-align:middle\">?<span class=\"tip-box\"><b>WIN — Mini Índice Bovespa</b><p>Futuro do Ibovespa na B3. Cada ponto = R$0,20 por contrato. Negocia das 9h às 18h55 (horário de Brasília). Requer mais contratos para o mesmo risco em R$ em comparação ao WDO.</p></span></span></div>\n          <div class=\"dt-card-body\">\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Entrada</label><input type=\"number\" id=\"wiEntrada\" value=\"136660\" step=\"10\" oninput=\"sh_calcDT('wi')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>Stop</label><input type=\"number\" id=\"wiStop\" value=\"136000\" step=\"10\" oninput=\"sh_calcDT('wi')\"></div>\n            </div>\n            <div class=\"fr2\" style=\"gap:6px;margin-bottom:6px\">\n              <div class=\"field\" style=\"margin:0\"><label>Alvo</label><input type=\"number\" id=\"wiAlvo\" value=\"138460\" step=\"10\" oninput=\"sh_calcDT('wi')\"></div>\n              <div class=\"field\" style=\"margin:0\"><label>QTD</label><input type=\"number\" id=\"wiQtd\" value=\"7\" min=\"1\" step=\"1\" oninput=\"sh_calcDT('wi')\"></div>\n            </div>\n            <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px\">\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Risco (R$)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red)\" id=\"wiRisco\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">Lucro (R$)</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--green)\" id=\"wiLucro\">—</div></div>\n              <div class=\"out-box\" style=\"padding:5px;text-align:center\"><div class=\"out-lbl\">RRR</div><div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--blue)\" id=\"wiRRRout\">—</div></div>\n            </div>\n            <div class=\"vol-strip\">\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Último <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Último Preço</b><p>Cotação atual do ativo. Usada com Vol% para calcular a volatilidade diária em pontos e sugerir stops baseados em volatilidade.</p></span></span></div><input type=\"number\" id=\"wiUlt\" value=\"137400\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wi')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol% <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Volatilidade Diária %</b><p>Variação percentual média diária do ativo. Multiplicada pelo Último Preço para obter Vol pts. Stop sugerido = 20% da volatilidade diária em pontos.</p></span></span></div><input type=\"number\" id=\"wiVolPct\" value=\"1.60\" step=\"0.01\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wi')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Vol pts</div><div class=\"vc-val\" id=\"wiVolPts\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">20% vol</div><div class=\"vc-val cy\" id=\"wiVol20\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">R$/lote</div><div class=\"vc-val co\" id=\"wiRiscoLote\">—</div></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">QTD vol</div><input type=\"number\" id=\"wiVolQtd\" value=\"2\" style=\"width:100%;font-size:9px;padding:2px;text-align:center;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:3px\" oninput=\"sh_calcDTVol('wi')\"></div>\n              <div class=\"vol-cell\"><div class=\"vc-lbl\">Risco R$</div><div class=\"vc-val cr\" id=\"wiRiscoTot\">—</div></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- BLOCO UNIFICADO: Gerenciamento + Cálculo de Ações lado a lado -->\n  <div class=\"g2\" style=\"gap:16px\">\n\n    <!-- ESQUERDA: Gerenciamento WIN & WDO -->\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\">\n        <div class=\"sec-title\">📈 Gerenciamento de Risco — WIN &amp; WDO</div>\n        <button class=\"btn primary\" onclick=\"sh_calcAcoesFull()\">▶ Atualizar</button>\n      </div>\n      <div class=\"sec-body\">\n\n        <!-- VOLATILIDADE — topo -->\n        <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:14px\">\n          <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px\">\n            Volatilidade Histórica — Máximo de Risco por Trade\n            <span style=\"color:var(--dim);text-transform:none;letter-spacing:0;font-size:9px\"> · Preencha abaixo ou use vol-strip dos futuros BR</span>\n          </div>\n          <div class=\"fr2\" style=\"gap:8px;margin-bottom:8px\">\n            <div class=\"field\" style=\"margin:0\"><label>Vol WIN — 20% da VH (pts)</label><input type=\"number\" id=\"winVolStop\" value=\"175.87\" step=\"0.01\" oninput=\"sh_calcAcoes()\"></div>\n            <div class=\"field\" style=\"margin:0\"><label>Vol DOL — 20% da VH (pts)</label><input type=\"number\" id=\"dolVolStop\" value=\"248.52\" step=\"0.01\" oninput=\"sh_calcAcoes()\"></div>\n          </div>\n          <table class=\"tbl\">\n            <thead><tr><th></th><th>Máx Risco/Trade</th><th>Diário ×3</th><th>Semanal ×6</th><th style=\"color:var(--yellow)\">Mensal ×12</th></tr></thead>\n            <tbody>\n              <tr>\n                <td class=\"al\" style=\"color:var(--green);font-weight:700\">WIN</td>\n                <td class=\"co\" id=\"winMRT\">—</td><td class=\"cb\" id=\"winDia\">—</td><td class=\"cb\" id=\"winSem\">—</td><td class=\"cy\" id=\"winMes\">—</td>\n              </tr>\n              <tr>\n                <td class=\"al\" style=\"color:var(--blue);font-weight:700\">DOL</td>\n                <td class=\"co\" id=\"dolMRT\">—</td><td class=\"cb\" id=\"dolDia\">—</td><td class=\"cb\" id=\"dolSem\">—</td><td class=\"cy\" id=\"dolMes\">—</td>\n              </tr>\n              <tr><td class=\"al cm\">Nº Stops</td><td class=\"cm\">—</td><td class=\"cm\">3</td><td class=\"cm\">6</td><td class=\"cm\">12</td></tr>\n            </tbody>\n          </table>\n        </div>\n\n        <!-- Por Pontos -->\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px\">\n          Por Pontos de Risco <span style=\"text-transform:none;letter-spacing:0\">— WIN: pts × R$0,20/pt · DOL: pts × R$10/pt</span>\n        </div>\n        <table class=\"tbl\" style=\"margin-bottom:14px\">\n          <thead><tr><th></th><th>Risco (R$)</th><th>Pts de Risco</th><th>R$/Ponto</th><th>N Contratos</th></tr></thead>\n          <tbody>\n            <tr>\n              <td class=\"al\" style=\"color:var(--green);font-weight:700\">WIN</td>\n              <td><input type=\"number\" id=\"winRiscoRef\" value=\"250\" min=\"1\" oninput=\"sh_calcGerRisco()\" style=\"width:65px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:4px;padding:3px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;text-align:center\"></td>\n              <td><input type=\"number\" id=\"winPts\" value=\"150\" min=\"1\" oninput=\"sh_calcGerRisco()\" style=\"width:65px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:4px;padding:3px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;text-align:center\"></td>\n              <td class=\"cy\" id=\"winPorPto\">—</td><td class=\"cb\" id=\"winNctt\">—</td>\n            </tr>\n            <tr>\n              <td class=\"al\" style=\"color:var(--blue);font-weight:700\">DOL</td>\n              <td><input type=\"number\" id=\"dolRiscoRef\" value=\"250\" min=\"1\" oninput=\"sh_calcGerRisco()\" style=\"width:65px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:4px;padding:3px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;text-align:center\"></td>\n              <td><input type=\"number\" id=\"dolPts\" value=\"10\" min=\"1\" oninput=\"sh_calcGerRisco()\" style=\"width:65px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:4px;padding:3px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;text-align:center\"></td>\n              <td class=\"cy\" id=\"dolPorPto\">—</td><td class=\"cb\" id=\"dolNctt\">—</td>\n            </tr>\n          </tbody>\n        </table>\n\n        <!-- Como calcular VH -->\n        <div style=\"background:var(--bg1);border:1px solid var(--border);border-radius:8px;padding:10px;font-size:11px;color:var(--muted);line-height:1.6\">\n          <div style=\"color:var(--text);font-weight:600;margin-bottom:6px;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.08em\">Como calcular a Volatilidade Histórica (VH)</div>\n          <ol style=\"padding-left:16px;font-size:10px\">\n            <li>Insira no gráfico o <strong>VH Aritmético de 20 períodos</strong>.</li>\n            <li>Adicione uma <strong>Média Móvel de 200 períodos</strong> na janela do VH.</li>\n            <li>No gráfico intraday (5 min), observe onde a média está posicionada e trace uma linha.</li>\n            <li>Busque os valores da média de 200, considerando os <strong>últimos 3 meses</strong>.</li>\n            <li>No gráfico diário, utilize o valor das <strong>Bandas de Pisani</strong> e a média dos candles.</li>\n          </ol>\n          <div class=\"sep\"></div>\n          <div style=\"font-size:10px;color:var(--dim)\">Ao configurar corretamente a volatilidade e o nível de risco, o número de operações permitidas é calculado automaticamente.</div>\n        </div>\n      </div>\n    </div>\n\n    <!-- DIREITA: Cálculo de Trading em Ações -->\n    <div class=\"sec\" style=\"margin:0\">\n      <div class=\"sec-hdr\"><div class=\"sec-title\">📋 Cálculo de Trading em Ações</div></div>\n      <div class=\"sec-body\">\n        <div class=\"fr2\" style=\"gap:8px;margin-bottom:10px\">\n          <div class=\"field\" style=\"margin:0\"><label>Risco Financeiro (R$)</label><div class=\"iu\"><input type=\"number\" id=\"acRisco\" value=\"250\" oninput=\"sh_calcAcoes()\"><span class=\"u\">R$</span></div></div>\n          <div class=\"field\" style=\"margin:0\"><label>Dif. Compra/Venda (R$)</label><div class=\"iu\"><input type=\"number\" id=\"acDif\" value=\"0.45\" step=\"0.01\" oninput=\"sh_calcAcoes()\"><span class=\"u\">R$</span></div></div>\n        </div>\n        <div class=\"field\" style=\"margin-bottom:12px\"><label>Tx. Corretagem (R$)</label><div class=\"iu\"><input type=\"number\" id=\"acCorr\" value=\"0\" step=\"0.01\" oninput=\"sh_calcAcoes()\"><span class=\"u\">R$</span></div></div>\n        <div style=\"background:var(--bg1);border:1px solid var(--border);border-radius:6px;padding:12px 14px\">\n          <div class=\"out-lbl\" style=\"margin-bottom:4px\">Quantidade Permitida (Ações)</div>\n          <div class=\"out-big cb\" id=\"acQtd\">—</div>\n          <div style=\"font-size:10px;color:var(--dim);margin-top:4px\">Acima de 75 pode arredondar pra cima</div>\n        </div>\n      </div>\n    </div>\n\n  </div><!-- /g2 -->\n\n</div><!-- /tab2 -->\n</div><!-- #app --></div><!-- /mod-plano -->\n\n<!-- ──────────── MÓDULO 2: TRADE SIMULATOR ──────────── -->\n<div class=\"hub-module\" id=\"mod-tradesim\">\n  <div style=\"padding:12px 20px;border-bottom:1px solid var(--border);background:var(--bg1);display:flex;align-items:center;justify-content:space-between\">\n    <span style=\"font-size:11px;color:var(--muted)\">Monte Carlo · Sequências · Distribuição de Resultados</span>\n    <button class=\"run-btn\" onclick=\"sh_tsRunAll()\">\n      <svg viewBox=\"0 0 16 16\" fill=\"currentColor\"><path d=\"M3 3l10 5-10 5V3z\"/></svg>\n      Simular\n    </button>\n  </div>\n<div class=\"ts-layout\">\n\n<!-- ─── SIDEBAR ─── -->\n<div class=\"ts-sidebar\">\n<div class=\"ts-sidebar-inner\">\n\n  <div class=\"ts-sidebar-group\">\n    <div class=\"ts-sidebar-group-label\">// Capital & Risco</div>\n    <div class=\"field\">\n      <label>Capital Inicial <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Inicial</b><p>Saldo de partida do simulador. Todas as simulações partem deste valor. Com juros compostos ativos, o risco em $ por trade muda conforme o saldo evolui a cada operação.</p></span></span></label>\n      <div class=\"input-unit\">\n        <input type=\"number\" id=\"ts-capital\" value=\"10000\" min=\"100\" step=\"100\">\n        <span class=\"unit\">$</span>\n      </div>\n    </div>\n    <div class=\"field\">\n      <label>Risco por Trade <span class=\"tip\">?<span class=\"tip-box\"><b>Risco por Trade %</b><p>Percentual do capital arriscado por operação. Com juros compostos, o valor em $ muda a cada trade conforme o saldo cresce ou diminui.</p></span></span></label>\n      <div class=\"range-row\">\n        <input type=\"range\" id=\"riskRange\" min=\"0.1\" max=\"5\" step=\"0.1\" value=\"1\" oninput=\"sh_syncRange('risk','riskRange',this.value,'%')\">\n        <span class=\"range-val\" id=\"riskRangeVal\">1.0%</span>\n      </div>\n      <div class=\"input-unit\" style=\"margin-top:6px\">\n        <input type=\"number\" id=\"risk\" value=\"1\" min=\"0.1\" max=\"10\" step=\"0.1\" oninput=\"sh_syncInput('risk','riskRange',this.value,'%')\">\n        <span class=\"unit\">%</span>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"ts-sidebar-group\">\n    <div class=\"ts-sidebar-group-label\">// Limites Diários</div>\n    <div class=\"field-row\">\n      <div class=\"field\">\n        <label>Stop Diário <span class=\"tip\">?<span class=\"tip-box\"><b>Stop Diário %</b><p>Limite de perda total no dia. Se o saldo cair abaixo deste percentual do capital inicial, o dia encerra automaticamente na simulação — prevenindo overtrading em dias ruins.</p></span></span></label>\n        <div class=\"input-unit\">\n          <input type=\"number\" id=\"dailyStop\" value=\"2\" min=\"0.1\" max=\"20\" step=\"0.1\">\n          <span class=\"unit\">%</span>\n        </div>\n      </div>\n      <div class=\"field\">\n        <label>Meta Diária <span class=\"tip\">?<span class=\"tip-box\"><b>Meta Diária %</b><p>Alvo de lucro por dia simulado. Se atingido antes do máximo de trades, o dia encerra automaticamente — modelando uma gestão de encerrar quando o alvo é batido.</p></span></span></label>\n        <div class=\"input-unit\">\n          <input type=\"number\" id=\"dailyTarget\" value=\"1\" min=\"0.1\" max=\"20\" step=\"0.1\">\n          <span class=\"unit\">%</span>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"ts-sidebar-group\">\n    <div class=\"ts-sidebar-group-label\">// Por Operação (RRR)</div>\n    <div class=\"field-row\">\n      <div class=\"field\">\n        <label>Stop/Trade <span class=\"tip\">?<span class=\"tip-box\"><b>Stop por Trade %</b><p>Percentual do capital que representa o stop loss desta operação. Junto com o Alvo, define o RRR calculado abaixo. Valores em % do capital — não em pips.</p></span></span></label>\n        <div class=\"input-unit\">\n          <input type=\"number\" id=\"sl\" value=\"1\" min=\"0.01\" max=\"10\" step=\"0.01\">\n          <span class=\"unit\">%</span>\n        </div>\n      </div>\n      <div class=\"field\">\n        <label>Alvo/Trade <span class=\"tip\">?<span class=\"tip-box\"><b>Alvo por Trade %</b><p>Percentual do capital que representa o take profit. RRR = Alvo ÷ Stop. Ex: Stop 1% e Alvo 2% = RRR 2:1.</p></span></span></label>\n        <div class=\"input-unit\">\n          <input type=\"number\" id=\"tp\" value=\"1\" min=\"0.01\" max=\"10\" step=\"0.01\">\n          <span class=\"unit\">%</span>\n        </div>\n      </div>\n    </div>\n    <div class=\"field\">\n      <label>RRR calculado <span class=\"tip\">?<span class=\"tip-box\"><b>RRR Calculado</b><p>Relação risco:retorno resultante dos valores de Stop e Alvo definidos. Exibido em tempo real conforme você altera os campos acima.</p></span></span></label>\n      <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--blue)\" id=\"rrrDisplay\">1 : 1.00</div>\n    </div>\n    <div style=\"font-size:10px;color:var(--muted);margin-top:4px;\">\n      Risco/Retorno calculado a partir de Stop e Alvo acima.<br>\n      <span style=\"color:var(--dim)\">Estes valores são % do capital em conta (não pips).</span>\n    </div>\n  </div>\n\n  <div class=\"ts-sidebar-group\">\n    <div class=\"ts-sidebar-group-label\">// Operações & Win Rate</div>\n    <div class=\"field\">\n      <label>Max Trades/Dia <span class=\"tip\">?<span class=\"tip-box\"><b>Máximo de Trades por Dia</b><p>Limite de operações por sessão simulada. Controla a frequência e modela uma gestão anti-overtrading. O dia encerra quando o stop diário, a meta diária ou este limite é atingido.</p></span></span></label>\n      <div class=\"range-row\">\n        <input type=\"range\" id=\"tradesRange\" min=\"1\" max=\"20\" step=\"1\" value=\"10\" oninput=\"sh_syncRange('trades','tradesRange',this.value,'')\">\n        <span class=\"range-val\" id=\"tradesRangeVal\">10</span>\n      </div>\n      <input type=\"number\" id=\"trades\" value=\"10\" min=\"1\" max=\"50\" step=\"1\" oninput=\"sh_syncInput('trades','tradesRange',this.value,'')\">\n    </div>\n    <div class=\"field\">\n      <label>Win Rate Estimado <span class=\"tip\">?<span class=\"tip-box\"><b>Win Rate Estimado</b><p>Probabilidade de cada trade ser vencedor. A simulação usa esse percentual aleatoriamente para resolver cada trade. Use o win rate histórico do seu setup para resultados mais realistas.</p></span></span></label>\n      <div class=\"range-row\">\n        <input type=\"range\" id=\"wrRange\" min=\"10\" max=\"90\" step=\"1\" value=\"55\" oninput=\"sh_syncRange('wr','wrRange',this.value,'%')\">\n        <span class=\"range-val\" id=\"wrRangeVal\">55%</span>\n      </div>\n      <div class=\"input-unit\">\n        <input type=\"number\" id=\"wr\" value=\"55\" min=\"0\" max=\"100\" step=\"1\" oninput=\"sh_syncInput('wr','wrRange',this.value,'%')\">\n        <span class=\"unit\">%</span>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"ts-sidebar-group\">\n    <div class=\"ts-sidebar-group-label\">// Simulação</div>\n    <div class=\"field-row\">\n      <div class=\"field\">\n        <label>Dias Úteis <span class=\"tip\">?<span class=\"tip-box\"><b>Dias Úteis</b><p>Horizonte de tempo da simulação. Representa o número de sessões de trading simuladas. Use 20–22 para um mês, 60 para um trimestre, 252 para o ano completo.</p></span></span></label>\n        <input type=\"number\" id=\"days\" value=\"60\" min=\"5\" max=\"500\" step=\"5\">\n      </div>\n      <div class=\"field\">\n        <label>Ciclos (MC) <span class=\"tip\">?<span class=\"tip-box\"><b>Ciclos Monte Carlo</b><p>Quantidade de simulações independentes executadas para gerar a distribuição de resultados. Mais ciclos = maior precisão estatística. 200 já é suficiente; acima de 500 o ganho marginal é mínimo.</p></span></span></label>\n        <input type=\"number\" id=\"cycles\" value=\"200\" min=\"10\" max=\"1000\" step=\"10\">\n      </div>\n    </div>\n    <div class=\"field-row\">\n      <div class=\"field\">\n        <label>Seq. de Trades <span class=\"tip\">?<span class=\"tip-box\"><b>Sequência de Trades</b><p>Total de operações simuladas no gráfico de Sequência Aleatória. Permite visualizar como wins e losses se distribuem numa série de N trades com o win rate configurado.</p></span></span></label>\n        <input type=\"number\" id=\"seqTrades\" value=\"40\" min=\"5\" max=\"200\" step=\"5\">\n      </div>\n      <div class=\"field\">\n        <label>Trades/Ciclo <span class=\"tip\">?<span class=\"tip-box\"><b>Trades por Ciclo</b><p>Número de operações por ciclo no gráfico de Ciclos Fixos. Define o tamanho de cada período — ex.: 10 trades/ciclo em 60 dias gera múltiplos ciclos e mostra o crescimento composto ciclo a ciclo.</p></span></span></label>\n        <input type=\"number\" id=\"tradesPerCycle\" value=\"10\" min=\"1\" max=\"50\" step=\"1\">\n      </div>\n    </div>\n  </div>\n\n</div><!-- end ts-sidebar-inner -->\n</div>\n<!-- end sidebar -->\n\n<!-- ─── MAIN ─── -->\n<div class=\"ts-main\">\n\n  <!-- WARNING -->\n  <div class=\"warning-box\" id=\"warningBox\">\n    <div class=\"icon\">⚠️</div>\n    <p id=\"warningText\">Carregando análise...</p>\n  </div>\n\n  <!-- METRICS -->\n  <div class=\"metrics-row\">\n    <div class=\"ts-metric m-blue\">\n      <div class=\"ts-metric-label\">Breakeven WR <span class=\"tip\">?<span class=\"tip-box\"><b>Win Rate de Breakeven</b><p>Percentual mínimo de acertos necessário para o setup não perder dinheiro no longo prazo, dado o RRR configurado. Fórmula: 1 ÷ (1 + RRR). Com WR abaixo disso, o setup é matematicamente destruidor.</p></span></span></div>\n      <div class=\"ts-metric-value col-blue\" id=\"mBeWR\">—</div>\n      <div class=\"ts-metric-sub\">win rate mínimo</div>\n    </div>\n    <div class=\"ts-metric m-yellow\">\n      <div class=\"ts-metric-label\">Expectativa/Trade <span class=\"tip\">?<span class=\"tip-box\"><b>Expectativa por Trade</b><p>Retorno médio esperado por operação em dólares, considerando WR × ganho − (1−WR) × perda. Positivo = setup lucrativo no longo prazo. Negativo = setup destrutivo.</p></span></span></div>\n      <div class=\"ts-metric-value\" id=\"mEV\">—</div>\n      <div class=\"ts-metric-sub\">valor esperado</div>\n    </div>\n    <div class=\"ts-metric m-green\">\n      <div class=\"ts-metric-label\">Espect. Diária <span class=\"tip\">?<span class=\"tip-box\"><b>Expectativa Diária</b><p>Retorno médio esperado por dia útil: Expectativa/Trade × Max Trades/Dia. Representa o ganho esperado se você executar o setup com consistência todos os dias.</p></span></span></div>\n      <div class=\"ts-metric-value\" id=\"mDailyEV\">—</div>\n      <div class=\"ts-metric-sub\">por dia útil</div>\n    </div>\n    <div class=\"ts-metric m-red\">\n      <div class=\"ts-metric-label\">Max SL Consec. <span class=\"tip\">?<span class=\"tip-box\"><b>Máximo de Stops Consecutivos</b><p>Número máximo de losses seguidos antes de atingir o Stop Diário configurado. Use para se preparar psicologicamente: saber que pode levar X stops seguidos sem quebrar o dia ajuda a manter a disciplina.</p></span></span></div>\n      <div class=\"ts-metric-value col-red\" id=\"mMaxSL\">—</div>\n      <div class=\"ts-metric-sub\">antes de stop diário</div>\n    </div>\n    <div class=\"ts-metric m-purple\">\n      <div class=\"ts-metric-label\">Proj. 20 dias <span class=\"tip\">?<span class=\"tip-box\"><b>Projeção em 20 Dias</b><p>Estimativa de resultado acumulado em 20 dias úteis (~1 mês), calculada com a expectativa diária. É uma projeção matemática — não considera variância. O Monte Carlo abaixo mostra a distribuição real de cenários.</p></span></span></div>\n      <div class=\"ts-metric-value col-purple\" id=\"mProj20\">—</div>\n      <div class=\"ts-metric-sub\">com WR atual</div>\n    </div>\n  </div>\n\n  <!-- MONTE CARLO EQUITY CURVE -->\n  <div class=\"ts-panel ts-panel-full\">\n    <div class=\"ts-panel-header\">\n      <div class=\"ts-panel-title\"><span class=\"icon\">📈</span> Curva de Equity — Monte Carlo <span class=\"tip\">?<span class=\"tip-box\"><b>Curva de Equity — Monte Carlo</b><p>Simulação de múltiplos cenários aleatórios com os parâmetros configurados. Cada linha representa uma sequência possível de trades. A dispersão mostra a variância do setup — quanto mais espalhadas as curvas, maior a instabilidade dos resultados mesmo com edge positivo.</p></span></span></div>\n      <div style=\"font-size:10px;color:var(--muted)\" id=\"mcInfo\">—</div>\n    </div>\n    <div class=\"ts-panel-body\">\n      <div class=\"legend\" id=\"mcLegend\"></div>\n      <div class=\"chart-container\" style=\"height:240px\">\n        <canvas id=\"mcCanvas\" height=\"240\"></canvas>\n      </div>\n      <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px\" id=\"mcStats\"></div>\n    </div>\n  </div>\n\n  <!-- TWO PANELS -->\n  <div class=\"panels-grid\">\n\n    <!-- CENÁRIOS -->\n    <div class=\"ts-panel\">\n      <div class=\"ts-panel-header\">\n        <div class=\"ts-panel-title\"><span class=\"icon\">📊</span> Cenários — N dias úteis <span class=\"tip\">?<span class=\"tip-box\"><b>Cenários Simulados</b><p>Cada linha é um período simulado com trades aleatórios. Mostra a distribuição de resultados possíveis: alguns dias terminam no stop, outros na meta, outros no meio do caminho. Use para entender a variância real do setup no prazo configurado.</p></span></span></div>\n      </div>\n      <div class=\"ts-panel-body\" style=\"padding:0\">\n        <table class=\"data-table\" id=\"scenarioTable\">\n          <thead>\n            <tr>\n              <th>Cenário</th><th>WR</th><th>Gains</th><th>Stops</th><th>Result %</th><th>$Capital</th><th>Status</th>\n            </tr>\n          </thead>\n          <tbody></tbody>\n        </table>\n      </div>\n    </div>\n\n    <!-- RECUPERAÇÃO -->\n    <div class=\"ts-panel\">\n      <div class=\"ts-panel-header\">\n        <div class=\"ts-panel-title\"><span class=\"icon\">🔁</span> Análise de Recuperação <span class=\"tip\">?<span class=\"tip-box\"><b>Análise de Recuperação</b><p>Para cada nível de perda sofrida, mostra quantos dias são necessários para recuperar o capital com o setup configurado, e qual win rate mínimo seria necessário para recuperar em tempo razoável.</p></span></span></div>\n      </div>\n      <div class=\"ts-panel-body\" style=\"padding:0\">\n        <table class=\"data-table\" id=\"recoveryTable\">\n          <thead>\n            <tr>\n              <th>Situação</th><th>Perda</th><th>Dias p/ recuperar</th><th>WR necessário</th>\n            </tr>\n          </thead>\n          <tbody></tbody>\n        </table>\n      </div>\n    </div>\n\n  </div>\n\n  <!-- SEQUENCE + CYCLE -->\n  <div class=\"panels-grid\">\n\n    <!-- SEQUÊNCIA DE TRADES -->\n    <div class=\"ts-panel\">\n      <div class=\"ts-tab-bar\">\n        <button class=\"ts-tab-btn active\" onclick=\"sh_tsTab(this,'seqRandom')\">Sequência Aleatória <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Sequência Aleatória</b><p>Simula uma sequência de N trades com o win rate configurado, resolvendo cada operação aleatoriamente. Útil para visualizar como sequências de loss/win se distribuem na prática — e por que o drawdown médio é inevitável mesmo em setups lucrativos.</p></span></span></button>\n        <button class=\"ts-tab-btn\" onclick=\"sh_tsTab(this,'seqFixed')\">Ciclos Fixos <span class=\"tip\" style=\"font-size:8px\">?<span class=\"tip-box\"><b>Ciclos Fixos</b><p>Divide o total de dias em ciclos de N trades cada e mostra como o capital evolui ciclo a ciclo. Útil para planejar metas por período e entender o crescimento composto ao longo do tempo.</p></span></span></button>\n      </div>\n      <div class=\"ts-tab-content active\" id=\"seqRandom\">\n        <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:10px\">\n          <div style=\"font-size:11px;color:var(--muted)\">Simulação de <span id=\"seqN\" class=\"mono col-blue\">40</span> trades com win rate configurado</div>\n          <button onclick=\"sh_tsRunAll()\" style=\"background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:4px 12px;border-radius:5px;cursor:pointer;font-size:11px\">↺ Novo</button>\n        </div>\n        <div class=\"trade-seq\" id=\"tradeSeqViz\"></div>\n        <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px\" id=\"seqStats\"></div>\n      </div>\n      <div class=\"ts-tab-content\" id=\"seqFixed\">\n        <div style=\"font-size:11px;color:var(--muted);margin-bottom:10px\">Ciclos de <span id=\"cycleN\" class=\"mono col-blue\">10</span> trades — progressão do capital</div>\n        <div class=\"chart-container\" style=\"height:180px\">\n          <canvas id=\"cycleCanvas\" height=\"180\"></canvas>\n        </div>\n        <div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px\" id=\"cycleStats\"></div>\n      </div>\n    </div>\n\n    <!-- IMPACTO POR DIA -->\n    <div class=\"ts-panel\">\n      <div class=\"ts-panel-header\">\n        <div class=\"ts-panel-title\"><span class=\"icon\">🎯</span> Impacto Intraday <span class=\"tip\">?<span class=\"tip-box\"><b>Impacto Intraday</b><p>Simule cenários do dia com SL e Stop Diário independentes. O RRR é calculado a partir do SL local e do RRR configurado na sidebar. Win Rate necessário é o breakeven para o setup atual.</p></span></span></div>\n      </div>\n      <div class=\"ts-panel-body\">\n        <div style=\"display:flex;align-items:flex-end;gap:16px;margin-bottom:12px;flex-wrap:wrap\">\n          <div class=\"field\" style=\"margin:0;flex:0 0 auto\">\n            <label style=\"font-size:10px;color:var(--muted);margin-bottom:4px;display:block\">SL/Trade</label>\n            <div class=\"input-unit\" style=\"width:90px\">\n              <input type=\"number\" id=\"id-sl\" value=\"1\" min=\"0.01\" max=\"10\" step=\"0.01\" oninput=\"sh_buildIntraday()\">\n              <span class=\"unit\">%</span>\n            </div>\n          </div>\n          <div class=\"field\" style=\"margin:0;flex:0 0 auto\">\n            <label style=\"font-size:10px;color:var(--muted);margin-bottom:4px;display:block\">Stop do Dia</label>\n            <div class=\"input-unit\" style=\"width:90px\">\n              <input type=\"number\" id=\"id-dailyStop\" value=\"2\" min=\"0.1\" max=\"20\" step=\"0.1\" oninput=\"sh_buildIntraday()\">\n              <span class=\"unit\">%</span>\n            </div>\n          </div>\n          <div style=\"display:flex;flex-direction:column;gap:2px\">\n            <span style=\"font-size:10px;color:var(--muted)\">RRR calculado</span>\n            <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:5px 10px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--blue);white-space:nowrap\" id=\"id-rrrDisplay\">1 : 1.00</div>\n          </div>\n          <div style=\"display:flex;flex-direction:column;gap:2px\">\n            <span style=\"font-size:10px;color:var(--muted)\">Alvo/Trade</span>\n            <div style=\"background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:5px 10px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--green);white-space:nowrap\" id=\"id-tpDisplay\">1.00%</div>\n          </div>\n        </div>\n        <table class=\"data-table\" id=\"intradayTable\">\n          <thead>\n            <tr><th>#Trades</th><th>Todos Win</th><th>50% Acerto</th><th>Todos Loss</th><th>Stop Diário em</th><th>WR Necessário</th></tr>\n          </thead>\n          <tbody></tbody>\n        </table>\n      </div>\n    </div>\n\n  </div>\n\n  <!-- DISTRIBUIÇÃO DE RESULTADOS -->\n  <div class=\"ts-panel ts-panel-full\">\n    <div class=\"ts-panel-header\">\n      <div class=\"ts-panel-title\"><span class=\"icon\">📉</span> Distribuição de Resultados Finais (Monte Carlo) <span class=\"tip\">?<span class=\"tip-box\"><b>Distribuição de Resultados Finais</b><p>Histograma dos resultados finais de todas as simulações Monte Carlo. Mostra com que frequência o setup termina em cada faixa de resultado. Curva deslocada para a direita = setup com edge positivo. Cauda esquerda longa = risco de drawdown severo em alguns cenários.</p></span></span></div>\n    </div>\n    <div class=\"ts-panel-body\">\n      <div class=\"chart-container\" style=\"height:180px\">\n        <canvas id=\"distCanvas\" height=\"180\"></canvas>\n      </div>\n      <div style=\"display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:14px\" id=\"distStats\"></div>\n    </div>\n  </div>\n\n</div><!-- end main -->\n</div><!-- end layout --></div><!-- /mod-tradesim -->\n\n<!-- ──────────── MÓDULO 3: FERRAMENTAS MENTAIS ──────────── -->\n<div class=\"hub-module\" id=\"mod-mental\">\n<span id=\"tinfo\" style=\"display:none\"></span>\n  <div style=\"padding:12px 20px;border-bottom:1px solid var(--border);background:var(--bg1);display:flex;align-items:center;justify-content:space-between\">\n    <span style=\"font-size:11px;color:var(--muted)\">Simulação de Blocos de Risco · Análise de Ruína</span>\n    <button class=\"run-btn\" onclick=\"sh_fmSimular()\">\n      <svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"currentColor\"><path d=\"M3 2.5l10 5.5-10 5.5V2.5z\"/></svg>\n      Simular\n    </button>\n  </div>\n<div id=\"fm-app\">\n<div class=\"fm-layout\">\n\n  <!-- ── SIDEBAR ── -->\n  <div class=\"fm-sidebar\">\n  <div class=\"fm-sidebar-inner\">\n\n    <div class=\"sg\">\n      <div class=\"sgl\">Configuração</div>\n      <div class=\"field\">\n        <label>Capital Inicial ($) <span class=\"tip\">?<span class=\"tip-box\"><b>Capital Inicial</b><p>Saldo de partida para as colunas de simulação por bloco de risco. Cada coluna aplica um percentual diferente do capital como risco por trade, mostrando como o resultado varia conforme o tamanho da posição.</p></span></span></label>\n        <div class=\"iu\"><input type=\"number\" id=\"fm-capital\" value=\"1000\" min=\"100\" step=\"100\" oninput=\"sh_atualizarTabelaRec()\"><span class=\"u\">$</span></div>\n      </div>\n      <div class=\"field\">\n        <label>Nº de Trades <span class=\"tip\">?<span class=\"tip-box\"><b>Número de Trades</b><p>Total de operações por simulação. Cada clique em \"Simular\" roda N trades aleatórios com os parâmetros definidos e registra o resultado no histórico.</p></span></span></label>\n        <div class=\"iu\"><input type=\"number\" id=\"nTrades\" value=\"20\" min=\"5\" max=\"500\" step=\"5\" oninput=\"sh_atualizarTopbar()\"><span class=\"u\">#</span></div>\n        <div style=\"display:flex;gap:6px;margin-top:6px\">\n          <button class=\"sbtn\" onclick=\"sh_setN(20)\">20</button>\n          <button class=\"sbtn\" onclick=\"sh_setN(50)\">50</button>\n          <button class=\"sbtn\" onclick=\"sh_setN(100)\">100</button>\n        </div>\n      </div>\n      <div class=\"field\">\n        <label>RRR — Risk:Reward <span class=\"tip\">?<span class=\"tip-box\"><b>RRR — Relação Risco:Retorno</b><p>Proporção entre o alvo e o stop. Junto com o Win Rate define a expectância matemática do setup. Expectância = WR × RRR − (1 − WR).</p><div class=\"tr\"><span>Expectância zero</span><span>WR = 1 ÷ (1 + RRR)</span></div></span></span></label>\n        <div class=\"iu\"><input type=\"number\" id=\"rrr\" value=\"1\" min=\"0.1\" max=\"10\" step=\"0.1\" oninput=\"sh_atualizarTabelaRec()\"><span class=\"u\">R</span></div>\n      </div>\n    </div>\n\n    <div class=\"sg\">\n      <div class=\"sgl\">Assertividade</div>\n      <div class=\"fr\">\n        <div class=\"field\">\n          <label>Ganha (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Win Rate</b><p>Percentual de trades vencedores. Deve somar 100% com Perde%. Alterar aqui atualiza Perde% automaticamente.</p></span></span></label>\n          <div class=\"iu\"><input type=\"number\" id=\"winRate\" value=\"55\" min=\"1\" max=\"99\" step=\"1\" oninput=\"sh_syncLoss();sh_atualizarTabelaRec()\"><span class=\"u\">%</span></div>\n        </div>\n        <div class=\"field\">\n          <label>Perde (%) <span class=\"tip\">?<span class=\"tip-box\"><b>Loss Rate</b><p>Percentual de trades perdedores. Calculado automaticamente como 100% − Win Rate. Edite diretamente se quiser um valor com decimal diferente.</p></span></span></label>\n          <div class=\"iu\"><input type=\"number\" id=\"lossRate\" value=\"45\" min=\"1\" max=\"99\" step=\"1\" oninput=\"sh_syncWin()\"><span class=\"u\">%</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"sg\">\n      <div class=\"sgl\">\n        Zona de Perigo\n        <span class=\"tip\">?<span class=\"tip-box\"><b>Zona de Perigo</b><p>Se o saldo cair abaixo deste percentual do capital inicial, a coluna entra em Zona de Perigo (vermelho). Ex: 20% = saldo abaixo de $200 numa banca de $1000.</p><p>A recuperação a partir daí exige ganhos proporcionalmente muito maiores — é a matemática assimétrica das perdas.</p><div class=\"tr\"><span>10%</span><span>Muito agressivo</span></div><div class=\"tr\"><span>20%</span><span>Padrão</span></div><div class=\"tr\"><span>30%+</span><span>Conservador</span></div></span></span>\n      </div>\n      <div class=\"field\">\n        <label>Saldo abaixo de (% do capital) <span class=\"tip\">?<span class=\"tip-box\"><b>Limite da Zona de Perigo</b><p>Percentual mínimo do capital inicial que define a entrada na zona crítica. Abaixo disso, a recuperação exige ganhos cada vez mais desproporcionais.</p></span></span></label>\n        <div class=\"iu\"><input type=\"number\" id=\"perigoPct\" value=\"20\" min=\"5\" max=\"80\" step=\"5\" oninput=\"sh_atualizarTopbar();sh_atualizarTabelaRec()\"><span class=\"u\">%</span></div>\n        <div style=\"display:flex;gap:6px;margin-top:6px\">\n          <button class=\"sbtn\" onclick=\"sh_setRP(10)\">10%</button>\n          <button class=\"sbtn\" onclick=\"sh_setRP(20)\">20%</button>\n          <button class=\"sbtn\" onclick=\"sh_setRP(30)\">30%</button>\n          <button class=\"sbtn\" onclick=\"sh_setRP(50)\">50%</button>\n        </div>\n      </div>\n\n      <!-- Tabela de recuperação -->\n      <div style=\"margin-top:2px\">\n        <div style=\"font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px\">Quanto precisa recuperar <span class=\"tip\" style=\"font-size:8px;text-transform:none\">?<span class=\"tip-box\"><b>Tabela de Recuperação</b><p>Quanto você precisa ganhar para recuperar cada nível de perda. A assimetria matemática: perder 50% exige ganhar 100%. Quanto maior a perda, mais difícil a recuperação — por isso controlar o risco por trade é mais importante que maximizar ganhos.</p></span></span></div>\n        <table class=\"recov-table\" id=\"recovTable\"></table>\n      </div>\n    </div>\n\n    <div class=\"sg\">\n      <div class=\"sgl\">Blocos de Risco</div>\n      <div class=\"binfo\"><div class=\"bname\"><span class=\"dot\" style=\"background:var(--blue)\"></span>Bloco 1 — Ultra-Baixo</div><div class=\"brange\">0.25% → 4.25%</div></div>\n      <div class=\"binfo\"><div class=\"bname\"><span class=\"dot\" style=\"background:var(--green)\"></span>Bloco 2 — Baixo-Moderado</div><div class=\"brange\">2.5% → 10%</div></div>\n      <div class=\"binfo\"><div class=\"bname\"><span class=\"dot\" style=\"background:var(--yellow)\"></span>Bloco 3 — Elevado</div><div class=\"brange\">5% → 20%</div></div>\n      <div class=\"binfo\"><div class=\"bname\"><span class=\"dot\" style=\"background:var(--red)\"></span>Bloco 4 — Extremo</div><div class=\"brange\">25% → 50%</div></div>\n    </div>\n\n    <div class=\"sg\">\n      <div class=\"sgl\">Legenda de Cores</div>\n      <div class=\"lrow\"><div class=\"lswatch\" style=\"background:rgba(63,185,80,.10);border:1px solid rgba(95,216,126,.3)\"></div><span style=\"color:var(--muted);font-size:11px\">Acima do capital inicial</span></div>\n      <div class=\"lrow\"><div class=\"lswatch\" style=\"background:rgba(227,179,65,.10);border:1px solid rgba(212,168,74,.3)\"></div><span style=\"color:var(--muted);font-size:11px\">Negativo — ainda vivo</span></div>\n      <div class=\"lrow\"><div class=\"lswatch\" style=\"background:rgba(248,81,73,.20);border:1px solid rgba(248,81,73,.45)\"></div><span style=\"color:var(--red);font-size:11px\">Zona de Perigo</span></div>\n      <div style=\"font-size:10px;color:var(--dim);font-family:'JetBrains Mono',monospace;margin-top:6px;line-height:1.5\">\n        Zona de Perigo = saldo tão baixo que a recuperação exige ganhos absurdos. Equivale à ruína na prática.\n      </div>\n    </div>\n\n  </div><!-- end fm-sidebar-inner -->\n  </div>\n\n  <!-- ── MAIN ── -->\n  <div class=\"fm-main\">\n\n    <!-- MÉTRICAS -->\n    <div class=\"mrow\">\n      <div class=\"metric mb\"><div class=\"mlabel\">Capital</div><div class=\"mval cb\" id=\"m-cap\">$1.000</div><div class=\"msub\">banca inicial</div></div>\n      <div class=\"metric mg\"><div class=\"mlabel\">Win Rate</div><div class=\"mval cg\" id=\"m-wr\">55%</div><div class=\"msub\" id=\"m-wr-sub\">RRR 1:1.00</div></div>\n      <div class=\"metric my\"><div class=\"mlabel\">Trades</div><div class=\"mval cy\" id=\"m-trades\">20</div><div class=\"msub\">por simulação</div></div>\n      <div class=\"metric mo\"><div class=\"mlabel\">Zona de Perigo</div><div class=\"mval co\" id=\"m-perigo\">20%</div><div class=\"msub\" id=\"m-perigo-sub\">saldo &lt; $200</div></div>\n      <div class=\"metric mp\"><div class=\"mlabel\">Simulações</div><div class=\"mval cp\" id=\"m-sims\">0</div><div class=\"msub\">no histórico</div></div>\n    </div>\n\n    <div class=\"warn\" id=\"warnBox\">⚠ Assertividade não fecha 100%! Corrija Ganha% + Perde%.</div>\n\n    <!-- BLOCOS -->\n    <div class=\"bgrid-outer\">\n      <div class=\"bgrid\" id=\"blocosGrid\"></div>\n    </div>\n\n    <!-- ANALYTICS ACUMULADO -->\n    <div class=\"analytics-wrap\" id=\"analyticsWrap\">\n      <div class=\"sep-label\">Analytics Acumulado — Histórico de Simulações</div>\n\n      <div id=\"analyticsEmpty\" style=\"background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:24px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim)\">\n        Rode ao menos 2 simulações para ver os analytics acumulados.\n      </div>\n\n      <div id=\"analyticsPanel\" style=\"display:none\">\n        <!-- Totais gerais (inclui Total Sims) -->\n        <div class=\"a-totals\" id=\"analyticsTotals\"></div>\n        <!-- Por bloco -->\n        <div class=\"analytics-grid\" id=\"analyticsGrid\"></div>\n      </div>\n    </div>\n\n    <!-- LOG -->\n    <div class=\"logwrap\">\n      <div class=\"loghdr\" onclick=\"sh_toggleLog()\">\n        <div class=\"logtit\">Histórico de Simulações <span class=\"logcnt\" id=\"logcnt\">0 registros</span></div>\n        <div class=\"logacts\" onclick=\"event.stopPropagation()\">\n          <button class=\"lbtn\" onclick=\"sh_exportLog()\">Exportar CSV</button>\n          <button class=\"lbtn\" onclick=\"sh_clearLog()\">Limpar</button>\n          <span style=\"font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);padding:5px 6px\" id=\"logchev\">▼</span>\n        </div>\n      </div>\n      <div class=\"logbody\">\n        <div class=\"logscroll\" id=\"logscroll\">\n          <div class=\"logempty\" id=\"logempty\">Nenhuma simulação registrada. Clique em Simular para começar.</div>\n          <table class=\"ltable\" id=\"logtable\" style=\"display:none\">\n            <thead><tr>\n              <th style=\"width:32px\">#</th>\n              <th style=\"width:68px\">Hora</th>\n              <th style=\"width:52px\">Trades</th>\n              <th style=\"width:68px\">Capital</th>\n              <th style=\"width:48px\">WR%</th>\n              <th style=\"width:52px\">RRR</th>\n              <th style=\"width:62px\">Perigo%</th>\n              <th>Resultado por Bloco (✓pos ~neg ⬛perigo 🔴zero)</th>\n              <th style=\"width:80px\">Status</th>\n            </tr></thead>\n            <tbody id=\"logtbody\"></tbody>\n          </table>\n        </div>\n      </div>\n    </div>\n\n  </div>\n</div>\n\n\n</div><!-- #app --></div><!-- /mod-mental -->";
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

function calcCapFinal(cap,risco,rrr,n){let s=cap;for(let i=0;i<n;i++)s+=s*(risco/100)*rrr;return s;}

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
function calcParcMedia(p,r){const t=p.reduce((a,b)=>a+b,0);return t===0?0:p.reduce((s,v,i)=>s+(v/t)*r[i],0);}
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
function gerarContinuo(cap,risco,n){const t=[];let s=cap;for(let i=0;i<n;i++){const pnl=-(s*risco);s=Math.max(0,s+pnl);t.push({n:i+1,res:'L',pnl,saldo:s});}return t;}
function gerarAlternado(cap,risco,rrr,n){const t=[];let s=cap,isL=true;for(let i=0;i<n;i++){const pnl=isL?-(s*risco):s*risco*rrr;s=Math.max(0,s+pnl);t.push({n:i+1,res:isL?'L':'W',pnl,saldo:s});isL=!isL;}return t;}
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
function calcCol(cap,rrr,taxa,seq,perigoLim){
  const r=[];let s=cap,dead=false;
  for(const res of seq){
    if(dead){r.push({s:0,dead:true,danger:false,res});continue;}
    const g=res===1 ? s*taxa*rrr : -(s*taxa);   // +ganho ou -perda
    s=Math.max(0,s+g);
    if(s<=0){s=0;dead=true;}
    r.push({s,dead,danger:!dead&&s>0&&s<perigoLim,res});
  }
  return r;
}

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
