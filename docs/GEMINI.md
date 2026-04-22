Gemini API Key Setup (Step-by-Step)

Overview
- Gemini image generation API key enables Gemini Flash image generation for product imagery.
- Do not commit the key. Use environment variables in development and in CI/CD.

Steps
1. Sign up / Login
- Go to Gemini's developer portal (or Gemini Flash product page) and create an account if you don't have one.
- Sign in to access the developer console.

2. Create a new application/project
- In the Developer Console, create a new project (name it something like “Mobilephonetech Images”).
- Choose the appropriate product scope (image generation) and note any quotas.

3. Generate an API key
- Within the project, generate a new API key.
- Copy the API key value (secret). You will typically get an API key (and sometimes a secret). You only need the key for bearer authentication.

4. Configure locally
- Create a local env file (ignored by git): 
  - File: .env.local
  - Add: VITE_GEMINI_API_KEY=sk-... (your real key)

5. Wire into the repo
- The code reads the key from import.meta.env.VITE_GEMINI_API_KEY or the VITE_* env vars when deployed.
- In Gemini service (src/services/geminiFlash.ts), the request uses Authorization: Bearer ${VITE_GEMINI_API_KEY}.
- If you switch endpoints, update the service accordingly.

6. Deploy / CI
- In production (Vercel/Netlify/AWS), set the environment variable VITE_GEMINI_API_KEY in the project settings.
- Do not print or log the key in logs.

7. Validate
- Run the app locally: npm run dev
- Open a product page and check the network tab for requests to Gemini; you should see a generated image URL.
- If Gemini isn’t reachable or the key is invalid, the app should gracefully fall back to the SVG fallback (which is generated if Gemini fails).

8. Optional safety
- Add a toggle (env flag) to disable Gemini generation for QA without removing code:
  - e.g., VITE_GEMINI_DISABLE=true
- This will force the app to skip Gemini and use the fallback images only.

Notes
- Treat the Gemini URL as a best-effort enhancement. The SVG fallback ensures images render consistently even when Gemini is unavailable.
- Keep keys secret; do not commit them to the repository.
