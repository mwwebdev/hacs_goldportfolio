# Changelog

Alle wichtigen Änderungen dieses Projekts werden in dieser Datei dokumentiert.

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
