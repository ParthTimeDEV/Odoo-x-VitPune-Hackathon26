import api from "./axios";

export async function getUsers() {
  const { data } = await api.get("/api/admin/users");
  return data;
}

export async function createUser(payload) {
  const { data } = await api.post("/api/admin/users", payload);
  return data;
}

export async function assignRole(userId, role) {
  const { data } = await api.patch(`/api/admin/users/${userId}/role`, { role });
  return data;
}

export async function setManager(userId, managerId) {
  const { data } = await api.patch(`/api/admin/users/${userId}/manager`, { managerId });
  return data;
}

export async function getCategories() {
  const { data } = await api.get("/api/admin/categories");
  return data;
}

export async function createCategory(payload) {
  const { data } = await api.post("/api/admin/categories", payload);
  return data;
}
