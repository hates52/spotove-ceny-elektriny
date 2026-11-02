# Backend API

Base URL: `http://localhost:4000`

## Endpoints

- `GET /api/current-price` – aktuální cena
- `GET /api/price/today-tomorrow` – data na dnes a zítra
- `GET /api/price/data-source` – informace o zdroji dat
- `GET /api/price/dates` – dostupná data
- `GET /api/price/historical?startDate=&endDate=` – historická data
- `GET /api/price/hourly` – hodinové ceny
- `GET /api/instance` – instance backendu
- `GET /api/auth/me` – ověření tokenu a členství ve skupině (vyžaduje Bearer token)
- `GET /api/me` – jednoduchá kontrola autentizace
