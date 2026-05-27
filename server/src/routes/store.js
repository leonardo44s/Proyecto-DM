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

// Get stats for merchant dashboard
router.get("/merchant/stats", auth, roleGuard("merchant"), async (req, res) => {
  try {
    const Product = require("../models/Products");
    const Offer = require("../models/offer");
    const Reservation = require("../models/Reservation");
    
    // Find the merchant's store
    const store = await Store.findOne({ usuario: req.user.id });
    if (!store) {
      return res.status(404).json({ message: "No tienes una tienda registrada." });
    }
    
    // Count active products
    const activeProductsCount = await Product.countDocuments({ tienda: store._id });
    
    // Find merchant's offers
    const offers = await Offer.find({ usuario: req.user.id });
    const offerIds = offers.map(o => o._id);
    
    // Count pending reservations
    const pendingReservationsCount = await Reservation.countDocuments({
      oferta: { $in: offerIds },
      estado: "pendiente"
    });
    
    // Count completed (accepted/completada) rescues
    const completedRescuesCount = await Reservation.countDocuments({
      oferta: { $in: offerIds },
      estado: { $in: ["aceptada", "completada"] }
    });
    
    // Calculate saved food weight: each completed rescue represents ~1.5kg of food saved
    const savedFoodWeight = Math.round(completedRescuesCount * 1.5 * 10) / 10;
    
    // Recent activities (last 5 reservations)
    const recentReservations = await Reservation.find({ oferta: { $in: offerIds } })
      .populate("usuario", "nombre")
      .populate({ path: "oferta", populate: { path: "producto" } })
      .sort({ createdAt: -1 })
      .limit(5);
      
    const activities = recentReservations.map(reserva => {
      const timeAgo = Math.round((new Date() - new Date(reserva.createdAt)) / 60000);
      let timeStr = `Hace ${timeAgo} minutos`;
      if (timeAgo >= 60) {
        const hours = Math.round(timeAgo / 60);
        timeStr = hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`;
      }
      if (timeAgo >= 1440) {
        const days = Math.round(timeAgo / 1440);
        timeStr = days === 1 ? "Hace 1 día" : `Hace ${days} días`;
      }
      
      let tituloStr = "Nueva reserva";
      let colorStr = "#1976D2";
      
      if (reserva.estado === "pendiente") {
        tituloStr = "Nueva reserva confirmada";
        colorStr = "#E65100";
      } else if (reserva.estado === "aceptada") {
        tituloStr = "Reserva aceptada";
        colorStr = "#2E7D32";
      } else if (reserva.estado === "completada") {
        tituloStr = "Reserva entregada (completada)";
        colorStr = "#1976D2";
      } else if (reserva.estado === "cancelada" || reserva.estado === "rechazada") {
        tituloStr = `Reserva ${reserva.estado}`;
        colorStr = "#D32F2F";
      }
      
      return {
        id: reserva._id,
        tipo: reserva.estado,
        titulo: tituloStr,
        descripcion: `${reserva.oferta?.producto?.nombre || 'Producto'} - por ${reserva.usuario?.nombre || 'Cliente'}`,
        fecha: timeStr,
        color: colorStr
      };
    });
    
    res.json({
      storeName: store.nombre,
      productosActivos: activeProductsCount,
      reservasPendientes: pendingReservationsCount,
      rescatesCompletados: completedRescuesCount,
      alimentosSalvados: savedFoodWeight,
      actividades: activities
    });
  } catch (err) {
    console.error("Error al obtener estadísticas del comerciante:", err);
    res.status(500).json({ message: "Error interno", error: err.message });
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