import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import Layout from "./Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TagsListPage from "./pages/TagsListPage";
import TagFormPage from "./pages/TagFormPage";
import ImportPage from "./pages/ImportPage";
import SoapSearchPage from "./pages/SoapSearchPage";
import WeatherPage from "./pages/WeatherPage";
import GraphQLPage from "./pages/GraphQLPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function FullAccessRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "FullAccess") return <Navigate to="/tags" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: "10px", fontSize: "14px" },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/tags" replace />} />
          <Route path="tags" element={<TagsListPage />} />
          <Route
            path="tags/new"
            element={
              <FullAccessRoute>
                <TagFormPage />
              </FullAccessRoute>
            }
          />
          <Route
            path="tags/:id/edit"
            element={
              <FullAccessRoute>
                <TagFormPage />
              </FullAccessRoute>
            }
          />
          <Route
            path="import"
            element={
              <FullAccessRoute>
                <ImportPage />
              </FullAccessRoute>
            }
          />
          <Route path="soap" element={<SoapSearchPage />} />
          <Route path="weather" element={<WeatherPage />} />
          <Route path="graphql" element={<GraphQLPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/tags" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
