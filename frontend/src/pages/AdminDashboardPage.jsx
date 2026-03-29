import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  assignRole,
  createCategory,
  createUser,
  getCategories,
  getUsers,
  setManager
} from "../api/adminApi";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");

  const [newUser, setNewUser] = useState({ email: "", password: "", role: "employee", managerId: "" });
  const [newCategory, setNewCategory] = useState("");

  const managers = useMemo(() => users.filter((u) => u.role === "manager"), [users]);

  async function loadData() {
    setError("");
    try {
      const [usersResponse, categoriesResponse] = await Promise.all([getUsers(), getCategories()]);
      setUsers(usersResponse.users || []);
      setCategories(categoriesResponse.categories || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load admin data");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function onCreateUser(event) {
    event.preventDefault();
    setError("");
    try {
      await createUser({
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        managerId: newUser.managerId ? Number(newUser.managerId) : null
      });
      setNewUser({ email: "", password: "", role: "employee", managerId: "" });
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create user");
    }
  }

  async function onCreateCategory(event) {
    event.preventDefault();
    setError("");
    try {
      await createCategory({ name: newCategory });
      setNewCategory("");
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create category");
    }
  }

  async function onAssignRole(userId, role) {
    setError("");
    try {
      await assignRole(userId, role);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to assign role");
    }
  }

  async function onSetManager(userId, managerId) {
    setError("");
    try {
      await setManager(userId, Number(managerId));
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to set manager");
    }
  }

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button className="rounded border px-3 py-1" onClick={onLogout}>Logout</button>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="grid gap-6 md:grid-cols-2">
        <form className="space-y-3 rounded bg-white p-4 shadow" onSubmit={onCreateUser}>
          <h2 className="text-lg font-semibold">Create User</h2>
          <input
            className="w-full rounded border p-2"
            placeholder="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            required
          />
          <input
            className="w-full rounded border p-2"
            placeholder="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
          />
          <select
            className="w-full rounded border p-2"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className="w-full rounded border p-2"
            value={newUser.managerId}
            onChange={(e) => setNewUser({ ...newUser, managerId: e.target.value })}
          >
            <option value="">Optional manager</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.email}
              </option>
            ))}
          </select>
          <button className="rounded bg-slate-900 px-3 py-2 text-white">Create</button>
        </form>

        <form className="space-y-3 rounded bg-white p-4 shadow" onSubmit={onCreateCategory}>
          <h2 className="text-lg font-semibold">Create Expense Category</h2>
          <input
            className="w-full rounded border p-2"
            placeholder="Category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            required
          />
          <button className="rounded bg-slate-900 px-3 py-2 text-white">Add Category</button>
          <ul className="list-inside list-disc text-sm text-slate-700">
            {categories.map((category) => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ul>
        </form>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">ID</th>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">Manager</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="p-2">{user.id}</td>
                  <td className="p-2">{user.email}</td>
                  <td className="p-2">{user.role}</td>
                  <td className="p-2">{user.manager_id || "-"}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => onAssignRole(user.id, "employee")}
                      >
                        Employee
                      </button>
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => onAssignRole(user.id, "manager")}
                      >
                        Manager
                      </button>
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => onAssignRole(user.id, "admin")}
                      >
                        Admin
                      </button>
                      {managers.length > 0 ? (
                        <select
                          className="rounded border px-2 py-1"
                          defaultValue=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            onSetManager(user.id, e.target.value);
                          }}
                        >
                          <option value="">Set manager</option>
                          {managers
                            .filter((m) => m.id !== user.id)
                            .map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.email}
                              </option>
                            ))}
                        </select>
                      ) : null}
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
