import api from "./axios";

export async function getPendingApprovals() {
  const { data } = await api.get("/api/manager/approvals/pending");
  return data;
}

export async function actionApproval(expenseId, payload) {
  const { data } = await api.post(`/api/manager/approvals/${expenseId}/action`, payload);
  return data;
}
