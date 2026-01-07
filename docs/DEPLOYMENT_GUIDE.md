# Deployment Guide - Gold Portfolio Tracker

## Deployment Optionen

### Option 1: HACS (Empfohlen) 🚀

Für End-Benutzer die einfachste Installation:

1. **Vorbereitung**
   - Push dieses Repository zu GitHub
   - Stelle sicher, dass `hacs.json`, `README.md`, und `manifest.json` vorhanden sind

2. **Im Home Assistant**
   - HACS → ⋮ (Menü) → Benutzerdefiniertes Repository
   - URL eingeben: `https://github.com/YOUR_USERNAME/ha_goldportfolio`
   - Kategorie: Integration
   - Installieren

3. **Einstellungen**
   - Geräte und Dienste → + Erstellen
   - Gold Portfolio Tracker auswählen
   - API Key eingeben

### Option 2: Manuelle Installation 🔧

Für Entwickler oder lokale Tests:

```bash
# Home Assistant Config Directory
cd ~/.homeassistant/custom_components/

# Git Clone
git clone https://github.com/YOUR_USERNAME/ha_goldportfolio.git gold_portfolio

# oder Kopieren
cp -r ha_goldportfolio/custom_components/gold_portfolio ./

# Home Assistant neu starten
sudo systemctl restart homeassistant
```

### Option 3: Docker 🐳

Für Home Assistant in Docker:

```bash
# Kopiere in Custom Components
docker cp ha_goldportfolio/custom_components/gold_portfolio \
  homeassistant:/config/custom_components/

# Neu starten
docker restart homeassistant
```

## Pre-Release Checks

### Code Quality ✅
- [ ] Kein Python Syntax Errors
- [ ] `pylint` Score > 8.0
- [ ] Alle Imports vorhanden
- [ ] Type Hints wo möglich

### Dokumentation ✅
- [ ] README aktualisiert
- [ ] CHANGELOG aktualisiert
- [ ] Beispiele vorhanden
- [ ] Alle Links funktionieren

### Testing ✅
- [ ] API Key Validierung funktioniert
- [ ] Sensoren werden erstellt
- [ ] Services sind aufrufbar
- [ ] Custom Cards laden
- [ ] Portfolio-Datenspeicherung funktioniert

### Manifest ✅
- [ ] Version aktualisiert
- [ ] Requirements aktuell
- [ ] homeassistant Versionierung korrekt

## Release Checklist

Vor jedem Release:

```bash
# 1. Version Update
sed -i 's/"version": ".*"/"version": "1.0.1"/g' \
  custom_components/gold_portfolio/manifest.json

# 2. CHANGELOG Update
# Manuell: docs/CHANGELOG.md aktualisieren

# 3. Git Commit
git add -A
git commit -m "v1.0.1: Bug fixes and improvements"

# 4. Git Tag
git tag -a v1.0.1 -m "Release v1.0.1"

# 5. Git Push
git push origin main --tags
```

## Publishing to HACS

### Erste Veröffentlichung

1. **GitHub Repository Anforderungen**
   - Public Repository
   - MIT oder Apache 2.0 Lizenz
   - README.md mit Beschreibung
   - hacs.json mit Konfiguration

2. **HACS Default Repositories**
   - Besuche: https://github.com/hacs/default
   - Füge deinen Repo zu `manifest.json` hinzu
   - Erstelle einen Pull Request

3. **Nach Genehmigung**
   - Dein Repository erscheint in HACS

### Ongoing Maintenance

- HACS überprüft dein Repository regelmäßig
- Updates erscheinen automatisch nach Git Push
- Versions-Tags triggern Release-Updates

## Distribution

### Archive
```bash
# Erstelle ein Release Archive
cd /var/projects/
tar -czf ha_goldportfolio-1.0.0.tar.gz ha_goldportfolio/

# SHA256 für Verifizierung
sha256sum ha_goldportfolio-1.0.0.tar.gz > ha_goldportfolio-1.0.0.tar.gz.sha256
```

### Changelog für Release
```markdown
## [1.0.0] - 2024-01-07

### Features
- ✨ Initiale Veröffentlichung
- 💰 Automatische Goldpreis-Abfrage
- 📊 Portfolio-Management
- 🎨 Custom Dashboard Cards

### Downloads
- [Source Code (zip)](https://github.com/user/ha_goldportfolio/archive/v1.0.0.zip)
- [Source Code (tar.gz)](https://github.com/user/ha_goldportfolio/archive/v1.0.0.tar.gz)
```

## Versioning Strategy

Verwende Semantic Versioning:

- **MAJOR** (1.0.0): Breaking Changes
  - Schema Änderungen
  - API Änderungen
  - Datenbank Migrationen
  
- **MINOR** (1.1.0): Features & Verbesserungen
  - Neue Services
  - Neue Sensoren
  - UI Verbesserungen
  
- **PATCH** (1.0.1): Bug Fixes
  - Behobene Fehler
  - Performance Verbesserungen
  - Dokumentation Updates

## Update Path

Für bestehende Nutzer:

```
v1.0.0 (Initial)
   ↓
v1.0.1 (Bug Fixes)
   ↓
v1.1.0 (New Features)
   ↓
v2.0.0 (Major Redesign)
```

Jede Version ist vollständig abwärtskompatibel bis zu Major Version.

## Troubleshooting bei Deployment

### Problem: Integration wird nicht geladen
**Lösung:**
- Überprüfe `manifest.json`
- Überprüfe Home Assistant Version
- Schaue in die Logs

### Problem: Services sind nicht verfügbar
**Lösung:**
- Stelle sicher, dass Integration geladen ist
- Home Assistant neustarten
- Services Registry überprüfen

### Problem: Custom Cards funktionieren nicht
**Lösung:**
- Stelle sicher, dass `www/` Dateien vorhanden sind
- JavaScript Console auf Fehler überprüfen
- Browser Cache löschen

## Support für Nutzer

### Häufige Fehler

1. **"Could not automatically discover integration"**
   - Lösung: Manually add the integration in Settings

2. **"API request failed"**
   - Lösung: Check API key and rate limits

3. **"Portfolio data not saving"**
   - Lösung: Check file permissions in .storage/

### Bug Reporting
Template für GitHub Issues:

```markdown
## Bug Report

**Version**: 1.0.0
**Home Assistant**: 2024.1.0
**Browser**: Chrome 120

### Description
Beschreibung des Problems

### Steps to Reproduce
1. ...
2. ...
3. ...

### Expected Behavior
Erwartetes Verhalten

### Actual Behavior
Aktuales Verhalten

### Logs
```
Home Assistant Log Output
```

### Screenshots
[Falls relevant]
```

## Performance Monitoring

Nach dem Deployment überprüfen:

- **CPU Usage**: Sollte minimal sein (< 1%)
- **Memory**: Sollte stabil bleiben (~ 5-10MB)
- **API Calls**: Sollte unter Rate Limit bleiben
- **Update Interval**: Sollte korrekt laufen

## Sicherheit

Vor Release überprüfen:

- [ ] Keine API Keys gehärtet
- [ ] Keine Debugging Statements
- [ ] Keine Security Warnings
- [ ] Dependencies sind aktuell

## Backup & Recovery

Für Nutzer:

```bash
# Backup erstellen
cp ~/.homeassistant/.storage/gold_portfolio_entries.json \
   ~/.homeassistant/.storage/gold_portfolio_entries.json.backup

# Backup wiederherstellen
cp ~/.homeassistant/.storage/gold_portfolio_entries.json.backup \
   ~/.homeassistant/.storage/gold_portfolio_entries.json
```

## Lizenzierung

Stelle sicher, dass:
- LICENSE Datei vorhanden ist
- Lizenz klar in README definiert ist
- Alle Dependencies kompatible Lizenzen haben
- Copyright Headers aktuell sind

---

## Kontakt & Support

- **Issues**: https://github.com/user/ha_goldportfolio/issues
- **Discussions**: https://github.com/user/ha_goldportfolio/discussions
- **Email**: support@example.com

---

**Viel Erfolg mit dem Deployment! 🚀**
