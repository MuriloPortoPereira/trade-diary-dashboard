# Refactoring Roadmap

**Goal:** Preservar comportamento e reduzir acoplamento por extrações pequenas.
**Architecture:** Domínios puros por feature; scripts clássicos e wrappers compatíveis durante a transição.
**Tech Stack:** JavaScript, HTML/CSS, Chart.js CDN, Node.js apenas para ferramentas/testes.
**Spec:** [Arquitetura alvo](target-architecture.md), [regras](dependency-rules.md) e `AGENTS.md`.

## Restrições globais
Sem reescrita, mudança de produto/API/storage, runtime dependency ou push.
Caracterizar antes de extrair; testar, verificar sintaxe e revisar diff depois.
Não misturar arquitetura, nomenclatura e comportamento no mesmo lote.

## Lotes
| Ordem | Entrega | Proteção necessária | Saída |
|---|---|---|---|
| 0 | Ambiente e mapa | Git limpo, MCPs com chamadas reais | AGENTS, mapa, ADRs |
| 1 | Sizing da simulação | Caracterização de parsing, arredondamento e wrappers | Primeiro domínio isolado |
| 2 | Serialização CSV | Colunas, quoting, arrays, vazios e default `trades` | Serializer + wrapper compatível |
| 2b | Catálogos e seletor de idioma | Strings/chaves/ordem, fallback, storage e smoke EN/PT | Oito arquivos de apresentação com 10–253 linhas |
| 3 | Métricas puras | Trades abertos/fechados, perdas/empates, filtros e datas | Regras de analytics |
| 4 | Persistência | Round-trip de backup, chaves, seeds, dados antigos, falhas | Adaptador de storage sem migração |
| 5 | `saveTrade` | Payloads, validação, status e sequência de efeitos | Preparação da operação e use case |
| 6 | Risco de contas | Relógio/fuso, períodos e limites | Cálculo separado de strings/UI |
| 7 | StudyHub | Montagem, shims, tabs e storage; smoke amplo | Bundle isolado, depois subfeatures |
| 8 | CSS/HTML | Comparação visual, handlers e cascata | Arquivos por feature mantendo ordem |
| 9 | Compatibilidade antiga | Todos consumidores migrados e revisados | Remover wrappers aprovados |

Próximos lotes são propostas: executar individualmente com testes adequados; não representam autorização para alterar comportamento.

## Prioridade revista após análise global de 2026-09-11

O pedido de organizar o projeto inteiro amplia o foco de pequenas regras para blocos coesos de CSS e UI.
A numeração acima identifica as frentes históricas; a sequência recomendada abaixo passa a orientar a execução.
Inventários completos e condições: [análise global](modularization-analysis.md).

| Sequência | Entrega independente | Evidência exigida antes e depois |
|---|---|---|
| G1 ✓ | CSS legado StudyHub: sufixo 4880–6090 em quatro arquivos ordenados | Ampliar smoke das quatro abas; baseline visual; comparar bytes/cascata e geometria nos breakpoints |
| G2 ✓ | CSS comum e demais páginas em blocos contíguos do mapa | Regras/ordem sem perdas; telas, estados e responsividade dos componentes afetados |
| G3 | JS de páginas e componentes por feature, uma responsabilidade por commit | Declarações preservadas, handlers/globals, fluxo de navegação, modais e efeitos de estado |
| G4 | Domínios de métricas, timing, risco e simulação, individualmente | Caracterização numérica, limites, defaults, relógio/RNG e compatibilidade dos consumidores |
| G5 | Importação, backup e persistência por formato/coordenação/IO | Fixtures, deduplicação, restauração parcial/completa, chaves e sequência de efeitos |
| G6 | StudyHub: montagem, runtime isolado e intraday; depois subferramentas | Closure intacta, template/pontes, console, quatro módulos, storage e cálculos determinísticos |
| G7 | HTML de autoria e remoção de compatibilidade, se ainda necessários | ADR próprio para composição estática; DOM/IDs/handlers/carga equivalentes, todos consumidores migrados |

G2–G6 contêm vários lotes pequenos: não executar uma frente inteira como um único commit.
Intercalar CSS/JS da mesma feature é permitido, mas não misturar movimento de estilos com mudança de cálculo.
G1 preparou cobertura antes da extração: fingerprint integral do CSS, smoke de quatro abas e comparação visual.
G2 deve ampliar essa cobertura para cada novo componente/estado afetado.
O plano não exige criar todos os destinos de uma vez nem um CSS/JS por função. HTML permanece estático até G7.

## G2a: base visual e shell

- Prefixo histórico 1–699 separado em quatro arquivos, preservando ordem e bytes.
- Cobertura preparada antes da extração: 196 casos visuais e smoke ampliado para 27 checks.
- `styles.css` mantém 4.180 linhas; responsividade e estilos das páginas ainda residuais.
- G2b deu continuidade pelo bloco residual de superfícies/cabeçalhos, com cobertura adicional antes do corte.
- Não executar todo G2 de uma vez; G3–G6 continuam frentes independentes.

## G2b: superfícies e cabeçalhos

- Bloco histórico 700–945 extraído em um arquivo de 246 linhas; `styles.css` mantém 3.934 linhas.
- Cobertura antes do corte: fingerprint integral, 27 checks no navegador e 211 casos visuais;
  inclui máscaras/pseudo-elementos, display das páginas, fade-up e cinco abas de análise.
- G2c deu continuidade pelos botões e intervalos de datas, com cobertura dos estados e consumidores antes do corte.

## G2c: botões e intervalos de datas

- Bloco histórico 946–1059 extraído em arquivo de 114 linhas; residual com 3.820 linhas.
- Baseline anterior ao corte: fingerprint, smoke 27 e 323 casos visuais/funcionais.
- Preservados controles, hover, foco, filtragem/limpeza e overrides responsivos; sem alterar o JavaScript da aplicação.
- G2d deu continuidade pelos cards, indicadores e tooltips, com caracterização específica antes do corte.

## G2d: métricas e indicadores de risco

- Bloco histórico 1060–1359 extraído em arquivo de 300 linhas; residual com 3.520 linhas.
- Baseline anterior ao corte: fingerprint e 358 casos; inclui tons de risco, tooltips e limite de 1420px.
- Preservados bytes, cascata, responsividade e código da aplicação; sem mudança de cálculo ou estado.
- G2e deu continuidade pelos layouts do dashboard e cards, com caracterização da tabela inferior antes do corte.

## G2e: dashboard e layouts comuns de cards

- Bloco histórico 1360–1520 extraído em arquivo de 161 linhas; residual com 3.359 linhas.
- Baseline anterior ao corte: fingerprint e 378 casos, incluindo rolagem horizontal da tabela e hover de gráfico.
- Bytes, cascata, responsividade e JavaScript preservados; não remove classes sem consumidor encontrado.
- G2f deu continuidade pelos estilos de risco e caixa, com caracterização dos renderers antes do corte.

## G2f: risco e caixa da conta

- Bloco histórico 1521–1842 extraído em apresentação de contas, 322 linhas; residual com 3.037 linhas.
- Baseline corrigida anterior ao corte: fingerprint e 407 casos, incluindo tons, meta e caixa no setup/editor.
- Preservados bytes, cascata e código da aplicação; teste reforça isolamento de contas/trades em memória.
- G2g deu continuidade pelo ranking e comparação de estratégias, com caracterização dos seletores antes do corte.

## G2g: ranking e comparação de estratégias

- Bloco histórico 1843–2043 extraído em apresentação de analytics, 201 linhas; residual com 2.836 linhas.
- Baseline anterior ao corte: fingerprint e 448 casos, incluindo ranking, comparação completa e alternância de seleções.
- Preservados bytes, cascata e renderers; cálculos e handlers continuam no legado.
- G2h deu continuidade pelos calendários, com caracterização dos modos e navegação antes do corte.

## G2h: grids e células dos calendários

- Bloco histórico 2044–2284 extraído em apresentação de calendário, 241 linhas; residual com 2.595 linhas.
- Baseline anterior ao corte: fingerprint e 509 casos, incluindo modos, hover, scroll e datas-limite.
- Preservados bytes, cascata, renderers e APIs; `month` continua sem botão próprio na UI.
- G2i deu continuidade por tabelas, ordenação e estados incompletos, caracterizados antes do corte.

## G2i: tabelas e estados de operações

- Bloco histórico 2285–2432 extraído em apresentação de trades, 148 linhas; residual com 2.447 linhas.
- Baseline anterior ao corte: fingerprint e 559 casos, incluindo scroll, sticky, ordenação, seleção e flags de incompletude.
- Carga global preserva consumidores de tabelas e badges; bytes, cascata, handlers e dados permanecem iguais.
- G2j deu continuidade pelos campos de formulário compartilhados, caracterizados antes do corte.

## G2j: campos de formulário

- Bloco histórico 2433–2523 extraído em `src/styles/form-fields.css`, 91 linhas; residual com 2.356 linhas.
- Baseline anterior ao corte: fingerprint e 577 casos, incluindo foco, unidades, readonly, select e textarea.
- Carga global preserva consumidores; bytes, cascata, handlers e dados permanecem iguais.
- G2k deu continuidade por modais e abas comuns, com footers e alternância caracterizados antes do corte.

## G2k: modais e abas comuns

- Bloco histórico 2524–2603 extraído em `src/styles/modal-and-tabs.css`, 80 linhas; residual com 2.276 linhas.
- Baseline anterior ao corte: fingerprint e 595 casos, incluindo modal rolável, footers, diálogo e abas.
- Carga global preserva consumidores; bytes, cascata, handlers e dados permanecem iguais.
- G2l deu continuidade pela toolbar do calendário, com picker e valores computados caracterizados antes do corte.

## G2l: toolbar do calendário

- Bloco histórico 2604–2630 extraído em apresentação de calendário, 27 linhas; residual com 2.249 linhas.
- Baseline anterior ao corte: fingerprint e 598 casos, incluindo foco e dimensões dos controles.
- Bytes, cascata, handlers e dados permanecem iguais; `.gap-8` tardio mantém o gap efetivo existente.
- Próximo candidato G2m: `src/styles/upload-zone.css` (baseline 2631–2671);
  revisar upload comum, hover/drag e input oculto antes de extrair.

## G2m: upload comum

- Bloco histórico 2631–2671 extraído para `src/styles/upload-zone.css`, 41 linhas; residual com 2.208 linhas.
- Baseline anterior ao corte: fingerprint e 607 casos, incluindo fixture descartável em três larguras.
- Base, hover, `.drag`, input oculto e elementos internos preservados; nenhum consumidor ativo foi inventado.
- Próximo candidato G2n: `src/modules/trades/presentation/emotion-picker.css` (baseline 2672–2700).

## G2n: seletor de emoções

- Bloco histórico 2672–2700 extraído para apresentação de trades, 29 linhas; residual com 2.179 linhas.
- Baseline anterior ao corte: fingerprint e 616 casos, incluindo idle, hover e seleção em três larguras.
- Grid, cores, dimensões e tipografia preservados; nenhum consumidor ou handler foi criado.
- Próximo candidato G2o: `src/styles/tag-editor.css` (baseline 2701–2779).

## G2o: tags e edição

- Bloco histórico 2701–2779 extraído para `src/styles/tag-editor.css`, 79 linhas; residual com 2.100 linhas.
- Baseline anterior ao corte: fingerprint e 631 casos, com Setup/Profile, contagem, botões, hovers e wrap.
- Renderizadores reais são usados sem confirmar mutações; `.tag-add` sem consumidor usa fixture descartável.
- Próximo candidato G2p: `src/styles/alerts-and-utilities.css` (baseline 2780–2831).

## G2p: alertas e utilitários

- Bloco histórico 2780–2831 extraído para `src/styles/alerts-and-utilities.css`, 52 linhas; residual com 2.048 linhas.
- Baseline anterior ao corte: fingerprint e 640 casos, incluindo info/warn, separador e utilities em três larguras.
- Consumidores reais e responsividade preservados; `.w-full` sem consumidor usa fixture descartável.
- Próximo candidato G2q: `src/modules/trades/presentation/trade-actions.css` (baseline 2832–2879).

## G2q: ações em lote e fluxo do modal

- Bloco histórico 2832–2879 extraído para apresentação de trades, 48 linhas; residual com 2.000 linhas.
- Baseline anterior ao corte: fingerprint e 649 casos, incluindo barra oculta/visível e fluxo do modal.
- Estado transitório de seleção é exercitado sem executar mutações ou persistência.
- Próximo candidato G2r: rotina e chips de erro (baseline 2880–2991).

## G2r: premarket e chips de erro

- Bloco histórico 2880–2991 separado por feature: rotina em 81 linhas e chips de trades em 31 linhas; residual com 1.888 linhas.
- Baseline anterior ao corte: fingerprint e 667 casos, incluindo grade, dot hover/concluído e chips ocioso/hover/selecionado.
- Estado transitório é reiniciado; contas, trades, premarket persistido e storage são comparados antes/depois.
- Próximo candidato G2s: data transfer (baseline 2992–3146).

## G2s: importação, backup e exportação

- Bloco histórico 2992–3146 extraído para apresentação de transferência de dados, 155 linhas; residual com 1.733 linhas.
- Baseline anterior ao corte: fingerprint e 685 casos, incluindo abas reais em nove larguras e limites de 720/1420px.
- Overrides responsivos mantêm sua posição no residual; não se executam uploads, restauração ou downloads.
- Próximo candidato G2t: diálogo comum (baseline 3147–3168).

## G2t: diálogo comum

- Bloco histórico 3147–3168 extraído para `src/styles/application-dialog.css`, 22 linhas; residual com 1.711 linhas.
- Baseline anterior ao corte: fingerprint e 691 casos, incluindo input/foco, confirmação sem input e erro de validação.
- Handlers e callbacks permanecem no legado; cenários não confirmam ações persistentes.
- Próximo candidato G2u: rodapé da navegação (baseline 3169–3187).

## G2u: rodapé da navegação

- Bloco histórico 3169–3187 extraído para `src/styles/navigation-footer.css`, 19 linhas; residual com 1.692 linhas.
- Baseline anterior ao corte: fingerprint e 697 casos, incluindo hover, rolagem e seleção ativa de Profile.
- Regra anterior de margem continua no CSS da navegação; nenhum handler ou dado é alterado.
- Próximo candidato G2v: grids de estratégias, perfil e parceiros (baseline 3188–3218).

## G2v: grids compartilhados

- Bloco histórico 3188–3218 extraído para `src/styles/workspace-grids.css`, 31 linhas; residual com 1.661 linhas.
- Baseline anterior ao corte: fingerprint e 715 casos; grids reais em seis larguras, incluindo 1420±1.
- Seletores agrupados, margem do último filho e responsividade mantêm precedência; parceiros legados continuam ocultos.
- Próximo candidato G2w: StudyHub nativo (baseline 3219–3515), 297 linhas; caracterizar antes do corte.

## G2w: estilos nativos do StudyHub

- Bloco histórico 3219–3515 extraído para `src/modules/study-hub/presentation/study-hub-native.css`, 297 linhas; residual com 1.364 linhas.
- Baseline anterior ao corte: fingerprint e 787 casos; 72 novos cenários de abas/root em oito larguras, incluindo 720/1080±1.
- Markup nativo não montado mantém regras intactas; montagem legada, estado e overrides responsivos não alterados.
- Próximo candidato G2x: resumos compartilhados (baseline 3516–3671), 156 linhas; caracterizar consumidores antes do corte.

## G2x: resumos compartilhados

- Bloco histórico 3516–3671 extraído para `src/styles/workspace-summaries.css`, 156 linhas; residual com 1.208 linhas.
- Baseline anterior ao corte: fingerprint e 823 casos; 36 novos cenários em seis larguras, incluindo 720±1.
- Hero/compact do perfil, tons/neutro/vazio de status/chips e ranking ampliado protegidos; renderers, dados e overrides não alterados.
- Próximo candidato G2y: documentos (baseline 3672–4036), 365 linhas; revisar coesão/consumidores e caracterizar antes do corte.

## G2y: documentos

- Histórico 3672–4036 extraído em navegação/layout (192 linhas) e editor/mídia (173 linhas), apresentação de documentos.
- Dois links adjacentes mantêm os seletores agrupados e a posição das regras; residual com 843 linhas.
- Antes do corte: 41 casos direcionados e 59 testes Node passaram; referência integral imutável de `c34344e` usa runner v25 (864 casos).
- Renderers/seleção reais com fixture restaurável; notas gerais/diárias/trades/vazio, mídia, foco, hover, overflow e breakpoints protegidos.
- Validação final: 864 estados idênticos, 59 testes e smoke 27; revisão independente sem bloqueios.
- Próximo candidato G2z: visão geral de contas (baseline 4037–4151), 115 linhas; caracterizar o contêiner e o renderer antes de extrair.

## G2z: visão geral de contas

- Histórico 4037–4151 extraído para `src/modules/accounts/presentation/account-overview.css`, 115 linhas; residual com 728 linhas.
- 17 casos de caracterização passaram antes do corte; matriz v26 de 881 casos usa referência imutável de `0bc5a44`.
- Grid/cards/estatísticas/barras e 1420/720px cobertos; renderers, cálculos e handlers permanecem em `app.js`.
- Validação final: 881 estados idênticos, 59 testes e smoke 27; revisão independente sem bloqueios.
- Próximo candidato G2aa: parceiros (baseline 4152–4278), 127 linhas; caracterizar consumidores antes de extrair.

## G2aa: parceiros

- Histórico 4152–4278 extraído para `src/modules/partners/presentation/partners.css`, 127 linhas; residual com 601 linhas.
- 32 casos de caracterização passaram antes do corte; matriz v27 de 913 casos usa referência imutável de `f1d90a3`.
- Editor, estados vazios, afiliados, QR e breakpoints 1420/720px cobertos; handlers/configuração permanecem em `app.js`.
- Validação final: 913 estados idênticos, 59 testes e smoke 27; revisão independente sem bloqueios.
- Próximo candidato G2ab: complemento tardio das tags (baseline 4279–4291), 13 linhas; caracterizar o consumidor antes de extrair.

## G2ab: complemento tardio das tags

- Histórico 4279–4291 extraído para `src/styles/tag-cloud.css`, 13 linhas; residual com 588 linhas.
- Nove casos de caracterização passaram antes do corte; matriz v28 de 922 casos usa referência imutável de `3f434a9`.
- Perfil com tags padrão/vazias/longas e tipografia/espaçamento protegidos; renderer/estado permanecem em `app.js`.
- Validação final: 922 estados idênticos, 59 testes e smoke 27; revisão independente sem bloqueios.
- Próximo candidato G2ac: animação `fade-up` (baseline 4292–4303), 12 linhas; caracterizar antes de extrair.

## G2ac: animação de entrada

- Histórico 4292–4303 extraído para `src/styles/page-motion.css`, 12 linhas; residual com 576 linhas.
- Antes do corte: CSSOM dos quadros 0%/100%, três páginas ativas e 59 testes Node passaram; matriz v29 mantém 922 casos.
- Ordem da regra, animação `.page.active` e media queries tardias preservadas.
- Validação final: 922 estados idênticos, 59 testes e smoke 27; revisão independente sem bloqueios.
- Próximo candidato G2ad: responsividade desktop/tablet (baseline 4304–4563), 260 linhas; caracterizar pontos de quebra antes do corte.

## G2ad: responsividade desktop/tablet

- Histórico 4304–4563 extraído para `src/styles/responsive-desktop-tablet.css`, 260 linhas; residual mobile com 316 linhas.
- Antes do corte: 59 testes Node e matriz v29 de 922 estados, incluindo 1080/1240/1420±1; referência imutável de `e612fed`.
- Ordem de 1420, 1240 e 1080px e override de altura da sidebar preservados; 40 links mantêm fingerprint integral do CSS.
- Validação final: 922 estados idênticos, 59 testes e smoke 27; revisão independente sem bloqueios.
- Próximo candidato G2ae: responsividade mobile (baseline 4564–4879), 316 linhas; caracterizar antes de extrair.

## G2ae: responsividade mobile

- Histórico 4564–4879 extraído para `src/styles/responsive-mobile.css`, 316 linhas; `styles.css` removido após esgotar o residual.
- Antes do corte: 59 testes Node e matriz v29 de 922 estados, incluindo 440/720±1; referência imutável de `63ed009`.
- Link substituído na mesma posição, antes dos quatro CSS StudyHub; 40 links mantêm fingerprint integral dos 162.576 bytes.
- Validação final: 922 estados idênticos, 59 testes e smoke 27; revisão independente sem bloqueios.
- G2 concluído. Próxima frente G3: JavaScript de páginas/componentes por feature, uma responsabilidade por lote.

## G3a: renderer do perfil

- `renderProfilePage` movida intacta de `app.js` para `src/modules/profile/presentation/profile-page.js` (48 linhas).
- `index.html` carrega a declaração global como script clássico síncrono imediatamente antes de `app.js`; `showPage` e `refreshAll` permanecem iguais.
- Antes do corte: três testes de caracterização e 62 testes Node passaram; baseline visual v29 de 922 estados do commit `47371b4`.
- Depois do corte: 62 testes Node, 31 checks no navegador e 922 estados visuais idênticos; revisão independente sem bloqueios.
- Próximo lote G3b: outro renderer pequeno de apresentação, após caracterizar seus efeitos e consumidores.

## G3b: renderer de parceiros

- `renderPartnersPage` movida intacta de `app.js` para `src/modules/partners/presentation/partners-page.js` (37 linhas).
- `index.html` carrega a declaração global antes do perfil e de `app.js`; seis handlers de parceiros, `showPage` e `refreshAll` continuam iguais.
- Antes do corte: quatro testes de caracterização e 66 testes Node passaram; baseline visual v29 de 922 estados do commit `f5a11a0`.
- Depois do corte: 66 testes Node, 35 checks no navegador e 922 estados visuais idênticos; revisão independente sem bloqueios.
- Próximo candidato G3c: `renderAccountsPage`, após caracterizar cálculos chamados e layout/consumidores.

## G3c: renderer de contas

- `renderAccountsPage` movida intacta de `app.js` para `src/modules/accounts/presentation/accounts-page.js` (46 linhas).
- `index.html` carrega a declaração global antes dos renderers de parceiros/perfil e de `app.js`; `saveAccount`, exclusão, `showPage` e `refreshAll` continuam iguais.
- Antes do corte: quatro testes de caracterização e 70 testes Node passaram; baseline visual v29 de 922 estados do commit `bc3ef23`.
- Depois do corte: 70 testes Node, 39 checks no navegador e 922 estados visuais idênticos; revisão independente sem bloqueios.
- Próximo lote G3d: selecionar outro renderer coeso após caracterizar estado, consumidores e efeitos.

## G3d: renderer de documentos

- `renderDocumentsPage` movida intacta de `app.js` para `src/modules/documents/presentation/documents-page.js` (137 linhas).
- `index.html` carrega a declaração global antes dos renderers de contas/parceiros/perfil e de `app.js`; seleção, ações, `showPage` e `refreshAll` continuam iguais.
- Antes do corte: cinco testes de caracterização e 75 testes Node passaram; baseline visual v29 de 922 estados do commit `3b95e19`.
- Depois do corte: 75 testes Node, 43 checks no navegador e 922 estados visuais idênticos; revisão independente sem bloqueios.
- Próximo lote G3e: selecionar outra responsabilidade coesa após caracterizar estado, consumidores e efeitos.

## G3e: renderer do premarket

- `renderPremarket` movida intacta de `app.js` para `src/modules/routine/presentation/premarket-page.js` (60 linhas).
- `index.html` carrega a declaração global antes dos outros renderers e de `app.js`; edição de hábitos, navegação mensal, `showPage` e `refreshAll` continuam iguais.
- Antes do corte: quatro testes de caracterização e 79 testes Node passaram; baseline visual v29 de 922 estados do commit `21688f4`.
- Depois do corte: 79 testes Node, 47 checks no navegador e 922 estados visuais idênticos; revisão independente sem achados.
- Próximo lote G3f: selecionar outra responsabilidade coesa após caracterizar estado, consumidores e efeitos.

## G3f: renderer do hub de estratégias

- `renderStrategyHub` movida intacta de `app.js` para `src/modules/analytics/presentation/strategy-hub-page.js` (41 linhas).
- `index.html` carrega a declaração global antes dos outros renderers e de `app.js`; `showPage` e `refreshAll` continuam iguais.
- Antes do corte: quatro testes de caracterização e 83 testes Node passaram; baseline visual v29 de 922 estados do commit `2c70ab9`.
- Depois do corte: 83 testes Node, 51 checks no navegador e 922 estados visuais idênticos; revisão independente sem achados.
- Próximo lote G3g: selecionar outra responsabilidade coesa após caracterizar estado, consumidores e efeitos.

## G3g: renderer da página de psicologia

- `renderPsych` movida intacta de `app.js` para `src/modules/psychology/presentation/psychology-page.js` (25 linhas).
- `index.html` carrega a declaração global antes dos outros renderers e de `app.js`; `showPage` e `refreshAll` continuam iguais.
- Antes do corte: quatro testes de caracterização e 87 testes Node passaram; baseline visual v29 de 922 estados do lote G3f.
- Depois do corte: 87 testes Node, 55 checks no navegador e 922 estados visuais idênticos; revisão independente sem achados.
- Próximo lote G3h: selecionar outra responsabilidade coesa após caracterizar estado, consumidores e efeitos.

## G3h: renderer da página de notificações

- `renderNotificationsPage` movida byte a byte para `src/modules/notifications/presentation/notifications-page.js` (8 linhas).
- Script clássico síncrono antes de psicologia e de `app.js`; `showPage` e `refreshAll` intactos.
- Caracterização pré-corte: três testes novos e 90 testes Node. Pós-corte: 91 testes Node, 58 checks no navegador, sintaxe e diff aprovados.
- Matriz visual completa não repetida: corpo e HTML gerado intactos, sem mudança CSS; smoke verifica navegação/feed/refresh reais.
- Próximo lote G3i: selecionar outra responsabilidade coesa após caracterizar estado, consumidores e efeitos.

## G3i: renderer da página de calendário

- `renderCalendar` movida byte a byte para `src/modules/calendar/presentation/calendar-page.js` (97 linhas).
- Script clássico síncrono antes de notificações e de `app.js`; cinco consumidores intactos.
- Caracterização pré-corte: cinco testes novos e 96 testes Node. Pós-corte: 97 testes Node, 64 checks no navegador, sintaxe e diff aprovados.
- Protegidos mensal/semanal/quinzenal, bissexto, totais, vazio, tradução e limite de data preexistente; smoke exercita modos, mês, refresh e virada de ano.
- Matriz visual completa não repetida neste corte de corpo/HTML gerado intactos e CSS inalterado.
- Próximo lote G3j: selecionar outra responsabilidade coesa após caracterizar estado, consumidores e efeitos.

## G3j: apresentação de stops e taxas

- `renderStopFeeAnalysis` movida byte a byte para `src/modules/analytics/presentation/stop-fee-analysis.js` (51 linhas).
- Script clássico síncrono antes de calendário e de `app.js`; consumidor `renderStats` intacto, cálculos permanecem no legado.
- Caracterização pré-corte: quatro testes novos e 101 testes Node. Pós-corte: 102 testes Node, 67 checks no navegador, sintaxe e diff aprovados.
- Protegidos tons, limite inclusivo em 25%, escolha edge/drag, formatação, tooltips e alvo ausente; smoke exercita cards e refresh reais.
- Matriz visual completa não repetida neste corte de corpo/HTML gerado intactos e CSS inalterado.
- Próximo lote G3k: selecionar outra responsabilidade coesa após caracterizar estado, consumidores e efeitos.

## G3k: calendário compacto do dashboard

- `renderDashboardCalendar` movida byte a byte para `src/modules/calendar/presentation/dashboard-calendar.js` (56 linhas).
- Script clássico síncrono antes de stops/taxas e de `app.js`; consumidor `renderDashboard` intacto, helpers permanecem no legado.
- Caracterização pré-corte: quatro testes novos e 106 testes Node. Pós-corte: 107 testes Node, 71 checks no navegador, sintaxe e diff aprovados.
- Protegidos mês âncora, bissexto, totais diários/semanais, vazio, não-array e alvos ausentes; smoke exercita refresh e navegação pela célula.
- Matriz visual completa não repetida neste corte de corpo/HTML gerado intactos e CSS inalterado.
- Próximo lote G3l: selecionar outra responsabilidade coesa após caracterizar estado, consumidores e efeitos.

## Primeiro lote: sizing
Arquivos: criar `src/modules/simulation/domain/calculate-simulation-sizing.js`,
`tests/simulation-sizing.test.cjs`; alterar apenas funções correspondentes em `app.js`
e adicionar script antes de `app.js` em `index.html`.

Interfaces preservadas:
```js
toSimulationNumber(value, fallback=0)
roundSimulationMoney(value)
calculateSimulationSizing({balance=0,riskPct=0,goalPct=0,stopPct=0}={})
// Retorno: {balance, riskPct, goalPct, stopPct, riskUsd, goalUsd, stopUsd}
```

- [x] Fixar expectativas no código original usando `node:test`/`node:vm`.
  Caso nominal: saldo 1000, percentuais 1/5/3 => valores 10/50/30.
  Incluir defaults, inválidos, negativos, `parseFloat`, dinheiro arredondado primeiro,
  percentuais >100, overflow, TypeError para null e ausência de mutação.
- [x] Executar `node --test tests/simulation-sizing.test.cjs` antes de alterar aplicação.
- [x] Registrar smoke baseline em navegador isolado: carga, navegação e simulação.
- [x] Extrair funções sem reescrever cálculos; publicar `TradeDiarySimulationSizing` por IIFE.
- [x] Manter declarações globais com assinaturas iguais delegando ao domínio.
- [x] Executar testes contra domínio e wrappers; conferir script e ausência de dependências DOM/IO.
- [x] Executar smoke após extração, `node --check` e `git diff --check`.
- [x] Revisar com agente independente; atualizar mapa/progresso e criar commit conceitual.

## Segundo lote: serialização CSV

- [x] Caracterizar o legado antes da extração: 11 testes CSV e 14 checks no navegador passaram.
- [x] Extrair para `src/modules/data-transfer/infrastructure/serialize-trades-csv.js`:
  adaptador de formato conforme a fronteira `data-transfer` documentada, sem novas camadas ou IO.
- [x] Preservar `TRADE_CSV_HEADERS`, `csvCell` e `buildTradesCSV(list=trades)` em `app.js`.
- [x] Carregar o namespace `TradeDiaryTradesCSV` entre sizing e `app.js`, sem async/defer/ESM.
- [x] Validar 49 testes, 14 checks no navegador, sintaxe e diff; revisar independentemente.
- Download, filtros e importação permanecem no legado. Próximo lote proposto: métricas puras.

## Lote 2b: redução do bloco de idiomas

Priorizado após pedido de redução mais significativa dos arquivos. Dados declarativos e UI
de idioma formam um corte de baixo risco; métricas continuam como próximo lote de domínio.

- [x] Caracterizar 585 strings por idioma e oito cenários antes da extração; smoke com 18 checks passou no legado.
- [x] Separar registro, seis fragmentos por idioma/contexto e seletor: oito arquivos, todos abaixo de 300 linhas.
- [x] Manter funções globais e leitura de `currentLanguage` no mesmo ponto da composição de `app.js`.
- [x] Validar 58 testes, 18 checks no navegador, sintaxe e diff.
- [x] Revisar independentemente a movimentação exata, globals, catálogos e ordem dos scripts.
- `app.js`: 11.052 para 9.770 linhas (menos 1.282). Sem mudança de textos, runtime ou armazenamento.

## Arquivos >1.000 linhas: exceções temporárias
`app.js`, `styles.css` e `index.html` permanecem grandes ao final do lote 2b.
Justificativa: bootstrap, globals/handlers, DOM e cascata ainda não têm cobertura ampla;
um corte por tamanho causaria mudança simultânea de vários contratos.
Responsáveis e remoção da exceção: G1–G2 reduzem CSS; G3–G6 reduzem JS; G7 avalia a composição do HTML.
Catálogos de idioma já foram separados no lote 2b. O template e a closure StudyHub exigem exceções próprias durante G6.
Cada próxima sessão escolhe um lote; não aceita crescimento novo indiscriminado nesses arquivos.
