const express = require("express");
const router = express.Router();
const { getCandidates, addCandidate, removeCandidate } = require("../controllers/candidatesController");

router.get("/", getCandidates);
router.post("/", addCandidate);
router.delete("/:id", removeCandidate);

module.exports = router;
