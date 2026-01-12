class GoldPortfolioCardEditor extends HTMLElement {
  setHass(hass) {
    this.hass = hass;
  }

  setConfig(config) {
    this.config = config || {};
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    const cardType = this.config.card_type || "portfolio-total";
    
    let html = `
      <style>
        div {
          margin: 8px 0;
        }
        label {
          display: block;
          margin-bottom: 4px;
          font-weight: bold;
        }
        input, select {
          width: 100%;
          padding: 8px;
          box-sizing: border-box;
        }
        .section {
          border: 1px solid var(--divider-color);
          padding: 12px;
          border-radius: 4px;
          margin: 12px 0;
        }
      </style>
      <div>
        <label>Kartentyp:</label>
        <select id="card_type" value="${cardType}">
          <option value="portfolio-total">Gesamtes Portfolio</option>
          <option value="portfolio-entry">Portfolio Eintrag</option>
        </select>
      </div>
    `;

    if (cardType === "portfolio-total") {
      html += `
        <div class="section">
          <div>
            <label>Entity für Gesamtmenge (Gramm):</label>
            <input type="text" id="total_grams_entity" value="${
              this.config.total_grams_entity || ""
            }" />
          </div>
          <div>
            <label>Entity für aktuellen Wert:</label>
            <input type="text" id="current_value_entity" value="${
              this.config.current_value_entity || ""
            }" />
          </div>
          <div>
            <label>Entity für Gewinn (EUR):</label>
            <input type="text" id="gain_eur_entity" value="${
              this.config.gain_eur_entity || ""
            }" />
          </div>
          <div>
            <label>Entity für Gewinn (%):</label>
            <input type="text" id="gain_percent_entity" value="${
              this.config.gain_percent_entity || ""
            }" />
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="section">
          <div>
            <label>Eintrag-ID:</label>
            <input type="text" id="entry_id" placeholder="z.B. 1768210120875" value="${this.config.entry_id || ""}" />
          </div>
          <div>
            <label>Name des Eintrags (optional):</label>
            <input type="text" id="entry_name" placeholder="z.B. Schmuck" value="${this.config.entry_name || ""}" />
          </div>
          <p style="font-size: 12px; color: var(--secondary-text-color);">
            Die Sensoren werden automatisch gesucht:<br>
            • sensor.portfolio_entry_[ID]_grams<br>
            • sensor.portfolio_entry_[ID]_current_value<br>
            • sensor.portfolio_entry_[ID]_gain_eur<br>
            • sensor.portfolio_entry_[ID]_gain_percent
          </p>
        </div>
      `;
    }

    root.innerHTML = html;

    root.querySelector("#card_type").addEventListener("change", (e) => {
      this.config.card_type = e.target.value;
      this._fireConfigChanged();
      this.render();
    });

    if (cardType === "portfolio-total") {
      root.querySelector("#total_grams_entity").addEventListener("change", (e) => {
        this.config.total_grams_entity = e.target.value;
        this._fireConfigChanged();
      });

      root.querySelector("#current_value_entity").addEventListener("change", (e) => {
        this.config.current_value_entity = e.target.value;
        this._fireConfigChanged();
      });

      root.querySelector("#gain_eur_entity").addEventListener("change", (e) => {
        this.config.gain_eur_entity = e.target.value;
        this._fireConfigChanged();
      });

      root.querySelector("#gain_percent_entity").addEventListener("change", (e) => {
        this.config.gain_percent_entity = e.target.value;
        this._fireConfigChanged();
      });
    } else {
      root.querySelector("#entry_id").addEventListener("change", (e) => {
        this.config.entry_id = e.target.value;
        this._fireConfigChanged();
      });

      root.querySelector("#entry_name").addEventListener("change", (e) => {
        this.config.entry_name = e.target.value;
        this._fireConfigChanged();
      });
    }
  }

  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this.config } }));
  }
}

customElements.define("gold-portfolio-card-editor", GoldPortfolioCardEditor);
