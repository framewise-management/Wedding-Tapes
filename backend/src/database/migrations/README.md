Historical record only. These are the TypeORM migrations that built the
current schema before the Hono + Drizzle port -- the live database is
already at this state, so they are never run again. Excluded from
`tsconfig.json` since the `typeorm` package is no longer a dependency.

Schema changes from here on go through `drizzle-kit generate`/`migrate`
against `src/db/schema.ts`.
