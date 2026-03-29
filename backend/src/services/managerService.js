const pool = require("../db/pool");
const { createHttpError } = require("../middleware/errorHandler");

async function getPendingExpensesForManager(user) {
  const result = await pool.query(
    `WITH latest_actions AS (
       SELECT DISTINCT ON (ea.expense_id, ea.approver_user_id)
              ea.expense_id,
              ea.approver_user_id,
              ea.status,
              ea.created_at
       FROM expense_approvals ea
       ORDER BY ea.expense_id, ea.approver_user_id, ea.created_at DESC
     )
     SELECT e.id,
            e.amount_submitted,
            e.currency_submitted,
            e.amount_company_currency,
            e.description,
            e.expense_date,
            e.status,
            e.created_at,
            ec.name AS category_name,
            u.id AS employee_id,
            u.email AS employee_email
     FROM latest_actions la
     JOIN expenses e ON e.id = la.expense_id
     JOIN users u ON u.id = e.employee_id
     JOIN expense_categories ec ON ec.id = e.category_id
     WHERE la.approver_user_id = $1
       AND e.company_id = $2
       AND la.status = 'pending'
     ORDER BY e.created_at DESC`,
    [user.id, user.companyId]
  );

  return result.rows;
}

async function actionExpense(user, expenseId, payload) {
  const { status, comment } = payload;

  if (!["approved", "rejected"].includes(status)) {
    throw createHttpError("status must be approved or rejected", 400);
  }

  const pendingResult = await pool.query(
    `WITH latest_actions AS (
       SELECT DISTINCT ON (ea.expense_id, ea.approver_user_id)
              ea.id,
              ea.expense_id,
              ea.approver_user_id,
              ea.step_order,
              ea.rule_id,
              ea.status,
              ea.created_at
       FROM expense_approvals ea
       ORDER BY ea.expense_id, ea.approver_user_id, ea.created_at DESC
     )
     SELECT la.id, la.expense_id, la.approver_user_id, la.step_order, la.rule_id
     FROM latest_actions la
     JOIN expenses e ON e.id = la.expense_id
     WHERE la.expense_id = $1
       AND la.approver_user_id = $2
       AND e.company_id = $3
       AND la.status = 'pending'`,
    [expenseId, user.id, user.companyId]
  );

  const pending = pendingResult.rows[0];
  if (!pending) {
    throw createHttpError("No pending approval found for this expense", 404);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO expense_approvals
       (expense_id, rule_id, approver_user_id, step_order, status, comment, actioned_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        pending.expense_id,
        pending.rule_id,
        user.id,
        pending.step_order,
        status,
        comment || null
      ]
    );

    await client.query(
      `UPDATE expenses
       SET status = $1
       WHERE id = $2 AND company_id = $3`,
      [status, pending.expense_id, user.companyId]
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getPendingExpensesForManager,
  actionExpense
};
