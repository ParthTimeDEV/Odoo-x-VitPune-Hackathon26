const express = require("express");

const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const {
  listCompanyCategories,
  submitExpense,
  getEmployeeExpenses
} = require("../services/expenseService");

const router = express.Router();

router.use(requireAuth, requireRole(["employee"]));

router.get("/categories", async (req, res, next) => {
  try {
    const categories = await listCompanyCategories(req.user.companyId);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

router.post("/expenses", async (req, res, next) => {
  try {
    const expense = await submitExpense(req.user, req.body);
    res.status(201).json({ expense });
  } catch (error) {
    next(error);
  }
});

router.get("/expenses", async (req, res, next) => {
  try {
    const expenses = await getEmployeeExpenses(req.user);
    res.json({ expenses });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
