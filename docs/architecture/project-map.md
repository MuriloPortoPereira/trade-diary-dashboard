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
| Visual | `styles.css` e `src/modules/study-hub/presentation/*.css`; consultar o mapa CSS |

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
- `styles.css` mantém o prefixo original (4.879 linhas), incluindo StudyHub nativo e responsividade geral.
- Contrato de bytes/cascata: `tests/study-hub-styles.test.cjs`.
- Smoke: `scripts/browser-smoke.cjs`; comparação visual: `scripts/study-hub-style-check.cjs`.
- Fronteiras e próximos cortes: [mapa CSS](css-extraction-map.md); uso e limites: [tooling](tooling.md).

## Documentação sob demanda

- [Análise global de modularização](modularization-analysis.md): desenho atualizado dos cortes e estratégia para preservar código.
- Inventários de extração: [JavaScript](javascript-extraction-map.md), [CSS/cascata](css-extraction-map.md), [HTML/páginas](html-extraction-map.md).
- [Arquitetura atual](current-architecture.md): stack, números, hotspots e riscos.
- [Catálogo de módulos](module-map.md): entradas e dependências por feature.
- [Arquitetura alvo](target-architecture.md) e [dependências](dependency-rules.md): fronteiras novas.
- [Roadmap](refactoring-roadmap.md) e [progresso](refactoring-progress.md): próximo lote e validações.
- [ADRs](adr/): decisões; consultar somente a decisão relevante.

Não reescanear caches, dependências instaladas ou o repositório inteiro para tarefas locais.
