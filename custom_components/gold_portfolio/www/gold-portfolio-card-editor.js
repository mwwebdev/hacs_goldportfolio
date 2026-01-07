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
    root.innerHTML = `
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
      </style>
      <div>
        <label>Typ:</label>
        <select id="type" value="${this.config.type || "portfolio-total"}">
          <option value="portfolio-total">Gesamtes Portfolio</option>
          <option value="portfolio-entry">Portfolio Eintrag</option>
        </select>
      </div>
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
      <div>
        <label>Eintrag-ID (nur für Portfolio-Eintrag):</label>
        <input type="text" id="entry_id" value="${this.config.entry_id || ""}" />
      </div>
    `;

    root.querySelector("#type").addEventListener("change", (e) => {
      this.config.type = e.target.value;
      this._fireConfigChanged();
    });

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

    root.querySelector("#entry_id").addEventListener("change", (e) => {
      this.config.entry_id = e.target.value;
      this._fireConfigChanged();
    });
  }

  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this.config } }));
  }
}

customElements.define("gold-portfolio-card-editor", GoldPortfolioCardEditor);
