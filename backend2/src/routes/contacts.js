const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Add a new emergency contact
router.post('/add', contactController.addContact);

// Set a contact as primary
router.post('/set-primary', contactController.setPrimary);

// Remove primary status from a contact
router.post('/remove-primary', contactController.removePrimary);

// Delete an emergency contact
router.post('/delete', contactController.deleteContact);

// Get all contacts for a user
router.get('/:USER_ID', contactController.getContacts);

module.exports = router;