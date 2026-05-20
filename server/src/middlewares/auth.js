// middlewares/auth.js

const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "clave_secreta";

module.exports = function(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ message: "No autorizado" });
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ message: "Token inválido" });
  }
};