# E‑Signature App – Backend

A Next.js (App Router) TypeScript backend that provides authentication and e‑signature document APIs. Swagger documentation is embedded via JSDoc blocks and rendered in the app.

## Tech Stack
- Next.js (API routes under `src/app/api/`)
- TypeScript
- Swagger JSDoc (`src/app/api/lib/swagger/swagger.ts`)
- Database connection helpers in `src/app/api/db/`

## Project Structure (excerpt)
- `src/app/api/v1/auth/*`: Auth endpoints
- `src/app/api/v1/files/*`: Files/document endpoints
- `src/app/api/lib/swagger/`:
  - `swagger.ts`: Generates the OpenAPI spec from JSDoc
  - `components.ts`: Shared `components.schemas` used by route docs

## Prerequisites
- Node.js 18+
- npm (or pnpm/yarn)
- Environment variables in an `.env` file (see `.env.example` if available)

## Setup
```bash
# install deps
npm install

# optional: build types
npm run build
```

## Run (Development)
```bash
npm run dev
```
- The server typically runs on `http://localhost:3011` (check your Next.js config or console output).

## API Documentation
There are two ways to view API docs:

1) Swagger UI (recommended)
- Open your docs page in the browser. Common paths:
  - `http://localhost:3011/docs`
  - or a custom route set up in the app (check `src/app/docs/` if present)
- The OpenAPI spec is built from JSDoc comments inside the route files under `src/app/api/**/*.ts`.
- Shared schema definitions live in `src/app/api/lib/swagger/components.ts` (e.g., `LocalUser`, `CentralizedUser`).

2) Plain Text / Markdown
- `API.txt` (this folder): a plain‑text reference of all endpoints, parameters, and example requests/responses.
- If you prefer Markdown, copy the contents into `API.md` or use your editor to export.

## Adding/Updating Swagger Docs
- Add JSDoc blocks with `@openapi` above each handler (e.g., `export async function POST(req: Request) { ... }`).
- Ensure the `apis` glob in `src/app/api/lib/swagger/swagger.ts` includes your files:
  ```ts
  apis: [path.resolve(process.cwd(), "src/app/api/**/*.ts")]
  ```
- Use `$ref` to reference shared schemas in `components.ts` to keep route docs clean.

## Key Endpoints (high level)
- Auth: `/api/v1/auth`, `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/me`, `/api/v1/auth/profile`, `/api/v1/auth/session`, `/api/v1/auth/auto-login`, `/api/v1/auth/sync-user`
- Files: `/api/v1/files/upload-pdf`, `/api/v1/files/create-document`, `/api/v1/files/create-recipient`, `/api/v1/files/get-all-documents`, `/api/v1/files/get-document`, `/api/v1/files/send-document`, `/api/v1/files/presigned-get-url`

For full details (parameters and examples), see `API.txt` or open Swagger UI.

## Notes
- Some GET endpoints may intentionally return `501 Not Implemented` as placeholders.
- PDF downloads stream `application/pdf`. Clients should handle binary responses appropriately (e.g., `fetch` + `blob()` in browsers).
- Database connections are managed by helpers like `ensureDbConnection` / `connectDb` in route handlers.
# Build trigger
