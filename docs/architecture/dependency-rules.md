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

## Ciclos e duplicação
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
