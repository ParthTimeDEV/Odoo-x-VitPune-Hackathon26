import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminApprovalRulesPage from "./pages/AdminApprovalRulesPage";
import ManagerApprovalsPage from "./pages/ManagerApprovalsPage";
import EmployeeExpensesPage from "./pages/EmployeeExpensesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/approval-rules"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminApprovalRulesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/approvals"
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <ManagerApprovalsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/expenses"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeExpensesPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
