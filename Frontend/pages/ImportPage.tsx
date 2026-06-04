import { useState } from "react";
import {
  Upload,
  FileText,
  Code2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { tagService } from "../services/tagService";
import type { ImportResult, ImportError, Tag } from "../types";
import { PageHeader, ColorBadge, Spinner } from "../components/ui";

type Format = "xml" | "json";

const XML_EXAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Tags>
  <Tag>
    <Name>Backend</Name>
    <Color>#6366F1</Color>
    <Description>Backend related tasks</Description>
  </Tag>
  <Tag>
    <Name>Frontend</Name>
    <Color>#F59E0B</Color>
  </Tag>
</Tags>`;

const JSON_EXAMPLE = `[
  {
    "name": "DevOps",
    "color": "#10B981",
    "description": "DevOps and infrastructure"
  },
  {
    "name": "Testing",
    "color": "#EF4444"
  }
]`;

export default function ImportPage() {
  const [format, setFormat] = useState<Format>("xml");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<ImportError | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setContent(text);
      setFormat(file.name.endsWith(".json") ? "json" : "xml");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!content.trim()) {
      toast.error("Please enter content to import");
      return;
    }
    setLoading(true);
    setResult(null);
    setImportError(null);
    try {
      const res =
        format === "xml"
          ? await tagService.importXml(content)
          : await tagService.importJson(content);
      setResult(res);
      toast.success(`Imported ${res.tags.length} tag(s)!`);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: ImportError } })?.response
        ?.data;
      if (errData?.errors) {
        setImportError(errData);
      } else {
        toast.error("Import failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setContent(format === "xml" ? XML_EXAMPLE : JSON_EXAMPLE);
    setResult(null);
    setImportError(null);
  };

  return (
    <div>
      <PageHeader
        title="Import Tags"
        subtitle="Import tags from XML or JSON with automatic validation"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Left: Input ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Format selector */}
          <div className="card">
            <p className="text-sm font-medium text-gray-700 mb-3">Format</p>
            <div className="flex gap-3">
              {(["xml", "json"] as Format[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFormat(f);
                    setResult(null);
                    setImportError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    format === f
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {f === "xml" ? (
                    <FileText className="w-4 h-4" />
                  ) : (
                    <Code2 className="w-4 h-4" />
                  )}
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Content editor */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                {format.toUpperCase()} Content
              </label>
              <button
                onClick={loadExample}
                className="text-xs text-blue-600 hover:underline"
              >
                Load example
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="input font-mono text-xs resize-none"
              placeholder={
                format === "xml"
                  ? "<Tags>\n  <Tag>\n    <Name>…</Name>\n    <Color>#FF0000</Color>\n  </Tag>\n</Tags>"
                  : '[{"name":"…","color":"#FF0000"}]'
              }
            />

            {/* File upload */}
            <div className="mt-3 flex items-center gap-3">
              <label className="btn-secondary cursor-pointer text-xs">
                <Upload className="w-3.5 h-3.5" />
                Upload file
                <input
                  type="file"
                  accept=".xml,.json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <span className="text-xs text-gray-400">
                or paste content above
              </span>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={loading || !content.trim()}
            className="btn-primary w-full justify-center py-2.5"
          >
            {loading ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {loading ? "Importing…" : `Import ${format.toUpperCase()}`}
          </button>
        </div>

        {/* ─── Right: Results ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Validation errors */}
          {importError && (
            <div className="card border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-700">
                  {importError.format} Validation Failed
                </h3>
              </div>
              <ul className="space-y-1">
                {importError.errors.map((err, i) => (
                  <li
                    key={i}
                    className="text-xs text-red-600 font-mono bg-red-100 px-3 py-1.5 rounded"
                  >
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="card border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-green-700">
                  {result.message}
                </h3>
              </div>
              <div className="space-y-2">
                {result.tags.map((tag: Tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-green-100"
                  >
                    <ColorBadge color={tag.color} name={tag.name} />
                    {tag.description && (
                      <span className="text-xs text-gray-500 truncate">
                        {tag.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schema info */}
          {!result && !importError && (
            <div className="card bg-blue-50 border-blue-100">
              <h3 className="font-semibold text-blue-800 mb-2 text-sm">
                Validation Rules
              </h3>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                {format === "xml" ? (
                  <>
                    <li>XML validated against XSD schema</li>
                    <li>
                      <code className="bg-blue-100 px-1 rounded">Name</code>{" "}
                      required, max 100 chars
                    </li>
                    <li>
                      <code className="bg-blue-100 px-1 rounded">Color</code>{" "}
                      required, format{" "}
                      <code className="bg-blue-100 px-1 rounded">#RRGGBB</code>
                    </li>
                    <li>
                      <code className="bg-blue-100 px-1 rounded">
                        Description
                      </code>{" "}
                      optional
                    </li>
                    <li>
                      Root element must be{" "}
                      <code className="bg-blue-100 px-1 rounded">
                        &lt;Tags&gt;
                      </code>
                    </li>
                  </>
                ) : (
                  <>
                    <li>JSON validated against JSON Schema</li>
                    <li>
                      <code className="bg-blue-100 px-1 rounded">name</code>{" "}
                      required, max 100 chars
                    </li>
                    <li>
                      <code className="bg-blue-100 px-1 rounded">color</code>{" "}
                      required, format{" "}
                      <code className="bg-blue-100 px-1 rounded">#RRGGBB</code>
                    </li>
                    <li>
                      <code className="bg-blue-100 px-1 rounded">
                        description
                      </code>{" "}
                      optional
                    </li>
                    <li>Accept single object or array</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
