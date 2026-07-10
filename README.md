# Skills

Repositorio de skills locais para agentes, com foco inicial em QA e validacao
de navegador.

## Skills Incluidas

- `qa-browser-session`: browser headed/headless para QA/homologacao com
  Playwright, artefatos auditaveis, modo manual, modo assistido, playbooks
  locais e rascunhos via `learn`.
- `qa-analysis`: skill de apoio para analise de maturidade, custo e compliance
  de QA.

## Instalacao Rapida

```bash
git clone git@github.com:cayoc9/skills.git
cd skills
./scripts/install-local.sh
```

O instalador copia as skills para `~/.codex/skills/` e prepara o runtime do
`qa-browser-session` em `~/.local/share/qa-browser-session`.

## Teste Rapido Do QA Browser

```bash
qa-browser --help

mkdir -p /tmp/qa-browser-demo
cd /tmp/qa-browser-demo

qa-browser init \
  --project qa-browser-demo \
  --url 'data:text/html,<title>Demo OK</title><h1 id="ready">Ready</h1>' \
  --browser chromium

mkdir -p .qa-browser/knowledge/playbooks
cat > .qa-browser/knowledge/playbooks/demo-ready.json <<'JSON'
{
  "id": "demo-ready",
  "name": "Demo Ready",
  "description": "Valida uma pagina data URL simples.",
  "steps": [
    { "action": "waitForLoadState", "state": "domcontentloaded" },
    { "action": "expectTitle", "contains": "Demo OK" },
    { "action": "expectText", "selector": "#ready", "contains": "Ready" },
    { "action": "screenshot", "name": "demo-ready-final", "fullPage": true }
  ]
}
JSON

qa-browser run-playbook demo-ready --profile default --headless
```

Para testar contra um projeto real, crie um playbook em
`.qa-browser/knowledge/playbooks/` e rode:

```bash
qa-browser run-playbook <nome> --profile default --headless
```

## Estrutura

```text
.
├── qa-browser-session/
├── qa-analysis/
└── scripts/
    └── install-local.sh
```

## Politica De Privacidade

Nao commite perfis de browser, traces, HARs, videos, screenshots, tokens ou
credenciais. A skill `qa-browser-session` foi desenhada para manter esses dados
em `.qa-browser/` dentro de cada projeto consumidor.
