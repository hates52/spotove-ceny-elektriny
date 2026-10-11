# Spotové ceny elektřiny - Monorepo

Monorepo obsahující oddělený backend (API) a frontend (web aplikaci).

## Struktura

- `packages/backend` - API server (Express + TypeScript)
- `packages/web-apps` - Frontend (Next.js 14 + React + TypeScript)
- `packages/mobile-ios` - iOS aplikace (příprava)
- `packages/mobile-android` - Android aplikace (příprava)

## Spuštění

### Backend

```bash
cd packages/backend
npm install
npm run dev
```

Backend běží na http://localhost:4000

### Frontend

```bash
cd packages/web-apps
npm install
npm run dev
```

Frontend běží na http://localhost:3000

Frontend potřebuje proměnnou prostředí `NEXT_PUBLIC_API_URL` (viz `.env.local.example`).
