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

## Ranking e comparação de estratégias (G2g)

Snapshot versão 7: 448 casos, os 407 anteriores mais comparação completa em 17 larguras e oito estados
em 390/1080/1440px. `scripts/lib/strategy-style-scenarios.cjs` clona os dois trades da fixture atribuindo
Breakout/Pullback, preserva contas/trades em `finally` e exige dados e storage inalterados.
Ranking positivo/negativo/vazio; comparação com seleção parcial, repetida, limpa e invertida; foco no seletor e gráficos.
A/B usam eventos `change` reais e são zerados entre casos. O runner verifica display do painel, dois cards,
ordem após inversão, vencedor e quatro gráficos Chart.js visíveis. Capturas incluem cards, gráficos e resumo por rolagem.
`compare-empty` limpa seleções com trades presentes: não exercita o ramo sem trades do comparador.
Popup nativo, fórmulas financeiras, timing e grandes amostras ficam fora da cobertura deste corte de CSS.

Referência anterior ao corte: `/tmp/trade-diary-g2g-before`; resultado em `/tmp/trade-diary-g2g-after`.
Antes/depois: 448 estados exatos, zero erros de console/runtime ou assets locais ausentes.
21 imagens com 147 pixels de diferença dentro dos limites existentes; tolerância não ampliada.
59 testes Node, 27 checks no navegador, sintaxe e diff aprovados; fingerprint integral permanece o original.
Um patch do runner foi recusado por contexto antigo; leitura localizada permitiu reaplicar sem alterações parciais.
O primeiro revisor atingiu limite de uso; outro subagente concluiu revisão independente sem bloqueios.
Artefatos temporários; recapturar em outra sessão/ambiente ou após mudança do snapshot.

## Grids e células do calendário (G2h)

Snapshot versão 8: 509 casos, os 448 anteriores mais week/biweek em 17 larguras e nove estados
em 390/1080/1440px. `scripts/lib/calendar-style-scenarios.cjs` reinicia ano/mês/modo/botões/detalhe/scroll
antes de cada caso. Contas são restauradas em `finally`; dados e storage devem permanecer iguais.
A UI chama `week` de Mensal e oferece `biweek`; `month` é exercitado pela API global, sem inventar botão.
Mini e células têm hover forçado via CDP; cliques abrem calendário/detalhes, e dia vazio oculta a tabela.
Nav cruza dezembro/2026 para janeiro/2027 e retorna; janeiro é assertion intermediária, dezembro é a captura.
Picker por evento `change` verifica fevereiro/2024 com 29 dias. O popup nativo não é capturado.

Snapshot acrescenta estado ano/mês/modo, dimensões/rolagem de `calGridWrap`, text-align/text-overflow,
white-space/scrollbar-gutter. Transições transform/border-color/background de 0.18s/ease são verificadas
antes de desativar animações; não se compara animação em movimento. Somas/períodos/fusos não são auditados integralmente.
Referência anterior ao corte: `/tmp/trade-diary-g2h-before`; resultado em `/tmp/trade-diary-g2h-after`.
Antes/depois: 509 estados exatos, zero erros de console/runtime ou assets locais ausentes.
23 imagens com 190 pixels de diferença dentro dos limites existentes; tolerância não ampliada.
59 testes Node, 27 checks no navegador, sintaxe e diff aprovados; fingerprint integral permanece o original.
Revisão independente confirmou fronteira, bytes, cascata, isolamento e limites da cobertura.
Artefatos temporários; recapturar em outra sessão/ambiente ou após mudança do snapshot.

## Tabelas e estados de operações (G2i)

Snapshot versão 9: 559 casos, os 509 anteriores mais scroll horizontal do diário em 17 larguras
e onze estados em 390/1080/1440px. `scripts/lib/trade-table-style-scenarios.cjs` reinicia ordenação,
indicadores, seleção e scroll antes de cada caso; restaura contas/trades em `finally` e compara dados/storage.
Ordenação ascendente/descendente por P/L e checkboxes usam cliques reais; limpar seleção usa o segundo clique
em selecionar todos. Hover de linha/cabeçalho e linha selecionada é forçado por CDP.
Fixtures contrastam uma linha incompleta, duas completas e badges WIN/LOSS/OPEN/Long/Short; ação de completar
recebe foco, sem execução nem submissão. Vinte trades temporários pelo renderer do dashboard exercitam
scroll vertical e cabeçalho sticky, inclusive indicadores incompletos na tabela compacta.

Snapshot acrescenta estado de seleção/ordenação, scroll do wrapper do diário e estilos de bordas/tabela,
cursor, user-select e sublinhado. A primeira referência falhou: as duas operações base eram marcadas incompletas
na inicialização, e clones herdavam a marca. A fixture passou a definir flags explicitamente; referência refeita
antes de mover CSS. Isso caracteriza apresentação das flags, sem auditar a regra que calcula incompletude.
Referência corrigida: `/tmp/trade-diary-g2i-reference`; comparação: `/tmp/trade-diary-g2i-after`.
Resultado: 559 estados exatos; 22 imagens com 195 pixels de diferença dentro da tolerância existente.
Zero erros de console/runtime e assets locais ausentes; 59 testes Node e 27 checks de smoke aprovados.
Revisão independente aprovada; resultados devem ser recapturados em cada ambiente.
Limites: não testa exclusão, duplicação, conclusão/salvamento nem ordenação por todas as colunas.

## Campos de formulário (G2j)

Snapshot versão 10: 577 casos, os 559 anteriores mais seis estados de foco em 390/1080/1440px.
`scripts/lib/form-field-style-scenarios.cjs` abre o modal real de operações e caracteriza texto,
número com unidade %, campo readonly, select, textarea vazio e preenchido com múltiplas linhas.
Valores são somente de apresentação, sem eventos input/change, salvamento ou gravação de dados.
Cada cenário confirma contas/trades/storage intactos. O runner reinicia scroll dos corpos de modal;
`scrollIntoView` posiciona o campo em foco. Grids fg-2/3/4 continuam cobertos pelo modal passivo
nas 17 larguras existentes, incluindo 720±1 e 1080±1. Snapshot acrescenta resize e appearance;
a declaração de transição dos campos é verificada antes de desabilitar animações.

A primeira caracterização falhou com `Required marker missing`: `applyLanguage` substitui o
conteúdo dos labels traduzidos por textContent e remove seus spans `.required`. O teste agora
registra essa ausência existente; comportamento da aplicação não foi corrigido neste lote.
Artefatos temporários da tentativa inicial desapareceram após troca de ambiente; referência recapturada
em worktree isolada no commit `f888a4f`, antes de extrair CSS.
Resultado: 577 estados exatos; 32 imagens com 188 pixels de diferença dentro da tolerância existente.
Zero erros de console/runtime e assets locais ausentes; 59 testes Node e 27 checks de smoke aprovados.
Limites: sem submissão/validação dos formulários, popup nativo de select, arraste para redimensionar
textarea ou animação em movimento. `.field-hint` não possui consumidor encontrado; regra preservada.

## Modais e abas comuns (G2k)

Snapshot versão 11: 595 casos, os 577 anteriores mais seis estados em 390/1080/1440px.
`scripts/lib/modal-tab-style-scenarios.cjs` caracteriza scroll vertical do modal de operação,
footer simples do CSV, diálogo com input e abas de importação, calendário e StudyHub pelos handlers reais.
O snapshot acrescenta `border-top`, `backdrop-filter`, `overscroll-behavior`, modais abertos,
scroll do corpo, alinhamento do footer e abas ativas. Fingerprint confirma contas, trades e storage intactos.

A primeira referência falhou em `tabs-studyhub-plano`: o runner roteava para `study-hub`, mas o ID real
é `studyHub`. A aba mudava, porém a página permanecia oculta. O roteamento foi corrigido e a baseline
foi refeita antes de mover CSS em `/tmp/trade-diary-g2k-reference-corrected`.
Resultado: 595 estados exatos; 22 imagens com 170 pixels de diferença dentro da tolerância existente.
Zero erros de console/runtime e assets locais ausentes; 59 testes Node e 27 checks de smoke aprovados.
Limites: não confirma importação nem diálogo, não testa fechamento por Escape e não percorre todas as
subabas internas do StudyHub legado. Trade/account e 720±1 permanecem cobertos pelos estados existentes.

## Toolbar do calendário (G2l)

Snapshot versão 12: 598 casos, os 595 anteriores mais foco do seletor de mês em 390/1080/1440px.
`scripts/lib/calendar-style-scenarios.cjs` confirma foco, tipo month, padding, min-height, largura,
fonte e dimensões dos botões; week/biweek continuam exercitados nas 17 larguras existentes.

A primeira assertion esperava gap de 12px pela regra `.calendar-toolbar`. A medição mostrou 8px:
`.gap-8` aparece mais tarde no residual e vence por mesma especificidade. A caracterização passou a
registrar 8px, sem corrigir o comportamento existente, e a baseline foi refeita antes da extração em
`/tmp/trade-diary-g2l-reference-final`.
Limite: o popup nativo do input month não é aberto; varia por navegador/OS.

Resultado pós-extração: 59 testes Node, 27 checks no navegador e 598 estados visuais
idênticos; 27 imagens tiveram diferenças limitadas a 157 pixels de rasterização.

## Upload comum (G2m)

Snapshot versão 13: 607 casos, os 598 anteriores mais base, hover e `.drag` em
390/1080/1440px. `scripts/lib/upload-zone-style-scenarios.cjs` monta e remove uma fixture
descartável, pois não existe consumidor ativo confirmado para as classes globais.

A fixture verifica padding, raio, alinhamento, input oculto, dimensões do ícone e tipografia;
o estado `.drag` confirma fundo e borda. O pseudo-hover é forçado pelo CDP. Nenhum arquivo é
enviado e os listeners/importadores não são exercitados. A primeira captura falhou porque a fixture
procurava `.page-content`, ausente no dashboard; ela passou a montar diretamente em `#page-dashboard`
antes da baseline válida em `/tmp/trade-diary-g2m-reference-v13b`.

As duas primeiras comparações repetiram diferenças tipográficas de até 0,031px e excederam
o limite de pixels, mesmo com os bytes CSS concatenados idênticos. Um controle fresco recolocou
temporariamente o bloco no monólito e reproduziu os mesmos hashes da extração, isolando a primeira
captura como condição subpixel transitória do navegador. Controle fresco versus extração passou:
607 estados idênticos; 29 imagens com 148 pixels de rasterização dentro da tolerância.

## Seletor de emoções (G2n)

Snapshot versão 14: 616 casos, os 607 anteriores mais idle, hover e `.selected` em
390/1080/1440px. `scripts/lib/emotion-picker-style-scenarios.cjs` monta dois chips em fixture
descartável e confirma grid, espaçamento, cores, dimensões, tipografia e dados/storage intactos.

Não existe consumidor ativo confirmado nem regra `:hover`; o pseudo-hover registra que o estado
continua igual ao base. A primeira execução reforçada aplicava as cores-base também ao chip
`.selected`; a expectativa foi separada e a baseline válida refeita antes do corte em
`/tmp/trade-diary-g2n-reference-v14c`.

Resultado pós-extração: 59 testes Node, 27 checks no navegador e 616 estados visuais
idênticos; 24 imagens tiveram 190 pixels de rasterização dentro da tolerância.

## Tags e edição (G2o)

Snapshot versão 15: 631 casos. `scripts/lib/tag-editor-style-scenarios.cjs` cobre em
390/1080/1440px as tags reais do Setup e Profile, contagem de uso, botões de editar/excluir,
hovers e wrap. Uma fixture descartável cobre somente `.tag-add`, sem consumidor atual.

A primeira execução esperava `inline-flex`, enquanto `getComputedStyle` normaliza o item externo
para `flex`. A expectativa foi corrigida e a cobertura ampliada para Profile e tags secundárias
antes da baseline válida em `/tmp/trade-diary-g2o-reference-v15b`.

Resultado pós-extração: 59 testes Node, 27 checks no navegador e 631 estados visuais
idênticos; 35 imagens tiveram 212 pixels de rasterização dentro da tolerância.

## Alertas e utilitários (G2p)

Snapshot versão 16: 640 casos. `scripts/lib/alert-utility-style-scenarios.cjs` cobre alert
info real, warning isolado, separador real e headers/utilities em 390/1080/1440px. `.w-full`,
sem consumidor ativo, usa um nó descartável; dados e storage são comparados antes/depois.

A primeira expectativa comparava `margin-left:auto` literalmente, mas `getComputedStyle` retorna
o valor resolvido em pixels. A checagem foi mantida na geometria capturada e a baseline válida
foi refeita antes do corte em `/tmp/trade-diary-g2p-reference-v16b`.

Resultado pós-extração: 59 testes Node, 27 checks no navegador e 640 estados visuais
idênticos; 29 imagens tiveram 265 pixels de rasterização dentro da tolerância.

## Ações em lote e fluxo do modal (G2q)

Snapshot versão 17: 649 casos. `scripts/lib/trade-action-style-scenarios.cjs` cobre barra
oculta, uma seleção e fluxo do modal visível em 390/1080/1440px, sem mutar dados persistidos.
A primeira expectativa de `inline-flex` foi ajustada para o `flex` normalizado pelo estilo computado;
a baseline válida foi refeita antes do corte em `/tmp/trade-diary-g2q-reference-v17b`.
Após o corte, os 649 estados permaneceram idênticos; 35 imagens somaram 278 pixels de
rasterização dentro da tolerância. Revisão independente sem bloqueios após corrigir a contagem documental para sete regras.

## Premarket e chips de erro (G2r)

Snapshot versão 18: 667 casos. `scripts/lib/premarket-error-chip-style-scenarios.cjs`
cobre grade, dot hover/concluído e chips ocioso/hover/selecionado em 390/1080/1440px.
A baseline pré-corte está em `/tmp/trade-diary-g2r-reference-v18`. Após separar o boundary
por feature, os 667 estados permaneceram idênticos; 31 imagens somaram 220 pixels dentro da tolerância.

## Importação, backup e exportação (G2s)

Snapshot versão 19: 685 casos. `scripts/lib/data-transfer-style-scenarios.cjs` visita as duas
abas por handlers reais em 390/719/720/721/1080/1419/1420/1421/1440px. Verifica layout,
resumo/seletores e conservação de contas, trades, configuração, premarket, StudyHub e storage.
Baseline pré-corte válida: `/tmp/trade-diary-g2s-reference-v19b`. Upload, restauração e downloads
não são executados; a cobertura funcional desses fluxos pertence aos lotes de IO.
Serena e Context7 disponíveis nesta sessão; raiz Serena ativada e símbolos das abas consultados.
A primeira ativação omitiu `session_id`; repetida corretamente sem alterar código ou configuração.
A primeira comparação v19 encontrou cinco casos com única diferença no `cotInput.value`
(`5.8`/`5.80`): o timer real de cinco minutos cruzou pontos diferentes da captura.
O runner passou a pausar somente `cotacaoInterval` após load e aguardar `fetchCotacao()`
com resposta simulada. A baseline válida foi recapturada em
`/tmp/trade-diary-g2s-reference-v19b`, com CSS anterior e o mesmo harness do resultado.
Não houve alteração de `app.js`, normalização de snapshots nem ampliação de tolerâncias.
Resultado final: 685 estados idênticos, 36 imagens/181 pixels de rasterização aceitos;
59 testes Node, 27 checks no navegador, sintaxe, parsing, diff e revisão independente aprovados.

## Diálogo comum (G2t)

Snapshot versão 20: 691 casos. `scripts/lib/modal-tab-style-scenarios.cjs` acrescenta
confirmação sem input com mensagem multilinha e erro real de `requiredValue`, além do input/foco
já coberto, em 390/1080/1440px. Callback protegido não deve executar; estado é restaurado em
`finally`, e contas/trades/storage são comparados antes/depois. Baseline pré-corte:
`/tmp/trade-diary-g2t-reference-v20`. O timer de cotação continua pausado somente no runner.
Resultado final: 691 estados idênticos; 46 imagens/192 pixels de rasterização aceitos.
59 testes Node, 27 checks no navegador, sintaxe, parsing, diff e revisão independente aprovados.

## Fontes consultadas

- [Codex MCP](https://developers.openai.com/codex/mcp/): configuração local e Context7.
- [Caveman INSTALL](https://github.com/JuliusBrussee/caveman/blob/main/INSTALL.md): instalação específica para Codex.
- [Superpowers README](https://github.com/obra/superpowers#codex-cli): marketplace atual; antigo `.codex/INSTALL.md` retornou 404.
- [Serena para Codex](https://oraios.github.io/serena/02-usage/030_clients.html#codex-cli-and-app): contexto e ativação.
- [Context7](https://github.com/upstash/context7): servidor de documentação externa.
- [Node.js v24 test runner](https://nodejs.org/docs/latest-v24.x/api/test.html): consultado via Context7.
