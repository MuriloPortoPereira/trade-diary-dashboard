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
preservação dos dados de storage exceto `appLanguage`. Total atual: 18 checks.
Somente o perfil temporário recebe a escolha de idioma; não acessa dados pessoais.
Requer rede para os recursos CDN/fontes e falha em erros de script ou assets locais ausentes.
Resultado coletado após `load + 250ms`; não captura erros assíncronos posteriores,
erros silenciados ou mensagens de `console.error`. Verifica Chart.js real pela versão.
Storage é comparado somente entre navegação e simulação, após bootstrap.
Não cobre todos os fluxos, migrações de dados nem compara pixels.

## Fontes consultadas

- [Codex MCP](https://developers.openai.com/codex/mcp/): configuração local e Context7.
- [Caveman INSTALL](https://github.com/JuliusBrussee/caveman/blob/main/INSTALL.md): instalação específica para Codex.
- [Superpowers README](https://github.com/obra/superpowers#codex-cli): marketplace atual; antigo `.codex/INSTALL.md` retornou 404.
- [Serena para Codex](https://oraios.github.io/serena/02-usage/030_clients.html#codex-cli-and-app): contexto e ativação.
- [Context7](https://github.com/upstash/context7): servidor de documentação externa.
- [Node.js v24 test runner](https://nodejs.org/docs/latest-v24.x/api/test.html): consultado via Context7.
