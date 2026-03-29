const axios = require("axios");

let cachedCountries = null;
let cachedAt = 0;
const CACHE_MS = 1000 * 60 * 60 * 12;

async function fetchCountryCurrencyMap() {
  const now = Date.now();
  if (cachedCountries && now - cachedAt < CACHE_MS) {
    return cachedCountries;
  }

  const response = await axios.get(
    "https://restcountries.com/v3.1/all?fields=name,currencies"
  );

  const countries = response.data || [];
  const map = new Map();

  for (const country of countries) {
    const commonName = country?.name?.common;
    const currencies = country?.currencies;
    if (!commonName || !currencies) {
      continue;
    }

    const firstCurrencyCode = Object.keys(currencies)[0];
    if (!firstCurrencyCode) {
      continue;
    }

    map.set(commonName.toLowerCase(), firstCurrencyCode.toUpperCase());
  }

  cachedCountries = map;
  cachedAt = now;
  return map;
}

async function getCurrencyCodeForCountry(countryName) {
  const normalized = (countryName || "").trim().toLowerCase();
  if (!normalized) {
    return "USD";
  }

  try {
    const map = await fetchCountryCurrencyMap();
    return map.get(normalized) || "USD";
  } catch (_error) {
    return "USD";
  }
}

async function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return 1.0;
  }

  try {
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`
    );
    const rates = response.data?.rates || {};
    const rate = rates[toCurrency.toUpperCase()];
    return rate || 1.0;
  } catch (_error) {
    console.error(`Failed to fetch FX rate from ${fromCurrency} to ${toCurrency}:`, _error.message);
    return 1.0;
  }
}

module.exports = {
  getCurrencyCodeForCountry,
  getExchangeRate
};
