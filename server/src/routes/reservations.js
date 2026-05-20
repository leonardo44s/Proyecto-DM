const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const roleGuard = require("../middlewares/roleGuard");
const Reservation = require("../models/Reservation");
const Offer = require("../models/offer");
const { createNotification } = require("../utils/notifications");

// Crear Reserva (customer)
router.post("/", auth, roleGuard("customer"), async (req, res) => {
  try {
    const { oferta, cantidad, fecha, notas } = req.body;
    const offer = await Offer.findById(oferta);
    if (!offer) return res.status(400).json({ message: "Oferta no existe" });
    if (offer.stockDisponible < cantidad) return res.status(400).json({ message: "No hay stock suficiente" });

    // Disminuir stock atómicamente si hay suficiente
    await Offer.findOneAndUpdate(
      { _id: oferta, stockDisponible: { $gte: cantidad } },
      { $inc: { stockDisponible: -cantidad } }
    );

    const reserva = await Reservation.create({
      usuario: req.user.id, oferta, cantidad, fecha, notas
    });

    await createNotification({
      recipientId: offer.usuario,
      message: `Nueva reserva de ${cantidad} en la oferta "${offer.titulo}"`,
      link: "/merchant/reservations",
      data: { reservaId: reserva._id, ofertaId: oferta }
    });

    await createNotification({
      recipientId: req.user.id,
      message: `Reserva creada en la oferta "${offer.titulo}"`,
      link: "/reservations/mias",
      data: { reservaId: reserva._id, ofertaId: oferta }
    });

    res.status(201).json(reserva);
  } catch (err) {
    res.status(400).json({ message: "Error", error: err });
  }
});

// Cliente: mis reservas
router.get("/mias", auth, roleGuard("customer"), async (req, res) => {
  const reservas = await Reservation.find({ usuario: req.user.id })
    .populate({ path: "oferta", populate: { path: "producto", model: "Product" } });
  res.json(reservas);
});

// Merchant/admin: ver todas reservas de sus ofertas
router.get("/all", auth, roleGuard("merchant", "admin"), async (req, res) => {
  let filter = {};
  if (req.user.rol === "merchant") {
    const misOfertas = await Offer.find({ usuario: req.user.id }).select("_id");
    filter = { oferta: { $in: misOfertas.map(o => o._id) } };
  }
  const reservas = await Reservation.find(filter)
    .populate("oferta")
    .populate("usuario");
  res.json(reservas);
});

// Confirmar/responder, cancelar, etc pueden añadirse aquí

module.exports = router;