#!/usr/bin/env bash
set -euo pipefail

SESSION="${QA_TMUX_SESSION:-qa-browser-${PWD##*/}}"
STATE_DIR="${QA_TMUX_STATE_DIR:-.qa-browser/tmux}"

usage() {
  cat <<'EOF'
Uso:
  qa-browser-tmux.sh start -- <comando> [args...]
  qa-browser-tmux.sh status
  qa-browser-tmux.sh capture [linhas]
  qa-browser-tmux.sh save [arquivo]
  qa-browser-tmux.sh send <texto sem segredo>
  qa-browser-tmux.sh stop
  qa-browser-tmux.sh kill

Variaveis:
  QA_TMUX_SESSION   nome da sessao (padrao: qa-browser-<diretorio>)
  QA_TMUX_STATE_DIR diretorio local para logs de pane (padrao: .qa-browser/tmux)
EOF
}

has_session() {
  tmux has-session -t "$SESSION" 2>/dev/null
}

if [[ $# -lt 1 ]]; then
  usage
  exit 2
fi

action="$1"
shift

case "$action" in
  start)
    [[ "${1:-}" == "--" ]] && shift
    if [[ $# -eq 0 ]]; then
      echo "Erro: informe o comando apos --." >&2
      exit 2
    fi
    if has_session; then
      echo "Erro: sessao tmux ja existe: $SESSION" >&2
      exit 1
    fi
    mkdir -p "$STATE_DIR"
    tmux new-session -d -s "$SESSION" -c "$PWD" "$@"
    echo "Sessao tmux iniciada: $SESSION"
    echo "Status: $0 status"
    echo "Captura: $0 capture"
    echo "Encerramento limpo: $0 stop"
    ;;

  status)
    if has_session; then
      tmux list-windows -t "$SESSION" -F 'session=#{session_name} window=#{window_index} name=#{window_name} panes=#{window_panes} active=#{window_active}'
      tmux display-message -p -t "$SESSION" 'attached=#{session_attached} activity=#{window_activity} command=#{pane_current_command}'
    else
      echo "Sessao inexistente: $SESSION"
      exit 1
    fi
    ;;

  capture)
    if ! has_session; then
      echo "Sessao inexistente: $SESSION" >&2
      exit 1
    fi
    lines="${1:-300}"
    tmux capture-pane -p -t "$SESSION" -S "-$lines"
    ;;

  save)
    if ! has_session; then
      echo "Sessao inexistente: $SESSION" >&2
      exit 1
    fi
    mkdir -p "$STATE_DIR"
    output="${1:-$STATE_DIR/${SESSION}.log}"
    tmux capture-pane -p -t "$SESSION" -S -5000 > "$output"
    echo "Pane salvo em: $output"
    ;;

  send)
    if ! has_session; then
      echo "Sessao inexistente: $SESSION" >&2
      exit 1
    fi
    if [[ $# -eq 0 ]]; then
      echo "Erro: informe um comando sem credenciais ou segredos." >&2
      exit 2
    fi
    tmux send-keys -t "$SESSION" -- "$*" C-m
    ;;

  stop)
    if ! has_session; then
      echo "Sessao inexistente: $SESSION"
      exit 0
    fi
    pane_pid="$(tmux list-panes -t "$SESSION" -F '#{pane_pid}' | head -n 1)"
    pane_command="$(ps -p "$pane_pid" -o args= 2>/dev/null || true)"
    if [[ "$pane_command" == *qa-browser.mjs* ]]; then
      runner_pid="$pane_pid"
    else
      runner_pid="$(pgrep -P "$pane_pid" -f 'node .*qa-browser\.mjs' | head -n 1 || true)"
    fi
    if [[ -z "$runner_pid" ]]; then
      echo "Erro: nao encontrei o processo Node do runner na sessao $SESSION." >&2
      echo "Use '$0 capture' para diagnosticar ou '$0 kill' para forcar o encerramento." >&2
      exit 1
    fi
    kill -USR2 "$runner_pid"
    for _ in {1..120}; do
      sleep 0.25
      has_session || { echo "Sessao encerrada: $SESSION"; exit 0; }
    done
    echo "Aviso: a sessao nao encerrou em 30s; mantendo-a para inspeção: $SESSION" >&2
    exit 1
    ;;

  kill)
    if has_session; then
      tmux kill-session -t "$SESSION"
      echo "Sessao finalizada forcadamente: $SESSION"
    else
      echo "Sessao inexistente: $SESSION"
    fi
    ;;

  help|-h|--help)
    usage
    ;;

  *)
    echo "Acao desconhecida: $action" >&2
    usage >&2
    exit 2
    ;;
esac
