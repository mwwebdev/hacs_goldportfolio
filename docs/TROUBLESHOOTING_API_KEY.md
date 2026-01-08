# 🔧 Troubleshooting: API Key Validierungsfehler

## Problem: "invalid_api_key" bei Integration Setup

Wenn du den Fehler `invalid_api_key` bekommst, kann das mehrere Ursachen haben.

---

## 1️⃣ **Überprüfe deinen API Key**

### ✅ Korrektes Format
- ✓ Sieht aus wie: `goldapi-xxxxx-io`
- ✓ Enthält das `-io` Suffix
- ✓ Wurde von https://www.goldapi.io/ generiert

### ❌ Häufige Fehler
- ✗ Leerzeichen am Anfang oder Ende
- ✗ Kopiert mit `https://` oder anderen Teilen
- ✗ Falsch abgetippt
- ✗ Alter/abgelaufener Key (neuen generieren!)

---

## 2️⃣ **Schritt-für-Schritt Debugging**

### Schritt A: API Key überprüfen

Der API Key wird als HTTP Header `x-access-token` gesendet!

**Teste mit curl (PowerShell/Terminal):**
```bash
curl -H "x-access-token: YOUR_API_KEY_HERE" \
     -H "Content-Type: application/json" \
     https://www.goldapi.io/api/XAU/EUR
```

**Erwartete Antwort (OK):**
```json
{
  "timestamp": 1704600000,
  "currency": "EUR",
  "price": 58.32,
  "prev_close_price": 58.10
}
```

**Fehlerhafte Antworten:**
- `{"error": "Unauthorized"}` → API Key ist ungültig
- Timeout → Internetverbindung Problem
- `{"error": "Rate limit"}` → Zu viele Anfragen

---

### Schritt B: Home Assistant Logs überprüfen

1. Gehe zu **Einstellungen** → **System** → **Protokolle**
2. Gib `gold_portfolio` in die Suche ein
3. Schaue nach der Zeile mit Debug-Informationen:

```
Gold API Response Status: 401
API Key authentication failed (401)
```

**Was bedeuten die Statuscode:**
- `200` - Erfolgreich! ✅
- `401` - Authentifizierung fehlgeschlagen ❌
- `403` - Zugriff verweigert ❌
- `429` - Rate Limit überschritten ⏰

---

## 3️⃣ **Häufige Lösungen**

### Lösung 1: Neuen API Key generieren

1. Besuche https://www.goldapi.io/
2. Melde dich an (oder registriere dich kostenlos)
3. Dashboard → API Keys
4. Klicke auf "Generate New Key"
5. Kopiere den kompletten neuen Key
6. Passe ihn in Home Assistant an

### Lösung 2: Leerzeichen entfernen

Stelle sicher, dass dein Key **keine Leerzeichen** am Anfang/Ende hat:

```
❌ FALSCH: "  YOUR_API_KEY_HERE  "
✅ RICHTIG: "YOUR_API_KEY_HERE"
```

### Lösung 3: Internetverbindung überprüfen

```bash
# Test ob du die API erreichst
ping www.goldapi.io
```

Wenn das fehlschlägt → Firewall/Netzwerk Problem

### Lösung 4: Rate Limit überprüfen

Kostenloser Plan: **5 Anfragen pro Minute**

Wenn du zu schnell viele Anfragen machst, wird dein Key temporär geblockt. Warte 1-2 Minuten und versuche es erneut.

---

## 4️⃣ **Detailliertes Debugging aktivieren**

Um mehr Debug-Informationen zu sehen:

1. Bearbeite `config/configuration.yaml`:
```yaml
logger:
  logs:
    custom_components.gold_portfolio: debug
```

2. Starte Home Assistant neu
3. Versuche die Integration erneut zu konfigurieren
4. Schaue die Logs in **Einstellungen** → **System** → **Protokolle** an

Du wirst dann sehen:
```
DEBUG: Validating API key: goldapi-1bdd...
DEBUG: Gold API Response Status: 200
DEBUG: Gold API Response: {'timestamp': 1704600000, ...}
INFO: API validation successful. Gold price: 58.32
```

---

## 5️⃣ **Goldapi.io Account überprüfen**

1. Besuche https://www.goldapi.io/
2. Melde dich an
3. Überprüfe:
   - ✓ Account ist aktiv (nicht gesperrt)
   - ✓ API Keys sind aktiviert
   - ✓ Du hast nicht mehr als 5 Keys
   - ✓ Dein Free Plan ist nicht abgelaufen

---

## 6️⃣ **Spezielle Fälle**

### Fall 1: Key ist alt (> 6 Monate)
**Lösung:** Goldapi.io deaktiviert alte Keys. Generiere einen neuen Key.

### Fall 2: Du hast mehrere Keys
**Lösung:** Nutze nur einen Key aktiv. Lösche die alten Keys auf der Website.

### Fall 3: Dein Account war inaktiv
**Lösung:** Melde dich auf goldapi.io an und re-aktiviere deinen Account.

### Fall 4: VPN/Proxy wird verwendet
**Lösung:** Goldapi.io blockiert manchmal VPN-IPs. Versuche ohne VPN oder kontaktiere goldapi.io Support.

---

## 7️⃣ **Wenn nichts hilft: Support**

### Option A: GitHub Issue erstellen
https://github.com/user/ha_goldportfolio/issues

**Bitte include:**
```
- Home Assistant Version:
- Integration Version: 1.0.0
- Dein API Key Format: goldapi-xxxxx (nicht den ganzen Key posten!)
- Error Message: invalid_api_key
- Home Assistant Logs: (siehe Schritt 4)
```

### Option B: Goldapi.io Support kontaktieren
https://www.goldapi.io/support

Frage:
```
"Mein API Key (goldapi-xxxxx-io) funktioniert nicht bei meiner 
Home Assistant Integration. Ich bekomme einen 401 Fehler. 
Ist mein Key aktiv und korrekt?"
```

---

## 📝 Checkliste zur Fehlersuche

Gehe diese Punkte durch:

- [ ] API Key von https://www.goldapi.io/ kopiert
- [ ] Keine Leerzeichen am Anfang/Ende des Keys
- [ ] Format ist `goldapi-xxxxx-io`
- [ ] Key ist nicht älter als 6 Monate
- [ ] Account auf goldapi.io ist aktiv
- [ ] Internetverbindung funktioniert
- [ ] Home Assistant Logs überprüft (debug Mode)
- [ ] Browser Cache geleert (F5 + Ctrl drücken)
- [ ] Home Assistant neu gestartet

---

## 💡 Tipps

1. **Schreibe deinen API Key auf** - speichere ihn an einem sicheren Ort
2. **Teste den Key zuerst** - vor der Integration einmal manuell testen
3. **Nutze immer nur einen Key** - nicht mehrere Keys parallel
4. **Rate Limit beachten** - Max 5 Anfragen/Min kostenlos
5. **Update den Key regelmäßig** - mindestens alle 6 Monate

---

## 📞 Schneller Hilfe-Link

- 🌐 Gold API Status: https://www.goldapi.io/status
- 📚 Gold API Dokumentation: https://www.goldapi.io/api
- 🏠 Home Assistant Community: https://community.home-assistant.io/
- 🐛 Bug Report: https://github.com/user/ha_goldportfolio/issues

---

**Wenn das Problem weiterhin besteht, überprüfe die Logs oder öffne einen GitHub Issue! 🚀**
