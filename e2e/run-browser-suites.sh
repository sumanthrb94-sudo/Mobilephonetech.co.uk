#!/bin/sh
# Browser suites against the emulators, for use inside `firebase emulators:exec`
# (which sets the emulator host variables) after `vite build --mode e2e`.
#
#   npx firebase emulators:exec --project demo-lehart --only auth,firestore,storage "sh e2e/run-browser-suites.sh"
#
# The staff suites seed their own data; checkout starts from a fresh seed.
# Every suite runs even after one fails, and the script fails if any did.
node e2e/api-server.mjs &
API=$!
npx vite preview --host 127.0.0.1 --port 4173 --strictPort &
WEB=$!
i=0
until { curl -s -o /dev/null http://127.0.0.1:4174/ && curl -s -o /dev/null http://127.0.0.1:4173/; } || [ "$i" -ge 90 ]; do
  i=$((i + 1))
  sleep 1
done

status=0
run() {
  echo "::group::$*"
  "$@" || { echo "FAILED: $*"; status=1; }
  echo "::endgroup::"
}
run node e2e/admin.mjs
run node e2e/catalogue-import.mjs
run node -e "import('./e2e/emulator-seed.mjs').then(m => m.seed())"
run node e2e/checkout.mjs
run node e2e/csp.mjs

kill "$API" "$WEB" 2>/dev/null
exit "$status"
