// index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectDB } = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const productsRouter = require("./routes/products");
const offersRouter = require("./routes/offers");
const reservationsRouter = require("./routes/reservations");
const notificationsRouter = require("./routes/notifications");

const app = express(); // <-- DEBE estar antes de cualquier app.use

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/products", productsRouter); // <-- PONLO AQUÍ
app.use("/offers", offersRouter);
app.use("/reservations", reservationsRouter);
app.use("/notifications", notificationsRouter);

// Error handler (simple)
app.use((err, req, res, next) => {
  const status = err.status || 400;
  res.status(status).json({ message: err.message || "Error" });
});

(async () => {
  await connectDB(process.env.MONGODB_URI);
  const port = process.env.PORT || 4000;
  app.listen(port, '0.0.0.0', () => console.log(`[api] http://0.0.0.0:${port}`));
})();