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
| G2 | CSS comum e demais páginas em blocos contíguos do mapa | Regras/ordem sem perdas; telas, estados e responsividade dos componentes afetados |
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
