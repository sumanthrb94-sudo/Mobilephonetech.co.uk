# LeHart storefront

LeHart is a React and TypeScript storefront for refurbished phones, with a
Firebase-backed customer account area and staff administration console.

## Project map

```text
src/             Storefront, admin UI, shared components and client logic
src/data/        Bundled catalogue fallback and AI reference data
api/             Vercel serverless routes and shared server-side services
e2e/             Playwright journeys and Firebase-rules security audit
scripts/         Data import, seeding, deployment and maintenance tools
docs/            Operational, product and launch documentation
deploy/          Deployment-specific infrastructure
```

## Requirements

- Node.js 20 or newer
- Firebase project credentials for live server routes
- Java 21 for the local Firebase Auth, Firestore and Storage emulators

## Local development

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Add only the variables needed for the feature being tested to `.env.local`.
Never commit `.env*` files or Firebase service-account JSON.

## Quality checks

```bash
npm run lint                    # TypeScript checks for client and API code
npm test                        # Vitest unit and component suite
npm run build                   # Production build
npm run emulators               # Firebase Auth, Firestore and Storage locally
npm run audit:security          # Adversarial rules audit; requires emulators
npm run e2e:interactions        # Playwright desktop and mobile interactions
npm run e2e:focus               # Focus, input and keyboard behaviour
```

The security audit deliberately attempts IDOR, role escalation, price
tampering, refund inflation, forged reviews and other unauthorized requests.
It must pass before changes to Firebase rules are deployed.

## Deployment

- Vercel builds and serves the frontend and `api/` routes.
- Firebase hosts authentication, Firestore and Storage rules.
- Deploy rules and indexes with the scripts in `scripts/` after reviewing the
  corresponding changes.

See [docs/README.md](docs/README.md) for the maintained documentation index.
