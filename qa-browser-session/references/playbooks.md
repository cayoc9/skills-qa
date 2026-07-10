# Playbooks Locais

Playbooks transformam tarefas de QA recorrentes em passos declarativos,
auditaveis e locais ao projeto.

## Local Padrao

```text
.qa-browser/
└── knowledge/
    ├── playbooks/
    │   └── smoke-auth.json
    ├── drafts/
    └── selectors.json
```

## Formato Canonico

JSON funciona sem dependencia extra. YAML e aceito apenas quando o runtime tiver
o pacote `yaml` instalado:

```bash
cd ~/.local/share/qa-browser-session
npm install yaml
```

## Exemplo

```json
{
  "id": "smoke-auth",
  "name": "Smoke de autenticacao",
  "description": "Abre homologacao, valida tela de login e registra screenshot.",
  "url": "https://homolog.amazhealth.com.br/",
  "stopOnFailure": true,
  "steps": [
    { "action": "waitForLoadState", "state": "domcontentloaded" },
    { "action": "waitForURL", "url": "**/auth", "timeout": 15000 },
    { "action": "expectURL", "contains": "/auth" },
    { "action": "screenshot", "name": "smoke-auth-final", "fullPage": true }
  ]
}
```

## Acoes Suportadas

- `goto`: exige `url`.
- `click`: exige `selector` ou `selectorRef`.
- `fill`: exige `selector`/`selectorRef` e `value` ou `valueEnv`.
- `press`: exige `selector`/`selectorRef` e `key`.
- `waitForSelector`: exige `selector`/`selectorRef`; aceita `state`.
- `waitForURL`: exige `url`.
- `waitForLoadState`: aceita `state`.
- `expectTitle`: aceita `equals`, `contains` ou `matches`.
- `expectURL`: aceita `equals`, `contains` ou `matches`.
- `expectText`: exige `selector`/`selectorRef` e aceita `equals`, `contains` ou `matches`.
- `expectNoErrors`: falha se houver request failed, page error, HTTP error ou console error.
- `screenshot`: salva PNG no diretorio do run.

## Selectors

`selectors.json` permite nomes semanticos:

```json
{
  "login": {
    "email": "input[name=\"email\"]",
    "password": "input[name=\"password\"]",
    "submit": "button[type=\"submit\"]"
  }
}
```

Uso no playbook:

```json
{ "action": "fill", "selectorRef": "login.email", "valueEnv": "QA_LOGIN_EMAIL" }
```

## Learn

`qa-browser learn` cria um rascunho a partir de um run existente:

```bash
qa-browser learn
qa-browser learn --from-run .qa-browser/runs/2026-07-09T15-12-01-121Z-saude-platform
```

O draft fica em `.qa-browser/knowledge/drafts/`. Revise manualmente antes de
mover para `.qa-browser/knowledge/playbooks/`.

## Privacidade

- Nao salve senha, token, CPF, CNS ou cookies em playbooks.
- Use `valueEnv` para valores sensiveis.
- Revise `playbook-result.json`, screenshots, HAR e video antes de enviar para IA externa.
