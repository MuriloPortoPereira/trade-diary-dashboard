# Project Map

Índice de navegação. Ler este mapa antes de procurar uma feature; buscar símbolos com Serena.
Fallback: `rg -n 'function NOME' app.js`; abrir apenas o trecho necessário.
Evitar `app.js:8378` da baseline: contém o template legado inteiro numa linha.

| Trabalho | Procurar primeiro |
|---|---|
| Inicialização/navegação | `app.js`: `showPage`, `refreshAll`, callback `window.load`; `index.html` |
| Operação/diário | `saveTrade`, `renderLog`, `getLogFilteredTrades`, `duplicateTrade` |
| Conta/saldo/risco | `normalizeAccount`, `calcAccountRiskState`, `saveAccount` |
| Dashboard/estratégia | `calcMetrics`, `renderDashboard`, `getStrategySnapshots` |
| Análises/calendário | `renderStats`, `renderStatsPsych`, `renderCalendar` |
| Rotina | `renderPremarket`, `savePM`, `preMarketData` |
| Importação/exportação | `parseGenericTradeRows`, `parseMT5Rows`, `buildTradesCSV`, `restoreBackupData` |
| Simulação | `calculateSimulationSizing`, `buildSimulationPlan`, `renderSimulation` |
| StudyHub | `renderStudyHub`, `syncStudyHubLegacyInputs`, `shInitLegacyModule` |
| Intraday | `studyHubBuildIntradayRows`, `studyHubEnhanceIntradayImpact` |
| Documentos | `getDocumentEntries`, `saveCurrentDocument`, `renderDocumentsPage` |
| Parceiros | `ensurePartnerHubConfig`, `renderPartnersPage` |
| Persistência/configuração | `save`, `load`, `saveConfig` |
| Idioma/câmbio | `src/modules/preferences/presentation/`; `fetchCotacao` permanece em `app.js` |
| Visual | `src/styles/`, CSS de preferências/StudyHub e `styles.css`; consultar o mapa CSS |

## Simulação: primeiro domínio extraído

- Domínio: `src/modules/simulation/domain/calculate-simulation-sizing.js`.
- Testes: `tests/simulation-sizing.test.cjs`.
- Compatibilidade: chamadas existentes em `app.js` e script carregado por `index.html`.
- `TradeDiarySimulationSizing`: parsing numérico, arredondamento e dimensionamento puro.
- Smoke: `scripts/browser-smoke.cjs`; demais regras de simulação permanecem em `app.js`.
- Resultados e limites de cobertura: [progresso](refactoring-progress.md).

## Transferência de dados: serialização CSV

- Adaptador de formato: `src/modules/data-transfer/infrastructure/serialize-trades-csv.js`.
- Namespace: `TradeDiaryTradesCSV`; recebe registros e devolve texto, sem DOM/IO/estado global da aplicação.
- Compatibilidade em `app.js`: `TRADE_CSV_HEADERS` referencia o mesmo array; `csvCell` e `buildTradesCSV(list=trades)` delegam.
- Consumidor: `exportTradesCSV`; filtros, download/Blob e importação permanecem no legado.
- Carga: sizing antes do serializer CSV; ambos antes de `app.js`, como scripts clássicos síncronos.
- Testes: `tests/trades-csv.test.cjs`; smoke CSV em `scripts/browser-smoke.cjs`.

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
- Carregados nessa ordem depois de `styles.css`; todos ativos nas quatro abas. Sem alterações de regras.
- Após G2l, `styles.css` mantém o trecho original 2631–4879 (2.249 linhas), incluindo StudyHub nativo e responsividade geral.
- Contrato de bytes/cascata: `tests/study-hub-styles.test.cjs`.
- Smoke: `scripts/browser-smoke.cjs`; comparação visual: `scripts/study-hub-style-check.cjs`.
- Fronteiras e próximos cortes: [mapa CSS](css-extraction-map.md); uso e limites: [tooling](tooling.md).

## Shell e preferências: estilos (G2a)

- `src/styles/foundation.css`: fontes, tokens, reset, elementos e scrollbars (109 linhas).
- `src/styles/shell-layout.css`: layout e topbar (43 linhas).
- `src/modules/preferences/presentation/preferences-widgets.css`: cotação e idioma (139 linhas).
- `src/styles/navigation-and-account-summary.css`: sidebar, logo, navegação e resumo (408 linhas).
- Carga nessa ordem, antes de `styles.css` e dos quatro CSS StudyHub; sobrescritas responsivas permanecem no residual.
- Contrato integral de bytes/cascata: `tests/study-hub-styles.test.cjs` (nome histórico; cobre todos os links).
- Comparação visual: `scripts/shell-style-check.cjs`; instruções e limites em [tooling](tooling.md).

## Superfícies e cabeçalhos: estilos (G2b)

- `src/styles/page-surfaces-and-headers.css`: 246 linhas de superfícies de cards/modais, layout das páginas,
  espaçamento das abas de análise, cabeçalhos e ícones SVG em máscaras CSS.
- Carrega após `navigation-and-account-summary.css`, antes de `styles.css`; regras responsivas permanecem no residual.
- Uso compartilhado entre páginas: manter carga global e ordem, inclusive pseudo-elementos e seletores por inline style.
- Teste integral de bytes em `tests/study-hub-styles.test.cjs`; runner visual do shell também captura máscaras,
  pseudo-elementos dos cards e as cinco abas de análise. Limites em [tooling](tooling.md).

## Botões e datas: estilos (G2c)

- `src/styles/page-actions.css`: 114 linhas de botões, variantes/tamanhos, opções de análise e intervalo de datas do diário.
- Carrega depois de `page-surfaces-and-headers.css`, antes do residual; media queries e complementos tardios mantêm a posição original.
- Uso global: shell, páginas, controles gerados e modais. Handlers e estado permanecem no legado.
- Runner shell verifica hover, foco, filtragem e limpeza pelos controles reais; opções nativas têm suas cores computadas amostradas.
- Teste integral de bytes permanece em `tests/study-hub-styles.test.cjs`; uso/limites em [tooling](tooling.md).

## Métricas e indicadores de risco: estilos (G2d)

- `src/styles/metric-cards-and-risk-insights.css`: 300 linhas de grids, cards, tooltips e indicadores comuns.
- Carrega após `page-actions.css`, antes do residual; responsividade em 1420/1080/720 permanece na posição original.
- Apresentação compartilhada em `src/styles`; cálculos e eventos continuam em `app.js`.
- Runner shell cobre tons safe/warn/danger, hover, pseudo-elementos e tooltip acima/abaixo/oculto.
- Cenários isolados: `scripts/lib/metric-style-scenarios.cjs`; contrato integral de bytes e limites visuais mantidos.

## Dashboard e layouts comuns de cards: estilos (G2e)

- `src/styles/dashboard-and-card-layout.css`: 161 linhas de grids, painéis, cabeçalhos, tabelas e containers de gráficos.
- Carrega após `metric-cards-and-risk-insights.css`, antes do residual; overrides responsivos mantêm sua posição original.
- Uso compartilhado entre páginas/modais em `src/styles`; Chart.js, renderers e handlers permanecem no legado.
- Runner shell acrescenta tabela inferior com rolagem horizontal e hover de card de gráfico.
- Cenários: `scripts/lib/dashboard-layout-scenarios.cjs`; fixture não produz overflow vertical, e sticky não tem consumidor encontrado.

## Contas: estilos de risco e caixa (G2f)

- `src/modules/accounts/presentation/account-risk-and-cashflow.css`: 322 linhas de risco, progresso, alertas, cálculo visual e caixa.
- Carrega após `dashboard-and-card-layout.css`, antes do residual; uso no dashboard, setup e editor de contas.
- Apresentação de contas com carga global; renderers, cálculos, handlers e persistência continuam em `app.js`.
- `scripts/lib/account-style-scenarios.cjs`: tons de risco, meta, caixa preenchido nos dois renderers e editor vazio.
- Cenários usam perfil isolado e restauram dados temporários; snapshots protegem storage e contas/trades em memória.
- Contrato integral de bytes mantido; regras sem consumidor encontrado preservadas e limites em [tooling](tooling.md).

## Analytics: ranking e comparação de estratégias (G2g)

- `src/modules/analytics/presentation/strategy-comparison.css`: 201 linhas de ranking, seletores e painel comparativo.
- Carrega após `account-risk-and-cashflow.css`, antes do residual; uso no dashboard, central de estratégias e aba de análise.
- Renderers: `renderStrategyRows`, `renderDashStrategyBoard`, `renderStrategyCompareCards`; eventos dos seletores continuam em `app.js`.
- Cenários isolados: `scripts/lib/strategy-style-scenarios.cjs`; ranking positivo/negativo/vazio, comparação completa e alternância de seleções.
- Overrides tardios e responsivos permanecem no residual. Contrato de bytes e limites em [tooling](tooling.md).

## Calendários: grids e células (G2h)

- `src/modules/calendar/presentation/calendar-grids.css`: 241 linhas do mini calendário, resumo semanal e layouts do calendário.
- Carrega após `strategy-comparison.css`, antes do residual; overrides 1080/720/440 mantêm sua posição original.
- Renderers em `app.js`: `renderDashboardCalendar`, `renderCalendar`; navegação e seleção preservadas.
- UI: `week` aparece como Mensal, `biweek` como Quinzenal; `month` permanece acessível pela API global.
- Cenários: `scripts/lib/calendar-style-scenarios.cjs`; modos, hover, rolagem, detalhes do dia, mudança de ano e mês bissexto.
- Resets de estado visual entre capturas, sem mudar contas/trades/storage; limites em [tooling](tooling.md).

## Tabelas e estados de operações (G2i)

- `src/modules/trades/presentation/trade-tables.css`: 148 linhas de tabelas, ordenação, seleção, badges e avisos de incompletos.
- Carrega globalmente após `calendar-grids.css`, antes do residual; `.tbl` e badges mantêm consumidores em outras páginas e no resumo da conta.
- Renderers e handlers continuam em `app.js`; nenhuma alteração de dados ou APIs.
- Cenários: `scripts/lib/trade-table-style-scenarios.cjs`; scroll, sticky, ordenação por P/L, seleção, hover/foco, vazio e flags de incompletude.
- Overrides tardios e responsivos preservados; limites em [tooling](tooling.md).

## Campos de formulário (G2j)

- `src/styles/form-fields.css`: 91 linhas de grids, labels, inputs, selects, textarea, unidades e hints.
- Carrega globalmente após `trade-tables.css`, antes do residual; consumidores incluem operações, simulação, contas, parceiros e StudyHub.
- Cenários: `scripts/lib/form-field-style-scenarios.cjs`; foco em texto/número/select/textarea, unidade, readonly e conteúdo multilinha.
- Overrides responsivos e específicos do StudyHub permanecem no residual ou nos arquivos tardios, na posição original.
- `.field-hint` não possui consumidor encontrado; regra preservada sem criar UI artificial.

## Modais e abas comuns (G2k)

- `src/styles/modal-and-tabs.css`: 80 linhas de overlay, estrutura dos modais e navegação por abas.
- Carrega globalmente após `form-fields.css`, antes do residual; quatro modais e treze botões de aba mantêm consumidores existentes.
- Cenários: `scripts/lib/modal-tab-style-scenarios.cjs`; scroll do modal de operação, footers, diálogo com input e abas de importação, calendário e StudyHub.
- A segunda regra de `.modal-footer` permanece separada e posterior, preservando bordas e alinhamento.
- Overrides responsivos e específicos do StudyHub permanecem tardios; limites em [tooling](tooling.md).

## Toolbar do calendário (G2l)

- `src/modules/calendar/presentation/calendar-toolbar.css`: 27 linhas do cabeçalho, seletor de mês e botões de modo.
- Carrega após `modal-and-tabs.css`, antes do residual; consumidor único em `#page-calendar`.
- Cenário dedicado em `scripts/lib/calendar-style-scenarios.cjs`: foco do picker e valores computados de controles/botões.
- `.gap-8` tardio mantém gap efetivo de 8px; dimensões e `!important` do bloco permanecem iguais.
- Demais estados e limites do calendário continuam em [tooling](tooling.md).

## Upload comum: estilos (G2m)

- `src/styles/upload-zone.css`: 41 linhas de zona, estados hover/drag, input oculto, ícone e textos.
- Carrega após `calendar-toolbar.css`, antes do residual; os overrides scoped do StudyHub permanecem tardios.
- Não há consumidor ativo confirmado das classes globais; `scripts/lib/upload-zone-style-scenarios.cjs` usa fixture descartável.
- Listeners globais de drag/drop, importadores e dados continuam inalterados em `app.js`.

## Seletor de emoções: estilos (G2n)

- `src/modules/trades/presentation/emotion-picker.css`: 29 linhas de grid, chips, seleção, emoji e rótulo.
- Carrega após `upload-zone.css`, antes do residual; não existem overrides posteriores encontrados.
- Não há consumidor ativo confirmado; `scripts/lib/emotion-picker-style-scenarios.cjs` usa fixture descartável.
- Estado `.selected` preservado; nenhuma lógica de operação ou configuração foi alterada.

## Tags e edição: estilos (G2o)

- `src/styles/tag-editor.css`: 79 linhas de listas, tags, contagem, botões e estados hover.
- Compartilhado entre Setup editável e nuvens somente leitura do Profile; carrega antes do residual.
- `scripts/lib/tag-editor-style-scenarios.cjs` usa renderizadores reais e uma fixture apenas para `.tag-add` sem consumidor.
- Edição, exclusão, configuração, dados e storage não são modificados pelos cenários.

## Alertas e utilitários: estilos (G2p)

- `src/styles/alerts-and-utilities.css`: 52 linhas de alertas, separador e utilitários flex/espaçamento/largura.
- Consumidores incluem Import, Setup, Trades e headers de Calendar/Stats/Premarket.
- `scripts/lib/alert-utility-style-scenarios.cjs` usa consumidores reais e fixture apenas para `.w-full`/warning isolado.
- Overrides responsivos e específicos de Import/StudyHub permanecem posteriores no residual ou scoped.

## Documentação sob demanda

- [Análise global de modularização](modularization-analysis.md): desenho atualizado dos cortes e estratégia para preservar código.
- Inventários de extração: [JavaScript](javascript-extraction-map.md), [CSS/cascata](css-extraction-map.md), [HTML/páginas](html-extraction-map.md).
- [Arquitetura atual](current-architecture.md): stack, números, hotspots e riscos.
- [Catálogo de módulos](module-map.md): entradas e dependências por feature.
- [Arquitetura alvo](target-architecture.md) e [dependências](dependency-rules.md): fronteiras novas.
- [Roadmap](refactoring-roadmap.md) e [progresso](refactoring-progress.md): próximo lote e validações.
- [ADRs](adr/): decisões; consultar somente a decisão relevante.

Não reescanear caches, dependências instaladas ou o repositório inteiro para tarefas locais.
