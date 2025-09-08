const Review = require("../models/Review");
const User = require("../models/User");

exports.getReviews = async (req, res) => {
  const reviews = await Review.find();
  res.json(reviews);
};

exports.addReview = async (req, res) => {
  const { userId, text } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(400).json({ success: false, message: "User not found" });

  const review = await Review.create({ userId, userName: user.name, text });
  res.json({ success: true, review, message: "Review submitted" });
};

exports.deleteReview = async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};
