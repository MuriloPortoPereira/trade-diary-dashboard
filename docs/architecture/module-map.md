# Mapa de módulos

Catálogo funcional da baseline `ab0cb63`. Os módulos são responsabilidades existentes dentro
de `app.js`, não diretórios já separados. Localizar símbolos com Serena antes de ler trechos.

| Feature | Entradas/símbolos | Dependências atuais |
|---|---|---|
| Shell/navegação | `src/app/presentation/navigation.js`; callback `window.load` em `app.js` | IDs `page-*`, funções globais, contas e estado |
| Operações | `saveTrade`, `renderLog`, `duplicateTrade`, `getLogFilteredTrades` | Formulário, `trades`, contas, `save`, métricas |
| Contas/risco | `normalizeAccount`, `calcAccountRiskState`, `saveAccount`, `renderAccountsPage` | `accounts`, trades, calendário atual, cashflows, formatação |
| Dashboard | `renderDashboard`, `calcMetrics`, `renderRiskBoard` | Conta ativa, filtros, Chart.js, DOM |
| Estratégias/análises | `getStrategySnapshots`, `renderStrategyCompareCards`, `renderStats`, `renderStrategyHub` | Trades, timing, métricas, Chart.js |
| Calendário/rotina | `renderCalendar`, `renderPremarket`, `savePM` | Trades, `preMarketData`, datas, storage |
| Psicologia | `renderPsych`, `renderStatsPsych`, `buildHesitationStats` | Campos subjetivos das operações e gráficos |
| Simulação principal | `calculateSimulationSizing`, `buildSimulationPlan`, `renderSimulation` | Helpers numéricos, conta ativa, configuração, formatação e gráficos |
| Importação | `parseMT5Rows`, `parseGenericTradeRows`, `parseMT5HTML`, `confirmImport` | FileReader, datas, IDs, normalizadores, contas e `save` |
| Backup/exportação | `createBackupPayload`, `restoreBackupData`, `exportJSON`, `buildTradesCSV` | Estado global, JSON, CSV, Blob, confirmação e storage |
| StudyHub nativo | `renderStudyHub`, `buildStudySimulation`, `syncStudyHubLegacyInputs` | Estado `studyHubState`, conta, risco, DOM legado e `window.sh_*` |
| StudyHub legado | `shInitLegacyModule`, `calcSimulador`, `calcCiclos`, `tsRunAll`, `fmSimular` | IIFE própria, template integrado, Chart.js e chaves storage próprias |
| Intraday adicional | `studyHubBuildIntradayRows`, `studyHubEnhanceIntradayImpact` | IIFE própria; wrappers de `sh_buildIntraday`/`sh_tsRunAll` |
| Documentos/imagens | `renderDocumentsPage`, `saveCurrentDocument`, `getDocumentEntries` | Trades, rotina, `config.generalDocs`, FileReader, DOM |
| Parceiros | `renderPartnersPage`, `ensurePartnerHubConfig` | `config.partnerHub`, links, imagens, clipboard |
| Perfil/notificações | `renderProfilePage`, `renderNotificationsPage`, `buildOperationalAlerts` | Conta ativa, risco e histórico; sem autenticação |
| Configuração/storage | `renderSetup`, `saveConfig`, `save`, `load` | Globals, normalização, localStorage |
| Idiomas/cotação | `TRANSLATIONS`, `applyLanguage`, `fetchCotacao` | DOM, storage, AwesomeAPI; cotação também duplicada no legado |

## Fronteiras de integração que devem permanecer compatíveis

- `index.html`: estrutura e chamadas inline dos símbolos públicos.
- `app.js`: ordem de bootstrap, globals de apresentação e estado ainda legado.
- CSS base/shell/preferências, superfícies/cabeçalhos, ações, CSS responsivos e quatro CSS StudyHub: classes/IDs e ordem da cascata.
- `window.sh_*`: ponte pública para funções privadas do IIFE legado.
- JSON de backup e chaves localStorage: contrato de dados existente.

## Fronteiras físicas extraídas

| Arquivo | Responsabilidade |
|---|---|
| `src/modules/simulation/domain/calculate-simulation-sizing.js` | Cálculo numérico puro; sem DOM, storage ou framework |
| `tests/simulation-sizing.test.cjs` | Caracterização dos valores/defaults e regressões do cálculo |
| `src/modules/simulation/presentation/simulation-sizing-fields.js` | Sincronização dos percentuais com os três campos monetários da simulação; 14 linhas intactas |
| `tests/simulation-sizing-fields.test.cjs` | Caracterização de conta, fallbacks, conversão, projeções, retorno e carga |
| `src/modules/simulation/presentation/simulation-panel.js` | Snapshot, seleção de conta e renderer do painel; quatro funções/81 linhas |
| `tests/simulation-panel.test.cjs` | Caracterização de snapshot, reset, modos manual/conta, painel, plano, gráfico e carga |
| `src/modules/accounts/presentation/account-form.js` | Abertura/edição do formulário, cashflows temporários e alternância do tipo; cinco funções/53 linhas |
| `tests/account-form.test.cjs` | Caracterização de defaults, edição, cashflows, tipo e ordem de carga do formulário |
| `src/app/presentation/app-dialog.js` | Diálogo comum, confirmação, notice e prompt; seis funções/60 linhas |
| `tests/app-dialog.test.cjs` | Caracterização do DOM, estado, callbacks, validação, fallbacks nativos e carga |
| `src/modules/trades/presentation/trade-log-controls.js` | Ordenação, período e seleção visual do diário; cinco funções/43 linhas |
| `tests/trade-log-controls.test.cjs` | Caracterização de indicadores, datas, checkboxes, linhas, seleção e carga |
| `src/app/presentation/navigation.js` | Refresh, sidebar e troca de página; três funções/29 linhas |
| `tests/navigation.test.cjs` | Caracterização de despacho, efeitos compartilhados, classes, sidebar e carga |
| `src/modules/trades/presentation/trade-form-options.js` | Selects e alternância dos erros do formulário; duas funções/24 linhas |
| `tests/trade-form-options.test.cjs` | Caracterização de opções, campos opcionais, conta, erros, efeitos e carga |
| `src/app/presentation/modal-controller.js` | Abertura/fechamento dos modais e coordenação das apresentações; duas funções/27 linhas |
| `tests/modal-controller.test.cjs` | Caracterização de bloqueio, trade novo/edição, contas, importação, fechamento e carga |
| `src/modules/trades/presentation/trade-form-account-context.js` | Conta, risco e mercado projetados no formulário; duas funções/19 linhas |
| `tests/trade-form-account-context.test.cjs` | Caracterização de conta/fallback, campos, resumo, símbolo, mercado e carga |
| `src/modules/trades/domain/trade-timing.js` | Factory puro de horário, duração e agregações temporais; 115 linhas |
| `tests/trade-timing.test.cjs` | Caracterização de formatos, virada do dia, inválidos, médias, grupos, wrappers e isolamento |
| `src/modules/analytics/domain/calculate-trade-metrics.js` | Métricas puras de resultado, drawdown, índices e streaks; 53 linhas |
| `tests/trade-metrics.test.cjs` | Caracterização de capital, grupos, ordem, Infinity, drawdown, streaks, índices, wrapper e isolamento |
| `src/modules/accounts/domain/calculate-cashflow-totals.js` | Totais puros de depósitos, retiradas e líquido; 14 linhas |
| `tests/account-cashflow.test.cjs` | Caracterização de lookup, parsing, tipos, Infinity, erros, imutabilidade, capital, wrapper e isolamento |
| `src/modules/accounts/domain/calculate-risk-limits.js` | Limites, perdas e excessos monetários de risco; 30 linhas |
| `tests/account-risk-limits.test.cjs` | Caracterização de defaults, capital, escopos, excessos, zero, isolamento e carga |
| `src/modules/accounts/domain/calculate-goal-cycle.js` | Cálculo puro de metas cíclicas e progresso; 17 linhas |
| `tests/account-goal-cycle.test.cjs` | Caracterização de patamares, precisão, cashflow, fallback, isolamento e carga |
| `src/modules/accounts/domain/calculate-balance-drawdown.js` | Saldo, pico e drawdown puros sobre trades ordenados; 18 linhas |
| `tests/account-balance-drawdown.test.cjs` | Caracterização de cashflow, ordem, perdas, coerção, isolamento e carga |
| `src/app/presentation/topbar-statistics.js` | Períodos, drawdown, meta e badge da topbar; uma função/24 linhas |
| `tests/topbar-statistics.test.cjs` | Caracterização de datas, percentuais, tons, meta, alvos opcionais, densidade e carga |
| `src/modules/data-transfer/infrastructure/serialize-trades-csv.js` | Formato CSV: colunas e escaping; recebe dados explícitos, sem executar IO |
| `tests/trades-csv.test.cjs` | Caracterização do CSV, wrappers/default, consumidor de exportação e ordem de scripts |
| `src/modules/data-transfer/presentation/export-account-filter.js` | Opções de contas do filtro de exportação; 7 linhas intactas |
| `tests/export-account-filter.test.cjs` | Caracterização de guard, ordem, escaping, seleção e carga |
| `src/modules/data-transfer/presentation/backup-summary.js` | Projeção do resumo de backup no DOM; 5 linhas intactas |
| `tests/backup-summary.test.cjs` | Caracterização de guard, tradução, formatação, default e carga |
| `src/modules/data-transfer/presentation/import-tabs.js` | Alternância global das abas de importação/exportação e projeção inicial da exportação; 10 linhas intactas |
| `tests/import-tabs.test.cjs` | Caracterização de visibilidade, classes, alvos opcionais, efeitos da exportação e carga |
| `src/modules/preferences/presentation/translation-catalog.js` | Registro dos idiomas e objetos dos catálogos |
| `src/modules/preferences/presentation/locales/{pt-BR,en-US}/*.js` | Textos por idioma e contexto: trading, workspace, dialogs-and-labels; 123–253 linhas por arquivo |
| `src/modules/preferences/presentation/language-selector.js` | Tradução, menu e aplicação do idioma ao DOM; mantém os contratos globais |
| `tests/language-selector.test.cjs` | Conteúdo integral dos catálogos, fallback, efeitos do seletor e carga dos scripts |
| `src/modules/study-hub/presentation/legacy-*.css` | Quatro blocos contíguos: controles, sequência de trades, recuperação e overrides de integração; 174–359 linhas |
| `tests/study-hub-styles.test.cjs` | Fingerprint dos bytes concatenados na ordem dos links |
| `src/styles/foundation.css`, `shell-layout.css`, `navigation-and-account-summary.css` | Base visual e shell compartilhados; arquivos de 43–408 linhas |
| `src/modules/preferences/presentation/preferences-widgets.css` | Cotação e seletor de idioma, incluindo keyframe cot-spin |
| `src/styles/page-surfaces-and-headers.css` | Superfícies comuns, layout das páginas, espaçamento das abas e ícones dos cabeçalhos; 246 linhas |
| `src/styles/page-actions.css` | Botões, opções de análise e controles de intervalo de datas; 114 linhas, sem mover handlers |
| `src/styles/metric-cards-and-risk-insights.css` | Grids/cards de métricas, tooltips no body e indicadores de risco; 300 linhas |
| `scripts/lib/metric-style-scenarios.cjs` | Cenários de apresentação com fixture isolada para tons de risco e tooltips |
| `src/styles/dashboard-and-card-layout.css` | Grids do dashboard, cabeçalhos, cards/tabelas e containers de gráficos comuns; 161 linhas |
| `scripts/lib/dashboard-layout-scenarios.cjs` | Tabela inferior com rolagem horizontal e hover de card de gráfico na fixture isolada |
| `src/modules/accounts/presentation/account-risk-and-cashflow.css` | Risco, progresso, alertas e caixa no dashboard/setup/editor; 322 linhas |
| `scripts/lib/account-style-scenarios.cjs` | Cenários isolados de apresentação de contas, com restauração de dados em memória |
| `src/modules/analytics/presentation/strategy-comparison.css` | Ranking, seletores, cards, métricas e painel comparativo de estratégias; 201 linhas |
| `scripts/lib/strategy-style-scenarios.cjs` | Ranking e comparação por handlers reais, com dados temporários restaurados |
| `src/modules/calendar/presentation/calendar-grids.css` | Mini calendário, resumo semanal, células e grids mensal/semanal/quinzenal; 241 linhas |
| `scripts/lib/calendar-style-scenarios.cjs` | Modos, hover, rolagem e navegação/detalhes por handlers reais em perfil isolado |
| `src/modules/trades/presentation/trade-tables.css` | Tabelas, ordenação, seleção, badges e avisos de incompletos; 148 linhas, carga global |
| `scripts/lib/trade-table-style-scenarios.cjs` | Ordenação/seleção por handlers reais, flags de apresentação, scroll e sticky em perfil isolado |
| `src/styles/form-fields.css` | Grids, campos, foco, unidades e hints compartilhados; 91 linhas, carga global |
| `scripts/lib/form-field-style-scenarios.cjs` | Foco e estados de campos no modal real, sem submissão nem persistência |
| `src/styles/modal-and-tabs.css` | Overlays, estrutura dos modais e abas comuns; 80 linhas, carga global |
| `scripts/lib/modal-tab-style-scenarios.cjs` | Modais/footers/scroll e alternância de abas por handlers reais |
| `src/modules/calendar/presentation/calendar-toolbar.css` | Toolbar, seletor de mês e botões de modo do calendário; 27 linhas |
| `src/styles/upload-zone.css` | Zona de upload comum e estados hover/drag; 41 linhas, sem consumidor ativo confirmado |
| `scripts/lib/upload-zone-style-scenarios.cjs` | Fixture descartável para layout, hover, drag e input oculto da zona de upload |
| `src/modules/trades/presentation/emotion-picker.css` | Grid e chips de emoção, incluindo estado selecionado; 29 linhas |
| `scripts/lib/emotion-picker-style-scenarios.cjs` | Fixture descartável para idle, hover e seleção do picker sem mutar dados |
| `src/styles/tag-editor.css` | Tags compartilhadas entre Setup/Profile, contagem e botões de edição; 79 linhas |
| `scripts/lib/tag-editor-style-scenarios.cjs` | Tags editáveis/somente leitura, fixture `.tag-add` e nuvem do perfil em nove estados |
| `src/styles/alerts-and-utilities.css` | Alertas info/warn, separador e utilitários flex/espaçamento/largura; 52 linhas |
| `scripts/lib/alert-utility-style-scenarios.cjs` | Alertas/separadores reais, headers responsivos e fixture isolada para utilitário sem consumidor |
| `src/modules/trades/presentation/trade-actions.css` | Barra de ações em lote e navegação do fluxo do modal; 48 linhas |
| `scripts/lib/trade-action-style-scenarios.cjs` | Estados transitórios da seleção em lote e fluxo do modal, sem persistência |
| `src/modules/routine/presentation/premarket.css` | Checklist e grade mensal de hábitos premarket; 81 linhas |
| `src/modules/trades/presentation/error-chips.css` | Chips de erros do modal de operação; 31 linhas |
| `scripts/lib/premarket-error-chip-style-scenarios.cjs` | Grade/estados premarket e chips ocioso/hover/selecionado sem persistência |
| `src/modules/data-transfer/presentation/data-transfer.css` | Layout da importação, backup, filtros e exportação; 155 linhas |
| `scripts/lib/data-transfer-style-scenarios.cjs` | Abas reais de importação/exportação em nove larguras, sem IO |
| `src/styles/application-dialog.css` | Mensagem, input e erro do diálogo comum; 22 linhas |
| `src/styles/navigation-footer.css` | Layout do rodapé e links secundários da sidebar; 19 linhas |
| `scripts/lib/navigation-footer-style-scenarios.cjs` | Hover, rolagem e seleção ativa do rodapé em três larguras |
| `src/styles/workspace-grids.css` | Grids compartilhados de estratégias, perfil e parceiros; 31 linhas |
| `scripts/lib/workspace-grid-style-scenarios.cjs` | Grids reais e parceiros legados ocultos em seis larguras |
| `src/modules/study-hub/presentation/study-hub-native.css` | Abas/root e estilos nativos preservados; 297 linhas |
| `scripts/lib/study-hub-native-style-scenarios.cjs` | Quatro abas, hover, foco e rolagem horizontal/sticky em oito larguras |
| `src/styles/workspace-summaries.css` | Hero do perfil, status/notificações, chips e ranking ampliado; 156 linhas |
| `scripts/lib/workspace-summary-style-scenarios.cjs` | Tons/neutro/vazio, hero/compact e ranking em seis larguras |
| `src/modules/documents/presentation/doc-browser-and-layout.css` | Shell/cards, pastas, entradas e metadados dos documentos; 192 linhas |
| `src/modules/documents/presentation/doc-editor-and-media.css` | Contexto, toolbar, editor, mídia e vazios; 173 linhas |
| `scripts/lib/document-style-scenarios.cjs` | Renderers/seleção reais com fixture temporária; 41 casos sem persistência |
| `src/modules/accounts/presentation/account-overview.css` | Grid/cards, métricas e barras da visão geral de contas; 115 linhas |
| `scripts/lib/account-overview-style-scenarios.cjs` | 17 estados de conta única/múltipla/vazia/nome longo e breakpoints sem persistência |
| `src/modules/partners/presentation/partners.css` | Editor de afiliados, estados vazios, apoio e QR; 127 linhas |
| `src/modules/partners/presentation/partners-page.js` | Renderer global de parceiros, 37 linhas movidas intactas de `app.js` |
| `tests/partners-page.test.cjs` | Caracterização de vazio, afiliados/QR, alvos ausentes e ordem de carga |
| `src/modules/accounts/presentation/accounts-page.js` | Renderer global de contas, 46 linhas movidas intactas de `app.js` |
| `tests/accounts-page.test.cjs` | Caracterização de contas, vazio, alvos opcionais e ordem de carga |
| `src/modules/documents/presentation/documents-page.js` | Renderer global de documentos, 137 linhas movidas intactas de `app.js` |
| `tests/documents-page.test.cjs` | Caracterização de pasta/lista/editor, vazio, trade, alvo ausente e ordem de carga |
| `src/modules/routine/presentation/premarket-page.js` | Renderer global do premarket, 60 linhas movidas intactas de `app.js` |
| `tests/premarket-page.test.cjs` | Caracterização de resultados mensais, grade de hábitos e ordem de carga |
| `src/modules/accounts/presentation/risk-board.js` | Painel de risco do dashboard, 136 linhas movidas intactas |
| `tests/risk-board.test.cjs` | Caracterização de barras, sinais, excessos, metas, thresholds, defaults, guards e carga |
| `src/modules/analytics/presentation/dashboard-page.js` | Renderer principal do dashboard, 69 linhas movidas intactas |
| `tests/dashboard-page.test.cjs` | Caracterização de cards, sete gráficos, curva, componentes, recentes, tooltips e carga |
| `src/modules/analytics/presentation/dashboard-equity-mode.js` | Alternância global entre valor e percentual da curva de equity; 6 linhas intactas |
| `tests/dashboard-equity-mode.test.cjs` | Caracterização de modos, labels, fallback, botão opcional, ordem e carga |
| `src/modules/analytics/presentation/strategy-rows.js` | Linhas de estratégias compartilhadas por dashboard/hub, 23 linhas movidas intactas |
| `tests/strategy-rows.test.cjs` | Caracterização de limite, ordem, escaping, progresso, sinais, vazio, alvos e carga |
| `src/modules/analytics/presentation/strategy-comparison.js` | Painel comparativo de estratégias, 223 linhas movidas intactas |
| `tests/strategy-comparison.test.cjs` | Caracterização de guard, vazio, seleção inválida, comparação completa, gráficos e carga |
| `src/modules/analytics/presentation/strategy-hub-page.js` | Renderer global do hub de estratégias, 41 linhas movidas intactas de `app.js` |
| `tests/strategy-hub-page.test.cjs` | Caracterização de métricas, tabela, foco, vazio, alvos opcionais e ordem de carga |
| `src/modules/analytics/presentation/stop-fee-analysis.js` | Renderer global dos quatro cards de stops/taxas, 51 linhas movidas intactas |
| `tests/stop-fee-analysis.test.cjs` | Caracterização de tons, percentuais, formatação, tooltips, alvo ausente e carga |
| `src/modules/calendar/presentation/dashboard-calendar.js` | Calendário compacto e totais semanais do dashboard, 56 linhas movidas intactas |
| `tests/dashboard-calendar.test.cjs` | Caracterização de mês âncora, bissexto, resultados diários/semanais, vazio, alvos e carga |
| `src/modules/calendar/presentation/calendar-controls.js` | Navegação, seletor, modos e detalhe do dia; cinco declarações/41 linhas intactas |
| `tests/calendar-controls.test.cjs` | Caracterização de estado, parsing, controles opcionais, detalhe/vazio e carga |
| `src/modules/calendar/presentation/calendar-page.js` | Renderer global de calendário, 97 linhas movidas intactas de `app.js` |
| `tests/calendar-page.test.cjs` | Caracterização de três visões, bissexto, totais, datas, vazio, traduções e ordem de carga |
| `src/modules/notifications/presentation/notifications-page.js` | Renderer global de notificações, 8 linhas movidas intactas de `app.js` |
| `tests/notifications-page.test.cjs` | Caracterização de conta ativa, cópia dos alertas, vazio, falha e ordem de carga |
| `src/shared/presentation/status-list.js` | Lista de status reutilizada por notificações, perfil, estratégias e StudyHub; 17 linhas intactas |
| `tests/status-list.test.cjs` | Caracterização de vazio, escaping, ações, valores, alvos e carga |
| `src/shared/presentation/analysis-summary.js` | Resumos analíticos reutilizados por estratégias e psicologia; 10 linhas intactas |
| `tests/analysis-summary.test.cjs` | Caracterização de ordem, escaping, defaults, itens falsy, vazio, alvos e carga |
| `src/modules/documents/presentation/document-media.js` | Renderer de imagens e estado vazio dos documentos; 11 linhas intactas |
| `tests/document-media.test.cjs` | Caracterização de vazio, ordem, URLs, escaping, ações, falhas e carga |
| `src/modules/accounts/presentation/account-cashflow-form.js` | Renderer do resumo e movimentos temporários no formulário de conta; 22 linhas intactas |
| `tests/account-cashflow-form.test.cjs` | Caracterização de guard, vazio, resumo, sinais, linhas, escaping, ações e carga |
| `src/modules/accounts/presentation/setup-cashflow-list.js` | Renderer do resumo e movimentos persistidos na configuração; 24 linhas intactas |
| `tests/setup-cashflow-list.test.cjs` | Caracterização de guards, conta, vazio, resumo, linhas, escaping, ações e carga |
| `src/modules/accounts/presentation/setup-risk-summary.js` | Projeção do risco calculado nos oito campos da configuração; 14 linhas intactas |
| `tests/setup-risk-summary.test.cjs` | Caracterização de conta, dependências, formatação, sinais, campos opcionais e carga |
| `src/modules/accounts/presentation/account-list.js` | Lista do seletor de contas com ações e resumos financeiros; 5 linhas intactas |
| `tests/account-list.test.cjs` | Caracterização de guard, vazio, contas, cálculos, ordem, ações e carga |
| `src/modules/accounts/presentation/risk-setup-page.js` | Composição dos campos, resumos e tags da configuração de risco; 17 linhas intactas |
| `tests/risk-setup-page.test.cjs` | Caracterização de precedência, defaults, zeros, data, campos opcionais e carga |
| `src/modules/accounts/presentation/account-balance-chrome.js` | Projeção do saldo, variação e contagem da conta no shell; 15 linhas intactas |
| `tests/account-balance-chrome.test.cjs` | Caracterização de defaults, retorno, sinais, campos opcionais, formatação e carga |
| `src/modules/accounts/presentation/risk-tags.js` | Listas editáveis de estratégias, emoções e mercados da configuração; 16 linhas intactas |
| `tests/risk-tags.test.cjs` | Caracterização de guard, inicialização, ordem, escaping, contagem, controles e carga |
| `src/app/presentation/account-summary.js` | Projeção da conta ativa no topbar; 10 linhas intactas |
| `tests/account-summary.test.cjs` | Caracterização de guard, cor, nome, tipo, alvos opcionais e carga |
| `src/app/presentation/topbar-value.js` | Projeção de um valor completo/compacto no topbar; 9 linhas intactas |
| `tests/topbar-value.test.cjs` | Caracterização de guards, densidade, título, classe e carga |
| `src/modules/trades/presentation/trade-images.js` | Prévia das imagens temporárias da operação; 4 linhas intactas |
| `tests/trade-images.test.cjs` | Caracterização de guard, vazio, ordem, campos, remoção e carga |
| `src/modules/trades/presentation/trade-duration-field.js` | Projeção da duração calculada no formulário da operação; 12 linhas intactas |
| `tests/trade-duration-field.test.cjs` | Caracterização de guard, datas, horários, fallback, duração nula/zero e carga |
| `src/modules/trades/presentation/trade-plan-deviation.js` | Estado e orientação do campo de desvio do plano; 11 linhas intactas |
| `tests/trade-plan-deviation.test.cjs` | Caracterização de guard, opções, fallback, disciplina e carga |
| `src/modules/trades/presentation/incomplete-trade-flow.js` | Projeção do fluxo de conclusão sequencial de trades incompletos; 31 linhas intactas |
| `tests/incomplete-trade-flow.test.cjs` | Caracterização de cadastro, edição, fluxo único/múltiplo, navegação, alvos opcionais e carga |
| `src/modules/trades/presentation/trade-log-read-only-notice.js` | Aviso de consulta do diário quando a conta filtrada não é ativa; 16 linhas intactas |
| `tests/trade-log-read-only-notice.test.cjs` | Caracterização de guard, bloqueio, mensagens, escaping e carga |
| `src/modules/trades/presentation/trade-error-chips.js` | Composição dos chips de erros da operação; 12 linhas intactas |
| `tests/trade-error-chips.test.cjs` | Caracterização de guard, normalização, deduplicação, seleção, escaping e carga |
| `src/modules/trades/presentation/trade-log-metrics.js` | Cards de métricas do filtro atual do diário; 19 linhas intactas |
| `tests/trade-log-metrics.test.cjs` | Caracterização de guard, cards, sinais, risco médio, incompletos, não mutação e carga |
| `src/modules/trades/presentation/trade-log-selection.js` | Barra de ações e checkbox geral da seleção do diário; 26 linhas intactas |
| `tests/trade-log-selection.test.cjs` | Caracterização de guard, contagens, textos, classes, ações, checkbox geral e carga |
| `src/modules/trades/presentation/trade-log.js` | Orquestração e linhas da tabela do diário; três funções/87 linhas intactas |
| `tests/trade-log-page.test.cjs` | Caracterização de filtros, vazio, incompletos, labels, linhas compacta/completa, isolamento StudyHub e carga |
| `src/modules/documents/presentation/document-folder-icon.js` | Ícones SVG das pastas e fallback de arquivo; 9 linhas intactas |
| `tests/document-folder-icon.test.cjs` | Caracterização de wrapper, SVGs, tipos, fallback e carga |
| `src/modules/psychology/presentation/psychology-statistics.js` | Renderer da aba de psicologia em análises, 59 linhas intactas |
| `tests/psychology-statistics.test.cjs` | Caracterização de cards, gráficos, resumos, hesitações, erros, tabela, vazio e carga |
| `src/modules/analytics/presentation/statistics-tabs.js` | Alternância global das cinco abas de análises e despacho para seus renderers; 11 linhas intactas |
| `tests/statistics-tabs.test.cjs` | Caracterização de painéis, classes, alvos opcionais, fallback, psicologia, simulação e carga |
| `src/modules/analytics/presentation/statistics-filters.js` | Controles globais de período personalizado e fixação da conta das estatísticas; 11 linhas intactas |
| `tests/statistics-filters.test.cjs` | Caracterização de período, fallback, alvos opcionais, ordem da fixação da conta e carga |
| `src/modules/analytics/presentation/statistics-page.js` | Orquestração da página de análises; 193 linhas movidas intactas |
| `tests/statistics-page.test.cjs` | Caracterização de contas, risco, vazio, gráficos, símbolos, dias, horários e carga |
| `src/modules/psychology/presentation/psychology-page.js` | Renderer global da página de psicologia, 25 linhas movidas intactas de `app.js` |
| `tests/psychology-page.test.cjs` | Caracterização de resumos, gráficos, tabela, vazio, alvos opcionais e ordem de carga |
| `scripts/lib/partner-style-scenarios.cjs` | Vazio/afiliados/QR em oito larguras, sem mutação persistente |
| `src/styles/tag-cloud.css` | Espaçamento/títulos dos três grupos de tags do perfil; 13 linhas |
| `src/styles/page-motion.css` | `@keyframes fade-up` usado pela página ativa; 12 linhas |
| `src/styles/responsive-desktop-tablet.css` | Media queries gerais de 1420, 1240 e 1080px; 260 linhas |
| `src/styles/responsive-mobile.css` | Media queries gerais de 720 e 440px; 316 linhas; substitui o residual `styles.css` |
| `src/modules/profile/presentation/profile-page.js` | Renderer global da página de perfil; 48 linhas movidas intactas de `app.js` |
| `src/modules/trades/presentation/incomplete-trade-banner.js` | Estado de descarte e APIs globais do banner de trades incompletos; 14 linhas movidas intactas de `app.js` |
| `tests/profile-page.test.cjs` | Caracterização de HTML, risco, tags, alertas, alvos opcionais e ordem de carga |
| `scripts/shell-style-check.cjs` | Comparação isolada de páginas, shell, menus, foco, hover e modais |

Esses arquivos existem após os lotes 1–2, 2b, G1, G2a–G2ae, G3a–G3be e G4a–G4f; demais responsabilidades continuam no legado. Entrega e
validações: [refactoring-progress.md](refactoring-progress.md). Camadas adicionais serão
criadas apenas quando uma extração real justificar sua existência.
