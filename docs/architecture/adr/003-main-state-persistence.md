# ADR-003: Persistência principal em scripts clássicos

## Context
Seis chaves tl_* guardam estado transversal. save serializa e grava campo por campo;
load lê todas as chaves antes de aplicar dados e pode manter alterações parciais após falha.
Capturar um snapshot antecipado alteraria a ordem observável da gravação.

## Decision
IO em src/app/infrastructure/app-state-storage.js: save global intacto e
readPersistedAppState devolvendo os seis valores brutos na ordem original.
Normalização/restauração em src/app/application/load-app-state.js, consumindo esse
contrato de leitura. Preservar parse, atribuições, erros, scripts clássicos e APIs.

## Consequences
Leitura substituível em testes sem storage; formato e chaves sem migração.
save e restauração ainda usam estado/adaptadores globais como dívida transitória.
Nenhum snapshot, repository, interface abstrata ou dependência de runtime adicional.
Seeds/bootstrap e persistências auxiliares permanecem fora deste lote.
