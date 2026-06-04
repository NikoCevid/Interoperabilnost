import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  RefreshCw,
  Tag as TagIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { tagService } from "../services/tagService";
import { useAuthStore } from "../store/authStore";
import type { Tag, PagedResult } from "../types";
import {
  PageHeader,
  ColorBadge,
  EmptyState,
  Spinner,
  ConfirmDialog,
  ErrorAlert,
} from "../components/ui";

export default function TagsListPage() {
  const { user } = useAuthStore();
  const isFullAccess = user?.role === "FullAccess";

  const [data, setData] = useState<PagedResult<Tag> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await tagService.getAll({ search, page, pageSize: 10 });
      setData(result);
    } catch {
      setError("Failed to load tags");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Debounce search
  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await tagService.delete(deleteId);
      toast.success("Tag deleted");
      setDeleteId(null);
      fetchTags();
    } catch {
      toast.error("Failed to delete tag");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tags"
        subtitle="Manage your space tags"
        action={
          isFullAccess ? (
            <Link to="/tags/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              New Tag
            </Link>
          ) : undefined
        }
      />

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
            placeholder="Search tags by name or description…"
          />
        </div>
        <button onClick={fetchTags} className="btn-secondary" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-8 h-8 text-blue-500" />
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            message="No tags found. Create your first tag!"
            icon={TagIcon}
          />
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
                <tr key={tag.id} className="hover:bg-gray-50 transition-colors">
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
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/tags/${tag.id}/edit`}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteId(tag.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {(page - 1) * 10 + 1}–
              {Math.min(page * 10, data.totalCount)} of {data.totalCount} tags
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
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Tag"
        message="Are you sure you want to delete this tag? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={deleting}
      />
    </div>
  );
}
