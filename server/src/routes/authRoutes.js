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

module.exports = router;