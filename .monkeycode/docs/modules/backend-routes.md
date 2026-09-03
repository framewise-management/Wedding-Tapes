# backend/src/routes

Thin Hono apps: parse (Zod helpers), `c.get('user')`, call service, shape status codes.

## Structure

```
routes/
├── auth.ts
├── business.ts
├── services.ts
├── packages.ts
├── customers.ts
└── proposals.ts
```

Mounted in `index.ts` under `/api/...`. Routers except `auth.ts` call `authMiddleware` for `*`.

PDF is assembled in `proposals.ts` (fetch proposal + business, `generateProposalPdf`, `c.body(Uint8Array)`).
