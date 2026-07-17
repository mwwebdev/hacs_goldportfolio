"""Services for Gold Portfolio Tracker."""
import logging
from typing import Any, Dict, Optional

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.service import async_register_admin_service

from .const import (
    DOMAIN,
    SERVICE_ADD_PORTFOLIO_ENTRY,
    SERVICE_GET_HISTORICAL_PRICE,
    SERVICE_GET_PORTFOLIO_ENTRIES,
    SERVICE_REMOVE_PORTFOLIO_ENTRY,
    SERVICE_UPDATE_PORTFOLIO_ENTRY,
    SIGNAL_PORTFOLIO_UPDATED,
    TROY_OZ_TO_GRAM,
)

_LOGGER = logging.getLogger(__name__)


def _resolve_config_entry(hass: HomeAssistant, call: ServiceCall) -> str:
    """Resolve the config entry id; optional when only one entry exists."""
    entry_id = call.data.get("entry_id")
    domain_data = hass.data.get(DOMAIN, {})
    valid_ids = [
        key for key, value in domain_data.items()
        if isinstance(value, dict) and "portfolio_manager" in value
    ]

    if entry_id:
        if entry_id in valid_ids:
            return entry_id
        raise ServiceValidationError(f"Config entry not found: {entry_id}")

    if len(valid_ids) == 1:
        return valid_ids[0]
    if not valid_ids:
        raise ServiceValidationError("Gold Portfolio integration is not set up")
    raise ServiceValidationError(
        "Multiple Gold Portfolio config entries exist - please provide entry_id"
    )


def _notify_updated(hass: HomeAssistant, config_entry_id: str) -> None:
    """Tell sensors (and the dashboard card) that the portfolio changed."""
    async_dispatcher_send(hass, SIGNAL_PORTFOLIO_UPDATED.format(config_entry_id))


async def async_setup_services(hass: HomeAssistant) -> None:
    """Set up services for Gold Portfolio."""

    async def add_portfolio_entry(call: ServiceCall) -> Optional[Dict[str, Any]]:
        """Add a new portfolio entry."""
        config_entry_id = _resolve_config_entry(hass, call)
        data = hass.data[DOMAIN][config_entry_id]
        portfolio_manager = data["portfolio_manager"]

        purchase_date = call.data["purchase_date"]
        amount_grams = call.data["amount_grams"]
        name = call.data.get("name")
        purchase_price_eur = call.data.get("purchase_price_eur")
        purchase_price_per_gram = call.data.get("purchase_price_per_gram")

        # No price given: look up the historical price for the purchase date,
        # falling back to the current price.
        if purchase_price_eur is None and purchase_price_per_gram is None:
            api_client = data["api_client"]
            historical_price = await api_client.get_historical_price(purchase_date)
            if historical_price:
                purchase_price_eur = amount_grams * (historical_price / TROY_OZ_TO_GRAM)
                _LOGGER.info(
                    "Using historical price for %s: %.2f EUR", purchase_date, purchase_price_eur
                )
            elif data["coordinator"].data:
                price_per_gram = data["coordinator"].data.get("price", 0) / TROY_OZ_TO_GRAM
                purchase_price_eur = amount_grams * price_per_gram
                _LOGGER.warning(
                    "No historical price available, using current price: %.2f EUR",
                    purchase_price_eur,
                )

        entry = await portfolio_manager.async_add_entry(
            purchase_date=purchase_date,
            amount_grams=amount_grams,
            purchase_price_eur=purchase_price_eur,
            purchase_price_per_gram=purchase_price_per_gram,
            name=name,
        )
        _LOGGER.info("Added portfolio entry: %s", entry.get("id"))
        _notify_updated(hass, config_entry_id)

        if call.return_response:
            return {"entry": entry}
        return None

    async def remove_portfolio_entry(call: ServiceCall) -> None:
        """Remove a portfolio entry."""
        config_entry_id = _resolve_config_entry(hass, call)
        portfolio_manager = hass.data[DOMAIN][config_entry_id]["portfolio_manager"]
        portfolio_entry_id = call.data["portfolio_entry_id"]

        if await portfolio_manager.async_remove_entry(portfolio_entry_id):
            _LOGGER.info("Removed portfolio entry: %s", portfolio_entry_id)
            _notify_updated(hass, config_entry_id)
        else:
            raise ServiceValidationError(
                f"Portfolio entry not found: {portfolio_entry_id}"
            )

    async def update_portfolio_entry(call: ServiceCall) -> None:
        """Update a portfolio entry."""
        config_entry_id = _resolve_config_entry(hass, call)
        portfolio_manager = hass.data[DOMAIN][config_entry_id]["portfolio_manager"]
        portfolio_entry_id = call.data["portfolio_entry_id"]

        updated = await portfolio_manager.async_update_entry(
            entry_id=portfolio_entry_id,
            purchase_date=call.data.get("purchase_date"),
            amount_grams=call.data.get("amount_grams"),
            purchase_price_eur=call.data.get("purchase_price_eur"),
            name=call.data.get("name"),
        )
        if updated:
            _LOGGER.info("Updated portfolio entry: %s", portfolio_entry_id)
            _notify_updated(hass, config_entry_id)
        else:
            raise ServiceValidationError(
                f"Portfolio entry not found: {portfolio_entry_id}"
            )

    async def get_portfolio_entries(call: ServiceCall) -> Dict[str, Any]:
        """Get all portfolio entries."""
        config_entry_id = _resolve_config_entry(hass, call)
        portfolio_manager = hass.data[DOMAIN][config_entry_id]["portfolio_manager"]
        entries = portfolio_manager.get_entries()
        return {"entries": entries}

    async def get_historical_price(call: ServiceCall) -> Dict[str, Any]:
        """Get historical gold price for a date."""
        config_entry_id = _resolve_config_entry(hass, call)
        date_str = call.data["date"]
        api_client = hass.data[DOMAIN][config_entry_id]["api_client"]

        price = await api_client.get_historical_price(date_str)
        if price is None:
            raise ServiceValidationError(f"Could not retrieve price for {date_str}")
        return {
            "date": date_str,
            "price": price,
            "price_per_gram": round(price / TROY_OZ_TO_GRAM, 2),
        }

    # Note: hass.services.async_register is used for services with responses;
    # async_register_admin_service does not accept supports_response on all
    # supported HA versions.
    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_PORTFOLIO_ENTRY,
        add_portfolio_entry,
        schema=vol.Schema({
            vol.Optional("entry_id"): str,
            vol.Optional("name"): str,
            vol.Required("purchase_date"): str,
            vol.Required("amount_grams"): vol.All(vol.Coerce(float), vol.Range(min=0.01)),
            vol.Optional("purchase_price_eur"): vol.All(vol.Coerce(float), vol.Range(min=0)),
            vol.Optional("purchase_price_per_gram"): vol.All(vol.Coerce(float), vol.Range(min=0)),
        }),
        supports_response=SupportsResponse.OPTIONAL,
    )

    async_register_admin_service(
        hass,
        DOMAIN,
        SERVICE_REMOVE_PORTFOLIO_ENTRY,
        remove_portfolio_entry,
        schema=vol.Schema({
            vol.Optional("entry_id"): str,
            vol.Required("portfolio_entry_id"): str,
        }),
    )

    async_register_admin_service(
        hass,
        DOMAIN,
        SERVICE_UPDATE_PORTFOLIO_ENTRY,
        update_portfolio_entry,
        schema=vol.Schema({
            vol.Optional("entry_id"): str,
            vol.Required("portfolio_entry_id"): str,
            vol.Optional("name"): str,
            vol.Optional("purchase_date"): str,
            vol.Optional("amount_grams"): vol.All(vol.Coerce(float), vol.Range(min=0.01)),
            vol.Optional("purchase_price_eur"): vol.All(vol.Coerce(float), vol.Range(min=0)),
        }),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_PORTFOLIO_ENTRIES,
        get_portfolio_entries,
        schema=vol.Schema({
            vol.Optional("entry_id"): str,
        }),
        supports_response=SupportsResponse.OPTIONAL,
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_HISTORICAL_PRICE,
        get_historical_price,
        schema=vol.Schema({
            vol.Optional("entry_id"): str,
            vol.Required("date"): str,
        }),
        supports_response=SupportsResponse.OPTIONAL,
    )

    _LOGGER.debug("Registered services for Gold Portfolio")
