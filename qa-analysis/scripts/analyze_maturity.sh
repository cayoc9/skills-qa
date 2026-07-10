#!/bin/bash
# analyze_maturity.sh - Analise conservadora de maturidade de QA
# Uso: ./analyze_maturity.sh <project_path> [--project-type auto|documentation|web-app|backend|health-samd|saas-general]

set -euo pipefail

PROJECT_PATH="."
PROJECT_TYPE="auto"

while [ "$#" -gt 0 ]; do
    case "$1" in
        --project-type)
            PROJECT_TYPE="${2:-auto}"
            shift 2
            ;;
        --help|-h)
            echo "Uso: $0 <project_path> [--project-type auto|documentation|web-app|backend|health-samd|saas-general]"
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

EXCLUDES=(
    -not -path "*/node_modules/*"
    -not -path "*/.git/*"
    -not -path "*/vendor/*"
    -not -path "*/research/raw/*"
    -not -path "*/session-exports/*"
    -not -path "*/docs/*"
    -not -path "*/templates/*"
    -not -path "*/reviews/*"
    -not -path "*/operations/*"
    -not -path "*/media/*"
)

count_files() {
    find "$PROJECT_PATH" "${EXCLUDES[@]}" "$@" 2>/dev/null | wc -l | tr -d ' '
}

has_file() {
    find "$PROJECT_PATH" "${EXCLUDES[@]}" "$@" -print -quit 2>/dev/null | grep -q .
}

detect_project_type() {
    if [ "$PROJECT_TYPE" != "auto" ]; then
        echo "$PROJECT_TYPE"
        return
    fi

    if [ -f "$PROJECT_PATH/research-index.md" ] && [ -d "$PROJECT_PATH/research" ] && [ -d "$PROJECT_PATH/operations" ]; then
        echo "documentation"
        return
    fi

    local md_count src_count app_markers
    md_count="$(find "$PROJECT_PATH" -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')"
    src_count="$(find "$PROJECT_PATH" \( -path "*/src/*" -o -path "*/app/*" -o -path "*/lib/*" -o -path "*/backend/*" -o -path "*/frontend/*" \) -type f 2>/dev/null | wc -l | tr -d ' ')"
    app_markers=0
    [ -f "$PROJECT_PATH/package.json" ] && app_markers=$((app_markers + 1))
    [ -f "$PROJECT_PATH/pom.xml" ] && app_markers=$((app_markers + 1))
    [ -f "$PROJECT_PATH/build.gradle" ] && app_markers=$((app_markers + 1))
    [ -f "$PROJECT_PATH/pyproject.toml" ] && app_markers=$((app_markers + 1))
    [ -f "$PROJECT_PATH/go.mod" ] && app_markers=$((app_markers + 1))

    if [ "$md_count" -gt 10 ] && [ "$src_count" -eq 0 ] && [ "$app_markers" -le 1 ]; then
        echo "documentation"
    else
        echo "web-app"
    fi
}

PROJECT_TYPE="$(detect_project_type)"

finding() {
    local status="$1"
    local confidence="$2"
    local message="$3"
    local evidence="${4:-}"
    printf '  - status=%s confidence=%s :: %s' "$status" "$confidence" "$message"
    if [ -n "$evidence" ]; then
        printf ' | evidence=%s' "$evidence"
    fi
    printf '\n'
}

echo "QA maturity analysis"
echo "Project: $PROJECT_NAME"
echo "Path: $PROJECT_PATH"
echo "Project type: $PROJECT_TYPE"
echo "Date: $(date +%Y-%m-%d)"
echo ""

if [ "$PROJECT_TYPE" = "documentation" ]; then
    echo "Documentation package mode"
    finding "not-applicable" "high" "Produto executavel nao detectado; score de maturidade de QA de produto nao sera calculado."
    finding "validated" "medium" "Use matrizes documentais como fonte de governanca." "research/evidence-matrix.md, operations/"
    md_count="$(find "$PROJECT_PATH" -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')"
    finding "validated" "high" "Arquivos Markdown encontrados: $md_count"
    exit 0
fi

SCORE=0
MAX_SCORE=90

echo "1. Stack tecnologico"
if [ -f "$PROJECT_PATH/package.json" ]; then
    finding "validated" "high" "JavaScript/TypeScript detectado" "package.json"
fi
if [ -f "$PROJECT_PATH/pyproject.toml" ] || [ -f "$PROJECT_PATH/requirements.txt" ]; then
    finding "validated" "high" "Python detectado" "pyproject.toml/requirements.txt"
fi
if [ -f "$PROJECT_PATH/pom.xml" ] || [ -f "$PROJECT_PATH/build.gradle" ]; then
    finding "validated" "high" "Java/JVM detectado" "pom.xml/build.gradle"
fi
if [ -f "$PROJECT_PATH/go.mod" ]; then
    finding "validated" "high" "Go detectado" "go.mod"
fi

echo ""
echo "2. Testes automatizados"
UNIT_TESTS="$(count_files \( -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.*" -o -name "test_*" \) -type f)"
if [ "$UNIT_TESTS" -gt 0 ]; then
    finding "validated" "medium" "Arquivos de teste unitario/integracao encontrados: $UNIT_TESTS"
    SCORE=$((SCORE + 10))
else
    finding "risk" "medium" "Testes unitarios/integracao nao encontrados por heuristica."
fi

E2E_TESTS="$(count_files \( -path "*/e2e/*" -o -path "*/cypress/*" -o -path "*/playwright/*" -o -path "*/tests/e2e/*" \) -type f)"
if [ "$E2E_TESTS" -gt 0 ]; then
    finding "validated" "medium" "Arquivos E2E encontrados: $E2E_TESTS"
    SCORE=$((SCORE + 10))
else
    finding "risk" "medium" "Testes E2E nao encontrados por heuristica."
fi

if grep -q "playwright" "$PROJECT_PATH/package.json" 2>/dev/null; then
    finding "validated" "high" "Playwright detectado" "package.json"
    SCORE=$((SCORE + 5))
fi
if grep -q "cypress" "$PROJECT_PATH/package.json" 2>/dev/null; then
    finding "validated" "high" "Cypress detectado" "package.json"
    SCORE=$((SCORE + 5))
fi

echo ""
echo "3. Observabilidade"
if grep -Rqs "@sentry\|sentry-sdk\|glitchtip" "$PROJECT_PATH/package.json" "$PROJECT_PATH/requirements.txt" "$PROJECT_PATH/pyproject.toml" 2>/dev/null; then
    finding "validated" "medium" "Error tracking detectado"
    SCORE=$((SCORE + 10))
else
    finding "risk" "medium" "Error tracking nao detectado nos manifestos principais."
fi

if grep -Rqs "@opentelemetry\|opentelemetry" "$PROJECT_PATH/package.json" "$PROJECT_PATH/requirements.txt" "$PROJECT_PATH/pyproject.toml" 2>/dev/null; then
    finding "validated" "medium" "OpenTelemetry detectado"
    SCORE=$((SCORE + 10))
else
    finding "risk" "medium" "OpenTelemetry nao detectado nos manifestos principais."
fi

if grep -q "posthog\|logrocket\|hotjar\|clarity" "$PROJECT_PATH/package.json" 2>/dev/null; then
    finding "validated" "medium" "Analytics/replay detectado" "package.json"
    SCORE=$((SCORE + 10))
else
    finding "not-found" "low" "Analytics/replay nao detectado; pode ser intencional conforme privacidade/TCO."
fi

echo ""
echo "4. Feature flags e validacao progressiva"
if grep -Rqs "unleash\|launchdarkly\|growthbook\|openfeature\|flagd" "$PROJECT_PATH/package.json" "$PROJECT_PATH/requirements.txt" "$PROJECT_PATH/pyproject.toml" 2>/dev/null; then
    finding "validated" "medium" "Feature flags detectado"
    SCORE=$((SCORE + 10))
else
    finding "not-found" "low" "Feature flags nao detectado; avaliar apenas se houver necessidade de rollout progressivo."
fi

echo ""
echo "5. Compliance e privacidade"
if has_file \( -iname "privacy*" -o -iname "PRIVACY*" -o -iname "*privacidade*" \) -type f; then
    finding "validated" "medium" "Documento de privacidade encontrado"
    SCORE=$((SCORE + 5))
else
    finding "risk" "low" "Documento de privacidade nao encontrado por heuristica."
fi

if find "$PROJECT_PATH" "${EXCLUDES[@]}" \( -path "*/src/*" -o -path "*/app/*" -o -path "*/lib/*" \) -type f -print0 2>/dev/null | xargs -0 grep -li "mask\|redact\|obfuscate\|sanitize\|anonymize" 2>/dev/null | grep -q .; then
    finding "validated" "medium" "Possiveis funcoes de mascaramento encontradas"
    SCORE=$((SCORE + 5))
else
    finding "risk" "low" "Mascaramento nao encontrado em codigo fonte por heuristica."
fi

PERCENTAGE=$((SCORE * 100 / MAX_SCORE))
echo ""
echo "Resultado"
echo "Score heuristico: $SCORE / $MAX_SCORE ($PERCENTAGE%)"
echo "Nota: score e qualitativo; confirmar com testes, CI, arquitetura e entrevistas com equipe."
