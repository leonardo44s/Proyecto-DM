const express = require("express");
const router = express.Router();
const Store = require("../models/Store");
const auth = require("../middlewares/auth");
const roleGuard = require("../middlewares/roleGuard");

// Create
router.post("/", auth, roleGuard("merchant"), async (req, res) => {
  try {
    const s = new Store({ ...req.body, usuario: req.user.id });
    await s.save();
    res.status(201).json(s);
  } catch (err) {
    res.status(400).json({ message: "Error", error: err });
  }
});

// Get Single
router.get("/:id", async (req, res) => {
  const store = await Store.findById(req.params.id);
  res.json(store);
});

// Update
router.put("/:id", auth, roleGuard("merchant"), async (req, res) => {
  const store = await Store.findOneAndUpdate(
    { _id: req.params.id, usuario: req.user.id },
    req.body,
    { new: true }
  );
  res.json(store);
});

// Delete
router.delete("/:id", auth, roleGuard("merchant"), async (req, res) => {
  await Store.deleteOne({ _id: req.params.id, usuario: req.user.id });
  res.json({ message: "Tienda eliminada" });
});

// List (all or by search)
router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.nombre) filter.nombre = { $regex: req.query.nombre, $options: "i" };
  const stores = await Store.find(filter);
  res.json(stores);
});

module.exports = router;