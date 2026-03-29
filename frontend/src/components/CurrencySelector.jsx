import { useState, useRef, useEffect } from "react";

const POPULAR_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "INR", name: "Indian Rupee" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "KRW", name: "South Korean Won" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "ZAR", name: "South African Rand" }
];

export default function CurrencySelector({ value, onChange, placeholder = "Select currency" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const filtered = POPULAR_CURRENCIES.filter(
    (curr) =>
      curr.code.includes(search.toUpperCase()) ||
      curr.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = POPULAR_CURRENCIES.find((c) => c.code === value);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        className="w-full rounded border p-2 text-left flex justify-between items-center bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selected ? `${selected.code} - ${selected.name}` : placeholder}</span>
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full rounded border border-t-0 bg-white shadow-lg">
          <input
            type="text"
            className="w-full rounded-t border-b p-2"
            placeholder="Search currency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-2 text-center text-sm text-gray-500">No currencies found</div>
            ) : (
              filtered.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-slate-100 flex justify-between"
                  onClick={() => {
                    onChange(currency.code);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="font-semibold">{currency.code}</span>
                  <span className="text-sm text-gray-600">{currency.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
