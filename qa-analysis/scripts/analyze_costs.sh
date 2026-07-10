#!/bin/bash
# analyze_costs.sh - Triagem de custos QA, sem substituir TCO
# Uso: ./analyze_costs.sh <project_path> [--domain health|saas|general] [--sensitive-data yes|no] [--monthly-volume N] [--devops-hourly-cost N] [--sla critical|standard|low]

set -euo pipefail

PROJECT_PATH="."
DOMAIN="unknown"
SENSITIVE_DATA="unknown"
MONTHLY_VOLUME=""
DEVOPS_HOURLY_COST=""
SLA="unknown"
QA_RESEARCH_ROOT="${QA_RESEARCH_ROOT:-}"
if [ -n "$QA_RESEARCH_ROOT" ]; then
    TCO_MODEL="$QA_RESEARCH_ROOT/operations/tco-model.md"
    LICENSE_MATRIX="$QA_RESEARCH_ROOT/operations/license-risk-matrix.md"
else
    TCO_MODEL="QA_RESEARCH_ROOT not configured"
    LICENSE_MATRIX="QA_RESEARCH_ROOT not configured"
fi

while [ "$#" -gt 0 ]; do
    case "$1" in
        --domain)
            DOMAIN="${2:-unknown}"
            shift 2
            ;;
        --sensitive-data)
            SENSITIVE_DATA="${2:-unknown}"
            shift 2
            ;;
        --monthly-volume)
            MONTHLY_VOLUME="${2:-}"
            shift 2
            ;;
        --devops-hourly-cost)
            DEVOPS_HOURLY_COST="${2:-}"
            shift 2
            ;;
        --sla)
            SLA="${2:-unknown}"
            shift 2
            ;;
        --help|-h)
            echo "Uso: $0 <project_path> [--domain health|saas|general] [--sensitive-data yes|no] [--monthly-volume N] [--devops-hourly-cost N] [--sla critical|standard|low]"
            exit 0
            ;;
        *)
            PROJECT_PATH="$1"
            shift
            ;;
    esac
done

PROJECT_PATH="$(cd "$PROJECT_PATH" && pwd)"
PROJECT_NAME="$(basename "$PROJECT_PATH")"

TOTAL_SAAS=0
TOTAL_OSS=0
DETECTED=0

echo "QA cost triage"
echo "Project: $PROJECT_NAME"
echo "Path: $PROJECT_PATH"
echo "Domain: $DOMAIN"
echo "Sensitive data: $SENSITIVE_DATA"
echo "Monthly volume: ${MONTHLY_VOLUME:-unknown}"
echo "DevOps hourly cost: ${DEVOPS_HOURLY_COST:-unknown}"
echo "SLA: $SLA"
echo "Date: $(date +%Y-%m-%d)"
echo ""
echo "TCO model: $TCO_MODEL"
echo "License risk matrix: $LICENSE_MATRIX"
echo ""

detect_tool() {
    local pattern="$1"
    local tool_name="$2"
    local saas_cost="$3"
    local oss_alt="$4"
    local oss_cost="$5"

    if grep -Rqs "$pattern" "$PROJECT_PATH/package.json" "$PROJECT_PATH/requirements.txt" "$PROJECT_PATH/pyproject.toml" "$PROJECT_PATH/docker-compose.yml" "$PROJECT_PATH/docker-compose.yaml" 2>/dev/null; then
        echo "  - detected: $tool_name | reference_saas_usd=$saas_cost/mo | possible_oss_alt=$oss_alt | oss_infra_hypothesis_usd=$oss_cost/mo"
        TOTAL_SAAS=$((TOTAL_SAAS + saas_cost))
        TOTAL_OSS=$((TOTAL_OSS + oss_cost))
        DETECTED=$((DETECTED + 1))
        return 0
    fi
    return 1
}

echo "Ferramentas detectadas por manifesto"
detect_tool "sentry" "Sentry" 80 "GlitchTip/Sentry Self-Hosted" 15 || true
detect_tool "datadog" "Datadog" 200 "SigNoz/Grafana Stack" 50 || true
detect_tool "newrelic" "New Relic" 150 "SigNoz" 50 || true
detect_tool "@opentelemetry\|opentelemetry" "OpenTelemetry" 0 "Backend agnostico" 0 || true
detect_tool "posthog" "PostHog" 0 "PostHog Self-Hosted" 80 || true
detect_tool "logrocket" "LogRocket" 176 "PostHog/OpenReplay" 80 || true
detect_tool "hotjar" "Hotjar" 80 "PostHog/Umami/Matomo" 40 || true
detect_tool "@microsoft/clarity\|clarity" "Microsoft Clarity" 0 "PostHog/OpenReplay" 80 || true
detect_tool "launchdarkly" "LaunchDarkly" 50 "Unleash/Flagsmith" 20 || true
detect_tool "unleash" "Unleash" 0 "Unleash Self-Hosted" 20 || true
detect_tool "growthbook" "GrowthBook" 0 "GrowthBook Self-Hosted" 20 || true
detect_tool "playwright" "Playwright" 0 "Playwright" 0 || true
detect_tool "browserstack" "BrowserStack" 150 "Playwright multi-browser" 0 || true
detect_tool "applitools" "Applitools" 300 "BackstopJS + revisao visual" 0 || true
detect_tool "gremlin" "Gremlin" 500 "Toxiproxy/Pumba/Chaos Mesh" 0 || true

if [ "$DETECTED" -eq 0 ]; then
    echo "  - no-tools-detected: Nenhuma ferramenta SaaS/QA conhecida foi detectada por manifesto."
fi

echo ""
echo "Resumo heuristico"
echo "  Reference SaaS subtotal: USD $TOTAL_SAAS/mo"
echo "  OSS infra hypothesis subtotal: USD $TOTAL_OSS/mo"

if [ "$TOTAL_SAAS" -gt 0 ]; then
    SAVINGS=$((TOTAL_SAAS - TOTAL_OSS))
    SAVINGS_PCT=$((SAVINGS * 100 / TOTAL_SAAS))
    echo "  Potential infra delta: USD $SAVINGS/mo ($SAVINGS_PCT%)"
else
    echo "  Potential infra delta: not calculated"
fi

echo ""
echo "TCO gate"
MISSING=0
[ "$DOMAIN" = "unknown" ] && echo "  - missing: --domain" && MISSING=$((MISSING + 1))
[ "$SENSITIVE_DATA" = "unknown" ] && echo "  - missing: --sensitive-data yes|no" && MISSING=$((MISSING + 1))
[ -z "$MONTHLY_VOLUME" ] && echo "  - missing: --monthly-volume" && MISSING=$((MISSING + 1))
[ -z "$DEVOPS_HOURLY_COST" ] && echo "  - missing: --devops-hourly-cost" && MISSING=$((MISSING + 1))
[ "$SLA" = "unknown" ] && echo "  - missing: --sla critical|standard|low" && MISSING=$((MISSING + 1))

if [ "$MISSING" -gt 0 ]; then
    echo ""
    echo "Recommendation status: pending"
    echo "Motivo: dados minimos de TCO ausentes. Nao tratar a stack abaixo como recomendacao final."
else
    echo ""
    echo "Recommendation status: ready-for-human-review"
    echo "Motivo: inputs minimos presentes; ainda exige licenca, compliance, sizing e revisao humana."
fi

echo ""
echo "Stack candidata condicionada"
echo "  - Observabilidade: OpenTelemetry + SigNoz ou Grafana Stack conforme volume e operacao."
echo "  - Evidencia browser: Playwright/qa-browser-session com HAR omitido e redaction por padrao."
echo "  - Replay/analytics: PostHog ou OpenReplay apenas apos matriz de dados sensiveis, TCO e licenca."
echo "  - Error tracking: GlitchTip ou Sentry self-hosted/cloud conforme dados capturados e suporte."
echo "  - Feature flags: Unleash/Flagsmith/GrowthBook apenas se houver necessidade de rollout progressivo."
echo "  - Chaos: Toxiproxy/Pumba/Chaos Mesh somente apos observabilidade, rollback e runbooks."

echo ""
echo "Nota para saude/LGPD"
if [ "$DOMAIN" = "health" ] || [ "$SENSITIVE_DATA" = "yes" ]; then
    echo "  Self-hosted pode ser forte preferencia tecnica para dados sensiveis, mas nao e conclusao automatica."
    echo "  Validar base legal, contratos, transferencia internacional, retencao, acesso, licencas e capacidade operacional."
else
    echo "  Sem indicacao explicita de dado sensivel; SaaS, self-hosted ou hibrido devem ser decididos por TCO e risco."
fi
