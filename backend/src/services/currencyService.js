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

module.exports = {
  getCurrencyCodeForCountry
};
