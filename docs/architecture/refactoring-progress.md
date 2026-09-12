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

## Current
- G1 concluído: quatro CSS legados StudyHub em `presentation`, com 344/359/174/334 linhas.
- `styles.css`: 6.090 → 4.879 linhas; 1.211 linhas movidas sem reescrita. Cinco links mantêm a cascata original.
- Caracterização anterior ao corte: fingerprint integral do CSS, 22 checks no navegador e 64 capturas determinísticas sem erros.
- Após extração: 59 testes, 22 checks no navegador, sintaxe de cinco scripts e `git diff --check` aprovados.
- 64 comparações antes/depois: pixels, estilos computados, geometria e storage idênticos; zero erros de console/runtime e assets locais ausentes.
- Revisão independente sem bloqueios: concatenação de 162.576 bytes idêntica ao original; cinco CSS parseados sem erros; scripts/handlers intactos.
- Ferramenta de captura teve seletor com aspas inválidas na primeira execução; corrigido somente no teste, baseline refeita antes da extração.
- JS da aplicação não alterado. Sem dependências de runtime, push ou deploy.

## Next
- G2: escolher um bloco contíguo de CSS comum/feature no [mapa](css-extraction-map.md), preparando cobertura específica antes do corte.
- Seguir as prioridades do [roadmap](refactoring-roadmap.md); uma responsabilidade por lote.
- Métricas continuam frente de domínio pendente; não misturar extração visual com mudança de cálculo.

## Risks
- Monólitos permanecem grandes, com justificativa temporária no roadmap.
- Sem cobertura ampla de persistência, importação, trades, risco por calendário e StudyHub.
- Smoke cobre janela inicial e fluxo específico; não captura erros silenciados/console.error ou falhas assíncronas posteriores.
- Runner visual G1 captura console/runtime durante as visitas; comparação permite erros preexistentes iguais (baseline G1: zero).
- G1 compara pixels das quatro abas principais StudyHub, apenas subabas iniciais e viewport de 1.000px de altura.
- Sem cobertura visual de hover/focus/scroll ou elementos ocultos; demais páginas, migrações e Monte Carlo completo permanecem sem validação ampla.
- Fixture visual fixa relógio/RNG/cotação; fontes externas podem usar fallback. Igualdade observada vale para esse ambiente.
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
