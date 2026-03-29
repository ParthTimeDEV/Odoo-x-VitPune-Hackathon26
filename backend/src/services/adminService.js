const bcrypt = require("bcryptjs");

const pool = require("../db/pool");
const { createHttpError } = require("../middleware/errorHandler");

function validateRole(role) {
  const allowed = ["admin", "manager", "employee"];
  if (!allowed.includes(role)) {
    throw createHttpError("Invalid role", 400);
  }
}

async function getUsers(companyId) {
  const result = await pool.query(
    `SELECT id, company_id, email, role, manager_id, created_at
     FROM users
     WHERE company_id = $1
     ORDER BY id ASC`,
    [companyId]
  );
  return result.rows;
}

async function createUser(companyId, payload) {
  const { email, password, role, managerId } = payload;
  if (!email || !password || !role) {
    throw createHttpError("email, password and role are required", 400);
  }

  validateRole(role);

  if (managerId) {
    const managerResult = await pool.query(
      `SELECT id FROM users
       WHERE id = $1 AND company_id = $2 AND role = 'manager'`,
      [managerId, companyId]
    );

    if (!managerResult.rows[0]) {
      throw createHttpError("Manager not found in your company", 404);
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (company_id, email, password_hash, role, manager_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_id, email, role, manager_id, created_at`,
      [companyId, email.trim().toLowerCase(), passwordHash, role, managerId || null]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw createHttpError("Email already exists", 409);
    }
    throw error;
  }
}

async function assignRole(companyId, userId, role) {
  validateRole(role);

  const result = await pool.query(
    `UPDATE users
     SET role = $1
     WHERE id = $2 AND company_id = $3
     RETURNING id, company_id, email, role, manager_id`,
    [role, userId, companyId]
  );

  if (!result.rows[0]) {
    throw createHttpError("User not found in your company", 404);
  }

  return result.rows[0];
}

async function setManager(companyId, userId, managerId) {
  if (!managerId) {
    throw createHttpError("managerId is required", 400);
  }

  if (Number(userId) === Number(managerId)) {
    throw createHttpError("A user cannot be their own manager", 400);
  }

  const managerResult = await pool.query(
    `SELECT id FROM users
     WHERE id = $1 AND company_id = $2 AND role = 'manager'`,
    [managerId, companyId]
  );

  if (!managerResult.rows[0]) {
    throw createHttpError("Manager not found in your company", 404);
  }

  const userResult = await pool.query(
    `UPDATE users
     SET manager_id = $1
     WHERE id = $2 AND company_id = $3
     RETURNING id, company_id, email, role, manager_id`,
    [managerId, userId, companyId]
  );

  if (!userResult.rows[0]) {
    throw createHttpError("User not found in your company", 404);
  }

  return userResult.rows[0];
}

async function listCategories(companyId) {
  const result = await pool.query(
    `SELECT id, company_id, name
     FROM expense_categories
     WHERE company_id = $1
     ORDER BY name ASC`,
    [companyId]
  );
  return result.rows;
}

async function createCategory(companyId, payload) {
  const name = payload?.name?.trim();
  if (!name) {
    throw createHttpError("name is required", 400);
  }

  try {
    const result = await pool.query(
      `INSERT INTO expense_categories (company_id, name)
       VALUES ($1, $2)
       RETURNING id, company_id, name`,
      [companyId, name]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw createHttpError("Category already exists", 409);
    }
    throw error;
  }
}

module.exports = {
  getUsers,
  createUser,
  assignRole,
  setManager,
  listCategories,
  createCategory
};
