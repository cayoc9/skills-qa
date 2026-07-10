---
name: qa-analysis
description: |
  Análise abrangente de qualidade de software em sistemas. Avalia maturidade de QA (testes, observabilidade,
  automação com IA, resiliência), compliance regulatório (LGPD, ANVISA, FDA, IEC 62304, ISO 13485),
  custos de ferramentas (SaaS vs open-source), e gera recomendações com roadmap priorizado.
  Use quando: analisar QA de um projeto, avaliar observabilidade, verificar compliance, recomendar
  melhorias de teste, comparar ferramentas, planejar QA com IA, ou auditar sistemas de saúde.
metadata:
  author: cayo
  version: "1.0.0"
  source: local
---

# QA Analysis Skill

## Descrição

Skill para análise abrangente de qualidade de software em sistemas, cobrindo maturidade de QA, stack de observabilidade, compliance regulatório (LGPD/saúde), e recomendações de melhoria com foco em automação por IA e alternativas open-source.

## Fonte Canônica e Gates Obrigatórios

Esta skill deve tratar `QA_RESEARCH_ROOT` como fonte documental canônica quando essa variável estiver configurada. Em outros ambientes, peça ao usuário o caminho equivalente ou prossiga apenas com análise do projeto alvo, marcando claims externos como `pendente`.

Antes de recomendar stack, compliance, TCO, uso de IA ou captura de evidências, leia e aplique:

- `$QA_RESEARCH_ROOT/research/evidence-matrix.md`
- `$QA_RESEARCH_ROOT/research/compliance-applicability-matrix.md`
- `$QA_RESEARCH_ROOT/operations/tco-model.md`
- `$QA_RESEARCH_ROOT/operations/license-risk-matrix.md`
- `$QA_RESEARCH_ROOT/operations/sensitive-data-capture-matrix.md`

Use estes status ao relatar conclusões:

- `validado`: fonte primária ou evidência local suficiente.
- `parcial`: fonte existe, mas o claim original era mais amplo.
- `vendor/benchmark`: útil como referência, não promessa.
- `pendente`: exige fact-check, TCO, jurídico, DPO ou decisão de produto.
- `não aplicável`: o alvo analisado não é produto executável ou não está no domínio regulado.

Não use "obrigatório", "proibido", "compliant", "economia garantida" ou "ROI esperado" sem norma, contrato, parecer, TCO preenchido ou fonte primária aplicável ao caso.

## Quando Usar

Use esta skill quando:

- **Analisar a maturidade de QA** de um sistema ou projeto
- **Avaliar stack de observabilidade** (logs, traces, métricas, session replay)
- **Verificar compliance** com regulamentações (LGPD, ANVISA, FDA, IEC 62304)
- **Recomendar melhorias** em processos de teste e qualidade
- **Comparar soluções** SaaS vs open-source para QA
- **Planejar implementação** de QA contínuo com IA
- **Auditar** práticas de teste em projetos de saúde

## Gatilhos

A skill deve ser ativada quando o usuário mencionar:

- "análise de QA", "avaliação de qualidade", "maturidade de testes"
- "observabilidade", "monitoramento", "logs e traces"
- "compliance", "LGPD", "ANVISA", "regulamentação"
- "melhorar testes", "automatizar QA", "QA com IA"
- "session replay", "heatmaps", "product analytics"
- "feature flags", "canary release", "validação progressiva"
- "chaos engineering", "testes adversariais", "resiliência"

## Metodologia de Análise

### Fase 1: Discovery (Entendimento do Sistema)

**Objetivo:** Compreender o contexto, stack tecnológico e domínio do sistema.

**Ações:**
1. Identificar stack tecnológico (linguagens, frameworks, infraestrutura)
2. Mapear domínio do sistema (saúde, financeiro, e-commerce, etc.)
3. Identificar regulamentações aplicáveis (LGPD, ANVISA, FDA, etc.)
4. Mapear arquitetura (monolito, microservices, serverless)
5. Identificar ambientes (dev, staging, produção)

**Perguntas-chave:**
- Qual o domínio do sistema? (saúde, financeiro, educacional, etc.)
- Quais regulamentações se aplicam? (LGPD, ANVISA, FDA, HIPAA)
- Qual a arquitetura? (monolito, microservices, híbrido)
- Quais ambientes existem? (dev, staging, produção)
- Qual o volume de usuários/dados?

### Fase 2: Análise de Maturidade de QA

**Objetivo:** Avaliar o estado atual das práticas de teste.

**Dimensões avaliadas:**

#### 2.1 Testes Automatizados
- [ ] Testes unitários (cobertura, qualidade)
- [ ] Testes de integração
- [ ] Testes E2E (end-to-end)
- [ ] Testes de API/contrato
- [ ] Testes visuais (visual regression)
- [ ] Testes de performance (load, stress, spike)
- [ ] Testes de segurança

**Métricas:**
- Cobertura de código (unit tests)
- Taxa de falha de testes E2E
- Tempo de execução da suite
- Frequência de execução (CI/CD)

#### 2.2 Observabilidade
- [ ] Logs estruturados
- [ ] Traces distribuídos
- [ ] Métricas de negócio
- [ ] Error tracking
- [ ] Session replay
- [ ] Heatmaps
- [ ] Product analytics
- [ ] Real User Monitoring (RUM)

**Ferramentas avaliadas:**
- OpenTelemetry / Jaeger / Zipkin (traces)
- Prometheus / Grafana (métricas)
- Loki / Elasticsearch (logs)
- Sentry / GlitchTip (error tracking)
- PostHog / LogRocket (session replay)
- Hotjar / Microsoft Clarity (heatmaps)
- Amplitude / Mixpanel (analytics)

#### 2.3 Processos de QA
- [ ] Testes manuais exploratórios
- [ ] Testes scriptados
- [ ] User Acceptance Testing (UAT)
- [ ] Validação com stakeholders
- [ ] Post-mortems blameless
- [ ] Gestão de bugs (triagem, priorização)
- [ ] Matriz de rastreabilidade (requisitos → testes)

#### 2.4 Automação com IA
- [ ] Self-healing tests
- [ ] Geração automática de testes
- [ ] Predictive test selection
- [ ] Anomaly detection
- [ ] Root cause analysis automatizada
- [ ] Autonomous testing agents
- [ ] Visual AI para detecção de bugs

#### 2.5 Resiliência e Chaos
- [ ] Chaos engineering
- [ ] GameDays
- [ ] Testes de failover
- [ ] Testes de degradação graciosa
- [ ] Testes adversariais / fuzzing

**Score de Maturidade:**

| Nível | Descrição | Características |
|-------|-----------|-----------------|
| 0 - Inicial | Sem processos formais | Testes ad-hoc, sem automação, sem observabilidade |
| 1 - Básico | Processos reativos | Alguns testes automatizados, error tracking básico |
| 2 - Definido | Processos documentados | Suite de testes completa, observabilidade básica, CI/CD |
| 3 - Gerenciado | Processos medidos | Métricas de qualidade, observabilidade completa, session replay |
| 4 - Otimizado | Melhoria contínua | IA para testes, chaos engineering, feedback loop produção→QA |

### Fase 3: Análise de Compliance

**Objetivo:** Verificar conformidade com regulamentações aplicáveis.

#### 3.1 LGPD (Lei Geral de Proteção de Dados)

**Checklist:**
- [ ] Dados pessoais sensíveis identificados e classificados
- [ ] Base legal para tratamento documentada
- [ ] Consentimento obtido (quando aplicável)
- [ ] Política de privacidade atualizada
- [ ] DPO (Encarregado de Dados) designado
- [ ] Processos para exercício de direitos dos titulares
- [ ] Avaliação de Impacto à Proteção de Dados (AIPD)
- [ ] Acordo de tratamento de dados com operadores
- [ ] Medidas de segurança técnicas e organizacionais
- [ ] Plano de resposta a incidentes

**Para testes de software:**
- [ ] Dados de teste não contêm PII real (ou estão anonimizados)
- [ ] Session replay não grava dados sensíveis (mascaramento configurado)
- [ ] Logs não contêm dados pessoais em texto claro
- [ ] Ambiente de staging usa dados anonimizados/sintéticos
- [ ] Pipeline de anonimização documentado e auditável

#### 3.2 Software de Saúde (se aplicável)

**ANVISA (Brasil):**
- [ ] RDC 657/2022 (BPF para produtos para saúde)
- [ ] RDC 658/2022 (registro de produtos para saúde)
- [ ] Classificação de risco (Classes I-IV)
- [ ] Registro na ANVISA (se software com função clínica)

**IEC 62304 (Ciclo de vida de software médico):**
- [ ] 11 processos do ciclo de vida documentados
- [ ] Classificação de segurança (A/B/C)
- [ ] V&V proporcional à classe de segurança
- [ ] Gestão de riscos (ISO 14971)
- [ ] Matriz de rastreabilidade bidirecional

**ISO 13485 (QMS para dispositivos médicos):**
- [ ] Sistema de qualidade documentado
- [ ] Controle de documentos e registros
- [ ] Audit trails (quem, o que, quando, por quê)
- [ ] Validação de processos
- [ ] Gestão de fornecedores

**FDA 21 CFR Part 11 (EUA, se exportação):**
- [ ] Registros eletrônicos com audit trails
- [ ] Assinaturas eletrônicas válidas
- [ ] Controle de acesso
- [ ] Validação de sistemas

**HL7 FHIR (Interoperabilidade):**
- [ ] Validação de recursos FHIR
- [ ] TestScript para testes de conformidade
- [ ] Testes de integração com outros sistemas FHIR

**Dados de pacientes em testes:**
- [ ] Dados reais de pacientes NÃO usados em testes (ou com consentimento)
- [ ] Dados sintéticos ou anonimizados para testes
- [ ] Pipeline de anonimização documentado
- [ ] Validação de dados sintéticos (fidelidade estatística)

### Fase 4: Análise de Stack e Custos

**Objetivo:** Avaliar stack atual e recomendar otimizações.

#### 4.1 Inventário de Ferramentas

| Categoria | Ferramenta Atual | Custo Mensal | Open-Source? | Self-Hosted? |
|-----------|------------------|--------------|--------------|--------------|
| Error Tracking | | | | |
| APM / Traces | | | | |
| Logs | | | | |
| Session Replay | | | | |
| Analytics | | | | |
| Feature Flags | | | | |
| Testing E2E | | | | |
| Visual Testing | | | | |
| Chaos Engineering | | | | |

#### 4.2 Comparativo SaaS vs Open-Source

**Stack SaaS típico:** ~$1.300-4.200/mês
- Datadog (APM + Logs + RUM): $200-500
- Sentry (Error Tracking): $80-200
- LogRocket (Session Replay): $176-300
- LaunchDarkly (Feature Flags): $50-200
- Applitools (Visual Testing): $300-1.000
- BrowserStack (Cross-browser): $150-375

**Stack Open-Source equivalente:** ~$125-220/mês (infra)
- SigNoz (APM + Logs + Traces): ~$50
- PostHog (Replay + Analytics + Flags): ~$40
- GlitchTip (Error Tracking): ~$15
- Playwright (E2E + Visual + Cross-browser): $0
- Unleash (Feature Flags): ~$20
- Chaos Mesh (Chaos Engineering): $0

**Economia potencial:** a faixa de ~85% deve ser tratada como hipótese de infraestrutura, não TCO validado. Use `$QA_RESEARCH_ROOT/operations/tco-model.md` antes de recomendar migração.

#### 4.3 Recomendações de Stack

**Para saúde / dados sensíveis:**
- **Forte preferência técnica condicionada:** session replay e error tracking self-hosted quando houver dado sensível, ausência de contrato/base adequada ou restrição de residência de dados.
- **Candidatos condicionados:** PostHog, OpenReplay, GlitchTip/Sentry self-hosted e SigNoz devem passar por matriz de privacidade, TCO, licença e operação.
- **SaaS possível:** apenas quando os dados capturados, contratos, transferência internacional, retenção e riscos forem validados por jurídico/DPO e segurança.

**Para outros domínios:**
- **Self-hosted se quiser controle:** Tudo open-source
- **SaaS se quiser conveniência:** Mix de SaaS e open-source

### Fase 5: Recomendações e Roadmap

**Objetivo:** Criar plano de ação priorizado.

#### 5.1 Quick Wins (0-30 dias)

- [ ] Implementar error tracking (Sentry/GlitchTip)
- [ ] Adicionar session replay (PostHog self-hosted)
- [ ] Configurar heatmaps (PostHog/Microsoft Clarity)
- [ ] Instrumentar com OpenTelemetry
- [ ] Adicionar testes E2E básicos (Playwright)

#### 5.2 Curto Prazo (1-3 meses)

- [ ] Migrar para stack open-source (se aplicável)
- [ ] Implementar feature flags (Unleash)
- [ ] Adicionar visual regression testing
- [ ] Configurar anomaly detection em métricas
- [ ] Implementar pipeline de dados anonimizados

#### 5.3 Médio Prazo (3-6 meses)

- [ ] Self-healing tests com IA
- [ ] Geração automática de testes com LLM
- [ ] Predictive test selection no CI
- [ ] Chaos engineering (Chaos Mesh/Litmus)
- [ ] Autonomous testing agents

#### 5.4 Longo Prazo (6-12 meses)

- [ ] Pipeline fechado: observabilidade → IA → testes → correção
- [ ] Quality score automatizado
- [ ] Feedback loop produção → QA
- [ ] AI fuzzing para APIs
- [ ] Autonomous QA system completo

### Fase 6: Relatório Final

**Estrutura do relatório:**

```markdown
# Relatório de Análise de QA — [Nome do Sistema]

## 1. Executive Summary
- Score de maturidade atual (0-4)
- Score de maturidade alvo (0-4)
- Principais gaps identificados
- ROI estimado das melhorias

## 2. Contexto do Sistema
- Stack tecnológico
- Domínio e regulamentações
- Arquitetura
- Volume de usuários/dados

## 3. Análise de Maturidade
### 3.1 Testes Automatizados
### 3.2 Observabilidade
### 3.3 Processos de QA
### 3.4 Automação com IA
### 3.5 Resiliência e Chaos

## 4. Análise de Compliance
### 4.1 LGPD
### 4.2 Regulamentações Específicas (saúde, financeiro, etc.)

## 5. Análise de Stack e Custos
### 5.1 Inventário de Ferramentas
### 5.2 Comparativo SaaS vs Open-Source
### 5.3 Recomendações de Stack

## 6. Roadmap de Melhorias
### 6.1 Quick Wins (0-30 dias)
### 6.2 Curto Prazo (1-3 meses)
### 6.3 Médio Prazo (3-6 meses)
### 6.4 Longo Prazo (6-12 meses)

## 7. Estimativa de ROI
- Custo atual (ferramentas + tempo de QA)
- Custo projetado (após melhorias)
- Economia estimada
- Payback estimado

## 8. Riscos e Mitigações
- Riscos de não implementar melhorias
- Riscos de implementação
- Mitigações

## 9. Próximos Passos
- Ações imediatas
- Responsáveis
- Prazos
```

## Scripts de Análise

### analyze_maturity.sh

Script para análise automatizada de maturidade:

```bash
#!/bin/bash
# Analisa maturidade de QA em um projeto

PROJECT_PATH=$1

if [ -z "$PROJECT_PATH" ]; then
    echo "Uso: $0 <project_path>"
    exit 1
fi

echo "=== Análise de Maturidade de QA ==="
echo "Projeto: $PROJECT_PATH"
echo ""

# Verifica testes automatizados
echo "## Testes Automatizados"
if [ -d "$PROJECT_PATH/tests" ] || [ -d "$PROJECT_PATH/test" ]; then
    TEST_COUNT=$(find "$PROJECT_PATH" -name "*.test.*" -o -name "*.spec.*" | wc -l)
    echo "- Testes encontrados: $TEST_COUNT"
else
    echo "- Nenhum teste encontrado"
fi

# Verifica observabilidade
echo ""
echo "## Observabilidade"
if grep -r "opentelemetry\|@opentelemetry" "$PROJECT_PATH/package.json" 2>/dev/null; then
    echo "- OpenTelemetry: ✓"
else
    echo "- OpenTelemetry: ✗"
fi

if grep -r "sentry\|@sentry" "$PROJECT_PATH/package.json" 2>/dev/null; then
    echo "- Sentry: ✓"
else
    echo "- Sentry: ✗"
fi

# Verifica feature flags
echo ""
echo "## Feature Flags"
if grep -r "unleash\|launchdarkly\|growthbook" "$PROJECT_PATH/package.json" 2>/dev/null; then
    echo "- Feature flags: ✓"
else
    echo "- Feature flags: ✗"
fi

echo ""
echo "=== Análise Concluída ==="
```

### check_lgpd_compliance.sh

Script para verificar conformidade básica com LGPD:

```bash
#!/bin/bash
# Verifica conformidade básica com LGPD em código

PROJECT_PATH=$1

echo "=== Verificação de Conformidade LGPD ==="
echo ""

# Verifica se há dados sensíveis em logs
echo "## Dados Sensíveis em Logs"
SENSITIVE_PATTERNS="cpf|cnpj|password|senha|credit.card|cartao"
if grep -rEi "$SENSITIVE_PATTERNS" "$PROJECT_PATH/src" --include="*.log" 2>/dev/null; then
    echo "⚠️  Dados sensíveis encontrados em logs"
else
    echo "✓ Nenhum dado sensível óbvio em logs"
fi

# Verifica se há mascaramento de dados
echo ""
echo "## Mascaramento de Dados"
if grep -rEi "mask|redact|obfuscate" "$PROJECT_PATH/src" 2>/dev/null; then
    echo "✓ Funções de mascaramento encontradas"
else
    echo "⚠️  Nenhuma função de mascaramento encontrada"
fi

# Verifica política de privacidade
echo ""
echo "## Política de Privacidade"
if [ -f "$PROJECT_PATH/privacy-policy.md" ] || [ -f "$PROJECT_PATH/PRIVACY.md" ]; then
    echo "✓ Política de privacidade encontrada"
else
    echo "⚠️  Política de privacidade não encontrada"
fi

echo ""
echo "=== Verificação Concluída ==="
```

## Base de Conhecimento

### Fontes de Referência

Esta skill é baseada em pesquisas profundas realizadas em Julho/2026:

1. **QA + Observabilidade** (`qa-observabilidade-research.html`)
   - 5 pilares do QA ampliado
   - 26 fontes consultadas
   - Dados da indústria (Splunk, IBM, Honeycomb)

2. **IA no QA** (`ai-qa-homologacao-research.html`)
   - Arquitetura dos 4 anéis
   - 25 fontes consultadas
   - 10 papers acadêmicos do arXiv

3. **Saúde + Open-Source + ROI** (`qa-saude-opensource-roi.html`)
   - Regulamentação (ANVISA, FDA, IEC 62304)
   - LGPD e dados de saúde
   - Stack open-source completa
   - Comparativo de custos

### Podcasts Gerados

4 podcasts em português brasileiro (181 MB total):
- `podcast-qa-observabilidade.mp3` (39 MB)
- `podcast-ia-no-qa.mp3` (45 MB)
- `podcast-roi-opensource.mp3` (51 MB)
- `podcast-saude-lgpd.mp3` (46 MB)

### Dados da Indústria

- **ROI:** 301-400% em 3 anos e payback <6 meses são benchmarks/vendor claims; não usar como promessa sem caso interno.
- **KPIs com IA:** fault detection 45%→80-92%, MTTD 4-24h→5-30min devem ser tratados como claims de pesquisa/benchmark pendentes de replicação no domínio analisado.
- **Custo downtime:** $300K/hora (sistemas críticos)
- **Multas LGPD:** até 2% faturamento (R$ 50M por infração)
- **Stack open-source:** ~$200/mês vs SaaS $1.300-4.200/mês é hipótese de infraestrutura; validar TCO com pessoas, backup, suporte, segurança, retenção e incidentes.

## Exemplos de Uso

### Exemplo 1: Análise Completa

```
Usuário: "Faça uma análise de QA do projeto /path/to/project"

Skill:
1. Executa analyze_maturity.sh
2. Verifica stack tecnológico
3. Avalia maturidade (0-4)
4. Verifica compliance (LGPD, saúde, etc.)
5. Analisa custos de ferramentas
6. Gera relatório completo com roadmap
```

### Exemplo 2: Foco em Saúde

```
Usuário: "Avalie a conformidade com ANVISA deste sistema de saúde"

Skill:
1. Identifica regulamentações aplicáveis
2. Verifica IEC 62304 (ciclo de vida)
3. Verifica ISO 13485 (QMS)
4. Verifica dados de pacientes em testes
5. Avalia audit trails
6. Gera relatório de compliance
```

### Exemplo 3: Otimização de Custos

```
Usuário: "Estamos gastando $3.000/mês em ferramentas de QA. Como reduzir?"

Skill:
1. Inventaria ferramentas atuais
2. Compara com alternativas open-source
3. Calcula economia potencial
4. Avalia trade-offs (manutenção vs custo)
5. Recomenda stack otimizado
6. Gera plano de migração
```

## Limitações

- Esta skill fornece recomendações baseadas em melhores práticas, mas não substitui consultoria jurídica para compliance
- Análise de maturidade é qualitativa e deve ser validada com a equipe
- Custos de ferramentas são estimativas e podem variar
- Regulamentações mudam frequentemente — verifique sempre a versão mais recente

## Créditos

Skill desenvolvida com base em pesquisas profundas realizadas em Julho/2026, incluindo:
- 51 fontes acadêmicas e da indústria
- 4 podcasts educacionais gerados
- Análise de 25+ ferramentas de QA
- Mapeamento de regulamentações (LGPD, ANVISA, FDA, IEC, ISO)
