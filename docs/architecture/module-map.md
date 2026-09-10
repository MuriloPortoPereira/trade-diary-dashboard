# Mapa de módulos

Catálogo funcional da baseline `ab0cb63`. Os módulos são responsabilidades existentes dentro
de `app.js`, não diretórios já separados. Localizar símbolos com Serena antes de ler trechos.

| Feature | Entradas/símbolos | Dependências atuais |
|---|---|---|
| Shell/navegação | `showPage`, `refreshAll`, callback `window.load` | IDs `page-*`, funções globais, contas e estado |
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
- `styles.css`: classes/IDs de todas features e regras integradas do StudyHub.
- `window.sh_*`: ponte pública para funções privadas do IIFE legado.
- JSON de backup e chaves localStorage: contrato de dados existente.

## Primeira fronteira física planejada

| Arquivo planejado | Responsabilidade |
|---|---|
| `src/modules/simulation/domain/calculate-simulation-sizing.js` | Cálculo numérico puro; sem DOM, storage ou framework |
| `tests/simulation-sizing.test.cjs` | Caracterização dos valores/defaults e regressões do cálculo |

Na elaboração deste mapa esses dois arquivos ainda são planejados. Estado de entrega e
validações: [refactoring-progress.md](refactoring-progress.md). Camadas adicionais serão
criadas apenas quando uma extração real justificar sua existência.
