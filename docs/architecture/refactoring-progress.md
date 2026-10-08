# Refactoring Progress

## Overall status
- Preparação concluída: ambiente, auditoria, AGENTS, mapas, arquitetura alvo e ADRs.
- Implementação parcial: sizing, CSV, idiomas, G1, G2 concluído e G3a–G3ac registrados abaixo.
- G3 em andamento; G4–G6 continuam como frentes de domínio, IO e StudyHub.
- G7 depende da migração dos consumidores e de decisão sobre composição estática do HTML.
- Testes, revisão e documentação acompanham cada lote; isso não equivale à validação integral da aplicação.
- Sequência e critérios de conclusão: [roadmap](refactoring-roadmap.md).

## Completed
- Baseline `ab0cb63`, preservado em `main` e na tag `v1.0.0`, sem mudanças locais preexistentes.
- Caveman local; Superpowers 6.3.0 via marketplace; MCPs locais Serena e Context7.
- Serena: raiz ativada, overview, símbolo/referências de sizing e navegação no novo domínio.
- Context7: resolução Node.js e consulta real da documentação do test runner v24.
- Auditoria estrutural, mapa, fronteiras propostas, AGENTS (83 linhas) e ADRs.
- Lote 1: três funções de sizing em domínio de 29 linhas; globals anteriores delegam sem alterar assinaturas.
- `index.html` carrega domínio antes de `app.js`; sem ESM, bundler ou dependência de runtime.
- `app.js`: 11.068 para 11.055 linhas. Redução pequena deliberada; responsabilidade isolada e testável.
- Baseline: 12 testes de caracterização e 11 checks no navegador passaram antes da extração.
- Após extração: 26 testes (domínio, wrappers, isolamento e ordem dos scripts), 0 falhas/skip.
- Smoke final: 11 checks passaram; Chart.js 4.4.1 real, UI de simulação e storage durante o fluxo.
- Sintaxe de app/domínio/teste/smoke e `git diff --check` passaram.
- Revisão independente: sem regressão bloqueante; 361 combinações sizing, 38 chamadas helpers e default comparados ao baseline.
- Commits separados de ambiente/documentação, caracterização e extração. Nenhum push/deploy.
- Lote 2: serialização CSV extraída para adaptador de formato em `data-transfer/infrastructure` (17 linhas).
- `TRADE_CSV_HEADERS` mantém o mesmo array; `csvCell` e `buildTradesCSV(list=trades)` permanecem globais compatíveis.
- Serializer recebe lista explícita; colunas, quoting, arrays, vazios e erros existentes preservados. Consumidores não alterados.
- Antes da extração CSV: 11 testes de caracterização e 14 checks no navegador passaram.
- Após extração CSV: 49 testes totais (26 sizing + 23 CSV), 0 falhas/skip; 14 checks no navegador passaram.
- Sintaxe de app/serializer/teste/smoke e `git diff --check` passaram. `app.js`: 11.055 para 11.052 linhas.
- Revisão independente CSV: sem achados bloqueantes; 1.031 comparações diferenciais com o commit anterior passaram em VM.
- Serena nativa ativada na raiz; símbolos e referências CSV consultados. Context7 disponível, sem necessidade de documentação externa.
- Lote 2b, solicitado para reduzir arquivos extensos: idiomas em oito arquivos de apresentação, de 10 a 253 linhas.
- `app.js`: 11.052 para 9.770 linhas, redução de 1.282 linhas. Catálogos separados por idioma e contexto funcional.
- Caracterização anterior à extração: oito testes de idioma e 18 checks no navegador passaram no legado.
- Após extração: 58 testes totais, 0 falhas/skip; 18 checks no navegador; sintaxe dos scripts alterados e diff aprovados.
- Preservadas as 585 strings e a ordem das chaves de cada idioma por fingerprints; funções movidas sem reescrita.
- Seletor mantém globals, fallback e efeitos; `currentLanguage` permanece inicializado no mesmo ponto de `app.js`.
- Revisão independente sem bloqueios: seis funções (61 linhas) e 53.123 bytes de catálogos movidos exatamente; 1.170 entradas preservadas.

- G1 concluído: quatro CSS legados StudyHub em `presentation`, com 344/359/174/334 linhas.
- `styles.css`: 6.090 → 4.879 linhas; 1.211 linhas movidas sem reescrita. Cinco links mantêm a cascata original.
- Caracterização anterior ao corte: fingerprint integral do CSS, 22 checks no navegador e 64 capturas determinísticas sem erros.
- Após extração: 59 testes, 22 checks no navegador, sintaxe de cinco scripts e `git diff --check` aprovados.
- 64 comparações antes/depois: pixels, estilos computados, geometria e storage idênticos; zero erros de console/runtime e assets locais ausentes.
- Revisão independente sem bloqueios: concatenação de 162.576 bytes idêntica ao original; cinco CSS parseados sem erros; scripts/handlers intactos.
- Ferramenta de captura teve seletor com aspas inválidas na primeira execução; corrigido somente no teste, baseline refeita antes da extração.
- JS da aplicação não alterado. Sem dependências de runtime, push ou deploy.

- G2a concluído em 2026-09-12: foundation (109), shell-layout (43), preferences-widgets (139) e navigation-and-account-summary (408 linhas).
- `styles.css`: 4.879 para 4.180 linhas; 699 linhas movidas. Nove links preservam os 162.576 bytes originais concatenados.
- Baseline antes do corte: fingerprint CSS, 27 checks no navegador e 196 capturas em perfil isolado.
- Após retomada, processos/artefatos temporários anteriores indisponíveis; baseline reconstruída de `387d9ec` em pasta isolada, sem alterar o trabalho local.
- Validação final: 59 testes Node, 27 checks no navegador, sintaxe, diff e revisão independente sem bloqueios.
- 196 estados antes/depois idênticos: estilos, geometria, fontes e storage. Zero console/runtime errors e assets locais ausentes.
- Controle repetido do código original: 159 pixels diferentes em 28 imagens; após extração: 202 pixels em 14 imagens, dentro dos limites registrados em tooling.
- Fontes estabilizadas após cada montagem; runner compara faces carregadas e inclui pseudo-elemento decorativo do cabeçalho.
- Comparador de pixels: seis casos de identidade/aceitação/rejeição/dimensões passaram; Pillow já disponível, somente na verificação visual opcional.
- `app.js`, handlers e ordem dos scripts preservados; sem runtime dependencies, push ou deploy.

- G2b concluído: `src/styles/page-surfaces-and-headers.css` com 246 linhas/10.037 bytes.
- `styles.css`: 4.180 para 3.934 linhas; dez links preservam os 162.576 bytes originais concatenados.
- Antes do corte: fingerprint integral, 27 checks no navegador e baseline ampliada para 211 casos.
- Depois: 59 testes Node, 27 checks no navegador, sintaxe e diff aprovados; revisão independente sem bloqueios.
- 211 estados exatos (estilos, geometria, máscaras, fontes, display das páginas e storage); zero erros de console/runtime ou assets locais ausentes.
- 11 capturas com 170 pixels de diferença dentro da tolerância numérica existente; limites não ampliados.
- Runner inclui pseudo-elementos das superfícies/cabeçalhos, cinco abas de análise por handlers reais e fade-up antes de desativar animações.
- `app.js`, scripts e handlers preservados; somente um link acrescentado no HTML. Sem novas dependências, push ou deploy.

- G2c concluído: `src/styles/page-actions.css` com 114 linhas/2.183 bytes; 16 regras completas.
- `styles.css`: 3.934 para 3.820 linhas; onze links preservam os 162.576 bytes originais concatenados, também no índice Git.
- Caracterização antes do corte: fingerprint integral, smoke 27 e baseline ampliada para 323 casos.
- Após extração: 59 testes Node, 27 checks no navegador, sintaxe, diff e revisão independente aprovados.
- 323 estados exatos; 19 imagens com 54 pixels de diferença dentro da tolerância existente, sem ampliar limites. Zero erros de console/runtime e assets locais ausentes.
- Cobertura inclui hover/foco, cores de opções, filtro e limpeza pelos controles reais; fixture conserva os dois trades após limpar datas.
- Primeiro ensaio falhou por redeclaração de `const ids` no contexto CDP; IIFEs corrigiram somente o runner, seguido de nova baseline antes do corte.
- Sem alteração de `app.js`, handlers, APIs, dados persistidos ou dependências. Apenas um link inserido no HTML; sem push/deploy.

- G2d concluído: `src/styles/metric-cards-and-risk-insights.css` com 300 linhas/5.433 bytes e 44 blocos completos.
- `styles.css`: 3.820 para 3.520 linhas; doze links preservam os 162.576 bytes originais concatenados.
- Caracterização antes do corte: fingerprint integral e baseline ampliada para 358 casos.
- 59 testes Node, 27 checks no navegador, sintaxe, diff e revisão independente aprovados.
- 358 estados exatos; 35 imagens com 99 pixels de diferença dentro da tolerância existente. Zero erros de console/runtime e assets locais ausentes.
- Cobertura ampliada: limite de 1420px, tons safe/warn/danger pelo renderer existente, hover e tooltips acima/abaixo/ocultos.
- `app.js`, handlers, scripts, cálculos e dados preservados; HTML recebe somente um link. Sem novas dependências de runtime, push ou deploy.

- G2e concluído: `src/styles/dashboard-and-card-layout.css` com 161 linhas/2.740 bytes e 23 regras completas.
- `styles.css`: 3.520 para 3.359 linhas; treze links preservam os 162.576 bytes originais concatenados.
- Caracterização antes do corte: fingerprint integral e baseline ampliada para 378 casos.
- 59 testes Node, 27 checks no navegador, sintaxe, diff e revisão independente aprovados.
- 378 estados exatos; 22 imagens com 156 pixels de diferença dentro da tolerância existente. Zero erros de console/runtime e assets locais ausentes.
- Cobertura ampliada: tabela inferior em 17 larguras com scroll horizontal real, geometria da rolagem e hover de card de gráfico.
- `app.js`, handlers, scripts, cálculos e dados preservados; HTML recebe somente um link. Sem novas dependências de runtime, push ou deploy.

- G2f concluído: `src/modules/accounts/presentation/account-risk-and-cashflow.css` com 322 linhas/6.224 bytes e 48 regras completas.
- `styles.css`: 3.359 para 3.037 linhas; quatorze links preservam os 162.576 bytes originais concatenados.
- Caracterização corrigida antes do corte: fingerprint integral e baseline ampliada para 407 casos.
- 59 testes Node, 27 checks no navegador, sintaxe, diff e revisão independente aprovados.
- 407 estados exatos; nove imagens com 62 pixels de diferença dentro da tolerância existente. Zero erros de console/runtime e assets locais ausentes.
- Cobertura: tons de risco em 17 larguras; meta, caixa preenchido no setup/editor e editor vazio em três larguras.
- Revisão encontrou e corrigiu vazamento da fixture no runner: getter recriava contas; `finally` passou a restaurar o array original, inclusive em erro. Nova baseline após correção.
- Primeiro revisor atingiu limite de uso; outro subagente concluiu revisão. Captura também reiniciada após perda de processo/artefatos temporários; detalhes em tooling.
- `app.js`, handlers, scripts, cálculos e dados preservados; HTML recebe somente um link. Sem novas dependências de runtime, push ou deploy.

- G2g concluído: `src/modules/analytics/presentation/strategy-comparison.css` com 201 linhas/3.455 bytes e 30 regras completas.
- `styles.css`: 3.037 para 2.836 linhas; quinze links preservam os 162.576 bytes originais concatenados.
- Caracterização antes do corte: fingerprint integral e baseline ampliada para 448 casos.
- 59 testes Node, 27 checks no navegador, sintaxe, diff e revisão independente aprovados.
- 448 estados exatos; 21 imagens com 147 pixels de diferença dentro da tolerância existente. Zero erros de console/runtime e assets locais ausentes.
- Cobertura: ranking positivo/negativo/vazio, comparação completa em 17 larguras; seletores, cards, gráficos e resumo em três larguras.
- Revisão transferida a outro subagente após limite de uso; sem bloqueios. `compare-empty` cobre limpeza da seleção, com trades presentes.
- `app.js`, handlers, scripts, cálculos e dados preservados; HTML recebe somente um link. Sem novas dependências de runtime, push ou deploy.

- G2h concluído: `src/modules/calendar/presentation/calendar-grids.css` com 241 linhas/4.420 bytes e 32 regras completas.
- `styles.css`: 2.836 para 2.595 linhas; dezesseis links preservam os 162.576 bytes originais concatenados.
- Caracterização antes do corte: fingerprint integral e baseline ampliada para 509 casos.
- 59 testes Node, 27 checks no navegador, sintaxe, diff e revisão independente aprovados.
- 509 estados exatos; 23 imagens com 190 pixels de diferença dentro da tolerância existente. Zero erros de console/runtime e assets locais ausentes.
- Cobertura: week/biweek em 17 larguras; month via API, hover, mini/navegação, detalhes e ano/mês bissexto em três larguras.
- Estado visual do calendário reiniciado entre casos; dados e storage preservados. Janeiro/2027 é verificado antes de retornar a dezembro/2026 para captura.
- `app.js`, handlers, scripts, cálculos e dados preservados; HTML recebe somente um link. Sem novas dependências de runtime, push ou deploy.

- G2r concluído: premarket em 81 linhas/1.415 bytes e chips de trades em 31 linhas/624 bytes.
- Validação G2r: 59 testes, 27 checks no navegador e 667 estados visuais idênticos; revisão sem bloqueios.

- G2s concluído: transferência de dados em 155 linhas/2.612 bytes e 23 regras completas.
- Validação G2s: 59 testes, 27 checks no navegador e 685 estados idênticos; revisão sem bloqueios.

- G2t concluído: diálogo comum em 22 linhas/291 bytes e quatro regras completas.
- Validação G2t: 59 testes, 27 checks no navegador e 691 estados idênticos; revisão sem bloqueios.

- G2u concluído: rodapé em 19 linhas/258 bytes e três regras completas.
- Validação G2u: 59 testes, 27 checks no navegador e 697 estados idênticos; revisão sem bloqueios.

- G2v concluído: grids compartilhados em 31 linhas/503 bytes e seis regras completas.
- Validação G2v: 59 testes, 27 checks no navegador e 715 estados idênticos; revisão sem bloqueios.

- G2w concluído: StudyHub nativo em 297 linhas/5.774 bytes e 43 regras completas.
- Validação G2w: 59 testes, 27 checks no navegador e 787 estados idênticos; revisão sem bloqueios.

- G2x extraído: `src/styles/workspace-summaries.css`, 156 linhas/2.895 bytes e 25 regras completas.
- `styles.css`: 1.364 para 1.208 linhas; 33 links preservam os 162.576 bytes originais concatenados.
- Caracterização pré-corte: baseline de 823 casos; 36 novos cenários em seis larguras, incluindo 720±1.
- Hero/compact reais do perfil, quatro tons/neutro/vazio em renderers de status/chips e ranking ampliado; markup restaurado entre casos e dados/storage preservados.
- 59 testes Node, 27 checks no navegador, sintaxe, parsing e diff aprovados; 823 estados visuais idênticos, com 37 imagens/159 pixels dentro da tolerância existente; revisão independente sem bloqueios.

- G2y extraído: documentos em navegação/layout (192 linhas/3.386 bytes/24 regras) e editor/mídia (173 linhas/3.269 bytes/20 regras).
- `styles.css`: 1.208 para 843 linhas; 35 links preservam os 162.576 bytes originais concatenados.
- 41 casos direcionados passaram antes do corte; matriz v25 ampliada para 864 casos, com referência imutável de `c34344e`.
- 59 testes Node, 27 checks no navegador, sintaxe, parsing e diff aprovados; 864 estados visuais idênticos, com 48 imagens/197 pixels dentro da tolerância existente; revisão independente sem bloqueios.

- G2z extraído: `src/modules/accounts/presentation/account-overview.css`, 115 linhas/2.150 bytes/16 regras.
- `styles.css`: 843 para 728 linhas; 36 links preservam os 162.576 bytes originais concatenados.
- 17 cenários direcionados passaram antes do corte; matriz v26 ampliada para 881 casos, com referência imutável de `0bc5a44`.
- 59 testes Node, 27 checks no navegador, sintaxe, parsing e diff aprovados; 881 estados visuais idênticos, com 49 imagens/279 pixels dentro da tolerância existente; revisão independente sem bloqueios.

- G2aa extraído: `src/modules/partners/presentation/partners.css`, 127 linhas/2.076 bytes/21 regras.
- `styles.css`: 728 para 601 linhas; 37 links preservam os 162.576 bytes originais concatenados.
- 32 casos direcionados passaram antes do corte; matriz v27 ampliada para 913 casos, com referência imutável de `f1d90a3`.
- 59 testes Node, 27 checks no navegador, sintaxe, parsing e diff aprovados; 913 estados visuais idênticos, com 48 imagens/254 pixels dentro da tolerância existente; revisão independente sem bloqueios.

- G2ab extraído: `src/styles/tag-cloud.css`, 13 linhas/223 bytes e duas regras.
- `styles.css`: 601 para 588 linhas; 38 links preservam os 162.576 bytes originais concatenados.
- Nove casos direcionados passaram antes do corte; matriz v28 ampliada para 922 casos, com referência imutável de `3f434a9`.
- 59 testes Node, 27 checks no navegador, sintaxe, parsing e diff aprovados; 922 estados visuais idênticos, com 53 imagens/223 pixels dentro da tolerância existente; revisão independente sem bloqueios.

## Current
- G3ac extraído: `renderTopbarValue` para `src/app/presentation/topbar-value.js`, nove linhas movidas byte a byte.
- API global, guards, seleção por densidade, título e aplicação de classes mantidos; script clássico síncrono antes dos consumidores.
- Caracterização pré-corte: três testes novos e 198 testes Node. Pós-corte: 199 testes Node, 95 checks no navegador, sintaxe e diff aprovados.
- Smoke percorre o dashboard e atualiza o topbar pelos consumidores existentes. Matriz visual completa não repetida neste corte de corpo/HTML gerado intactos e CSS inalterado; última matriz: G3g, 922 estados.

## Next
- G3ad: selecionar outra responsabilidade coesa de apresentação após localizar consumidores e caracterizar efeitos; manter um corte por lote.
- Seguir as prioridades do [roadmap](refactoring-roadmap.md); uma responsabilidade por lote.
- Métricas continuam frente de domínio pendente; não misturar extração visual com mudança de cálculo.

## Risks
- Monólitos permanecem grandes, com justificativa temporária no roadmap.
- Sem cobertura ampla de persistência, importação, trades, risco por calendário e StudyHub.
- Smoke cobre janela inicial e fluxo específico; não captura erros silenciados/console.error ou falhas assíncronas posteriores.
- Runner visual G1 captura console/runtime durante as visitas; comparação permite erros preexistentes iguais (baseline G1: zero).
- G1 compara pixels das quatro abas principais StudyHub, apenas subabas iniciais e viewport de 1.000px de altura.
- Sem cobertura visual de hover/focus/scroll ou elementos ocultos; demais páginas, migrações e Monte Carlo completo permanecem sem validação ampla.
- Fixture visual fixa relógio/RNG/cotação. G1 pode usar fallback; G2a exige fontes carregadas e rede. Igualdade observada vale para esse ambiente.
- G2a–G2ae cobrem estados iniciais das 15 páginas em três larguras, shell/ações em 17 larguras, quatro modais sem submissão e abas compartilhadas; não cobrem toda a aplicação.
- G2d acrescenta dashboard/risco em 1420±1 e tooltips por eventos DOM; não comprova hit testing físico nem todas as variantes financeiras.
- G2e verificou scroll horizontal e dimensões/overflow; G2i acrescenta fixture com 20 operações e scroll vertical para exercer o cabeçalho sticky.
- G2f caracteriza apresentação com renderers reais e entradas sintéticas; não audita cálculos financeiros nem testa submissão/exclusão de caixa.
- G2g usa dois trades sintéticos com estratégias distintas; não audita fórmulas, timing, grandes amostras ou o popup nativo dos seletores.
- G2h cobre modos e datas-limite com fixture fixa; não audita todas as somas/períodos/fusos. month usa API global; popup nativo do mês e animação em movimento ficam fora.
- G2i caracteriza apresentação das flags de incompletude; não audita sua regra, ordenação de todas as colunas, exclusão, duplicação ou conclusão/salvamento.
- G2j não testa submissão/validação, popup nativo do select, arraste do textarea ou animação em movimento; `.field-hint` não possui consumidor encontrado.
- G2k não confirma importação nem diálogo, não testa Escape e não cobre todas as subabas internas do StudyHub legado.
- G2l não abre o popup nativo do input month; esse popup varia por navegador/OS.
- G2m usa fixture porque não há consumidor global ativo; não dispara drop real nem comprova importadores.
- G2n usa fixture porque não há consumidor ativo; hover não possui regra própria e deve permanecer igual ao estado-base.
- G2o não confirma edição/exclusão; exercita apenas renderização e hovers, e `.tag-add` não possui consumidor.
- G2p não dispara importação nem altera incompletos; `.w-full` não possui consumidor ativo.
- G2q não executa editar/duplicar/excluir; fluxo visível do modal é estado de apresentação isolado.
- G2r não altera hábitos persistidos nem salva trade; `.pm-check` permanece coberto por equivalência de bytes, sem consumidor localizado.
- G2s caracteriza somente apresentação; upload, importadores, restauração e downloads não são exercitados.
- G2t caracteriza apresentação de confirmação e validação; não executa callbacks de ações nem testa fechamento por Escape.
- G2u caracteriza hover por CDP e seleção idempotente; não comprova hit testing físico nem transição entre páginas.
- G2v caracteriza layout visível; grid legado de parceiros oculto tem bytes e display protegidos, sem fabricar conteúdo ou exercer afiliação.
- G2w caracteriza abas/root montados; grids/cards/ranges nativos não montados têm bytes preservados. Não executa simulações completas, sliders ou mutações das subferramentas.
- G2ac caracteriza quadros CSSOM e declaração da página; não avalia percepção da animação quadro a quadro.
- G2ab caracteriza renderização da nuvem, sem edição ou persistência; regras anteriores de tags permanecem compartilhadas.
- G2aa não salva/remove afiliados, nem executa upload/remoção de QR; classes legadas sem consumidor atual protegidas por bytes.
- G2z não seleciona/edita contas nem audita cálculos de risco. Nome longo estreito encolhe o ponto de cor por flex; comportamento preexistente mantido.
- G2y não salva/formata/exclui documentos nem executa upload/remoção de mídia. O retorno antecipado do editor vazio pode preservar contexto de trade anterior; limitação preexistente, sem correção neste lote.
- G2x usa payloads de apresentação nos renderers reais; não audita geração de alertas, cálculo de chips/ranking, navegação das ações ou mutações persistentes.
- G2c verifica estilos computados das opções e foco nas datas, sem capturar seus popups nativos.
- Comparação de pixels G2a aceita ruído de rasterização estritamente limitado; hashes de estilos/geometria/fontes/storage continuam exatos.
- CSV: consumidor testado com download/aviso substituídos em VM; smoke verifica serialização real e globals, sem baixar arquivo.
- Idiomas: smoke cobre EN/PT e preservação dos demais dados; não compara pixels de todas as telas nem recarga do navegador após escolha.
- CDN e cotação dependem de rede. Lint/typecheck/format/build inexistentes, não reportados como aprovados.

## Decisions
- ADR-001: scripts clássicos, namespace e globals temporários; preservar APIs/dados/cálculos.
- ADR-002: caracterização antes das extrações; Node built-ins e Chrome isolado sem npm dependencies.
- Memória Serena contém somente ponte para documentos canônicos, evitando duplicação de contexto.
- CSV é adaptador de formato em Infrastructure conforme arquitetura alvo; não é regra de negócio. Sem abstração de IO adicional.
- Default `trades` fica no wrapper; namespace não depende do estado da aplicação. Ordem dos scripts permanece contrato explícito.
- Idiomas são apresentação: registro e fragmentos clássicos com `Object.assign` na ordem original; sem novas APIs públicas ou wrappers redundantes.
- Catálogos passam a carregar antes de `app.js`; somente dados são inicializados. Leitura de storage e bootstrap mantêm a sequência anterior.
- Revisão global: primeiro separar arquivos preservando blocos, closures e ordem; depois separar camadas com entradas explícitas.
- CSS por feature preserva regras tardias e media queries; HTML estático permanece no shell até decisão própria sobre composição.
- G1: arquivos CSS são apresentação; controles compartilhados continuam carregados nas quatro abas, sem lazy loading ou novas camadas.
- `.gitattributes` impede normalização LF/CRLF somente nos cinco CSS; exceção de whitespace restrita a CRLF e separadores vazios herdados no EOF. Bytes do índice também comparados à baseline.
- G2a: base visual/shell em `src/styles`, widgets em apresentação de preferências; responsividade e complementos tardios continuam no residual, na mesma ordem.
- G2b: superfícies/cabeçalhos são apresentação comum em `src/styles`; máscaras data: e overrides tardios mantêm posição original.
- G2c: ações comuns em `src/styles/page-actions.css`, com carga global; overrides responsivos e handlers continuam no legado.
- G2d: cards, grids, indicadores e tooltips comuns em `src/styles`; renderers e cálculos permanecem no legado.
- G2e: layouts do dashboard e containers/cabeçalhos comuns em `src/styles`; preservadas também regras sem consumidor encontrado.
- G2f: risco/progresso/caixa em apresentação de contas, com carga global; nenhuma extração de cálculo ou persistência neste lote.
- G2g: ranking e comparação em apresentação de analytics; overrides tardios, handlers e regras numéricas permanecem no legado.
- G2h: mini e grids do calendário em apresentação de calendar; toolbar/responsividade e comportamento dos handlers permanecem no legado.
- G2i: tabelas e badges em apresentação de trades, com carga global pelos consumidores existentes; estados e handlers continuam no legado.
- G2j: campos compartilhados em `src/styles`; overrides responsivos e específicos do StudyHub continuam tardios.
- G2k: overlays, modais e abas compartilhados em `src/styles`; handlers e estado continuam no legado.
- G2l: toolbar em apresentação de calendário; `calGoToMonth`, `setCalView` e renderização continuam no legado.
- G2m: upload comum em `src/styles`; fixture documenta CSS sem criar consumidor, e drop/importação continuam no legado.
- G2n: picker em apresentação de trades; fixture documenta CSS sem criar UI ou lógica inexistente.
- G2o: tags compartilhadas permanecem em `src/styles`; renderizadores e mutações de configuração continuam no legado.
- G2p: alertas e utilities compartilhados permanecem em `src/styles`; fluxos e overrides específicos continuam nos módulos/residual.
- G2q: barra em lote e fluxo do modal pertencem à apresentação de trades; handlers continuam no legado.
- G2r: premarket e chips divididos por consumidor em rotina e trades, com links adjacentes.
- G2s: layout de transferência pertence à apresentação; overrides responsivos e IO permanecem no legado.
- G2t: diálogo é apresentação comum em `src/styles`; handlers, wrappers e callbacks permanecem no legado.
- G2u: complemento tardio da navegação em `src/styles`; estilos anteriores e handlers permanecem na posição original.
- G2v: grids já agrupados entre features em `src/styles`; overrides responsivos e margem do último filho ficam na posição original.
- G2w: estilos nativos pertencem à apresentação do StudyHub; consumidores legados e regras nativas não montadas são preservados, sem nova abstração.
- G2x: resumos compartilhados permanecem em `src/styles`; renderers/geração dos dados e overrides responsivos continuam na posição original.
- G2y: documentos em dois componentes contíguos de apresentação; carga global, metadados agrupados, override tardio de vazio e responsividade mantidos.
- G2z/G3c: visão geral e renderer de contas em `presentation`; cálculo, handlers e overrides responsivos continuam na posição original.
- G2aa: estilos de parceiros em `presentation`; configuração, handlers e overrides responsivos continuam na posição original.
- G2ab: complemento da nuvem de tags em `src/styles`, após parceiros; renderer/estado não mudam.
- G2ac: keyframes comuns em `src/styles`; consumidor `.page.active` e timing permanecem anteriores, media queries tardias intactas.
- G2ad: media queries gerais de desktop/tablet em `src/styles`; bytes, ordem da cascata e overrides mobile posteriores preservados.
- G2ae: media queries mobile em `src/styles`; link substitui `styles.css` na mesma posição e mantém as regras StudyHub posteriores.
- G3a: renderer de perfil em `presentation`; mantém leituras de estado e chamadas de métricas/risco/alertas no momento da renderização, sem nova camada.
- G3b: renderer de parceiros em `presentation`; configuração, IO, salvamento e callbacks inline permanecem no legado.
- G3c: renderer de contas em `presentation`; contas/risco são consultados na chamada e salvamento/exclusão continuam no legado.
- G3d: renderer de documentos em `presentation`; estado de pasta/seleção, mídia, ações e persistência continuam no legado.
- G3e: renderer do premarket em `presentation`; estado de mês/hábitos, navegação e persistência continuam no legado.
- G3f: renderer do hub de estratégias em `presentation`; snapshots, ranking, status e formatação continuam no legado.
- G3g: renderer de psicologia em `presentation`; seleção de trades, estatísticas subjetivas, filtros e criação de gráficos continuam no legado.
- G3h: renderer de notificações em `presentation`; geração dos alertas e renderer compartilhado permanecem no legado.
- G3i: renderer do calendário em `presentation`; estado, handlers e métricas permanecem no legado. O filtro do período exclui o último dia pelo limite à meia-noite, enquanto a grade inclui seus trades; comportamento existente preservado.
- G3j: apresentação de stops/taxas em `presentation`; cálculo financeiro, filtros e formatação compartilhada permanecem no legado.
- G3k: calendário compacto do dashboard em apresentação de calendário; data âncora e helpers continuam no legado.
- G3l: linhas de estratégias em apresentação de analytics, compartilhadas pelos consumidores existentes; snapshots, ranking e formatação permanecem no legado.
- G3m: renderer principal do dashboard em apresentação de analytics; métricas, filtros, estado e handlers permanecem no legado.
- G3n: painel de risco em apresentação de contas; cálculo financeiro e estado permanecem no legado. Impacto restrito à localização da declaração e ordem de carga, sem alteração de dados/contratos.
- G3o: controles do calendário em apresentação da feature; estado, consulta de trades e formatação permanecem no legado. API global e handlers inline preservados.
- G3p: estatísticas de psicologia em apresentação da feature; helpers de seleção/estatística permanecem no legado; cálculos locais do renderer foram movidos intactos.
- G3q: lista de status em `src/shared/presentation` por reutilização confirmada; preservadas interpolações legadas e handlers globais, sem saneamento comportamental neste lote.
- G3r: resumos analíticos em `src/shared/presentation` por reutilização confirmada; produtores e cálculos permanecem nas features.
- G3s: mídia de documentos em apresentação da feature; helpers de imagens, remoção e persistência permanecem no legado.
- G3t: caixa temporário do formulário em apresentação de contas; cálculo, estado, edição e persistência permanecem no legado.
- G3u: lista de caixa do setup em apresentação de contas; consulta, cálculo, edição e persistência permanecem no legado.
- G3v: resumo de risco do setup em apresentação de contas; conta, trades e cálculo financeiro permanecem no legado.
- G3w: lista do seletor em apresentação de contas; ações, risco, trades e interpolações legadas permanecem globais.
- G3x: composição da configuração em apresentação de contas; estado, formulário, tags, salvamento e cálculos permanecem nas dependências existentes.
- G3y: resumo da conta ativa em apresentação do shell; normalização, seleção, tipo e métricas permanecem globais.
- G3z: ícones de pastas em apresentação de documentos; navegação, estado e persistência permanecem nas dependências existentes.
- G3aa: filtro de contas em apresentação de transferência; contas, escaping, leitura dos filtros e exportação permanecem nas dependências existentes.
- G3ab: resumo do backup em apresentação de transferência; criação/formatação do payload, importação, restauração e exportação permanecem nas dependências existentes.
- G3ac: valor responsivo do topbar em apresentação do shell; cache, densidade, formatação e atualização das métricas permanecem nas dependências existentes.
