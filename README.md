# Spotové ceny elektřiny - Monorepo

Monorepo obsahující oddělený backend (API) a frontend (web aplikaci).

## Struktura

- `packages/backend` - API server (Express + TypeScript)
- `packages/web-app` - Frontend (Next.js 14 + React + TypeScript)
- `packages/mobile-ios` - iOS aplikace (příprava)
- `packages/mobile-android` - Android aplikace (příprava)

## Spuštění

### Backend

```bash
cd packages/backend
npm install
npm run dev
```

Backend API běží přes HTTPS na https://localhost:4000. Bez `TLS_CERT_PATH` a `TLS_KEY_PATH` vytvoří při startu self-signed certifikát pouze v paměti; nastavte obě proměnné na cesty k certifikátu a privátnímu klíči pro trvalý certifikát.

### Frontend

```bash
cd packages/web-app
npm install
npm run dev
```

Frontend běží na http://localhost:3000

Frontend proxyuje API serverově přes HTTPS. Pro lokální self-signed certifikát nastavte v prostředí webapp `INSECURE_TLS=true`; pro certifikát důvěryhodný klientským systémem ponechte `false`. Backendový origin lze nastavit přes `BACKEND_URL`.
