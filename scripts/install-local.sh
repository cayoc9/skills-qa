#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
codex_skill_root="${CODEX_SKILLS_DIR:-$HOME/.codex/skills}"
runtime_root="${QA_BROWSER_RUNTIME:-$HOME/.local/share/qa-browser-session}"
bin_root="${HOME}/.local/bin"

mkdir -p "$codex_skill_root" "$runtime_root" "$bin_root"

for skill_dir in "$repo_root"/qa-*; do
  [ -d "$skill_dir" ] || continue
  [ -f "$skill_dir/SKILL.md" ] || continue
  skill_name="$(basename "$skill_dir")"
  rm -rf "$codex_skill_root/$skill_name"
  cp -a "$skill_dir" "$codex_skill_root/$skill_name"
  echo "Instalada: $codex_skill_root/$skill_name"
done

if [ -f "$codex_skill_root/qa-browser-session/scripts/qa-browser.mjs" ]; then
  if [ ! -f "$runtime_root/package.json" ]; then
    cat > "$runtime_root/package.json" <<'JSON'
{
  "name": "qa-browser-session-runtime",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@playwright/test": "^1.54.0"
  }
}
JSON
  fi

  npm install --prefix "$runtime_root"
  chmod +x "$codex_skill_root/qa-browser-session/scripts/qa-browser.mjs"
  ln -sf "$codex_skill_root/qa-browser-session/scripts/qa-browser.mjs" "$bin_root/qa-browser"
  echo "Binario: $bin_root/qa-browser"
fi

echo "Instalacao concluida."
