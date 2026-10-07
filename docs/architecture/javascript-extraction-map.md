# Mapa de extração do JavaScript

Análise de 2026-09-11 sobre `5c9859f`; intervalos base 1 de `app.js` antes dos próximos cortes.
Serena fornece linhas base zero; localizar pelo símbolo após qualquer movimentação.
O overview do nível superior lista 383 funções, 32 variáveis e 20 constantes; não inclui todas
as funções privadas dos IIFEs. O arquivo contém 9.770 linhas, sendo 2.696 no bloco StudyHub final.

`renderStatusList` (G3q) foi movida intacta para `src/shared/presentation/status-list.js`:
reuso real entre notificações, perfil, estratégias e StudyHub. Interpolações
legadas e contrato global foram preservados.

`renderAnalysisSummary` (G3r) foi movida intacta para
`src/shared/presentation/analysis-summary.js`: reuso real entre comparação de
estratégias e psicologia. Produtores e cálculos permanecem nas features.

`renderDocumentMedia` (G3s) foi movida intacta para
`src/modules/documents/presentation/document-media.js`: o renderer continua
global para `documents-page.js`; leitura, remoção e persistência seguem no legado.

## Fronteiras por responsabilidade

Destinos abaixo são propostas relativas a `src/`. Os arquivos não devem ser criados vazios.
Funções que ainda misturam UI/estado/IO permanecem como apresentação legada ou em `legacy` temporário;
somente depois da caracterização suas regras entram em `domain`.

| Área / localização | Arquivos coesos propostos | Dependências e preservação |
|---|---|---|
| Estado, shell e bootstrap; início do arquivo, `showPage`, `refreshAll`, load 6954–7017 | `app/bootstrap.js`, `app/presentation/navigation.js`, `app/presentation/account-summary.js`, `app/presentation/app-dialog.js` | Estado único de trades/contas/config; ordem load, seed, renderização, listeners, traduções e câmbio |
| Contas: 37–92, cashflows 1426–1483, gestão 4441–4629, overview 6181–6226; renderer G3c executado | `modules/accounts/presentation/accounts-page.js`; demais destinos propostos: `{account-form,account-list,account-cashflow-form}.js` | Renderer global movido intacto; conta ativa, normalização, formulário, persistência e atualização das demais páginas seguem no legado |
| Risco: `calcAccountRiskState` 1485–1670; board 1878–2024; setup 6704–6877; renderer G3n executado | `modules/accounts/presentation/risk-board.js`; destinos ainda propostos: `risk-setup-page.js`, depois `domain/{calculate-cashflow-totals,calculate-account-risk}.js` | Renderer global movido intacto; relógio, ciclos, depósitos/retiradas, config e cálculo permanecem no legado; não extrair como domínio em bloco |
| Operação: modal 464–579, conta 642–739, formulário 924–1239, imagens 4176–4191 | `modules/trades/presentation/{trade-form,incomplete-trade-flow,trade-images}.js`; depois `application/save-trade.js` | editingId, erros/imagens, conta/risco, globals t-*, save e refreshAll; `saveTrade` 1124–1239 |
| Diário: 2617–2953 | `modules/trades/presentation/{trade-log,trade-log-selection}.js`; `domain/log-date-range.js` | Filtros, ordenação, seleção, conta, duplicação, duas confirmações de exclusão |
| Timing: 272–373 | `modules/trades/domain/trade-timing.js`, após entradas explícitas | Normalizadores de data/horário compartilhados com importação; preservar virada de dia e inválidos |
| Métricas: `calcMetrics` 1344–1394; `filterByPeriod` 1396–1403 | `modules/analytics/domain/calculate-trade-metrics.js`; wrapper `calcMetrics`; filtro só após receber data explícita | Resolver conta/capital no legado; núcleo recebe dados e saldo inicial; não mudar ordem da série; filtro atual consulta relógio |
| Estratégias: 2026–2468, hub 4800–4894; renderers G3f/G3l executados | `modules/analytics/presentation/{strategy-hub-page,strategy-rows}.js`; demais destinos propostos: `strategy-comparison.js`, depois `domain/{strategy-snapshots,strategy-outcomes,strategy-comparison-scores}.js` | Renderers globais movidos intactos; métricas, ranking, empates, filtros, cores e helpers seguem no legado |
| Dashboard: 2470–2615; análises 3099–3303; renderer G3m executado | `modules/analytics/presentation/dashboard-page.js`; destinos ainda propostos: `{stats-page,chart-renderer}.js` | Renderer global movido intacto; Chart.js, CHART_OPTS, datasets, métricas, traduções e seleção preservados; renderer comum apenas onde já compartilhado |
| Stops/taxas: helper 1756–1763, `buildStopFeeAnalysis` 1765–1824, renderer 1826–1876; G3j executado | `modules/analytics/presentation/stop-fee-analysis.js`; destino ainda proposto: `domain/stop-fee-analysis.js`, após limites explícitos | Renderer global movido intacto; cálculo depende do risco da conta e permanece no legado |
| Psicologia: 3305–3413 e 4637–4669; renderers G3g/G3p executados | `modules/psychology/presentation/{psychology-page,psychology-statistics}.js`; destinos ainda propostos: `domain/{hesitation-statistics,discipline-buckets}.js` | Renderers globais movidos intactos; helpers de seleção e estatística seguem no legado; cálculos locais do renderer foram movidos intactos |
| Calendário: 2956–3097; mini 2470–2525; G3i/G3k/G3o executados | `modules/calendar/presentation/{calendar-page,dashboard-calendar,calendar-controls}.js` | Renderers/handlers globais movidos intactos; calMonth/calYear/calViewMode, conta, métricas, tradução e helpers de datas seguem no legado |
| Rotina: 3703–3885; renderer G3e executado | `modules/routine/presentation/premarket-page.js`; demais destinos propostos: `{habit-manager,routine-charts}.js` | Renderer global movido intacto; preMarketData, índices dos hábitos, médias, autosave e conta ativa seguem no legado |
| Simulação: 3416–3682 | `modules/simulation/presentation/{simulation-form,simulation-panel,simulation-plan-summary}.js`; depois `domain/project-balance-scenarios.js` | Sizing já extraído; snapshot depende de conta/risco/métricas; projeção depende de aleatoriedade |
| Importação: 375–425, 740–922, 3887–4124 e 4379–4439 | `modules/data-transfer/infrastructure/{parse-mt-report,parse-generic-trade-rows,split-delimited-rows,load-spreadsheet-reader}.js`; `application/import-trades.js`; `presentation/import-confirmation.js` | Parsing também gera IDs/datas e consulta trades; isolar dependências antes de chamar parser puro |
| Backup/exportação: 4193–4377; demos 6458–6702 | `modules/data-transfer/application/{restore-backup,sample-data}.js`; `infrastructure/download-text-file.js`; `presentation/import-export-page.js` | Backup v2, restauração parcial, formatos, FileReader/Blob e seed; CSV já extraído |
| Documentos: 5653–6170; renderers G3d/G3s executados | `modules/documents/presentation/{documents-page,document-media}.js`; demais destinos propostos: `{document-editor,document-browser}.js`, `application/{get-document-entries,save-document,delete-document}.js` | Renderers globais movidos intactos; helpers, seleção, fachada sobre trades/rotina/config.generalDocs e persistência seguem no legado |
| Imagens: `normalizeDocImages` 5653–5658 | `modules/documents/domain/normalize-document-images.js` | Reuso real por documentos/trades/importação; preservar formatos aceitos e descarte atual de campos extras |
| Parceiros: normalização 94–122, UI 6228–6340; renderer G3b executado | `modules/partners/presentation/partners-page.js`; demais destinos propostos: `{partner-media,partner-clipboard}.js` | Renderer global movido intacto; config.partnerHub, IDs, FileReader, clipboard e save permanecem no legado |
| Perfil: 6342–6389, G3a executado | `modules/profile/presentation/profile-page.js` | Renderer movido intacto; projeção de conta, métricas e risco usa globals legados; não existe autenticação |
| Alertas 4693–4798; notificações 6172–6179; renderer G3h executado | `modules/notifications/presentation/notifications-page.js`; destino ainda proposto: `operational-alerts.js` | Renderer global movido intacto; regras, mensagens, datas e callbacks em strings seguem no legado; separar decisão de apresentação antes de domínio |
| Configuração: estratégias 4126–4174, setup 6704–6914 | `modules/preferences/presentation/tag-library.js`; UI de risco em accounts | Estratégias/emotions/markets e config; preview já modifica estado antes de persistir |
| Persistência: `save` 6916–6923, `load` 6934–6952 | `app/infrastructure/local-storage-snapshot.js`, `app/application/load-state.js` | Snapshot transversal de seis chaves tl_*; ordem, normalização, recomputação e catch existentes |
| Câmbio: 7024–7073 | `modules/preferences/presentation/exchange-rate-controls.js`; depois `infrastructure/fetch-usd-brl.js` | appCotacao, AwesomeAPI, polling, DOM e ponte StudyHub; não unificar as cotações legadas no mesmo lote |
| Idiomas, sizing e CSV extraídos | Manter caminhos do [project-map](project-map.md) | Dez arquivos atuais, protegidos por testes; incorporar à lista de carga, sem refazer extrações |

Os nomes indicam responsabilidade, não promessa de que cada intervalo cabe em um único arquivo.
Por exemplo, formulário de trades e comparação de estratégias exigem helpers coesos próprios;
não transferir centenas de linhas mistas para um novo monólito por página.

## Comportamentos a caracterizar, sem corrigir no refactor

- `getActiveAccount` normaliza e substitui contas; não é consulta pura. Cashflow gera ID/data.
- Conta default pode aceitar trades sem accountId; preservar conversão futures_usd para cfd_pct e defaults `||`/`??`.
- `calcMetrics` usa a ordem invertida recebida; ordenar por data mudaria drawdown/streaks. Cobrir OPEN/BE, vazio e Infinity.
- Risco usa períodos locais/UTC, ciclos e strings fR/f2. Cobrir dias-limite, aportes/retiradas e retorno completo.
- `saveTrade` recalcula r/status quando entrada/stop/saída existem; parsing pode transformar zero em null.
- Duplicação remove positionId, normaliza imagens e usa ID/relógio. Exclusão tem dois passos; não abreviar.
- `averageMinutes` converte null em zero. Hesitação, rotina e resultados mensais usam denominadores distintos.
- Hábitos persistem por índice. `savePM` é noop de compatibilidade; não remover sem revisar consumidores.
- Monte Carlo usa Math.random; probPositive/probGoal/probStop são contagens. Alvo/stop classificam o final, não interrompem trajetórias.
- Importadores geram IDs/datas; MT5 consulta posições globais, confirmação deduplica conta+posição e agenda edição após 600ms.
- CSV de entrada tem split simples e limitações existentes. Não substituir por parser diferente sob pretexto de extração.
- Backup reúne seis estados; restauração parcial preserva campos ausentes e mescla config. Manter permissividade e falhas existentes.
- Documentos representam três origens; excluir anotação de trade não deve excluir a operação.
- Alertas têm ordem e actionFn em strings; preservar roteamento. Perfil continua sem autenticação.

## StudyHub: fronteira separada de maior risco

| Bloco atual | Destino inicial proposto | Condição |
|---|---|---|
| Montagem 7075–7082; template na linha 7080 | `modules/study-hub/legacy/mount-legacy-template.js` | Preservar texto, host.innerHTML e dataset.loaded; a linha gigante continua exceção temporária, não solução final |
| IIFE legado 7084–9461 | `modules/study-hub/legacy/integrated-runtime.js` | Mover intacto primeiro, preservando closure e registro dos callbacks; exceção >1.000 linhas até submódulos |
| Intraday 9465–9770 | `modules/study-hub/presentation/intraday-impact.js` | IIFE e wrappers sh_buildIntraday/sh_tsRunAll intactos, carregados depois do runtime legado |
| Integração nativa, símbolos buildStudyHub*/renderStudy*/syncStudyHubLegacyInputs, `renderStudyHub` 5616–5651 | `modules/study-hub/presentation/{study-hub-page,legacy-input-sync,propfirm-panel,plan-panel,simulation-panel,mental-panel}.js` | Estado studyHubState, risco/conta, IDs e pontes window.sh_* |

O runtime contém shell/cotação 7084–7163; propfirm 7165–7887; plano 7889–8279;
sequências tradesim 8282–8905; mental/recuperação 8908–9336; tooltips e exportações até 9461.
Esses intervalos são referências de investigação interna, não pontos para quebrar a closure automaticamente.

Após isolar o bundle, caracterizar e separar cada ferramenta, começando por suas regras puras e
adaptadores de estado. Não expor seus nomes privados como globais: há nomes comuns com o app principal.
Manter chaves pfCot, pfState, cot, hubCiclos e diary2026; não unificar com tl_* ou appCotacao incidentalmente.

`shSafe` captura exceções e usa console.error. O smoke atual de window.error/unhandledrejection
não detecta todas essas falhas. Antes desse lote, observar console e resultados das quatro ferramentas;
usar RNG/relógio determinísticos e verificar callbacks, resize, charts, wrappers e montagem única.

## Sequência transversal

1. Fixar o comportamento atual do fluxo a mover, inclusive fixtures de dados e chamadas públicas.
2. Mover declaração/bloco exato com contrato de carregamento explícito; não mover efeitos top-level junto sem verificar ordem.
3. Exercitar consumidores de outras páginas: conta/risco, métricas, documentos e exportação têm uso transversal.
4. Extrair domínio somente quando dados, relógio e aleatoriedade puderem ser fornecidos explicitamente.
5. Isolar IO e casos de uso com parâmetros/contratos concretos; sem containers, buses ou repositórios genéricos.
6. Revisar compatibilidade, registrar limites e encerrar um lote funcional antes do seguinte.

Não é necessário criar um arquivo JS para cada função. O objetivo é agrupar mudanças que pertencem
à mesma responsabilidade e evitar duplicação entre páginas que consomem as mesmas regras.
