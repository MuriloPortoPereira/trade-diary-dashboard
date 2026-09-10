# ADR-001: Extração incremental com scripts clássicos

## Context
App estático com handlers inline, funções globais, IIFEs legados e deploy sem build.
Converter todo o código para ES modules alteraria escopos e carregamento ao mesmo tempo.

## Decision
Organizar por feature. Extrair primeiro regras puras de simulação para IIFE com namespace
`TradeDiarySimulationSizing`; manter declarações globais delegando em `app.js`.
Carregar domínio antes do legado, sem async, framework ou bundler.

## Consequences
Testabilidade imediata sem migração de runtime. Domínio sem DOM/storage/Chart.js.
Persistem globals e dependência explícita da ordem de scripts; namespace é ponte temporária.
Helpers internos deixam de depender de substituições externas dos helpers globais;
auditoria não encontrou consumidores que façam essa substituição para sizing.
Remover wrappers/migrar ESM apenas com consumidores e distribuição cobertos.
