class GoldPortfolioCard extends HTMLElement {
  constructor() {
    super();
    this._root = null;
    this._previousValues = {};
    this._initialized = false;
  }

  set hass(hass) {
    this.hassObj = hass;
    
    // First time setup
    if (!this._initialized && this.config) {
      this._previousValues = this._getCurrentValues();
      this.render();
      this._initialized = true;
    }
    // Only update if values changed
    else if (this._initialized && this._shouldUpdate()) {
      this._update();
    }
  }

  _shouldUpdate() {
    if (!this.hassObj || !this.config || !this._initialized) {
      return false;
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
          background: rgba(100, 100, 100, 0.3);
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
          background: rgba(100, 100, 100, 0.2);
          border-radius: 4px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .entry-item:hover {
          background-color: rgba(100, 100, 100, 0.4);
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
          background: rgba(100, 100, 100, 0.2);
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
      <div class="title">Total Gold Portfolio</div>
      
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
    const entryName = this.config.entry_name;
    
    // Build entity names based on entry_id (using Home Assistant naming convention)
    // These would be template sensors you create in your configuration
    const totalGramsSensor = this.config.entry_total_grams_entity || `sensor.portfolio_entry_${entryId}_grams`;
    const currentValueSensor = this.config.entry_current_value_entity || `sensor.portfolio_entry_${entryId}_current_value`;
    const gainEurSensor = this.config.entry_gain_eur_entity || `sensor.portfolio_entry_${entryId}_gain_eur`;
    const gainPercentSensor = this.config.entry_gain_percent_entity || `sensor.portfolio_entry_${entryId}_gain_percent`;

    const totalGrams = this._getEntityState(totalGramsSensor);
    const currentValue = this._getEntityState(currentValueSensor);
    const gainEur = this._getEntityState(gainEurSensor);
    const gainPercent = this._getEntityState(gainPercentSensor);

    // Check if sensors exist
    const sensorsFound = 
      totalGrams !== "N/A" || 
      currentValue !== "N/A" || 
      gainEur !== "N/A" || 
      gainPercent !== "N/A";

    if (!sensorsFound) {
      return `
        <div style="padding: 16px;">
          <div style="color: var(--error-color, red); margin-bottom: 12px;">
            ⚠️ Sensoren nicht gefunden!
          </div>
          <div style="font-size: 12px; color: var(--secondary-text-color);">
            Erwartet:<br>
            • ${totalGramsSensor}<br>
            • ${currentValueSensor}<br>
            • ${gainEurSensor}<br>
            • ${gainPercentSensor}<br>
            <br>
            Erstellen Sie diese als Template-Sensoren in Ihrer Home Assistant Konfiguration oder nutzen Sie die Service API.
          </div>
        </div>
      `;
    }

    const gainEurNum = parseFloat(gainEur);
    const gainClass = gainEurNum >= 0 ? "gain" : "loss";

    const titleText = entryName ? `📊 ${entryName}` : `📊 Portfolio Eintrag`;

    return `
      <div class="title">${titleText}</div>
      
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
}

customElements.define("gold-portfolio-card", GoldPortfolioCard);
