const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  phone: String,
  password: { type: String, required: true },
  nombre: String,
  direccion: String,
  rol: { type: String, enum: ["merchant", "customer", "admin"], default: "customer" },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

// Pre-save hook - versión sin next()
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = function (pw) {
  return bcrypt.compare(pw, this.password);
};

module.exports = mongoose.model("User", UserSchema);