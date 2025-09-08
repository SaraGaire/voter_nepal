const express = require("express");
const router = express.Router();
const { getVotes, castVote } = require("../controllers/votesController");

router.get("/", getVotes);
router.post("/", castVote);

module.exports = router;
