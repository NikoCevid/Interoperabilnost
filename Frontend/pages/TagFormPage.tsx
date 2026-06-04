import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { tagService } from "../services/tagService";
import { PageHeader, Spinner, ErrorAlert } from "../components/ui";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #FF5733)"),
  description: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

export default function TagFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: "#3B82F6" },
  });

  const watchedColor = watch("color");

  // Load existing tag for edit
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    tagService
      .getById(id)
      .then((tag) =>
        reset({
          name: tag.name,
          color: tag.color,
          description: tag.description ?? "",
        }),
      )
      .catch(() => setFetchError("Failed to load tag"))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await tagService.update(id!, data);
        toast.success("Tag updated successfully");
      } else {
        await tagService.create(data);
        toast.success("Tag created successfully");
      }
      navigate("/tags");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Operation failed";
      toast.error(msg);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8 text-blue-500" />
      </div>
    );

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit Tag" : "New Tag"}
        subtitle={isEdit ? "Update tag details" : "Create a new tag"}
      />

      {fetchError && <ErrorAlert message={fetchError} />}

      <div className="max-w-lg">
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              <div className="flex gap-3 items-center">
                <input
                  {...register("color")}
                  className="input flex-1"
                  placeholder="#FF5733"
                />
                <input
                  type="color"
                  value={watchedColor}
                  onChange={(e) => reset({ ...watch(), color: e.target.value })}
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

            <div>
              <label className="label">Description</label>
              <textarea
                {...register("description")}
                rows={3}
                className="input resize-none"
                placeholder="Optional description…"
              />
              {errors.description && (
                <p className="error-text">{errors.description.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/tags")}
                className="btn-secondary"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <Spinner className="w-4 h-4" />
                ) : isEdit ? (
                  "Update Tag"
                ) : (
                  "Create Tag"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
