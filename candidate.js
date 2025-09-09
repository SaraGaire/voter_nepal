const mongoose = require("mongoose");

const CandidateSchema = new mongoose.Schema({
  name: String,
  party: String,
});

module.exports = mongoose.model("Candidate", CandidateSchema);
