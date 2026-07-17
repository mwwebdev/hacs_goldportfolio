"""Gold Portfolio Tracker Integration."""
import logging
from datetime import timedelta
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import GoldAPIClient
from .const import (
    CARD_FILENAME,
    CARD_URL_PATH,
    DOMAIN,
    UPDATE_INTERVAL_DEFAULT,
    VERSION,
)
from .portfolio import PortfolioManager
from .services import async_setup_services

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR]


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Serve the dashboard card and load it automatically on all dashboards."""
    if hass.data[DOMAIN].get("frontend_registered"):
        return

    card_path = Path(__file__).parent / "www" / CARD_FILENAME
    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARD_URL_PATH, str(card_path.parent), cache_headers=False)]
    )
    if "frontend" in hass.config.components:
        frontend.add_extra_js_url(hass, f"{CARD_URL_PATH}/{CARD_FILENAME}?v={VERSION}")
    hass.data[DOMAIN]["frontend_registered"] = True
    _LOGGER.debug("Registered gold-portfolio-card at %s/%s", CARD_URL_PATH, CARD_FILENAME)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Gold Portfolio from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    api_key = entry.data.get("api_key")
    update_interval = entry.options.get("update_interval", UPDATE_INTERVAL_DEFAULT)

    api_client = GoldAPIClient(api_key, session=async_get_clientsession(hass))

    async def async_update_data():
        """Fetch data from Gold API."""
        try:
            return await api_client.get_gold_price()
        except Exception as err:
            raise UpdateFailed(f"Error communicating with Gold API: {err}") from err

    coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name=DOMAIN,
        update_method=async_update_data,
        update_interval=timedelta(hours=24 / update_interval),
    )

    portfolio_manager = PortfolioManager(hass)
    await portfolio_manager.async_load()

    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = {
        "coordinator": coordinator,
        "api_client": api_client,
        "portfolio_manager": portfolio_manager,
        "entry": entry,
    }

    await _async_register_frontend(hass)

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
