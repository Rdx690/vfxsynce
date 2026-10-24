# VFX SYNC — Web Client

The VFX SYNC client is a Next.js application within a Bun/Turborepo monorepo.

## Run locally

From the repository root:

```bash
bun install
bun run --filter client dev
```

Then open http://localhost:3000.

## Deploy to Vercel

Import the repository into [Vercel](https://vercel.com/new). For a monorepo deployment, use the repository root configuration or set **Root Directory** to `apps/client` and ensure files outside the root are included because the client imports `packages/shared`.

Set these Vercel environment variables to match your separately hosted backend:

```dotenv
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-DOMAIN
NEXT_PUBLIC_WS_URL=wss://YOUR-BACKEND-DOMAIN/ws
```

The backend is a Bun HTTP/WebSocket service. Vercel frontend deployment alone does not run that persistent server, so room creation, joins, live synchronization and uploads will not work until the backend and required object storage are configured.

See the root README for the deployment overview and caveats.
