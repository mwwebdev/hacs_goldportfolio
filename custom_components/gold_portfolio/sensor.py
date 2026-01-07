"""Sensors for Gold Portfolio Tracker."""
import logging
from datetime import datetime
from typing import Optional

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import (
    CoordinatorEntity,
    DataUpdateCoordinator,
)

from .const import DOMAIN, TROY_OZ_TO_GRAM
from .portfolio import PortfolioManager

_LOGGER = logging.getLogger(__name__)

# Fallback for older Home Assistant versions
try:
    from homeassistant.const import UnitOfPrice
except ImportError:
    UnitOfPrice = None


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensors from a config entry."""
    coordinator = hass.data[DOMAIN][config_entry.entry_id]["coordinator"]
    api_client = hass.data[DOMAIN][config_entry.entry_id]["api_client"]

    portfolio_manager = PortfolioManager(hass.config.path())

    entities = [
        GoldPriceSensor(coordinator, config_entry),
        PortfolioTotalGramsSensor(coordinator, config_entry, portfolio_manager),
        PortfolioTotalValueSensor(coordinator, config_entry, portfolio_manager),
        PortfolioTotalGainSensor(coordinator, config_entry, portfolio_manager),
        PortfolioTotalGainPercentSensor(coordinator, config_entry, portfolio_manager),
    ]

    async_add_entities(entities)

    # Store portfolio manager in hass.data
    if DOMAIN not in hass.data:
        hass.data[DOMAIN] = {}
    hass.data[DOMAIN][config_entry.entry_id]["portfolio_manager"] = portfolio_manager


class GoldPriceSensor(CoordinatorEntity, SensorEntity):
    """Sensor for current gold price in EUR."""

    _attr_name = "Gold Price"
    _attr_unique_id = "gold_portfolio_price"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfPrice.EUR if UnitOfPrice else "€/oz"
    _attr_icon = "mdi:gold"

    def __init__(
        self, coordinator: DataUpdateCoordinator, config_entry: ConfigEntry
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{config_entry.entry_id}_price"
        self._config_entry = config_entry

    @property
    def native_value(self) -> Optional[float]:
        """Return the state of the sensor."""
        if self.coordinator.data:
            return self.coordinator.data.get("price")
        return None

    @property
    def extra_state_attributes(self) -> dict:
        """Return extra state attributes."""
        if self.coordinator.data:
            return {
                "timestamp": self.coordinator.data.get("timestamp"),
                "currency": self.coordinator.data.get("currency"),
            }
        return {}


class PortfolioTotalGramsSensor(CoordinatorEntity, SensorEntity):
    """Sensor for total grams in portfolio."""

    _attr_name = "Portfolio Total Grams"
    _attr_unique_id = "gold_portfolio_total_grams"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "g"
    _attr_icon = "mdi:scale"

    def __init__(
        self,
        coordinator: DataUpdateCoordinator,
        config_entry: ConfigEntry,
        portfolio_manager: PortfolioManager,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{config_entry.entry_id}_total_grams"
        self._config_entry = config_entry
        self._portfolio_manager = portfolio_manager

    @property
    def native_value(self) -> float:
        """Return the state of the sensor."""
        return self._portfolio_manager.get_total_grams()


class PortfolioTotalValueSensor(CoordinatorEntity, SensorEntity):
    """Sensor for total current value of portfolio."""

    _attr_name = "Portfolio Current Value"
    _attr_unique_id = "gold_portfolio_current_value"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfPrice.EUR if UnitOfPrice else "€"
    _attr_icon = "mdi:euro"

    def __init__(
        self,
        coordinator: DataUpdateCoordinator,
        config_entry: ConfigEntry,
        portfolio_manager: PortfolioManager,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{config_entry.entry_id}_current_value"
        self._config_entry = config_entry
        self._portfolio_manager = portfolio_manager

    @property
    def native_value(self) -> Optional[float]:
        """Return the state of the sensor."""
        if self.coordinator.data:
            price_per_gram = self.coordinator.data.get("price", 0) / TROY_OZ_TO_GRAM
            portfolio_value = self._portfolio_manager.calculate_portfolio_value(price_per_gram)
            return portfolio_value.get("current_value_eur")
        return None

    @property
    def extra_state_attributes(self) -> dict:
        """Return extra state attributes."""
        if self.coordinator.data:
            price_per_gram = self.coordinator.data.get("price", 0) / TROY_OZ_TO_GRAM
            portfolio_value = self._portfolio_manager.calculate_portfolio_value(price_per_gram)
            return {
                "total_grams": portfolio_value.get("total_grams"),
                "total_investment_eur": portfolio_value.get("total_investment_eur"),
                "entry_count": portfolio_value.get("entry_count"),
            }
        return {}


class PortfolioTotalGainSensor(CoordinatorEntity, SensorEntity):
    """Sensor for total gain in EUR."""

    _attr_name = "Portfolio Total Gain (EUR)"
    _attr_unique_id = "gold_portfolio_total_gain_eur"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfPrice.EUR if UnitOfPrice else "€"
    _attr_icon = "mdi:cash-multiple"

    def __init__(
        self,
        coordinator: DataUpdateCoordinator,
        config_entry: ConfigEntry,
        portfolio_manager: PortfolioManager,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{config_entry.entry_id}_total_gain_eur"
        self._config_entry = config_entry
        self._portfolio_manager = portfolio_manager

    @property
    def native_value(self) -> Optional[float]:
        """Return the state of the sensor."""
        if self.coordinator.data:
            price_per_gram = self.coordinator.data.get("price", 0) / TROY_OZ_TO_GRAM
            portfolio_value = self._portfolio_manager.calculate_portfolio_value(price_per_gram)
            return portfolio_value.get("gain_eur")
        return None


class PortfolioTotalGainPercentSensor(CoordinatorEntity, SensorEntity):
    """Sensor for total gain in percent."""

    _attr_name = "Portfolio Total Gain (%)"
    _attr_unique_id = "gold_portfolio_total_gain_percent"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "%"
    _attr_icon = "mdi:percent"

    def __init__(
        self,
        coordinator: DataUpdateCoordinator,
        config_entry: ConfigEntry,
        portfolio_manager: PortfolioManager,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{config_entry.entry_id}_total_gain_percent"
        self._config_entry = config_entry
        self._portfolio_manager = portfolio_manager

    @property
    def native_value(self) -> Optional[float]:
        """Return the state of the sensor."""
        if self.coordinator.data:
            price_per_gram = self.coordinator.data.get("price", 0) / TROY_OZ_TO_GRAM
            portfolio_value = self._portfolio_manager.calculate_portfolio_value(price_per_gram)
            return portfolio_value.get("gain_percent")
        return None
