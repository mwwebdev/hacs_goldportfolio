"""Gold Portfolio Tracker Integration."""
import asyncio
import logging
from datetime import timedelta
from pathlib import Path

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import GoldAPIClient
from .const import DOMAIN, UPDATE_INTERVAL_DEFAULT
from .services import async_setup_services

# Pre-load sensor module to avoid blocking import warning
from . import sensor as _sensor_module  # noqa: F401

_LOGGER = logging.getLogger(__name__)

# Get integration directory path
INTEGRATION_DIR = Path(__file__).parent

PLATFORMS: list[Platform] = [Platform.SENSOR]


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up Gold Portfolio integration."""
    # Register custom card resources
    www_path = INTEGRATION_DIR / "www"
    if www_path.exists():
        hass.http.register_static_path(
            "/local/gold-portfolio-card.js",
            str(www_path / "gold-portfolio-card.js"),
            cache_headers=False
        )
        hass.http.register_static_path(
            "/local/gold-portfolio-card-editor.js",
            str(www_path / "gold-portfolio-card-editor.js"),
            cache_headers=False
        )
        _LOGGER.debug("Registered custom card resources")
    
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Gold Portfolio from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    api_key = entry.data.get("api_key")
    update_interval = entry.options.get("update_interval", UPDATE_INTERVAL_DEFAULT)

    api_client = GoldAPIClient(api_key)

    async def async_update_data():
        """Fetch data from Gold API."""
        try:
            return await api_client.get_gold_price()
        except Exception as err:
            _LOGGER.error("Error updating gold price: %s", err)
            raise UpdateFailed(f"Error communicating with Gold API: {err}")

    coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name=DOMAIN,
        update_method=async_update_data,
        update_interval=timedelta(hours=24 // update_interval),
    )

    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = {
        "coordinator": coordinator,
        "api_client": api_client,
        "entry": entry,
    }

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Setup services once
    if not hass.data[DOMAIN].get("services_registered"):
        await async_setup_services(hass)
        hass.data[DOMAIN]["services_registered"] = True

    entry.async_on_unload(entry.add_update_listener(async_update_listener))

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok


async def async_update_listener(hass: HomeAssistant, config_entry: ConfigEntry):
    """Listen for option updates."""
    await hass.config_entries.async_reload(config_entry.entry_id)
