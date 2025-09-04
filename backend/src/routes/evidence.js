const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// Public routes (no authentication required)
router.get('/public/:token', evidenceController.getEvidenceByToken);
router.get('/:id', evidenceController.getEvidencePage);
router.get('/:alertId/audio/:filename', evidenceController.downloadAudio);

// Protected routes (require API key authentication)
router.use(apiKeyAuth);

// Create new evidence
router.post('/', evidenceController.createEvidence);

// Get evidence statistics
router.get('/stats', evidenceController.getEvidenceStats);

// Update evidence
router.post('/:id/update', evidenceController.updateEvidence);

// Delete evidence
router.delete('/:id', evidenceController.deleteEvidence);

// Clean up expired evidence
router.post('/cleanup', evidenceController.deleteEvidence);

module.exports = router;
