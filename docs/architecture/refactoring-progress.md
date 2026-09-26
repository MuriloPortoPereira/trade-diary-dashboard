# Refactoring Progress

## Overall status
- Preparação concluída: ambiente, auditoria, AGENTS, mapas, arquitetura alvo e ADRs.
- Implementação parcial: sizing, CSV, idiomas, G1 e os cortes G2 registrados abaixo.
- G2 em andamento; faltam estilos residuais. G3–G6 continuam como frentes de JavaScript, domínio, IO e StudyHub.
- G7 depende da migração dos consumidores e de decisão sobre composição estática do HTML.
- Testes, revisão e documentação acompanham cada lote; isso não equivale à validação integral da aplicação.
- Sequência e critérios de conclusão: [roadmap](refactoring-roadmap.md).

## Completed
- Baseline `ab0cb63`, branch `develop/clean-architecture`, sem mudanças locais preexistentes.
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

## Current
- G2l concluído: `src/modules/calendar/presentation/calendar-toolbar.css` com 27 linhas/394 bytes e cinco regras completas.
- `styles.css`: 2.276 para 2.249 linhas; vinte links preservam os 162.576 bytes originais concatenados.
- Caracterização antes do corte: fingerprint integral e baseline ampliada para 598 casos.
- Cobertura: foco do seletor, paddings, dimensões e tipografia em três larguras; week/biweek nas 17 larguras existentes.
- Primeira assertion esperava gap 12px; `.gap-8` tardio mantém 8px por mesma especificidade. Baseline refeita antes do corte.
- Dados e storage permanecem iguais; handlers, APIs e modos do calendário não mudaram.
- Após extração: 59 testes Node, 27 checks no navegador, sintaxe e diff aprovados; 598 estados visuais idênticos e 27 imagens com diferenças limitadas a 157 pixels de rasterização.

## Next
- G2m: revisar upload comum (baseline 2631–2671), primeiro bloco residual; caracterizar hover, drag e input oculto antes de extrair.
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
- G2a–G2l cobrem estados iniciais das 15 páginas em três larguras, shell/ações em 17 larguras, quatro modais sem submissão e abas compartilhadas; não cobrem toda a aplicação.
- G2d acrescenta dashboard/risco em 1420±1 e tooltips por eventos DOM; não comprova hit testing físico nem todas as variantes financeiras.
- G2e verificou scroll horizontal e dimensões/overflow; G2i acrescenta fixture com 20 operações e scroll vertical para exercer o cabeçalho sticky.
- G2f caracteriza apresentação com renderers reais e entradas sintéticas; não audita cálculos financeiros nem testa submissão/exclusão de caixa.
- G2g usa dois trades sintéticos com estratégias distintas; não audita fórmulas, timing, grandes amostras ou o popup nativo dos seletores.
- G2h cobre modos e datas-limite com fixture fixa; não audita todas as somas/períodos/fusos. month usa API global; popup nativo do mês e animação em movimento ficam fora.
- G2i caracteriza apresentação das flags de incompletude; não audita sua regra, ordenação de todas as colunas, exclusão, duplicação ou conclusão/salvamento.
- G2j não testa submissão/validação, popup nativo do select, arraste do textarea ou animação em movimento; `.field-hint` não possui consumidor encontrado.
- G2k não confirma importação nem diálogo, não testa Escape e não cobre todas as subabas internas do StudyHub legado.
- G2l não abre o popup nativo do input month; esse popup varia por navegador/OS.
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
