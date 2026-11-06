# Regras de dependência

| Origem | Permitido | Proibido |
|---|---|---|
| Domain | Funções puras, dados, built-ins de JS | DOM, Chart.js, fetch, localStorage, apresentação |
| Application | Domain, contratos de IO realmente necessários | Elementos HTML, Chart.js, acesso direto a storage |
| Infrastructure | Contratos da aplicação, dados do domínio, APIs externas | Decidir regras de negócio na serialização |
| Presentation | Application, modelos de apresentação | Duplicar regras de domínio |
| Composição (`app.js`) | Conectar as camadas e fornecer adaptadores | Criar novas responsabilidades no monólito |

## Transição
- Legado ainda viola separações; não declarar migração concluída.
- Novo script de domínio carrega antes de `app.js`, sem `async` ou troca para `type=module`.
- Preservar globals usados por HTML, `window.sh_*`, defaults e ordem de inicialização.
- Namespace global é adaptador de carregamento temporário, não acesso do domínio ao navegador.
- Não usar `../../../../`; caminhos de scripts partem do shell. Aliases somente com suporte verificado.
- Criar contratos por parâmetro quando houver IO a inverter; dispensar interfaces sem consumidor real.
- G5d: restauração hoje em `data-transfer/application/transfer-workflows.js` (antes `restore-backup.js`) mantém estado/adaptadores globais como exceção transitória documentada; inversão pendente. Corpo intacto preserva alterações parciais nas falhas, sem DOM/storage direto.
- G5g: domínio de importação recebe resolvedor de chave por parâmetro; não consulta conta/pendências globais. Preparação em application mantém adaptadores legados transitórios de estado, relógio e normalização, sem DOM/storage direto.
- G5h: load em application usa readPersistedAppState (contrato de leitura bruta), sem storage direto. IO em app/infrastructure; save preserva acesso sequencial ao estado global como dívida transitória, sem snapshot antecipado.
- G7e: projeção numérica recebe dados e RNG explícitos; mensagens e moeda ficam no painel. Wrappers clássicos de sizing/Monte Carlo preservam assinaturas.
- G7c–G7i: controllers coesos por feature continuam com estado global legado; queries de estratégia em application usam métricas/formatadores globais como exceção transitória. `normalizeDocImages` ainda é consumido por trades/importação a partir da apresentação documental; inversão pendente, sem alegação de domínio puro.

## Compatibilidade verificada (G7j)
- Manter wrappers que fornecem defaults/estado/tradução: timing, sizing, CSV, payload de backup e resumo. `buildTradesCSV(list=trades)` continua contrato público.
- Pontes `window.sh_*` e wrappers intraday mantêm closures, retornos e efeitos; intraday agenda atualização e não é alias descartável.
- Remover somente após migrar todos os consumidores e proteger seus contratos, com ganho real de manutenção. Permanência é decisão explícita nesta fase.
- `tests/classic-script-contract.test.cjs` verifica arquivos/duplicatas, carga clássica síncrona, compilação e ordem de providers. Referências por regex são heurísticas; inicialização/DOM continuam cobertos pelo smoke.

## Ciclos e duplicação
Consolidação por feature: cálculos de contas/simulação permanecem em domínio; formatos e IO de transferência são adaptadores distintos; fluxos ficam em aplicação; cada workspace UI agrupa apresentação. Os nomes globais existentes são preservados. UI somente declara funções durante a carga; providers IIFE com leitura imediata mantêm ordem interna. Catálogos executam os mesmos Object.assign antes do seletor. Não criar arquivos por função nem fundir camadas para reduzir contagem.

Baseline não tem imports/exports: não há grafo de imports com ciclos a resolver.
Grafo real inclui globals, DOM, handlers em strings e wrappers; procurar referências antes de mover.
Novo fluxo de sizing: HTML carrega domínio; wrappers chamam domínio; domínio não chama legado.
Não criar import dinâmico para ocultar ciclos. `renderLog` do legado está em outro escopo.
Cotações duplicadas usam estados/chaves diferentes: mapear antes de consolidar.
Não remover stubs (`calcSaque`, `calcRRRManual`) ou `if(false)` sem verificar consumidores.

## Revisão por lote
Rever diff, referências semânticas + handlers textuais, ordem de scripts, testes e persistência.
Verificações de independência do primeiro domínio vivem em `tests/simulation-sizing.test.cjs`.
Não há linter arquitetural geral instalado; o restante ainda exige revisão localizada.
