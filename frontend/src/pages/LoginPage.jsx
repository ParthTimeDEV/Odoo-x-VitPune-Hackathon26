import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { changePassword, forgotPassword } from "../api/authApi";
import CountrySearchSelect from "../components/CountrySearchSelect";
import { useAuth } from "../context/AuthContext";

function redirectByRole(role, navigate) {
  if (role === "admin") {
    navigate("/admin/dashboard");
    return;
  }
  if (role === "manager") {
    navigate("/manager/approvals");
    return;
  }
  navigate("/employee/expenses");
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [countryName, setCountryName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [changeForm, setChangeForm] = useState({
    email: "",
    currentPassword: "",
    newPassword: ""
  });
  const [changeMessage, setChangeMessage] = useState("");
  const [changeLoading, setChangeLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login(form);
      redirectByRole(response.user.role, navigate);
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword(event) {
    event.preventDefault();
    setError("");
    setForgotMessage("");
    setForgotLoading(true);

    try {
      const response = await forgotPassword({ email: forgotEmail });
      setForgotMessage(response?.message || "Temporary password sent");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to send temporary password");
    } finally {
      setForgotLoading(false);
    }
  }

  async function onChangePassword(event) {
    event.preventDefault();
    setError("");
    setChangeMessage("");
    setChangeLoading(true);

    try {
      const response = await changePassword(changeForm);
      setChangeMessage(response?.message || "Password changed successfully");
      setChangeForm({ email: "", currentPassword: "", newPassword: "" });
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to change password");
    } finally {
      setChangeLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg bg-white p-6 shadow">
      <h1 className="mb-4 text-2xl font-bold">Login</h1>
      <div className="mb-4 rounded border p-3">
        <p className="mb-2 text-sm font-semibold">Country</p>
        <CountrySearchSelect
          value={countryName}
          onChange={setCountryName}
          placeholder="Search country"
          required={false}
        />
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          className="w-full rounded border p-2"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="w-full rounded border p-2"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded bg-slate-900 p-2 text-white" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <form className="mt-6 space-y-3 rounded border p-3" onSubmit={onForgotPassword}>
        <h2 className="text-sm font-semibold">Forgot Password</h2>
        <input
          className="w-full rounded border p-2"
          type="email"
          placeholder="Enter your email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          required
        />
        {forgotMessage ? <p className="text-xs text-emerald-600">{forgotMessage}</p> : null}
        <button className="w-full rounded border p-2" disabled={forgotLoading}>
          {forgotLoading ? "Sending..." : "Send Temporary Password"}
        </button>
      </form>
      <form className="mt-4 space-y-3 rounded border p-3" onSubmit={onChangePassword}>
        <h2 className="text-sm font-semibold">Change Password</h2>
        <input
          className="w-full rounded border p-2"
          type="email"
          placeholder="Email"
          value={changeForm.email}
          onChange={(e) => setChangeForm({ ...changeForm, email: e.target.value })}
          required
        />
        <input
          className="w-full rounded border p-2"
          type="password"
          placeholder="Current/Temporary Password"
          value={changeForm.currentPassword}
          onChange={(e) => setChangeForm({ ...changeForm, currentPassword: e.target.value })}
          required
        />
        <input
          className="w-full rounded border p-2"
          type="password"
          placeholder="New Password"
          value={changeForm.newPassword}
          onChange={(e) => setChangeForm({ ...changeForm, newPassword: e.target.value })}
          required
        />
        {changeMessage ? <p className="text-xs text-emerald-600">{changeMessage}</p> : null}
        <button className="w-full rounded border p-2" disabled={changeLoading}>
          {changeLoading ? "Changing..." : "Change Password"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        First-time setup? <Link className="text-blue-600" to="/signup">Create admin account</Link>
      </p>
    </div>
  );
}
