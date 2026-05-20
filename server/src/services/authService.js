const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function register({ name, email, password, role }) {
  const exists = await User.findOne({ email });
  if (exists) throw Object.assign(new Error("Email already in use"), { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role });
  return user;
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw Object.assign(new Error("Invalid credentials"), { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw Object.assign(new Error("Invalid credentials"), { status: 401 });

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return { token, user: user.toJSON() };
}

module.exports = { register, login };