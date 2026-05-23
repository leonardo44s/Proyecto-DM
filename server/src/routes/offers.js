const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Offer = require("../models/offer");
const Product = require("../models/Products");

// Listar todas las ofertas
router.get("/", auth, async (req, res) => {
  const filter = req.user.rol === "merchant"
    ? { usuario: req.user.id }
    : {};
  const ofertas = await Offer.find(filter).populate({ path: "producto", populate: { path: "tienda" } });
  res.json(ofertas);
});

// Crear oferta - SOLO comerciante
router.post("/", auth, async (req, res) => {
  if (req.user.rol !== "merchant")
    return res.status(403).json({ message: "Solo comerciantes pueden crear ofertas" });

  const { titulo, descripcion, descuento, producto } = req.body;
  if (!titulo || !descripcion || !descuento || !producto) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  const prod = await Product.findById(producto);
  if (!prod) return res.status(404).json({ message: "Producto no encontrado" });

  // (Opcional) Validación de propietario del producto
  // if (String(prod.createdBy) !== String(req.user.id)) return res.status(403).json({ message: "Solo puedes crear ofertas de tus productos" });

  const nueva = new Offer({
    titulo, descripcion, descuento, producto, usuario: req.user.id
  });
  await nueva.save();
  res.status(201).json(nueva);
});

// Editar oferta (solo dueño)
router.put("/:id", auth, async (req, res) => {
  const offer = await Offer.findOneAndUpdate(
    { _id: req.params.id, usuario: req.user.id },
    req.body, { new: true }
  );
  if (!offer) return res.status(404).json({ message: "Oferta no encontrada o no eres dueño" });
  res.json(offer);
});

// Eliminar oferta (solo dueño)
router.delete("/:id", auth, async (req, res) => {
  const deleted = await Offer.findOneAndDelete({ _id: req.params.id, usuario: req.user.id });
  if (!deleted) return res.status(404).json({ message: "Oferta no encontrada o no eres dueño" });
  res.json({ message: "Oferta eliminada" });
});

module.exports = router;
