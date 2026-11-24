# Testes e Verificação Visual

Esta pasta concentra toda a suíte de testes automatizados e os scripts de verificação no navegador da versão modularizada sem frameworks (`index.html`, `app.js` e `src/`).

- **103 arquivos de teste** organizados em 12 pastas por domínio/funcionalidade (**637 casos de teste** executados via `node:test`).
- **27 arquivos de verificação visual e smoke no navegador** organizados em `tests/browser/`.

## Como executar

Requisito: **Node.js 20+** (testado em Node.js 24).

```bash
# Executar toda a suíte (103 arquivos / 637 testes)
node --test

# Executar apenas uma área específica
node --test tests/accounts/*.test.cjs
node --test tests/trades/*.test.cjs
node --test tests/data-transfer/*.test.cjs

# Executar um único arquivo de teste
node --test tests/study-hub/study-hub-daily-stop.test.cjs
```

Para os scripts de navegador em `tests/browser/` (requer navegador baseado em Chromium e Python 3 para comparação de capturas):

```bash
# Smoke test geral das páginas e fluxos no navegador
node tests/browser/browser-smoke.cjs

# Captura e comparação de estilos/screenshots do shell principal
node tests/browser/shell-style-check.cjs capture /tmp/before
node tests/browser/shell-style-check.cjs compare /tmp/before /tmp/after

# Captura e comparação de estilos/screenshots do Study Hub
node tests/browser/study-hub-style-check.cjs capture /tmp/sh-before
node tests/browser/study-hub-style-check.cjs compare /tmp/sh-before /tmp/sh-after
```

## Estrutura de pastas

| Pasta | Arquivos | Responsabilidade |
| --- | ---: | --- |
| `tests/app/` | 10 | Shell da aplicação, inicialização (bootstrap), persistência em `localStorage`, navegação, modais, topbar e contratos de scripts clássicos. |
| `tests/accounts/` | 19 | Contas de trading, saldo, drawdown, limites de risco, metas por ciclo, fluxo de caixa (aportes/saques) e tela de Risco & Setup. |
| `tests/trades/` | 18 | Formulário de operações, log de trades, filtros, ordenação, seleção em lote, métricas de trade, duração, imagens, erros e fluxo de incompletos. |
| `tests/data-transfer/` | 14 | Importação de relatórios (CSV, HTML MT4/MT5, XLSX), normalização tabular, exportação CSV e backup/restauração JSON. |
| `tests/analytics/` | 16 | Dashboard, estatísticas gerais, comparador e ranking de estratégias, análise de stop/taxas e psicologia comportamental. |
| `tests/calendar/` | 2 | Calendário de resultados (visões mensal, semanal e quinzenal) e navegação entre períodos. |
| `tests/routine/` | 2 | Rotina pré-mercado, grade mensal de hábitos e correlação de disciplina com P/L. |
| `tests/documents/` | 4 | Documentos gerais, notas diárias, notas de trades, mídia/anexos e ícones de pastas. |
| `tests/study-hub/` | 7 | Study Hub integrado: PropFirm, Plano de Trade, Trade Simulator, stop diário, storage isolado e integridade da cascata CSS. |
| `tests/simulation/` | 4 | Simulador de resultados (Monte Carlo), projeção de metas e dimensionamento de risco. |
| `tests/preferences/` | 2 | Catálogos de tradução (PT-BR / EN-US), seletor de idioma e cotação USD/BRL. |
| `tests/workspace/` | 5 | Notificações/alertas, central de parceiros/afiliados, perfil operacional e gerador de dados de demonstração. |
| `tests/browser/` | 27 | Scripts de smoke test no navegador, comparação visual por screenshot/pixels, helper de browser e 22 cenários de estilo. |

---

## Catálogo completo dos testes

### `tests/app/` — Shell, bootstrap, storage e navegação (10 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `app-bootstrap.test.cjs` | Fluxo de inicialização (`load`), semeadura de conta/documentos padrão, normalização de estado e ordem de renderização. |
| `app-dialog.test.cjs` | Diálogos modais de alerta, confirmação e prompt da aplicação. |
| `app-state-storage.test.cjs` | Leitura, serialização, gravação e recuperação das chaves de estado em `localStorage`. |
| `classic-script-contract.test.cjs` | Contrato de carregamento síncrono e ordem dos scripts clássicos declarados em `index.html`. |
| `modal-controller.test.cjs` | Abertura, fechamento, foco e controle de estado dos modais globais. |
| `navigation.test.cjs` | Troca de páginas (`showPage`), estado ativo da barra lateral e menu responsivo. |
| `shell-widgets-characterization.test.cjs` | Comportamento integrado dos widgets da casca da aplicação (topbar, sidebar e densidade). |
| `topbar-statistics.test.cjs` | Cálculo e exibição das estatísticas resumidas na barra lateral/superior (semana, mês, DD e meta). |
| `topbar-value.test.cjs` | Formatação de valores monetários, percentuais e sinais exibidos na barra superior. |
| `workspace-queries-characterization.test.cjs` | Consultas compartilhadas do workspace: ordenação, filtros de período, estratégias, mídia e recálculo de incompletos. |

### `tests/accounts/` — Contas, risco, caixa e setup (19 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `account-balance-chrome.test.cjs` | Atualização visual do saldo, variação de retorno e contagem de trades da conta ativa. |
| `account-balance-drawdown.test.cjs` | Cálculo de saldo corrente, pico de capital e drawdown absoluto/percentual. |
| `account-cashflow-form.test.cjs` | Renderização e validação do formulário de aportes e retiradas na conta. |
| `account-cashflow.test.cjs` | Regras de domínio do fluxo de caixa (totais de depósitos, saques e capital ajustado). |
| `account-form.test.cjs` | Criação, edição, clonagem de fluxo de caixa e validação do formulário de conta. |
| `account-goal-cycle.test.cjs` | Progresso de metas por ciclo, avanço de ciclo e base de capital com aportes. |
| `account-list.test.cjs` | Listagem de contas, ordenação e proteção contra exclusão da última conta. |
| `account-risk-limits.test.cjs` | Limites de perda diária, semanal, mensal e drawdown total, incluindo consumo e excesso. |
| `account-risk-period-pnl.test.cjs` | Agrupamento de P/L por fronteiras de dia, semana (domingo a sábado), mês e ano. |
| `account-risk-workflows.test.cjs` | Composição completa do workflow de risco de conta e análise de violações de stop/taxas. |
| `account-setup-controls.test.cjs` | Seleção de conta ativa, salvamento, exclusão e propagação de efeitos na interface. |
| `account-state-characterization.test.cjs` | Normalização de registros de conta, preservação de campos desconhecidos e tipos legados. |
| `account-summary.test.cjs` | Resumo da conta exibido na barra superior (`acct-pill`) e tratamento quando ausente. |
| `accounts-page.test.cjs` | Renderização completa da página de Contas (cards, capital consolidado e barras de risco). |
| `risk-board.test.cjs` | Painel de Centro de Risco no Dashboard (mini-estatísticas, barras de progresso e sinais). |
| `risk-setup-page.test.cjs` | Página de Risco & Setup, precedência de parâmetros da conta e preenchimento de campos. |
| `risk-tags.test.cjs` | Editor de listas operacionais (estratégias, emoções e mercados) em Risco & Setup. |
| `setup-cashflow-list.test.cjs` | Lista de movimentações de caixa exibida na tela de configuração de conta. |
| `setup-risk-summary.test.cjs` | Resumo calculado de risco, limites e exposição exibido em Risco & Setup. |

### `tests/trades/` — Operações, formulário, log e incompletos (18 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `incomplete-trade-banner.test.cjs` | Banner de aviso de operações importadas com campos pendentes. |
| `incomplete-trade-flow.test.cjs` | Fluxo guiado de revisão e conclusão sequencial de trades incompletos. |
| `trade-duration-field.test.cjs` | Cálculo e exibição do campo de duração da operação no formulário. |
| `trade-edit-controls.test.cjs` | Travas de edição somente-leitura, filtros padrão e rótulos de conta no diário de trades. |
| `trade-error-chips.test.cjs` | Chips selecionáveis de erros de execução no formulário de trade. |
| `trade-form-account-context.test.cjs` | Projeção automática de risco, multiplicador e modo de entrada conforme a conta selecionada. |
| `trade-form-options.test.cjs` | Preenchimento dos selects do formulário (estratégias, emoções, mercados e conta ativa). |
| `trade-form.test.cjs` | Cálculo automático de escore de disciplina, guarda de edição manual e regras do formulário. |
| `trade-images.test.cjs` | Pré-visualização, adição e remoção de imagens anexadas a uma operação. |
| `trade-log-controls.test.cjs` | Ordenação por colunas, indicadores visuais de direção e controles da tabela de trades. |
| `trade-log-metrics.test.cjs` | Resumo numérico da seleção filtrada exibido no topo da tabela de trades. |
| `trade-log-page.test.cjs` | Renderização completa da página de Trades e integração dos subcomponentes. |
| `trade-log-read-only-notice.test.cjs` | Aviso exibido quando o filtro consulta outra conta ou todas as contas em modo leitura. |
| `trade-log-selection.test.cjs` | Seleção múltipla por checkbox e barra de ações em lote (editar, duplicar, excluir). |
| `trade-metrics.test.cjs` | Fórmulas centrais de métricas de trades (win rate, profit factor, expectância, Sharpe, Sortino, Calmar, drawdown). |
| `trade-plan-deviation.test.cjs` | Regras de exibição e registro de desvio de plano no formulário de trade. |
| `trade-timing.test.cjs` | Normalização de horários, cálculo de duração com virada de dia e estatísticas por horário. |
| `trade-workflows.test.cjs` | Fluxos completos de salvar (`saveTrade`), editar, duplicar e excluir operações com dupla confirmação. |

### `tests/data-transfer/` — Importação, exportação e backup (14 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `backup-format.test.cjs` | Estrutura e contrato do arquivo de backup JSON v2 com as coleções do diário. |
| `backup-payload.test.cjs` | Montagem do payload de exportação de backup sem mutar o estado em memória. |
| `backup-summary.test.cjs` | Resumo de contagens e coleções exibido antes de restaurar um backup JSON. |
| `export-account-filter.test.cjs` | Seleção de conta e período ao exportar operações em CSV. |
| `export-downloads.test.cjs` | Geração de arquivos para download (JSON e CSV), nomes de arquivo e MIME types. |
| `import-preparation.test.cjs` | Preparação da prévia de importação, deduplicação e detecção de campos faltantes. |
| `import-tabs.test.cjs` | Alternância entre abas de importação de relatórios e exportação/backup. |
| `import-workflow.test.cjs` | Fluxo completo de importação: seleção de arquivo, prévia, confirmação e atualização da conta. |
| `normalize-tabular-values.test.cjs` | Normalização de datas, números, direção, símbolos e valores localizados de planilhas. |
| `parse-tabular-trades.test.cjs` | Interpretação de relatórios tabulares de MetaTrader (MT4/MT5), CSV próprio e planilhas. |
| `restore-backup.test.cjs` | Validação e aplicação de restauração de backup preservando coleções e integridade. |
| `split-delimited-rows.test.cjs` | Parser de linhas CSV/TSV com aspas, vírgulas, ponto e vírgula e quebras de linha internas. |
| `trade-report-import.test.cjs` | Leitores de arquivos HTML (MetaTrader) e XLSX (planilhas Excel) e tratamento de erros. |
| `trades-csv.test.cjs` | Serializador CSV de trades (escapamento de aspas, listas, ordem de colunas e compatibilidade). |

### `tests/analytics/` — Dashboard, estatísticas, estratégias e psicologia (16 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `analysis-summary.test.cjs` | Renderização de cartões de resumo analítico, tons semânticos e escape de texto. |
| `behavioral-insights-characterization.test.cjs` | Métricas comportamentais (hesitação, disciplina e adesão ao plano). |
| `dashboard-calendar.test.cjs` | Mini-calendário mensal exibido no Dashboard, incluindo anos bissextos e resultados diários. |
| `dashboard-equity-mode.test.cjs` | Alternância da curva de equity no Dashboard entre valor absoluto ($) e retorno (%). |
| `dashboard-page.test.cjs` | Composição da página do Dashboard: filtro de período, KPIs, gráficos e tabela de trades recentes. |
| `psychology-page.test.cjs` | Página de Psicologia: resumos emocionais, faixas de disciplina, gráficos e tabela de erros. |
| `psychology-statistics.test.cjs` | Cálculos estatísticos de psicologia sobre operações fechadas e identificadores dos gráficos. |
| `statistics-filters.test.cjs` | Filtros de conta e período (inclusive intervalo personalizado) na página de Análises. |
| `statistics-page.test.cjs` | Renderização principal da página de Estatísticas/Análises e suas métricas detalhadas. |
| `statistics-tabs.test.cjs` | Troca entre as sub-abas de Análises (Visão Geral, Estratégia, Tempo e Psicologia). |
| `status-list.test.cjs` | Componente de lista de status/indicadores com mensagens padrão e personalizadas. |
| `stop-fee-analysis.test.cjs` | Análise de taxas pagas e operações que excederam o risco/stop planejado. |
| `strategy-analysis.test.cjs` | Cálculos de desempenho agrupado por estratégia, filtragem finita e formatação de ratios. |
| `strategy-comparison.test.cjs` | Tabela comparativa lado a lado entre duas estratégias (A vs B). |
| `strategy-hub-page.test.cjs` | Página de Estratégias: destaque do setup líder, setup mais fraco e contagem positiva. |
| `strategy-rows.test.cjs` | Linhas do ranking de estratégias usadas no Radar do Dashboard e na página de Estratégias. |

### `tests/calendar/` — Calendário de resultados (2 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `calendar-controls.test.cjs` | Navegação entre meses, seleção de visão (semanal/mensal/quinzenal) e sincronização de picker. |
| `calendar-page.test.cjs` | Grade de dias, totais por semana/quinzena e detalhamento das operações de um dia selecionado. |

### `tests/routine/` — Rotina pré-mercado (2 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `premarket-controls.test.cjs` | Navegação mensal da rotina (inclusive virada de ano), cadastro, reordenação e marcação de hábitos. |
| `premarket-page.test.cjs` | Renderização da grade mensal de hábitos, gráfico de disciplina e correlação com P/L por sessão. |

### `tests/documents/` — Documentos e anotações (4 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `document-folder-icon.test.cjs` | Contrato visual e SVG acessível dos ícones de pastas da central de documentos. |
| `document-media.test.cjs` | Exibição de anexos de imagem e estados vazios distintos entre notas de trades e documentos. |
| `document-workflows.test.cjs` | Consultas das três fontes (documentos gerais, notas do dia e notas de trades), busca e ordenação. |
| `documents-page.test.cjs` | Página de Documentos: navegação de pastas, seleção de nota e editor com formatação/anexos. |

### `tests/study-hub/` — Study Hub integrado (7 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `study-hub-daily-stop.test.cjs` | Regressão do bloqueio de perda diária na sequência do Trade Simulator (empate, lucro prévio, virada de dia e cota). |
| `study-hub-native.test.cjs` | Estado nativo do Study Hub, valores padrão independentes e mesclagem segura de backups parciais. |
| `study-hub-propfirm.test.cjs` | Módulo PropFirm: fases de avaliação, dimensionamento, metas, drawdown e formato salvo. |
| `study-hub-runtime.test.cjs` | Montagem sob demanda do runtime do Study Hub e proteção contra inicialização duplicada. |
| `study-hub-storage.test.cjs` | Chaves de armazenamento privadas do Study Hub (`diary2026`, `hubCiclos`, `pfState`, `pfCot`). |
| `study-hub-styles.test.cjs` | Integridade em ordem de cascata de todas as folhas CSS carregadas no `<head>` do `index.html`. |
| `study-hub-tools.test.cjs` | Módulo de Plano de Trade: ciclos encadeados, restauração de cotação e ordem de inicialização. |

### `tests/simulation/` — Simulação de resultados (4 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `simulation-panel.test.cjs` | Integração do painel de simulação na interface e despacho a partir da aba de análises. |
| `simulation-projection.test.cjs` | Projeção de trajetórias Monte Carlo, expectância, probabilidades de meta/stop e defaults. |
| `simulation-sizing-fields.test.cjs` | Preenchimento dos campos monetários calculados a partir da conta ativa ou modo manual. |
| `simulation-sizing.test.cjs` | Regras puras de dimensionamento (risco em dólar, meta em dólar, stop em dólar e limites). |

### `tests/preferences/` — Idioma e cotação (2 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `exchange-rate.test.cjs` | Validação, arredondamento, persistência e atualização da cotação USD/BRL e integração com Study Hub. |
| `language-selector.test.cjs` | Catálogos `pt-BR` e `en-US`, paridade de chaves, troca de idioma em tempo real e persistência. |

### `tests/workspace/` — Notificações, parceiros, perfil e demo (5 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `demo-data.test.cjs` | Gerador determinístico do conjunto de demonstração (300 trades) e configuração inicial. |
| `notifications-page.test.cjs` | Geração e renderização de alertas operacionais da conta ativa sem mutar o estado. |
| `partner-controls.test.cjs` | Normalização, validação, adição, edição e remoção de afiliados e dados de apoio/QR Code. |
| `partners-page.test.cjs` | Página de Parceiros: estados vazios, cards de afiliados, cópia de cupom/endereço e escape HTML. |
| `profile-page.test.cjs` | Página de Perfil: resumo da conta, limites de risco, biblioteca de tags e alertas prioritários. |

---

## Catálogo de `tests/browser/` — Verificação visual e smoke tests (27 arquivos)

### Scripts executáveis (4 arquivos)

| Arquivo | Responsabilidade |
| --- | --- |
| `tests/browser/browser-smoke.cjs` | Abre a aplicação em navegador real (headless), percorre páginas e fluxos críticos e valida ausência de erros de console/runtime. |
| `tests/browser/shell-style-check.cjs` | Captura e compara métricas de CSSOM e screenshots de todas as áreas da aplicação principal usando os 22 cenários em `scenarios/`. |
| `tests/browser/study-hub-style-check.cjs` | Captura e compara estados visuais e estilos específicos das abas internas do Study Hub. |
| `tests/browser/compare-browser-images.py` | Compara imagens PNG capturadas antes e depois de mudanças, contabilizando diferenças de pixels. |

### Helper compartilhado (1 arquivo)

| Arquivo | Responsabilidade |
| --- | --- |
| `tests/browser/helpers/study-hub-browser.cjs` | Servidor HTTP local temporário e inicialização controlada do navegador via DevTools Protocol (CDP) usada pelos scripts visuais. |

### Cenários de validação de estilo em `tests/browser/scenarios/` (22 arquivos)

| Arquivo | Área visual validada |
| --- | --- |
| `account-overview-style-scenarios.cjs` | Cards de visão geral de contas. |
| `account-style-scenarios.cjs` | Página de Contas, barras de risco e fluxo de caixa. |
| `alert-utility-style-scenarios.cjs` | Alertas, banners e utilitários de notificação. |
| `calendar-style-scenarios.cjs` | Grades mensal, semanal e quinzenal do Calendário. |
| `dashboard-layout-scenarios.cjs` | Grade principal, cards hero, gráficos e tabelas do Dashboard. |
| `data-transfer-style-scenarios.cjs` | Tela de Importações, abas e cartões de backup/exportação. |
| `document-style-scenarios.cjs` | Layout de pastas, lista de notas e editor de Documentos. |
| `emotion-picker-style-scenarios.cjs` | Seletor visual de emoções no formulário de trade. |
| `form-field-style-scenarios.cjs` | Campos de formulário, inputs, selects e alinhamentos. |
| `metric-style-scenarios.cjs` | Cartões de métricas e tooltips flutuantes. |
| `modal-tab-style-scenarios.cjs` | Modais, cabeçalhos de diálogo e navegação por abas. |
| `navigation-footer-style-scenarios.cjs` | Barra lateral, rodapé com estatísticas e links secundários. |
| `partner-style-scenarios.cjs` | Cards de parceiros/afiliados e seção de apoio. |
| `premarket-error-chip-style-scenarios.cjs` | Grade de pré-mercado e chips de erros de execução. |
| `strategy-style-scenarios.cjs` | Radar, ranking e tabela comparativa de Estratégias. |
| `study-hub-native-style-scenarios.cjs` | Painéis nativos do Study Hub. |
| `tag-editor-style-scenarios.cjs` | Editor de tags e nuvem de tags em Risco & Setup. |
| `trade-action-style-scenarios.cjs` | Botões de ação e controles do log de trades. |
| `trade-table-style-scenarios.cjs` | Tabela de trades, badges de status e linhas incompletas. |
| `upload-zone-style-scenarios.cjs` | Zona de arrastar e soltar arquivos na importação. |
| `workspace-grid-style-scenarios.cjs` | Grids responsivos e integração entre painéis do workspace. |
| `workspace-summary-style-scenarios.cjs` | Blocos de resumo do workspace e indicadores consolidados. |
