import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getMe, login as loginApi, logout as logoutApi, signup as signupApi } from "../api/authApi";

const AuthContext = createContext(null);

function extractRole(user, fallbackRole) {
  return user?.role || fallbackRole || null;
}

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getMe();
        const authUser = response.user;
        setUser(authUser);
        setRole(extractRole(authUser));
      } catch (_error) {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [token]);

  async function login(payload) {
    const response = await loginApi(payload);
    localStorage.setItem("token", response.token);
    setToken(response.token);
    setUser(response.user);
    setRole(extractRole(response.user));
    return response;
  }

  async function signup(payload) {
    const response = await signupApi(payload);
    localStorage.setItem("token", response.token);
    setToken(response.token);
    setUser(response.user);
    setRole(extractRole(response.user));
    return response;
  }

  async function logout() {
    try {
      await logoutApi();
    } catch (_error) {
      // Best-effort server-side logout.
    }

    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setRole(null);
  }

  const value = useMemo(
    () => ({
      user,
      role,
      token,
      loading,
      login,
      signup,
      logout
    }),
    [user, role, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthContextProvider");
  }
  return context;
}
