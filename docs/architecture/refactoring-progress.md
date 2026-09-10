# Refactoring Progress

## Completed
- Baseline `ab0cb63`, branch `develop/clean-architecture`, sem mudanças locais preexistentes.
- Caveman local; Superpowers via marketplace; MCPs locais Serena e Context7.
- Serena: ativação automática da raiz, overview, símbolo e referências de sizing.
- Context7: resolução Node.js e consulta real da documentação do test runner v24.
- Auditoria estrutural, mapa, fronteiras propostas e revisão independente do lote 1.

## Current
- Lote 1: caracterizar e extrair sizing da simulação sem alterar cálculos.

## Next
- Validar antes/depois, revisar diff e atualizar resultado do lote.
- Lote 2 proposto: serialização CSV; detalhado no roadmap.

## Risks
- Monólitos permanecem grandes, com justificativa temporária no roadmap.
- Sem cobertura ampla de persistência, importação, trades e StudyHub.
- Novos MCPs verificados por cliente MCP local; esta conversa não os expõe como ferramentas nativas.
- Dependências CDN e cotação dependem de rede; nenhum deploy realizado.

## Decisions
- ADR-001: scripts clássicos e globals temporários.
- ADR-002: testes de caracterização antes das extrações.
