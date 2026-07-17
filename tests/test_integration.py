"""Functional tests: setup, sensors, services, entity lifecycle."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.gold_portfolio.const import DOMAIN, TROY_OZ_TO_GRAM

GOLD_PRICE = 3110.35  # EUR/oz -> exactly 100 EUR/g
HIST_PRICE = 2800.0


@pytest.fixture
def mock_api():
    with patch(
        "custom_components.gold_portfolio.async_get_clientsession",
        return_value=MagicMock(),
    ), patch("custom_components.gold_portfolio.GoldAPIClient") as mock_cls:
        client = mock_cls.return_value
        client.get_gold_price = AsyncMock(
            return_value={"price": GOLD_PRICE, "timestamp": 123, "currency": "EUR"}
        )
        client.get_historical_price = AsyncMock(return_value=HIST_PRICE)
        yield client


@pytest.fixture
def no_frontend():
    """Skip serving the card in tests (needs the http component)."""
    with patch(
        "custom_components.gold_portfolio._async_register_frontend",
        new=AsyncMock(),
    ):
        yield


async def _setup(hass) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN, data={"api_key": "test-key"}, entry_id="cfg1", title="Gold"
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_full_lifecycle(hass, mock_api, no_frontend):
    """Setup -> add -> instant sensors -> update -> remove."""
    entry = await _setup(hass)
    registry = er.async_get(hass)

    # Summary sensor exists and carries the card's data source attributes
    state = hass.states.get("sensor.portfolio_current_value")
    assert state is not None
    assert state.attributes["integration"] == DOMAIN
    assert state.attributes["config_entry_id"] == entry.entry_id
    assert state.attributes["entries"] == []
    assert state.attributes["price_per_gram"] == round(GOLD_PRICE / TROY_OZ_TO_GRAM, 2)

    # Add a purchase without price -> historical price is fetched
    await hass.services.async_call(
        DOMAIN,
        "add_portfolio_entry",
        {"name": "Schmuck", "purchase_date": "2024-01-15", "amount_grams": 100},
        blocking=True,
    )
    await hass.async_block_till_done()

    state = hass.states.get("sensor.portfolio_current_value")
    assert state.attributes["entry_count"] == 1
    e = state.attributes["entries"][0]
    assert e["name"] == "Schmuck"
    expected_price = 100 * (HIST_PRICE / TROY_OZ_TO_GRAM)
    assert abs(e["purchase_price_eur"] - expected_price) < 0.01
    pid = e["entry_id"]

    # Per-entry sensors were created immediately, with canonical unique_ids
    grams_eid = registry.async_get_entity_id(
        "sensor", DOMAIN, f"portfolio_entry_{pid}_grams"
    )
    value_eid = registry.async_get_entity_id(
        "sensor", DOMAIN, f"portfolio_entry_{pid}_current_value"
    )
    assert grams_eid and value_eid
    assert float(hass.states.get(grams_eid).state) == 100.0
    assert abs(float(hass.states.get(value_eid).state) - 10000.0) < 0.5
    assert "Schmuck" in hass.states.get(value_eid).name

    # Update reflects instantly (no coordinator refresh needed)
    await hass.services.async_call(
        DOMAIN,
        "update_portfolio_entry",
        {"portfolio_entry_id": pid, "amount_grams": 50},
        blocking=True,
    )
    await hass.async_block_till_done()
    assert float(hass.states.get(grams_eid).state) == 50.0
    assert float(hass.states.get("sensor.portfolio_total_grams").state) == 50.0

    # Removing the purchase removes its sensors and registry entries
    await hass.services.async_call(
        DOMAIN,
        "remove_portfolio_entry",
        {"portfolio_entry_id": pid},
        blocking=True,
    )
    await hass.async_block_till_done()
    assert (
        registry.async_get_entity_id("sensor", DOMAIN, f"portfolio_entry_{pid}_grams")
        is None
    )
    assert hass.states.get(grams_eid) is None
    state = hass.states.get("sensor.portfolio_current_value")
    assert state.attributes["entry_count"] == 0


async def test_ghost_entity_cleanup(hass, mock_api, no_frontend):
    """Legacy runtime-registered ghosts ('Schmuck unavailable' bug) are purged."""
    entry = MockConfigEntry(
        domain=DOMAIN, data={"api_key": "test-key"}, entry_id="cfg1", title="Gold"
    )
    entry.add_to_hass(hass)
    registry = er.async_get(hass)

    # Simulate the ghosts the old version left behind
    ghost = registry.async_get_or_create(
        "sensor",
        DOMAIN,
        f"{entry.entry_id}_entry_1768210120875_value",
        config_entry=entry,
        suggested_object_id="portfolio_entry_1768210120875_current_value",
    )
    stale = registry.async_get_or_create(
        "sensor",
        DOMAIN,
        "portfolio_entry_999_grams",  # portfolio entry 999 no longer exists
        config_entry=entry,
        suggested_object_id="portfolio_entry_999_grams",
    )

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert registry.async_get(ghost.entity_id) is None
    assert registry.async_get(stale.entity_id) is None
    # Total sensors survived
    assert registry.async_get_entity_id("sensor", DOMAIN, f"{entry.entry_id}_price")


async def test_survives_api_failure_after_first_refresh(hass, mock_api, no_frontend):
    """Sensors keep the last known price instead of going unavailable."""
    await _setup(hass)
    await hass.services.async_call(
        DOMAIN,
        "add_portfolio_entry",
        {
            "name": "Barren",
            "purchase_date": "2024-01-15",
            "amount_grams": 10,
            "purchase_price_eur": 900,
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    # Next refresh fails
    mock_api.get_gold_price.side_effect = ValueError("rate limited")
    coordinator = hass.data[DOMAIN]["cfg1"]["coordinator"]
    await coordinator.async_refresh()
    await hass.async_block_till_done()

    state = hass.states.get("sensor.portfolio_current_value")
    assert state.state not in ("unavailable", "unknown")
    assert abs(float(state.state) - 1000.0) < 0.5
