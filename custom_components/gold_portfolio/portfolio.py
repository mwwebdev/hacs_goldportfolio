"""Portfolio management for Gold Portfolio Tracker."""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

_LOGGER = logging.getLogger(__name__)


class PortfolioManager:
    """Manage the gold portfolio entries."""

    def __init__(self, config_dir: Path):
        """Initialize portfolio manager."""
        self.config_dir = config_dir
        self.portfolio_file = config_dir / ".storage" / "gold_portfolio_entries.json"
        self.portfolio_file.parent.mkdir(parents=True, exist_ok=True)
        self._entries: List[Dict[str, Any]] = []
        self._load_entries()

    def _load_entries(self) -> None:
        """Load entries from file."""
        try:
            if self.portfolio_file.exists():
                with open(self.portfolio_file, "r") as f:
                    data = json.load(f)
                    self._entries = data.get("entries", [])
                    _LOGGER.debug("Loaded %d portfolio entries", len(self._entries))
        except Exception as err:
            _LOGGER.error("Error loading portfolio entries: %s", err)
            self._entries = []

    def _save_entries(self) -> None:
        """Save entries to file."""
        try:
            with open(self.portfolio_file, "w") as f:
                json.dump({"entries": self._entries}, f, indent=2, default=str)
                _LOGGER.debug("Saved %d portfolio entries", len(self._entries))
        except Exception as err:
            _LOGGER.error("Error saving portfolio entries: %s", err)

    def add_entry(
        self,
        purchase_date: str,
        amount_grams: float,
        purchase_price_eur: Optional[float] = None,
        purchase_price_per_gram: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Add a new portfolio entry."""
        entry_id = str(int(datetime.now().timestamp() * 1000))

        # If per-gram price provided, calculate total price
        if purchase_price_per_gram is not None and purchase_price_eur is None:
            purchase_price_eur = purchase_price_per_gram * amount_grams

        entry = {
            "id": entry_id,
            "purchase_date": purchase_date,
            "amount_grams": float(amount_grams),
            "purchase_price_eur": float(purchase_price_eur or 0),
            "created_at": datetime.now().isoformat(),
        }

        self._entries.append(entry)
        self._save_entries()
        _LOGGER.debug("Added portfolio entry: %s", entry_id)
        return entry

    def update_entry(
        self,
        entry_id: str,
        purchase_date: Optional[str] = None,
        amount_grams: Optional[float] = None,
        purchase_price_eur: Optional[float] = None,
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

                self._save_entries()
                _LOGGER.debug("Updated portfolio entry: %s", entry_id)
                return entry

        _LOGGER.warning("Portfolio entry not found: %s", entry_id)
        return None

    def remove_entry(self, entry_id: str) -> bool:
        """Remove a portfolio entry."""
        for i, entry in enumerate(self._entries):
            if entry["id"] == entry_id:
                self._entries.pop(i)
                self._save_entries()
                _LOGGER.debug("Removed portfolio entry: %s", entry_id)
                return True

        _LOGGER.warning("Portfolio entry not found: %s", entry_id)
        return False

    def get_entries(self) -> List[Dict[str, Any]]:
        """Get all portfolio entries."""
        return self._entries.copy()

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
