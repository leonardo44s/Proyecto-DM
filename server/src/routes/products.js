const express = require("express");
const router = express.Router();
const Product = require("../models/Products");
const Store = require("../models/Store");
const auth = require("../middlewares/auth");
const roleGuard = require("../middlewares/roleGuard");

// Create
router.post("/", auth, roleGuard("merchant"), async (req, res) => {
  try {
    const store = await Store.findOne({ usuario: req.user.id });
    if (!store) {
      return res.status(400).json({ message: "No se encontró ningún comercio asociado a este usuario." });
    }
    const p = new Product({ ...req.body, tienda: store._id, createdBy: req.user.id });
    await p.save();
    res.status(201).json(p);
  } catch (err) {
    res.status(400).json({ message: "Error", error: err });
  }
});

// List by Store
router.get("/", auth, async (req, res) => {
  try {
    let filter = {};
    if (req.user.rol === "merchant") {
      const store = await Store.findOne({ usuario: req.user.id });
      if (store) {
        filter = { tienda: store._id };
      } else {
        filter = { createdBy: req.user.id };
      }
    } else if (req.query.store) {
      filter = { tienda: req.query.store };
    }
    const productos = await Product.find(filter);
    res.json(productos);
  } catch (err) {
    res.status(500).json({ message: "Error al listar productos", error: err.message });
  }
});

// Update
router.put("/:id", auth, roleGuard("merchant"), async (req, res) => {
  try {
    const store = await Store.findOne({ usuario: req.user.id });
    if (!store) {
      return res.status(400).json({ message: "No se encontró ningún comercio asociado a este usuario." });
    }
    
    const prod = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { tienda: store._id },
          { createdBy: req.user.id }
        ]
      },
      req.body, { new: true }
    );
    
    if (!prod) {
      return res.status(404).json({ message: "Producto no encontrado o no estás autorizado." });
    }
    
    res.json(prod);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar producto", error: err.message });
  }
});

// Delete
router.delete("/:id", auth, roleGuard("merchant"), async (req, res) => {
  try {
    const store = await Store.findOne({ usuario: req.user.id });
    if (!store) {
      return res.status(400).json({ message: "No se encontró ningún comercio asociado a este usuario." });
    }
    
    const product = await Product.findOne({
      _id: req.params.id,
      $or: [
        { tienda: store._id },
        { createdBy: req.user.id }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado o no estás autorizado para eliminarlo." });
    }
    
    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: "Producto eliminado" });
  } catch (err) {
    res.status(400).json({ message: "Error al eliminar producto", error: err.message });
  }
});

module.exports = router;