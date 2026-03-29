const pool = require("../db/pool");
const { createHttpError } = require("../middleware/errorHandler");
const { getExchangeRate } = require("./currencyService");

async function listCompanyCategories(companyId) {
  const result = await pool.query(
    `SELECT id, company_id, name
     FROM expense_categories
     WHERE company_id = $1
     ORDER BY name ASC`,
    [companyId]
  );
  return result.rows;
}

async function submitExpense(user, payload) {
  const { categoryId, amount, currency, description, expenseDate } = payload;

  if (!categoryId || !amount || !expenseDate) {
    throw createHttpError("categoryId, amount and expenseDate are required", 400);
  }

  const employeeResult = await pool.query(
    `SELECT u.id, u.manager_id, c.currency_code
     FROM users u
     JOIN companies c ON c.id = u.company_id
     WHERE u.id = $1 AND u.company_id = $2`,
    [user.id, user.companyId]
  );

  const employee = employeeResult.rows[0];
  if (!employee) {
    throw createHttpError("Employee not found in your company", 404);
  }
  if (!employee.manager_id) {
    throw createHttpError("Employee has no manager assigned", 400);
  }

  const categoryResult = await pool.query(
    `SELECT id FROM expense_categories WHERE id = $1 AND company_id = $2`,
    [categoryId, user.companyId]
  );
  if (!categoryResult.rows[0]) {
    throw createHttpError("Invalid category for your company", 400);
  }

  const submittedAmount = Number(amount);
  if (!Number.isFinite(submittedAmount) || submittedAmount <= 0) {
    throw createHttpError("amount must be a positive number", 400);
  }

  const currencySubmitted = (currency || employee.currency_code || "USD").toUpperCase();
  const companyCurrency = employee.currency_code || "USD";

  let exchangeRate = 1.0;
  let amountCompanyCurrency = submittedAmount;

  if (currencySubmitted !== companyCurrency) {
    exchangeRate = await getExchangeRate(currencySubmitted, companyCurrency);
    amountCompanyCurrency = submittedAmount * exchangeRate;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const expenseResult = await client.query(
      `INSERT INTO expenses
       (company_id, employee_id, category_id, amount_submitted, currency_submitted,
        amount_company_currency, exchange_rate, description, expense_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING id, company_id, employee_id, category_id, amount_submitted,
                 currency_submitted, amount_company_currency, exchange_rate, description, expense_date, status, created_at`,
      [
        user.companyId,
        user.id,
        categoryId,
        submittedAmount,
        currencySubmitted,
        amountCompanyCurrency,
        exchangeRate,
        description || "",
        expenseDate
      ]
    );

    const expense = expenseResult.rows[0];

    // Look up approval rule for this category
    const ruleResult = await client.query(
      `SELECT id, is_manager_first, condition_mode, percentage_threshold, specific_approver_id
       FROM approval_rules
       WHERE company_id = $1
         AND (category_id = $2 OR category_id IS NULL)
       ORDER BY CASE WHEN category_id = $2 THEN 0 ELSE 1 END, created_at DESC
       LIMIT 1`,
      [user.companyId, categoryId]
    );

    const rule = ruleResult.rows[0];

    if (rule) {
      // Rule exists: build approval chain
      const stepsResult = await client.query(
        `SELECT approver_user_id, step_order
         FROM approval_rule_steps
         WHERE rule_id = $1
         ORDER BY step_order ASC`,
        [rule.id]
      );

      const approvers = [];
      const seenApprovers = new Set();

      const pushApprover = (userId, stepOrder) => {
        const numericUserId = Number(userId);
        if (!numericUserId || seenApprovers.has(numericUserId)) {
          return;
        }
        seenApprovers.add(numericUserId);
        approvers.push({ userId: numericUserId, stepOrder });
      };

      // If is_manager_first, add employee's direct manager at step 0
      if (rule.is_manager_first) {
        pushApprover(employee.manager_id, 0);
      }

      // Add rule's configured approvers (offset step_order by 1 if manager_first)
      for (const step of stepsResult.rows) {
        pushApprover(step.approver_user_id, rule.is_manager_first ? step.step_order + 1 : step.step_order);
      }

      // Ensure specific approver is always in the pending list for specific_user/hybrid.
      if (rule.specific_approver_id) {
        pushApprover(rule.specific_approver_id, approvers.length);
      }

      // Insert approval records
      for (const approver of approvers) {
        await client.query(
          `INSERT INTO expense_approvals
           (expense_id, rule_id, approver_user_id, step_order, status)
           VALUES ($1, $2, $3, $4, 'pending')`,
          [expense.id, rule.id, approver.userId, approver.stepOrder]
        );
      }
    } else {
      // No rule: Phase 1 behavior (just direct manager)
      await client.query(
        `INSERT INTO expense_approvals
         (expense_id, rule_id, approver_user_id, step_order, status)
         VALUES ($1, NULL, $2, 0, 'pending')`,
        [expense.id, employee.manager_id]
      );
    }

    await client.query("COMMIT");
    return expense;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getEmployeeExpenses(user) {
  const result = await pool.query(
    `SELECT e.id, e.company_id, e.employee_id, e.category_id, ec.name AS category_name,
            e.amount_submitted, e.currency_submitted, e.amount_company_currency, 
            COALESCE(e.exchange_rate, 1.0)::NUMERIC(12,6) AS exchange_rate,
            e.description, e.expense_date, e.status, e.created_at
     FROM expenses e
     JOIN expense_categories ec ON ec.id = e.category_id
     WHERE e.company_id = $1 AND e.employee_id = $2
     ORDER BY e.created_at DESC`,
    [user.companyId, user.id]
  );

  return result.rows.map(row => ({
    ...row,
    exchange_rate: Number(row.exchange_rate) || 1.0,
    amount_company_currency: Number(row.amount_company_currency) || 0
  }));
}

module.exports = {
  listCompanyCategories,
  submitExpense,
  getEmployeeExpenses
};
