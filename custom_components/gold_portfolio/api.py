"""Gold API client for fetching gold prices."""
import logging
from datetime import datetime
from typing import Optional

import aiohttp

from .const import GOLD_API_BASE_URL, GOLD_PRICE_ENDPOINT

_LOGGER = logging.getLogger(__name__)


class GoldAPIClient:
    """Client for interacting with Gold API."""

    def __init__(self, api_key: str):
        """Initialize the Gold API client."""
        self.api_key = api_key
        self.base_url = GOLD_API_BASE_URL

    async def get_gold_price(self) -> dict:
        """Get current gold price in EUR."""
        url = f"{self.base_url}{GOLD_PRICE_ENDPOINT}?api_key={self.api_key}"

        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return {
                        "price": float(data.get("price", 0)),
                        "timestamp": data.get("timestamp"),
                        "currency": data.get("currency", "EUR"),
                    }
                else:
                    _LOGGER.error("API request failed with status %s", resp.status)
                    raise Exception(f"API error: {resp.status}")

    async def get_historical_price(self, date: str) -> Optional[float]:
        """Get historical gold price for a specific date (format: YYYY-MM-DD)."""
        url = f"{self.base_url}{GOLD_PRICE_ENDPOINT}?api_key={self.api_key}&date={date}"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return float(data.get("price"))
                    else:
                        _LOGGER.warning(
                            "Could not fetch historical price for %s: %s", date, resp.status
                        )
                        return None
        except Exception as err:
            _LOGGER.warning("Error fetching historical price for %s: %s", date, err)
            return None
