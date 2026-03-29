require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("./pool");

async function initDb() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  await pool.query(schemaSql);
  console.log("Database schema initialized successfully.");
}

initDb()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error("Failed to initialize database schema.", error);
    await pool.end();
    process.exit(1);
  });
