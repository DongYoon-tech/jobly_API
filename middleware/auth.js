
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const ExpressError = require("../helpers/ExpressError");

function authentication(req, res, next) {
  try {
    const tokenFromBody = req.body._token || req.query._token;

    let token = jwt.verify(tokenFromBody, SECRET_KEY);
    res.locals.username = token.username;
    return next();
  } catch (err) {
    return next(new ExpressError("Authentication required", 401));
  }
}

function isAdmin(req, res, next) {
  try {
    const tokenFromBody = req.body._token;

    let token = jwt.verify(tokenFromBody, SECRET_KEY);
    res.locals.username = token.username;

    if (token.is_admin) {
      return next();
    }

    throw new ExpressError("Invalid access", 401);
  } catch (err) {
    return next(err);
  }
}

function ensureCorrectUser(req, res, next) {
  try {
    const tokenFromBody = req.body._token;

    let token = jwt.verify(tokenFromBody, SECRET_KEY);
    res.locals.username = token.username;

    if (token.username === req.params.username) {
      return next();
    }

    throw new ExpressError("Unauthorized User", 401);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
    authentication,
    isAdmin,
    ensureCorrectUser
};
