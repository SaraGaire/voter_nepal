const User = require("../models/User");

exports.login = async (req, res) => {
  try {
    const { name, country, documentType, documentId } = req.body;
    let user = await User.findOne({ name, documentId });

    if (!user) {
      user = await User.create({ name, country, documentType, documentId });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login error" });
  }
};
