import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Tag } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import { Spinner } from "../components/ui";

const schema = z.object({
  username: z.string().min(3, "At least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["ReadOnly", "FullAccess"]),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "ReadOnly" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data.username, data.email, data.password, data.role);
      toast.success("Account created!");
      navigate("/tags");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Registration failed";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg">
            <Tag className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create account</h1>
          <p className="mt-2 text-gray-500 text-sm">Join Tags Manager</p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Username</label>
              <input
                {...register("username")}
                className="input"
                placeholder="Choose a username"
              />
              {errors.username && (
                <p className="error-text">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="label">Email</label>
              <input
                {...register("email")}
                type="email"
                className="input"
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="error-text">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                {...register("password")}
                type="password"
                className="input"
                placeholder="Min. 8 characters"
              />
              {errors.password && (
                <p className="error-text">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="label">Role</label>
              <select {...register("role")} className="input">
                <option value="ReadOnly">Read Only</option>
                <option value="FullAccess">Full Access</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {isLoading ? <Spinner className="w-4 h-4" /> : "Create account"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
