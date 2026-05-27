console.log('Inicio cron.js');
const cron = require("node-cron");
console.log('node-cron ok');
const Lot = require("../models/Lot");
const Product = require("../models/Products");
const Store = require("../models/Store");
const Offer = require("../models/offer");
const { createNotification } = require("../utils/notifications");

// Corre todos los días a las 8am
cron.schedule("0 8 * * *", async () => {
  try {
    const ahora = new Date();
    const soon = new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 días

    // 1. Todos los lotes con vencimiento <= soon && estado=active
    const lots = await Lot.find({
      fechaVencimiento: { $lte: soon, $gte: ahora },
      estado: "active"
    }).populate({
      path: "producto", populate: { path: "tienda" }
    });

    for (const lot of lots) {
      const tienda = lot.producto.tienda;
      const merchantId = tienda.usuario;
      await createNotification({
        recipientId: merchantId,
        message: `El lote del producto "${lot.producto.nombre}" en tu tienda "${tienda.nombre}" vence en ${Math.round((lot.fechaVencimiento - ahora)/(1000*60*60*24))} días.`,
        link: `/products/lotes`,
        data: { loteId: lot._id, productoId: lot.producto._id }
      });
    }
    console.log(`[CRON] Notificado merchants sobre lotes por vencer: ${lots.length}`);

    // 2. Todas las ofertas activas con vencimiento <= soon
    const offers = await Offer.find({
      fechaVencimiento: { $lte: soon, $gte: ahora },
      activa: true
    }).populate("producto");

    for (const offer of offers) {
      const diffTime = offer.fechaVencimiento.getTime() - ahora.getTime();
      const diffHours = Math.round(diffTime / (1000 * 60 * 60));
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      let timeStr = `${diffDays} días`;
      if (diffDays === 0) {
        timeStr = `${diffHours} horas`;
      }

      await createNotification({
        recipientId: offer.usuario,
        message: `Tu oferta "${offer.titulo}" del producto "${offer.producto?.nombre || "Producto"}" vence pronto (en ${timeStr}).`,
        link: `/offers`,
        data: { offerId: offer._id, productoId: offer.producto?._id }
      });
    }
    console.log(`[CRON] Notificado merchants sobre ofertas por vencer: ${offers.length}`);
  } catch (err) {
    console.error("[CRON] Error enviando alerta de lotes/ofertas por vencer", err);
  }
});