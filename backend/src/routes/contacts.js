const express = require('express');
const router = express.Router();
const contactsController = require('../controllers/contactsController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// Apply API key authentication to all routes
router.use(apiKeyAuth);

// GET /api/contacts/:userId - Get all contacts for a user
router.get('/:userId', contactsController.getContacts);

// GET /api/contacts/:userId/primary - Get primary contact for a user
router.get('/:userId/primary', contactsController.getPrimaryContact);

// GET /api/contacts/contact/:id - Get a single contact by ID
router.get('/contact/:id', contactsController.getContact);

// POST /api/contacts - Create a new contact
router.post('/', contactsController.createContact);

// PUT /api/contacts/:id - Update a contact
router.put('/:id', contactsController.updateContact);

// DELETE /api/contacts/:id - Delete a contact
router.delete('/:id', contactsController.deleteContact);

// POST /api/contacts/:id/verify - Verify a contact
router.post('/:id/verify', contactsController.verifyContact);

module.exports = router;



