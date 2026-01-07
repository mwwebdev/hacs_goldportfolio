"""Constants for Gold Portfolio Tracker."""

DOMAIN = "gold_portfolio"
NAME = "Gold Portfolio Tracker"
VERSION = "1.0.0"

# API
GOLD_API_BASE_URL = "https://www.goldapi.io/api"
GOLD_PRICE_ENDPOINT = "/XAU/EUR"
TROY_OZ_TO_GRAM = 31.1035  # Conversion factor

# Default values
UPDATE_INTERVAL_DEFAULT = 2  # 2 times per day (every 12 hours)
UPDATE_INTERVAL_MIN = 1
UPDATE_INTERVAL_MAX = 24

# Configuration
CONF_API_KEY = "api_key"
CONF_UPDATE_INTERVAL = "update_interval"

# Attributes
ATTR_AMOUNT_GRAMS = "amount_grams"
ATTR_PURCHASE_PRICE_EUR = "purchase_price_eur"
ATTR_PURCHASE_DATE = "purchase_date"
ATTR_CURRENT_VALUE_EUR = "current_value_eur"
ATTR_GAIN_EUR = "gain_eur"
ATTR_GAIN_PERCENT = "gain_percent"

# Services
SERVICE_ADD_PORTFOLIO_ENTRY = "add_portfolio_entry"
SERVICE_REMOVE_PORTFOLIO_ENTRY = "remove_portfolio_entry"
SERVICE_UPDATE_PORTFOLIO_ENTRY = "update_portfolio_entry"
SERVICE_GET_PORTFOLIO_ENTRIES = "get_portfolio_entries"
SERVICE_GET_HISTORICAL_PRICE = "get_historical_price"
