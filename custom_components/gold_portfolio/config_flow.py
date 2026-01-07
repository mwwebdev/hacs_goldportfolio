"""Config flow for Gold Portfolio Tracker."""
import logging
from typing import Any, Dict, Optional

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_NAME
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

from .api import GoldAPIClient
from .const import CONF_API_KEY, CONF_UPDATE_INTERVAL, DOMAIN, UPDATE_INTERVAL_DEFAULT

_LOGGER = logging.getLogger(__name__)


class GoldPortfolioConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Gold Portfolio."""

    VERSION = 1
    CONNECTION_CLASS = config_entries.CONN_CLASS_CLOUD_POLL

    async def async_step_user(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors: Dict[str, str] = {}

        if user_input is not None:
            try:
                # Validate API key
                api_key = user_input[CONF_API_KEY].strip()
                
                # Check if API key is empty
                if not api_key:
                    errors["base"] = "empty_api_key"
                else:
                    _LOGGER.debug(f"Validating API key: {api_key[:10]}...")
                    api_client = GoldAPIClient(api_key)
                    result = await api_client.get_gold_price()
                    _LOGGER.info(f"API validation successful. Gold price: {result.get('price')}")

                    await self.async_set_unique_id(api_key)
                    self._abort_if_unique_id_configured()

                    return self.async_create_entry(
                        title=user_input.get(CONF_NAME, "Gold Portfolio"),
                        data={CONF_API_KEY: api_key},
                    )
            except ValueError as err:
                _LOGGER.error(f"API validation error: {err}")
                # Map specific error messages
                error_msg = str(err).lower()
                if "invalid api key" in error_msg or "authentication failed" in error_msg:
                    errors["base"] = "invalid_api_key"
                elif "access forbidden" in error_msg:
                    errors["base"] = "forbidden_api_key"
                elif "rate limit" in error_msg:
                    errors["base"] = "rate_limit_exceeded"
                elif "timeout" in error_msg:
                    errors["base"] = "connection_timeout"
                else:
                    errors["base"] = "api_error"
            except Exception as err:
                _LOGGER.error(f"Unexpected error validating API key: {err}")
                errors["base"] = "unknown_error"

        data_schema = vol.Schema(
            {
                vol.Required(CONF_API_KEY): str,
                vol.Optional(CONF_NAME, default="Gold Portfolio"): str,
            }
        )

        return self.async_show_form(
            step_id="user", data_schema=data_schema, errors=errors
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry):
        """Get the options flow for this config entry."""
        return GoldPortfolioOptionsFlowHandler()


class GoldPortfolioOptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options for Gold Portfolio."""

    async def async_step_init(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        options = self.config_entry.options

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_UPDATE_INTERVAL,
                        default=options.get(CONF_UPDATE_INTERVAL, UPDATE_INTERVAL_DEFAULT),
                    ): vol.In([1, 2, 3, 4, 6, 8, 12, 24]),
                }
            ),
            description_placeholders={
                "update_interval_help": "Wie oft pro Tag soll der Goldpreis abgefragt werden? "
                "(1-24 mal pro Tag, z.B. 2 = 12 Stunden Intervall)"
            },
        )
