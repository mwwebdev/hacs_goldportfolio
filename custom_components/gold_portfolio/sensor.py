"""Sensors for Gold Portfolio Tracker."""
import logging
import re
from typing import Any, Dict, List, Optional

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import (
    CoordinatorEntity,
    DataUpdateCoordinator,
)

from .const import DOMAIN, NAME, SIGNAL_PORTFOLIO_UPDATED, TROY_OZ_TO_GRAM, VERSION
from .portfolio import PortfolioManager

_LOGGER = logging.getLogger(__name__)

# unique_id patterns of per-entry sensors (current and legacy/broken variants)
ENTRY_UNIQUE_ID_RE = re.compile(
    r"^portfolio_entry_(?P<pid>\d+)_(grams|current_value|gain_eur|gain_percent)$"
)
LEGACY_ENTRY_UNIQUE_ID_RE = re.compile(
    r"^.+_entry_(?P<pid>\d+)_(grams|value|eur|percent)$"
)

ENTRY_SENSOR_SUFFIXES = ("grams", "current_value", "gain_eur", "gain_percent")


def _device_info(config_entry: ConfigEntry) -> DeviceInfo:
    """Group all sensors under one device."""
    return DeviceInfo(
        identifiers={(DOMAIN, config_entry.entry_id)},
        name=NAME,
        manufacturer="goldapi.io",
        model="Gold Portfolio",
        sw_version=VERSION,
        entry_type=DeviceEntryType.SERVICE,
    )


@callback
def _cleanup_stale_registry_entries(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    portfolio_manager: PortfolioManager,
) -> None:
    """Remove orphaned registry entities.

    Older versions registered per-entry sensors at runtime with unique_ids that
    did not match the ones created on restart, leaving permanently-unavailable
    ghost entities behind. Also removes sensors for deleted portfolio entries.
    """
    registry = er.async_get(hass)
    valid_ids = {entry["id"] for entry in portfolio_manager.get_entries()}

    for reg_entry in list(er.async_entries_for_config_entry(registry, config_entry.entry_id)):
        unique_id = reg_entry.unique_id or ""
        match = ENTRY_UNIQUE_ID_RE.match(unique_id)
        if match:
            if match.group("pid") not in valid_ids:
                _LOGGER.info("Removing stale entity %s", reg_entry.entity_id)
                registry.async_remove(reg_entry.entity_id)
            continue
        legacy_match = LEGACY_ENTRY_UNIQUE_ID_RE.match(unique_id)
        if legacy_match:
            # Legacy runtime-registered ghosts are always replaced by the
            # canonical unique_id pattern above.
            _LOGGER.info("Removing legacy ghost entity %s", reg_entry.entity_id)
            registry.async_remove(reg_entry.entity_id)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensors from a config entry."""
    data = hass.data[DOMAIN][config_entry.entry_id]
    coordinator: DataUpdateCoordinator = data["coordinator"]
    portfolio_manager: PortfolioManager = data["portfolio_manager"]

    _cleanup_stale_registry_entries(hass, config_entry, portfolio_manager)

    entities: List[SensorEntity] = [
        GoldPriceSensor(coordinator, config_entry),
        PortfolioTotalGramsSensor(coordinator, config_entry, portfolio_manager),
        PortfolioTotalValueSensor(coordinator, config_entry, portfolio_manager),
        PortfolioTotalGainSensor(coordinator, config_entry, portfolio_manager),
        PortfolioTotalGainPercentSensor(coordinator, config_entry, portfolio_manager),
    ]

    known_entry_ids: set = set()

    def _entry_sensors(entry_id: str) -> List[SensorEntity]:
        return [
            PortfolioEntryGramsSensor(coordinator, config_entry, portfolio_manager, entry_id),
            PortfolioEntryValueSensor(coordinator, config_entry, portfolio_manager, entry_id),
            PortfolioEntryGainSensor(coordinator, config_entry, portfolio_manager, entry_id),
            PortfolioEntryGainPercentSensor(coordinator, config_entry, portfolio_manager, entry_id),
        ]

    for entry in portfolio_manager.get_entries():
        known_entry_ids.add(entry["id"])
        entities.extend(_entry_sensors(entry["id"]))

    async_add_entities(entities)

    @callback
    def _handle_portfolio_update() -> None:
        """Add sensors for new entries, remove sensors of deleted entries."""
        current_ids = {entry["id"] for entry in portfolio_manager.get_entries()}

        new_entities: List[SensorEntity] = []
        for entry_id in current_ids - known_entry_ids:
            new_entities.extend(_entry_sensors(entry_id))
            known_entry_ids.add(entry_id)
        if new_entities:
            async_add_entities(new_entities)

        removed = known_entry_ids - current_ids
        if removed:
            registry = er.async_get(hass)
            for entry_id in removed:
                known_entry_ids.discard(entry_id)
                for suffix in ENTRY_SENSOR_SUFFIXES:
                    unique_id = f"portfolio_entry_{entry_id}_{suffix}"
                    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
                    if entity_id:
                        registry.async_remove(entity_id)

    config_entry.async_on_unload(
        async_dispatcher_connect(
            hass,
            SIGNAL_PORTFOLIO_UPDATED.format(config_entry.entry_id),
            _handle_portfolio_update,
        )
    )


class GoldPortfolioBaseSensor(CoordinatorEntity, SensorEntity):
    """Base class: coordinator entity that also refreshes on portfolio changes."""

    _attr_should_poll = False

    def __init__(
        self, coordinator: DataUpdateCoordinator, config_entry: ConfigEntry
    ) -> None:
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_device_info = _device_info(config_entry)

    async def async_added_to_hass(self) -> None:
        """Also update immediately when the portfolio changes."""
        await super().async_added_to_hass()
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                SIGNAL_PORTFOLIO_UPDATED.format(self._config_entry.entry_id),
                self._handle_portfolio_updated,
            )
        )

    @callback
    def _handle_portfolio_updated(self) -> None:
        self.async_write_ha_state()

    @property
    def available(self) -> bool:
        """Stay available as long as we have (possibly stale) price data."""
        return self.coordinator.data is not None

    def _price_per_gram(self) -> Optional[float]:
        if not self.coordinator.data:
            return None
        price = self.coordinator.data.get("price")
        if not price:
            return None
        return price / TROY_OZ_TO_GRAM


class GoldPriceSensor(GoldPortfolioBaseSensor):
    """Sensor for current gold price in EUR per troy ounce."""

    _attr_name = "Gold Price"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "€/oz"
    _attr_icon = "mdi:gold"

    def __init__(self, coordinator, config_entry) -> None:
        super().__init__(coordinator, config_entry)
        self._attr_unique_id = f"{config_entry.entry_id}_price"

    @property
    def native_value(self) -> Optional[float]:
        if self.coordinator.data:
            return self.coordinator.data.get("price")
        return None

    @property
    def extra_state_attributes(self) -> dict:
        if self.coordinator.data:
            price_per_gram = self._price_per_gram()
            return {
                "timestamp": self.coordinator.data.get("timestamp"),
                "currency": self.coordinator.data.get("currency"),
                "price_per_gram": round(price_per_gram, 2) if price_per_gram else None,
            }
        return {}


class PortfolioTotalGramsSensor(GoldPortfolioBaseSensor):
    """Sensor for total grams in portfolio."""

    _attr_name = "Portfolio Total Grams"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "g"
    _attr_icon = "mdi:scale"

    def __init__(self, coordinator, config_entry, portfolio_manager: PortfolioManager) -> None:
        super().__init__(coordinator, config_entry)
        self._attr_unique_id = f"{config_entry.entry_id}_total_grams"
        self._portfolio_manager = portfolio_manager

    @property
    def available(self) -> bool:
        return True  # does not depend on the API

    @property
    def native_value(self) -> float:
        return round(self._portfolio_manager.get_total_grams(), 3)


class PortfolioTotalValueSensor(GoldPortfolioBaseSensor):
    """Sensor for total current value of portfolio.

    This is also the data source for the dashboard card: its attributes carry
    the full portfolio (all entries incl. per-entry valuation) so the card
    needs zero configuration.
    """

    _attr_name = "Portfolio Current Value"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "€"
    _attr_icon = "mdi:euro"

    def __init__(self, coordinator, config_entry, portfolio_manager: PortfolioManager) -> None:
        super().__init__(coordinator, config_entry)
        self._attr_unique_id = f"{config_entry.entry_id}_current_value"
        self._portfolio_manager = portfolio_manager

    @property
    def native_value(self) -> Optional[float]:
        price_per_gram = self._price_per_gram()
        if price_per_gram is None:
            return None
        return self._portfolio_manager.calculate_portfolio_value(price_per_gram).get(
            "current_value_eur"
        )

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        price_per_gram = self._price_per_gram() or 0.0
        portfolio_value = self._portfolio_manager.calculate_portfolio_value(price_per_gram)

        entries: List[Dict[str, Any]] = []
        for entry in self._portfolio_manager.get_entries():
            value = self._portfolio_manager.calculate_entry_value(
                entry["id"], price_per_gram
            )
            if value:
                entries.append(value)

        return {
            "integration": DOMAIN,
            "config_entry_id": self._config_entry.entry_id,
            "price_per_gram": round(price_per_gram, 2),
            "price_timestamp": (self.coordinator.data or {}).get("timestamp"),
            "total_grams": portfolio_value.get("total_grams"),
            "total_investment_eur": portfolio_value.get("total_investment_eur"),
            "gain_eur": portfolio_value.get("gain_eur"),
            "gain_percent": portfolio_value.get("gain_percent"),
            "entry_count": portfolio_value.get("entry_count"),
            "entries": entries,
        }


class PortfolioTotalGainSensor(GoldPortfolioBaseSensor):
    """Sensor for total gain in EUR."""

    _attr_name = "Portfolio Total Gain (EUR)"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "€"
    _attr_icon = "mdi:cash-multiple"

    def __init__(self, coordinator, config_entry, portfolio_manager: PortfolioManager) -> None:
        super().__init__(coordinator, config_entry)
        self._attr_unique_id = f"{config_entry.entry_id}_total_gain_eur"
        self._portfolio_manager = portfolio_manager

    @property
    def native_value(self) -> Optional[float]:
        price_per_gram = self._price_per_gram()
        if price_per_gram is None:
            return None
        return self._portfolio_manager.calculate_portfolio_value(price_per_gram).get("gain_eur")


class PortfolioTotalGainPercentSensor(GoldPortfolioBaseSensor):
    """Sensor for total gain in percent."""

    _attr_name = "Portfolio Total Gain (%)"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "%"
    _attr_icon = "mdi:percent"

    def __init__(self, coordinator, config_entry, portfolio_manager: PortfolioManager) -> None:
        super().__init__(coordinator, config_entry)
        self._attr_unique_id = f"{config_entry.entry_id}_total_gain_percent"
        self._portfolio_manager = portfolio_manager

    @property
    def native_value(self) -> Optional[float]:
        price_per_gram = self._price_per_gram()
        if price_per_gram is None:
            return None
        return self._portfolio_manager.calculate_portfolio_value(price_per_gram).get("gain_percent")


class PortfolioEntryBaseSensor(GoldPortfolioBaseSensor):
    """Base class for per-entry sensors."""

    def __init__(
        self,
        coordinator: DataUpdateCoordinator,
        config_entry: ConfigEntry,
        portfolio_manager: PortfolioManager,
        entry_id: str,
    ) -> None:
        super().__init__(coordinator, config_entry)
        self._entry_id = entry_id
        self._portfolio_manager = portfolio_manager

    def _entry(self) -> Optional[Dict[str, Any]]:
        return self._portfolio_manager.get_entry(self._entry_id)

    def _display_name(self) -> str:
        entry = self._entry()
        if entry and entry.get("name"):
            return entry["name"]
        return f"Eintrag {self._entry_id}"

    def _entry_value(self) -> Optional[Dict[str, Any]]:
        price_per_gram = self._price_per_gram()
        if price_per_gram is None:
            return None
        return self._portfolio_manager.calculate_entry_value(self._entry_id, price_per_gram)


class PortfolioEntryGramsSensor(PortfolioEntryBaseSensor):
    """Sensor for grams of a specific portfolio entry."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "g"
    _attr_icon = "mdi:scale"

    def __init__(self, coordinator, config_entry, portfolio_manager, entry_id) -> None:
        super().__init__(coordinator, config_entry, portfolio_manager, entry_id)
        self._attr_unique_id = f"portfolio_entry_{entry_id}_grams"

    @property
    def name(self) -> str:
        return f"Gold {self._display_name()} Menge"

    @property
    def available(self) -> bool:
        return self._entry() is not None

    @property
    def native_value(self) -> Optional[float]:
        entry = self._entry()
        return entry.get("amount_grams") if entry else None


class PortfolioEntryValueSensor(PortfolioEntryBaseSensor):
    """Sensor for current value of a specific portfolio entry."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "€"
    _attr_icon = "mdi:euro"

    def __init__(self, coordinator, config_entry, portfolio_manager, entry_id) -> None:
        super().__init__(coordinator, config_entry, portfolio_manager, entry_id)
        self._attr_unique_id = f"portfolio_entry_{entry_id}_current_value"

    @property
    def name(self) -> str:
        return f"Gold {self._display_name()} Wert"

    @property
    def native_value(self) -> Optional[float]:
        value = self._entry_value()
        return value.get("current_value_eur") if value else None

    @property
    def extra_state_attributes(self) -> dict:
        entry = self._entry()
        if not entry:
            return {}
        return {
            "portfolio_entry_id": self._entry_id,
            "name": entry.get("name"),
            "purchase_date": entry.get("purchase_date"),
            "purchase_price_eur": entry.get("purchase_price_eur"),
            "amount_grams": entry.get("amount_grams"),
        }


class PortfolioEntryGainSensor(PortfolioEntryBaseSensor):
    """Sensor for gain (EUR) of a specific portfolio entry."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "€"
    _attr_icon = "mdi:cash-multiple"

    def __init__(self, coordinator, config_entry, portfolio_manager, entry_id) -> None:
        super().__init__(coordinator, config_entry, portfolio_manager, entry_id)
        self._attr_unique_id = f"portfolio_entry_{entry_id}_gain_eur"

    @property
    def name(self) -> str:
        return f"Gold {self._display_name()} Gewinn"

    @property
    def native_value(self) -> Optional[float]:
        value = self._entry_value()
        return value.get("gain_eur") if value else None


class PortfolioEntryGainPercentSensor(PortfolioEntryBaseSensor):
    """Sensor for gain (%) of a specific portfolio entry."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "%"
    _attr_icon = "mdi:percent"

    def __init__(self, coordinator, config_entry, portfolio_manager, entry_id) -> None:
        super().__init__(coordinator, config_entry, portfolio_manager, entry_id)
        self._attr_unique_id = f"portfolio_entry_{entry_id}_gain_percent"

    @property
    def name(self) -> str:
        return f"Gold {self._display_name()} Gewinn Prozent"

    @property
    def native_value(self) -> Optional[float]:
        value = self._entry_value()
        return value.get("gain_percent") if value else None
