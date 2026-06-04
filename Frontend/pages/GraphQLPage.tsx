import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Braces,
  CheckCircle2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { graphqlService } from "../services/otherServices";
import { useAuthStore } from "../store/authStore";
import type { Tag, PagedResult } from "../types";
import {
  PageHeader,
  ColorBadge,
  EmptyState,
  Spinner,
  ErrorAlert,
  ConfirmDialog,
} from "../components/ui";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #FF5733)"),
  description: z.string().max(500).optional(),
});
type CreateFormData = z.infer<typeof createSchema>;

export default function GraphQLPage() {
  const { user } = useAuthStore();
  const isFullAccess = user?.role === "FullAccess";

  const [data, setData] = useState<PagedResult<Tag> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { color: "#3B82F6" },
  });

  const watchedColor = watch("color");

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await graphqlService.getTags(
        search || undefined,
        page,
        10,
      );
      setData(result);
    } catch (err: unknown) {
      setError((err as Error).message ?? "GraphQL query failed");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const onCreateSubmit = async (formData: CreateFormData) => {
    try {
      await graphqlService.createTag(
        formData.name,
        formData.color,
        formData.description,
      );
      toast.success("Tag created via GraphQL mutation");
      reset({ color: "#3B82F6" });
      setShowForm(false);
      fetchTags();
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Mutation failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await graphqlService.deleteTag(deleteId);
      toast.success("Tag deleted via GraphQL mutation");
      setDeleteId(null);
      fetchTags();
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Delete mutation failed");
    } finally {
      setDeleting(false);
    }
  };

  // Live query preview shown in sidebar
  const queryPreview = search
    ? `query GetTags {
  tags(
    search: "${search}"
    page: ${page}
    pageSize: 10
  ) {
    items {
      id name color
      description dateCreated
    }
    totalCount totalPages
  }
}`
    : `query GetTags {
  tags(page: ${page}, pageSize: 10) {
    items {
      id name color
      description dateCreated
    }
    totalCount totalPages
  }
}`;

  const createMutationPreview = `mutation CreateTag {
  createTag(
    name: "…"
    color: "#RRGGBB"
    description: "…"
  ) {
    id name color
    description dateCreated
  }
}`;

  return (
    <div>
      <PageHeader
        title="GraphQL Explorer"
        subtitle="Query and mutate tags via the /graphql endpoint (HotChocolate)"
        action={
          isFullAccess ? (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="btn-primary"
            >
              {showForm ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  New Tag
                </>
              )}
            </button>
          ) : undefined
        }
      />

      {/* Endpoint badge */}
      <div className="card bg-purple-50 border-purple-100 mb-6">
        <div className="flex items-start gap-3">
          <Braces className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
          <div className="text-sm text-purple-700">
            <p className="font-semibold mb-0.5">
              Endpoint:{" "}
              <code className="bg-purple-100 px-1.5 py-0.5 rounded text-xs font-mono">
                POST /graphql
              </code>
            </p>
            <p className="text-xs text-purple-600">
              All operations (queries + mutations) go to a single endpoint with
              a JSON body containing the GraphQL document and optional
              variables.
            </p>
          </div>
        </div>
      </div>

      {/* Create form — FullAccess only */}
      {showForm && isFullAccess && (
        <div className="card mb-6 border-purple-200 bg-purple-50/30">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
            createTag — GraphQL Mutation
          </h3>
          <form
            onSubmit={handleSubmit(onCreateSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name *</label>
                <input
                  {...register("name")}
                  className="input"
                  placeholder="e.g. Bug, Feature, Urgent"
                />
                {errors.name && (
                  <p className="error-text">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="label">Color *</label>
                <div className="flex gap-2 items-center">
                  <input
                    {...register("color")}
                    className="input flex-1"
                    placeholder="#FF5733"
                  />
                  <input
                    type="color"
                    value={watchedColor}
                    onChange={(e) =>
                      reset({ ...watch(), color: e.target.value })
                    }
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                    title="Pick color"
                  />
                  {/^#[0-9A-Fa-f]{6}$/.test(watchedColor) && (
                    <div
                      className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm"
                      style={{ backgroundColor: watchedColor }}
                    />
                  )}
                </div>
                {errors.color && (
                  <p className="error-text">{errors.color.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <input
                {...register("description")}
                className="input"
                placeholder="Optional description"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Run mutation
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left: results table ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
                placeholder="Search — updates the GraphQL query live…"
              />
            </div>
            <button
              onClick={fetchTags}
              className="btn-secondary"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {error && <ErrorAlert message={error} />}

          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="w-8 h-8 text-purple-500" />
              </div>
            ) : !data?.items.length ? (
              <EmptyState message="No tags found" icon={Braces} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tag
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    {isFullAccess && (
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((tag) => (
                    <tr
                      key={tag.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <ColorBadge color={tag.color} name={tag.name} />
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                        {tag.description || (
                          <span className="text-gray-300 italic">
                            No description
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(tag.dateCreated).toLocaleDateString()}
                      </td>
                      {isFullAccess && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setDeleteId(tag.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete via deleteTag mutation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {data && data.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                <span>
                  {(page - 1) * 10 + 1}–
                  {Math.min(page * 10, data.totalCount)} of {data.totalCount}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(data.totalPages, p + 1))
                    }
                    disabled={page === data.totalPages}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: live query panel ──────────────────────────────────── */}
        <div className="space-y-4">
          {/* Active query */}
          <div className="card bg-gray-900 text-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Braces className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Active Query
              </span>
            </div>
            <pre className="text-xs font-mono text-green-300 whitespace-pre-wrap leading-relaxed">
              {queryPreview}
            </pre>
          </div>

          {/* Create mutation preview */}
          {isFullAccess && (
            <div className="card bg-gray-900 text-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Braces className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Create Mutation
                </span>
              </div>
              <pre className="text-xs font-mono text-orange-300 whitespace-pre-wrap leading-relaxed">
                {createMutationPreview}
              </pre>
            </div>
          )}

          {/* Available operations */}
          <div className="card text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-700 mb-2">
              Available operations
            </p>
            <div className="space-y-1">
              <p>
                <span className="text-purple-500 font-mono">query</span>{" "}
                tags(search, page, pageSize)
              </p>
              <p>
                <span className="text-purple-500 font-mono">query</span>{" "}
                tag(id)
              </p>
              <p>
                <span className="text-purple-500 font-mono">query</span>{" "}
                searchTags(searchTerm)
              </p>
              {isFullAccess ? (
                <>
                  <p>
                    <span className="text-orange-500 font-mono">mutation</span>{" "}
                    createTag(name, color, description)
                  </p>
                  <p>
                    <span className="text-orange-500 font-mono">mutation</span>{" "}
                    updateTag(id, name, color, description)
                  </p>
                  <p>
                    <span className="text-orange-500 font-mono">mutation</span>{" "}
                    deleteTag(id)
                  </p>
                </>
              ) : (
                <p className="text-gray-400 italic text-xs mt-1">
                  Mutations require FullAccess role
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Tag"
        message="Delete this tag via GraphQL deleteTag mutation? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={deleting}
      />
    </div>
  );
}
