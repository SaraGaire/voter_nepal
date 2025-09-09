const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  country: String,
  documentType: String,
  documentId: String,
  documentVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", UserSchema);
