# ADR-002: Caracterização antes de extrações

## Context
Baseline não tem testes, package manager, lint ou build. Regras financeiras incluem
parsing permissivo, arredondamento e defaults que precisam permanecer iguais.

## Decision
Usar `node:test`, `node:assert/strict` e `node:vm` para expectativas explícitas antes da extração.
Carregar apenas as funções necessárias do legado; depois testar domínio isolado e wrappers.
Verificar no navegador a carga real e o fluxo da simulação em perfil descartável.
Ferramentas de teste não entram no runtime da aplicação.

## Consequences
Cobertura pequena e deliberada; não comprova todos os fluxos de trades, backup ou StudyHub.
Cada próximo lote amplia caracterização da responsabilidade escolhida.
Não tratar sintaxe como lint/typecheck; registrar verificações indisponíveis.
