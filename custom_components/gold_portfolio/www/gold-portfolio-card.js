/**
 * Gold Portfolio Card
 *
 * Interactive dashboard card for the gold_portfolio integration.
 * Zero configuration: the card finds the portfolio sensor automatically and
 * lets you add / edit / delete purchases directly in the UI.
 */

const GOLD = "#c9a227";

const STRINGS = {
  de: {
    title: "Gold Portfolio",
    total_grams: "Bestand",
    current_value: "Aktueller Wert",
    invested: "Investiert",
    gain: "Gewinn",
    entries: "Käufe",
    add: "Kauf hinzufügen",
    edit: "Bearbeiten",
    delete: "Löschen",
    name: "Bezeichnung",
    name_placeholder: "z.B. Schmuck, Krügerrand …",
    date: "Kaufdatum",
    grams: "Menge (Gramm)",
    price: "Kaufpreis gesamt (€)",
    price_hint: "Leer lassen → historischer Goldpreis zum Kaufdatum wird automatisch ermittelt.",
    save: "Speichern",
    cancel: "Abbrechen",
    confirm_delete: "Wirklich löschen?",
    yes_delete: "Ja, löschen",
    no_entries: "Noch keine Käufe erfasst.",
    add_first: "Ersten Kauf hinzufügen",
    not_found:
      "Gold Portfolio Integration nicht gefunden. Bitte unter Einstellungen → Geräte & Dienste einrichten.",
    price_per_gram: "Goldpreis",
    error_required: "Bitte Datum und Menge ausfüllen.",
    saving: "Speichern …",
    purchased_for: "gekauft für",
    unnamed: "Kauf vom",
  },
  en: {
    title: "Gold Portfolio",
    total_grams: "Holdings",
    current_value: "Current value",
    invested: "Invested",
    gain: "Gain",
    entries: "Purchases",
    add: "Add purchase",
    edit: "Edit",
    delete: "Delete",
    name: "Name",
    name_placeholder: "e.g. jewelry, Krugerrand …",
    date: "Purchase date",
    grams: "Amount (grams)",
    price: "Total purchase price (€)",
    price_hint: "Leave empty → the historical gold price for the purchase date is fetched automatically.",
    save: "Save",
    cancel: "Cancel",
    confirm_delete: "Really delete?",
    yes_delete: "Yes, delete",
    no_entries: "No purchases yet.",
    add_first: "Add your first purchase",
    not_found:
      "Gold Portfolio integration not found. Please set it up under Settings → Devices & Services.",
    price_per_gram: "Gold price",
    error_required: "Please fill in date and amount.",
    saving: "Saving …",
    purchased_for: "bought for",
    unnamed: "Purchase of",
  },
};

class GoldPortfolioCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._entityId = null;
    this._lastRenderKey = null;
    this._formOpen = false;
    this._editingId = null;
    this._confirmDeleteId = null;
    this._busy = false;
    this._error = null;
    this._hideValues = window.localStorage.getItem("gold-portfolio-hide") === "1";
  }

  setConfig(config) {
    this._config = config || {};
    this._lastRenderKey = null;
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    // While a form or confirmation is open, don't re-render on state changes
    // (it would wipe the user's input); data is re-read after saving.
    if (this._formOpen || this._confirmDeleteId) return;

    const state = this._findState();
    const renderKey = state
      ? JSON.stringify([state.state, state.attributes])
      : "none";
    if (renderKey !== this._lastRenderKey) {
      this._lastRenderKey = renderKey;
      this._render();
    }
  }

  get _lang() {
    const lang = (this._hass?.locale?.language || "de").substring(0, 2);
    return STRINGS[lang] ? lang : "en";
  }

  _t(key) {
    return STRINGS[this._lang][key] || STRINGS.en[key] || key;
  }

  _findState() {
    if (!this._hass) return null;
    if (this._config.entity) {
      return this._hass.states[this._config.entity] || null;
    }
    if (this._entityId && this._hass.states[this._entityId]) {
      return this._hass.states[this._entityId];
    }
    for (const [entityId, state] of Object.entries(this._hass.states)) {
      if (
        entityId.startsWith("sensor.") &&
        state.attributes &&
        state.attributes.integration === "gold_portfolio" &&
        state.attributes.config_entry_id
      ) {
        this._entityId = entityId;
        return state;
      }
    }
    return null;
  }

  _fmtEur(value) {
    if (this._hideValues) return "•••••";
    if (value === null || value === undefined || isNaN(value)) return "–";
    return new Intl.NumberFormat(this._lang === "de" ? "de-DE" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(value);
  }

  _fmtGrams(value) {
    if (value === null || value === undefined || isNaN(value)) return "–";
    return (
      new Intl.NumberFormat(this._lang === "de" ? "de-DE" : "en-US", {
        maximumFractionDigits: 2,
      }).format(value) + " g"
    );
  }

  _fmtPercent(value) {
    if (value === null || value === undefined || isNaN(value)) return "–";
    const sign = value > 0 ? "+" : "";
    return (
      sign +
      new Intl.NumberFormat(this._lang === "de" ? "de-DE" : "en-US", {
        maximumFractionDigits: 1,
      }).format(value) +
      " %"
    );
  }

  _fmtDate(dateStr) {
    if (!dateStr) return "";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString(
        this._lang === "de" ? "de-DE" : "en-US",
        { year: "numeric", month: "2-digit", day: "2-digit" }
      );
    } catch (e) {
      return dateStr;
    }
  }

  _styles() {
    return `
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; }
        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 16px 0 16px;
        }
        .header .icon {
          width: 40px; height: 40px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, ${GOLD}, #e8c95c);
          color: #fff;
          flex-shrink: 0;
        }
        .header .titles { flex: 1; min-width: 0; }
        .header .title {
          font-size: 18px; font-weight: 600;
          color: var(--primary-text-color);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .header .subtitle {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        .header .actions { display: flex; gap: 4px; }
        .icon-btn {
          background: none; border: none; cursor: pointer;
          padding: 8px; border-radius: 50%;
          color: var(--secondary-text-color);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .icon-btn:hover { background: rgba(127,127,127,0.15); }
        .icon-btn svg { width: 20px; height: 20px; fill: currentColor; }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
          padding: 16px;
        }
        .stat {
          padding: 12px;
          border-radius: 12px;
          background: var(--secondary-background-color, rgba(127,127,127,0.08));
        }
        .stat .label {
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px;
          color: var(--secondary-text-color);
          margin-bottom: 4px;
        }
        .stat .value {
          font-size: 19px; font-weight: 700;
          color: var(--primary-text-color);
          white-space: nowrap;
        }
        .stat .sub {
          font-size: 12px; font-weight: 600; margin-top: 2px;
        }
        .pos { color: var(--success-color, #2e7d32); }
        .neg { color: var(--error-color, #c62828); }

        .section-title {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px;
          font-size: 13px; font-weight: 600;
          color: var(--secondary-text-color);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .add-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: none; cursor: pointer;
          background: linear-gradient(135deg, ${GOLD}, #b08d1e);
          color: #fff; font-weight: 600; font-size: 13px;
          padding: 7px 14px; border-radius: 18px;
          transition: filter 0.15s;
        }
        .add-btn:hover { filter: brightness(1.1); }
        .add-btn svg { width: 16px; height: 16px; fill: currentColor; }

        .entries { padding: 8px 8px 12px 8px; }
        .entry {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 8px;
          border-radius: 10px;
          transition: background 0.15s;
        }
        .entry:hover { background: rgba(127,127,127,0.08); }
        .entry:hover .row-actions { opacity: 1; }
        .entry .bullet {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(201,162,39,0.15);
          color: ${GOLD};
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 13px;
          flex-shrink: 0;
        }
        .entry .info { flex: 1; min-width: 0; }
        .entry .name {
          font-size: 14px; font-weight: 600;
          color: var(--primary-text-color);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .entry .meta {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        .entry .numbers { text-align: right; flex-shrink: 0; }
        .entry .val { font-size: 14px; font-weight: 700; color: var(--primary-text-color); }
        .entry .gain { font-size: 12px; font-weight: 600; }
        .row-actions {
          display: flex; opacity: 0.35; transition: opacity 0.15s;
        }
        .row-actions .icon-btn { padding: 6px; }
        .row-actions .icon-btn svg { width: 17px; height: 17px; }

        .empty {
          text-align: center; padding: 24px 16px;
          color: var(--secondary-text-color);
        }
        .empty .add-btn { margin-top: 12px; }

        .form { padding: 4px 16px 16px 16px; }
        .form h3 {
          margin: 8px 0 12px 0; font-size: 15px;
          color: var(--primary-text-color);
        }
        .field { margin-bottom: 12px; }
        .field label {
          display: block; font-size: 12px; font-weight: 600;
          color: var(--secondary-text-color); margin-bottom: 4px;
        }
        .field input {
          width: 100%; box-sizing: border-box;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--divider-color, rgba(127,127,127,0.3));
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
        }
        .field input:focus {
          outline: none;
          border-color: ${GOLD};
          box-shadow: 0 0 0 2px rgba(201,162,39,0.25);
        }
        .hint { font-size: 11px; color: var(--secondary-text-color); margin-top: 4px; }
        .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
        .btn {
          border: none; cursor: pointer; font-size: 13px; font-weight: 600;
          padding: 9px 18px; border-radius: 18px;
        }
        .btn.primary { background: linear-gradient(135deg, ${GOLD}, #b08d1e); color: #fff; }
        .btn.primary:disabled { opacity: 0.6; cursor: default; }
        .btn.secondary {
          background: rgba(127,127,127,0.15);
          color: var(--primary-text-color);
        }
        .btn.danger { background: var(--error-color, #c62828); color: #fff; }

        .confirm {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; margin: 4px 8px;
          border-radius: 10px;
          background: rgba(198,40,40,0.1);
          font-size: 13px; color: var(--primary-text-color);
        }
        .confirm .spacer { flex: 1; }
        .error {
          margin: 0 16px 12px 16px; padding: 10px 12px;
          border-radius: 8px;
          background: rgba(198,40,40,0.12);
          color: var(--error-color, #c62828);
          font-size: 13px;
        }
        .warn-unavailable {
          margin: 0 16px 12px 16px; padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255,152,0,0.12);
          color: var(--warning-color, #ff9800);
          font-size: 12px;
        }
      </style>
    `;
  }

  _icon(name) {
    const icons = {
      eye: '<svg viewBox="0 0 24 24"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>',
      eyeOff:
        '<svg viewBox="0 0 24 24"><path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"/></svg>',
      plus: '<svg viewBox="0 0 24 24"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>',
      pencil:
        '<svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>',
      trash:
        '<svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>',
      gold: '<svg viewBox="0 0 24 24"><path d="M5,16L2,20H12L9,16H5M15,16L12,20H22L19,16H15M10,10L7,14H17L14,10H10M12,2L9.5,6H14.5L12,2M6.5,6L4,10H9L11.5,6H6.5M17.5,6H12.5L15,10H20L17.5,6Z"/></svg>',
    };
    return icons[name] || "";
  }

  async _callService(service, data) {
    this._busy = true;
    this._error = null;
    this._render();
    try {
      await this._hass.callService("gold_portfolio", service, data);
      this._formOpen = false;
      this._editingId = null;
      this._confirmDeleteId = null;
      this._lastRenderKey = null; // force re-render on next hass update
      this._busy = false;
      this._render();
    } catch (err) {
      this._busy = false;
      this._error = err && err.message ? err.message : String(err);
      this._render();
    }
  }

  _configEntryId() {
    const state = this._findState();
    return state?.attributes?.config_entry_id;
  }

  _onSave() {
    const root = this.shadowRoot;
    const name = root.getElementById("f-name")?.value?.trim();
    const date = root.getElementById("f-date")?.value;
    const grams = parseFloat(root.getElementById("f-grams")?.value);
    const priceRaw = root.getElementById("f-price")?.value;
    const price = priceRaw ? parseFloat(String(priceRaw).replace(",", ".")) : null;

    if (!date || !grams || isNaN(grams)) {
      this._error = this._t("error_required");
      this._render();
      return;
    }

    const data = { entry_id: this._configEntryId() };
    if (this._editingId) {
      data.portfolio_entry_id = this._editingId;
      data.purchase_date = date;
      data.amount_grams = grams;
      if (name !== undefined) data.name = name;
      if (price !== null && !isNaN(price)) data.purchase_price_eur = price;
      this._callService("update_portfolio_entry", data);
    } else {
      data.purchase_date = date;
      data.amount_grams = grams;
      if (name) data.name = name;
      if (price !== null && !isNaN(price)) data.purchase_price_eur = price;
      this._callService("add_portfolio_entry", data);
    }
  }

  _openForm(entry) {
    this._formOpen = true;
    this._editingId = entry ? entry.entry_id : null;
    this._confirmDeleteId = null;
    this._error = null;
    this._render(entry || null);
  }

  _closeForm() {
    this._formOpen = false;
    this._editingId = null;
    this._error = null;
    this._lastRenderKey = null;
    this._render();
  }

  _renderForm(entry) {
    const t = (k) => this._t(k);
    const today = new Date().toISOString().substring(0, 10);
    const esc = (s) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return `
      <div class="form">
        <h3>${entry ? t("edit") : t("add")}</h3>
        <div class="field">
          <label for="f-name">${t("name")}</label>
          <input id="f-name" type="text" placeholder="${t("name_placeholder")}"
                 value="${esc(entry?.name)}" />
        </div>
        <div class="field">
          <label for="f-date">${t("date")}</label>
          <input id="f-date" type="date" max="${today}"
                 value="${esc(entry?.purchase_date || today)}" />
        </div>
        <div class="field">
          <label for="f-grams">${t("grams")}</label>
          <input id="f-grams" type="number" step="0.01" min="0.01" inputmode="decimal"
                 value="${entry ? esc(entry.amount_grams) : ""}" />
        </div>
        <div class="field">
          <label for="f-price">${t("price")}</label>
          <input id="f-price" type="number" step="0.01" min="0" inputmode="decimal"
                 value="${entry ? esc(entry.purchase_price_eur) : ""}" />
          <div class="hint">${t("price_hint")}</div>
        </div>
        <div class="form-actions">
          <button class="btn secondary" id="btn-cancel">${t("cancel")}</button>
          <button class="btn primary" id="btn-save" ${this._busy ? "disabled" : ""}>
            ${this._busy ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    `;
  }

  _renderEntryRow(entry) {
    const t = (k) => this._t(k);
    const gainCls = (entry.gain_eur ?? 0) >= 0 ? "pos" : "neg";
    const displayName = entry.name || `${t("unnamed")} ${this._fmtDate(entry.purchase_date)}`;
    const initial = (entry.name || "G").charAt(0).toUpperCase();
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");

    if (this._confirmDeleteId === entry.entry_id) {
      return `
        <div class="confirm" data-id="${entry.entry_id}">
          <span>${t("confirm_delete")} <b>${esc(displayName)}</b></span>
          <span class="spacer"></span>
          <button class="btn danger btn-confirm-delete" data-id="${entry.entry_id}">${t("yes_delete")}</button>
          <button class="btn secondary btn-cancel-delete">${t("cancel")}</button>
        </div>
      `;
    }

    return `
      <div class="entry">
        <div class="bullet">${esc(initial)}</div>
        <div class="info">
          <div class="name">${esc(displayName)}</div>
          <div class="meta">
            ${this._fmtDate(entry.purchase_date)} · ${this._fmtGrams(entry.amount_grams)}
            · ${t("purchased_for")} ${this._fmtEur(entry.purchase_price_eur)}
          </div>
        </div>
        <div class="numbers">
          <div class="val">${this._fmtEur(entry.current_value_eur)}</div>
          <div class="gain ${gainCls}">
            ${this._hideValues ? "" : this._fmtEur(entry.gain_eur) + " · "}${this._fmtPercent(entry.gain_percent)}
          </div>
        </div>
        <div class="row-actions">
          <button class="icon-btn btn-edit" data-id="${entry.entry_id}" title="${t("edit")}">${this._icon("pencil")}</button>
          <button class="icon-btn btn-delete" data-id="${entry.entry_id}" title="${t("delete")}">${this._icon("trash")}</button>
        </div>
      </div>
    `;
  }

  _render(editEntry) {
    if (!this.shadowRoot) return;
    const t = (k) => this._t(k);
    const state = this._findState();

    let body;
    if (!this._hass) {
      body = "";
    } else if (!state) {
      body = `<div class="empty">${t("not_found")}</div>`;
    } else {
      const attrs = state.attributes || {};
      const entries = attrs.entries || [];
      const gainCls = (attrs.gain_eur ?? 0) >= 0 ? "pos" : "neg";
      const showEntries = this._config.show_entries !== false;
      const unavailable = state.state === "unavailable";

      const header = `
        <div class="header">
          <div class="icon">${this._icon("gold")}</div>
          <div class="titles">
            <div class="title">${this._config.title || t("title")}</div>
            <div class="subtitle">
              ${t("price_per_gram")}: ${attrs.price_per_gram ? this._fmtEurAlways(attrs.price_per_gram) + "/g" : "–"}
            </div>
          </div>
          <div class="actions">
            <button class="icon-btn" id="btn-toggle-hide" title="€">
              ${this._icon(this._hideValues ? "eyeOff" : "eye")}
            </button>
          </div>
        </div>
      `;

      const stats = `
        <div class="stats">
          <div class="stat">
            <div class="label">${t("total_grams")}</div>
            <div class="value">${this._fmtGrams(attrs.total_grams)}</div>
          </div>
          <div class="stat">
            <div class="label">${t("current_value")}</div>
            <div class="value">${this._fmtEur(parseFloat(state.state))}</div>
            <div class="sub">${t("invested")}: ${this._fmtEur(attrs.total_investment_eur)}</div>
          </div>
          <div class="stat">
            <div class="label">${t("gain")}</div>
            <div class="value ${gainCls}">${this._fmtPercent(attrs.gain_percent)}</div>
            <div class="sub ${gainCls}">${this._hideValues ? "•••••" : this._fmtEur(attrs.gain_eur)}</div>
          </div>
        </div>
      `;

      let entriesHtml = "";
      if (this._formOpen) {
        const entry = editEntry
          ? editEntry
          : this._editingId
            ? entries.find((e) => e.entry_id === this._editingId)
            : null;
        entriesHtml = this._renderForm(entry);
      } else if (showEntries) {
        if (entries.length === 0) {
          entriesHtml = `
            <div class="empty">
              ${t("no_entries")}<br>
              <button class="add-btn" id="btn-add">${this._icon("plus")} ${t("add_first")}</button>
            </div>
          `;
        } else {
          entriesHtml = `
            <div class="section-title">
              <span>${t("entries")} (${entries.length})</span>
              <button class="add-btn" id="btn-add">${this._icon("plus")} ${t("add")}</button>
            </div>
            <div class="entries">
              ${entries.map((e) => this._renderEntryRow(e)).join("")}
            </div>
          `;
        }
      }

      body = `
        ${header}
        ${unavailable ? `<div class="warn-unavailable">⚠︎ ${state.entity_id}: unavailable</div>` : ""}
        ${stats}
        ${this._error ? `<div class="error">${this._error}</div>` : ""}
        ${entriesHtml}
      `;
    }

    this.shadowRoot.innerHTML = `${this._styles()}<ha-card>${body}</ha-card>`;
    this._attachListeners();
  }

  _fmtEurAlways(value) {
    // Gold price is public info; never masked by the privacy toggle.
    if (value === null || value === undefined || isNaN(value)) return "–";
    return new Intl.NumberFormat(this._lang === "de" ? "de-DE" : "en-US", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }

  _attachListeners() {
    const root = this.shadowRoot;
    const state = this._findState();
    const entries = state?.attributes?.entries || [];

    root.getElementById("btn-toggle-hide")?.addEventListener("click", () => {
      this._hideValues = !this._hideValues;
      window.localStorage.setItem("gold-portfolio-hide", this._hideValues ? "1" : "0");
      this._lastRenderKey = null;
      this._render();
    });

    root.getElementById("btn-add")?.addEventListener("click", () => this._openForm(null));
    root.getElementById("btn-save")?.addEventListener("click", () => this._onSave());
    root.getElementById("btn-cancel")?.addEventListener("click", () => this._closeForm());

    root.querySelectorAll(".btn-edit").forEach((btn) =>
      btn.addEventListener("click", () => {
        const entry = entries.find((e) => e.entry_id === btn.dataset.id);
        if (entry) this._openForm(entry);
      })
    );
    root.querySelectorAll(".btn-delete").forEach((btn) =>
      btn.addEventListener("click", () => {
        this._confirmDeleteId = btn.dataset.id;
        this._render();
      })
    );
    root.querySelectorAll(".btn-confirm-delete").forEach((btn) =>
      btn.addEventListener("click", () =>
        this._callService("remove_portfolio_entry", {
          entry_id: this._configEntryId(),
          portfolio_entry_id: btn.dataset.id,
        })
      )
    );
    root.querySelectorAll(".btn-cancel-delete").forEach((btn) =>
      btn.addEventListener("click", () => {
        this._confirmDeleteId = null;
        this._lastRenderKey = null;
        this._render();
      })
    );
  }

  getCardSize() {
    const state = this._findState();
    const entries = state?.attributes?.entries?.length || 0;
    return 3 + Math.ceil(entries / 2);
  }

  static getConfigElement() {
    return document.createElement("gold-portfolio-card-editor");
  }

  static getStubConfig() {
    return {};
  }
}

class GoldPortfolioCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _render() {
    const lang = (this._hass?.locale?.language || "de").substring(0, 2);
    const de = lang === "de";
    this.shadowRoot.innerHTML = `
      <style>
        .field { margin: 12px 0; }
        label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;
                color: var(--secondary-text-color); }
        input[type="text"] {
          width: 100%; box-sizing: border-box; padding: 10px 12px;
          border-radius: 8px; font-size: 14px;
          border: 1px solid var(--divider-color, rgba(127,127,127,0.3));
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        .check { display: flex; align-items: center; gap: 8px;
                 color: var(--primary-text-color); font-size: 14px; }
        .note { font-size: 12px; color: var(--secondary-text-color); margin-top: 16px; }
      </style>
      <div class="field">
        <label>${de ? "Titel (optional)" : "Title (optional)"}</label>
        <input type="text" id="e-title" value="${this._config.title || ""}" />
      </div>
      <div class="field check">
        <input type="checkbox" id="e-entries" ${this._config.show_entries !== false ? "checked" : ""} />
        <label for="e-entries" style="margin:0">${de ? "Einzelne Käufe anzeigen" : "Show individual purchases"}</label>
      </div>
      <div class="note">
        ${de
          ? "Die Karte findet die Gold-Portfolio-Integration automatisch – keine weitere Konfiguration nötig."
          : "The card finds the Gold Portfolio integration automatically – no further configuration needed."}
      </div>
    `;

    this.shadowRoot.getElementById("e-title").addEventListener("change", (e) => {
      this._config.title = e.target.value || undefined;
      this._fire();
    });
    this.shadowRoot.getElementById("e-entries").addEventListener("change", (e) => {
      this._config.show_entries = e.target.checked;
      this._fire();
    });
  }

  _fire() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

if (!customElements.get("gold-portfolio-card")) {
  customElements.define("gold-portfolio-card", GoldPortfolioCard);
}
if (!customElements.get("gold-portfolio-card-editor")) {
  customElements.define("gold-portfolio-card-editor", GoldPortfolioCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "gold-portfolio-card")) {
  window.customCards.push({
    type: "gold-portfolio-card",
    name: "Gold Portfolio Card",
    description:
      "Interaktive Übersicht deines Gold-Portfolios mit Verwaltung der Käufe direkt in der Karte.",
    preview: true,
  });
}

console.info(
  "%c GOLD-PORTFOLIO-CARD %c v2.0.0 ",
  `background:${GOLD};color:#fff;font-weight:bold;border-radius:4px 0 0 4px;`,
  "background:#444;color:#fff;border-radius:0 4px 4px 0;"
);
