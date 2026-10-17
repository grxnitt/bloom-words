#!/bin/sh
# Builds the app and publishes it to the gh-pages branch (GitHub Pages).
set -e
cd "$(dirname "$0")/.."
npm --prefix client run build
OUT=$(mktemp -d)
cp -R client/dist/. "$OUT/"
cp -R check "$OUT/check"
touch "$OUT/.nojekyll"
cd "$OUT"
git init -q -b gh-pages
git add -A
git commit -qm "Deploy $(date '+%Y-%m-%d %H:%M')"
git push -f https://github.com/grxnitt/bloom-words.git gh-pages
rm -rf "$OUT"
echo "Published: https://grxnitt.github.io/bloom-words/"
