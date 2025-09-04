const express = require('express');
const router = express.Router();
const keywordController = require('../controllers/keywordController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// Apply API key authentication to all routes
router.use(apiKeyAuth);

// Main keyword detection endpoint
router.post('/detect', keywordController.detectKeywords);

// Get available speech recognition providers
router.get('/providers', keywordController.getProviders);

// Get all trigger phrases
router.get('/phrases', keywordController.getTriggerPhrases);

// Add new trigger phrase
router.post('/phrases', keywordController.addTriggerPhrase);

// Remove trigger phrase
router.delete('/phrases/:phrase', keywordController.removeTriggerPhrase);

// Update confidence threshold
router.put('/threshold', keywordController.updateThreshold);

// Test keyword detection with text
router.post('/test', keywordController.testDetection);

// Get keyword detection statistics
router.get('/stats', keywordController.getStats);

module.exports = router;



