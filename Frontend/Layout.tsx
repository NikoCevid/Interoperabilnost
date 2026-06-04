import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Tag,
  Upload,
  Search,
  Cloud,
  Braces,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { useAuthStore } from "./store/authStore";
import toast from "react-hot-toast";
import clsx from "clsx";

const navItems = [
  { to: "/tags", label: "Tags", icon: Tag, access: "all" },
  { to: "/import", label: "Import", icon: Upload, access: "FullAccess" },
  { to: "/soap", label: "SOAP Search", icon: Search, access: "all" },
  { to: "/weather", label: "Weather (gRPC)", icon: Cloud, access: "all" },
  { to: "/graphql", label: "GraphQL", icon: Braces, access: "all" },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ─── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">
                Tags Manager
              </h1>
              <p className="text-xs text-gray-500">Interoperability Demo</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems
            .filter(
              (item) => item.access === "all" || user?.role === item.access,
            )
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.username}
              </p>
              <div className="flex items-center gap-1">
                {user?.role === "FullAccess" ? (
                  <ShieldCheck className="w-3 h-3 text-green-500" />
                ) : (
                  <Eye className="w-3 h-3 text-yellow-500" />
                )}
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600
                       hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ─── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
