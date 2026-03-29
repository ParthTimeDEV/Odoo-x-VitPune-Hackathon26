const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { signupFirstAdmin, login, forgotPassword, changePassword } = require("../services/authService");

const router = express.Router();

function writeAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

router.post("/signup", async (req, res, next) => {
  try {
    const result = await signupFirstAdmin(req.body);
    writeAuthCookie(res, result.token);
    res.status(201).json({
      user: result.user,
      company: result.company,
      token: result.token
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const result = await login(req.body);
    writeAuthCookie(res, result.token);
    res.json({
      user: result.user,
      token: result.token
    });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const result = await forgotPassword(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/change-password", async (req, res, next) => {
  try {
    const result = await changePassword(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
