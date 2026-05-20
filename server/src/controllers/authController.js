const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "clave_secreta";

// Registrar
exports.register = async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ message: "Faltan datos" });

  const existe = await User.findOne({ email });
  if (existe) return res.status(400).json({ message: "Ya existe el usuario" });

  // NO hashees aquí. El modelo hará el hash automáticamente al guardar.
  const user = new User({
    nombre,
    email,
    password, // <--- debe ser password, el modelo lo hashea en pre-save
    rol: rol === "merchant" ? "merchant" : "customer"
  });

  await user.save();

  // Retorna token y usuario
  const token = jwt.sign(
    { id: user._id, email: user.email, rol: user.rol, nombre: user.nombre },
    secret,
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, user: { nombre: user.nombre, email: user.email, rol: user.rol } });
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Usuario o contraseña inválidos" });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ message: "Usuario o contraseña inválidos" });

  // Retorna token y usuario
  const token = jwt.sign(
    { id: user._id, email: user.email, rol: user.rol, nombre: user.nombre },
    secret,
    { expiresIn: "7d" }
  );

  res.json({ token, user: { nombre: user.nombre, email: user.email, rol: user.rol } });
};

// Datos de mi usuario (protegido)
exports.me = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};