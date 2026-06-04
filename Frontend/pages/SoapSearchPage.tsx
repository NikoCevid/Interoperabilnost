import { useState } from "react";
import { Search, Wifi, CheckCircle2, XCircle } from "lucide-react";
import { soapService } from "../services/otherServices";
import type { SoapSearchResponse } from "../types";
import {
  PageHeader,
  ColorBadge,
  EmptyState,
  Spinner,
  ErrorAlert,
} from "../components/ui";

export default function SoapSearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SoapSearchResponse | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await soapService.search(searchTerm);
      setResult(res);
    } catch {
      setError(
        "SOAP service request failed. Make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="SOAP Search"
        subtitle="Search tags via SOAP web service with XPath filtering"
      />

      {/* Architecture note */}
      <div className="card bg-indigo-50 border-indigo-100 mb-6">
        <div className="flex items-start gap-3">
          <Wifi className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-700">
            <p className="font-semibold mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>
                Frontend calls REST{" "}
                <code className="bg-indigo-100 px-1 rounded">
                  POST /api/soap/search
                </code>
              </li>
              <li>Backend calls SOAP service (CoreWCF)</li>
              <li>SOAP service queries internal DB via REST</li>
              <li>Generates XML file from results</li>
              <li>Validates XML against XSD</li>
              <li>Applies XPath filter on search term</li>
              <li>Returns filtered results</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
            placeholder="Enter search term (e.g. bug, feature, urgent)…"
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

      {error && <ErrorAlert message={error} />}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              Found <strong>{result.totalFound}</strong> result(s) for "
              <em>{result.searchTerm}</em>"
            </span>
            <div className="flex items-center gap-1.5">
              {result.xmlValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 text-xs">XML valid</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 text-xs">XML invalid</span>
                </>
              )}
            </div>
          </div>

          {/* Validation errors */}
          {result.validationErrors.length > 0 && (
            <div className="card border-yellow-200 bg-yellow-50">
              <p className="text-xs font-semibold text-yellow-800 mb-2">
                XSD Validation Warnings:
              </p>
              {result.validationErrors.map((err, i) => (
                <p key={i} className="text-xs text-yellow-700 font-mono">
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Tag results */}
          {result.tags.length === 0 ? (
            <EmptyState
              message={`No tags match "${result.searchTerm}"`}
              icon={Search}
            />
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tag
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.tags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <ColorBadge color={tag.color} name={tag.name} />
                      </td>
                      <td className="px-6 py-4 text-gray-600 truncate max-w-xs">
                        {tag.description || (
                          <span className="text-gray-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {tag.dateCreated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
