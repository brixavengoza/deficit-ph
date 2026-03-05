#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/my-skill"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
TARGET_DIR="$CODEX_HOME/skills"

mkdir -p "$TARGET_DIR"

for skill_dir in "$SOURCE_DIR"/*; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"

  if [ ! -f "$skill_dir/SKILL.md" ]; then
    echo "Skipping $skill_name (missing SKILL.md)"
    continue
  fi

  rm -rf "$TARGET_DIR/$skill_name"
  ln -s "$skill_dir" "$TARGET_DIR/$skill_name"
  echo "Linked $skill_name -> $skill_dir"
done

echo "Done. Restart Codex to pick up newly added skills."
