import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { actionApproval, getPendingApprovals } from "../api/managerApi";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

export default function ManagerApprovalsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [commentById, setCommentById] = useState({});

  async function loadData() {
    setError("");
    try {
      const response = await getPendingApprovals();
      setExpenses(response.expenses || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load pending approvals");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function onAction(expenseId, status) {
    setError("");
    try {
      await actionApproval(expenseId, {
        status,
        comment: commentById[expenseId] || ""
      });
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to submit action");
    }
  }

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manager Approvals</h1>
        <button className="rounded border px-3 py-1" onClick={onLogout}>Logout</button>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">Pending Expenses</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Employee</th>
                <th className="p-2">Category</th>
                <th className="p-2">Company Currency Amount</th>
                <th className="p-2">Date</th>
                <th className="p-2">Status</th>
                <th className="p-2">Comment</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b align-top">
                  <td className="p-2">{expense.employee_email}</td>
                  <td className="p-2">{expense.category_name}</td>
                  <td className="p-2">{expense.amount_company_currency}</td>
                  <td className="p-2">{expense.expense_date?.slice(0, 10)}</td>
                  <td className="p-2">
                    <StatusBadge status={expense.status} />
                  </td>
                  <td className="p-2">
                    <input
                      className="w-full rounded border p-1"
                      placeholder="Optional comment"
                      value={commentById[expense.id] || ""}
                      onChange={(e) =>
                        setCommentById((prev) => ({
                          ...prev,
                          [expense.id]: e.target.value
                        }))
                      }
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        className="rounded bg-emerald-600 px-2 py-1 text-white"
                        onClick={() => onAction(expense.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded bg-red-600 px-2 py-1 text-white"
                        onClick={() => onAction(expense.id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
