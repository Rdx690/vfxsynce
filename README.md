# VFX SYNC

**VFX SYNC** is a high-precision web audio player for synchronized playback across multiple devices. Create a listening room, share its six-digit code, and use phones, laptops, or other browser-enabled devices as a coordinated sound system.

This repository is a customized fork of [BeatSync](https://github.com/freeman-jiang/beatsync), an open-source project. The VFX SYNC branding does not imply ownership of the original upstream work.

## Deployment overview

This monorepo contains three main parts:

- `apps/client`: Next.js frontend — deploy this app with Vercel.
- `apps/server`: Bun HTTP + WebSocket backend — deploy separately on a host that supports persistent WebSocket connections and Bun.
- `packages/shared`: shared TypeScript schemas and utilities.

**Important:** deploying the frontend to Vercel does not host the Bun/WebSocket backend. Room synchronization, joining, active-room discovery and uploads require the backend to be deployed separately. Audio uploads also need the configured object storage credentials from the server setup.

## Deploy the frontend to Vercel

1. Import this repository at [Vercel New Project](https://vercel.com/new).
2. Recommended: set **Root Directory** to `apps/client` and enable inclusion of files outside the root directory, because the app uses the `packages/shared` workspace. Alternatively, keep the repo root as the Vercel Root Directory to use the root-level config.
3. Use Bun for installation (the repository has Bun workspaces and a `bun.lock` lockfile).
4. In Vercel Project Settings → Environment Variables, configure:
   - `NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-DOMAIN`
   - `NEXT_PUBLIC_WS_URL=wss://YOUR-BACKEND-DOMAIN/ws`
5. Deploy and review the build log before sharing the URL.

The root `vercel.json` provides a monorepo-aware build command for the client. If you set Root Directory to `apps/client`, Vercel's dashboard commands may override this root-level setting.

## Backend hosting requirements

Deploy `apps/server` on a persistent host with Bun and WebSocket support. It listens on port 8080 by default. Point the client variables above to that backend's HTTPS and WSS endpoints. Check the server environment example and setup instructions for storage, CORS and any operational secrets. Never commit credentials to GitHub.

## Local development

Install Bun, then from the repository root:

```bash
bun install
```

For a local backend, create `apps/client/.env.local` with:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

Then run:

```bash
bun dev
```

For demo mode, consult the project scripts and the server's demo configuration. A frontend-only preview is not a replacement for the full synchronized playback service.

## License and upstream

This repository's licensing and attribution are governed by [LICENSE](./LICENSE). See [MIGRATION.md](./MIGRATION.md) for additional operational notes.
