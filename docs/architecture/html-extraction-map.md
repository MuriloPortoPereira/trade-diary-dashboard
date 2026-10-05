# Páginas e contratos HTML

Referência `5c9859f`, análise de 2026-09-11. `index.html`: 1.445 linhas, 15 páginas,
quatro modais, 364 IDs estáticos únicos, 172 handlers inline e 191 atributos `style`.
Handlers: 112 onclick, 33 onchange, 27 oninput; 74 nomes globais chamados.
As contagens não incluem nós e handlers montados pelos templates JavaScript.

## Páginas e destinos de apresentação

Os arquivos são propostos, relativos a `src/modules/<feature>/presentation/`.
O CSS detalhado e sua ordem estão no [mapa CSS](css-extraction-map.md); os nomes de página abaixo
são destinos funcionais, não autorização para reunir regras fora de ordem.

| ID / linhas | Feature e JS proposto | CSS por contexto | Contratos e smoke do lote |
|---|---|---|---|
| `page-dashboard` 152–246 | analytics / `dashboard-page.js` | `dashboard.css` | Período, modo da curva, risco, recentes, gráficos e links |
| `page-log` 249–324 | trades / `trade-log.js` | `trade-log.css` | Filtros, ordenação, seleção, duplicação, incompletos, diálogo de exclusão |
| `page-calendar` 327–360 | calendar / `calendar-page.js` | `calendar.css` | Mês, semana/quinzena, detalhes do dia e tabela |
| `page-stats` 363–588 | analytics / `stats-page.js` | `stats.css` | Conta, período personalizado, cinco abas, comparação A/B e gráficos |
| `page-premarket` 591–646 | routine / `premarket-page.js` | `premarket.css` | Mês, hábitos, primeira abertura do editor e correlações |
| `page-psych` 649–681 | analytics / `psychology-page.js` | `psychology.css` | `showPage('psych')`, indicadores e gráficos; sem item atual na sidebar |
| `page-strategyHub` 684–719 | analytics / `strategy-hub-page.js` | `strategy-hub.css` | Cards, tabela e navegação para análises/setup |
| `page-studyHub` 722–756 | study-hub / `study-hub-page.js` | `study-hub-native.css` | Quatro abas, cotação, montagem única e toast |
| `page-import` 759–847 | data-transfer / `import-export-page.js` | `data-transfer.css` | Upload sintético, preview, confirmar/cancelar, exportação filtrada e backup |
| `page-documents` 850–907 | documents / `documents-page.js` | `documents.css` | Nota, edição, imagem, trade vinculado e confirmação de exclusão |
| `page-setup` 910–997 | accounts / `risk-setup-page.js` | `risk-setup.css` | Preview, salvar limites, cashflow, tags e cancelar limpeza |
| `page-notifications` 1000–1013 | notifications / `notifications-page.js` | `notifications.css` | Alertas vazios/preenchidos e destinos dos links |
| `page-accounts` 1016–1031 | accounts / `accounts-page.js` | `account-overview.css` | Resumos, modal de gestão e propagação da conta ativa |
| `page-partners` 1034–1072 | partners / `partners-page.js` | `partners.css` | Edição, QR, cards e links com fixture isolada |
| `page-profile` 1075–1099 | profile / `profile-page.js` | `profile.css` | Resumos, biblioteca e foco após troca de conta |

Análises contém overview 393–424, strategy 427–490, time 493–508, simulation 511–563
e psych 566–587. `simulation-panel.js`/CSS pertencem a simulation, apesar de montados em Análises.
A página StudyHub chamada “Simulações” é outro conjunto de ferramentas; não fundir seus estados.

## Shell e modais

| Região / linhas | Destino JS proposto | Contrato preservado |
|---|---|---|
| Topbar 15–60, overlay 61, sidebar 64–146 | `src/app/presentation/navigation.js`, `account-summary.js` | `showPage`, sidebar, conta ativa, idioma e cotação |
| Main 149–1101 | Manter montagem em `index.html` nesta fase | Todos os IDs disponíveis antes do bootstrap |
| `tradeModal` 1105–1327 | trades / `trade-form.js` | Campos t-*, defaults, cálculos, imagens, salvar/cancelar, anterior/próximo |
| `accountModal` 1330–1393 | accounts / `account-form.js` | Campos af-*, tipo, limites e movimentos financeiros |
| `csvConfirmModal` 1396–1410 | data-transfer / `import-confirmation.js` | Preview, contagem, confirmação/cancelamento |
| `appDialogModal` 1412–1431 | `src/app/presentation/app-dialog.js` | Aviso, confirmação, prompt, erro e sequência de diálogos |

As funções em atributos inline continuam globais. Preservar `this`, `event`, argumentos e retorno.
Não remover `page-psych` por ausência na navegação; a API de navegação ainda a conhece.

## Ordem de carga na baseline do mapa

1. Chart.js 4.4.1 síncrono no head, linha 7; `styles.css`, linha 8.
2. DOM completo, incluindo páginas e modais.
3. Sizing; CSV; registro de idiomas; três fragmentos PT; três EN; seletor; `app.js`, linhas 1433–1443.

O CSS atual é carregado por 40 links ordenados em `index.html`; `styles.css` foi extraído integralmente em G2.
Manter scripts clássicos síncronos. A ordem dos catálogos é significativa.
As referências em strings de `app.js` e do StudyHub ampliam a superfície de handlers além do HTML estático.

## Inline styles: migração separada

`index.html:634` alterna `pmHabitMgr` lendo `.style.display==='none'`; o estado inicial
está em `636`, `style="display:none"`. Transferi-lo para stylesheet muda `.style.display`
para string vazia e altera a primeira abertura. Primeiro caracterizar leituras/escritas do estado.

Análises concentra 54 inline styles; modal trade 38; rotina 21; modal conta 15; setup 13.
Decoração pode ser extraída com teste de especificidade; não remover todos os estilos inline em massa.
Também há seletores CSS que dependem do próprio atributo `style`.

## Por que não dividir imediatamente o HTML em arquivos

HTML estático não inclui fragmentos externos sozinho. `fetch`, strings JS ou montagem com template
mudam disponibilidade de IDs, tradução, listeners, gráficos e inicialização do StudyHub.
Primeiro modularizar JS/CSS mantendo o shell. Uma alternativa posterior é composição determinística
de fragmentos de autoria que gere o mesmo `index.html`; isso adiciona uma etapa de geração e requer ADR próprio.

README 165–180 descreve Vercel com preset Other, build vazio e saída na raiz. Nenhuma configuração
remota foi consultada; preservar esse contrato estático. A árvore do README em 114 está desatualizada
e deve refletir a organização conforme os lotes forem implementados.

## Cobertura necessária

Além dos fluxos por página: primeira carga e recarga com dados sintéticos, PT/EN, desktop/mobile,
sidebar, todos os modais, ausência de erros/404 e comparação do storage antes/depois de navegação.
Os 18 checks existentes cobrem um subconjunto; a análise não afirma que esse smoke completo já exista.
