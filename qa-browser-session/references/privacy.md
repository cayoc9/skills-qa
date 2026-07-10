# Privacidade e Artefatos Sensíveis

HAR, trace, video, screenshot e perfil persistente podem conter:

- cookies e tokens;
- dados pessoais;
- dados clinicos;
- payloads de API;
- URLs internas;
- nomes e documentos.

Regras:

1. Usar dados sinteticos ou usuarios de teste sempre que possivel.
2. Nao copiar artefatos autenticados para fora do projeto sem revisao.
3. Nao commitar `.qa-browser/profiles/` ou `.qa-browser/runs/`.
4. Antes de enviar para IA externa, revisar `network.har`, screenshots e videos.
5. Em saude/LGPD, tratar evidencias como dado sensivel por padrao.
6. Manter `harContent: "omit"` e `traceSources: false` por padrao.
7. Usar `qa-browser prune` periodicamente para reduzir retencao local.
