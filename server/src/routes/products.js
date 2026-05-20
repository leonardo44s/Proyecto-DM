const express = require("express");
const router = express.Router();
const Product = require("../models/Products");
const auth = require("../middlewares/auth");
const roleGuard = require("../middlewares/roleGuard");

// Create
router.post("/", auth, roleGuard("merchant"), async (req, res) => {
  try {
    const p = new Product({ ...req.body, createdBy: req.user.id });
    await p.save();
    res.status(201).json(p);
  } catch (err) {
    res.status(400).json({ message: "Error", error: err });
  }
});

// List by Store
router.get("/", async (req, res) => {
  const filter = req.query.store ? { tienda: req.query.store } : {};
  const productos = await Product.find(filter);
  res.json(productos);
});

// Update
router.put("/:id", auth, roleGuard("merchant"), async (req, res) => {
  const prod = await Product.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user.id },
    req.body, { new: true }
  );
  res.json(prod);
});

// Delete
router.delete("/:id", auth, roleGuard("merchant"), async (req, res) => {
  await Product.deleteOne({ _id: req.params.id, createdBy: req.user.id });
  res.json({ message: "Producto eliminado" });
});

module.exports = router;