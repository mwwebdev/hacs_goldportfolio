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
        <select id="card_type">
          <option value="portfolio-total" ${cardType === "portfolio-total" ? "selected" : ""}>Gesamtes Portfolio</option>
          <option value="portfolio-entry" ${cardType === "portfolio-entry" ? "selected" : ""}>Portfolio Eintrag</option>
        </select>
      </div>
    `;

    if (cardType === "portfolio-total") {
      html += `
        <div class="section">
          <div>
            <label>Entity für Gesamtmenge (Gramm):</label>
            <input type="text" id="total_grams_entity" value="${this.config.total_grams_entity || ""}" />
          </div>
          <div>
            <label>Entity für aktuellen Wert:</label>
            <input type="text" id="current_value_entity" value="${this.config.current_value_entity || ""}" />
          </div>
          <div>
            <label>Entity für Gewinn (EUR):</label>
            <input type="text" id="gain_eur_entity" value="${this.config.gain_eur_entity || ""}" />
          </div>
          <div>
            <label>Entity für Gewinn (%):</label>
            <input type="text" id="gain_percent_entity" value="${this.config.gain_percent_entity || ""}" />
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
          <p style="font-size: 12px; color: var(--secondary-text-color); margin-top: 12px;">
            <strong>Hinweis:</strong> Die Sensoren werden automatisch gesucht basierend auf der Eintrag-ID.
          </p>
        </div>
      `;
    }

    root.innerHTML = html;
    this.attachEventListeners(cardType);
  }

  attachEventListeners(cardType) {
    const root = this.shadowRoot;

    const cardTypeSelect = root.querySelector("#card_type");
    if (cardTypeSelect) {
      cardTypeSelect.addEventListener("change", (e) => {
        this.config.card_type = e.target.value;
        this._fireConfigChanged();
        this.render();
      });
    }

    if (cardType === "portfolio-total") {
      const totalGramsInput = root.querySelector("#total_grams_entity");
      const currentValueInput = root.querySelector("#current_value_entity");
      const gainEurInput = root.querySelector("#gain_eur_entity");
      const gainPercentInput = root.querySelector("#gain_percent_entity");

      if (totalGramsInput) {
        totalGramsInput.addEventListener("change", (e) => {
          this.config.total_grams_entity = e.target.value;
          this._fireConfigChanged();
        });
      }
      if (currentValueInput) {
        currentValueInput.addEventListener("change", (e) => {
          this.config.current_value_entity = e.target.value;
          this._fireConfigChanged();
        });
      }
      if (gainEurInput) {
        gainEurInput.addEventListener("change", (e) => {
          this.config.gain_eur_entity = e.target.value;
          this._fireConfigChanged();
        });
      }
      if (gainPercentInput) {
        gainPercentInput.addEventListener("change", (e) => {
          this.config.gain_percent_entity = e.target.value;
          this._fireConfigChanged();
        });
      }
    } else {
      const entryIdInput = root.querySelector("#entry_id");
      const entryNameInput = root.querySelector("#entry_name");

      if (entryIdInput) {
        entryIdInput.addEventListener("change", (e) => {
          this.config.entry_id = e.target.value;
          this._fireConfigChanged();
        });
      }
      if (entryNameInput) {
        entryNameInput.addEventListener("change", (e) => {
          this.config.entry_name = e.target.value;
          this._fireConfigChanged();
        });
      }
    }
  }

  _fireConfigChanged() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define("gold-portfolio-card-editor", GoldPortfolioCardEditor);
