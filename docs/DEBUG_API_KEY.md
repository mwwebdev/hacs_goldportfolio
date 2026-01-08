# Schnelles Debugging für API-Key Fehler

## Schritt 1: Teste deinen API Key extern

Öffne PowerShell/Terminal und führe aus:

```bash
# Mit Header (RICHTIG - so macht es die Integration)
curl -H "x-access-token: YOUR_API_KEY_HERE" \
     -H "Content-Type: application/json" \
     https://www.goldapi.io/api/XAU/EUR
```

Oder mit Python:
```python
import requests

api_key = "YOUR_API_KEY_HERE"
headers = {
    "x-access-token": api_key,
    "Content-Type": "application/json"
}

response = requests.get("https://www.goldapi.io/api/XAU/EUR", headers=headers)
print(response.json())
```

### Was du sehen solltest:

**✅ Erfolgreich (HTTP 200):**
```json
{
  "timestamp": 1704600000,
  "currency": "EUR", 
  "price": 58.32,
  "prev_close_price": 58.10,
  "open_price": 58.15,
  "high_price": 58.50,
  "low_price": 58.00
}
```

**❌ Fehler (HTTP 401):**
```json
{
  "error": "Unauthorized"
}
```

---

## Schritt 2: Home Assistant Debug-Logs aktivieren

### Methode A: Über configuration.yaml

1. Bearbeite `config/configuration.yaml`
2. Füge am Ende hinzu:

```yaml
logger:
  logs:
    custom_components.gold_portfolio: debug
```

3. Starte Home Assistant neu

### Methode B: Über Developer Tools (schneller)

1. Gehe zu **Einstellungen** → **Developer Tools** → **YAML**
2. Schreibe:

```yaml
logger:
  logs:
    custom_components.gold_portfolio: debug
```

3. Klicke **"Änderungen laden"**
4. Versuche die Integration zu erstellen

---

## Schritt 3: Logs überprüfen

1. Gehe zu **Einstellungen** → **System** → **Protokolle**
2. Suche nach `gold_portfolio`
3. Du solltest sehen:

```
DEBUG: Validating API key: goldapi-1bdd...
DEBUG: Gold API Response Status: 401
ERROR: API Key authentication failed (401)
ERROR: API validation error: Invalid API Key - Authentication failed
```

---

## Mögliche Status-Codes

| Status | Bedeutung | Lösung |
|--------|-----------|---------|
| 200 | ✅ OK | API Key ist gültig! |
| 401 | ❌ Authentifizierung fehlgeschlagen | API Key ungültig/abgelaufen |
| 403 | ❌ Zugriff verweigert | Account deaktiviert |
| 429 | ⏰ Rate Limit | Zu viele Anfragen, warte 1-2 Min |
| Timeout | 🔌 Keine Verbindung | Internetverbindung prüfen |

---

## Häufigste Ursachen

### 1. API Key hat Leerzeichen
```
❌ "  YOUR_API_KEY_HERE  "
✅ "YOUR_API_KEY_HERE"
```

**Lösung:** Key ohne Leerzeichen kopieren

### 2. Key ist zu alt (> 6 Monate)
**Lösung:** Neuen Key auf https://www.goldapi.io/ generieren

### 3. Account ist inaktiv
**Lösung:** 
1. Melde dich auf goldapi.io an
2. Überprüfe ob dein Account aktiv ist
3. Generiere ggf. einen neuen Key

### 4. Rate Limit überschritten
**Symptom:** Funktioniert 1-2 mal, dann `429` Fehler

**Lösung:**
- Kostenlos: Max 5 Anfragen/Minute
- Warte 1-2 Minuten und versuche erneut
- Oder upgrade zu Premium Plan

---

## Test mit curl (Terminal/PowerShell)

```bash
# Test mit korrektem Header (so macht es die Integration jetzt)
curl -H "x-access-token: YOUR_API_KEY_HERE" \
     -H "Content-Type: application/json" \
     https://www.goldapi.io/api/XAU/EUR

# Verbose Mode (mehr Details)
curl -v -H "x-access-token: YOUR_API_KEY_HERE" \
     -H "Content-Type: application/json" \
     https://www.goldapi.io/api/XAU/EUR
```

---

## Fehler in Home Assistant Logs

Wenn du diese Fehler siehst, sind sie normal und werden jetzt besser behandelt:

```
ERROR: API Key authentication failed (401)
```
→ Dein API Key ist ungültig, generiere einen neuen

```
ERROR: API Key forbidden (403)  
```
→ Dein Account ist gesperrt/deaktiviert

```
ERROR: Rate limit exceeded (429)
```
→ Zu viele Anfragen in kurzer Zeit, warte

```
ERROR: Connection error
```
→ Internetverbindung Problem

---

## Nächste Schritte

1. ✅ Teste deinen Key im Browser
2. ✅ Aktiviere Debug Logs in Home Assistant
3. ✅ Versuche Integration zu erstellen
4. ✅ Schaue die Error-Logs an
5. ✅ Folge der Lösung für deinen Fehler

**Wenn es immer noch nicht funktioniert → GitHub Issue erstellen! 🚀**
