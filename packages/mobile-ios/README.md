# iOS aplikace

Základ nativní aplikace ve SwiftUI pro iOS 17 a novější. Projekt otevřete v Xcode souborem `SpotoveCeny.xcodeproj`.

## Co obsahuje

- přehled cen pro dnešek a zítřek včetně grafu a seznamu 15minutových intervalů,
- výběr libovolného dne s dostupnými daty a zobrazení historických cen,
- načítání uložených dat přes `GET /api/price/today-tomorrow` a historických dat přes `GET /api/price/historical`,
- stavy načítání, prázdných dat a chyb včetně ručního obnovení,
- přihlášení přes Microsoft Entra ID pomocí MSAL,
- ověření access tokenu na `GET /api/auth/me` před zpřístupněním cen,
- volitelné odemykání Face ID přes položku Keychain chráněnou aktuální biometrií.

## Backend

Výchozí adresa je `http://localhost:4000` a je nastavena v `Config/Info.plist`. Pro fyzické zařízení změňte `API_BASE_URL` na HTTPS adresu backendu dostupnou z telefonu. Lokální HTTP výjimka je povolená pouze pro lokální vývoj. Aplikace načítá uložené JSON soubory přes backendové endpointy, nevyvolává `/api/price/hourly` (který stahuje nová data podle `DATA_SOURCE`) a název zdroje zobrazuje podle pole `data_source` v konkrétním načteném souboru.

## Entra ID konfigurace

V `Config/Info.plist` nastavte:

- `ENTRA_CLIENT_ID`: Application (client) ID registrace mobilní aplikace.
- `ENTRA_AUTHORITY`: `https://login.microsoftonline.com/<TENANT_ID>` pro váš tenant.
- `ENTRA_REDIRECT_URI`: `msauth.cz.spotove.ceny://auth`.
- `ENTRA_API_SCOPE`: delegovaný scope chráněného backend API, například `api://<API_CLIENT_ID>/access_as_user`.
- `API_BASE_URL`: HTTPS adresa backendu dostupná ze zařízení.

V Entra ID zaregistrujte aplikaci jako iOS/macOS mobilní klient s bundle ID `cz.spotove.ceny` a redirect URI `msauth.cz.spotove.ceny://auth`. Na registraci backend API vystavte delegované oprávnění odpovídající `ENTRA_API_SCOPE` a povolte jeho použití mobilní aplikaci. `OIDC_AUDIENCE` na backendu musí odpovídat audience access tokenu pro toto API; současně nastavte tenant, issuer/JWKS a případnou skupinu dle `README_OIDC.md`. Mobilní aplikace je veřejný klient a nesmí obsahovat client secret.

MSAL spravuje Entra tokeny ve své systémové cache. Aplikace je neukládá do vlastního Keychainu ani `UserDefaults`; před každým voláním cen se token získá z MSAL potichu. Face ID chrání pouze místní přístup k přihlášené aplikaci. Jeho Keychain položka obsahuje jen značku zapnutí, je vázaná na aktuální sadu biometrie a zařízení a při změně biometrie přestane fungovat. Face ID nenahrazuje Entra přihlášení ani kontrolu backendu.

Při odhlášení aplikace odstraní účet z MSAL cache i lokální Face ID položku. Pokud Face ID selže nebo není dostupné, lze pokračovat novým přihlášením přes Microsoft.

## Spuštění

Otevřete `SpotoveCeny.xcodeproj` v Xcode; Xcode při sestavení stáhne MSAL jako Swift Package.

## Ověření sestavení

```sh
xcodebuild -project SpotoveCeny.xcodeproj -scheme SpotoveCeny \
  -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO build
```
