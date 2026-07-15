# Modos de Execucao

## Manual

O usuario controla o navegador. O script captura trace, HAR, video, screenshot final, eventos de console/rede e JSONL.

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs manual --profile default
```

Use para homologacao humana, teste exploratorio e treinamento por perfil.

## Assistido

O navegador usa perfil persistente e pode abrir CDP para que um agente anexe na mesma sessao.

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs assisted --profile default --remote-debugging-port 9333
```

Use para pares humano+agente. Nao use `--remote-debugging-port` com Firefox/WebKit.

Para manter o processo fora do terminal efemero do agente, execute o runner em
tmux com `scripts/qa-browser-tmux.sh`. Consulte o pane com `capture` e finalize
com `stop`; nao dependa de `Enter` no stdin.

## Headless

Executa smoke curto sem janela.

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs headless --profile default --duration 10
```

Use para checagem rapida, CI ou comparacao cross-browser inicial.

## Prune

Remove runs antigos em `.qa-browser/runs`.

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs prune --max-runs 20 --max-age-days 14
```

Use `--dry-run` antes da primeira limpeza em projetos sensiveis.

## Run Playbook

Executa passos declarativos de `.qa-browser/knowledge/playbooks/` usando perfil
persistente por padrao.

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs run-playbook smoke-auth --profile default
```

Use para tarefas repetiveis que o agente ja aprendeu e que foram revisadas pelo
usuario. A execucao gera `playbook-result.json` no diretorio do run.

## Learn

Gera rascunho de playbook a partir do run mais recente ou de `--from-run`.

```bash
node /home/cayo/.codex/skills/qa-browser-session/scripts/qa-browser.mjs learn
```

Use como assistente de escrita. Revise o draft antes de mover para
`.qa-browser/knowledge/playbooks/`.

## Browsers

- `chromium`: Playwright Chromium.
- `chrome`: Google Chrome instalado no sistema.
- `firefox`: Playwright Firefox.
- `webkit`: Playwright WebKit; pode exigir dependencias Linux extras.
- `msedge`: Microsoft Edge instalado no sistema.

## Runtime

O script carrega Playwright de `~/.local/share/qa-browser-session` por padrao.
Nao instalar `node_modules` dentro da pasta da skill global.
