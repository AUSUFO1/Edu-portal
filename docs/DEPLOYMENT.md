# Deployment (Cloudflare Workers + Neon PostgreSQL)

## 1. Database (Neon)

1. Create a Neon project (region close to your users, e.g. `aws-eu-central-1`).
2. Copy the **pooled** connection string.
3. From your machine, create the schema and the demo data:

   ```bash
   # .env (never committed)
   DATABASE_URL=postgres://...neon.tech/neondb?sslmode=require
   ```

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## 2. Hyperdrive

```bash
npx wrangler login
npx wrangler hyperdrive create uemp-db --connection-string="<Neon connection string>"
```

Put the returned id in `wrangler.jsonc` under `hyperdrive[0].id`. The Worker reads the connection through the `HYPERDRIVE` binding; no database secret is stored in the Worker itself.

## 3. Deploy

```bash
npm run cf:deploy
```

This builds the app with OpenNext and deploys the Worker `uemp`. To deploy from GitHub on every push, connect the repository in **Workers & Pages → Create → Import a repository**, with:
- build command: `npx opennextjs-cloudflare build`;
- deploy command: `npx wrangler deploy`.

## 4. Check

- Visit the Worker URL and sign in with a test account from the README.
- Watch requests in **Workers → uemp → Logs** (observability is enabled in `wrangler.jsonc`).

## Operations

- **Schema changes:** edit `src/server/db/schema.ts` and run `npm run db:generate`. Review the SQL in `drizzle/`, then run `npm run db:migrate` against Neon before deploying the code that needs it.
- **Backups:** Neon keeps point-in-time history. Create a branch before risky migrations.
- **Housekeeping:** `purgeExpired()` in `auth.service.ts` removes expired sessions and old login attempts, and can be run from a Cron Trigger.
