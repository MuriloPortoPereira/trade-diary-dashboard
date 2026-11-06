# Project Map

Índice de navegação. Ler este mapa antes de procurar uma feature; buscar símbolos com Serena.
Fallback: `rg -n 'function NOME' app.js`; abrir apenas o trecho necessário.
HTML StudyHub: editar `src/modules/study-hub/presentation/templates/*.html`; não abrir integralmente o asset gerado `study-hub-template.js` para análise. Usar símbolos e trechos localizados nas fontes de autoria.
HTML das páginas: consultar `src/app/presentation/shell/index.fragments.json` para localizar a fonte na feature. Editar o fragmento e executar `node scripts/build-index.cjs`; `index.html` é a distribuição versionada.
Localização atual nas tabelas abaixo. Os nomes de testes preservam os cenários caracterizados antes das consolidações.

## Apresentação: onde editar agora

| Tela ou fluxo | Arquivo principal em `src/modules/` |
|---|---|
| Diário: linhas, métricas, seleção, filtros e bloqueios | `trades/presentation/trade-log.js` |
| Editor de trade: campos, erros e fluxo de incompletos | `trades/presentation/trade-form.js` |
| Formulário de conta, caixa e lista de gestão | `accounts/presentation/account-form.js` |
| Configuração de risco, resumos, caixa e tags | `accounts/presentation/risk-setup-page.js` |
| Dashboard e modo da curva | `analytics/presentation/dashboard-page.js` |
| Estatísticas: abas, filtros e análise de taxas | `analytics/presentation/statistics-page.js` |
| Ranking e comparação de estratégias | `analytics/presentation/strategy-comparison.js` |

Consolidação: 95 → 80 scripts locais; 75 funções preservadas. Domínio, aplicação e IO continuam separados da apresentação. Visões de contas, risk board e chrome compartilhado mantêm suas responsabilidades próprias.

## CSS: onde editar agora

| Responsabilidade | Fonte |
|---|---|
| Fontes, tokens, shell, navegação e widgets do shell | `src/styles/app-shell.css` |
| Superfícies, cabeçalhos e ações das páginas | `src/styles/page-layout.css` |
| Cards, indicadores e layouts de análise | `src/styles/analysis-panels.css` |
| Campos, modais e controles de interação | `src/styles/workspace-controls.css` |
| Workspace de documentos completo | `src/modules/documents/presentation/documents.css` |
| Breakpoints comuns de desktop, tablet e mobile | `src/styles/responsive.css` |

26 folhas no total; estilos específicos restantes ficam junto das features. Ordem completa em `src/app/presentation/shell/open.html`; mapa CSS distingue autoria atual de intervalos históricos.

## Shell e páginas: composição estática (G7b)

- Quinze views completas em `src/modules/<feature>/presentation/*.html`; abertura/navegação e fechamento/modais/scripts em `src/app/presentation/shell/{open,close}.html`.
- O manifesto ordenado é a fonte dos caminhos; não há fragmentação por campo ou widget nem montagem assíncrona.
- `node scripts/build-index.cjs --check` verifica sincronização sem escrever. Teste: `tests/index-composition.test.cjs`; decisão: [ADR-005](adr/005-static-shell-composition.md).
- A composição mantém os bytes das fontes, inclusive LF/CRLF mistos. Alterações autorizadas dos registros de assets são regeneradas no `index.html`; DOM/handlers e deploy sem build preservados.

## Localização por responsabilidade

| Trabalho | Procurar primeiro |
|---|---|
| Inicialização/navegação | `src/app/application/bootstrap-app.js`; `src/app/presentation/navigation.js`: `showPage`, `refreshAll`, `toggleSidebar`; `index.html` |
| Operação/diário | `src/modules/trades/application/trade-workflows.js`; `renderLog` e `tradeRow` em `src/modules/trades/presentation/trade-log.js` |
| Edição/bloqueios do diário | `trades/presentation/trade-form.js`: editor e fluxo em lote; `trade-log.js`: diário, controles, locks e aviso somente leitura |
| Dados demonstrativos | `src/modules/trades/application/demo-data.js`: seis APIs globais para gerar e carregar amostras e importação Tickmill |
| Conta/saldo/risco | `accounts/application/account-risk-workflows.js`: workflows; `presentation/account-form.js`: gestão; `risk-setup-page.js`: setup completo; `normalizeAccount` permanece em `app.js` |
| Dashboard/estratégia | `src/modules/analytics/application/strategy-analysis.js`: snapshots, equity, resultados e comparação; `calcMetrics` em `app.js`; apresentação em `dashboard-page.js`/`strategy-hub-page.js` |
| Análises/calendário | `src/modules/analytics/presentation/statistics-page.js`: `renderStats`; `renderStatsPsych` em `src/modules/psychology/presentation/psychology-statistics.js`; calendário em `src/modules/calendar/presentation/calendar-page.js` |
| Rotina | `src/modules/routine/presentation/premarket-page.js`: página, navegação mensal, hábitos, disciplina e correlação; `preMarketData` permanece na composição |
| Importação/exportação | `src/modules/data-transfer/infrastructure/parse-tabular-trades.js`; `buildTradesCSV`, `restoreBackupData` |
| Simulação | `domain/calculate-simulation-{sizing,projection}.js`: cálculos numéricos; `presentation/simulation-panel.js`: defaults, snapshot, plano formatado, campos e gráficos; wrappers sizing/Monte Carlo em `app.js` |
| StudyHub | `src/modules/study-hub/presentation/study-hub-page.js`: página nativa; `presentation/study-hub-{propfirm,plan,tradesim,mental}.js`: ferramentas privadas; `presentation/study-hub-legacy-runtime.js`: montagem/pontes; `domain/study-hub-calculations.js`: regras puras; `infrastructure/study-hub-storage.js`: chaves privadas |
| Intraday | `src/modules/study-hub/presentation/study-hub-intraday.js`: `studyHubBuildIntradayRows`, `studyHubEnhanceIntradayImpact` |
| Documentos | `src/modules/documents/presentation/documents-page.js`: workspace, consultas, seleção, CRUD e mídia; `document-rendering-helpers.js`: formatação e imagens |
| Parceiros | `src/modules/partners/presentation/partners-page.js`: página, configuração, afiliados, clipboard e QR; controller clássico coeso |
| Notificações | `src/modules/notifications/presentation/notifications-page.js`: `renderNotificationsPage`; `buildOperationalAlerts` em `app.js` |
| Perfil | `src/modules/profile/presentation/profile-page.js`: `renderProfilePage` |
| Persistência/configuração | `src/app/infrastructure/app-state-storage.js`: `save`/leitura; `src/app/application/load-app-state.js`: `load`; `saveConfig` em `app.js` |
| Idioma/câmbio | `src/modules/preferences/presentation/`; `src/modules/preferences/infrastructure/exchange-rate.js` |
| Visual | `src/styles/`, CSS de preferências/StudyHub e arquivos responsivos; consultar o mapa CSS |

## Resíduos de app.js após G7j

- Composição: estado global, inicializadores de adaptadores, listeners transversais e wrappers ativos; manter enquanto houver consumidores.
- Demonstrações/importação: `createSeededRandom`, enriquecimento de disciplina/confiança/timing e resolução de contas (`ensureAccountByName`, `ensureTickmillAccount`).
- Consultas/normalização de contas e datas/filtros do diário; `normalizeAccount`, capital/cashflows, ordenação e range de datas.
- Apresentação comum: charts/datasets, formatadores, `TIPS`/tooltips, densidade/topbar e rótulos de risco; sem divisão por função.
- Estatísticas de psicologia e alertas: `buildHesitationStats`, `buildDisciplineBuckets`, `buildOperationalAlerts`. Caracterizar antes de escolher entradas explícitas e destino.

Histórico detalhado e resultados por lote: [mapa de módulos](module-map.md#histórico-detalhado-de-extrações-por-lote).
