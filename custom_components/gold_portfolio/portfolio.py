"""Portfolio management for Gold Portfolio Tracker."""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import LEGACY_STORAGE_FILE, STORAGE_KEY, STORAGE_VERSION

_LOGGER = logging.getLogger(__name__)


class PortfolioManager:
    """Manage the gold portfolio entries (async, backed by HA storage)."""

    def __init__(self, hass: HomeAssistant):
        """Initialize portfolio manager."""
        self._hass = hass
        self._store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._entries: List[Dict[str, Any]] = []

    async def async_load(self) -> None:
        """Load entries from storage, migrating the legacy file if needed."""
        data = await self._store.async_load()
        if data is None:
            data = await self._async_migrate_legacy()
        self._entries = (data or {}).get("entries", [])
        _LOGGER.debug("Loaded %d portfolio entries", len(self._entries))

    async def _async_migrate_legacy(self) -> Optional[Dict[str, Any]]:
        """Migrate entries from the old raw JSON file, if present."""
        legacy_path = Path(self._hass.config.path(".storage", LEGACY_STORAGE_FILE))

        def _read() -> Optional[Dict[str, Any]]:
            if not legacy_path.exists():
                return None
            try:
                with open(legacy_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (OSError, json.JSONDecodeError) as err:
                _LOGGER.error("Could not read legacy portfolio file: %s", err)
                return None

        data = await self._hass.async_add_executor_job(_read)
        if data is not None:
            _LOGGER.info(
                "Migrated %d portfolio entries from legacy storage",
                len(data.get("entries", [])),
            )
            await self._store.async_save(data)
        return data

    async def _async_save(self) -> None:
        """Save entries to storage."""
        await self._store.async_save({"entries": self._entries})
        _LOGGER.debug("Saved %d portfolio entries", len(self._entries))

    async def async_add_entry(
        self,
        purchase_date: str,
        amount_grams: float,
        purchase_price_eur: Optional[float] = None,
        purchase_price_per_gram: Optional[float] = None,
        name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Add a new portfolio entry."""
        entry_id = str(int(datetime.now().timestamp() * 1000))

        if purchase_price_per_gram is not None and purchase_price_eur is None:
            purchase_price_eur = purchase_price_per_gram * amount_grams

        entry = {
            "id": entry_id,
            "name": (name or "").strip() or None,
            "purchase_date": purchase_date,
            "amount_grams": float(amount_grams),
            "purchase_price_eur": float(purchase_price_eur or 0),
            "created_at": datetime.now().isoformat(),
        }

        self._entries.append(entry)
        await self._async_save()
        _LOGGER.debug("Added portfolio entry: %s", entry_id)
        return entry

    async def async_update_entry(
        self,
        entry_id: str,
        purchase_date: Optional[str] = None,
        amount_grams: Optional[float] = None,
        purchase_price_eur: Optional[float] = None,
        name: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update a portfolio entry."""
        for entry in self._entries:
            if entry["id"] == entry_id:
                if purchase_date is not None:
                    entry["purchase_date"] = purchase_date
                if amount_grams is not None:
                    entry["amount_grams"] = float(amount_grams)
                if purchase_price_eur is not None:
                    entry["purchase_price_eur"] = float(purchase_price_eur)
                if name is not None:
                    entry["name"] = name.strip() or None

                await self._async_save()
                _LOGGER.debug("Updated portfolio entry: %s", entry_id)
                return entry

        _LOGGER.warning("Portfolio entry not found: %s", entry_id)
        return None

    async def async_remove_entry(self, entry_id: str) -> bool:
        """Remove a portfolio entry."""
        for i, entry in enumerate(self._entries):
            if entry["id"] == entry_id:
                self._entries.pop(i)
                await self._async_save()
                _LOGGER.debug("Removed portfolio entry: %s", entry_id)
                return True

        _LOGGER.warning("Portfolio entry not found: %s", entry_id)
        return False

    def get_entries(self) -> List[Dict[str, Any]]:
        """Get all portfolio entries."""
        return [entry.copy() for entry in self._entries]

    def get_entry(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific portfolio entry."""
        for entry in self._entries:
            if entry["id"] == entry_id:
                return entry.copy()
        return None

    def get_total_grams(self) -> float:
        """Get total grams across all entries."""
        return sum(entry["amount_grams"] for entry in self._entries)

    def get_total_investment(self) -> float:
        """Get total investment in EUR."""
        return sum(entry["purchase_price_eur"] for entry in self._entries)

    def calculate_entry_value(
        self, entry_id: str, current_price_per_gram: float
    ) -> Optional[Dict[str, Any]]:
        """Calculate current value and gain for an entry."""
        entry = self.get_entry(entry_id)
        if not entry:
            return None

        current_value = entry["amount_grams"] * current_price_per_gram
        gain_eur = current_value - entry["purchase_price_eur"]
        gain_percent = (
            (gain_eur / entry["purchase_price_eur"] * 100)
            if entry["purchase_price_eur"] > 0
            else 0
        )

        return {
            "entry_id": entry_id,
            "name": entry.get("name"),
            "amount_grams": entry["amount_grams"],
            "purchase_date": entry["purchase_date"],
            "purchase_price_eur": entry["purchase_price_eur"],
            "current_price_per_gram": current_price_per_gram,
            "current_value_eur": round(current_value, 2),
            "gain_eur": round(gain_eur, 2),
            "gain_percent": round(gain_percent, 2),
        }

    def calculate_portfolio_value(self, current_price_per_gram: float) -> Dict[str, Any]:
        """Calculate total portfolio value and gain."""
        total_grams = self.get_total_grams()
        total_investment = self.get_total_investment()
        current_value = total_grams * current_price_per_gram
        gain_eur = current_value - total_investment
        gain_percent = (gain_eur / total_investment * 100) if total_investment > 0 else 0

        return {
            "total_grams": round(total_grams, 2),
            "total_investment_eur": round(total_investment, 2),
            "current_price_per_gram": current_price_per_gram,
            "current_value_eur": round(current_value, 2),
            "gain_eur": round(gain_eur, 2),
            "gain_percent": round(gain_percent, 2),
            "entry_count": len(self._entries),
        }
