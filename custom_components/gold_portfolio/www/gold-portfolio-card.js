class GoldPortfolioCard extends HTMLElement {
  constructor() {
    super();
    this._lastRenderedContent = null;
  }

  set hass(hass) {
    this.hassObj = hass;
    this.render();
  }

  setConfig(config) {
    this.config = config;
  }

  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement("gold-portfolio-card-editor");
  }

  static getStubConfig() {
    return {};
  }

  render() {
    if (!this.hassObj || !this.config) {
      return;
    }

    const newContent = this._renderContent();
    
    // Only re-render if content actually changed
    if (newContent === this._lastRenderedContent) {
      return;
    }
    
    this._lastRenderedContent = newContent;

    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    root.innerHTML = "";

    const styleTemplate = document.createElement("template");
    styleTemplate.innerHTML = `
      <style>
        :host {
          --text-color: var(--primary-text-color);
          --muted-color: var(--secondary-text-color);
        }
        
        ha-card {
          padding: 16px;
        }

        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 16px;
          color: var(--text-color);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }

        .stat-item {
          padding: 12px;
          background: var(--background-color, #f5f5f5);
          border-radius: 8px;
          border-left: 4px solid var(--primary-color);
        }

        .stat-label {
          font-size: 12px;
          color: var(--muted-color);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: var(--text-color);
        }

        .stat-value.gain {
          color: #4caf50;
        }

        .stat-value.loss {
          color: #f44336;
        }

        .divider {
          border-top: 1px solid var(--divider-color, #e0e0e0);
          margin: 16px 0;
        }

        .entry-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .entry-item {
          padding: 12px;
          background: var(--background-color, #f5f5f5);
          border-radius: 4px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .entry-item:hover {
          background-color: var(--primary-color-alpha, rgba(0,0,0,0.05));
        }

        .entry-date {
          font-size: 12px;
          color: var(--muted-color);
          margin-bottom: 4px;
        }

        .entry-amount {
          font-size: 14px;
          font-weight: bold;
          color: var(--text-color);
        }

        .chart-container {
          margin-top: 16px;
          background: var(--background-color, #f5f5f5);
          padding: 12px;
          border-radius: 8px;
        }

        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;

    root.appendChild(styleTemplate.content.cloneNode(true));

    const card = document.createElement("ha-card");
    card.innerHTML = newContent;
    root.appendChild(card);
  }

  _renderContent() {
    const { card_type } = this.config;

    if (card_type === "portfolio-total") {
      return this._renderPortfolioTotal();
    } else if (card_type === "portfolio-entry") {
      return this._renderPortfolioEntry();
    }

    return `<div style="padding: 16px;">Konfiguration erforderlich (card_type nicht gesetzt)</div>`;
  }

  _renderPortfolioTotal() {
    const totalGramsSensor = this.config.total_grams_entity;
    const currentValueSensor = this.config.current_value_entity;
    const gainEurSensor = this.config.gain_eur_entity;
    const gainPercentSensor = this.config.gain_percent_entity;

    const getEntityState = (entityId) => {
      if (!entityId) return "N/A";
      const entity = this.hassObj?.states[entityId];
      if (!entity) {
        console.warn(`Entity ${entityId} not found`);
        return "N/A";
      }
      return entity.state || "N/A";
    };

    // Check if all required entities are configured
    if (!totalGramsSensor || !currentValueSensor || !gainEurSensor || !gainPercentSensor) {
      return `
        <div style="padding: 16px; color: var(--error-color, red);">
          ⚠️ Konfiguration unvollständig!<br>
          Bitte alle Entity-IDs konfigurieren.
        </div>
      `;
    }

    const totalGrams = getEntityState(totalGramsSensor);
    const currentValue = getEntityState(currentValueSensor);
    const gainEur = getEntityState(gainEurSensor);
    const gainPercent = getEntityState(gainPercentSensor);

    const gainEurNum = parseFloat(gainEur);
    const gainClass = gainEurNum >= 0 ? "gain" : "loss";

    return `
      <div class="title">💰 Mein Gold Portfolio</div>
      
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Gesamtmenge Gold</div>
          <div class="stat-value">${totalGrams} g</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">Aktueller Wert</div>
          <div class="stat-value">${currentValue} €</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">Gewinn (EUR)</div>
          <div class="stat-value ${gainClass}">${gainEur} €</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">Gewinn (%)</div>
          <div class="stat-value ${gainClass}">${gainPercent}%</div>
        </div>
      </div>
    `;
  }

  _renderPortfolioEntry() {
    const entryId = this.config.entry_id;
    const totalValueSensor = this.config.current_value_entity;
    const gainEurSensor = this.config.gain_eur_entity;
    const gainPercentSensor = this.config.gain_percent_entity;

    const getEntityState = (entityId) => {
      const entity = this.hassObj?.states[entityId];
      return entity ? entity.state : "N/A";
    };

    const getEntityAttribute = (entityId, attr) => {
      const entity = this.hassObj?.states[entityId];
      return entity?.attributes?.[attr] || "N/A";
    };

    const currentValue = getEntityState(totalValueSensor);
    const gainEur = getEntityState(gainEurSensor);
    const gainPercent = getEntityState(gainPercentSensor);

    const gainEurNum = parseFloat(gainEur);
    const gainClass = gainEurNum >= 0 ? "gain" : "loss";

    return `
      <div class="title">📊 Portfolio Eintrag</div>
      
      <div style="padding: 12px; background: var(--background-color, #f5f5f5); border-radius: 8px; margin-bottom: 16px;">
        <div style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 8px;">
          Eintrag-ID: ${entryId || "Nicht konfiguriert"}
        </div>
        ${entryId ? `
          <div style="font-size: 12px; color: var(--secondary-text-color);">
            Kaufdatum: ${getEntityAttribute(totalValueSensor, "purchase_date") || "N/A"}
          </div>
        ` : ""}
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Aktueller Wert</div>
          <div class="stat-value">${currentValue} €</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">Gewinn (EUR)</div>
          <div class="stat-value ${gainClass}">${gainEur} €</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">Gewinn (%)</div>
          <div class="stat-value ${gainClass}">${gainPercent}%</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">Menge</div>
          <div class="stat-value">${getEntityAttribute(totalValueSensor, "total_grams")} g</div>
        </div>
      </div>
    `;
  }
}

customElements.define("gold-portfolio-card", GoldPortfolioCard);
