# Quick Start Guide - Gold Portfolio Tracker

## 🚀 Schnellstart (3 Minuten)

### Schritt 1: Installation via HACS ⚡

1. **HACS öffnen**
2. ⋮ (Menü) → **Benutzerdefinierte Repositories**
3. URL: `https://github.com/mwwebdev/hacs_goldportfolio`, Kategorie: Integration
4. "Gold Portfolio Tracker" installieren und **Home Assistant neu starten**

### Schritt 2: API Key besorgen 🔑

1. https://www.goldapi.io/ besuchen
2. Kostenlos registrieren und API Key generieren

### Schritt 3: Integration einrichten ⚙️

1. **Einstellungen** → **Geräte & Dienste** → **Integration hinzufügen**
2. "Gold Portfolio Tracker" auswählen
3. API Key eingeben → **Speichern**

### Schritt 4: Karte zum Dashboard hinzufügen 📈

1. **Dashboard bearbeiten** → **Karte hinzufügen**
2. "Gold Portfolio Card" auswählen (oder YAML: `type: custom:gold-portfolio-card`)
3. **Speichern** — mehr Konfiguration ist nicht nötig

### Schritt 5: Käufe erfassen 🪙

Direkt in der Karte auf **„+ Kauf hinzufügen"** klicken:

- **Bezeichnung** (z.B. „Schmuck", „Krügerrand")
- **Kaufdatum**
- **Menge** in Gramm
- **Kaufpreis** — oder leer lassen, dann wird der historische Goldpreis zum Kaufdatum automatisch ermittelt

Bearbeiten und Löschen geht ebenfalls direkt in der Karte (Stift- / Papierkorb-Symbol).

✅ **Fertig!**

---

## 🆘 Häufige Probleme

### „Integration wird nicht angezeigt"
- HACS installiert? Home Assistant komplett neu gestartet?
- Browser-Cache leeren

### „API Key ungültig"
- Key auf Tippfehler prüfen, ggf. neuen Key auf goldapi.io generieren
- [Detailliertes Debugging Guide](docs/TROUBLESHOOTING_API_KEY.md)

### „Karte zeigt: Integration nicht gefunden"
- Integration unter Einstellungen → Geräte & Dienste eingerichtet?
- Seite neu laden (Strg+F5)

### Upgrade von v1.x
- Alte Karten-Konfigurationen durch `type: custom:gold-portfolio-card` ersetzen
- Falls die Karten-JS-Datei früher manuell nach `/config/www` kopiert wurde: Datei löschen und die Lovelace-Ressource entfernen (Einstellungen → Dashboards → Ressourcen), sonst überdeckt die alte Karte die neue
- Bestehende Portfolio-Einträge werden automatisch übernommen

---

## 💡 Tipps

### 🔔 Benachrichtigung bei Gewinn

```yaml
automation:
  - alias: "Gold Gewinn Alert"
    trigger:
      entity_id: sensor.portfolio_total_gain
      platform: numeric_state
      above: 15
    action:
      service: notify.notify
      data:
        message: "🎉 Dein Gold Portfolio hat {{ states('sensor.portfolio_total_gain') }}% Gewinn!"
```

### 📊 Wertverlauf als Grafik

```yaml
type: history-graph
title: Portfoliowert
hours_to_show: 720
entities:
  - sensor.portfolio_current_value
```

---

## 🤝 Support

1. **Logs überprüfen**: Einstellungen → System → Protokolle → "gold_portfolio"
2. **GitHub Issues**: https://github.com/mwwebdev/hacs_goldportfolio/issues

Viel Erfolg mit deinem Gold Portfolio! 🏆
