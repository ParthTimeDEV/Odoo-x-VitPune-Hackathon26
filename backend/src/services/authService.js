const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const pool = require("../db/pool");
const { createHttpError } = require("../middleware/errorHandler");
const { getCurrencyCodeForCountry } = require("./currencyService");
const { sendTemporaryPasswordEmail } = require("./emailService");

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      companyId: user.company_id,
      role: user.role,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function signupFirstAdmin(payload) {
  const { companyName, countryName, name, email, password } = payload;

  if (!companyName || !countryName || !name || !email || !password) {
    throw createHttpError("companyName, countryName, name, email and password are required", 400);
  }

  const userCountResult = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  const userCount = userCountResult.rows[0]?.count || 0;
  if (userCount > 0) {
    throw createHttpError("Signup is disabled after first admin is created. Use admin user management.", 409);
  }

  const currencyCode = await getCurrencyCodeForCountry(countryName);
  const countryCode = countryName.trim().slice(0, 2).toUpperCase() || "NA";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const companyResult = await client.query(
      `INSERT INTO companies (name, country_code, currency_code)
       VALUES ($1, $2, $3)
       RETURNING id, name, country_code, currency_code`,
      [companyName.trim(), countryCode, currencyCode]
    );
    const company = companyResult.rows[0];

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (company_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, company_id, name, email, role`,
      [company.id, name.trim(), email.trim().toLowerCase(), passwordHash]
    );
    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO expense_categories (company_id, name)
       VALUES ($1, 'General')
       ON CONFLICT (company_id, name) DO NOTHING`,
      [company.id]
    );

    await client.query("COMMIT");

    const token = signToken(user);
    return {
      user,
      company,
      token
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      throw createHttpError("Email already exists", 409);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function login(payload) {
  const { email, password } = payload;
  if (!email || !password) {
    throw createHttpError("email and password are required", 400);
  }

  const result = await pool.query(
    `SELECT u.id, u.company_id, u.name, u.email, u.password_hash, u.role,
            c.name AS company_name, c.currency_code AS company_currency
     FROM users u
     JOIN companies c ON c.id = u.company_id
     WHERE u.email = $1`,
    [email.trim().toLowerCase()]
  );

  const userRow = result.rows[0];
  if (!userRow) {
    throw createHttpError("Invalid credentials", 401);
  }

  const isMatch = await bcrypt.compare(password, userRow.password_hash);
  if (!isMatch) {
    throw createHttpError("Invalid credentials", 401);
  }

  const user = {
    id: userRow.id,
    company_id: userRow.company_id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role
  };

  const token = signToken(user);
  return {
    user: {
      ...user,
      company_name: userRow.company_name,
      company_currency: userRow.company_currency
    },
    token
  };
}

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

async function forgotPassword(payload) {
  const email = payload?.email?.trim()?.toLowerCase();
  if (!email) {
    throw createHttpError("email is required", 400);
  }

  const userResult = await pool.query(
    `SELECT id, name, email
     FROM users
     WHERE email = $1`,
    [email]
  );

  const user = userResult.rows[0];
  if (!user) {
    return {
      success: true,
      message: "If the email exists, a temporary password has been sent."
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  await pool.query(
    `UPDATE users
     SET password_hash = $1
     WHERE id = $2`,
    [passwordHash, user.id]
  );

  await sendTemporaryPasswordEmail({
    toEmail: user.email,
    userName: user.name,
    tempPassword: temporaryPassword
  });

  return {
    success: true,
    message: "A temporary password has been sent to your email."
  };
}

async function changePassword(payload) {
  const email = payload?.email?.trim()?.toLowerCase();
  const currentPassword = payload?.currentPassword;
  const newPassword = payload?.newPassword;

  if (!email || !currentPassword || !newPassword) {
    throw createHttpError("email, currentPassword and newPassword are required", 400);
  }

  if (newPassword.length < 8) {
    throw createHttpError("newPassword must be at least 8 characters", 400);
  }

  const userResult = await pool.query(
    `SELECT id, password_hash
     FROM users
     WHERE email = $1`,
    [email]
  );

  const user = userResult.rows[0];
  if (!user) {
    throw createHttpError("Invalid credentials", 401);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    throw createHttpError("Invalid credentials", 401);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users
     SET password_hash = $1
     WHERE id = $2`,
    [newPasswordHash, user.id]
  );

  return {
    success: true,
    message: "Password changed successfully"
  };
}

module.exports = {
  signupFirstAdmin,
  login,
  forgotPassword,
  changePassword
};
