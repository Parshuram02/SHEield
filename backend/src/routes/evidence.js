const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');

// GET /api/evidence/:id - Get evidence page for an alert event
router.get('/:id', evidenceController.getEvidence);

// GET /api/evidence/:alertId/audio/:filename - Download audio file
router.get('/:alertId/audio/:filename', evidenceController.downloadAudio);

module.exports = router;
