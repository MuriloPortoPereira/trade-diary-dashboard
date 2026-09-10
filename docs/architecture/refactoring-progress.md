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

## Current
- Auditoria inicial e primeiro lote seguro concluídos; migração completa permanece incremental.

## Next
- Lote 2 proposto: serialização CSV com colunas, quoting, arrays, vazios e wrapper `buildTradesCSV(list=trades)`.
- Escolher um lote por vez no [roadmap](refactoring-roadmap.md); não iniciar migração ampla de IO ou UI.

## Risks
- Monólitos permanecem grandes, com justificativa temporária no roadmap.
- Sem cobertura ampla de persistência, importação, trades, risco por calendário e StudyHub.
- Smoke cobre janela inicial e fluxo específico; não captura erros silenciados/console.error ou falhas assíncronas posteriores.
- Sem comparação visual por pixels, teste de migração ou validação completa de Monte Carlo.
- Novos MCPs verificados por cliente MCP local; ferramentas nativas exigem nova sessão/reinicialização.
- CDN e cotação dependem de rede. Lint/typecheck/format/build inexistentes, não reportados como aprovados.

## Decisions
- ADR-001: scripts clássicos, namespace e globals temporários; preservar APIs/dados/cálculos.
- ADR-002: caracterização antes das extrações; Node built-ins e Chrome isolado sem npm dependencies.
- Memória Serena contém somente ponte para documentos canônicos, evitando duplicação de contexto.
