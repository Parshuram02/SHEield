const express = require('express');
const router = express.Router();
const placesController = require('../controllers/placesController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// Get nearby places
router.post('/nearby', apiKeyAuth, placesController.getNearbyPlaces);

// Get place details by place_id
router.get('/details/:placeId', apiKeyAuth, placesController.getPlaceDetails);

// Get directions between two points
router.post('/directions', apiKeyAuth, placesController.getDirections);

// Get emergency services in an area
router.post('/emergency', apiKeyAuth, placesController.getEmergencyServices);

// Health check endpoint (no auth required)
router.get('/health', placesController.healthCheck);

module.exports = router;





