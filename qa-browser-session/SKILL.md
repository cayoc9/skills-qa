---
name: qa-browser-session
description: Browser headed para QA/homologacao com Playwright, captura de trace/HAR/video/screenshots/eventos, sessao persistente por projeto e modo manual ou assistido. Use quando o usuario quiser testar uma aplicacao web local, staging ou homologacao; preservar login/cookies/localStorage; rodar Chrome/Chromium/Firefox/WebKit/Edge; gerar artefatos para analise por IA; ou permitir que um agente anexe na mesma sessao via CDP.
---

# QA Browser Session

## Principio

Usar esta skill para transformar uma sessao de browser em evidencia auditavel. Manter a skill global e os dados sempre locais ao projeto.

Nunca salvar cookies, HAR, videos, screenshots, traces ou perfis autenticados dentro da pasta da skill. Criar ou reutilizar `.qa-browser/` na raiz do projeto atual, salvo se o usuario indicar outro `--state-dir`.

Manter dependencias Node/Playwright fora da pasta da skill, no runtime `~/.local/share/qa-browser-session`, salvo override por `QA_BROWSER_RUNTIME` ou `--runtime-dir`.

## Fluxo Padrao

1. Confirmar a raiz real do projeto e a URL alvo.
2. Se o projeto ainda nao tiver configuracao, rodar `scripts/qa-browser.mjs init` com `--project` e `--url`.
3. Escolher modo:
   - `manual`: usuario navega, agente captura evidencias.
   - `assisted`: usuario navega e agente pode anexar via CDP na mesma sessao.
   - `headless`: smoke automatico curto ou CI.
   - `run-playbook`: agente executa passos declarativos locais do projeto.
   - `learn`: agente cria rascunho de playbook a partir de um run existente.
4. Rodar o script da skill com `node <skill>/scripts/qa-browser.mjs ...`.
5. Ao final, revisar `summary.json` e `events.json` antes de abrir HAR/trace/video.
6. Para analise por IA, usar `assets/ai-review-prompt.md` e anexar somente artefatos revisados.

## Comandos Essenciais

Os comandos abaixo assumem a skill instalada globalmente em
`/home/cayo/.codex/skills/qa-browser-session/`. Se estiver usando este pacote
local, prefira os scripts npm em `software_engineering/qa/package.json` ou rode
`software_engineering/qa/skills/qa-browser-session/scripts/qa-browser.mjs`
diretamente a partir da raiz deste repositorio.

Inicializar projeto:

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs init \
  --project saude-platform \
  --url https://homolog.amazhealth.com.br/ \
  --browser chrome
```

Sessao manual:

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs manual --profile default
```

Sessao assistida com agente anexavel:

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs assisted \
  --profile default \
  --remote-debugging-port 9333
```

Smoke headless:

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs headless \
  --profile default \
  --duration 10
```

Executar playbook local:

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs run-playbook \
  smoke-auth \
  --profile default
```

Gerar rascunho de playbook:

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs learn
```

Limpar runs antigos:

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs prune \
  --max-runs 20 \
  --max-age-days 14
```

## Decisoes Rapidas

- Para homologacao autenticada, preferir `manual` ou `assisted` com perfil persistente.
- Para comparacao cross-browser, rodar `headless` com `--browser chromium`, `--browser chrome`, `--browser firefox` e, quando dependencias existirem, `--browser webkit`.
- Para agente anexar na mesma sessao, usar apenas browsers Chromium-family (`chromium`, `chrome`, `msedge`) com `--remote-debugging-port`.
- Para dados sensiveis, manter artefatos locais e usar dados sinteticos ou usuarios de teste.
- Por padrao, HAR nao embute body (`harContent: omit`) e trace nao embute source (`traceSources: false`). Exigir opt-in explicito para capturas mais completas.
- Se `--profile` nao existir no config, falhar; usar `--create-profile` apenas quando for intencional.
- Para tarefas aprendidas, usar playbooks JSON em `.qa-browser/knowledge/playbooks/`; YAML e opcional quando o runtime tiver parser instalado.
- `learn` gera somente draft em `.qa-browser/knowledge/drafts/`; nunca promover automaticamente para playbook.
- Credenciais e tokens nao devem aparecer em playbooks; use `valueEnv` ou entrada manual.

## Gerenciamento de terminal com tmux

Quando o agente precisar manter um runner, servidor ou outro comando longo
ativo, usar o wrapper `scripts/qa-browser-tmux.sh`. Ele remove a dependencia de
`stdin` do terminal do agente, mantem uma sessao nomeada e permite consultar o
pane sem anexar a interface:

```bash
TMUX=/home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser-tmux.sh

$TMUX start -- node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs \
  assisted --profile local-assisted --remote-debugging-port 9333
$TMUX status
$TMUX capture
$TMUX save
$TMUX stop
```

O modo `assisted` grava evidencias incrementais enquanto o browser fica aberto
e aceita `SIGUSR2` (ou `SIGINT`/`SIGTERM`) para encerramento limpo. `stop` deve ser preferido a
`kill`, pois permite fechar trace, HAR, video e screenshot final. O wrapper nao
deve receber credenciais ou segredos em `send`; autenticacao deve ocorrer pela
UI ou por entrada manual protegida. Os chunks de trace ficam em
`live-traces/`; `trace.zip` e materializado a partir do ultimo chunk no
encerramento, enquanto a colecao completa permanece disponivel no diretorio.

## Recursos

- Script principal: `scripts/qa-browser.mjs`.
- Modos e exemplos: ler `references/modes.md` quando o usuario pedir modo manual/assistido/cross-browser.
- Playbooks locais: ler `references/playbooks.md` quando o usuario pedir tarefas aprendidas, automacao assistida ou reutilizacao de fluxos.
- Config local por projeto: ler `references/project-config.md` quando precisar criar ou editar `.qa-browser/config.json`.
- Privacidade: ler `references/privacy.md` antes de capturar homologacao autenticada ou dados sensiveis.
- Prompt de revisao: `assets/ai-review-prompt.md`.
