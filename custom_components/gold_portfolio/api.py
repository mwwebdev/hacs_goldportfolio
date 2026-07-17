"""Gold API client for fetching gold prices."""
import asyncio
import logging
from typing import Optional

import aiohttp

from .const import GOLD_API_BASE_URL, GOLD_PRICE_ENDPOINT

_LOGGER = logging.getLogger(__name__)


class GoldAPIClient:
    """Client for interacting with Gold API (goldapi.io)."""

    def __init__(self, api_key: str, session: Optional[aiohttp.ClientSession] = None):
        """Initialize the Gold API client."""
        self.api_key = api_key
        self.base_url = GOLD_API_BASE_URL
        self._session = session

    def _headers(self) -> dict:
        return {
            "x-access-token": self.api_key,
            "Content-Type": "application/json",
        }

    async def _request(self, url: str) -> dict:
        """Perform a GET request against the Gold API."""
        if self._session is not None:
            return await self._request_with_session(self._session, url)
        async with aiohttp.ClientSession() as session:
            return await self._request_with_session(session, url)

    async def _request_with_session(self, session: aiohttp.ClientSession, url: str) -> dict:
        async with session.get(
            url, headers=self._headers(), timeout=aiohttp.ClientTimeout(total=15)
        ) as resp:
            _LOGGER.debug("Gold API %s -> status %s", url, resp.status)

            if resp.status == 200:
                data = await resp.json()
                # goldapi.io returns {"error": "..."} with status 200 in some cases
                if isinstance(data, dict) and data.get("error"):
                    raise ValueError(f"Gold API error: {data['error']}")
                return data
            if resp.status == 401:
                raise ValueError("Invalid API Key - Authentication failed")
            if resp.status == 403:
                raise ValueError("Invalid API Key - Access forbidden")
            if resp.status == 429:
                raise ValueError("Rate limit exceeded - wait before retrying")

            response_text = await resp.text()
            _LOGGER.error(
                "API request failed with status %s: %s", resp.status, response_text
            )
            raise ValueError(f"API error: {resp.status}")

    async def get_gold_price(self) -> dict:
        """Get current gold price in EUR (per troy ounce)."""
        url = f"{self.base_url}{GOLD_PRICE_ENDPOINT}"
        try:
            data = await self._request(url)
            return {
                "price": float(data.get("price", 0)),
                "price_gram_24k": data.get("price_gram_24k"),
                "timestamp": data.get("timestamp"),
                "currency": data.get("currency", "EUR"),
            }
        except asyncio.TimeoutError:
            raise ValueError("Gold API request timeout - check your internet connection")
        except aiohttp.ClientError as err:
            raise ValueError(f"Connection error: {err}")

    async def get_historical_price(self, date: str) -> Optional[float]:
        """Get historical gold price (EUR per troy ounce) for a date (YYYY-MM-DD).

        goldapi.io expects the date in the URL path as YYYYMMDD:
        https://www.goldapi.io/api/XAU/EUR/20240115
        """
        compact_date = date.replace("-", "")
        url = f"{self.base_url}{GOLD_PRICE_ENDPOINT}/{compact_date}"
        try:
            data = await self._request(url)
            price = data.get("price")
            return float(price) if price is not None else None
        except (ValueError, asyncio.TimeoutError, aiohttp.ClientError) as err:
            _LOGGER.warning("Error fetching historical price for %s: %s", date, err)
            return None
