# Spotové ceny elektřiny - Monorepo

Monorepo obsahující oddělený backend (API) a frontend (web aplikaci).

## Struktura

- `packages/backend` - API server (Express + TypeScript)
- `packages/web-app` - Frontend (Next.js 14 + React + TypeScript)
- `packages/mobile-ios` - iOS aplikace (příprava)
- `packages/mobile-android` - Android aplikace (příprava)

## Proměnné prostředí (.env)

Každý balíček potřebuje vlastní `.env` soubor ve svém adresáře:

### Backend (`packages/backend/.env`)

```env
PORT=4000
CRON_SCHEDULE=*/15 * * * *
DATA_SOURCE=spotovaelektrina
DATA_DIR=

# TLS (volitelné; pokud není nastaveno, použije se self-signed certifikát v paměti)
TLS_CERT_PATH=
TLS_KEY_PATH=

# OIDC / Azure AD
AZURE_TENANT_ID=<tenant-id>
OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
OIDC_AUDIENCE=api://<client-id>
OIDC_JWKS_URL=https://login.microsoftonline.com/<tenant-id>/discovery/v2.0/keys
OIDC_REQUIRED_GROUP=<group-id>
```

### Frontend (`packages/web-app/.env`)

```env
BACKEND_URL=https://localhost:4000
INSECURE_TLS=true

# OIDC / Azure AD
OIDC_AUTHORITY=https://login.microsoftonline.com/<tenant-id>/v2.0
OIDC_CLIENT_ID=<client-id>
OIDC_SCOPE=openid profile email api://<client-id>/.default
```

`INSECURE_TLS=true` povolí akceptaci self-signed certifikátu backendové API (vhodné pro lokální vývoj). Pro produkci s důvěryhodným certifikátem nastavte `false` nebo odstraňte.

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

## Docker images

Obrázky jsou hostovány na GitHub Container Registry (GHCR):

- Backend: `ghcr.io/hates52/spotove-ceny-elektriny/backend`
- Web: `ghcr.io/hates52/spotove-ceny-elektriny/web`

## Helm chart

### Instalace

```bash
helm repo add spotove-ceny-elektriny https://hates52.github.io/spotove-ceny-elektriny
helm install spotove-ceny-elektriny spotove-ceny-elektriny/spotove-ceny-elektriny
```

Nebo instalace z lokálního archivu:

```bash
helm package helmchart -d dist
helm install spotove-ceny-elektriny dist/spotove-ceny-elektriny-<version>.tgz
```

### Globální nastavení

V `helmchart/values.yaml`:

| Hodnota | Popis | Default |
|---------|-------|---------|
| `image.tag` | Image tag (globální pro všechny subcharty) | `""` (použije `.Chart.AppVersion`) |
| `image.pullPolicy` | Image pull policy (globální) | `IfNotPresent` |
| `imagePullSecrets` | Seznam image pull secrets | `[]` |

### Subcharty

| Subchart | Popis | Port |
|----------|-------|------|
| `backend` | API server (Express + Node.js) | 4000 |
| `web` | Frontend aplikace (Next.js) | 3000 |

Každý subchart podporuje vlastní nastavení:

```yaml
backend:
  image:
    repository: ghcr.io/hates52/spotove-ceny-elektriny/backend
    tag: ""
    pullPolicy: IfNotPresent
  extraEnv: []
  replicaCount: 1

web:
  image:
    repository: ghcr.io/hates52/spotove-ceny-elektriny/web
    tag: ""
    pullPolicy: IfNotPresent
  extraEnv: []
  replicaCount: 1
```

### Priorita hodnoty tagu

1. `image.tag` v daném subchartu (nejvyšší)
2. `image.tag` v globální sekci (fallback)
3. `.Chart.AppVersion` (poslední fallback)

### ConfigMap

Konfigurace je sdílena přes ConfigMap s názvem `<release-name>-spotove-ceny-elektriny-config`. Obsahuje hodnoty z `config.backend` a `config.web` sekce v `values.yaml`.

### TLS (cert-manager)

Backend podporuje TLS certifikáty přes cert-manager. Povolení:

```yaml
backend:
  tls:
    enabled: true
    certManager:
      issuerRef:
        name: letsencrypt-prod
        kind: ClusterIssuer
    secretName: spotove-ceny-elektriny-backend-tls
    mountPath: /etc/tls
```

Certifikát se připojí jako volume na `mountPath`. Proměnné `TLS_CERT_PATH` a `TLS_KEY_PATH` odkazují na cesty v tomto volume.

### Port forwarding pro lokální testování

```bash
helm install spotove-ceny-elektriny helmchart
kubectl port-forward svc/spotove-ceny-elektriny-backend 4000:4000
kubectl port-forward svc/spotove-ceny-elektriny-web 3000:3000
```
