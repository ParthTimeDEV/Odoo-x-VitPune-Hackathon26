import api from "./axios";

export async function getEmployeeCategories() {
  const { data } = await api.get("/api/employee/categories");
  return data;
}

export async function submitExpense(payload) {
  const { data } = await api.post("/api/employee/expenses", payload);
  return data;
}

export async function getMyExpenses() {
  const { data } = await api.get("/api/employee/expenses");
  return data;
}
