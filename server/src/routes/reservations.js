const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Reserva = require("../models/Reservation");
const Oferta = require("../models/offer");

// Crear reserva - SOLO cliente. (Usa OFERTA, elimina el endpoint que usaba PRODUCTO)
router.post("/", auth, async (req, res) => {
  if (req.user.rol !== "cliente")
    return res.status(403).json({ message: "Solo los clientes pueden hacer reservas" });

  const { oferta, fecha, notas } = req.body;
  if (!oferta) return res.status(400).json({ message: "La oferta es obligatoria" });

  // Verifica que la oferta existe
  const ofertaObj = await Oferta.findById(oferta);
  if (!ofertaObj) return res.status(400).json({ message: "La oferta no existe" });

  const nueva = new Reserva({
    usuario: req.user.id,
    oferta,
    fecha,
    notas
  });
  await nueva.save();
  res.status(201).json(nueva);
});

// Listar mis reservas - SOLO cliente
router.get("/mias", auth, async (req, res) => {
  if (req.user.rol !== "cliente")
    return res.status(403).json({ message: "Solo los clientes pueden ver sus reservas" });

  const reservas = await Reserva.find({ usuario: req.user.id })
    .populate({
      path: "oferta",
      populate: {
        path: "producto",
        model: "Producto"
      } 
    });
  res.json(reservas);
});

module.exports = router;