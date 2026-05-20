const Notification = require("../models/Notification");

// recipientId o roleRecipient es obligatorio
async function createNotification({ recipientId = null, roleRecipient = null, message, link = "", data = {} }) {
  return await Notification.create({
    recipient: recipientId,
    roleRecipient,
    message,
    link,
    data
  });
}
module.exports = { createNotification };