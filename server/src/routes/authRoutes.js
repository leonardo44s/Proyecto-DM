const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Store = require("../models/Store");
const jwt = require("jsonwebtoken");
const auth = require("../middlewares/auth");
const { geocodeAddress, normalizeAddress } = require("../utils/geocoder");

router.post("/register", async (req, res) => {
  try {
    let { rol, nombreTienda, coords, ...rest } = req.body;
    
    // Mapear roles del español al inglés
    if (rol === "cliente") rol = "customer";
    if (rol === "comerciante") rol = "merchant";
    
    if (rest.direccion) {
      rest.direccion = normalizeAddress(rest.direccion);
    }
    
    const u = new User({ ...rest, rol });
    await u.save();

    if (rol === "merchant") {
      // Crear la tienda asociada al comerciante
      const storeName = nombreTienda || `Tienda de ${u.nombre}`;
      const storeAddress = u.direccion || "Dirección no especificada";
      let storeCoords = [-76.5226, 3.4516]; // Cali, Colombia por defecto [lng, lat]
      
      if (coords && Array.isArray(coords) && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        storeCoords = [Number(coords[0]), Number(coords[1])];
      } else {
        storeCoords = await geocodeAddress(storeAddress);
      }

      const store = new Store({
        nombre: storeName,
        direccion: storeAddress,
        coords: {
          type: "Point",
          coordinates: storeCoords
        },
        usuario: u._id
      });
      await store.save();
    }

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

router.put("/profile", auth, async (req, res) => {
  try {
    const { nombre, phone, direccion, coords } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (phone !== undefined) updates.phone = phone;
    if (direccion !== undefined) updates.direccion = normalizeAddress(direccion);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Si es comerciante, también actualizamos su tienda
    if (user.rol === "merchant") {
      const store = await Store.findOne({ usuario: user._id });
      if (store) {
        if (nombre !== undefined) store.nombre = `Tienda de ${nombre}`;
        if (direccion !== undefined) {
          store.direccion = direccion;
          
          let storeCoords;
          if (coords && Array.isArray(coords) && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            storeCoords = [Number(coords[0]), Number(coords[1])];
          } else {
            storeCoords = await geocodeAddress(direccion);
          }
          store.coords = {
            type: "Point",
            coordinates: storeCoords
          };
        }
        await store.save();
      }
    }

    res.json(user);
  } catch (err) {
    console.error("Error al actualizar perfil:", err);
    res.status(500).json({ message: "Error interno al actualizar perfil" });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "El correo electrónico es obligatorio" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Por seguridad para evitar enumeración, devolvemos un mensaje genérico exitoso.
      return res.json({ message: "Si el correo está registrado, se enviará un código de verificación." });
    }

    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = code;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    const { sendResetEmail } = require("../utils/mailer");
    await sendResetEmail(user.email, code);

    res.json({ message: "Código de recuperación enviado al correo." });
  } catch (err) {
    console.error("Error en forgot-password:", err);
    res.status(500).json({ message: "Error al procesar la solicitud" });
  }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Código inválido o expirado" });
    }

    // Guardar nueva contraseña (activará el pre-save hook para hashing)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Contraseña restablecida con éxito." });
  } catch (err) {
    console.error("Error en reset-password:", err);
    res.status(500).json({ message: "Error al restablecer la contraseña" });
  }
});

module.exports = router;