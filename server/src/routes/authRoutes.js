const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const auth = require("../middlewares/auth");

router.post("/register", async (req, res) => {
  try {
    let { rol, ...rest } = req.body;
    
    // Mapear roles del español al inglés
    if (rol === "cliente") rol = "customer";
    if (rol === "comerciante") rol = "merchant";
    
    const u = new User({ ...rest, rol });
    await u.save();
    res.status(201).json({ message: "Registrado con éxito" });
  } catch (err) {
    console.error("Error en registro:", err);
    res.status(400).json({ message: "Error al registrar", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    
    const token = jwt.sign(
      { id: user._id, rol: user.rol, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        direccion: user.direccion,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener usuario" });
  }
});

module.exports = router;