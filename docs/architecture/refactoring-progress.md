# Refactoring Progress

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

## Current
- G2b concluído: `src/styles/page-surfaces-and-headers.css` com 246 linhas/10.037 bytes.
- `styles.css`: 4.180 para 3.934 linhas; dez links preservam os 162.576 bytes originais concatenados.
- Antes do corte: fingerprint integral, 27 checks no navegador e baseline ampliada para 211 casos.
- Depois: 59 testes Node, 27 checks no navegador, sintaxe e diff aprovados; revisão independente sem bloqueios.
- 211 estados exatos (estilos, geometria, máscaras, fontes, display das páginas e storage); zero erros de console/runtime ou assets locais ausentes.
- 11 capturas com 170 pixels de diferença dentro da tolerância numérica existente; limites não ampliados.
- Runner inclui pseudo-elementos das superfícies/cabeçalhos, cinco abas de análise por handlers reais e fade-up antes de desativar animações.
- `app.js`, scripts e handlers preservados; somente um link acrescentado no HTML. Sem novas dependências, push ou deploy.

## Next
- G2c: revisar botões e intervalos de datas (baseline 946–1059), primeiro bloco residual, e caracterizar estados/consumidores antes de extrair.
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
- G2a/G2b cobrem estados iniciais das 15 páginas em três larguras, shell em 14 larguras, dois modais sem submissão e cinco abas de análise; não cobrem toda a aplicação.
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
