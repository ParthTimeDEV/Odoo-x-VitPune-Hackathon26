const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const approvalRuleRoutes = require("./routes/approvalRuleRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const managerRoutes = require("./routes/managerRoutes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

const configuredOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowOrigins = Array.from(
  new Set([...configuredOrigins, "http://localhost:5173", "http://localhost:5174"])
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/approval-rules", approvalRuleRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/manager", managerRoutes);

app.use(errorHandler);

module.exports = app;
