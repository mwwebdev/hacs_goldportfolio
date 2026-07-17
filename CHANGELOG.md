# Changelog

Alle wichtigen Änderungen dieses Projekts werden in dieser Datei dokumentiert.

## [2.0.0] - 2026-07-17

### 🖱️ Neue interaktive Dashboard-Karte
- Komplett neue `gold-portfolio-card`: Käufe **direkt in der Karte** hinzufügen, bearbeiten und löschen — keine Services, keine Entity-IDs, kein YAML mehr nötig
- Zero-Config: Karte findet die Integration automatisch (`type: custom:gold-portfolio-card` genügt)
- Karte wird von der Integration selbst bereitgestellt und automatisch geladen (kein Kopieren nach `/config/www`, keine Lovelace-Ressource)
- Privatsphäre-Modus (Euro-Beträge ausblenden, bleibt gespeichert)
- Visueller Karten-Editor, Karte im Auswahldialog verfügbar
- Deutsch und Englisch

### 🐛 Fixes
- **Dauerhaft „nicht verfügbare" Sensoren behoben**: Zur Laufzeit registrierte Sensoren bekamen andere unique_ids als nach einem Neustart, wodurch Geister-Entitäten entstanden (z.B. immer „unavailable" nach Neustart). Unique-IDs sind jetzt konsistent; verwaiste Entitäten werden beim Start automatisch bereinigt
- **Historische Preisabfrage repariert**: goldapi.io erwartet das Datum im URL-Pfad (`/XAU/EUR/20240115`), nicht als Query-Parameter — die Abfrage hat vorher nie funktioniert
- Sensoren aktualisieren sich **sofort** bei Portfolio-Änderungen (vorher erst beim nächsten Preis-Update, bis zu 12h später)
- Neue Käufe erzeugen ihre Sensoren sofort, gelöschte Käufe entfernen sie inkl. Registry-Eintrag
- Kein Ausfall aller Sensoren mehr, wenn die Gold-API vorübergehend nicht erreichbar ist (letzter bekannter Preis wird weiterverwendet)
- `strings.json` war Python-Code statt JSON — Übersetzungen (de/en) funktionieren jetzt
- Blockierende Datei-I/O im Event-Loop entfernt (HA-Storage-Helper statt direktem JSON)
- Gemeinsame aiohttp-Session von Home Assistant statt einer neuen Session pro Anfrage

### ✨ Verbesserungen
- Käufe haben jetzt eine **Bezeichnung** (z.B. „Schmuck"); Sensoren werden danach benannt
- Kaufpreis optional: ohne Angabe wird der historische Goldpreis zum Kaufdatum automatisch ermittelt
- `entry_id` in allen Services optional (wird automatisch erkannt)
- Service-Formulare mit richtigen Auswahlfeldern (Datum, Zahlen, Config-Entry)
- Alle Sensoren unter einem Gerät „Gold Portfolio Tracker" gruppiert
- Bestehende Portfolio-Daten werden automatisch migriert

### ⚠️ Breaking Changes
- Benötigt Home Assistant 2024.6.0 oder neuer
- Alte Karten-Konfigurationen (`card_type: portfolio-total` / `portfolio-entry`) müssen durch `type: custom:gold-portfolio-card` ersetzt werden

## [1.0.0] - 2024-01-07

### Features
- ✨ Initiale Veröffentlichung
- 💰 Automatische Goldpreis-Abfrage von goldapi.io
- 📊 Portfolio-Management mit mehreren Einträgen
- 🎨 Custom Lovelace Cards für Dashboard-Anzeige
- 🔧 Konfigurationsseite für API-Key und Aktualisierungshäufigkeit
- 📈 Automatische Gewinn-/Verlust-Berechnung
- 🌐 Historische Preisabfrage für Kaufdaten
- 📱 Responsive Dashboard Widgets
- 🔐 Sichere Token-Speicherung lokal

### Komponenten
- **Sensoren**: Gold Price, Portfolio Total Grams, Current Value, Gains
- **Services**: Add/Update/Remove Portfolio Entries, Get Entries, Historical Prices
- **Custom Cards**: Portfolio Total Widget und Portfolio Entry Widget
- **Config Flow**: Benutzerfreundliche Konfigurationsseite

### Einschränkungen
- Gold API Rate Limit: 5 Anfragen/Minute (kostenlos)
- Unterstützt nur EUR als Währung aktuell
- Lovelace Cards benötigen manuelle YAML-Konfiguration im Dashboard

## Geplante Features für zukünftige Versionen

### [1.1.0] - Geplant
- [ ] Chart/Graph Widget für Wertverlauf
- [ ] UI-basierte Portfolio-Verwaltung (ohne Services)
- [ ] Auto-Sync mit Blockchain (optional)
- [ ] Mehrsprachige Unterstützung (DE, EN, FR)
- [ ] CSV Export/Import für Portfolio
- [ ] Alarm-Benachrichtigungen bei bestimmten Preisen

### [1.2.0] - Geplant
- [ ] Weitere Edelmetalle (Silber, Platin, Palladium)
- [ ] Alternative APIs als Fallback
- [ ] Automatisches Portfolio Backup
- [ ] Mobile App Support

## Versionsverlauf

### v1.0.0
**Release Date**: 2024-01-07

Initial stable release with core functionality.

**Neue Features:**
- Goldpreis-Tracking
- Portfolio-Management
- Custom Cards
- Service-basierte API

**Fixes:**
- Keine bekannten Issues

**Breaking Changes:**
- Keine

---

## Upgrade Guide

### Von 0.x zu 1.0.0

Keine Migration notwendig - dies ist die erste stabile Version.

## Support

Für Probleme oder Feature-Requests bitte auf GitHub erstellen:
- 🐛 Bug Reports: https://github.com/user/ha_goldportfolio/issues
- 💡 Feature Requests: https://github.com/user/ha_goldportfolio/discussions
