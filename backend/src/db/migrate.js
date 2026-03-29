require("dotenv").config();

const pool = require("./pool");

async function migrate() {
  try {
    console.log("Running database migration...");
    
    await pool.query(
      `ALTER TABLE expenses
       ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6)`
    );

    await pool.query(
      `ALTER TABLE users
       ADD COLUMN IF NOT EXISTS name VARCHAR(150)`
    );

    await pool.query(
      `UPDATE users
       SET name = INITCAP(SPLIT_PART(email, '@', 1))
       WHERE name IS NULL OR BTRIM(name) = ''`
    );

    await pool.query(
      `ALTER TABLE users
       ALTER COLUMN name SET NOT NULL`
    );
    
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
