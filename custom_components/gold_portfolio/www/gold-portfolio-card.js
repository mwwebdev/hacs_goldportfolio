class GoldPortfolioCard extends HTMLElement {
  constructor() {
    super();
    this._root = null;
    this._previousValues = {};
    this._initialized = false;
    this._hideEuroValues = false;
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
    if (this.config.card_type === "portfolio-total") {
      const { total_grams_entity, current_value_entity, gain_eur_entity, gain_percent_entity } = this.config;
      
      return {
        totalGrams: this.hassObj?.states[total_grams_entity]?.state,
        currentValue: this.hassObj?.states[current_value_entity]?.state,
        gainEur: this.hassObj?.states[gain_eur_entity]?.state,
        gainPercent: this.hassObj?.states[gain_percent_entity]?.state,
      };
    } else if (this.config.card_type === "portfolio-entry") {
      const entryId = this.config.entry_id;
      const totalGramsSensor = this.config.entry_total_grams_entity || this._findSensorByPattern(entryId, 'grams') || `sensor.portfolio_entry_${entryId}_grams`;
      const currentValueSensor = this.config.entry_current_value_entity || this._findSensorByPattern(entryId, 'current_value') || `sensor.portfolio_entry_${entryId}_current_value`;
      const gainEurSensor = this.config.entry_gain_eur_entity || this._findSensorByPattern(entryId, 'gain_eur') || `sensor.portfolio_entry_${entryId}_gain_eur`;
      const gainPercentSensor = this.config.entry_gain_percent_entity || this._findSensorByPattern(entryId, 'gain_percent') || `sensor.portfolio_entry_${entryId}_gain_percent`;

      return {
        totalGrams: this.hassObj?.states[totalGramsSensor]?.state,
        currentValue: this.hassObj?.states[currentValueSensor]?.state,
        gainEur: this.hassObj?.states[gainEurSensor]?.state,
        gainPercent: this.hassObj?.states[gainPercentSensor]?.state,
      };
    }
    
    return {};
  }

  _update() {
    const totalGramsEl = this._root.querySelector('[data-metric="total-grams"]');
    const currentValueEl = this._root.querySelector('[data-metric="current-value"]');
    const gainEurEl = this._root.querySelector('[data-metric="gain-eur"]');
    const gainPercentEl = this._root.querySelector('[data-metric="gain-percent"]');

    const values = this._getCurrentValues();

    if (totalGramsEl) totalGramsEl.textContent = (values.totalGrams || 'N/A') + ' g';
    if (currentValueEl) currentValueEl.textContent = (values.currentValue || 'N/A') + ' €';
    if (gainEurEl) gainEurEl.textContent = (values.gainEur || 'N/A') + ' €';
    if (gainPercentEl) gainPercentEl.textContent = (values.gainPercent || 'N/A') + '%';

    // Update color classes based on gain value
    const gainEurNum = parseFloat(values.gainEur);
    const gainPercentNum = parseFloat(values.gainPercent);
    // Use percent if EUR is not available (e.g. when hide_euro_values is true)
    const gainClass = (!isNaN(gainEurNum) ? gainEurNum : gainPercentNum) >= 0 ? 'gain' : 'loss';

    if (gainEurEl) {
      gainEurEl.className = 'stat-value ' + gainClass;
    }
    if (gainPercentEl) {
      gainPercentEl.className = 'stat-value ' + gainClass;
    }
  }

  _toggleEuroVisibility() {
    this._hideEuroValues = !this._hideEuroValues;
    this.render();
  }

  _getEntityState(entityId) {
    if (!entityId) return "N/A";
    const entity = this.hassObj?.states[entityId];
    return entity?.state || "N/A";
  }

  _findSensorByPattern(entryId, metricType) {
    // Try to find a sensor that matches the entry_id and metric type
    // This handles cases where HA generates different entity_id formats
    if (!this.hassObj?.states) return null;

    const patterns = [
      `sensor.portfolio_entry_${entryId}_${metricType}`,
      `sensor.gold_portfolio_portfolio_entry_${entryId}_${metricType}`,
      `sensor.portfolio_entry_${entryId}_${metricType.replace('_', '')}`,
    ];

    // First try exact matches
    for (const pattern of patterns) {
      if (this.hassObj.states[pattern]) {
        return pattern;
      }
    }

    // Then try fuzzy matching - find any sensor containing both entry_id and metric
    const allSensors = Object.keys(this.hassObj.states);
    const metricKeywords = {
      'grams': ['grams', 'gram', 'menge'],
      'current_value': ['current_value', 'value', 'wert'],
      'gain_eur': ['gain_eur', 'gain_euro', 'gewinn_eur'],
      'gain_percent': ['gain_percent', 'percent', 'prozent'],
    };

    const keywords = metricKeywords[metricType] || [metricType];

    for (const sensor of allSensors) {
      if (sensor.includes(entryId)) {
        for (const keyword of keywords) {
          if (sensor.toLowerCase().includes(keyword)) {
            return sensor;
          }
        }
      }
    }

    return null;
  }

  setConfig(config) {
    const configChanged = JSON.stringify(this.config) !== JSON.stringify(config);
    this.config = config;

    // Re-render if config changed and we have hass data
    if (configChanged && this._initialized && this.hassObj) {
      this._initialized = false;
      this._previousValues = this._getCurrentValues();
      this.render();
      this._initialized = true;
    }
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

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .title {
          margin-bottom: 0;
        }

        .toggle-btn {
          background: rgba(100, 100, 100, 0.3);
          border: none;
          border-radius: 4px;
          padding: 6px 10px;
          cursor: pointer;
          color: var(--text-color);
          font-size: 12px;
          transition: background 0.2s;
        }

        .toggle-btn:hover {
          background: rgba(100, 100, 100, 0.5);
        }

        .toggle-btn.active {
          background: var(--primary-color);
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

    // Attach event listener for toggle button
    const toggleBtn = this._root.querySelector('#toggle-euro');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this._toggleEuroVisibility());
    }
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
    const gainPercentNum = parseFloat(gainPercent);
    const gainClass = (!isNaN(gainEurNum) ? gainEurNum : gainPercentNum) >= 0 ? "gain" : "loss";
    const toggleBtnClass = this._hideEuroValues ? "toggle-btn active" : "toggle-btn";

    // Build stats items based on hide_euro_values setting
    let statsHtml = `
      <div class="stat-item">
        <div class="stat-label">Gesamtmenge Gold</div>
        <div class="stat-value" data-metric="total-grams">${totalGrams} g</div>
      </div>
    `;

    if (!this._hideEuroValues) {
      statsHtml += `
        <div class="stat-item">
          <div class="stat-label">Aktueller Wert</div>
          <div class="stat-value" data-metric="current-value">${currentValue} €</div>
        </div>

        <div class="stat-item">
          <div class="stat-label">Gewinn (EUR)</div>
          <div class="stat-value ${gainClass}" data-metric="gain-eur">${gainEur} €</div>
        </div>
      `;
    }

    statsHtml += `
      <div class="stat-item">
        <div class="stat-label">Gewinn (%)</div>
        <div class="stat-value ${gainClass}" data-metric="gain-percent">${gainPercent}%</div>
      </div>
    `;

    return `
      <div class="header">
        <div class="title">Gold Portfolio</div>
        <button class="${toggleBtnClass}" id="toggle-euro">€ ${this._hideEuroValues ? 'zeigen' : 'ausblenden'}</button>
      </div>

      <div class="stats-grid">
        ${statsHtml}
      </div>
    `;
  }

  _renderPortfolioEntry() {
    const entryId = this.config.entry_id;
    const entryName = this.config.entry_name;

    // Try to find sensors - first use config overrides, then auto-detect
    const totalGramsSensor = this.config.entry_total_grams_entity || this._findSensorByPattern(entryId, 'grams') || `sensor.portfolio_entry_${entryId}_grams`;
    const currentValueSensor = this.config.entry_current_value_entity || this._findSensorByPattern(entryId, 'current_value') || `sensor.portfolio_entry_${entryId}_current_value`;
    const gainEurSensor = this.config.entry_gain_eur_entity || this._findSensorByPattern(entryId, 'gain_eur') || `sensor.portfolio_entry_${entryId}_gain_eur`;
    const gainPercentSensor = this.config.entry_gain_percent_entity || this._findSensorByPattern(entryId, 'gain_percent') || `sensor.portfolio_entry_${entryId}_gain_percent`;

    // Debug: Log sensor discovery
    console.log('[Gold Portfolio Card] Entry ID:', entryId);
    console.log('[Gold Portfolio Card] Found sensors:', {
      totalGramsSensor,
      currentValueSensor,
      gainEurSensor,
      gainPercentSensor
    });

    // Debug: Log all available portfolio-related sensors
    if (this.hassObj?.states) {
      const portfolioSensors = Object.keys(this.hassObj.states).filter(k =>
        k.includes('portfolio') || k.includes('gold')
      );
      console.log('[Gold Portfolio Card] Available portfolio/gold sensors:', portfolioSensors);
    }

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
      // Find available portfolio/gold sensors for suggestion
      let availableSensors = [];
      let sensorsWithEntryId = [];
      if (this.hassObj?.states) {
        availableSensors = Object.keys(this.hassObj.states).filter(k =>
          k.includes('portfolio') || k.includes('gold')
        );
        sensorsWithEntryId = availableSensors.filter(k => k.includes(entryId));
      }

      return `
        <div style="padding: 16px;">
          <div style="color: var(--error-color, red); margin-bottom: 12px;">
            ⚠️ Sensoren nicht gefunden!
          </div>
          <div style="font-size: 12px; color: var(--secondary-text-color);">
            <strong>Entry-ID:</strong> ${entryId}<br><br>
            <strong>Gesucht:</strong><br>
            • ${totalGramsSensor}<br>
            • ${currentValueSensor}<br>
            • ${gainEurSensor}<br>
            • ${gainPercentSensor}<br>
            <br>
            ${sensorsWithEntryId.length > 0 ?
              `<strong>Sensoren mit dieser Entry-ID gefunden:</strong><br>${sensorsWithEntryId.map(s => '• ' + s).join('<br>')}<br><br>` :
              (availableSensors.length > 0 ?
                `<strong>Verfügbare Portfolio/Gold-Sensoren:</strong><br>${availableSensors.slice(0, 10).map(s => '• ' + s).join('<br>')}${availableSensors.length > 10 ? '<br>• ...' : ''}<br><br>` :
                '<strong>Keine Portfolio-Sensoren gefunden!</strong><br><br>')}
            <strong>Tipp:</strong> Integration neu laden:<br>
            Einstellungen → Geräte & Dienste → Gold Portfolio → ⋮ → Neu laden
          </div>
        </div>
      `;
    }

    const gainEurNum = parseFloat(gainEur);
    const gainPercentNum = parseFloat(gainPercent);
    const gainClass = (!isNaN(gainEurNum) ? gainEurNum : gainPercentNum) >= 0 ? "gain" : "loss";

    const titleText = entryName || "Portfolio Eintrag";
    const toggleBtnClass = this._hideEuroValues ? "toggle-btn active" : "toggle-btn";

    // Build stats items based on hide_euro_values setting
    let statsHtml = `
      <div class="stat-item">
        <div class="stat-label">Menge</div>
        <div class="stat-value" data-metric="total-grams">${totalGrams} g</div>
      </div>
    `;

    if (!this._hideEuroValues) {
      statsHtml += `
        <div class="stat-item">
          <div class="stat-label">Aktueller Wert</div>
          <div class="stat-value" data-metric="current-value">${currentValue} €</div>
        </div>

        <div class="stat-item">
          <div class="stat-label">Gewinn (EUR)</div>
          <div class="stat-value ${gainClass}" data-metric="gain-eur">${gainEur} €</div>
        </div>
      `;
    }

    statsHtml += `
      <div class="stat-item">
        <div class="stat-label">Gewinn (%)</div>
        <div class="stat-value ${gainClass}" data-metric="gain-percent">${gainPercent}%</div>
      </div>
    `;

    return `
      <div class="header">
        <div class="title">${titleText}</div>
        <button class="${toggleBtnClass}" id="toggle-euro">€ ${this._hideEuroValues ? 'zeigen' : 'ausblenden'}</button>
      </div>

      <div class="stats-grid">
        ${statsHtml}
      </div>
    `;
  }
}

customElements.define("gold-portfolio-card", GoldPortfolioCard);
