import axios from "./axios";

export async function listApprovalRules(categoryId = null) {
  const params = categoryId ? { categoryId } : {};
  const response = await axios.get("/api/admin/approval-rules", { params });
  return response.data;
}

export async function getApprovalRule(ruleId) {
  const response = await axios.get(`/api/admin/approval-rules/${ruleId}`);
  return response.data;
}

export async function createApprovalRule(payload) {
  const response = await axios.post("/api/admin/approval-rules", payload);
  return response.data;
}

export async function updateApprovalRule(ruleId, payload) {
  const response = await axios.put(`/api/admin/approval-rules/${ruleId}`, payload);
  return response.data;
}

export async function deleteApprovalRule(ruleId) {
  const response = await axios.delete(`/api/admin/approval-rules/${ruleId}`);
  return response.data;
}

export async function getCategories() {
  const response = await axios.get("/api/admin/categories");
  return response.data;
}
