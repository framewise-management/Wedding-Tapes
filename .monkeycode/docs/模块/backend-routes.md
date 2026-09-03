# backend/src/routes

Thin Hono apps: parse (Zod helpers), `c.get('user')`, call service, shape status codes.

## 结构

```
routes/
├── auth.ts
├── business.ts
├── services.ts
├── packages.ts
├── customers.ts
└── proposals.ts
```

Mounted in `index.ts` under `/api/...`. Auth routers except `auth.ts` call `authMiddleware` for `*`.

PDF is assembled in `proposals.ts` (fetch proposal + business, `generateProposalPdf`, `c.body(Uint8Array)`).
