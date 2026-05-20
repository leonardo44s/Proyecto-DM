const express = require("express");
const router = express.Router();
const Lot = require("../models/Lot");
const Product = require("../models/Products");
const auth = require("../middlewares/auth");
const roleGuard = require("../middlewares/roleGuard");

// Create
router.post("/", auth, roleGuard("merchant"), async (req, res) => {
  try {
    const product = await Product.findById(req.body.producto);
    if (!product) return res.status(400).json({ message: "Producto no válido" });
    const lot = new Lot({ ...req.body, cantidadDisponible: req.body.cantidadTotal });
    await lot.save();
    res.status(201).json(lot);
  } catch (err) {
    res.status(400).json({ message: "Error", error: err });
  }
});

// Get by Producto
router.get("/", async (req, res) => {
  const filter = req.query.producto ? { producto: req.query.producto } : {};
  const lots = await Lot.find(filter).populate("producto");
  res.json(lots);
});

// Update (manual)
router.put("/:id", auth, roleGuard("merchant", "admin"), async (req, res) => {
  const lot = await Lot.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(lot);
});

module.exports = router;