const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Reservation = require("../models/Reservation");
const Offer = require("../models/offer");
const { createNotification } = require("../utils/notifications");

// Crear reserva - SOLO cliente
router.post("/", auth, async (req, res) => {
  if (req.user.rol !== "customer")
    return res.status(403).json({ message: "Solo los clientes pueden hacer reservas" });

  const { oferta, fecha, notas } = req.body;
  const offer = await Offer.findById(oferta);
  if (!offer) return res.status(400).json({ message: "La oferta no existe" });

  const nueva = new Reservation({
    usuario: req.user.id, oferta, fecha, notas, estado: "pendiente"
  });
  await nueva.save();

  // Notificación a comerciante
  await createNotification({
    recipientId: offer.usuario,
    message: `Tienes una nueva reserva (${nueva._id}) en tu oferta "${offer.titulo}".`
  });

  res.status(201).json(nueva);
});

// Listar mis reservas - SOLO cliente
router.get("/mias", auth, async (req, res) => {
  if (req.user.rol !== "customer")
    return res.status(403).json({ message: "Solo los clientes pueden ver sus reservas" });

  const reservas = await Reservation.find({ usuario: req.user.id })
    .populate({
      path: "oferta",
      populate: {
        path: "producto",
        model: "Product",
        populate: { path: "tienda", model: "Store" }
      }
    });
  res.json(reservas);
});

// Comerciantes: ver reservas de MIS ofertas
router.get("/recibidas", auth, async (req, res) => {
  if (req.user.rol !== "merchant")
    return res.status(403).json({ message: "Solo comerciantes pueden ver reservas recibidas" });

  // Buscar ofertas del merchant
  const offers = await Offer.find({ usuario: req.user.id }).select("_id");
  const reservas = await Reservation.find({ oferta: { $in: offers.map(o => o._id) } })
    .populate("usuario")
    .populate({ path: "oferta", populate: { path: "producto", model: "Product" } });
  res.json(reservas);
});

// GESTIONAR ESTADO DE UNA RESERVA (aceptar/rechazar/cancelar)
router.put("/:id/estado", auth, async (req, res) => {
  // Determinar si es merchant o cliente y qué puede cambiar
  const reserva = await Reservation.findById(req.params.id).populate("oferta");
  if (!reserva) return res.status(404).json({ message: "Reserva no encontrada" });

  // MERCHANT puede aceptar/rechazar/completar
  if (req.user.rol === "merchant") {
    if (String(reserva.oferta.usuario) !== String(req.user.id))
      return res.status(403).json({ message: "No autorizado" });

    const { estado } = req.body;
    if (!["aceptada", "rechazada", "completada"].includes(estado))
      return res.status(400).json({ message: "Estado inválido" });
    reserva.estado = estado;
    await reserva.save();

    let msg = `Tu reserva en oferta "${reserva.oferta.titulo}" fue ${estado}.`;
    if (estado === "completada") {
      msg = `¡Gracias por rescatar comida! Tu reserva en "${reserva.oferta.titulo}" ha sido completada. Ya puedes calificar al comercio.`;
    }

    // Notifica al cliente
    await createNotification({
      recipientId: reserva.usuario,
      message: msg
    });
    return res.json(reserva);
  }
  // CLIENTE puede cancelar
  if (req.user.rol === "customer") {
    const { estado } = req.body;
    if (estado !== "cancelada") return res.status(400).json({ message: "Solo puedes cancelar tu reserva" });
    if (String(reserva.usuario) !== String(req.user.id))
      return res.status(403).json({ message: "No autorizado" });
    reserva.estado = estado;
    await reserva.save();

    // Notifica al merchant
    await createNotification({
      recipientId: reserva.oferta.usuario,
      message: `El cliente canceló su reserva en tu oferta "${reserva.oferta.titulo}".`
    });
    return res.json(reserva);
  }
  res.status(403).json({ message: "No autorizado" });
});

module.exports = router;
