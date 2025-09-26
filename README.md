# AI Agency

## Local Setup
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`

## Go High Level Private Token Workflow
- Add the following to `.env.local` (file is git-ignored):
  - `GHL_PRIVATE_CLIENT_ID`
  - `GHL_PRIVATE_CLIENT_SECRET`
  - `GHL_PRIVATE_REDIRECT_URI` (must match the redirect configured in the HighLevel app)
  - optional: `GHL_PRIVATE_USER_TYPE`, `GHL_PRIVATE_TOKEN_ENDPOINT`
- First time: open your authorization URL (`https://marketplace.gohighlevel.com/oauth/authorize?response_type=code&client_id=...&redirect_uri=...`) and approve the app. Capture the `code` query parameter from the redirect.
- Run `node scripts/ghl-auth.js --code <AUTH_CODE> --redirect-uri <REDIRECT_URI> --save` to exchange the code, log the access token, and persist the returned `refresh_token` into `.env.local`.
- Subsequent refreshes: `node scripts/ghl-auth.js --refresh-token <REFRESH_TOKEN> --save`. The script reads client credentials from the environment and updates `.env.local` with any new refresh token.
- The API routes call `getPrivateAccessToken()` which relies on the cached value or the `GHL_PRIVATE_REFRESH_TOKEN` stored above.

## Useful Commands
- `npm run dev` — start the dev server.
- `npm run build` — type-check and build the app.
- `npm run lint` — run ESLint with the Next.js preset.
# ram-dash
