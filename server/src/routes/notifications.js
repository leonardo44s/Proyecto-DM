const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const auth = require("../middlewares/auth");

router.get("/", auth, async (req, res) => {
  const userId = req.user.id;
  const role = req.user.rol;
  const notifications = await Notification.find({
    $or: [
      { recipient: userId },
      { roleRecipient: role }
    ]
  }).sort({ createdAt: -1 });
  res.json(notifications);
});

router.put("/:id/read", auth, async (req, res) => {
  const n = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  res.json(n);
});

module.exports = router;