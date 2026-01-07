# Projektstruktur

```
ha_goldportfolio/
├── README.md                              # Hauptdokumentation
├── QUICKSTART.md                          # Schnellstart-Guide
├── CHANGELOG.md                           # Versions-Übersicht
├── LICENSE                                # MIT Lizenz
├── .gitignore                             # Git Ignore Datei
├── hacs.json                              # HACS Konfiguration
│
├── custom_components/
│   └── gold_portfolio/                    # Hauptkomponente
│       ├── __init__.py                    # Integration Initialisierung
│       ├── manifest.json                  # Integration Manifest
│       ├── const.py                       # Konstanten & Konfiguration
│       ├── api.py                         # Gold API Client
│       ├── config_flow.py                 # Konfigurationsseite
│       ├── services.py                    # Service-Definitionen
│       ├── services.yaml                  # Service-Schema
│       ├── sensor.py                      # Sensor-Entitäten
│       ├── portfolio.py                   # Portfolio-Verwaltung
│       ├── strings.json                   # Lokalisierungs-Strings
│       └── www/                           # Frontend Assets
│           ├── gold-portfolio-card.js     # Main Card Widget
│           └── gold-portfolio-card-editor.js  # Card Editor
│
├── docs/
│   └── DOCUMENTATION.md                   # Ausführliche Dokumentation
│
└── examples/
    ├── dashboard.yaml                     # Dashboard Beispiel
    ├── automations.yaml                   # Automatisierungs-Beispiele
    └── CONFIGURATION_EXAMPLES.md          # Konfigurationsbeispiele
```

## Dateienbeschreibungen

### Konfiguration
- **manifest.json**: Home Assistant Integration Manifest (benötigt für die Installation)
- **const.py**: Zentrale Konstanten und Konfigurationen
- **strings.json**: Mehrsprachige Strings für die UI

### Core Funktionalität
- **__init__.py**: Hauptintegration, Setup und Coordinator
- **api.py**: Client für goldapi.io API-Aufrufe
- **portfolio.py**: Portfolio-Verwaltung und Berechnung
- **config_flow.py**: Setup-Wizard und Options-Flow

### Integration Komponenten
- **sensor.py**: Home Assistant Sensor-Entitäten
- **services.py**: Service-Definitionen für Portfolio-Management
- **services.yaml**: Service-Schemas mit Parametern

### Frontend
- **gold-portfolio-card.js**: Custom Lovelace Card für Dashboard
- **gold-portfolio-card-editor.js**: Card Editor für Konfiguration

### Dokumentation
- **README.md**: Überblick und Features
- **QUICKSTART.md**: 5-Minuten Schnellstart
- **DOCUMENTATION.md**: Vollständige Dokumentation
- **CHANGELOG.md**: Versions- und Feature-History
- **CONFIGURATION_EXAMPLES.md**: Konfigurationsbeispiele und Templates

## API Architektur

```
┌─────────────────────────────────────┐
│    Home Assistant                   │
├─────────────────────────────────────┤
│  Custom Component: gold_portfolio   │
├─────────────────────────────────────┤
│  Services          │  Sensors        │
│  ├─ add_entry      │ ├─ gold_price   │
│  ├─ update_entry   │ ├─ total_grams  │
│  ├─ remove_entry   │ ├─ current_value│
│  ├─ get_entries    │ ├─ gain_eur     │
│  └─ get_hist_price │ └─ gain_percent │
├─────────────────────────────────────┤
│  Data Layer                         │
│  ├─ Portfolio Manager (JSON)        │
│  └─ Coordinator (Update Logic)      │
├─────────────────────────────────────┤
│  Frontend                           │
│  └─ Custom Lovelace Cards           │
├─────────────────────────────────────┤
│  External APIs                      │
│  └─ goldapi.io                      │
└─────────────────────────────────────┘
```

## Datenspeicherung

### Local Storage
```
home-assistant-config/
└── .storage/
    └── gold_portfolio_entries.json
        ├── entries[]
        │   ├── id: "1704067200000"
        │   ├── purchase_date: "2024-01-15"
        │   ├── amount_grams: 100
        │   ├── purchase_price_eur: 5800
        │   └── created_at: "2024-01-07T10:00:00"
```

### Configuration Storage (Home Assistant)
```
config_entries.json
└── gold_portfolio
    ├── unique_id: "api_key"
    └── data
        └── api_key: "***encrypted***"
```

## Sensor Entities

| Entity ID | Type | Unit | Description |
|-----------|------|------|-------------|
| sensor.gold_price | Measurement | EUR/Troy Oz | Current gold price |
| sensor.portfolio_total_grams | Measurement | g | Total grams in portfolio |
| sensor.portfolio_current_value | Measurement | EUR | Current portfolio value |
| sensor.portfolio_total_gain_eur | Measurement | EUR | Total gain in EUR |
| sensor.portfolio_total_gain_percent | Measurement | % | Total gain percentage |

## Services

| Service | Parameters | Description |
|---------|-----------|-------------|
| add_portfolio_entry | entry_id, purchase_date, amount_grams, purchase_price_eur/per_gram | Add new entry |
| remove_portfolio_entry | entry_id, portfolio_entry_id | Remove entry |
| update_portfolio_entry | entry_id, portfolio_entry_id, ... | Update entry |
| get_portfolio_entries | entry_id | List all entries |
| get_historical_price | entry_id, date | Get price for date |

## Update-Zyklus

```
┌─ Coordinator Timer (konfigurierbar)
│  ├─ Standard: alle 12 Stunden
│  ├─ Konfigurierbar: 1-24x pro Tag
│  └─ Format: timedelta(hours=24//update_interval)
│
├─ async_update_data()
│  ├─ Ruft goldapi.io auf
│  └─ Cacht Daten lokal
│
└─ Sensoren aktualisiert
   ├─ Gold Price Update
   └─ Portfolio Werte neu berechnet
```

## Development Setup

### Voraussetzungen
- Python 3.9+
- Home Assistant 2023.12.0+
- Git
- VSCode (optional)

### Installation für Entwicklung
```bash
git clone https://github.com/user/ha_goldportfolio.git
cd ha_goldportfolio
# Kopiere in custom_components Verzeichnis
cp -r custom_components/gold_portfolio ~/.homeassistant/custom_components/
```

### Testing
- Keine automatischen Tests implementiert (Todo für v1.1.0)
- Manuelle Tests via Developer Tools empfohlen

## Performance-Überlegungen

- **Datenspeicherung**: JSON-File (schnell, < 1MB)
- **API-Aufrufe**: 5 Anfragen/Minute (goldapi.io Free Tier)
- **Sensor-Updates**: Asynchron, nicht blockierend
- **Memory**: Minimal (~5-10MB im Betrieb)

## Sicherheit

- ✅ API-Key wird lokal verschlüsselt gespeichert
- ✅ Keine Daten an externe Server außer goldapi.io
- ✅ Services sind Admin-only
- ✅ Portfolio-Daten sind local-only
- ⚠️ API-Key sollte regelmäßig rotiert werden

## Zukünftige Architektur-Improvements

- [ ] Database Storage statt JSON (v1.2.0)
- [ ] Webhook Support für externe Updates (v1.2.0)
- [ ] Caching Layer für API-Aufrufe (v1.1.0)
- [ ] GraphQL API für externe Konsumenten (v2.0.0)
