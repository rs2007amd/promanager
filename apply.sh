#!/usr/bin/env bash
# Run from the ROOT of your Next.js project:
#   bash /path/to/propmanager-pack/apply.sh
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)/files"
DEST="$(pwd)"

if [ ! -f "$DEST/package.json" ]; then
  echo "No package.json here. Run this from your Next.js project root." >&2
  exit 1
fi

echo "Copying files into $DEST ..."
# Existing files with the same name are overwritten (README, next.config.ts, etc.)
cp -R "$SRC"/. "$DEST"/

echo "Installing dependencies ..."
npm install next-auth@beta @prisma/client bcryptjs stripe zod @vercel/blob
npm install -D prisma tsx @types/bcryptjs vitest @playwright/test

echo "Adding scripts to package.json ..."
node -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.scripts = Object.assign(pkg.scripts || {}, {
  typecheck: "tsc --noEmit",
  test: "vitest run",
  "test:e2e": "playwright test",
});
pkg.prisma = Object.assign(pkg.prisma || {}, { seed: "tsx prisma/seed.ts" });
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
'

# Keep secrets out of Git
touch .gitignore
grep -qxF ".env" .gitignore || printf "\n.env\n" >> .gitignore

echo
echo "Done. Next: fill in .env, then run  npx prisma migrate dev --name init"
