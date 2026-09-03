# frontend/src

React SPA. Pages under `pages/`; bearer client in `api/client.ts`.

## 结构

```
src/
├── main.tsx
├── App.tsx
├── api/client.ts
├── auth/auth.ts, ProtectedRoute.tsx
├── components/AppLayout.tsx
├── pages/
└── types/
```

## 规范

- Unwrap `{ error: { message } }` into thrown `Error`
- `CreateProposal` merges SRS individual + optional services into one list with `isOptional` checkbox
- Discount/tax on create are submitted with initial POST; `POST /calculate` is not wired in the create UI (backend still supports it)
- `PackageServiceSelection.tsx` is unused dead code — do not delete unless asked
