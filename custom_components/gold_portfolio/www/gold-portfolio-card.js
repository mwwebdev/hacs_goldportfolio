class GoldPortfolioCard extends HTMLElement {
  constructor() {
    super();
    this._root = null;
    this._previousValues = {};
    this._initialized = false;
  }

  set hass(hass) {
    this.hassObj = hass;
    
    // Only update if values changed
    if (this._shouldUpdate()) {
      this._update();
    }
  }

  _shouldUpdate() {
    if (!this.hassObj || !this.config || !this._initialized) {
      return true;
    }

    const currentValues = this._getCurrentValues();
    const changed = JSON.stringify(currentValues) !== JSON.stringify(this._previousValues);
    
    if (changed) {
      this._previousValues = currentValues;
    }
    
    return changed;
  }

  _getCurrentValues() {
    const { total_grams_entity, current_value_entity, gain_eur_entity, gain_percent_entity } = this.config;
    
    return {
      totalGrams: this.hassObj?.states[total_grams_entity]?.state,
      currentValue: this.hassObj?.states[current_value_entity]?.state,
      gainEur: this.hassObj?.states[gain_eur_entity]?.state,
      gainPercent: this.hassObj?.states[gain_percent_entity]?.state,
    };
  }

  _update() {
    if (!this._root) {
      this.render();
    } else {
      // Just update the TEXT CONTENT of existing elements, don't recreate DOM!
      const totalGramsEl = this._root.querySelector('[data-metric="total-grams"]');
      const currentValueEl = this._root.querySelector('[data-metric="current-value"]');
      const gainEurEl = this._root.querySelector('[data-metric="gain-eur"]');
      const gainPercentEl = this._root.querySelector('[data-metric="gain-percent"]');

      if (totalGramsEl) totalGramsEl.textContent = this._getEntityState(this.config.total_grams_entity) + ' g';
      if (currentValueEl) currentValueEl.textContent = this._getEntityState(this.config.current_value_entity) + ' €';
      if (gainEurEl) gainEurEl.textContent = this._getEntityState(this.config.gain_eur_entity) + ' €';
      if (gainPercentEl) gainPercentEl.textContent = this._getEntityState(this.config.gain_percent_entity) + '%';

      // Update color classes
      const gainEurNum = parseFloat(this._getEntityState(this.config.gain_eur_entity));
      const gainClass = gainEurNum >= 0 ? 'gain' : 'loss';
      
      if (gainEurEl) {
        gainEurEl.className = 'stat-value ' + gainClass;
      }
      if (gainPercentEl) {
        gainPercentEl.className = 'stat-value ' + gainClass;
      }
    }
  }

  _getEntityState(entityId) {
    if (!entityId) return "N/A";
    const entity = this.hassObj?.states[entityId];
    return entity?.state || "N/A";
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

    this._root = this.shadowRoot || this.attachShadow({ mode: "open" });
    this._root.innerHTML = "";

    const styleTemplate = document.createElement("template");
    styleTemplate.innerHTML = `
      <style>
        :host {
          --text-color: var(--primary-text-color);
          --muted-color: var(--secondary-text-color);
          --card-background: var(--card-background-color);
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
          background: rgba(var(--rgb-primary-color), 0.15);
          border-radius: 8px;
          border-left: 4px solid var(--primary-color);
        }

        .stat-label {
          font-size: 11px;
          color: var(--muted-color);
          text-transform: uppercase;
          margin-bottom: 4px;
          font-weight: 600;
          opacity: 0.8;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-color);
          letter-spacing: 0.5px;
        }

        .stat-value.gain {
          color: #66bb6a;
        }

        .stat-value.loss {
          color: #ef5350;
        }

        .divider {
          border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));
          margin: 16px 0;
        }

        .entry-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .entry-item {
          padding: 12px;
          background: rgba(var(--rgb-primary-color), 0.1);
          border-radius: 4px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .entry-item:hover {
          background-color: rgba(var(--rgb-primary-color), 0.2);
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
          background: rgba(var(--rgb-primary-color), 0.1);
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

    this._root.appendChild(styleTemplate.content.cloneNode(true));

    const card = document.createElement("ha-card");
    card.innerHTML = this._renderContent();
    this._root.appendChild(card);
    
    this._initialized = true;
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

    // Check if all required entities are configured
    if (!totalGramsSensor || !currentValueSensor || !gainEurSensor || !gainPercentSensor) {
      return `
        <div style="padding: 16px; color: var(--error-color, red);">
          ⚠️ Konfiguration unvollständig!<br>
          Bitte alle Entity-IDs konfigurieren.
        </div>
      `;
    }

    const totalGrams = this._getEntityState(totalGramsSensor);
    const currentValue = this._getEntityState(currentValueSensor);
    const gainEur = this._getEntityState(gainEurSensor);
    const gainPercent = this._getEntityState(gainPercentSensor);

    const gainEurNum = parseFloat(gainEur);
    const gainClass = gainEurNum >= 0 ? "gain" : "loss";

    return `
      <div class="title">💰 Mein Gold Portfolio</div>
      
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Gesamtmenge Gold</div>
          <div class="stat-value" data-metric="total-grams">${totalGrams} g</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">Aktueller Wert</div>
          <div class="stat-value" data-metric="current-value">${currentValue} €</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">Gewinn (EUR)</div>
          <div class="stat-value ${gainClass}" data-metric="gain-eur">${gainEur} €</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">Gewinn (%)</div>
          <div class="stat-value ${gainClass}" data-metric="gain-percent">${gainPercent}%</div>
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
