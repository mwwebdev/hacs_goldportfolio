# Gold Portfolio Tracker - Erweiterte Dokumentation

## Installation

### Voraussetzungen
- Home Assistant 2023.12.0 oder neuer
- HACS installiert
- Internet-Verbindung für Gold API Abfragen

### HACS Installation (empfohlen)

1. **Öffne HACS**
   - Navigiere zu HACS im Sidebar Menü

2. **Benutzerdefiniertes Repository hinzufügen**
   - Klicke auf die Drei-Punkte-Menü (⋮)
   - Wähle "Benutzerdefiniertes Repository"
   - Gib folgende URL ein: `https://github.com/user/ha_goldportfolio`
   - Kategorie: Integration
   - Klicke auf "Erstellen"

3. **Integration installieren**
   - Du solltest jetzt "Gold Portfolio Tracker" in der Liste sehen
   - Klicke auf "Installation"
   - Starte Home Assistant neu

### Manuelle Installation

1. Navigiere zu: `/config/custom_components/`
2. Klone oder lade das Repository herunter
3. Kopiere den Ordner `gold_portfolio` in `custom_components`
4. Starte Home Assistant neu

## Konfiguration

### Schritt 1: Integration hinzufügen

1. Gehe zu **Einstellungen** → **Geräte und Dienste**
2. Klicke oben rechts auf **+ Neue Automatisierung erstellen** (oder "Neue Schnittstelle")
3. Suche nach "Gold Portfolio Tracker"
4. Klicke auf "Erstellen"
5. Gib deinen **goldapi.io API-Schlüssel** ein
6. (Optional) Gib einen Namen für die Integration ein
7. Klicke auf "Abschließen"

### Schritt 2: Aktualisierungshäufigkeit konfigurieren

Nach dem Erstellen:

1. Gehe zu **Einstellungen** → **Geräte und Dienste**
2. Suche nach "Gold Portfolio Tracker"
3. Klicke auf den Eintrag
4. Klicke auf **Optionen**
5. Stelle die **Aktualisierungshäufigkeit** ein:
   - 1 = 1x täglich (alle 24 Stunden)
   - 2 = 2x täglich (alle 12 Stunden) - Standard
   - 4 = 4x täglich (alle 6 Stunden)
   - 6 = 6x täglich (alle 4 Stunden)
   - 12 = 12x täglich (alle 2 Stunden)
   - 24 = 24x täglich (stündlich)
6. Speichern

### Schritt 3: Portfolio-Einträge erstellen

Es gibt mehrere Möglichkeiten, Einträge zu erstellen:

#### Option A: Service im Developer Tools

1. Gehe zu **Einstellungen** → **Developer Tools** → **Services**
2. Wähle "Gold Portfolio Tracker: Portfolio-Eintrag hinzufügen"
3. Fülle folgende Daten aus:
   - **Integration ID**: Deine Konfiguration ID (z.B. aus den Geräte-Einstellungen)
   - **Kaufdatum**: z.B. "2024-01-15"
   - **Menge in Gramm**: z.B. 100
   - **Kaufpreis (EUR)** oder **Kaufpreis pro Gramm**: Wähle eine Option

4. Klicke auf "Aufrufen"

#### Option B: Automation/Script

Erstelle eine Automatisierung oder ein Script mit dem Service-Aufruf (siehe `examples/automations.yaml`)

#### Option C: Dashboard Input-Dialog (Optional - erfordert zusätzliche Konfiguration)

## Verwendung

### Sensoren überwachen

Die Integration erstellt automatisch folgende Sensoren:

| Sensor | Beschreibung | Einheit |
|--------|-------------|---------|
| `sensor.gold_price` | Aktueller Goldpreis | EUR/Troy Oz |
| `sensor.portfolio_total_grams` | Gesamtmenge Gold | g |
| `sensor.portfolio_current_value` | Aktueller Portfoliowert | EUR |
| `sensor.portfolio_total_gain_eur` | Gesamtgewinn | EUR |
| `sensor.portfolio_total_gain_percent` | Gesamtgewinn | % |

### Widgets im Dashboard

Es stehen zwei benutzerdefinierte Lovelace Cards zur Verfügung:

#### Widget 1: Gesamtes Portfolio

Zeigt eine Übersicht des gesamten Portfolios mit Gesamtmenge, aktuellem Wert und Gewinn.

```yaml
type: custom:gold-portfolio-card
type: portfolio-total
total_grams_entity: sensor.portfolio_total_grams
current_value_entity: sensor.portfolio_current_value
gain_eur_entity: sensor.portfolio_total_gain_eur
gain_percent_entity: sensor.portfolio_total_gain_percent
```

#### Widget 2: Einzelner Portfolio-Eintrag

Zeigt Details für einen spezifischen Portfolio-Eintrag.

```yaml
type: custom:gold-portfolio-card
type: portfolio-entry
entry_id: "1704067200000"  # Die ID deines Eintrags
current_value_entity: sensor.portfolio_current_value
gain_eur_entity: sensor.portfolio_total_gain_eur
gain_percent_entity: sensor.portfolio_total_gain_percent
```

Um die `entry_id` zu finden, rufe den Service `get_portfolio_entries` auf.

## API-Schlüssel

### Gold API beziehen

1. Besuche: https://www.goldapi.io/
2. Klicke auf "Get Free API Key"
3. Registriere dich mit einer E-Mail
4. Du erhältst einen API-Schlüssel
5. Dieser kann kostenlos verwendet werden (mit gewissen Rate Limits)

### Rate Limits

Die kostenlose Version hat folgende Limits:
- 5 Anfragen pro Minute
- 100 Anfragen pro Tag

Für höhere Limits siehe Premium-Pläne auf der Website.

## Erweiterte Funktionen

### Historische Preisabfrage

Du kannst den Goldpreis für ein bestimmtes Datum abrufen:

```yaml
service: gold_portfolio.get_historical_price
data:
  entry_id: "config_entry_id"
  date: "2024-01-15"
```

Dies ist nützlich, um den Kaufpreis automatisch auszufüllen.

### Portfolio Verwaltung Services

#### Portfolio-Eintrag hinzufügen

```yaml
service: gold_portfolio.add_portfolio_entry
data:
  entry_id: "config_entry_id"
  purchase_date: "2024-01-15"
  amount_grams: 100
  purchase_price_eur: 5800
```

#### Portfolio-Eintrag aktualisieren

```yaml
service: gold_portfolio.update_portfolio_entry
data:
  entry_id: "config_entry_id"
  portfolio_entry_id: "1704067200000"
  purchase_date: "2024-01-15"
  amount_grams: 120
```

#### Portfolio-Eintrag löschen

```yaml
service: gold_portfolio.remove_portfolio_entry
data:
  entry_id: "config_entry_id"
  portfolio_entry_id: "1704067200000"
```

#### Portfolio-Einträge auflisten

```yaml
service: gold_portfolio.get_portfolio_entries
data:
  entry_id: "config_entry_id"
```

## Häufig gestellte Fragen

### F: Wo werden meine Daten gespeichert?
A: Alle Daten werden lokal in Home Assistant gespeichert (in `.storage/gold_portfolio_entries.json`). Dein API-Schlüssel wird ebenfalls lokal in der Home Assistant Konfiguration gespeichert.

### F: Funktioniert die Integration auch offline?
A: Nein, die Integration benötigt Internet, um den Goldpreis von der Gold API abzurufen. Allerdings werden die letzten Preise gecacht, so dass die Sensoren noch aktualisiert werden können, wenn die API temporal nicht erreichbar ist.

### F: Kann ich mehrere Integrations-Instanzen haben?
A: Ja, du kannst mehrere Instanzen mit unterschiedlichen API-Schlüsseln erstellen.

### F: Wie kann ich mein Portfolio exportieren?
A: Die Daten sind in folgende Datei gespeichert: `config/.storage/gold_portfolio_entries.json`. Du kannst diese Datei herunterladen und als Backup speichern.

### F: Kann ich die Gewinn-/Verlust-Berechnung verstehen?
A: 
- **Aktueller Wert** = Gesamtmenge Gramm × Aktueller Goldpreis pro Gramm
- **Gewinn EUR** = Aktueller Wert - Gesamte Investition
- **Gewinn %** = (Gewinn EUR / Gesamte Investition) × 100

### F: Was ist ein Troy Ounce?
A: Die Gold API gibt Preise in Troy Ounce an. 1 Troy Ounce = 31,1035 Gramm. Die Integration konvertiert dies automatisch für deine Anzeige.

## Troubleshooting

### Integration wird nicht geladen
- Überprüfe, dass der API-Schlüssel korrekt eingegeben wurde
- Versuche, Home Assistant neu zu starten
- Schaue in die Logs: **Einstellungen** → **System** → **Protokolle**

### Goldpreis wird nicht aktualisiert
- Überprüfe deine Internet-Verbindung
- Überprüfe, dass die API nicht down ist (https://www.goldapi.io/)
- Überprüfe dein Rate Limit (max. 5 Anfragen pro Minute bei kostenlosem Plan)
- Schaue in die Logs für Error-Meldungen

### Portfolio-Einträge werden nicht gespeichert
- Überprüfe, dass dein Home Assistant Schreibzugriff auf das Verzeichnis hat
- Versuche, Home Assistant neu zu starten
- Überprüfe die Berechtigungen des `/config/.storage/` Verzeichnisses

## Support und Beitrag

- Für Issues und Feature-Requests: https://github.com/user/ha_goldportfolio/issues
- Für Diskussionen: https://github.com/user/ha_goldportfolio/discussions

## Lizenz

MIT License - siehe LICENSE Datei

## Datenschutz

Diese Integration:
- Speichert deinen API-Schlüssel lokal
- Sendet nur Anfragen an goldapi.io
- Speichert dein Portfolio lokal
- Teilt deine Daten nicht mit Dritten
