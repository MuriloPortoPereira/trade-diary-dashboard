# Project Map

Índice de navegação. Ler este mapa antes de procurar uma feature; buscar símbolos com Serena.
Fallback: `rg -n 'function NOME' app.js`; abrir apenas o trecho necessário.
HTML StudyHub: editar `src/modules/study-hub/presentation/templates/*.html`; não abrir integralmente o asset gerado `study-hub-template.js` para análise. Usar símbolos e trechos localizados nas fontes de autoria.
HTML das páginas: consultar `src/app/presentation/shell/index.fragments.json` para localizar a fonte na feature. Editar o fragmento e executar `node scripts/build-index.cjs`; `index.html` é a distribuição versionada.
Localização atual nas tabelas abaixo. Os nomes de testes preservam os cenários caracterizados antes das consolidações.

## Apresentação: onde editar agora

Caminhos abaixo relativos a `src/`. Um workspace reúne a UI da feature; as camadas numéricas e de IO permanecem separadas.

| Feature ou fluxo | Arquivo principal |
|---|---|
| Shell, navegação, topbar, modais e diálogos | `app/presentation/app-workspace.js` |
| Diário e editor de trades | `modules/trades/presentation/trade-log.js` e `trade-form.js` |
| Contas: painéis, formulários, risco e setup | `modules/accounts/presentation/accounts-workspace.js` |
| Dashboard, estatísticas e comparação de estratégias | `modules/analytics/presentation/analytics-workspace.js` |
| Importação, exportação e backup | `modules/data-transfer/presentation/data-transfer-page.js` |
| Calendário e mini calendário do dashboard | `modules/calendar/presentation/calendar-page.js` e `dashboard-calendar.js` |
| Psicologia e estatísticas subjetivas | `modules/psychology/presentation/psychology-page.js` |
| Documentos: consultas, edição e mídia | `modules/documents/presentation/documents-page.js` |
| Rotina, parceiros, perfil e notificações | Respectivo `modules/<feature>/presentation/*-page.js` |
| Idiomas | `modules/preferences/presentation/locales/pt-BR.js` e `en-US.js`; registro/seletor continuam próprios |
| Widgets analíticos compartilhados | `shared/presentation/analysis-widgets.js` |

## Regras, orquestração e IO

| Responsabilidade | Onde procurar em `src/modules/` |
|---|---|
| Cálculos financeiros e risco; consultas/normalização de contas | `accounts/domain/account-risk-calculations.js`; fluxo em `accounts/application/account-risk-workflows.js` |
| Sizing, expectativa e projeção | `simulation/domain/simulation-calculations.js`; UI em `simulation/presentation/simulation-panel.js` |
| Métricas comportamentais, financeiras e estratégias | `analytics/domain/calculate-trade-metrics.js`; queries em `analytics/application/strategy-analysis.js` |
| Importação/exportação: casos de uso | `data-transfer/application/transfer-workflows.js` |
| CSV, backup, normalização e parsing | `data-transfer/infrastructure/trade-file-formats.js` |
| Leitura de relatórios e download | `data-transfer/infrastructure/browser-file-io.js` |
| Regras de importação | `data-transfer/domain/import-trade-rules.js` |

48 scripts locais. Os namespaces/globals existentes foram preservados; não há módulos vazios de compatibilidade para os nomes antigos.

## CSS: onde editar agora

| Responsabilidade | Fonte |
|---|---|
| Fontes, tokens, shell, navegação e widgets do shell | `src/styles/app-shell.css` |
| Superfícies, cabeçalhos e ações das páginas | `src/styles/page-layout.css` |
| Cards, indicadores e layouts de análise | `src/styles/analysis-panels.css` |
| Campos, modais e controles de interação | `src/styles/workspace-controls.css` |
| Workspace de documentos completo | `src/modules/documents/presentation/documents.css` |
| Breakpoints comuns de desktop, tablet e mobile | `src/styles/responsive.css` |
| Integração tardia: diálogos, navegação e grids compartilhados | `src/styles/workspace-integration.css` |
| StudyHub legado: controles/sequência e painéis/integração | `src/modules/study-hub/presentation/legacy-controls.css` e `legacy-panels.css` |

22 folhas no total; estilos específicos restantes ficam junto das features. Ordem completa em `src/app/presentation/shell/open.html`; o histórico CSS está arquivado em `docs/archive/refactoring/css-extraction-map.md`.

## Shell e páginas: composição estática (G7b)

- Quinze views completas em `src/modules/<feature>/presentation/*.html`; abertura/navegação e fechamento/modais/scripts em `src/app/presentation/shell/{open,close}.html`.
- O manifesto ordenado é a fonte dos caminhos; não há fragmentação por campo ou widget nem montagem assíncrona.
- `node scripts/build-index.cjs --check` verifica sincronização sem escrever. Teste: `tests/index-composition.test.cjs`; decisão: [ADR-005](adr/005-static-shell-composition.md).
- A composição mantém os bytes das fontes, inclusive LF/CRLF mistos. Alterações autorizadas dos registros de assets são regeneradas no `index.html`; DOM/handlers e deploy sem build preservados.

## Integrações e estado

- `app.js`: estado único, inicializadores de adaptadores e wrappers públicos, incluindo `buildTradesCSV(list=trades)`; ver composição abaixo.
- `src/app/application/bootstrap-app.js` e `load-app-state.js`: bootstrap/carga. Persistência bruta em `src/app/infrastructure/app-state-storage.js`.
- Trades: workflows/amostras em `src/modules/trades/application/`; timing, mercado e normalização de mídia puros em `domain/trade-rules.js`.
- StudyHub: `presentation/study-hub-page.js`, quatro ferramentas privadas `study-hub-{propfirm,plan,tradesim,mental}.js`, runtime/intraday; domínio, estado e storage próprios.
- Câmbio: `src/modules/preferences/infrastructure/exchange-rate.js`.

## Composição final da versão básica

- `app.js` (181 linhas): estado/defaults, fábrica de timing, wrappers públicos de métricas/sizing/CSV/backup/parsing e chamadas dos inicializadores de tooltip e eventos. Bootstrap é registrado em `app/application/bootstrap-app.js`.
- Contas: consultas/normalização/cashflow em `accounts/application/account-risk-workflows.js`; formulário, formatação e modos em `accounts/presentation/accounts-workspace.js`.
- Trades: seeds/enriquecimento/resolução de conta em `trades/application/demo-data.js`; filtros e ordenação temporal em `trade-workflows.js`; datas/ordenação visual em `presentation/trade-log.js`.
- Configuração de estratégias em `app/application/load-app-state.js`; edição e consultas de período na UI de analytics.
- Psicologia: quatro agregações puras em `analytics/domain/calculate-trade-metrics.js`, wrappers em `psychology-page.js`; alertas/mensagens em `notifications-page.js`.
- Charts/formatadores/tooltips compartilhados em `shared/presentation/analysis-widgets.js`; topbar e atalhos/drag-drop em `app-workspace.js`. Os inicializadores continuam chamados nos pontos anteriores de `app.js`.
- Nenhum arquivo de produção adicional nesta conclusão; 48 scripts e 22 CSS. Limites aceitos da versão estática: [ADR-006](adr/006-basic-static-version-closure.md).
