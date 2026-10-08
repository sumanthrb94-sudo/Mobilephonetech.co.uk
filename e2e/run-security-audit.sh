#!/bin/sh
# Security audit with the API server running, for use inside
# `firebase emulators:exec` (which sets the emulator host variables).
#
#   npx firebase emulators:exec --project demo-lehart --only auth,firestore,storage "sh e2e/run-security-audit.sh"
#
# A script rather than an inline command: inline, the CI shell expanded
# $(...), $! and $? before emulators:exec ever ran it.
#
# ALLOW_UNPAID_ORDERS opens the unpaid order route for this emulator-only
# server, so the pricing and validation behind it can be attacked. It is
# never set in production.
ALLOW_UNPAID_ORDERS=true node e2e/api-server.mjs &
API=$!
i=0
until curl -s -o /dev/null http://127.0.0.1:4174/ || [ "$i" -ge 90 ]; do
  i=$((i + 1))
  sleep 1
done
npm run audit:security
status=$?
kill "$API" 2>/dev/null
exit "$status"
