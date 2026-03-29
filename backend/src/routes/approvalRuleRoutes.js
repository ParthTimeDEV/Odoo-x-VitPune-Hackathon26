const express = require("express");

const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { listApprovalRules, getRuleWithSteps, createApprovalRule, updateApprovalRule, deleteApprovalRule } = require("../services/approvalRuleService");

const router = express.Router();

router.use(requireAuth, requireRole(["admin"]));

router.get("/", async (req, res, next) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const rules = await listApprovalRules(req.user.companyId, categoryId);
    res.json({ rules });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const rule = await getRuleWithSteps(Number(req.params.id), req.user.companyId);
    res.json({ rule });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const rule = await createApprovalRule(req.user.companyId, req.body);
    res.status(201).json({ rule });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const rule = await updateApprovalRule(req.user.companyId, Number(req.params.id), req.body);
    res.json({ rule });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await deleteApprovalRule(req.user.companyId, Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
