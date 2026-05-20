const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const auth = require("../middlewares/auth");

router.post("/register", async (req, res) => {
  try {
    const u = new User(req.body);
    await u.save();
    res.status(201).json({ message: "Registrado con éxito" });
  } catch (err) {
    res.status(400).json({ message: "Error", error: err });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Credenciales inválidas" });
  }
  const token = jwt.sign({ id: user._id, rol: user.rol, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

router.get("/me", auth, (req, res) => {
  res.json(req.user);
});

module.exports = router;