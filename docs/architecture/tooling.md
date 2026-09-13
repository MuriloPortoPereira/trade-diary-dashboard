# Ferramentas e verificações

Verificado em 2026-09-10. Codex CLI 0.154.0, Node.js 24.21.0, Python 3.12.3.
Configuração MCP por projeto: `.codex/config.toml`. Nenhuma dependência de runtime adicionada.

| Ferramenta | Resultado | Evidência |
|---|---|---|
| Caveman | OK | Skill local `.agents/skills/caveman/SKILL.md`; origem JuliusBrussee/caveman e `skills-lock.json` |
| Serena | OK | MCP 1.7.1.dev0; raiz ativada, `get_symbols_overview`, `find_symbol`, `find_referencing_symbols` reais |
| Context7 | OK | MCP 4.0.7; `resolve-library-id` e `query-docs` para Node.js v24 retornaram documentação |
| Superpowers | OK | `superpowers@openai-curated-remote` 6.3.0, instalado por `codex plugin add` |

MCPs habilitados detectados: `cua_repl`, `node_repl`, `serena`, `context7`.
`codex mcp list` comprova configuração/habilitação, não conexão de uma sessão específica.
Os novos servidores foram iniciados e testados via cliente MCP stdio temporário nesta sessão;
seus nomes não foram adicionados automaticamente à lista de ferramentas nativas da conversa.
Na próxima sessão/reinicialização, conferir `/mcp` e ativar a raiz com `activate_project`.
As skills instaladas ficam disponíveis na próxima interação; os SKILL.md usados foram lidos nesta sessão.

Atualização do lote 2: Serena e Context7 estão disponíveis como ferramentas nativas.
Raiz ativada com `activate_project`; `find_symbol` e `find_referencing_symbols` usados no CSV.
Context7 não foi consultado: o lote não exige documentação externa.
Caveman local lido. Superpowers não foi exposto no catálogo de skills desta sessão;
a tentativa de conferir `~/.codex/plugins/installed_plugins.json` encontrou caminho inexistente.
Mantido o registro anterior de instalação; revisão independente e verificações executadas diretamente, sem reinstalação.

## Instalar em outra máquina

```bash
# Somente Caveman para Codex, escopo local do projeto
npx -y skills add JuliusBrussee/caveman -a codex --skill caveman -y

# Plugin recomendado atualmente pelo projeto Superpowers
codex plugin add superpowers@openai-curated-remote

# Com uv/uvx instalado, aquece o cache e verifica a CLI Serena
uvx --from git+https://github.com/oraios/serena serena start-mcp-server --help

# Verificar configuração carregada a partir da raiz confiável
codex mcp list
```

`uv` não existia nesta máquina: instalado isoladamente com `python3 -m venv`
em `~/.local/share/codex-tooling/uv-env`, `pip install uv` nesse ambiente e links
`~/.local/bin/uv`/`uvx`. Versão instalada: 0.12.13. Não alterou o Python do sistema.
Serena resolvida no commit `701e7c843f46c6a649203a488cece1bf19f1df90`.
Config usa upstream; novas instalações podem resolver revisões diferentes: validar novamente.

Context7 usa `npx -y @upstash/context7-mcp`, conforme `.codex/config.toml`.
Não exigiu chave na consulta verificada; autenticação/cotas podem mudar.
Não grave segredos em arquivos versionados.

Caveman local é ignorado no Git; reinstalar pelo comando acima, não instalar o pacote npm `caveman`.
Superpowers é instalação do usuário, não dependência do app. Não duplicar suas skills no projeto.
Não foram adicionados hooks globais nem alterados modelos, permissões ou orçamento de tokens.

## Uso econômico

- Caveman `full` no cotidiano, `lite` em arquitetura; comandos/código/erros intactos.
- Serena para código interno. Limitar caminho, símbolo e tamanho de resposta.
- Context7 somente para documentação externa; nunca enviar dados/código privado.
- Superpowers: planejamento arquitetural, caracterização, revisão e verificação; execução direta para ajustes triviais.
- Onboarding operacional fica em `AGENTS.md` e nos mapas; memória Serena `core` aponta para essas fontes, sem duplicar conteúdo.

## Verificação do projeto

```bash
node --test tests/*.test.cjs
node --check app.js
node --check src/modules/simulation/domain/calculate-simulation-sizing.js
node --check src/modules/data-transfer/infrastructure/serialize-trades-csv.js
node --check tests/trades-csv.test.cjs
node --check tests/language-selector.test.cjs
node --check scripts/browser-smoke.cjs
node scripts/browser-smoke.cjs
git diff --check
```

Domínio extraído no lote 1. Resultado efetivo: [progresso](refactoring-progress.md).
Lint, typecheck, formatador e build não existem no baseline; não foram simulados ou marcados como aprovados.

Smoke requer Chrome/Chromium instalado. Por padrão usa `google-chrome`;
para outro binário: `CHROME_BIN=/caminho/chromium node scripts/browser-smoke.cjs`.
Cria servidor HTTP em loopback com porta aleatória e perfil temporário; remove perfil ao terminar.
Chrome headless roda com `--no-sandbox` para compatibilidade do ambiente de teste;
o probe acessa somente a aplicação e seus recursos externos, nunca o perfil pessoal.
Verifica CDN Chart.js, inicialização, navegação, tab de simulação, handler inline,
valores 10/50/30, API global, storage inalterado e retorno ao dashboard.
No lote 2, soma três checks CSV: saída com arrays/aspas/vírgula/LF, default `trades`
e compatibilidade de helper/cabeçalhos. Total: 14 checks; não realiza download real.
No lote 2b, soma quatro checks de idioma: handler EN, catálogo renderizado, handler PT e
preservação dos dados de storage exceto `appLanguage`. Total no lote 2b: 18 checks.
Somente o perfil temporário recebe a escolha de idioma; não acessa dados pessoais.
Requer rede para os recursos CDN/fontes e falha em erros de script ou assets locais ausentes.
Resultado coletado após `load + 250ms`; não captura erros assíncronos posteriores,
erros silenciados ou mensagens de `console.error`. Verifica Chart.js real pela versão.
Storage é comparado somente entre navegação e simulação, após bootstrap.
Não cobre todos os fluxos, migrações de dados nem compara pixels.

## Comparação visual StudyHub (G1)

Smoke ampliado para 22 checks: montagem e navegação pelas quatro abas principais.
A comparação visual usa Node.js 24 (WebSocket nativo), Chrome/CDP e perfil temporário;
`scripts/lib/study-hub-browser.cjs` atende somente assets locais da aplicação.
Nenhuma dependência npm foi adicionada.

```bash
# Executar capture ANTES da alteração, compare DEPOIS; destinos novos e fora do repositório.
node scripts/study-hub-style-check.cjs capture /tmp/study-hub-before
node scripts/study-hub-style-check.cjs compare /tmp/study-hub-before /tmp/study-hub-after
node --test tests/study-hub-styles.test.cjs
```

São 64 casos: quatro abas × 16 larguras (390 e breakpoint ±1/igual para 720, 768, 900, 1200, 1600).
Relógio/RNG/cotação e dados sintéticos fixos; animações desativadas; aguarda fontes/resize/gráficos.
Salva PNG, JSON com estilos/geometria/storage e relatório SHA-256. Exige igualdade de pixels e estado;
verifica links carregados/404 e compara console/runtime. Erros preexistentes iguais são tolerados;
a baseline G1 teve zero. Artefatos desta execução: `/tmp/trade-diary-g1-baseline` e `/tmp/trade-diary-g1-after`.
São temporários, não versionados; recapturar em cada ambiente e antes de cada próximo corte.

Limites: somente subabas iniciais, viewport de 1.000px de altura, sem scroll/hover/focus;
snapshot considera elementos renderizados e não comprova demais fluxos ou Monte Carlo.
Fontes externas dependem da rede; `document.fonts.ready` não garante download bem-sucedido.
O fingerprint em `tests/study-hub-styles.test.cjs` fixa todo o CSS anterior na ordem efetiva dos links;
atualizá-lo em mudanças visuais futuras exige nova baseline, não mera aceitação de um hash diferente.

G1: Serena ativada na raiz; CSS inspecionado por cortes localizados e parsing, pois navegação semântica
está configurada para JavaScript/TypeScript. Context7 disponível, sem necessidade de consulta externa.
Caveman e skills Superpowers disponíveis e utilizados. Primeira captura falhou por aspas no seletor
do próprio runner; ajuste local corrigido e baseline concluída antes de mover CSS.

Git local usa `core.autocrlf=input`; o primeiro stage normalizou dois arquivos novos.
`.gitattributes` fixa `-text` somente no CSS residual e nos quatro blocos legados;
`git add --renormalize` refez o índice com os bytes originais, conferidos contra HEAD.
`whitespace=-blank-at-eof,cr-at-eol` preserva separadores finais e CRLF herdados;
demais verificações de whitespace permanecem ativas. `git diff --check` e `--cached --check` passaram.

## Comparação visual do shell (G2a)

```bash
node scripts/shell-style-check.cjs capture /tmp/shell-before
node scripts/shell-style-check.cjs compare /tmp/shell-before /tmp/shell-after
```

Capturar antes de editar CSS; comparar depois, usando diretórios novos. O runner reutiliza o
Chrome/CDP isolado e a fixture do StudyHub; importar essa fixture não executa o CLI StudyHub.
São 196 casos: 15 páginas em 390/1080/1440px e dashboard mais dez estados em 14 larguras
(390, 1440 e breakpoint ±1/igual para 440, 720, 1080, 1240).

Estados: sidebar aberta, navegação com hover, botão/menu/opção de idioma, foco e hover de cotação,
hover da conta e modais de conta/operação abertos. Hover é forçado via CDP; foco usa `.focus()` com
assertion do elemento ativo. O smoke soma cinco checks de menu, clique externo, sidebar, overlay e
navegação; total 27. O teste de bytes G1 continua protegendo todos os nove links de CSS.

A comparação exige igualdade exata de estilos, geometria, fontes e storage; exige zero console/runtime errors
e assets locais ausentes. Verifica `cot-spin` antes de desativar animações e carrega explicitamente
todas as faces declaradas após cada montagem para evitar diferenças incidentais nos pesos baixados durante o layout inicial.
Requer rede para Chart.js e fontes. `getElementById` no runner evita nomes globais ambíguos quando
o StudyHub monta seu template com IDs repetidos; esse comportamento legado não foi modificado.

Pixels são comparados por `scripts/compare-browser-images.py` quando hashes PNG diferem.
Esse teste visual opcional requer Python 3 e Pillow (já disponíveis no ambiente); nenhuma dependência
foi adicionada à aplicação, ao smoke ou à suíte Node. Limites por imagem: até 64 pixels diferentes,
até 20 pixels com delta maior que 1 e delta máximo de 20/255 por canal. Dimensões e formato RGB são exigidos.
Estes limites foram definidos após controle repetido do código original revelar antialiasing variável
em cantos arredondados, ícones e sombras. A tolerância é numérica, não identifica bordas automaticamente;
alterações maiores falham e nenhuma região é mascarada.
Seis casos sintéticos verificaram identidade, ruído aceito, excesso de pixels, excesso de pixels fortes,
contraste e dimensões. O relatório `pixel-comparison.json` lista cada imagem com diferença aceita.

```bash
# Comparar artefatos existentes sem abrir outra sessão de navegador:
node scripts/shell-style-check.cjs compare-saved /tmp/shell-before /tmp/shell-after
```

`compare-saved` confia nos hashes do relatório; use artefatos íntegros gerados pelo runner.
G2a retomou em 2026-09-12 após perda dos processos e artefatos temporários da sessão anterior.
Referência reconstruída dos assets de `387d9ec` em pasta temporária, com o mesmo runner da extração.
Resultados preservados nesta sessão em `/tmp/trade-diary-g2-stable-{baseline,control,after}`:
196 estados exatos; controle original repetido com 159 pixels diferentes em 28 imagens;
extração com 202 pixels em 14 imagens. Todos dentro dos limites; zero erros de console/runtime.
Artefatos são temporários e devem ser recapturados em outras sessões/ambientes.

Limites: viewport de 1.000px de altura, estados iniciais das páginas e dois modais sem submissão.
Não cobre todas as subabas, inputs, variações de dados nem animações em movimento. Os estilos base
permanecem globais; arquivos não são carregados por página. `.gitattributes` preserva os bytes dos
quatro novos CSS, incluindo LF/CRLF e separadores finais herdados.

## Ampliação de superfícies e cabeçalhos (G2b)

O mesmo runner shell agora registra 211 casos (196 anteriores + cinco abas de análise em três larguras).
Snapshot versão 2: pseudo-elementos `::before` das oito superfícies, `::after` dos cabeçalhos,
máscaras/posições e display das 15 páginas. Verifica também `fade-up` antes de desativar animações.
Abas usam os botões reais de `switchStatTab`; os filhos diretos entram na comparação de margens.
Recapturar a baseline ao mudar a versão do snapshot; relatórios G2a não têm os mesmos campos.

G2b: baseline capturada antes de mover CSS em `/tmp/trade-diary-g2b-baseline`, resultado em
`/tmp/trade-diary-g2b-after`. 211 estados idênticos e zero erros; 11 imagens com 170 pixels diferentes,
dentro da tolerância já documentada, sem ampliar limites. Smoke permanece com 27 checks.
O fingerprint integral existente passou antes/depois sem alteração do hash esperado.
Os limites de viewport, dados sintéticos, subfluxos não cobertos e comparação numérica de pixels permanecem.

## Botões e intervalos de datas (G2c)

Snapshot versão 3 no runner shell: 323 casos, incluindo oito estados de ações em todas as 14 larguras.
Acrescenta `min-height`, `flex`, `flex-wrap`, `filter`, `color-scheme` e cores computadas das opções de análise.
Hover de botões primary/ghost/ícone e limpeza; foco nos dois inputs de data; filtro e limpeza por eventos reais.
Datas 2026-09-10 selecionam `visual-win`; limpar restaura `visual-win` e `visual-loss`, sem mudar a fixture.
O teste reinicia os filtros entre cenários. Não clica em exclusão nem submete operação.

O primeiro ensaio detectou `const ids` repetido no contexto persistente de `Runtime.evaluate`.
IIFEs passaram a delimitar essas variáveis no runner; a aplicação não foi alterada para contornar a falha.
Serena ativo na raiz; investigação CSS do subagente usou busca localizada/parsing como alternativa ao MCP indisponível naquele contexto.
Limites anteriores mantidos; seletor nativo de datas e popup nativo de opções não são capturados.
Amostra das opções verifica suas cores computadas, sem alegar cobertura do popup.

G2c: referência anterior ao corte em `/tmp/trade-diary-g2c-before`, resultado em `/tmp/trade-diary-g2c-after`.
323 estados idênticos; 19 imagens com 54 pixels de diferença dentro dos limites anteriores.
Zero erros de console/runtime, 27 checks no smoke e fingerprint integral sem mudança de expectativa.
Artefatos temporários; recapturar em outras sessões ou ao alterar a versão do snapshot.

## Métricas e indicadores de risco (G2d)

Snapshot versão 4: 358 casos, preservando os 323 anteriores e acrescentando 35.
Inclui dashboard/risco em 1419/1420/1421px, tons safe/warn/danger nas 17 larguras e cinco estados
em 390/1080/1440px: hover de card, tooltip acima/abaixo/oculto e tooltip de risco com linhas internas.
`scripts/lib/metric-style-scenarios.cjs` chama o renderer existente com dados sintéticos explícitos,
sem substituir trades nem gravar storage. Verifica conteúdo, posição/clamping e fontes ocultas dos tooltips;
o snapshot inclui `::after` dos cards. Reset usa mouseout e aguarda o timeout real entre os casos.
Eventos DOM exercitam o manager existente; não comprovam hit testing físico, acesso por teclado ou cálculos financeiros.

Referência capturada antes do corte em `/tmp/trade-diary-g2d-before`; comparação em `/tmp/trade-diary-g2d-after`.
Antes/depois: 358 estados exatos e zero erros de console/runtime ou assets locais ausentes.
35 imagens com 99 pixels de diferença dentro dos limites existentes; tolerância não ampliada.
59 testes Node, 27 checks no smoke, sintaxe e diff passaram; fingerprint integral permanece o original.
Serena ativo na raiz; revisão independente confirmou bytes, cascata e ausência de URLs relativas no corte.
Um check auxiliar da revisão presumiu CRLF no link; repetido com o LF observado, passou sem mudança no código.
Artefatos temporários; recapturar em outras sessões ou ao alterar a versão do snapshot.

## Dashboard e layouts comuns de cards (G2e)

Snapshot versão 5: 378 casos, preservando os 358 anteriores. Acrescenta tabela inferior no viewport
em 17 larguras e hover de card de gráfico em 390/1080/1440px.
`scripts/lib/dashboard-layout-scenarios.cjs` rola a tabela real até seu limite horizontal;
quando há overflow, exige deslocamento positivo. Não altera trades, renderers nem storage.
O runner reinicia a rolagem entre casos e compara scrollLeft/Top, scrollWidth/Height, clientWidth/Height,
overflow-x/y, scrollbar-width/color e align-self, além dos campos anteriores.

Referência anterior ao corte em `/tmp/trade-diary-g2e-before`; comparação em `/tmp/trade-diary-g2e-after`.
Antes/depois: 378 estados exatos, zero erros de console/runtime ou assets locais ausentes.
22 imagens com 156 pixels de diferença dentro da tolerância existente; limites não ampliados.
59 testes Node, 27 checks no smoke, sintaxe e diff aprovados; fingerprint integral permanece o original.
Limites: os dois trades da fixture não geram overflow vertical; não se afirma cobertura de deslocamento vertical positivo.
`.board-card-sticky` não tem consumidor encontrado; sua regra permanece protegida pelo fingerprint integral.
Serena ativo; revisão independente confirmou o corte, a cascata e a preservação do JavaScript.
Artefatos temporários; recapturar ao mudar ambiente ou versão do snapshot.

## Risco e caixa da conta (G2f)

Snapshot versão 6: 407 casos; 17 estados de risco misto e 12 de meta/caixa somados aos 378 anteriores.
`scripts/lib/account-style-scenarios.cjs` usa renderers reais: LOSS -35 em 2026-09-11 gera valores/fills
safe/warn/danger e alertas safe/warn/danger/neutral; WIN 210 exercita o badge de meta atingida.
Caixa preenchido: aporte 125 e retirada 25 no editor e no setup, em 390/1080/1440px; editor vazio também capturado.
O formulário é aberto por `editAccount`; não há submissão nem exclusão. Campos temporários são restaurados em `finally`.
Comparações antes/depois de cada cenário exigem storage, contas e trades inalterados.
Snapshot acrescenta text-shadow, text-transform e vertical-align. A transição width/0.28s/ease é verificada
antes de desativar animações; não se compara a animação em movimento.

Na revisão, o primeiro revisor atingiu limite de uso; outro subagente assumiu a revisão independente.
Processo e artefatos temporários ficaram indisponíveis após retomada; captura reiniciada com CSS ainda intacto.
O segundo revisor encontrou vazamento da fixture em memória: `getActiveAccount` recria `accounts`,
portanto restaurar só cashflows no objeto antigo era insuficiente. O helper passou a restaurar o array original
em `finally` e comparar também contas/trades; referência contaminada descartada antes de qualquer corte.
Referência corrigida: `/tmp/trade-diary-g2f-reference`; resultado em `/tmp/trade-diary-g2f-after`.
407 estados exatos; nove imagens com 62 pixels diferentes dentro dos limites existentes, sem ampliar tolerância.
Zero erros de console/runtime ou assets locais ausentes; 59 testes Node, 27 checks no navegador, sintaxe e diff aprovados.
Recapturar artefatos em outras sessões/ambientes.
Limites: não é auditoria dos cálculos financeiros; badge-warn e risk-period-label não têm consumidor encontrado.

## Fontes consultadas

- [Codex MCP](https://developers.openai.com/codex/mcp/): configuração local e Context7.
- [Caveman INSTALL](https://github.com/JuliusBrussee/caveman/blob/main/INSTALL.md): instalação específica para Codex.
- [Superpowers README](https://github.com/obra/superpowers#codex-cli): marketplace atual; antigo `.codex/INSTALL.md` retornou 404.
- [Serena para Codex](https://oraios.github.io/serena/02-usage/030_clients.html#codex-cli-and-app): contexto e ativação.
- [Context7](https://github.com/upstash/context7): servidor de documentação externa.
- [Node.js v24 test runner](https://nodejs.org/docs/latest-v24.x/api/test.html): consultado via Context7.
