# Config Local Por Projeto

A skill global nao deve guardar estado. Cada projeto deve ter `.qa-browser/`.

Estrutura:

```text
.qa-browser/
├── config.json
├── .gitignore
├── profiles/
├── runs/
└── knowledge/
    ├── playbooks/
    ├── drafts/
    └── selectors.json
```

Exemplo de `.qa-browser/config.json`:

```json
{
  "project": "saude-platform",
  "defaultUrl": "https://homolog.amazhealth.com.br/",
  "defaultBrowser": "chrome",
  "defaultProfile": "homolog-admin",
  "outputDir": ".qa-browser/runs",
  "profiles": {
    "homolog-admin": {
      "url": "https://homolog.amazhealth.com.br/",
      "browser": "chrome",
      "mode": "manual"
    },
    "homolog-assisted": {
      "url": "https://homolog.amazhealth.com.br/",
      "browser": "chrome",
      "mode": "assisted"
    }
  },
  "privacy": {
    "artifactPolicy": "local-only",
    "avoidRealSensitiveData": true
  },
  "capture": {
    "harContent": "omit",
    "traceSources": false,
    "traceScreenshots": true,
    "traceSnapshots": true,
    "video": true,
    "screenshot": true
  },
  "redaction": {
    "enabled": true,
    "sensitiveKeys": [
      "authorization",
      "cookie",
      "set-cookie",
      "password",
      "token",
      "secret",
      "jwt",
      "cpf",
      "cns"
    ]
  },
  "retention": {
    "maxRuns": 20,
    "maxAgeDays": 14,
    "autoPrune": false
  },
  "playbooks": {
    "requireConfirmation": true,
    "stopOnFailure": true
  }
}
```

Use `init` para criar a base e depois edite os perfis conforme o projeto.

`profiles/`, `runs/` e `knowledge/` devem ficar fora do Git. O `config.json`
pode ser versionado quando nao contiver URLs privadas, credenciais ou dados
sensiveis.
