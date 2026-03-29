const pool = require("../db/pool");
const { createHttpError } = require("../middleware/errorHandler");

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
  const amountCompanyCurrency = submittedAmount;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const expenseResult = await client.query(
      `INSERT INTO expenses
       (company_id, employee_id, category_id, amount_submitted, currency_submitted,
        amount_company_currency, description, expense_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING id, company_id, employee_id, category_id, amount_submitted,
                 currency_submitted, amount_company_currency, description, expense_date, status, created_at`,
      [
        user.companyId,
        user.id,
        categoryId,
        submittedAmount,
        currencySubmitted,
        amountCompanyCurrency,
        description || "",
        expenseDate
      ]
    );

    const expense = expenseResult.rows[0];

    await client.query(
      `INSERT INTO expense_approvals
       (expense_id, rule_id, approver_user_id, step_order, status, comment, actioned_at)
       VALUES ($1, NULL, $2, 0, 'pending', NULL, NULL)`,
      [expense.id, employee.manager_id]
    );

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
            e.description, e.expense_date, e.status, e.created_at
     FROM expenses e
     JOIN expense_categories ec ON ec.id = e.category_id
     WHERE e.company_id = $1 AND e.employee_id = $2
     ORDER BY e.created_at DESC`,
    [user.companyId, user.id]
  );

  return result.rows;
}

module.exports = {
  listCompanyCategories,
  submitExpense,
  getEmployeeExpenses
};
