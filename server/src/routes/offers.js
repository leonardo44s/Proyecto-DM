const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Offer = require("../models/offer");
const Product = require("../models/Products");
const { createNotification } = require("../utils/notifications");

// Helper to check and alert merchant immediately if an offer is expiring soon or expired
async function checkAndAlertOfferExpiration(offer, product, userId) {
  if (offer.fechaVencimiento) {
    const expiration = new Date(offer.fechaVencimiento);
    const ahora = new Date();
    const diffTime = expiration.getTime() - ahora.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
      let message = `¡Atención! Tu oferta "${offer.titulo}" del producto "${product.nombre}" `;
      if (diffDays < 0) {
        message += `ya está VENCIDA (desde hace ${Math.abs(diffDays)} días).`;
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

// Listar todas las ofertas
router.get("/", auth, async (req, res) => {
  let filter = {};
  if (req.user.rol === "merchant") {
    filter = { usuario: req.user.id };
  } else {
    // Para clientes, solo mostrar ofertas que no hayan vencido
    filter = {
      $or: [
        { fechaVencimiento: { $exists: false } },
        { fechaVencimiento: null },
        { fechaVencimiento: { $gt: new Date() } }
      ]
    };
  }
  const ofertas = await Offer.find(filter).populate({ path: "producto", populate: { path: "tienda" } });
  res.json(ofertas);
});

// Crear oferta - SOLO comerciante
router.post("/", auth, async (req, res) => {
  if (req.user.rol !== "merchant")
    return res.status(403).json({ message: "Solo comerciantes pueden crear ofertas" });

  const { titulo, descripcion, descuento, producto, fechaVencimiento } = req.body;
  if (!titulo || !descripcion || !descuento || !producto) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  const prod = await Product.findById(producto);
  if (!prod) return res.status(404).json({ message: "Producto no encontrado" });

  // (Opcional) Validación de propietario del producto
  // if (String(prod.createdBy) !== String(req.user.id)) return res.status(403).json({ message: "Solo puedes crear ofertas de tus productos" });

  const nueva = new Offer({
    titulo, descripcion, descuento, producto, usuario: req.user.id, fechaVencimiento
  });
  await nueva.save();

  // Alert immediately if expiring soon or already expired
  await checkAndAlertOfferExpiration(nueva, prod, req.user.id);

  res.status(201).json(nueva);
});

// Editar oferta (solo dueño)
router.put("/:id", auth, async (req, res) => {
  try {
    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.id, usuario: req.user.id },
      req.body, { new: true }
    ).populate("producto");
    
    if (!offer) return res.status(404).json({ message: "Oferta no encontrada o no eres dueño" });
    
    // Alert immediately if expiring soon or already expired
    await checkAndAlertOfferExpiration(offer, offer.producto, req.user.id);
    
    res.json(offer);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar oferta", error: err });
  }
});

// Eliminar oferta (solo dueño)
router.delete("/:id", auth, async (req, res) => {
  const deleted = await Offer.findOneAndDelete({ _id: req.params.id, usuario: req.user.id });
  if (!deleted) return res.status(404).json({ message: "Oferta no encontrada o no eres dueño" });
  res.json({ message: "Oferta eliminada" });
});

module.exports = router;
