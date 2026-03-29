import api from "./axios";

export async function signup(payload) {
  const { data } = await api.post("/api/auth/signup", payload);
  return data;
}

export async function login(payload) {
  const { data } = await api.post("/api/auth/login", payload);
  return data;
}

export async function logout() {
  const { data } = await api.post("/api/auth/logout");
  return data;
}

export async function getMe() {
  const { data } = await api.get("/api/auth/me");
  return data;
}
