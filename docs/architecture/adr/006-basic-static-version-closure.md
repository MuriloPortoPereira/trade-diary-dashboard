# ADR-006: Encerrar a versão básica estática

## Context

O objetivo atual é concluir a organização do código existente e preservar o percurso de aprendizagem como versão estática definitiva deste repositório. A fragmentação inicial dificultou localizar responsabilidades; a consolidação reduziu 95 scripts/40 CSS para 48/22.

## Decision

- Encerrar esta etapa com módulos coesos por feature/camada. Não continuar cortando por quantidade de linhas ou função.
- `app.js` mantém estado/defaults, composição e APIs globais ativas em 181 linhas. Controllers ficam nas features; cálculos centrais são puros e IO tem adaptadores próprios.
- Preservar scripts clássicos, handlers inline, namespaces, defaults, closures/pontes StudyHub, ordem dos inicializadores e contratos de dados. Remover esses contratos não traz benefício à manutenção desta distribuição estática.
- Aceitar como limites desta versão: estado/adaptadores globais nos workflows, queries que usam formatadores globais, controllers de documentos/rotina/StudyHub com cálculos locais e chamadas de cotação legadas distintas. Não afirmar isolamento integral de Clean Architecture.
- `normalizeDocImages` é normalização pura do formato de mídia das operações legadas; fica em `trades/domain/trade-rules.js`, também consumida por documentos/importação. Evita depender da UI documental sem criar um módulo shared por seis linhas. Rever a coesão ao projetar novos modelos.
- Fontes de produção JS ficam abaixo de 800 linhas. HTML grande é distribuição gerada a partir de views/templates legíveis; não fazer montagem assíncrona apenas para reduzir o tamanho do arquivo distribuído.
- Este repositório permanece em JavaScript clássico; migração para framework está fora do seu escopo. Novas funcionalidades e correções de comportamentos legados exigem plano próprio. Não integrar `main`/`develop` incidentalmente.

## Consequences

Poucos pontos de entrada por feature, núcleo testável, distribuição estática e dados/APIs compatíveis. Novas features devem usar os owners existentes e não retornar ao monólito.

A arquitetura é uma organização prática com núcleo puro e adapters clássicos, não um grafo totalmente desacoplado. O mapa atual distingue esses limites; as propostas históricas não são uma lista infinita de novas extrações.

Critérios verificados: caracterização antes dos cortes; 637 casos Node em 104 arquivos; 113 checks de navegador isolado; sintaxe dos 180 scripts; geradores sincronizados; diff limpo; revisão independente sem bloqueios. CSS e marcação da UI preservados; só o registro do arquivo de regras de trades foi renomeado no fechamento. Essa cobertura não comprova todos os estados possíveis nem substitui a revisão visual do usuário.
