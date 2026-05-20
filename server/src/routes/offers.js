const express = require("express");
const router = express.Router();
const Offer = require("../models/Offer");
const Lot = require("../models/Lot");
const auth = require("../middlewares/auth");
const roleGuard = require("../middlewares/roleGuard");

// Crear oferta solo si el merchant tiene stock suficiente
router.post("/", auth, roleGuard("merchant"), async (req, res) => {
  try {
    // validar stock si hay lote
    if (req.body.lote) {
      const lot = await Lot.findById(req.body.lote);
      if (!lot) return res.status(400).json({ message: "Lote inválido" });
      if (lot.cantidadDisponible < req.body.stockDisponible)
        return res.status(400).json({ message: "No hay stock suficiente en el lote"});
    }
    const o = new Offer({ ...req.body, usuario: req.user.id });
    await o.save();
    res.status(201).json(o);
  } catch (err) {
    res.status(400).json({ message: "Error", error: err });
  }
});

// Listar ofertas (activas, por tienda)
router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.producto) filter.producto = req.query.producto;
  // Ofertas activas por tiempo
  filter.inicio = { $lte: new Date() };
  filter.fin = { $gte: new Date() };
  filter.estado = "active";
  let ofertas = await Offer.find(filter)
    .populate("producto")
    .populate("lote");
  res.json(ofertas);
});

// Update
router.put("/:id", auth, roleGuard("merchant"), async (req, res) => {
  const of = await Offer.findOneAndUpdate(
    { _id: req.params.id, usuario: req.user.id },
    req.body, { new: true }
  );
  res.json(of);
});

// Delete
router.delete("/:id", auth, roleGuard("merchant"), async (req, res) => {
  await Offer.deleteOne({ _id: req.params.id, usuario: req.user.id });
  res.json({ message: "Oferta eliminada" });
});

module.exports = router;