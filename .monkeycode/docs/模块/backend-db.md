# backend/src/db

Drizzle schema + one postgres-js client.

## 结构

```
db/
├── client.ts    # postgres(DATABASE_URL, { prepare: false, ssl: { ca } })
├── schema.ts    # tables + relations
└── pg-error.ts  # isPgError(err, '23503')
```

`client.ts` is module-scoped so warm Vercel invocations reuse connections.

Historical TypeORM SQL lives in `src/database/migrations/` and is excluded from the live Drizzle pipeline.

`drizzle.config.ts` owns generate/migrate.
