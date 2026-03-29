import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getEmployeeCategories, getMyExpenses, submitExpense } from "../api/expenseApi";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

export default function EmployeeExpensesPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    categoryId: "",
    amount: "",
    currency: "",
    description: "",
    expenseDate: ""
  });

  async function loadData() {
    setError("");
    try {
      const [categoriesResponse, expensesResponse] = await Promise.all([
        getEmployeeCategories(),
        getMyExpenses()
      ]);
      setCategories(categoriesResponse.categories || []);
      setExpenses(expensesResponse.expenses || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load employee data");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      await submitExpense({
        categoryId: Number(form.categoryId),
        amount: Number(form.amount),
        currency: form.currency,
        description: form.description,
        expenseDate: form.expenseDate
      });
      setForm({ categoryId: "", amount: "", currency: "", description: "", expenseDate: "" });
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to submit expense");
    }
  }

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employee Expenses</h1>
        <button className="rounded border px-3 py-1" onClick={onLogout}>Logout</button>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <form className="space-y-3 rounded bg-white p-4 shadow" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold">Submit Expense</h2>
        <select
          className="w-full rounded border p-2"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          required
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          className="w-full rounded border p-2"
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <input
          className="w-full rounded border p-2"
          placeholder="Currency (optional)"
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })}
        />
        <input
          className="w-full rounded border p-2"
          type="date"
          value={form.expenseDate}
          onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
          required
        />
        <textarea
          className="w-full rounded border p-2"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button className="rounded bg-slate-900 px-3 py-2 text-white">Submit</button>
      </form>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">My Expenses</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Category</th>
                <th className="p-2">Submitted</th>
                <th className="p-2">Company Amt</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b">
                  <td className="p-2">{expense.expense_date?.slice(0, 10)}</td>
                  <td className="p-2">{expense.category_name}</td>
                  <td className="p-2">
                    {expense.amount_submitted} {expense.currency_submitted}
                  </td>
                  <td className="p-2">{expense.amount_company_currency}</td>
                  <td className="p-2">
                    <StatusBadge status={expense.status} />
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
