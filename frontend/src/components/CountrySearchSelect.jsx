import { useEffect, useMemo, useState } from "react";

export default function CountrySearchSelect({ value, onChange, placeholder = "Search country...", required = false }) {
  const [countries, setCountries] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCountries() {
      setError("");
      try {
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name");
        const data = await response.json();
        const names = (data || [])
          .map((country) => country?.name?.common)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setCountries(names);
      } catch (_error) {
        setError("Failed to load countries");
      }
    }

    loadCountries();
  }, []);

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return countries.slice(0, 200);
    }
    return countries.filter((country) => country.toLowerCase().includes(query)).slice(0, 200);
  }, [countries, search]);

  return (
    <div className="space-y-2">
      <input
        className="w-full rounded border p-2"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        className="w-full rounded border p-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">Select country</option>
        {filteredCountries.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
