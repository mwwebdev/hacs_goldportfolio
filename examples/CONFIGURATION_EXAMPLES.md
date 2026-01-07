# Konfigurationsbeispiele für Gold Portfolio Tracker

## Minimale Konfiguration

```yaml
# configuration.yaml
# Keine Konfiguration notwendig! Alles wird über die UI konfiguriert.
```

## Dashboard YAML Beispiel

```yaml
title: Mein Gold Portfolio Dashboard
views:
  - title: Übersicht
    path: gold-overview
    cards:
      - type: custom:gold-portfolio-card
        type: portfolio-total
        total_grams_entity: sensor.portfolio_total_grams
        current_value_entity: sensor.portfolio_current_value
        gain_eur_entity: sensor.portfolio_total_gain_eur
        gain_percent_entity: sensor.portfolio_total_gain_percent

      - type: entities
        title: Aktuelle Daten
        entities:
          - sensor.gold_price
          - sensor.portfolio_total_grams
          - sensor.portfolio_current_value
          - sensor.portfolio_total_gain_eur
          - sensor.portfolio_total_gain_percent
```

## Automatisierungs-Beispiele

### Beispiel 1: Portfolio-Eintrag hinzufügen

```yaml
automation:
  - alias: "Gold Kauf am 15. eines jeden Monats"
    trigger:
      platform: time
      at: "09:00:00"
    condition:
      - condition: template
        value_template: "{{ now().day == 15 }}"
    action:
      service: gold_portfolio.add_portfolio_entry
      data:
        entry_id: "YOUR_CONFIG_ENTRY_ID"
        purchase_date: "{{ now().strftime('%Y-%m-%d') }}"
        amount_grams: 50
        # Kaufpreis wird vom aktuellen Goldpreis abgeleitet
```

### Beispiel 2: Benachrichtigung bei Gewinn > 20%

```yaml
automation:
  - alias: "Gewinn-Benachrichtigung"
    trigger:
      entity_id: sensor.portfolio_total_gain_percent
      platform: numeric_state
      above: 20
    action:
      - service: notify.notify
        data:
          title: "🎉 Gold Portfolio Gewinn!"
          message: "Dein Portfolio hat einen Gewinn von {{ states('sensor.portfolio_total_gain_percent') }}% erreicht!"
      - service: persistent_notification.create
        data:
          title: "Gold Portfolio Erfolg"
          message: "Glückwunsch zu deinem Gewinn von {{ states('sensor.portfolio_total_gain_eur') }} EUR!"
```

### Beispiel 3: Tägliche Preis-Update Benachrichtigung

```yaml
automation:
  - alias: "Goldpreis tägliches Update"
    trigger:
      platform: time
      at: "17:00:00"
    action:
      service: notify.notify
      data:
        title: "💰 Goldpreis Update"
        message: |
          Aktueller Goldpreis: {{ states('sensor.gold_price') }} EUR/Troy Oz
          Dein Portfolio Wert: {{ states('sensor.portfolio_current_value') }} EUR
          Gewinn: {{ states('sensor.portfolio_total_gain_eur') }} EUR ({{ states('sensor.portfolio_total_gain_percent') }}%)
```

### Beispiel 4: Warnung bei Negativem Gewinn

```yaml
automation:
  - alias: "Gewinn-Warnung"
    trigger:
      entity_id: sensor.portfolio_total_gain_percent
      platform: numeric_state
      below: -10
    action:
      service: notify.notify
      data:
        title: "⚠️ Wertverlust im Portfolio"
        message: "Dein Portfolio hat einen Verlust von {{ states('sensor.portfolio_total_gain_percent') }}% erlitten."
```

## Script Beispiele

### Beispiel: Portfolio-Eintrag schnell hinzufügen

```yaml
script:
  add_gold_purchase:
    alias: "Gold Kauf hinzufügen"
    description: "Einfaches Script zum Hinzufügen eines Goldkaufs"
    fields:
      date:
        selector:
          date:
      grams:
        selector:
          number:
            min: 0.01
            step: 0.01
      price_eur:
        selector:
          number:
            min: 0
            step: 0.01
    sequence:
      - service: gold_portfolio.add_portfolio_entry
        data:
          entry_id: "YOUR_CONFIG_ENTRY_ID"
          purchase_date: "{{ date }}"
          amount_grams: "{{ grams }}"
          purchase_price_eur: "{{ price_eur }}"
      - service: persistent_notification.create
        data:
          title: "Portfolio aktualisiert"
          message: "{{ grams }}g Gold zu {{ price_eur }}€ hinzugefügt"
```

## Template Beispiele

### Goldwert berechnen

```jinja2
{# Aktueller Wert deines Golds berechnen #}
{{ (states('sensor.portfolio_total_grams') | float(0) * (states('sensor.gold_price') | float(0) / 31.1035)) | round(2) }} EUR
```

### Gewinn-Prozentsatz anzeigen

```jinja2
{{ (states('sensor.portfolio_total_gain_eur') | float(0) / (states('sensor.portfolio_current_value') | float(0) - states('sensor.portfolio_total_gain_eur') | float(0)) * 100) | round(2) }}%
```

## Service-Aufrufe

### Portfolio-Eintrag hinzufügen (komplettes Beispiel)

```yaml
service: gold_portfolio.add_portfolio_entry
data:
  entry_id: "{{ config_entry_id }}"
  purchase_date: "2024-01-15"
  amount_grams: 100
  purchase_price_eur: 5800
```

### Historischen Preis abrufen

```yaml
service: gold_portfolio.get_historical_price
data:
  entry_id: "{{ config_entry_id }}"
  date: "2024-01-15"
```

## Weitere Ressourcen

- Offizielle Documentation: [docs/DOCUMENTATION.md](../docs/DOCUMENTATION.md)
- Beispiel Dashboard: [examples/dashboard.yaml](./dashboard.yaml)
- Beispiel Automatisierungen: [examples/automations.yaml](./automations.yaml)
