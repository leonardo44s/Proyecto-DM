const express = require("express");
const router = express.Router();
const Store = require("../models/Store");
const auth = require("../middlewares/auth");
const roleGuard = require("../middlewares/roleGuard");
const { geocodeAddress, normalizeAddress } = require("../utils/geocoder");

// Create
router.post("/", auth, roleGuard("merchant"), async (req, res) => {
  try {
    let { coords, direccion, ...rest } = req.body;
    if (direccion) {
      direccion = normalizeAddress(direccion);
    }
    let parsedCoords = null;

    if (coords) {
      if (Array.isArray(coords)) {
        parsedCoords = { type: "Point", coordinates: coords };
      } else if (typeof coords === "object" && coords.coordinates) {
        parsedCoords = coords;
      }
    }

    // Si no pasaron coordenadas pero sí dirección, la buscamos por geocodificación
    if (!parsedCoords && direccion) {
      const storeCoords = await geocodeAddress(direccion);
      parsedCoords = {
        type: "Point",
        coordinates: storeCoords
      };
    }

    const s = new Store({
      ...rest,
      direccion,
      coords: parsedCoords || { type: "Point", coordinates: [-76.5226, 3.4516] }, // Fallback Cali
      usuario: req.user.id
    });
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
  try {
    let { coords, direccion, ...rest } = req.body;
    if (direccion) {
      direccion = normalizeAddress(direccion);
    }
    let parsedCoords = null;

    if (coords) {
      if (Array.isArray(coords)) {
        parsedCoords = { type: "Point", coordinates: coords };
      } else if (typeof coords === "object" && coords.coordinates) {
        parsedCoords = coords;
      }
    }

    // Si la dirección cambió y no pasaron nuevas coordenadas, la geocodificamos
    if (!parsedCoords && direccion) {
      const storeCoords = await geocodeAddress(direccion);
      parsedCoords = {
        type: "Point",
        coordinates: storeCoords
      };
    }

    const updateFields = { ...rest, direccion };
    if (parsedCoords) {
      updateFields.coords = parsedCoords;
    }

    const store = await Store.findOneAndUpdate(
      { _id: req.params.id, usuario: req.user.id },
      { $set: updateFields },
      { new: true }
    );
    res.json(store);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar tienda", error: err });
  }
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