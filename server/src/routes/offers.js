const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Oferta = require("../models/offer");
const Producto = require("../models/Products"); // nombre correcto aquí

// Listar todas las ofertas con producto
router.get("/", auth, async (req, res) => {
  const ofertas = await Oferta.find().populate("producto");
  res.json(ofertas);
});

// Crear oferta - SOLO comerciante
router.post("/", auth, async (req, res) => {
  if (req.user.rol !== "comerciante")
    return res.status(403).json({ message: "Solo comerciantes pueden crear ofertas" });

  const { titulo, descripcion, descuento, producto } = req.body;
  if (!titulo || !descripcion || !descuento || !producto) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  // verifica que el producto exista, y que es del comerciante
  const prod = await Producto.findById(producto);
  if (!prod) return res.status(404).json({ message: "Producto no encontrado" });
  // (Opcional) añade aquí validación para que solo se puedan hacer ofertas de productos del usuario

  const nueva = new Oferta({
    titulo,
    descripcion,
    descuento,
    producto,
    usuario: req.user.id
  });
  await nueva.save();
  res.status(201).json(nueva);
});

module.exports = router;