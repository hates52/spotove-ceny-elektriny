# Frontend (Web)

Next.js 14 frontend aplikace Spotové ceny elektřiny.

## Spuštění

```bash
npm install
cp .env.local.example .env.local
npm run dev  # vývojový režim
npm run build # produkční build
npm start    # produkční režim
```

## Konfigurace

- `BACKEND_URL` - HTTPS origin backendu (default: `https://localhost:4000`); API volání z prohlížeče procházejí serverovou proxy aplikace.
- `INSECURE_TLS` - při hodnotě `true` proxy neověřuje certifikát backendu. Používejte pouze pro lokální vývoj se self-signed certifikátem; v produkci ponechte `false`.

Backend bez nastavených `TLS_CERT_PATH` a `TLS_KEY_PATH` vytvoří při každém startu self-signed certifikát pouze v paměti. Pro takové lokální spuštění nastavte ve webapp `INSECURE_TLS=true`.
