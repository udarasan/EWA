import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./routes/protected-route";
import { AdminAlertsPage } from "./pages/admin-alerts-page";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";
import { AdminEmployeesPage } from "./pages/admin-employees-page";
import { AdminFeedbackPage } from "./pages/admin-feedback-page";
import { EmployeeDashboardPage } from "./pages/employee-dashboard-page";
import { LandingPage } from "./pages/landing-page";
import { LoginPage } from "./pages/login-page";
import { NotFoundPage } from "./pages/not-found-page";
import { RegisterPage } from "./pages/register-page";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRole="employee">
            <EmployeeDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/feedback"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminFeedbackPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminEmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/alerts"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminAlertsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/pages/*" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
