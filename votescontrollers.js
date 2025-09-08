const Vote = require("../models/Vote");

exports.getVotes = async (req, res) => {
  const votes = await Vote.find();
  const result = {};
  votes.forEach(v => {
    result[v.candidateId] = (result[v.candidateId] || 0) + 1;
  });
  res.json(result);
};

exports.castVote = async (req, res) => {
  const { userId, candidateId } = req.body;
  const alreadyVoted = await Vote.findOne({ userId });

  if (alreadyVoted) {
    return res.status(400).json({ success: false, message: "User already voted" });
  }

  await Vote.create({ userId, candidateId });
  res.json({ success: true });
};
