const express = require("express");

const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const {
  getPendingExpensesForManager,
  actionExpense
} = require("../services/managerService");

const router = express.Router();

router.use(requireAuth, requireRole(["manager"]));

router.get("/approvals/pending", async (req, res, next) => {
  try {
    const expenses = await getPendingExpensesForManager(req.user);
    res.json({ expenses });
  } catch (error) {
    next(error);
  }
});

router.post("/approvals/:expenseId/action", async (req, res, next) => {
  try {
    const result = await actionExpense(req.user, Number(req.params.expenseId), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
