# Backend API

Express.js API pro aplikaci Spotové ceny elektřiny.

## Endpoints

- `GET /api/current-price` - Aktuální cena elektřiny
- `GET /api/price/current` - Aktuální cena elektřiny (alternativní)
- `GET /api/price/hourly` - Hodinové ceny pro dnes/zítřek + uložení
- `GET /api/price/today-tomorrow` - Data pro dnes a zítřek
- `GET /api/price/historical?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Historická data
- `GET /api/price/dates` - Dostupné datumy
- `GET /api/instance` - Instance ID

## Spuštění

```bash
npm install
npm run dev  # vývojový režim s tsx watch
npm run build # kompilace
npm start    # produkční režim
```
