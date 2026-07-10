#!/bin/bash
# check_compliance.sh - Triagem tecnica de compliance, nao parecer juridico
# Uso: ./check_compliance.sh <project_path> [--project-type auto|documentation|web-app|backend|health-samd|saas-general] [--health]

set -euo pipefail

PROJECT_PATH="."
PROJECT_TYPE="auto"

while [ "$#" -gt 0 ]; do
    case "$1" in
        --project-type)
            PROJECT_TYPE="${2:-auto}"
            shift 2
            ;;
        --health)
            if [ "$PROJECT_TYPE" = "auto" ]; then
                PROJECT_TYPE="health-samd"
            fi
            shift
            ;;
        --help|-h)
            echo "Uso: $0 <project_path> [--project-type auto|documentation|web-app|backend|health-samd|saas-general] [--health]"
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

detect_project_type() {
    if [ "$PROJECT_TYPE" != "auto" ]; then
        echo "$PROJECT_TYPE"
        return
    fi

    if [ -f "$PROJECT_PATH/research-index.md" ] && [ -d "$PROJECT_PATH/research" ] && [ -d "$PROJECT_PATH/operations" ]; then
        echo "documentation"
        return
    fi

    local md_count src_count
    md_count="$(find "$PROJECT_PATH" -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')"
    src_count="$(find "$PROJECT_PATH" \( -path "*/src/*" -o -path "*/app/*" -o -path "*/lib/*" -o -path "*/backend/*" -o -path "*/frontend/*" \) -type f 2>/dev/null | wc -l | tr -d ' ')"
    if [ "$md_count" -gt 10 ] && [ "$src_count" -eq 0 ]; then
        echo "documentation"
    else
        echo "web-app"
    fi
}

PROJECT_TYPE="$(detect_project_type)"

PASSES=0
WARNINGS=0
RISKS=0
NA=0

finding() {
    local status="$1"
    local confidence="$2"
    local message="$3"
    local evidence="${4:-}"
    case "$status" in
        pass|validated) PASSES=$((PASSES + 1)) ;;
        warning|pending) WARNINGS=$((WARNINGS + 1)) ;;
        risk) RISKS=$((RISKS + 1)) ;;
        not-applicable) NA=$((NA + 1)) ;;
    esac
    printf '  - status=%s confidence=%s :: %s' "$status" "$confidence" "$message"
    if [ -n "$evidence" ]; then
        printf ' | evidence=%s' "$evidence"
    fi
    printf '\n'
}

echo "Compliance triage"
echo "Project: $PROJECT_NAME"
echo "Path: $PROJECT_PATH"
echo "Project type: $PROJECT_TYPE"
echo "Date: $(date +%Y-%m-%d)"
echo "Scope: triagem tecnica; nao substitui juridico/DPO."
echo ""

if [ "$PROJECT_TYPE" = "documentation" ]; then
    echo "Documentation package mode"
    finding "not-applicable" "high" "HTTPS, CORS, rate limit e audit trail de produto nao se aplicam a pacote documental."
    if [ -f "$PROJECT_PATH/research/compliance-applicability-matrix.md" ]; then
        finding "validated" "high" "Matriz de aplicabilidade de compliance encontrada." "research/compliance-applicability-matrix.md"
    else
        finding "warning" "medium" "Matriz de aplicabilidade de compliance nao encontrada."
    fi
    if [ -f "$PROJECT_PATH/operations/sensitive-data-capture-matrix.md" ]; then
        finding "validated" "high" "Matriz de captura de dados sensiveis encontrada." "operations/sensitive-data-capture-matrix.md"
    else
        finding "warning" "medium" "Matriz de captura de dados sensiveis nao encontrada."
    fi
    echo ""
    echo "Resultado: passes=$PASSES warnings=$WARNINGS risks=$RISKS not_applicable=$NA"
    exit 0
fi

echo "1. Dados sensiveis em logs e codigo"
SENSITIVE_IN_LOGS="$( (grep -RIE "(cpf|cnpj|password|senha|credit.card|cartao|token|api.key|secret)" "$PROJECT_PATH" --include="*.log" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=vendor 2>/dev/null || true) | wc -l | tr -d ' ')"
if [ "$SENSITIVE_IN_LOGS" -gt 0 ]; then
    finding "risk" "medium" "Possiveis dados sensiveis encontrados em arquivos de log: $SENSITIVE_IN_LOGS"
else
    finding "validated" "medium" "Nenhum dado sensivel obvio encontrado em arquivos .log."
fi

HARDCODED="$( (grep -RIE "(password|senha|api_key|secret_key|access_token)\s*[:=]\s*['\"][^'\"]+['\"]" "$PROJECT_PATH/src" "$PROJECT_PATH/app" "$PROJECT_PATH/lib" --exclude-dir=node_modules 2>/dev/null || true) | (grep -vi "process.env\|os.environ\|config.get\|env(" || true) | wc -l | tr -d ' ')"
if [ "$HARDCODED" -gt 0 ]; then
    finding "risk" "medium" "Possiveis credenciais hardcoded: $HARDCODED"
else
    finding "validated" "medium" "Credenciais hardcoded nao detectadas por heuristica."
fi

MASK_FILES="$( (grep -Rli "mask\|redact\|obfuscate\|sanitize\|anonymize\|hash.*pii\|encrypt.*sensitive" "$PROJECT_PATH/src" "$PROJECT_PATH/app" "$PROJECT_PATH/lib" --exclude-dir=node_modules 2>/dev/null || true) | wc -l | tr -d ' ')"
if [ "$MASK_FILES" -gt 0 ]; then
    finding "validated" "medium" "Possiveis funcoes de mascaramento encontradas em $MASK_FILES arquivos."
else
    finding "warning" "low" "Mascaramento nao encontrado por heuristica."
fi

echo ""
echo "2. Documentacao LGPD/privacidade"
if find "$PROJECT_PATH" -maxdepth 3 \( -iname "privacy*" -o -iname "PRIVACY*" -o -iname "*privacidade*" \) -not -path "*/node_modules/*" 2>/dev/null | grep -q .; then
    finding "validated" "medium" "Documento de privacidade encontrado."
else
    finding "warning" "low" "Politica de privacidade nao encontrada por heuristica."
fi

if find "$PROJECT_PATH" -maxdepth 3 \( -iname "terms*" -o -iname "TERMS*" -o -iname "termos*" \) -not -path "*/node_modules/*" 2>/dev/null | grep -q .; then
    finding "validated" "medium" "Termos de uso encontrados."
else
    finding "warning" "low" "Termos de uso nao encontrados por heuristica."
fi

echo ""
echo "3. Controles basicos de app/API"
if grep -Rqs "https\|ssl\|tls\|certbot\|letsencrypt" "$PROJECT_PATH/docker-compose.yml" "$PROJECT_PATH/nginx.conf" "$PROJECT_PATH/Caddyfile" 2>/dev/null; then
    finding "validated" "medium" "Configuracao TLS/HTTPS detectada."
else
    finding "warning" "low" "TLS/HTTPS nao detectado; pode estar fora do repo ou gerenciado pela plataforma."
fi

if grep -Rqi "cors\|Access-Control" "$PROJECT_PATH/src" "$PROJECT_PATH/app" 2>/dev/null; then
    finding "validated" "medium" "CORS detectado."
else
    finding "warning" "low" "CORS nao detectado; avaliar se o alvo e API web."
fi

if grep -Rqi "rate.limit\|throttle\|limiter" "$PROJECT_PATH/src" "$PROJECT_PATH/app" "$PROJECT_PATH/nginx.conf" 2>/dev/null; then
    finding "validated" "medium" "Rate limiting detectado."
else
    finding "warning" "low" "Rate limiting nao detectado por heuristica."
fi

echo ""
echo "4. Saude e regulacao"
if [ "$PROJECT_TYPE" = "health-samd" ]; then
    REG_REFS="$( (grep -Rli "anvisa\|iec.62304\|iso.13485\|fhir\|hl7\|dicom\|21.cfr.11\|samd\|rdc.657\|rdc.658" "$PROJECT_PATH" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || true) | wc -l | tr -d ' ')"
    if [ "$REG_REFS" -gt 0 ]; then
        finding "validated" "medium" "Referencias regulatorias encontradas em $REG_REFS arquivos."
    else
        finding "pending" "medium" "Referencias regulatorias nao encontradas; classificar produto e aplicabilidade antes de concluir."
    fi

    AUDIT="$( (grep -Rli "audit.log\|audit.trail\|audit_log\|log.*change\|track.*change\|history.*record" "$PROJECT_PATH/src" "$PROJECT_PATH/app" --exclude-dir=node_modules 2>/dev/null || true) | wc -l | tr -d ' ')"
    if [ "$AUDIT" -gt 0 ]; then
        finding "validated" "medium" "Possiveis audit trails encontrados em $AUDIT arquivos."
    else
        finding "pending" "medium" "Audit trail nao detectado; requer validacao de aplicabilidade regulatoria, produto e risco."
    fi

    if find "$PROJECT_PATH" -maxdepth 4 \( -iname "*traceability*" -o -iname "*rastreabilidade*" -o -iname "*matriz*" \) -not -path "*/node_modules/*" 2>/dev/null | grep -q .; then
        finding "validated" "medium" "Matriz de rastreabilidade encontrada."
    else
        finding "pending" "medium" "Matriz de rastreabilidade nao encontrada; validar necessidade conforme SaMD/classe/contrato."
    fi
else
    finding "not-applicable" "high" "Checks SaMD/ANVISA/IEC nao aplicados porque project-type=$PROJECT_TYPE."
fi

echo ""
echo "Resultado: passes=$PASSES warnings=$WARNINGS risks=$RISKS not_applicable=$NA"
if [ "$RISKS" -gt 0 ]; then
    echo "Status: riscos tecnicos encontrados; revisar evidencias antes de concluir compliance."
elif [ "$WARNINGS" -gt 0 ]; then
    echo "Status: sem risco critico por heuristica; ha pendencias a revisar."
else
    echo "Status: triagem tecnica sem achados relevantes por heuristica."
fi
