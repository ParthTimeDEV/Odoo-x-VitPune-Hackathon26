import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getUsers } from "../api/adminApi";
import { getCategories, listApprovalRules, createApprovalRule, deleteApprovalRule } from "../api/approvalRuleApi";
import { useAuth } from "../context/AuthContext";

export default function AdminApprovalRulesPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    conditionMode: "sequential",
    percentageThreshold: 50,
    specificApproverId: "",
    isManagerFirst: true,
    approverIds: []
  });

  const managers = useMemo(
    () => users.filter((u) => u.role === "manager" || u.role === "admin"),
    [users]
  );

  async function loadData() {
    setError("");
    try {
      const [rulesRes, categoriesRes, usersRes] = await Promise.all([
        listApprovalRules(),
        getCategories(),
        getUsers()
      ]);
      setRules(rulesRes.rules || []);
      setCategories(categoriesRes.categories || []);
      setUsers(usersRes.users || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load data");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function onCreateRule(event) {
    event.preventDefault();
    setError("");

    if (!form.name || !form.approverIds.length) {
      setError("Rule name and at least one approver required");
      return;
    }

    if (["percentage", "hybrid"].includes(form.conditionMode) && !form.percentageThreshold) {
      setError("Percentage threshold required for percentage/hybrid mode");
      return;
    }

    if (["specific_user", "hybrid"].includes(form.conditionMode) && !form.specificApproverId) {
      setError("Specific approver is required for specific_user/hybrid mode");
      return;
    }

    try {
      await createApprovalRule({
        name: form.name,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        conditionMode: form.conditionMode,
        percentageThreshold: ["percentage", "hybrid"].includes(form.conditionMode)
          ? Number(form.percentageThreshold)
          : null,
        specificApproverId: ["specific_user", "hybrid"].includes(form.conditionMode)
          ? Number(form.specificApproverId)
          : null,
        isManagerFirst: form.isManagerFirst,
        approverIds: form.approverIds.map(Number)
      });
      setForm({
        name: "",
        categoryId: "",
        conditionMode: "sequential",
        percentageThreshold: 50,
        specificApproverId: "",
        isManagerFirst: true,
        approverIds: []
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create rule");
    }
  }

  async function onDeleteRule(ruleId) {
    if (!confirm("Delete this rule?")) return;
    setError("");
    try {
      await deleteApprovalRule(ruleId);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to delete rule");
    }
  }

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  const toggleApprover = (userId) => {
    setForm((prev) => ({
      ...prev,
      approverIds: prev.approverIds.includes(userId)
        ? prev.approverIds.filter((id) => id !== userId)
        : [...prev.approverIds, userId]
    }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Approval Rules</h1>
        <button className="rounded border px-3 py-1" onClick={onLogout}>
          Logout
        </button>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!showForm ? (
        <button
          className="rounded bg-slate-900 px-3 py-2 text-white"
          onClick={() => setShowForm(true)}
        >
          + Create Rule
        </button>
      ) : (
        <form className="space-y-3 rounded bg-white p-4 shadow" onSubmit={onCreateRule}>
          <h2 className="text-lg font-semibold">Create Approval Rule</h2>

          <input
            className="w-full rounded border p-2"
            placeholder="Rule name (e.g., Travel Expenses)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <select
            className="w-full rounded border p-2"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Apply to all categories (optional)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <div>
            <label className="block text-sm font-semibold mb-2">Approval Mode</label>
            <select
              className="w-full rounded border p-2"
              value={form.conditionMode}
              onChange={(e) => setForm({ ...form, conditionMode: e.target.value })}
            >
              <option value="sequential">Sequential (all must approve in order)</option>
              <option value="percentage">Percentage (X% of approvers must approve)</option>
              <option value="specific_user">Specific User (one approver can finalize)</option>
              <option value="hybrid">Hybrid (percentage OR specific user)</option>
            </select>
          </div>

          {["percentage", "hybrid"].includes(form.conditionMode) && (
            <div>
              <label className="block text-sm font-semibold mb-2">Percentage Threshold (%)</label>
              <input
                className="w-full rounded border p-2"
                type="number"
                min="1"
                max="100"
                value={form.percentageThreshold}
                onChange={(e) => setForm({ ...form, percentageThreshold: e.target.value })}
              />
            </div>
          )}

          {["specific_user", "hybrid"].includes(form.conditionMode) && (
            <div>
              <label className="block text-sm font-semibold mb-2">Specific Approver</label>
              <select
                className="w-full rounded border p-2"
                value={form.specificApproverId}
                onChange={(e) => setForm({ ...form, specificApproverId: e.target.value })}
              >
                <option value="">Select one manager/admin</option>
                {managers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.email} ({mgr.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isManagerFirst}
              onChange={(e) => setForm({ ...form, isManagerFirst: e.target.checked })}
            />
            <span className="text-sm">
              Add employee's direct manager as first approver automatically
            </span>
          </label>

          <div>
            <label className="block text-sm font-semibold mb-2">Select Approvers</label>
            <div className="border rounded p-3 max-h-48 overflow-y-auto space-y-2">
              {managers.length === 0 ? (
                <p className="text-sm text-gray-500">No managers/admins available</p>
              ) : (
                managers.map((mgr) => (
                  <label key={mgr.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.approverIds.includes(mgr.id)}
                      onChange={() => toggleApprover(mgr.id)}
                    />
                    <span className="text-sm">{mgr.email} ({mgr.role})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="rounded bg-slate-900 px-3 py-2 text-white">Create Rule</button>
            <button
              type="button"
              className="rounded border px-3 py-2"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">Existing Rules</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Name</th>
                <th className="p-2">Category</th>
                <th className="p-2">Mode</th>
                <th className="p-2">Threshold</th>
                <th className="p-2">Approvers</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b">
                  <td className="p-2">{rule.name}</td>
                  <td className="p-2">{rule.category_name || "All"}</td>
                  <td className="p-2 capitalize">{rule.condition_mode}</td>
                  <td className="p-2">
                    {rule.condition_mode === "percentage" || rule.condition_mode === "hybrid"
                      ? `${rule.percentage_threshold}%`
                      : "-"}
                  </td>
                  <td className="p-2 text-xs text-gray-600">
                    {rule.step_count || 0} approver(s)
                    {rule.is_manager_first && " + Manager"}
                    {rule.specific_approver_email ? ` | Specific: ${rule.specific_approver_email}` : ""}
                  </td>
                  <td className="p-2">
                    <button
                      className="rounded bg-red-600 px-2 py-1 text-white text-xs"
                      onClick={() => onDeleteRule(rule.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rules.length === 0 && (
            <p className="p-4 text-center text-gray-500">No rules created yet</p>
          )}
        </div>
      </section>
    </div>
  );
}
