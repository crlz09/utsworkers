# Universal Talent Source workspace

Universal Talent Source (UTS) is a React application for managing recruiting
operations. It includes public worker registration and profiles, role-protected
admin and client workspaces, CTS job tracking, weekly hours review, and
invoicing.

## Prerequisites

- Node.js 20 or later
- npm
- A Supabase project (or the Supabase CLI for local development)

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create `.env.local` in the repository root:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key

   # Optional: enables Cloudflare Turnstile on public registration.
   VITE_TURNSTILE_SITE_KEY=your-site-key
   ```

   Only expose the Supabase anonymous key to the browser. Never place a service
   role key in a `VITE_*` variable, because Vite includes those values in the
   client bundle.

3. Start the development server:

   ```bash
   npm run dev
   ```

Vite prints the local URL when it starts. Authentication and data-backed pages
require a configured Supabase project with the migrations in
`supabase/migrations` applied.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot reload. |
| `npm run build` | Create an optimized production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run ESLint across the repository. |

Before opening a pull request, run both `npm run lint` and `npm run build`.

## Project structure

```text
src/
  components/    Shared navigation, route guards, and UI components
  data/          Static application content
  lib/           Supabase, access-control, and domain helpers
  pages/         Route-level application screens
supabase/
  functions/     Supabase Edge Functions
  migrations/    Ordered database schema and policy changes
public/          PWA icons, manifest, and service worker
```

Routes are declared in `src/App.jsx`. Administrative and client screens are
wrapped in role-aware route guards; public registration, worker profiles, and
tokenized worker-hours links do not require an admin session.

## Database changes

Add schema and Row Level Security changes as a new, timestamped SQL file under
`supabase/migrations`. Do not edit an already-deployed migration. Review every
policy carefully: the browser uses the anonymous Supabase key, so database RLS
is the final authorization boundary even when the UI also hides a route.

With the Supabase CLI linked to the intended project, apply pending migrations
with:

```bash
npx supabase db push
```

Confirm the target project before running this command against shared or
production environments.

## Deployment and PWA behavior

`vercel.json` rewrites application paths to `index.html`, allowing React Router
routes to load directly on Vercel. Production builds register `public/sw.js`;
service-worker registration is intentionally disabled during Vite development.

When changing cached application assets or PWA behavior, verify both a fresh
install and an upgrade from an existing installation. Browser developer tools
can unregister an old service worker while debugging.

## Troubleshooting

- **A data-backed page fails immediately:** verify both required Supabase
  variables are present, then restart the Vite server after changing `.env.local`.
- **A signed-in user is redirected:** confirm the user has the corresponding
  `admin_permissions`, active `client_users`, or worker record expected by the
  route guard.
- **A direct production URL returns 404:** ensure the host applies the SPA
  rewrite equivalent to the rule in `vercel.json`.
- **The installed app looks stale:** clear the site's service worker and cache,
  then reload to distinguish cached assets from an application regression.
