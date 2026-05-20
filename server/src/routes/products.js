const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Producto = require("../models/Products");

// Listar todos los productos
router.get("/", auth, async (req, res) => {
  const productos = await Producto.find();
  res.json(productos);
});

// Crear producto - SOLO comerciante
router.post("/", auth, async (req, res) => {
  if (req.user.rol !== "comerciante")
    return res.status(403).json({ message: "Solo los comerciantes pueden crear productos" });

  const { nombre, descripcion } = req.body;
  const nuevo = new Producto({
    nombre,
    descripcion,
    usuario: req.user.id
  });
  await nuevo.save();
  res.status(201).json(nuevo);
});

// Actualizar producto - SOLO comerciante
router.put("/:id", auth, async (req, res) => {
  if (req.user.rol !== "comerciante")
    return res.status(403).json({ message: "Solo los comerciantes pueden actualizar productos" });

  const { nombre, descripcion } = req.body;
  const actualizado = await Producto.findByIdAndUpdate(
    req.params.id,
    { nombre, descripcion },
    { new: true }
  );
  if (!actualizado) return res.status(404).json({ message: "Producto no encontrado" });
  res.json(actualizado);
});

// Eliminar producto - SOLO comerciante
router.delete("/:id", auth, async (req, res) => {
  if (req.user.rol !== "comerciante")
    return res.status(403).json({ message: "Solo los comerciantes pueden eliminar productos" });

  const producto = await Producto.findById(req.params.id);
  if (!producto)
    return res.status(404).json({ message: "Producto no encontrado" });

  await Producto.findByIdAndDelete(req.params.id);
  res.json({ ok: true, message: "Eliminado correctamente" });
});

module.exports = router;