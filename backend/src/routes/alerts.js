const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alertsController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// Apply API key authentication to all routes
router.use(apiKeyAuth);

// POST /api/alerts/send - Send SMS alert to emergency contacts
router.post('/send', alertsController.sendAlert);

// GET /api/alerts/:userId - Get all alerts for a user
router.get('/:userId', alertsController.getAlerts);

// GET /api/alerts/alert/:id - Get a single alert by ID
router.get('/alert/:id', alertsController.getAlert);

// POST /api/alerts/:alertId/recipients/:recipientId/retry - Retry failed SMS
router.post('/:alertId/recipients/:recipientId/retry', alertsController.retryFailedSMS);

// Twilio webhook (no auth required for webhooks)
router.post('/twilio/status', alertsController.twilioStatusCallback);

module.exports = router;



