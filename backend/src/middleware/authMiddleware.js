const jwt = require("jsonwebtoken");
const { createHttpError } = require("./errorHandler");

function getTokenFromRequest(req) {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }

  return null;
}

function requireAuth(req, _res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return next(createHttpError("Authentication required", 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (_error) {
    return next(createHttpError("Invalid or expired token", 401));
  }
}

function requireRole(allowedRoles) {
  return function roleGuard(req, _res, next) {
    if (!req.user) {
      return next(createHttpError("Authentication required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(createHttpError("Forbidden", 403));
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
