const Candidate = require("../models/Candidate");

exports.getCandidates = async (req, res) => {
  const candidates = await Candidate.find();
  res.json(candidates);
};

exports.addCandidate = async (req, res) => {
  const { name, party } = req.body;
  const candidate = await Candidate.create({ name, party });
  res.json({ success: true, candidate });
};

exports.removeCandidate = async (req, res) => {
  await Candidate.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};
