# Gold Portfolio Tracker

Eine Home Assistant Integration zur Verfolgung deines Gold-Portfolios mit automatischer Preisabfrage von goldapi.io — inklusive interaktiver Dashboard-Karte, mit der du Käufe direkt in der Oberfläche verwaltest.

## Features

- 🏆 Automatische Goldpreisabfrage (konfigurierbar, 1–24× täglich)
- 🖱️ **Interaktive Dashboard-Karte**: Käufe hinzufügen, bearbeiten und löschen direkt in der Karte — keine Services, keine Entity-IDs, kein YAML nötig
- 🪄 **Zero-Config**: Die Karte findet die Integration automatisch und wird automatisch geladen (keine Lovelace-Ressource, kein Kopieren nach `/config/www`)
- 📈 Historische Preisabfrage: Kaufpreis leer lassen → der Goldpreis zum Kaufdatum wird automatisch ermittelt
- 🙈 Privatsphäre-Modus: Ein Klick blendet alle Euro-Beträge aus
- 💰 Echtzeit-Bewertung mit Gewinn-/Verlust-Berechnung (gesamt und pro Kauf)
- 📊 Sensoren für alle Werte — nutzbar in Verlaufsgrafiken, Automationen usw.
- 🔐 Sichere Token-Speicherung

## Installation (HACS)

1. Öffne HACS
2. Drei-Punkte-Menü → „Benutzerdefinierte Repositories"
3. URL: `https://github.com/mwwebdev/hacs_goldportfolio`, Kategorie: Integration
4. „Gold Portfolio Tracker" installieren und Home Assistant neu starten

Benötigt Home Assistant **2024.6.0** oder neuer.

## Setup

1. Einstellungen → Geräte & Dienste → **Integration hinzufügen**
2. „Gold Portfolio Tracker" wählen
3. goldapi.io API-Schlüssel eingeben (kostenlos auf https://www.goldapi.io/)

## Dashboard-Karte

Karte zum Dashboard hinzufügen — mehr Konfiguration ist nicht nötig:

```yaml
type: custom:gold-portfolio-card
```

Die Karte ist auch im Karten-Auswahldialog („Gold Portfolio Card") verfügbar und bringt einen visuellen Editor mit.

**In der Karte kannst du:**
- Käufe über „+ Kauf hinzufügen" erfassen (Name, Datum, Menge, optional Preis)
- Käufe über das Stift-Symbol bearbeiten und über das Papierkorb-Symbol löschen
- Mit dem Augen-Symbol alle Euro-Beträge ausblenden

Optionale Einstellungen:

```yaml
type: custom:gold-portfolio-card
title: Mein Gold          # eigener Titel
show_entries: false       # nur Gesamtübersicht, keine Einzelkäufe
```

## Sensoren

| Sensor | Beschreibung |
|---|---|
| `sensor.gold_price` | Aktueller Goldpreis (EUR/oz, Attribut `price_per_gram`) |
| `sensor.portfolio_total_grams` | Gesamtmenge in Gramm |
| `sensor.portfolio_current_value` | Aktueller Portfoliowert (Attribute enthalten alle Einträge) |
| `sensor.portfolio_total_gain_eur` | Gesamtgewinn in EUR |
| `sensor.portfolio_total_gain` | Gesamtgewinn in Prozent |
| `sensor.gold_<name>_*` | Menge, Wert, Gewinn pro Kauf |

Neue Käufe erscheinen **sofort** als Sensoren — ein Neustart oder Reload ist nicht mehr nötig.

## Services

Alle Funktionen der Karte stehen auch als Services zur Verfügung (z.B. für Automationen). `entry_id` ist optional, solange nur eine Instanz der Integration existiert.

```yaml
service: gold_portfolio.add_portfolio_entry
data:
  name: "Schmuck"
  purchase_date: "2024-01-15"
  amount_grams: 100
  # purchase_price_eur weglassen -> historischer Preis wird automatisch geholt
```

Weitere Services: `update_portfolio_entry`, `remove_portfolio_entry`, `get_portfolio_entries` (mit Antwort), `get_historical_price` (mit Antwort).

## Upgrade von v1.x

- Bestehende Portfolio-Einträge werden automatisch migriert.
- Verwaiste, dauerhaft „nicht verfügbare" Sensoren aus v1.x werden beim Start automatisch entfernt.
- Die alten Karten-Konfigurationen (`card_type: portfolio-total` / `portfolio-entry` mit Entity-IDs) werden durch die neue Zero-Config-Karte ersetzt: Ersetze die alten Karten einfach durch `type: custom:gold-portfolio-card`.
- Falls die Karten-Datei früher manuell nach `/config/www` kopiert wurde: Datei und die zugehörige Lovelace-Ressource können gelöscht werden, die Karte wird jetzt von der Integration selbst bereitgestellt.

## API Key

Kostenlosen API-Schlüssel erstellen: https://www.goldapi.io/ → registrieren → Key generieren. Der Key wird ausschließlich lokal in Home Assistant gespeichert.

## Unterstützung

Fragen oder Probleme: https://github.com/mwwebdev/hacs_goldportfolio/issues

## Lizenz

MIT License
