# Quick Start Guide - Gold Portfolio Tracker

## 🚀 Schnellstart (5 Minuten)

### Schritt 1: Installation via HACS ⚡

1. **HACS öffnen**
   - Im Home Assistant Menü auf "HACS" klicken

2. **Benutzerdefiniertes Repository hinzufügen**
   - Klick auf ⋮ (Menü) oben rechts
   - "Benutzerdefiniertes Repository" wählen
   - URL eingeben: `https://github.com/user/ha_goldportfolio`
   - Kategorie: Integration
   - "Erstellen" klicken

3. **Integration installieren**
   - "Gold Portfolio Tracker" finden
   - "Installation" klicken
   - Home Assistant neu starten

### Schritt 2: API Key besorgen 🔑

1. Besuche: https://www.goldapi.io/
2. Registriere dich kostenlos
3. Generiere einen API Key
4. Speichere ihn für den nächsten Schritt

### Schritt 3: Integration konfigurieren ⚙️

1. **Einstellungen** → **Geräte und Dienste**
2. **"+ Neue Schnittstelle"** oder **"+ Erstellen"**
3. "Gold Portfolio Tracker" suchen und auswählen
4. API Key eingeben (von Schritt 2)
5. Name eingeben (z.B. "Mein Gold Portfolio")
6. **Speichern**

### Schritt 4: First Portfolio Entry 📊

1. **Einstellungen** → **Developer Tools** → **Services**
2. Service wählen: "gold_portfolio: Portfolio-Eintrag hinzufügen"
3. Folgende Daten eingeben:
   ```
   entry_id: (aus der Integration Config)
   purchase_date: 2024-01-15
   amount_grams: 100
   purchase_price_eur: 5800
   ```
4. "Aufrufen" klicken

### Schritt 5: Dashboard erstellen 📈

1. **Übersicht** → **Dashboard bearbeiten** → **Karte hinzufügen**
2. **Bearbeiten** (YAML) wählen
3. Folgenden Code einfügen:

```yaml
type: custom:gold-portfolio-card
type: portfolio-total
total_grams_entity: sensor.portfolio_total_grams
current_value_entity: sensor.portfolio_current_value
gain_eur_entity: sensor.portfolio_total_gain_eur
gain_percent_entity: sensor.portfolio_total_gain_percent
```

4. **Speichern**

✅ **Fertig!** Dein Gold Portfolio ist jetzt aktiv und wird regelmäßig aktualisiert.

---

## 🆘 Häufige Probleme

### Problem: "Integration wird nicht angezeigt"
**Lösung:**
- Stelle sicher, dass HACS installiert ist
- Home Assistant komplett neustarten (nicht nur neu laden)
- Cache des Browsers löschen

### Problem: "API Key ungültig"
**Lösung:**
- Überprüfe den API Key auf Tippfehler
- Stelle sicher, dass du bei goldapi.io registriert bist
- Versuche, einen neuen API Key zu generieren

### Problem: "Sensoren zeigen 'unknown' an"
**Lösung:**
- Warte 1-2 Minuten, bis die erste Abfrage erfolgt
- Überprüfe die Logs: **Einstellungen** → **System** → **Protokolle**
- Überprüfe deine Internetverbindung

### Problem: "Portfolio-Eintrag wird nicht gespeichert"
**Lösung:**
- Überprüfe die Integration ID (correct format!)
- Stelle sicher, dass das Datum im Format YYYY-MM-DD eingegeben ist
- Schaue in die Logs auf Error-Meldungen

---

## 📚 Weitere Ressourcen

- **Vollständige Dokumentation**: [docs/DOCUMENTATION.md](../docs/DOCUMENTATION.md)
- **Konfigurationsbeispiele**: [examples/CONFIGURATION_EXAMPLES.md](../examples/CONFIGURATION_EXAMPLES.md)
- **Dashboard Beispiel**: [examples/dashboard.yaml](../examples/dashboard.yaml)
- **Gold API Dokumentation**: https://www.goldapi.io/api

---

## 💡 Tipps und Tricks

### 💰 Mehrere Goldkäufe verwalten
Du kannst beliebig viele Portfolio-Einträge hinzufügen. Jeder wird einzeln verwaltet:

```yaml
# Kauf 1: 100g im Jan 2024
amount_grams: 100
purchase_price_eur: 5800

# Kauf 2: 50g im Dez 2023 (vorher gekauft)
amount_grams: 50
purchase_price_eur: 2800
```

### 📱 Mobile Ansicht optimieren
Widgets sind responsive und funktionieren auf dem Handy! Ändere einfach die Reihenfolge oder Größe im Dashboard-Editor.

### 🔔 Benachrichtigungen aktivieren
Erstelle eine Automatisierung für Gewinn-Meldungen:

```yaml
automation:
  - alias: "Gold Gewinn Alert"
    trigger:
      entity_id: sensor.portfolio_total_gain_percent
      platform: numeric_state
      above: 15
    action:
      service: notify.notify
      data:
        message: "🎉 Dein Gold Portfolio hat {{states('sensor.portfolio_total_gain_percent')}}% Gewinn!"
```

---

## 🆕 Was gibt es Neues?

Die neuste Version (1.0.0) bietet:
- ✅ Vollständiges Portfolio-Management
- ✅ Real-time Goldpreis-Abfrage
- ✅ Benutzerfreundliche Custom Cards
- ✅ Service-basierte API für Automatisierungen
- ✅ Lokale Datenspeicherung (keine Cloud!)

---

## 🤝 Support

Hast du Fragen oder Probleme?

1. **Logs überprüfen**: Einstellungen → System → Protokolle → "gold_portfolio"
2. **GitHub Issues**: https://github.com/user/ha_goldportfolio/issues
3. **Diskussionen**: https://github.com/user/ha_goldportfolio/discussions

Viel Erfolg mit deinem Gold Portfolio! 🏆
