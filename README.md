# Gold Portfolio Tracker

Eine Home Assistant Integration zur Verfolgung deines Gold Portfolios mit automatischer Preisabfrage von goldapi.io.

## Features

- 🏆 Automatische Goldpreisabfrage mehrmals täglich
- 📊 Portfolio-Management mit mehreren Einträgen
- 💰 Echtzeit-Bewertung und Gewinn-/Verlust-Berechnung
- 🎨 Benutzerdefinierte Dashboard-Cards (Widgets)
- 🔐 Sichere Token-Speicherung
- 📈 Historische Preisabfrage für automatische Preiseingabe

## Installation (HACS)

1. Öffne HACS → Integrationen
2. Klicke auf die Drei-Punkte und wähle "Benutzerdefiniertes Repository"
3. Gib folgende URL ein: `https://github.com/user/ha_goldportfolio`
4. Kategorie: Integration
5. Klicke auf "Erstellen"
6. Jetzt sollte "Gold Portfolio Tracker" in HACS verfügbar sein
7. Installiere die Integration und starte Home Assistant neu

## Setup

### 1. Integration hinzufügen

1. Gehe zu Einstellungen → Geräte und Dienste
2. Klicke auf "+ Neue Automatisierung erstellen"
3. Wähle "Gold Portfolio Tracker"
4. Gib deinen goldapi.io API-Schlüssel ein
5. Speichern

### 2. Optionen konfigurieren

Nach dem Erstellen der Integration:
1. Gehe zu Einstellungen → Geräte und Dienste
2. Wähle "Gold Portfolio Tracker"
3. Klicke auf "Optionen"
4. Stelle die Aktualisierungshäufigkeit ein (1-24 mal pro Tag)

### 3. Portfolio-Einträge hinzufügen

Verwende die bereitgestellten Services:

**Service: `gold_portfolio.add_portfolio_entry`**

```yaml
service: gold_portfolio.add_portfolio_entry
data:
  entry_id: config_entry_id  # Deine Integration ID
  purchase_date: "2024-01-15"
  amount_grams: 100
  purchase_price_eur: 5800  # Optional
  purchase_price_per_gram: 58  # Optional (statt purchase_price_eur)
```

## Sensoren

Die Integration erstellt automatisch folgende Sensoren:

- `sensor.gold_price` - Aktueller Goldpreis in EUR
- `sensor.portfolio_total_grams` - Gesamtmenge Gold in Gramm
- `sensor.portfolio_current_value` - Aktueller Portfoliowert in EUR
- `sensor.portfolio_total_gain_eur` - Gesamtgewinn in EUR
- `sensor.portfolio_total_gain_percent` - Gesamtgewinn in Prozent

## Widgets

### Widget 1: Gesamtes Portfolio

```yaml
type: custom:gold-portfolio-card
type: portfolio-total
total_grams_entity: sensor.portfolio_total_grams
current_value_entity: sensor.portfolio_current_value
gain_eur_entity: sensor.portfolio_total_gain_eur
gain_percent_entity: sensor.portfolio_total_gain_percent
```

### Widget 2: Einzelner Eintrag

```yaml
type: custom:gold-portfolio-card
type: portfolio-entry
entry_id: "your_entry_id"
current_value_entity: sensor.portfolio_current_value
gain_eur_entity: sensor.portfolio_total_gain_eur
gain_percent_entity: sensor.portfolio_total_gain_percent
```

## Services

### add_portfolio_entry
Portfolio-Eintrag hinzufügen

```yaml
service: gold_portfolio.add_portfolio_entry
data:
  entry_id: config_entry_id
  purchase_date: "YYYY-MM-DD"
  amount_grams: number
  purchase_price_eur: number (optional)
  purchase_price_per_gram: number (optional)
```

### remove_portfolio_entry
Portfolio-Eintrag entfernen

```yaml
service: gold_portfolio.remove_portfolio_entry
data:
  entry_id: config_entry_id
  portfolio_entry_id: entry_id_to_remove
```

### update_portfolio_entry
Portfolio-Eintrag aktualisieren

```yaml
service: gold_portfolio.update_portfolio_entry
data:
  entry_id: config_entry_id
  portfolio_entry_id: entry_id_to_update
  purchase_date: "YYYY-MM-DD" (optional)
  amount_grams: number (optional)
  purchase_price_eur: number (optional)
```

### get_portfolio_entries
Alle Portfolio-Einträge abrufen

```yaml
service: gold_portfolio.get_portfolio_entries
data:
  entry_id: config_entry_id
```

### get_historical_price
Historischen Goldpreis für ein bestimmtes Datum abrufen

```yaml
service: gold_portfolio.get_historical_price
data:
  entry_id: config_entry_id
  date: "YYYY-MM-DD"
```

## API Key

Um einen kostenlosen API-Schlüssel zu erhalten:

1. Besuche https://www.goldapi.io/
2. Registriere dich oder melde dich an
3. Generiere einen neuen API-Schlüssel
4. Verwende diesen Schlüssel in der Integration

## Häufig gestellte Fragen

**F: Wie oft wird der Goldpreis aktualisiert?**
A: Das ist in den Optionen konfigurierbar. Standardmäßig 2x pro Tag (alle 12 Stunden).

**F: Kann ich historische Preise abrufen?**
A: Ja, mit dem Service `get_historical_price` kannst du Preise für ein bestimmtes Datum abrufen.

**F: Sind meine Daten sicher?**
A: Ja, dein API-Schlüssel wird nur lokal gespeichert und wird nie an Dritte übertragen.

## Unterstützung

Für Probleme oder Fragen bitte ein Issue auf GitHub erstellen:
https://github.com/user/ha_goldportfolio/issues

## Lizenz

MIT License
