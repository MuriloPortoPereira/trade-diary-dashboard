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
- Lotes 1–2 e 2b de idiomas concluídos; monólitos ainda exigem próximos cortes por responsabilidade.

## Next
- Lote 3 proposto: métricas puras, após caracterizar trades abertos/fechados, perdas/empates, filtros e datas.
- Escolher um lote por vez no [roadmap](refactoring-roadmap.md); não iniciar migração ampla de IO ou UI.

## Risks
- Monólitos permanecem grandes, com justificativa temporária no roadmap.
- Sem cobertura ampla de persistência, importação, trades, risco por calendário e StudyHub.
- Smoke cobre janela inicial e fluxo específico; não captura erros silenciados/console.error ou falhas assíncronas posteriores.
- Sem comparação visual por pixels, teste de migração ou validação completa de Monte Carlo.
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
