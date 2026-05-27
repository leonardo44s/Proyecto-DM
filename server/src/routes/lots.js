const express = require("express");
const router = express.Router();
const Lot = require("../models/Lot");
const Product = require("../models/Products");
const auth = require("../middlewares/auth");
const roleGuard = require("../middlewares/roleGuard");
const { createNotification } = require("../utils/notifications");

// Helper to check and alert merchant immediately if a lot is expiring soon or expired
async function checkAndAlertLotExpiration(lot, product, userId) {
  if (lot.fechaVencimiento) {
    const expiration = new Date(lot.fechaVencimiento);
    const ahora = new Date();
    const diffTime = expiration.getTime() - ahora.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
      let message = `¡Atención! El lote de "${product.nombre}" `;
      if (diffDays < 0) {
        message += `ya está VENCIDO (desde hace ${Math.abs(diffDays)} días).`;
      } else if (diffDays === 0) {
        message += `vence HOY.`;
      } else {
        message += `vence pronto, en ${diffDays} días.`;
      }

      await createNotification({
        recipientId: userId,
        message: message
      });
    }
  }
}

// Create
router.post("/", auth, roleGuard("merchant"), async (req, res) => {
  try {
    const product = await Product.findById(req.body.producto);
    if (!product) return res.status(400).json({ message: "Producto no válido" });
    
    const lot = new Lot({ ...req.body, cantidadDisponible: req.body.cantidadTotal });
    await lot.save();
    
    // Check and notify immediately if needed
    await checkAndAlertLotExpiration(lot, product, req.user.id);
    
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
  try {
    const lot = await Lot.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate("producto");
    if (!lot) return res.status(404).json({ message: "Lote no encontrado" });

    // Check and notify immediately if needed
    await checkAndAlertLotExpiration(lot, lot.producto, req.user.id);

    res.json(lot);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar lote", error: err });
  }
});

module.exports = router;