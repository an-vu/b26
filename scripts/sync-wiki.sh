#!/usr/bin/env bash
set -euo pipefail

source_dir="${GITHUB_WORKSPACE:?}/docs/wiki"
wiki_dir="${RUNNER_TEMP:?}/b26-wiki"
: "${GITHUB_REPOSITORY:?}"
: "${GITHUB_TOKEN:?}"
test -s "$source_dir/Home.md"

# The publishing checkout exists only on the Actions runner. Keep credentials
# out of remote URLs and Git config.
export GIT_ASKPASS="$RUNNER_TEMP/wiki-askpass.sh"
export GIT_TERMINAL_PROMPT=0
cat > "$GIT_ASKPASS" <<'ASKPASS'
#!/usr/bin/env bash
case "$1" in
  *Username*) printf '%s\n' 'x-access-token' ;;
  *) printf '%s\n' "$GITHUB_TOKEN" ;;
esac
ASKPASS
chmod 700 "$GIT_ASKPASS"
trap 'rm -f "$GIT_ASKPASS"' EXIT

git clone --depth 1 -- "https://github.com/${GITHUB_REPOSITORY}.wiki.git" "$wiki_dir"
rsync --archive --delete --exclude='.git' --exclude='.DS_Store' "$source_dir/" "$wiki_dir/"
git -C "$wiki_dir" add --all
if git -C "$wiki_dir" diff --cached --quiet; then
  echo 'Wiki already matches docs/wiki.'
  exit 0
fi

git -C "$wiki_dir" config user.name 'github-actions[bot]'
git -C "$wiki_dir" config user.email '41898282+github-actions[bot]@users.noreply.github.com'
source_commit="$(git -C "$GITHUB_WORKSPACE" rev-parse --short HEAD)"
git -C "$wiki_dir" commit -m "docs: sync wiki from b26 ${source_commit}"
git -C "$wiki_dir" push origin HEAD
