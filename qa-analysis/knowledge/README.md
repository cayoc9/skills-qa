# Base de Conhecimento — QA Analysis Skill

Este documento referencia todo o material de pesquisa que fundamenta as análises e recomendações desta skill.

## Fonte Canônica Atual

O material da sessão de pesquisa foi reorganizado em:

- `$QA_RESEARCH_ROOT/README.md`
- `$QA_RESEARCH_ROOT/research-index.md`
- `$QA_RESEARCH_ROOT/stack-open-source.md`
- `$QA_RESEARCH_ROOT/plans/implementation-plan-open-source-stack.md`
- `$QA_RESEARCH_ROOT/reviews/critical-review-multi-agent.md`

Use esse diretório como ponto de entrada antes de consultar os HTMLs e contextos históricos abaixo.

## Regra de Interpretação

Os dados abaixo preservam o histórico da pesquisa, mas recomendações operacionais devem passar primeiro por:

- `$QA_RESEARCH_ROOT/research/evidence-matrix.md`
- `$QA_RESEARCH_ROOT/research/compliance-applicability-matrix.md`
- `$QA_RESEARCH_ROOT/operations/tco-model.md`
- `$QA_RESEARCH_ROOT/operations/license-risk-matrix.md`
- `$QA_RESEARCH_ROOT/operations/sensitive-data-capture-matrix.md`
- `$QA_RESEARCH_ROOT/research/fact-check/`
- `$QA_RESEARCH_ROOT/reviews/fact-check-orchestration-quality-review.md`

Trate pricing, GitHub stars, downloads, ROI, KPIs de IA, licenças e claims regulatórios como voláteis ou condicionados até validação atual.

## Pesquisas Base

### 1. QA + Observabilidade (Julho 2026)
**Arquivo:** `$QA_RESEARCH_ROOT/research/raw/qa-observabilidade-research.html`

**Principais achados:**
- 5 pilares do QA ampliado: observabilidade técnica, comportamental, testes adversariais, product analytics, validação progressiva
- QA deixou de ser fase e se tornou ciclo contínuo
- Observabilidade e QA estão fundindo-se em Quality Engineering
- 26 fontes consultadas (OpenTelemetry, IBM, Splunk, Honeycomb, Netflix, Google SRE)

**Dados da indústria:**
- Observabilidade reduz MTTR em 54% (Splunk) — benchmark/vendor claim; validar contexto.
- 64% menos incidentes com observabilidade (Splunk) — benchmark/vendor claim; validar contexto.
- 5 usuários revelam 85% dos problemas de usabilidade (Nielsen Norman Group) — heurística útil, não garantia.

### 2. IA no QA (Julho 2026)
**Arquivo:** `$QA_RESEARCH_ROOT/research/raw/ai-qa-homologacao-research.html`

**Principais achados:**
- Arquitetura dos 4 anéis: Coleta → Análise IA → Agentes Autônomos → Decisão Humana
- LLMs detectam 69% das falhas vs 17,2% humanos (arXiv:2606.08588)
- Propagação de erros: mesmo LLM gerando código+testes → detecção cai para 14%
- 89% das organizações pilotando IA em QA (Capgemini WQR 2025)
- 25 fontes consultadas (10 papers acadêmicos do arXiv)

**Ferramentas mapeadas:**
- QA Wolf, Octomind, Momentic (autonomous testing)
- Sentry Seer (autofix agent)
- LogRocket Galileo (session analysis)
- Applitools (visual AI)
- Datadog Bits AI, Dynatrace Davis AI (AIOps)

### 3. Saúde + Open-Source + ROI (Julho 2026)
**Arquivo:** `$QA_RESEARCH_ROOT/research/raw/qa-saude-opensource-roi.html`

**Principais achados:**
- ROI de 301-400% em 3 anos, payback <6 meses — vendor/benchmark; não usar como promessa.
- Stack open-source: ~$200/mês vs SaaS $1.300-4.200/mês — hipótese de infraestrutura; não é TCO validado.
- Open-source/self-hosted pode ser forte preferência técnica em saúde quando houver dado sensível e capacidade operacional.
- PostHog self-hosted e OpenReplay são candidatos para replay sob controle de hospedagem; exigem matriz de privacidade, TCO, licença e jurídico.

**Regulamentação:**
- ANVISA RDC 657/658, IEC 62304, ISO 13485, FDA 21 CFR Part 11
- Dados reais de pacientes em testes exigem base legal/finalidade, minimização, contrato/operador quando aplicável e validação jurídica/DPO; preferir dados sintéticos ou anonimizados.
- Multas LGPD: até 2% faturamento (R$ 50M por infração)
- Synthea (MIT) para dados sintéticos FHIR

**Stack open-source recomendado:**
- SigNoz (APM) + PostHog (replay+analytics) + GlitchTip (errors)
- Playwright (testing) + Unleash (flags) + Chaos Mesh (chaos)

## Podcasts Gerados (NotebookLM)

Localização: `$QA_RESEARCH_ROOT/media/`

| Arquivo | Tamanho | Conteúdo |
|---------|---------|----------|
| `podcast-qa-observabilidade.mp3` | 39 MB | 5 Pilares do QA Ampliado |
| `podcast-ia-no-qa.mp3` | 45 MB | Arquitetura 4 Anéis + Agentes |
| `podcast-roi-opensource.mp3` | 51 MB | Custo/ROI + Stack Open-Source |
| `podcast-saude-lgpd.mp3` | 46 MB | Saúde + Compliance LGPD |

Notebook: `53f1c1ec` (3 fontes, 4 podcasts)

## Papers Acadêmicos de Referência

| Paper | arXiv | Descoberta Principal |
|-------|-------|---------------------|
| LLM vs Human Unit Tests | 2606.08588 | LLMs detectam 4x mais falhas (69% vs 17,2%) |
| Error Propagation in LLM Tests | 2607.05139 | Mesmo LLM código+testes → detecção cai para 14% |
| GATF Governance Framework | 2606.08806 | 89,6% redução de riscos com governança |
| TitanFuzz | 2210.09235 | LLMs como zero-shot fuzzers (+30-50% cobertura) |
| Predictive Test Selection | 1810.05286 | Facebook: 50% redução custo, >95% detecção |
| Testing with LLMs Survey | 2307.07221 | 102 estudos analisados |

## Dados de Pricing (Julho 2026, Voláteis)

| Ferramenta | Entrada | Intermediário | Enterprise |
|-----------|---------|---------------|------------|
| Sentry | $0 | $26/mês | $80/mês |
| Datadog | $0 (5 hosts) | $15/host/mês | $23/host/mês |
| LogRocket | — | ~$176/mês | Personalizado |
| QA Wolf | PAYG | — | Sob consulta |
| LaunchDarkly | $0 | $10/serviço/mês | Sob consulta |
| BrowserStack | $29/mês | $150/mês | $375+/mês |
| Katalon | — | $700/assento/ano | $2.000/assento/ano |

## KPIs de Referência (IA vs Manual, Benchmarks)

| Métrica | Manual | Com IA | Delta |
|---------|--------|--------|-------|
| Fault Detection Rate | 45% | 80-92% | +35-47pp |
| MTTD | 4-24h | 5-30 min | -95%+ |
| MTTR | baseline | -60-85% | Significativo |
| Bug Escape Rate | 15-25% | 2-5% | -80% |
| Custo por bug | $50-200 | $5-20 | -90% |

## Ferramentas Open-Source Mapeadas (50+)

### Observabilidade
| Ferramenta | GitHub Stars | Licença | Custo Self-Host | Quando Usar |
|-----------|-------------|---------|-----------------|-------------|
| SigNoz | 28.5K | MIT/EE | ~$50/mês | Tudo-em-um, mais simples |
| Grafana | 75.4K | AGPL-3.0 | Incluso no stack | Visualização |
| Prometheus | 65K | Apache-2.0 | Incluso no stack | Métricas (K8s) |
| Loki | 28.5K | AGPL-3.0 | Incluso no stack | Logs por labels |
| Tempo | 5.4K | AGPL-3.0 | Incluso no stack | Traces em escala |
| VictoriaMetrics | 12K | Apache-2.0 | ~$30/mês | 7x menos RAM que Prometheus |
| Quickwit | 11.4K | Apache-2.0 | ~$30/mês | Full-text real (Rust) |
| HyperDX | 9.7K | MIT | ~$40/mês | Session replay + traces |
| Uptrace | ~3K | AGPL-3.0 | ~$20/mês | APM leve (40 bytes/span) |

### Testing com IA
| Ferramenta | GitHub Stars | Licença | IA Ready | Quando Usar |
|-----------|-------------|---------|----------|-------------|
| Playwright MCP | 34.8K | Apache-2.0 | Nativo MCP | Agentes IA + browser |
| K6 (Grafana) | 26K | AGPL-3.0 | Via HTTP | Load testing (Go) |
| Locust | 28K | MIT | OpenAI nativo | Load testing (Python) |
| Schemathesis | 3.4K | MIT | Via hooks | API fuzzing (1.4-4.5x mais defeitos) |
| Hypothesis | 12.5K | MPL-2.0 | Corpus p/ IA | Property-based testing |
| axe-core | 11K | MPL-2.0 | JSON p/ LLM | Accessibility (87+ regras WCAG) |
| BackstopJS | 7.2K | MIT | Via imagens | Visual regression |

### Session Replay + Analytics
| Ferramenta | GitHub Stars | Licença | Custo Self-Host | Quando Usar |
|-----------|-------------|---------|-----------------|-------------|
| PostHog | 35.4K | MIT/self-host conforme docs, confirmar componentes | ~$80-150/mês | All-in-one; para saúde é candidato condicionado a privacidade/TCO/licença |
| OpenReplay | 12.2K | AGPL-3.0 | ~$150-300/mês | Session replay puro |
| Umami | 37.5K | MIT | ~$5-10/mês | Analytics simples (melhor custo-benefício) |
| Plausible | 27.6K | AGPL-3.0 | ~$10-20/mês | Privacy-first (CE sem funis) |
| Matomo | 21.7K | GPL-3.0 | ~$20-40/mês | Substituto GA (100+ integrações) |

### Feature Flags
| Ferramenta | GitHub Stars | Licença | Custo | Quando Usar |
|-----------|-------------|---------|-------|-------------|
| Unleash | 13.6K | AGPL-3.0 | ~$20/mês | Substituir LaunchDarkly |
| GrowthBook | 8K | MIT/BSL | ~$20/mês | A/B testing com data warehouse |
| OpenFeature | 942 | Apache-2.0 | — | Padrão CNCF (evitar lock-in) |
| Flagsmith | 6.4K | BSD-3 | ~$15/mês | Licença mais permissiva |

### Chaos Engineering
| Ferramenta | GitHub Stars | Licença | Ambiente | Quando Usar |
|-----------|-------------|---------|----------|-------------|
| Chaos Mesh | 7.8K | Apache-2.0 | Kubernetes | 12+ tipos de falha |
| LitmusChaos | 5.5K | Apache-2.0 | Kubernetes | 80+ experimentos |
| Pumba | 3.1K | Apache-2.0 | Docker | Chaos sem K8s |
| Toxiproxy | 12.1K | MIT | Testes | Resiliência em CI |

### Error Tracking
| Ferramenta | GitHub Stars | Licença | RAM | Quando Usar |
|-----------|-------------|---------|-----|-------------|
| Sentry Self-Hosted | 9.4K | BUSL-1.1 | 16-32 GB | Enterprise (completo mas pesado) |
| GlitchTip | ~1.2K | MIT | 512 MB | Times pequenos (leve) |
| Buggregator | ~2.5K | MIT | 256 MB | Debug PHP local |

### Synthetic Data
| Ferramenta | GitHub Stars | Licença | Quando Usar |
|-----------|-------------|---------|-------------|
| Faker Python | 19.3K | MIT | Dados brasileiros (12 providers pt_BR) |
| Mimesis | ~4.5K | MIT | Mais rápido que Faker, schema-based |
| Synthea | 3.2K | Apache-2.0 | Dados clínicos FHIR (saúde) |
| SDV | 3.5K | BSL | ML para distribuições reais (atenção à licença) |

### API Testing
| Ferramenta | GitHub Stars | Licença | Quando Usar |
|-----------|-------------|---------|-------------|
| Hoppscotch | 79.8K | MIT | Substituir Postman |
| Bruno | 45.4K | MIT | Offline-first, versionável em Git |

### Data Validation
| Ferramenta | GitHub Stars | Licença | Quando Usar |
|-----------|-------------|---------|-------------|
| Great Expectations | 11.6K | Apache-2.0 | "Testes unitários para dados" |
| Soda Core | 2.4K | Elastic-2.0 | Validação YAML declarativa |

## Regulamentações

### LGPD (Brasil)
- Dados de saúde = dados pessoais sensíveis (Art. 5º, II)
- Multas: até 2% faturamento (R$ 50M por infração)
- "Teste de software" por si só não deve ser assumido como base legal suficiente para tratamento de dados sensíveis; validar caso a caso.

### ANVISA
- RDC 657/2022 (BPF) e RDC 658/2022 (registro)
- Software com função clínica = produto para saúde
- Classificação em Classes I-IV

### IEC 62304
- 3 classes de segurança (A/B/C)
- 11 processos de ciclo de vida
- V&V proporcional à classe

### ISO 13485
- QMS para dispositivos médicos
- Audit trails podem ser obrigatórios conforme produto, norma, contrato ou política interna; validar aplicabilidade.
- Matriz de rastreabilidade bidirecional

### FDA 21 CFR Part 11
- Registros eletrônicos com audit trails
- Assinaturas eletrônicas
- Validação de sistemas

## Pipeline de Dados para Testes em Saúde

```
Produção → Classificação PII → Anonimização → Validação → Staging
                                    │
                        ┌───────────┼───────────┐
                        │           │           │
                   Synthea     Tonic.ai    pgcrypto
                   (FHIR)     (NER+sub)   (hash/enc)
```
