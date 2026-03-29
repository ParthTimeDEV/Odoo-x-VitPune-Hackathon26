const express = require("express");

const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const {
  getUsers,
  createUser,
  assignRole,
  setManager,
  listCategories,
  createCategory
} = require("../services/adminService");

const router = express.Router();

router.use(requireAuth, requireRole(["admin"]));

router.get("/users", async (req, res, next) => {
  try {
    const users = await getUsers(req.user.companyId);
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.post("/users", async (req, res, next) => {
  try {
    const user = await createUser(req.user.companyId, req.body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const user = await assignRole(req.user.companyId, Number(req.params.id), req.body.role);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/manager", async (req, res, next) => {
  try {
    const user = await setManager(
      req.user.companyId,
      Number(req.params.id),
      Number(req.body.managerId)
    );
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.get("/categories", async (req, res, next) => {
  try {
    const categories = await listCategories(req.user.companyId);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

router.post("/categories", async (req, res, next) => {
  try {
    const category = await createCategory(req.user.companyId, req.body);
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
