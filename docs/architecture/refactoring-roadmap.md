# Refactoring Roadmap

**Goal:** Preservar comportamento e reduzir acoplamento por extrações pequenas.
**Architecture:** Domínios puros por feature; scripts clássicos e wrappers compatíveis durante a transição.
**Tech Stack:** JavaScript, HTML/CSS, Chart.js CDN, Node.js apenas para ferramentas/testes.
**Spec:** [Arquitetura alvo](target-architecture.md), [regras](dependency-rules.md) e `AGENTS.md`.

## Restrições globais
Sem reescrita, mudança de produto/API/storage, runtime dependency ou push.
Caracterizar antes de extrair; testar, verificar sintaxe e revisar diff depois.
Não separar arquitetura, nomenclatura e comportamento no mesmo lote.

## Lotes
| Ordem | Entrega | Proteção necessária | Saída |
|---|---|---|---|
| 0 | Ambiente e mapa | Git limpo, MCPs com chamadas reais | AGENTS, mapa, ADRs |
| 1 | Sizing da simulação | Caracterização de parsing, arredondamento e wrappers | Primeiro domínio isolado |
| 2 | Serialização CSV | Colunas, quoting, arrays, vazios e default `trades` | Serializer + wrapper compatível |
| 3 | Métricas puras | Trades abertos/fechados, perdas/empates, filtros e datas | Regras de analytics |
| 4 | Persistência | Round-trip de backup, chaves, seeds, dados antigos, falhas | Adaptador de storage sem migração |
| 5 | `saveTrade` | Payloads, validação, status e sequência de efeitos | Preparação da operação e use case |
| 6 | Risco de contas | Relógio/fuso, períodos e limites | Cálculo separado de strings/UI |
| 7 | StudyHub | Montagem, shims, tabs e storage; smoke amplo | Bundle isolado, depois subfeatures |
| 8 | CSS/HTML | Comparação visual, handlers e cascata | Arquivos por feature mantendo ordem |
| 9 | Compatibilidade antiga | Todos consumidores migrados e revisados | Remover wrappers aprovados |

Próximos lotes são propostas: executar individualmente com testes adequados; não representam autorização para alterar comportamento.

## Primeiro lote: sizing
Arquivos: criar `src/modules/simulation/domain/calculate-simulation-sizing.js`,
`tests/simulation-sizing.test.cjs`; alterar apenas funções correspondentes em `app.js`
e adicionar script antes de `app.js` em `index.html`.

Interfaces preservadas:
```js
toSimulationNumber(value, fallback=0)
roundSimulationMoney(value)
calculateSimulationSizing({balance=0,riskPct=0,goalPct=0,stopPct=0}={})
// Retorno: {balance, riskPct, goalPct, stopPct, riskUsd, goalUsd, stopUsd}
```

- [x] Fixar expectativas no código original usando `node:test`/`node:vm`.
  Caso nominal: saldo 1000, percentuais 1/5/3 => valores 10/50/30.
  Incluir defaults, inválidos, negativos, `parseFloat`, dinheiro arredondado primeiro,
  percentuais >100, overflow, TypeError para null e ausência de mutação.
- [x] Executar `node --test tests/simulation-sizing.test.cjs` antes de alterar aplicação.
- [x] Registrar smoke baseline em navegador isolado: carga, navegação e simulação.
- [x] Extrair funções sem reescrever cálculos; publicar `TradeDiarySimulationSizing` por IIFE.
- [x] Manter declarações globais com assinaturas iguais delegando ao domínio.
- [x] Executar testes contra domínio e wrappers; conferir script e ausência de dependências DOM/IO.
- [x] Executar smoke após extração, `node --check` e `git diff --check`.
- [x] Revisar com agente independente; atualizar mapa/progresso e criar commit conceitual.

## Arquivos >1.000 linhas: exceções temporárias
`app.js`, `styles.css` e `index.html` permanecem grandes ao final do lote 1.
Justificativa: bootstrap, globals/handlers, DOM e cascata ainda não têm cobertura ampla;
um corte por tamanho causaria mudança simultânea de vários contratos.
Responsáveis e remoção da exceção: lotes 2–7 reduzem JS; lote 8 separa apresentação.
`TRANSLATIONS` é majoritariamente dado declarativo; extração futura não precisa mudar chaves.
Cada próxima sessão escolhe um lote; não aceita crescimento novo indiscriminado nesses arquivos.
