"""Gold API client for fetching gold prices."""
import asyncio
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
        url = f"{self.base_url}{GOLD_PRICE_ENDPOINT}"
        headers = {
            "x-access-token": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    _LOGGER.debug(f"Gold API Response Status: {resp.status}")
                    
                    if resp.status == 200:
                        data = await resp.json()
                        _LOGGER.debug(f"Gold API Response: {data}")
                        return {
                            "price": float(data.get("price", 0)),
                            "timestamp": data.get("timestamp"),
                            "currency": data.get("currency", "EUR"),
                        }
                    elif resp.status == 401:
                        _LOGGER.error("API Key authentication failed (401)")
                        raise ValueError("Invalid API Key - Authentication failed")
                    elif resp.status == 403:
                        _LOGGER.error("API Key forbidden (403)")
                        raise ValueError("Invalid API Key - Access forbidden")
                    elif resp.status == 429:
                        _LOGGER.error("API rate limit exceeded (429)")
                        raise ValueError("Rate limit exceeded - wait before retrying")
                    else:
                        response_text = await resp.text()
                        _LOGGER.error(f"API request failed with status {resp.status}: {response_text}")
                        raise Exception(f"API error: {resp.status}")
        except asyncio.TimeoutError:
            _LOGGER.error("API request timeout")
            raise ValueError("Gold API request timeout - check your internet connection")
        except aiohttp.ClientError as err:
            _LOGGER.error(f"API client error: {err}")
            raise ValueError(f"Connection error: {err}")

    async def get_historical_price(self, date: str) -> Optional[float]:
        """Get historical gold price for a specific date (format: YYYY-MM-DD)."""
        url = f"{self.base_url}{GOLD_PRICE_ENDPOINT}?date={date}"
        headers = {
            "x-access-token": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
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
