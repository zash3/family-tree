#!/usr/bin/env bash
# Publish dist/ to the gh-pages branch, which GitHub Pages serves.
#
# The branch holds only the build output and shares no history with main, so a
# deploy is one commit that replaces the previous tree. Uses a temporary git
# worktree rather than a dependency.
set -euo pipefail

cd "$(dirname "$0")/.."
BRANCH=gh-pages
WORKTREE=$(mktemp -d)
trap 'git worktree remove --force "$WORKTREE" 2>/dev/null || true; rm -rf "$WORKTREE"' EXIT

npm run build

git fetch origin "$BRANCH" 2>/dev/null || true
if ! git rev-parse --verify --quiet "origin/$BRANCH" >/dev/null; then
  # Seed an empty root commit. `git worktree add --orphan` would be the obvious
  # way, but it only exists from git 2.42.
  empty_tree=$(git hash-object -t tree /dev/null)
  git branch -f "$BRANCH" "$(git commit-tree "$empty_tree" -m "init $BRANCH")"
  git push -q origin "$BRANCH"
fi
git worktree add --force "$WORKTREE" -B "$BRANCH" "origin/$BRANCH" >/dev/null

# Wipe the old build, keeping git's own metadata.
find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R dist/. "$WORKTREE"/
# Without this, Pages runs the output through Jekyll and drops _-prefixed files.
touch "$WORKTREE/.nojekyll"

git -C "$WORKTREE" add -A
if git -C "$WORKTREE" diff --cached --quiet; then
  echo "gh-pages is already up to date"
else
  git -C "$WORKTREE" commit -qm "deploy: $(git rev-parse --short HEAD)"
  git -C "$WORKTREE" push -q origin "$BRANCH"
  echo "deployed $(git rev-parse --short HEAD) to $BRANCH"
fi
