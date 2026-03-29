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
     ),
     approval_counts AS (
       SELECT 
         ea.expense_id,
         COUNT(DISTINCT ea.approver_user_id) AS total_approvers,
         COUNT(DISTINCT CASE WHEN ea.status = 'approved' THEN ea.approver_user_id END) AS approved_count,
         ar.condition_mode,
         ar.percentage_threshold
       FROM expense_approvals ea
       LEFT JOIN approval_rules ar ON ea.rule_id = ar.id
       WHERE (ea.status = 'approved' OR ea.status = 'rejected' OR ea.status = 'pending')
       GROUP BY ea.expense_id, ar.condition_mode, ar.percentage_threshold
     )
     SELECT e.id,
            e.amount_submitted,
            e.currency_submitted,
            e.amount_company_currency,
            COALESCE(e.exchange_rate, 1.0)::NUMERIC(12,6) AS exchange_rate,
            e.description,
            e.expense_date,
            e.status,
            e.created_at,
            ec.name AS category_name,
            u.id AS employee_id,
            u.email AS employee_email,
            COALESCE(ac.total_approvers, 0)::INTEGER AS total_approvers,
            COALESCE(ac.approved_count, 0)::INTEGER AS approved_count,
            ac.condition_mode,
            ac.percentage_threshold
     FROM latest_actions la
     JOIN expenses e ON e.id = la.expense_id
     JOIN users u ON u.id = e.employee_id
     JOIN expense_categories ec ON ec.id = e.category_id
     LEFT JOIN approval_counts ac ON ac.expense_id = e.id
     WHERE la.approver_user_id = $1
       AND e.company_id = $2
       AND la.status = 'pending'
     ORDER BY e.created_at DESC`,
    [user.id, user.companyId]
  );

  return result.rows.map(row => ({
    ...row,
    exchange_rate: Number(row.exchange_rate) || 1.0,
    amount_company_currency: Number(row.amount_company_currency) || 0,
    total_approvers: Number(row.total_approvers) || 0,
    approved_count: Number(row.approved_count) || 0
  }));
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

  let rule = null;
  if (pending.rule_id) {
    const ruleResult = await pool.query(
      `SELECT condition_mode, percentage_threshold, specific_approver_id
       FROM approval_rules
       WHERE id = $1`,
      [pending.rule_id]
    );
    rule = ruleResult.rows[0] || null;
  }

  if (rule && rule.condition_mode === "sequential") {
    const nextStepResult = await pool.query(
      `WITH latest_actions AS (
         SELECT DISTINCT ON (ea.expense_id, ea.approver_user_id)
                ea.expense_id,
                ea.approver_user_id,
                ea.step_order,
                ea.status,
                ea.created_at
         FROM expense_approvals ea
         WHERE ea.expense_id = $1
         ORDER BY ea.expense_id, ea.approver_user_id, ea.created_at DESC
       )
       SELECT MIN(step_order) AS min_pending_step
       FROM latest_actions
       WHERE status = 'pending'`,
      [pending.expense_id]
    );

    const minPendingStep = Number(nextStepResult.rows[0]?.min_pending_step);
    if (Number.isFinite(minPendingStep) && pending.step_order !== minPendingStep) {
      throw createHttpError("This expense is waiting for earlier approvers", 409);
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Record the manager's action
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

    // If rejected, immediately update expense status
    if (status === "rejected") {
      await client.query(
        `UPDATE expenses SET status = 'rejected' WHERE id = $1 AND company_id = $2`,
        [pending.expense_id, user.companyId]
      );
      await client.query("COMMIT");
      client.release();
      return { success: true };
    }

    // If approved, check if approval chain is complete
    if (pending.rule_id) {
      const skipRemainingApprovals = async (skipComment) => {
        await client.query(
          `INSERT INTO expense_approvals
           (expense_id, rule_id, approver_user_id, step_order, status, comment, actioned_at)
           SELECT expense_id, rule_id, approver_user_id, step_order, 'skipped', $2, NOW()
           FROM (
             SELECT DISTINCT ON (approver_user_id) ea.expense_id, ea.rule_id, ea.approver_user_id, ea.step_order, ea.status
             FROM expense_approvals ea
             WHERE ea.expense_id = $1 AND ea.status = 'pending'
             ORDER BY ea.approver_user_id, ea.created_at DESC
           ) pending_approvals`,
          [pending.expense_id, skipComment]
        );
      };

      const markExpenseApproved = async () => {
        await client.query(
          `UPDATE expenses SET status = 'approved' WHERE id = $1 AND company_id = $2`,
          [pending.expense_id, user.companyId]
        );
      };

      const getApprovalStats = async () => {
        const approvalsResult = await client.query(
          `SELECT 
             COUNT(DISTINCT approver_user_id) AS total_approvers,
             COUNT(DISTINCT CASE WHEN status = 'approved' THEN approver_user_id END) AS approved_count
           FROM (
             SELECT DISTINCT ON (approver_user_id) approver_user_id, status
             FROM expense_approvals
             WHERE expense_id = $1
             ORDER BY approver_user_id, created_at DESC
           ) latest`,
          [pending.expense_id]
        );

        return {
          totalApprovers: Number(approvalsResult.rows[0]?.total_approvers || 0),
          approvedCount: Number(approvalsResult.rows[0]?.approved_count || 0)
        };
      };

      if (rule && rule.condition_mode === "percentage") {
        const { totalApprovers, approvedCount } = await getApprovalStats();
        const approvalPercentage = totalApprovers > 0 ? (approvedCount / totalApprovers) * 100 : 0;

        if (approvalPercentage >= Number(rule.percentage_threshold || 0)) {
          await skipRemainingApprovals("Auto-approved via percentage threshold");
          await markExpenseApproved();
        }
      } else if (rule && rule.condition_mode === "specific_user") {
        if (Number(rule.specific_approver_id) === Number(user.id)) {
          await skipRemainingApprovals("Auto-approved via specific approver");
          await markExpenseApproved();
        }
      } else if (rule && rule.condition_mode === "hybrid") {
        const { totalApprovers, approvedCount } = await getApprovalStats();
        const approvalPercentage = totalApprovers > 0 ? (approvedCount / totalApprovers) * 100 : 0;
        const thresholdMet = approvalPercentage >= Number(rule.percentage_threshold || 0);
        const specificUserApproved = Number(rule.specific_approver_id) === Number(user.id);

        if (thresholdMet || specificUserApproved) {
          await skipRemainingApprovals(
            specificUserApproved
              ? "Auto-approved via specific approver (hybrid mode)"
              : "Auto-approved via percentage threshold (hybrid mode)"
          );
          await markExpenseApproved();
        }
      } else if (rule && rule.condition_mode === "sequential") {
        // Sequential mode: check if all steps are approved
        const allActionsResult = await client.query(
          `SELECT 
             COUNT(DISTINCT step_order) AS total_steps,
             COUNT(DISTINCT CASE WHEN status = 'approved' THEN step_order END) AS approved_steps
           FROM (
             SELECT DISTINCT ON (step_order) step_order, status
             FROM expense_approvals
             WHERE expense_id = $1
             ORDER BY step_order, created_at DESC
           ) latest`,
          [pending.expense_id]
        );

        const totalSteps = Number(allActionsResult.rows[0]?.total_steps || 0);
        const approvedSteps = Number(allActionsResult.rows[0]?.approved_steps || 0);

        if (totalSteps > 0 && approvedSteps === totalSteps) {
          // All steps approved: mark expense as approved
          await markExpenseApproved();
        }
      }
    } else {
      // No rule (Phase 1): just approve the expense immediately
      await client.query(
        `UPDATE expenses SET status = 'approved' WHERE id = $1 AND company_id = $2`,
        [pending.expense_id, user.companyId]
      );
    }

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
