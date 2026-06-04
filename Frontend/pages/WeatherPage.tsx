import { useState } from "react";
import {
  Cloud,
  Search,
  Thermometer,
  Droplets,
  Wind,
  MapPin,
} from "lucide-react";
import { weatherService } from "../services/otherServices";
import type { WeatherEntry } from "../types";
import {
  PageHeader,
  EmptyState,
  Spinner,
  ErrorAlert,
} from "../components/ui";

const SUGGESTED_CITIES = [
  "Zagreb",
  "Split",
  "Rijeka",
  "Osijek",
  "Zadar",
  "Slavonski Brod",
];

export default function WeatherPage() {
  const [cityName, setCityName] = useState("");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<WeatherEntry[] | null>(null);
  const [error, setError] = useState("");
  const [searchedCity, setSearchedCity] = useState("");

  const handleSearch = async (city?: string) => {
    const term = city ?? cityName.trim();
    if (!term) return;
    setLoading(true);
    setError("");
    setEntries(null);
    setSearchedCity(term);
    try {
      const res = await weatherService.getByCity(term);
      setEntries(res.results);
    } catch (err: unknown) {
      const status = (
        err as { response?: { status?: number; data?: { message?: string } } }
      )?.response?.status;
      if (status === 404) {
        setEntries([]);
      } else {
        setError(
          "Failed to fetch weather data. The gRPC service may be unavailable.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Weather Search"
        subtitle="Query Croatian weather data via gRPC (DHMZ source)"
      />

      {/* Architecture note */}
      <div className="card bg-sky-50 border-sky-100 mb-6">
        <div className="flex items-start gap-3">
          <Cloud className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
          <div className="text-sm text-sky-700">
            <p className="font-semibold mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>
                Frontend calls REST{" "}
                <code className="bg-sky-100 px-1 rounded">
                  GET /api/weather/{"{"}city{"}"}
                </code>
              </li>
              <li>Backend controller calls gRPC service via Grpc.Net.Client</li>
              <li>
                gRPC service fetches XML from{" "}
                <strong>vrijeme.hr/hrvatska_n.xml</strong>
              </li>
              <li>Parses XML with LINQ to XML</li>
              <li>Filters by city name (partial match)</li>
              <li>Returns all matching cities with temperatures</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="flex gap-3 mb-4"
      >
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            className="input pl-10"
            placeholder="Enter city name (e.g. Zagreb, Split)…"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search
        </button>
      </form>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SUGGESTED_CITIES.map((city) => (
          <button
            key={city}
            onClick={() => {
              setCityName(city);
              handleSearch(city);
            }}
            className="px-3 py-1.5 text-xs rounded-full border border-sky-200 text-sky-700
                       bg-sky-50 hover:bg-sky-100 transition-colors"
          >
            {city}
          </button>
        ))}
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner className="w-8 h-8 text-sky-500" />
        </div>
      )}

      {!loading &&
        entries !== null &&
        (entries.length === 0 ? (
          <EmptyState
            message={`No weather data found for "${searchedCity}"`}
            icon={Cloud}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry, i) => (
              <WeatherCard key={i} entry={entry} />
            ))}
          </div>
        ))}
    </div>
  );
}

function WeatherCard({ entry }: { entry: WeatherEntry }) {
  const temp = parseFloat(entry.temperature);
  const tempColor =
    temp > 25
      ? "text-orange-600"
      : temp < 5
        ? "text-blue-600"
        : "text-green-600";

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-gray-400" />
        <h3 className="font-semibold text-gray-900">{entry.city}</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Thermometer className="w-4 h-4 text-red-400" />
            <span>Temperature</span>
          </div>
          <span className={`font-bold text-lg ${tempColor}`}>
            {entry.temperature !== "N/A" ? `${entry.temperature}°C` : "N/A"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span>Humidity</span>
          </div>
          <span className="font-medium text-gray-700">
            {entry.humidity !== "N/A" ? `${entry.humidity}%` : "N/A"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Wind className="w-4 h-4 text-gray-400" />
            <span>Wind</span>
          </div>
          <span className="font-medium text-gray-700">
            {entry.wind !== "N/A" ? `${entry.wind} km/h` : "N/A"}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Source: DHMZ (vrijeme.hr)
        </p>
      </div>
    </div>
  );
}
