# Project Map

Índice de navegação. Ler este mapa antes de procurar uma feature; buscar símbolos com Serena.
Fallback: `rg -n 'function NOME' app.js`; abrir apenas o trecho necessário.
Evitar `app.js:8378` da baseline: contém o template legado inteiro numa linha.

| Trabalho | Procurar primeiro |
|---|---|
| Inicialização/navegação | `app.js`: `showPage`, `refreshAll`, callback `window.load`; `index.html` |
| Operação/diário | `saveTrade`, `renderLog`, `getLogFilteredTrades`, `duplicateTrade` |
| Conta/saldo/risco | `normalizeAccount`, `calcAccountRiskState`, `saveAccount` |
| Dashboard/estratégia | `src/modules/analytics/presentation/dashboard-page.js`: `renderDashboard`; `calcMetrics`, `getStrategySnapshots` em `app.js`; `src/modules/analytics/presentation/strategy-hub-page.js`: `renderStrategyHub` |
| Análises/calendário | `src/modules/psychology/presentation/psychology-page.js`: `renderPsych`; `renderStats` permanece em `app.js`; `renderStatsPsych` em `src/modules/psychology/presentation/psychology-statistics.js`; calendário em `src/modules/calendar/presentation/calendar-page.js` |
| Rotina | `src/modules/routine/presentation/premarket-page.js`: `renderPremarket`; `savePM`, `preMarketData` em `app.js` |
| Importação/exportação | `parseGenericTradeRows`, `parseMT5Rows`, `buildTradesCSV`, `restoreBackupData` |
| Simulação | `calculateSimulationSizing`, `buildSimulationPlan`, `renderSimulation` |
| StudyHub | `renderStudyHub`, `syncStudyHubLegacyInputs`, `shInitLegacyModule` |
| Intraday | `studyHubBuildIntradayRows`, `studyHubEnhanceIntradayImpact` |
| Documentos | `src/modules/documents/presentation/documents-page.js`: `renderDocumentsPage`; `getDocumentEntries`, `saveCurrentDocument` em `app.js` |
| Parceiros | `src/modules/partners/presentation/partners-page.js`: `renderPartnersPage`; `ensurePartnerHubConfig` em `app.js` |
| Notificações | `src/modules/notifications/presentation/notifications-page.js`: `renderNotificationsPage`; `buildOperationalAlerts` em `app.js` |
| Perfil | `src/modules/profile/presentation/profile-page.js`: `renderProfilePage` |
| Persistência/configuração | `save`, `load`, `saveConfig` |
| Idioma/câmbio | `src/modules/preferences/presentation/`; `fetchCotacao` permanece em `app.js` |
| Visual | `src/styles/`, CSS de preferências/StudyHub e arquivos responsivos; consultar o mapa CSS |

## Simulação: primeiro domínio extraído

- Domínio: `src/modules/simulation/domain/calculate-simulation-sizing.js`.
- Testes: `tests/simulation-sizing.test.cjs`.
- Compatibilidade: chamadas existentes em `app.js` e script carregado por `index.html`.
- `TradeDiarySimulationSizing`: parsing numérico, arredondamento e dimensionamento puro.
- Smoke: `scripts/browser-smoke.cjs`; demais regras de simulação permanecem em `app.js`.
- Resultados e limites de cobertura: [progresso](refactoring-progress.md).

## Estratégias: renderer do hub (G3f)

- `src/modules/analytics/presentation/strategy-hub-page.js`: `renderStrategyHub` global, 41 linhas movidas intactas de `app.js`; script clássico síncrono antes dos demais renderers e de `app.js`.
- `getStrategySnapshots` e formatação continuam no legado; `renderStatusList` em `src/shared/presentation/status-list.js`; `renderStrategyRows` foi extraído no G3l; `showPage` e `refreshAll` preservam os consumidores.
- `tests/strategy-hub-page.test.cjs` caracteriza preenchido/vazio, métricas, tabela, foco, alvos opcionais e ordem de carga; smoke abre estratégias e exercita refresh.
- Matriz visual v29 comparou 922 estados com G3e; todos idênticos, com 55 imagens/288 pixels dentro da tolerância existente.

## Psicologia: renderer da página (G3g)

- `src/modules/psychology/presentation/psychology-page.js`: `renderPsych` global, 25 linhas movidas intactas de `app.js`; script clássico síncrono antes dos demais renderers e de `app.js`.
- Conta ativa, seleção de trades, Chart.js, filtros subjetivos e formatação continuam no legado; `showPage` e `refreshAll` preservam os consumidores.
- `tests/psychology-page.test.cjs` caracteriza resumos, gráficos, tabela, vazio, alvos opcionais e ordem de carga; smoke abre psicologia e exercita refresh.
- Matriz visual v29 comparou 922 estados com G3f; todos idênticos, com 49 imagens/293 pixels dentro da tolerância existente.

## Transferência de dados: serialização CSV

- Adaptador de formato: `src/modules/data-transfer/infrastructure/serialize-trades-csv.js`.
- Namespace: `TradeDiaryTradesCSV`; recebe registros e devolve texto, sem DOM/IO/estado global da aplicação.
- Compatibilidade em `app.js`: `TRADE_CSV_HEADERS` referencia o mesmo array; `csvCell` e `buildTradesCSV(list=trades)` delegam.
- Consumidor: `exportTradesCSV`; filtros, download/Blob e importação permanecem no legado.
- Carga: sizing antes do serializer CSV; ambos antes de `app.js`, como scripts clássicos síncronos.
- Testes: `tests/trades-csv.test.cjs`; smoke CSV em `scripts/browser-smoke.cjs`.

## Filtro de contas da exportação (G3aa)

- `src/modules/data-transfer/presentation/export-account-filter.js`: `renderExportAccountFilter()` global, sete linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- `tests/export-account-filter.test.cjs`: guard do select, ordem, IDs, nomes escapados, preservação/limpeza da seleção e carga.
- Contas, `escapeHtml`, leitura dos filtros e exportação permanecem nas dependências existentes; consumidor de `switchImportTab('export')` preservado.
- 191 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Resumo do backup (G3ab)

- `src/modules/data-transfer/presentation/backup-summary.js`: `renderBackupSummary(data=createBackupPayload())` global, cinco linhas movidas byte a byte; script clássico síncrono antes dos consumidores e de `app.js`.
- `tests/backup-summary.test.cjs`: guard do DOM, prefixo traduzido, formatação, preservação do dado, argumento padrão e carga.
- Criação/formatação do payload, importação, restauração e exportação permanecem nas dependências existentes; cinco consumidores preservados.
- 195 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Preferências: idiomas

- Registro: `src/modules/preferences/presentation/translation-catalog.js` (`LANGUAGES`, `TRANSLATIONS`).
- Catálogos: `locales/{pt-BR,en-US}/{trading,workspace,dialogs-and-labels}.js`, relativos à pasta acima.
- `trading`: navegação, dashboard, diário, análises e rotina; `workspace`: importação, documentos e configurações;
  `dialogs-and-labels`: modais, avisos, aliases, datas e rótulos dinâmicos.
- UI: `language-selector.js` (`t`, `initLanguageSelector`, `toggleLangMenu`, `closeLangMenu`, `setLanguage`, `applyLanguage`).
- Todos continuam globais de scripts clássicos; `currentLanguage` e sua leitura de storage permanecem em `app.js`.
- Ordem: registro, fragmentos por idioma na ordem acima, seletor, `app.js`. `Object.assign` preserva sobrescritas e ordem das chaves.
- Testes: `tests/language-selector.test.cjs`; fingerprints das 585 strings por idioma e efeitos do seletor.
- Smoke: troca EN/PT via handlers reais em perfil isolado; demais dados de storage devem permanecer iguais.

## StudyHub: estilos legados (G1)

- Apresentação: `src/modules/study-hub/presentation/legacy-controls.css`,
  `legacy-trade-sequence.css`, `legacy-recovery-panels.css`, `legacy-integration-overrides.css`.
- Carregados nessa ordem depois de `src/styles/responsive-mobile.css`; todos ativos nas quatro abas. Sem alterações de regras.
- Após G2ae, `src/styles/responsive-desktop-tablet.css` contém 1420/1240/1080px (histórico 4304–4563) e `src/styles/responsive-mobile.css` contém 720/440px (histórico 4564–4879); não há CSS residual em `styles.css`.
- Contrato de bytes/cascata: `tests/study-hub-styles.test.cjs`.
- Smoke: `scripts/browser-smoke.cjs`; comparação visual: `scripts/study-hub-style-check.cjs`.
- Fronteiras e próximos cortes: [mapa CSS](css-extraction-map.md); uso e limites: [tooling](tooling.md).

## Shell e preferências: estilos (G2a)

- `src/styles/foundation.css`: fontes, tokens, reset, elementos e scrollbars (109 linhas).
- `src/styles/shell-layout.css`: layout e topbar (43 linhas).
- `src/modules/preferences/presentation/preferences-widgets.css`: cotação e idioma (139 linhas).
- `src/styles/navigation-and-account-summary.css`: sidebar, logo, navegação e resumo (408 linhas).
- Carga nessa ordem, antes dos CSS responsivos e dos quatro CSS StudyHub; sobrescritas permanecem nos arquivos responsivos.
- Contrato integral de bytes/cascata: `tests/study-hub-styles.test.cjs` (nome histórico; cobre todos os links).
- Comparação visual: `scripts/shell-style-check.cjs`; instruções e limites em [tooling](tooling.md).

## Superfícies e cabeçalhos: estilos (G2b)

- `src/styles/page-surfaces-and-headers.css`: 246 linhas de superfícies de cards/modais, layout das páginas,
  espaçamento das abas de análise, cabeçalhos e ícones SVG em máscaras CSS.
- Carrega após `navigation-and-account-summary.css`, antes dos CSS responsivos; regras responsivas permanecem nesses arquivos.
- Uso compartilhado entre páginas: manter carga global e ordem, inclusive pseudo-elementos e seletores por inline style.
- Teste integral de bytes em `tests/study-hub-styles.test.cjs`; runner visual do shell também captura máscaras,
  pseudo-elementos dos cards e as cinco abas de análise. Limites em [tooling](tooling.md).

## Botões e datas: estilos (G2c)

- `src/styles/page-actions.css`: 114 linhas de botões, variantes/tamanhos, opções de análise e intervalo de datas do diário.
- Carrega depois de `page-surfaces-and-headers.css`, antes dos CSS responsivos; media queries e complementos tardios mantêm a posição original.
- Uso global: shell, páginas, controles gerados e modais. Handlers e estado permanecem no legado.
- Runner shell verifica hover, foco, filtragem e limpeza pelos controles reais; opções nativas têm suas cores computadas amostradas.
- Teste integral de bytes permanece em `tests/study-hub-styles.test.cjs`; uso/limites em [tooling](tooling.md).

## Métricas e indicadores de risco: estilos (G2d)

- `src/styles/metric-cards-and-risk-insights.css`: 300 linhas de grids, cards, tooltips e indicadores comuns.
- Carrega após `page-actions.css`, antes dos CSS responsivos; responsividade em 1420/1080/720 permanece na posição original.
- Apresentação compartilhada em `src/styles`; cálculos e eventos continuam em `app.js`.
- Runner shell cobre tons safe/warn/danger, hover, pseudo-elementos e tooltip acima/abaixo/oculto.
- Cenários isolados: `scripts/lib/metric-style-scenarios.cjs`; contrato integral de bytes e limites visuais mantidos.

## Dashboard e layouts comuns de cards: estilos (G2e)

- `src/styles/dashboard-and-card-layout.css`: 161 linhas de grids, painéis, cabeçalhos, tabelas e containers de gráficos.
- Carrega após `metric-cards-and-risk-insights.css`, antes dos CSS responsivos; overrides responsivos mantêm sua posição original.
- Uso compartilhado entre páginas/modais em `src/styles`; Chart.js, renderers e handlers permanecem no legado.
- Runner shell acrescenta tabela inferior com rolagem horizontal e hover de card de gráfico.
- Cenários: `scripts/lib/dashboard-layout-scenarios.cjs`; fixture não produz overflow vertical, e sticky não tem consumidor encontrado.

## Contas: estilos de risco e caixa (G2f)

- `src/modules/accounts/presentation/account-risk-and-cashflow.css`: 322 linhas de risco, progresso, alertas, cálculo visual e caixa.
- Carrega após `dashboard-and-card-layout.css`, antes dos CSS responsivos; uso no dashboard, setup e editor de contas.
- Apresentação de contas com carga global; renderers, cálculos, handlers e persistência continuam em `app.js`.
- `scripts/lib/account-style-scenarios.cjs`: tons de risco, meta, caixa preenchido nos dois renderers e editor vazio.
- Cenários usam perfil isolado e restauram dados temporários; snapshots protegem storage e contas/trades em memória.
- Contrato integral de bytes mantido; regras sem consumidor encontrado preservadas e limites em [tooling](tooling.md).

## Analytics: ranking e comparação de estratégias (G2g)

- `src/modules/analytics/presentation/strategy-comparison.css`: 201 linhas de ranking, seletores e painel comparativo.
- Carrega após `account-risk-and-cashflow.css`, antes dos CSS responsivos; uso no dashboard, central de estratégias e aba de análise.
- Renderer compartilhado: `renderStrategyRows` em `src/modules/analytics/presentation/strategy-rows.js`; `renderDashStrategyBoard`, `renderStrategyCompareCards` e eventos dos seletores continuam em `app.js`.
- Cenários isolados: `scripts/lib/strategy-style-scenarios.cjs`; ranking positivo/negativo/vazio, comparação completa e alternância de seleções.
- Overrides tardios e responsivos permanecem nos CSS responsivos. Contrato de bytes e limites em [tooling](tooling.md).

## Calendários: grids e células (G2h)

- `src/modules/calendar/presentation/calendar-grids.css`: 241 linhas do mini calendário, resumo semanal e layouts do calendário.
- Carrega após `strategy-comparison.css`, antes dos CSS responsivos; overrides 1080/720/440 mantêm sua posição original.
- Renderers: `renderDashboardCalendar` em `src/modules/calendar/presentation/dashboard-calendar.js` e `renderCalendar` em `calendar-page.js`; navegação e seleção em `src/modules/calendar/presentation/calendar-controls.js`; estado permanece em `app.js`.
- UI: `week` aparece como Mensal, `biweek` como Quinzenal; `month` permanece acessível pela API global.
- Cenários: `scripts/lib/calendar-style-scenarios.cjs`; modos, hover, rolagem, detalhes do dia, mudança de ano e mês bissexto.
- Resets de estado visual entre capturas, sem mudar contas/trades/storage; limites em [tooling](tooling.md).

## Tabelas e estados de operações (G2i)

- `src/modules/trades/presentation/trade-tables.css`: 148 linhas de tabelas, ordenação, seleção, badges e avisos de incompletos.
- Carrega globalmente após `calendar-grids.css`, antes dos CSS responsivos; `.tbl` e badges mantêm consumidores em outras páginas e no resumo da conta.
- Renderers e handlers continuam em `app.js`; nenhuma alteração de dados ou APIs.
- Cenários: `scripts/lib/trade-table-style-scenarios.cjs`; scroll, sticky, ordenação por P/L, seleção, hover/foco, vazio e flags de incompletude.
- Overrides tardios e responsivos preservados; limites em [tooling](tooling.md).

## Campos de formulário (G2j)

- `src/styles/form-fields.css`: 91 linhas de grids, labels, inputs, selects, textarea, unidades e hints.
- Carrega globalmente após `trade-tables.css`, antes dos CSS responsivos; consumidores incluem operações, simulação, contas, parceiros e StudyHub.
- Cenários: `scripts/lib/form-field-style-scenarios.cjs`; foco em texto/número/select/textarea, unidade, readonly e conteúdo multilinha.
- Overrides responsivos e específicos do StudyHub permanecem nos CSS responsivos ou nos arquivos tardios, na posição original.
- `.field-hint` não possui consumidor encontrado; regra preservada sem criar UI artificial.

## Modais e abas comuns (G2k)

- `src/styles/modal-and-tabs.css`: 80 linhas de overlay, estrutura dos modais e navegação por abas.
- Carrega globalmente após `form-fields.css`, antes dos CSS responsivos; quatro modais e treze botões de aba mantêm consumidores existentes.
- Cenários: `scripts/lib/modal-tab-style-scenarios.cjs`; scroll do modal de operação, footers, diálogo com input e abas de importação, calendário e StudyHub.
- A segunda regra de `.modal-footer` permanece separada e posterior, preservando bordas e alinhamento.
- Overrides responsivos e específicos do StudyHub permanecem tardios; limites em [tooling](tooling.md).

## Toolbar do calendário (G2l)

- `src/modules/calendar/presentation/calendar-toolbar.css`: 27 linhas do cabeçalho, seletor de mês e botões de modo.
- Carrega após `modal-and-tabs.css`, antes dos CSS responsivos; consumidor único em `#page-calendar`.
- Cenário dedicado em `scripts/lib/calendar-style-scenarios.cjs`: foco do picker e valores computados de controles/botões.
- `.gap-8` tardio mantém gap efetivo de 8px; dimensões e `!important` do bloco permanecem iguais.
- Demais estados e limites do calendário continuam em [tooling](tooling.md).

## Upload comum: estilos (G2m)

- `src/styles/upload-zone.css`: 41 linhas de zona, estados hover/drag, input oculto, ícone e textos.
- Carrega após `calendar-toolbar.css`, antes dos CSS responsivos; os overrides scoped do StudyHub permanecem tardios.
- Não há consumidor ativo confirmado das classes globais; `scripts/lib/upload-zone-style-scenarios.cjs` usa fixture descartável.
- Listeners globais de drag/drop, importadores e dados continuam inalterados em `app.js`.

## Seletor de emoções: estilos (G2n)

- `src/modules/trades/presentation/emotion-picker.css`: 29 linhas de grid, chips, seleção, emoji e rótulo.
- Carrega após `upload-zone.css`, antes dos CSS responsivos; não existem overrides posteriores encontrados.
- Não há consumidor ativo confirmado; `scripts/lib/emotion-picker-style-scenarios.cjs` usa fixture descartável.
- Estado `.selected` preservado; nenhuma lógica de operação ou configuração foi alterada.

## Tags e edição: estilos (G2o)

- `src/styles/tag-editor.css`: 79 linhas de listas, tags, contagem, botões e estados hover.
- Compartilhado entre Setup editável e nuvens somente leitura do Profile; carrega antes dos CSS responsivos.
- `scripts/lib/tag-editor-style-scenarios.cjs` usa renderizadores reais e uma fixture apenas para `.tag-add` sem consumidor.
- Edição, exclusão, configuração, dados e storage não são modificados pelos cenários.

## Alertas e utilitários: estilos (G2p)

- `src/styles/alerts-and-utilities.css`: 52 linhas de alertas, separador e utilitários flex/espaçamento/largura.
- Consumidores incluem Import, Setup, Trades e headers de Calendar/Stats/Premarket.
- `scripts/lib/alert-utility-style-scenarios.cjs` usa consumidores reais e fixture apenas para `.w-full`/warning isolado.
- Overrides responsivos e específicos de Import/StudyHub permanecem posteriores nos CSS responsivos ou scoped.

## Ações de operações: estilos (G2q)

- `src/modules/trades/presentation/trade-actions.css`: 48 linhas da barra em lote e fluxo de navegação do modal.
- `scripts/lib/trade-action-style-scenarios.cjs`: barra oculta/selecionada e fluxo visível do modal em três larguras.
- Seleção altera somente estado transitório; contas, trades e storage permanecem intactos.
- Handlers de editar/completar/duplicar/excluir continuam no legado.

## Premarket e erros de operação: estilos (G2r)

- `src/modules/routine/presentation/premarket.css`: checklist e grade mensal da rotina.
- `src/modules/trades/presentation/error-chips.css`: chips do modal de operação.
- `scripts/lib/premarket-error-chip-style-scenarios.cjs`: seis estados em três larguras, sem persistência.
- Renderer da página em `src/modules/routine/presentation/premarket-page.js`; handlers e persistência continuam em `app.js`; `.pm-check` foi preservado sem consumidor localizado.

## Premarket: renderer de página (G3e)

- `src/modules/routine/presentation/premarket-page.js`: `renderPremarket` global, 60 linhas movidas intactas de `app.js`; script clássico síncrono antes dos outros renderers e de `app.js`.
- Estado de mês, conta ativa, hábitos, ações e persistência continuam no legado; `showPage`, `refreshAll`, navegação mensal e edição de hábitos preservam os consumidores.
- `tests/premarket-page.test.cjs` caracteriza resultados, grade, fevereiro bissexto, ausência de alvo e ordem de carga; smoke abre a rotina e exercita refresh.
- Matriz visual v29 comparou 922 estados com G3d; todos idênticos, com 52 imagens/191 pixels dentro da tolerância existente.

## Documentação sob demanda

- [Análise global de modularização](modularization-analysis.md): desenho atualizado dos cortes e estratégia para preservar código.
- Inventários de extração: [JavaScript](javascript-extraction-map.md), [CSS/cascata](css-extraction-map.md), [HTML/páginas](html-extraction-map.md).
- [Arquitetura atual](current-architecture.md): stack, números, hotspots e riscos.
- [Catálogo de módulos](module-map.md): entradas e dependências por feature.
- [Arquitetura alvo](target-architecture.md) e [dependências](dependency-rules.md): fronteiras novas.
- [Roadmap](refactoring-roadmap.md) e [progresso](refactoring-progress.md): próximo lote e validações.
- [ADRs](adr/): decisões; consultar somente a decisão relevante.

Não reescanear caches, dependências instaladas ou o repositório inteiro para tarefas locais.

## Transferência de dados: estilos (G2s)

- `src/modules/data-transfer/presentation/data-transfer.css`: 155 linhas de importação, backup e exportação.
- `scripts/lib/data-transfer-style-scenarios.cjs`: abas reais, layout e dados/storage em nove larguras, incluindo 720±1 e 1420±1.
- Overrides responsivos permanecem nos CSS responsivos; handlers, importadores, download e restauração continuam em `app.js`.

## Diálogo comum: estilos (G2t)

- `src/styles/application-dialog.css`: largura, texto multilinha, input e erro do diálogo comum.
- `scripts/lib/modal-tab-style-scenarios.cjs`: input/foco, confirmação sem input e erro por valor incorreto, em três larguras.
- `openAppDialog`, `confirmAppDialog` e wrappers confirm/notice/prompt permanecem em `app.js`.

## Rodapé da navegação: estilos (G2u)

- `src/styles/navigation-footer.css`: três regras tardias do rodapé e links secundários da sidebar.
- `scripts/lib/navigation-footer-style-scenarios.cjs`: hover, rolagem e seleção ativa/idempotente de Profile em três larguras.
- Regras anteriores de navegação e `margin-top:auto` permanecem em `navigation-and-account-summary.css`; handlers continuam no legado.

## Grids compartilhados: estilos (G2v)

- `src/styles/workspace-grids.css`: seis regras de layout de estratégias, perfil e parceiros, preservadas na ordem original.
- `scripts/lib/workspace-grid-style-scenarios.cjs`: grids reais em seis larguras; inclui perfil secundário, margem do último filho e parceiros legados ocultos.
- Responsividade até 1420px permanece em `src/styles/responsive-desktop-tablet.css`; renderers, handlers e dados continuam no legado.

## StudyHub: estilos nativos (G2w)

- `src/modules/study-hub/presentation/study-hub-native.css`: abas/root e estilos de markup nativo; 297 linhas, carregadas antes dos CSS responsivos.
- `scripts/lib/study-hub-native-style-scenarios.cjs`: quatro abas, hover ativo/inativo, foco e rolagem horizontal/sticky em oito larguras.
- Markup nativo de grids/cards/ranges não é montado pelo renderer atual; regras preservadas sem fabricar consumidores.
- Overrides responsivos, montagem legada, handlers, cálculos e storage permanecem na posição original.

## Resumos compartilhados: estilos (G2x)

- `src/styles/workspace-summaries.css`: métricas do perfil, status/notificações, chips analíticos e espaçamento do ranking ampliado; 156 linhas.
- `scripts/lib/workspace-summary-style-scenarios.cjs`: seis cenários em seis larguras; real profile e renderers existentes com fixture de markup restaurável.
- Wrapping de status e hero em uma coluna até 720px permanecem nos CSS responsivos; cálculos, handlers e dados não alterados.

## Documentos: navegação e editor (G2y)

- `src/modules/documents/presentation/doc-browser-and-layout.css`: shell, cards, pastas, entradas e metadados agrupados; 192 linhas.
- `src/modules/documents/presentation/doc-editor-and-media.css`: contexto do trade, toolbar, textarea, mídia e estados vazios; 173 linhas.
- Links adjacentes após resumos compartilhados; `.doc-empty` mantém o override tardio e media queries 1420/1240/1080px permanecem nos CSS responsivos.
- Renderer principal em `src/modules/documents/presentation/documents-page.js`; `renderDocumentMedia`, `selectDocumentFolder`, `selectDocumentEntry` e persistência permanecem em `app.js`.
- `scripts/lib/document-style-scenarios.cjs`: 41 casos de notas gerais/diárias/trades/vazio, foco, hover e overflow; dados temporários restaurados, sem salvar/remover/upload.

## Documentos: renderer de página (G3d)

- `src/modules/documents/presentation/documents-page.js`: `renderDocumentsPage` global, 137 linhas movidas intactas de `app.js`; script clássico síncrono antes dos renderers de contas/parceiros/perfil e de `app.js`.
- Estado de pasta/seleção, helpers, ações e persistência continuam no legado; `showPage`, `refreshAll` e callbacks de documentos preservam os consumidores. A mídia foi separada no G3s.
- `tests/documents-page.test.cjs` caracteriza lista, editor, vazio, contexto de trade, alvos ausentes e ordem de carga; smoke abre documentos e exercita refresh.
- Matriz visual v29 comparou 922 estados com G3c; todos idênticos, com 52 imagens/188 pixels dentro da tolerância existente.

## Contas: visão geral (G2z)

- `src/modules/accounts/presentation/account-overview.css`: grid, cards, resumo, estatísticas e barras de risco; 115 linhas.
- Carrega após os dois CSS de documentos, antes dos CSS responsivos; `.account-overview-card` preserva as regras comuns anteriores e os overrides tardios em 1420/720px.
- Consumidor: contêiner `#accountsOverview` em `index.html`, preenchido por `renderAccountsPage` em `src/modules/accounts/presentation/accounts-page.js`; cálculo de risco e ações permanecem no legado.
- `scripts/lib/account-overview-style-scenarios.cjs`: 17 cenários de conta única, duas contas, vazio e nome longo; memória/storage restaurados.

## Parceiros: editor e apoio (G2aa)

- `src/modules/partners/presentation/partners.css`: 127 linhas de editor de afiliados, estados vazios, apoio e QR; carregado após a visão geral de contas e antes dos CSS responsivos.
- Consumidores ativos: `#partnerAffiliatesEditor`, `.partner-support-form`, `#partnerBtcQrPreview` e `renderPartnersPage`; `#partnersGrid` legado permanece oculto.
- `scripts/lib/partner-style-scenarios.cjs`: 32 estados de vazio/afiliados/QR nas larguras 390, 719/720/721, 1419/1420/1421 e 1440px; fixture restaura configuração/storage.
- Regras legadas de `.partner-card` e classes sem markup ativo seguem intactas; overrides responsivos permanecem tardios.

## Parceiros: renderer de página (G3b)

- `src/modules/partners/presentation/partners-page.js`: `renderPartnersPage` global, movida sem reescrita de `app.js`; script clássico síncrono antes do perfil e de `app.js`.
- Estado/configuração, salvamento, upload e handlers inline continuam no legado; `showPage`, `refreshAll` e callbacks de edição mantêm os consumidores.
- `tests/partners-page.test.cjs` caracteriza vazio, afiliado/QR, escaping, handlers e ausência de alvos; smoke navega a parceiros e exercita refresh.
- Matriz visual v29 comparou 922 estados com a referência anterior ao corte; todos idênticos, com 47 imagens/168 pixels dentro da tolerância existente.

## Contas: renderer de página (G3c)

- `src/modules/accounts/presentation/accounts-page.js`: `renderAccountsPage` global, movida intacta de `app.js`; script clássico síncrono antes dos renderers de parceiros/perfil e de `app.js`.
- Estado, cálculos de risco, salvamento e handlers continuam no legado; `saveAccount`, exclusão, `showPage` e `refreshAll` preservam os consumidores.
- `tests/accounts-page.test.cjs` caracteriza contas múltiplas, vazio, alvos opcionais e ordem de carga; smoke abre contas e exercita refresh.
- Matriz visual v29 comparou 922 estados com G3b; todos idênticos, com 59 imagens/291 pixels dentro da tolerância existente.

## Perfil: complemento tardio das tags (G2ab)

- `src/styles/tag-cloud.css`: 13 linhas de espaçamento dos três grupos e títulos da nuvem de tags; carregado após parceiros e antes dos CSS responsivos.
- Consumidor: `renderProfilePage` preenche `#profileTags`; `.tag-list`/`.tag` anteriores continuam em `src/styles/tag-editor.css`.
- `scripts/lib/tag-editor-style-scenarios.cjs` inclui nove estados de nuvem padrão/vazia/texto longo em 390/720/1440px; dados e storage restaurados.

## Perfil: renderer de página (G3a)

- `src/modules/profile/presentation/profile-page.js`: `renderProfilePage` global, movida sem reescrita de `app.js`; carrega como script clássico síncrono imediatamente antes de `app.js`.
- Continua lendo conta/trades/config e delegando métricas, risco e alertas às funções legadas no momento da chamada; `showPage` e `refreshAll` mantêm os consumidores.
- `tests/profile-page.test.cjs` caracteriza hero, risco, tags, alertas e nós opcionais; smoke navega ao perfil e exercita refresh.
- Matriz visual v29 comparou 922 estados com a referência anterior ao corte; todos idênticos, com 56 imagens/372 pixels dentro da tolerância existente.

## Shell: animação de entrada (G2ac)

- `src/styles/page-motion.css`: `@keyframes fade-up` de 12 linhas, carregado após a nuvem de tags e antes das media queries residuais.
- Consumidor: `.page.active` em `src/styles/page-surfaces-and-headers.css`; nome, duração, easing e quadros originais preservados.
- `scripts/shell-style-check.cjs`: CSSOM caracteriza os quadros 0% e 100% antes de desativar animações para as capturas estáveis.

## Shell: responsividade desktop/tablet (G2ad)

- `src/styles/responsive-desktop-tablet.css`: três media queries completas de 1420/1240/1080px, 260 linhas; link após `page-motion.css` e antes de `responsive-mobile.css`.
- Regras afetam shell, sidebar, dashboards, documentos, grids e StudyHub. A ordem preserva o override de `#sidebar` (`100dvh` em 1240px; `100vh` em 1080px).
- Matriz v29 caracteriza 922 estados, incluindo 1080/1240/1420±1; 922 estados idênticos após o corte, com 46 imagens/263 pixels dentro da tolerância existente.

## Shell: responsividade mobile (G2ae)

- `src/styles/responsive-mobile.css`: duas media queries completas de 720/440px, 316 linhas; ocupa a posição anterior de `styles.css`, antes dos quatro CSS legados StudyHub.
- `styles.css` foi removido após esgotar o residual; nenhum script, dado persistido ou seletor mudou.
- Matriz v29 inclui 390, 439/440/441 e 719/720/721px; demais larguras e páginas continuam na comparação integral.

## Notificações: renderer da página (G3h)

- `src/modules/notifications/presentation/notifications-page.js`: `renderNotificationsPage` global, oito linhas movidas byte a byte; script clássico síncrono antes de psicologia e de `app.js`.
- `getActiveAccount`, `getAccountTrades`, `buildOperationalAlerts` e estado permanecem no legado; `renderStatusList` em `src/shared/presentation/status-list.js`; consumidores `showPage` e `refreshAll` intactos.
- `tests/notifications-page.test.cjs`: conta ativa em cada chamada, cópia sem mutação, mensagem vazia, propagação de falhas e ordem de carga.
- 91 testes Node e 58 checks no navegador; matriz visual completa não repetida: não houve alteração de HTML gerado/CSS, e o fluxo real foi exercitado no smoke.

## Calendário: renderer da página (G3i)

- `src/modules/calendar/presentation/calendar-page.js`: `renderCalendar` global, 97 linhas movidas byte a byte; script clássico síncrono antes de notificações e de `app.js`.
- Estado `calYear/calMonth/calViewMode`, métricas e helpers de datas continuam no legado; handlers em `calendar-controls.js` após G3o. Consumidores: `calNav`, `calGoToMonth`, `setCalView`, `showPage` e `refreshAll`.
- `tests/calendar-page.test.cjs`: mensal/semanal/quinzenal, bissexto, totais, vazio, tradução e limite existente do último dia nas métricas do período.
- 97 testes Node e 64 checks no navegador; sem matriz visual completa nova neste corte de corpo intacto e CSS inalterado.

## Stops e taxas: apresentação (G3j)

- `src/modules/analytics/presentation/stop-fee-analysis.js`: `renderStopFeeAnalysis` global, 51 linhas movidas byte a byte; script clássico síncrono antes de calendário e de `app.js`.
- Consumidor `renderStats` intacto; `buildStopFeeAnalysis`, `fR` e `mkTip` continuam no legado. Nenhum cálculo financeiro extraído neste lote.
- `tests/stop-fee-analysis.test.cjs`: quatro cards, tons, limite inclusivo de 25%, escolha edge/drag, tooltips, formatação e alvo ausente.
- 102 testes Node e 67 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Calendário compacto do dashboard (G3k)

- `src/modules/calendar/presentation/dashboard-calendar.js`: `renderDashboardCalendar` global, 56 linhas movidas byte a byte; script clássico síncrono antes de stops/taxas e de `app.js`.
- Consumidor `renderDashboard` intacto; `getAnchorTradeDate`, `t`, `fR` e seleção de trades permanecem no legado.
- `tests/dashboard-calendar.test.cjs`: mês âncora, bissexto, estados ganho/perda/hoje, totais diários/semanais, vazio, não-array e alvos ausentes.
- 107 testes Node e 71 checks no navegador, incluindo refresh e navegação pela célula; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Linhas de estratégias compartilhadas (G3l)

- `src/modules/analytics/presentation/strategy-rows.js`: `renderStrategyRows(targetId, rows, limit=5)` global, 23 linhas movidas byte a byte; script clássico síncrono antes do hub e de `app.js`.
- Consumidores: `renderDashStrategyBoard` no legado e `renderStrategyHub` no módulo de apresentação; `escapeHtml`, `fR`, `formatStrategyRatio` e snapshots continuam no legado.
- `tests/strategy-rows.test.cjs`: ordem, escaping, sinais, métricas, normalização das barras, limite/default/slice, vazio e alvo ausente.
- 112 testes Node e 74 checks no navegador; dashboard/refresh e quantidade de linhas no hub exercitados. Sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Dashboard: renderer principal (G3m)

- `src/modules/analytics/presentation/dashboard-page.js`: `renderDashboard` global, 69 linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- Consumidores preservados: bootstrap, `setMode`, `toggleEqMode`, `refreshAll`, `showPage` e handler de período no HTML.
- Métricas, filtros, estado, datasets, risco, formatação e helpers continuam no legado; composição usa os componentes globais já extraídos.
- `tests/dashboard-page.test.cjs`: cards, sete gráficos, ordem/percentuais da curva, defaults, zero, recentes/limite 20, tooltips idempotentes e carga clássica.
- 119 testes Node e 78 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Painel de risco do dashboard (G3n)

- `src/modules/accounts/presentation/risk-board.js`: `renderRiskBoard` global, 136 linhas movidas byte a byte; script clássico síncrono antes do dashboard.
- Consumidor `src/modules/analytics/presentation/dashboard-page.js` intacto; `calcAccountRiskState`, formatação, tons e tooltips continuam no legado.
- `tests/risk-board.test.cjs`: quatro barras/sinais, excessos, metas, thresholds, raw usage, defaults zero, larguras sem teto e alvos ausentes.
- 126 testes Node e 81 checks no navegador. Sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Controles do calendário (G3o)

- `src/modules/calendar/presentation/calendar-controls.js`: globals `calNav`, `calGoToMonth`, `syncCalPicker`, `setCalView`, `showCalDay`; cinco declarações/41 linhas movidas byte a byte.
- Script clássico síncrono antes do renderer; consumidores HTML, `calendar-page.js` e bootstrap preservados. Estado global e helpers continuam em `app.js`.
- `tests/calendar-controls.test.cjs`: virada de ano, parsing, ordem de sync/render, modos, controles opcionais e tabela de trades/dia vazio.
- 133 testes Node e 84 checks no navegador. Sem matriz visual completa nova neste corte de corpos/HTML gerado intactos e CSS inalterado.

## Psicologia: estatísticas em análises (G3p)

- `src/modules/psychology/presentation/psychology-statistics.js`: `renderStatsPsych` global, 59 linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- Consumidor `switchStatTab('psych')` intacto; seleção de período e helpers de hesitação/disciplina e resumo permanecem no legado; cálculos locais do renderer foram movidos intactos.
- `tests/psychology-statistics.test.cjs`: quatro cards, cinco gráficos, resumos, limites de hesitações/erros, tabela, vazio e alvo opcional.
- 139 testes Node e 88 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Lista de status compartilhada (G3q)

- `src/shared/presentation/status-list.js`: `renderStatusList(targetId, items, emptyMessage=...)` global, 17 linhas movidas byte a byte; script clássico síncrono antes dos consumidores e de `app.js`.
- Reuso real por notificações, perfil, hub de estratégias e StudyHub; nenhuma nova camada de dados ou IO.
- `tests/status-list.test.cjs`: vazio, ordem, escaping, ações, valores falsy/truthy, alvo ausente e carga. Interpolações legadas de mensagens/handlers mantidas.
- 145 testes Node e 91 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Resumos analíticos compartilhados (G3r)

- `src/shared/presentation/analysis-summary.js`: `renderAnalysisSummary(containerId, items=[])` global, 10 linhas movidas byte a byte; script clássico síncrono antes dos consumidores e de `app.js`.
- Reuso real pela comparação de estratégias em `app.js` e pelas estatísticas de psicologia extraídas; dados e cálculos permanecem nos respectivos produtores.
- `tests/analysis-summary.test.cjs`: ordem, tons, escaping, defaults, itens falsy, vazio/não-array, alvo ausente e carga.
- 150 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Mídia de documentos (G3s)

- `src/modules/documents/presentation/document-media.js`: `renderDocumentMedia(entry)` global, 11 linhas movidas byte a byte; script clássico síncrono antes de `documents-page.js` e `app.js`.
- `tests/document-media.test.cjs`: mensagens vazias por origem, ordem, URLs, escaping, fallback, índices de remoção, ausência de mutação, falhas e carga.
- `documents-page.js` mantém o consumidor; helpers de imagem, remoção e persistência continuam no legado.
- 154 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Caixa no formulário de conta (G3t)

- `src/modules/accounts/presentation/account-cashflow-form.js`: `renderAccountCashflowList()` global, 22 linhas movidas byte a byte; script clássico síncrono antes de `accounts-page.js` e `app.js`.
- `tests/account-cashflow-form.test.cjs`: guard de DOM, vazio, resumo, sinais, tons, ordem, tipos, datas, valores, escaping, handlers, não mutação e carga.
- Cálculo, estado temporário, inclusão, remoção e persistência continuam no legado; consumidores de cadastro/edição preservados.
- 159 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Caixa na configuração (G3u)

- `src/modules/accounts/presentation/setup-cashflow-list.js`: `renderSetupCashflowList()` global, 24 linhas movidas byte a byte; script clássico síncrono antes de `accounts-page.js` e `app.js`.
- `tests/setup-cashflow-list.test.cjs`: guards de DOM/conta, vazio, cálculo, resumo, sinais, tons, ordem, tipos, datas, valores, escaping, handlers, não mutação e carga.
- Consulta da conta, cálculo, inclusão, exclusão e persistência continuam no legado; consumidores de setup preservados.
- 165 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Resumo de risco na configuração (G3v)

- `src/modules/accounts/presentation/setup-risk-summary.js`: `renderSetupRiskSummary()` global, 14 linhas movidas byte a byte; script clássico síncrono antes dos demais renderers de setup e de `app.js`.
- `tests/setup-risk-summary.test.cjs`: guard de conta, dependências, oito campos, sinais, defaults percentuais, alvos opcionais, não mutação e carga.
- Conta, trades e `calcAccountRiskState` continuam no legado; consumidores de setup preservados.
- 170 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Lista de contas (G3w)

- `src/modules/accounts/presentation/account-list.js`: `renderAccountList()` global, cinco linhas movidas byte a byte; script clássico síncrono antes de `accounts-page.js` e `app.js`.
- `tests/account-list.test.cjs`: guard de DOM, vazio, uma/múltiplas contas, dependências, ordem, campos, ações, não mutação e carga.
- Seleção, edição, exclusão, consulta de trades, cálculo de risco e formatação continuam como dependências globais; interpolações legadas permanecem intactas.
- 175 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Página de configuração de risco (G3x)

- `src/modules/accounts/presentation/risk-setup-page.js`: `renderSetup()` global, 17 linhas movidas byte a byte; script clássico síncrono após seus componentes e antes de `app.js`.
- `tests/risk-setup-page.test.cjs`: precedência conta/configuração, preservação de zeros, defaults `??`/`||`, data, campos opcionais, chamadas dependentes e carga.
- Estado, formulário, salvamento, tags e cálculo financeiro continuam no legado ou nos renderers já separados; dois consumidores preservados.
- 179 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Resumo da conta no shell (G3y)

- `src/app/presentation/account-summary.js`: `renderTopbarAccount()` global, dez linhas movidas byte a byte; script clássico síncrono antes de `accounts-page.js` e `app.js`.
- `tests/account-summary.test.cjs`: guard de conta, cor, nome, label de tipo, targets independentes, não mutação e carga.
- Conta ativa, normalização, seleção, tipo e métricas do topbar continuam no legado; cinco consumidores preservados.
- 183 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Valor responsivo do topbar (G3ac)

- `src/app/presentation/topbar-value.js`: `renderTopbarValue(id)` global, nove linhas movidas byte a byte; script clássico síncrono antes dos consumidores e de `app.js`.
- `tests/topbar-value.test.cjs`: cache ausente, target ausente, densidade completa/compacta, título, argumentos de classe e carga.
- Cache, densidade, formatação e atualização das métricas permanecem nas dependências existentes; dois consumidores preservados.
- 199 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Prévia das imagens da operação (G3ad)

- `src/modules/trades/presentation/trade-images.js`: `renderImagePreviews()` global, quatro linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- `tests/trade-images.test.cjs`: guard do DOM, vazio, ordem, URLs, títulos, estilos, índices de remoção, não mutação e carga.
- Upload, `FileReader`, normalização, remoção e persistência permanecem no legado; quatro consumidores preservados.
- 203 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Aviso de consulta do diário (G3ae)

- `src/modules/trades/presentation/trade-log-read-only-notice.js`: `renderLogReadOnlyNotice(accountFilter)` global, 16 linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- `tests/trade-log-read-only-notice.test.cjs`: guard do DOM, estado desbloqueado, todas as contas, conta específica, mensagens, escaping, não mutação e carga.
- Filtro, conta ativa, nomes e decisão de bloqueio permanecem no legado; consumidor de `renderLog` preservado.
- 208 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Chips de erros da operação (G3af)

- `src/modules/trades/presentation/trade-error-chips.js`: `renderErrorChips()` global, 12 linhas movidas byte a byte; script clássico síncrono antes dos consumidores e de `app.js`.
- `tests/trade-error-chips.test.cjs`: guard do DOM, vazio, normalização, deduplicação, ordem, seleção, encoding, escaping, não mutação e carga.
- Catálogo, seleção, toggle, disciplina, formulário e persistência permanecem no legado; quatro consumidores preservados.
- 212 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Ícones das pastas de documentos (G3z)

- `src/modules/documents/presentation/document-folder-icon.js`: `renderDocFolderIcon(type)` global, nove linhas movidas byte a byte; script clássico síncrono antes de `documents-page.js` e `app.js`.
- `tests/document-folder-icon.test.cjs`: wrapper, contrato SVG acessível, quatro tipos, paths distintos, fallback e carga.
- Navegação, pastas, estado e persistência continuam no legado ou em `documents-page.js`; dois consumidores preservados.
- 187 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.
