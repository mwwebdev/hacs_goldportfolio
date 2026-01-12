"""Services for Gold Portfolio Tracker."""
import logging
from datetime import datetime
from typing import Any, Dict

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers.service import async_register_admin_service
from homeassistant.core import SupportsResponse
from homeassistant.helpers.entity_platform import async_get_platforms

from .api import GoldAPIClient
from .const import (
    CONF_API_KEY,
    DOMAIN,
    SERVICE_ADD_PORTFOLIO_ENTRY,
    SERVICE_GET_HISTORICAL_PRICE,
    SERVICE_GET_PORTFOLIO_ENTRIES,
    SERVICE_REMOVE_PORTFOLIO_ENTRY,
    SERVICE_UPDATE_PORTFOLIO_ENTRY,
)
from .portfolio import PortfolioManager

_LOGGER = logging.getLogger(__name__)


async def _register_entry_sensors(hass: HomeAssistant, config_entry_id: str, portfolio_entry_id: str) -> None:
    """Register new sensors for a portfolio entry."""
    try:
        from .sensor import (
            PortfolioEntryGramsSensor,
            PortfolioEntryValueSensor,
            PortfolioEntryGainSensor,
            PortfolioEntryGainPercentSensor,
        )
        
        # Get the config entry and coordinator
        coordinator = hass.data[DOMAIN][config_entry_id]["coordinator"]
        portfolio_manager = hass.data[DOMAIN][config_entry_id]["portfolio_manager"]
        
        # Create new sensor entities
        sensors = [
            PortfolioEntryGramsSensor(coordinator, None, portfolio_manager, portfolio_entry_id),
            PortfolioEntryValueSensor(coordinator, None, portfolio_manager, portfolio_entry_id),
            PortfolioEntryGainSensor(coordinator, None, portfolio_manager, portfolio_entry_id),
            PortfolioEntryGainPercentSensor(coordinator, None, portfolio_manager, portfolio_entry_id),
        ]
        
        # Override unique_id for new sensors
        from homeassistant.config_entries import ConfigEntry
        config_entry = hass.config_entries.async_get_entry(config_entry_id)
        
        if config_entry:
            for sensor in sensors:
                sensor._config_entry = config_entry
                sensor._attr_unique_id = f"{config_entry_id}_entry_{portfolio_entry_id}_{sensor._attr_unique_id.split('_')[-1]}"
        
        # Get the platform
        from homeassistant.const import Platform
        platforms = async_get_platforms(hass, DOMAIN)
        
        if platforms:
            for platform in platforms:
                if platform.domain == "sensor":
                    await platform.async_add_entities(sensors)
                    _LOGGER.debug(f"Registered sensors for entry {portfolio_entry_id}")
                    return
    except Exception as err:
        _LOGGER.warning(f"Could not register new entry sensors: {err}")


async def async_setup_services(hass: HomeAssistant) -> None:
    """Set up services for Gold Portfolio."""

    async def add_portfolio_entry(call: ServiceCall) -> None:
        """Add a new portfolio entry."""
        entry_id = call.data.get("entry_id")
        if entry_id not in hass.data[DOMAIN]:
            _LOGGER.error("Config entry not found: %s", entry_id)
            return

        portfolio_manager = hass.data[DOMAIN][entry_id].get("portfolio_manager")
        if not portfolio_manager:
            _LOGGER.error("Portfolio manager not found for entry: %s", entry_id)
            return

        try:
            purchase_date = call.data.get("purchase_date")
            amount_grams = call.data.get("amount_grams")
            purchase_price_eur = call.data.get("purchase_price_eur")
            purchase_price_per_gram = call.data.get("purchase_price_per_gram")

            # If neither price is provided, try to fetch historical price
            if purchase_price_eur is None and purchase_price_per_gram is None:
                api_client = hass.data[DOMAIN][entry_id]["api_client"]
                coordinator = hass.data[DOMAIN][entry_id]["coordinator"]

                if coordinator.data:
                    # Use current price as fallback
                    price_per_gram = coordinator.data.get("price", 0) / 31.1035
                    purchase_price_eur = amount_grams * price_per_gram
                    _LOGGER.warning(
                        "No purchase price provided, using current price as fallback: %s EUR",
                        purchase_price_eur,
                    )

            entry = portfolio_manager.add_entry(
                purchase_date=purchase_date,
                amount_grams=amount_grams,
                purchase_price_eur=purchase_price_eur,
                purchase_price_per_gram=purchase_price_per_gram,
            )
            _LOGGER.info("Added portfolio entry: %s", entry.get("id"))
            
            # Register new sensors for this entry
            await _register_entry_sensors(hass, entry_id, entry.get("id"))
        except Exception as err:
            _LOGGER.error("Error adding portfolio entry: %s", err)

    async def remove_portfolio_entry(call: ServiceCall) -> None:
        """Remove a portfolio entry."""
        entry_id = call.data.get("entry_id")
        portfolio_entry_id = call.data.get("portfolio_entry_id")

        if entry_id not in hass.data[DOMAIN]:
            _LOGGER.error("Config entry not found: %s", entry_id)
            return

        portfolio_manager = hass.data[DOMAIN][entry_id].get("portfolio_manager")
        if not portfolio_manager:
            _LOGGER.error("Portfolio manager not found for entry: %s", entry_id)
            return

        try:
            if portfolio_manager.remove_entry(portfolio_entry_id):
                _LOGGER.info("Removed portfolio entry: %s", portfolio_entry_id)
            else:
                _LOGGER.warning("Portfolio entry not found: %s", portfolio_entry_id)
        except Exception as err:
            _LOGGER.error("Error removing portfolio entry: %s", err)

    async def update_portfolio_entry(call: ServiceCall) -> None:
        """Update a portfolio entry."""
        entry_id = call.data.get("entry_id")
        portfolio_entry_id = call.data.get("portfolio_entry_id")

        if entry_id not in hass.data[DOMAIN]:
            _LOGGER.error("Config entry not found: %s", entry_id)
            return

        portfolio_manager = hass.data[DOMAIN][entry_id].get("portfolio_manager")
        if not portfolio_manager:
            _LOGGER.error("Portfolio manager not found for entry: %s", entry_id)
            return

        try:
            updated = portfolio_manager.update_entry(
                entry_id=portfolio_entry_id,
                purchase_date=call.data.get("purchase_date"),
                amount_grams=call.data.get("amount_grams"),
                purchase_price_eur=call.data.get("purchase_price_eur"),
            )
            if updated:
                _LOGGER.info("Updated portfolio entry: %s", portfolio_entry_id)
            else:
                _LOGGER.warning("Portfolio entry not found: %s", portfolio_entry_id)
        except Exception as err:
            _LOGGER.error("Error updating portfolio entry: %s", err)

    async def get_portfolio_entries(call: ServiceCall) -> Dict[str, Any]:
        """Get all portfolio entries."""
        entry_id = call.data.get("entry_id")

        if entry_id not in hass.data[DOMAIN]:
            _LOGGER.error("Config entry not found: %s", entry_id)
            return {"error": "Config entry not found"}

        portfolio_manager = hass.data[DOMAIN][entry_id].get("portfolio_manager")
        if not portfolio_manager:
            _LOGGER.error("Portfolio manager not found for entry: %s", entry_id)
            return {"error": "Portfolio manager not found"}

        entries = portfolio_manager.get_entries()
        _LOGGER.info("Retrieved %d portfolio entries", len(entries))
        return {"entries": entries}

    async def get_historical_price(call: ServiceCall) -> Dict[str, Any]:
        """Get historical gold price for a date."""
        entry_id = call.data.get("entry_id")
        date_str = call.data.get("date")  # Format: YYYY-MM-DD

        if entry_id not in hass.data[DOMAIN]:
            _LOGGER.error("Config entry not found: %s", entry_id)
            return {"error": "Config entry not found"}

        try:
            api_client = hass.data[DOMAIN][entry_id]["api_client"]
            price = await api_client.get_historical_price(date_str)
            if price:
                _LOGGER.info("Historical price for %s: %s EUR", date_str, price)
                return {"date": date_str, "price": price}
            else:
                _LOGGER.warning("Could not retrieve historical price for %s", date_str)
                return {"error": f"Could not retrieve price for {date_str}"}
        except Exception as err:
            _LOGGER.error("Error getting historical price: %s", err)
            return {"error": str(err)}

    # Register services
    async_register_admin_service(
        hass,
        DOMAIN,
        SERVICE_ADD_PORTFOLIO_ENTRY,
        add_portfolio_entry,
        schema=vol.Schema({
            vol.Required("entry_id"): str,
            vol.Required("purchase_date"): str,
            vol.Required("amount_grams"): vol.All(vol.Coerce(float), vol.Range(min=0.01)),
            vol.Optional("purchase_price_eur"): vol.All(vol.Coerce(float), vol.Range(min=0)),
            vol.Optional("purchase_price_per_gram"): vol.All(vol.Coerce(float), vol.Range(min=0)),
        }),
    )

    async_register_admin_service(
        hass,
        DOMAIN,
        SERVICE_REMOVE_PORTFOLIO_ENTRY,
        remove_portfolio_entry,
        schema=vol.Schema({
            vol.Required("entry_id"): str,
            vol.Required("portfolio_entry_id"): str,
        }),
    )

    async_register_admin_service(
        hass,
        DOMAIN,
        SERVICE_UPDATE_PORTFOLIO_ENTRY,
        update_portfolio_entry,
        schema=vol.Schema({
            vol.Required("entry_id"): str,
            vol.Required("portfolio_entry_id"): str,
            vol.Optional("purchase_date"): str,
            vol.Optional("amount_grams"): vol.All(vol.Coerce(float), vol.Range(min=0.01)),
            vol.Optional("purchase_price_eur"): vol.All(vol.Coerce(float), vol.Range(min=0)),
        }),
    )

    async_register_admin_service(
        hass,
        DOMAIN,
        SERVICE_GET_PORTFOLIO_ENTRIES,
        get_portfolio_entries,
        schema=vol.Schema({
            vol.Required("entry_id"): str,
        }),
        supports_response=SupportsResponse.OPTIONAL,
    )

    async_register_admin_service(
        hass,
        DOMAIN,
        SERVICE_GET_HISTORICAL_PRICE,
        get_historical_price,
        schema=vol.Schema({
            vol.Required("entry_id"): str,
            vol.Required("date"): str,
        }),
        supports_response=SupportsResponse.OPTIONAL,
    )

    _LOGGER.debug("Registered services for Gold Portfolio")
