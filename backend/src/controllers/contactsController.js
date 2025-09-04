const { Contact } = require('../models');

// Get all contacts for a user
exports.getContacts = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const contacts = await Contact.find({ userId }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            data: contacts,
            count: contacts.length
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
};

// Get a single contact by ID
exports.getContact = async (req, res) => {
    try {
        const { id } = req.params;
        
        const contact = await Contact.findById(id);
        
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        
        res.json({
            success: true,
            data: contact
        });
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({ error: 'Failed to fetch contact' });
    }
};

// Create a new contact
exports.createContact = async (req, res) => {
    try {
        const { userId, name, phoneE164, relationship, isPrimary } = req.body;
        
        // Validation
        if (!userId || !name || !phoneE164) {
            return res.status(400).json({ 
                error: 'userId, name, and phoneE164 are required' 
            });
        }
        
        // Validate phone number format (basic E.164 validation)
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phoneE164)) {
            return res.status(400).json({ 
                error: 'Phone number must be in E.164 format (e.g., +1234567890)' 
            });
        }
        
        // If this is a primary contact, unset other primary contacts for this user
        if (isPrimary) {
            await Contact.updateMany(
                { userId, isPrimary: true },
                { isPrimary: false }
            );
        }
        
        const contact = new Contact({
            userId,
            name,
            phoneE164,
            relationship,
            isPrimary: isPrimary || false
        });
        
        await contact.save();
        
        res.status(201).json({
            success: true,
            data: contact,
            message: 'Contact created successfully'
        });
    } catch (error) {
        console.error('Error creating contact:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                error: 'A contact with this phone number already exists for this user' 
            });
        }
        
        res.status(500).json({ error: 'Failed to create contact' });
    }
};

// Update a contact
exports.updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phoneE164, relationship, isPrimary } = req.body;
        
        const contact = await Contact.findById(id);
        
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        
        // If setting as primary, unset other primary contacts for this user
        if (isPrimary && !contact.isPrimary) {
            await Contact.updateMany(
                { userId: contact.userId, isPrimary: true },
                { isPrimary: false }
            );
        }
        
        // Update fields
        if (name !== undefined) contact.name = name;
        if (phoneE164 !== undefined) {
            // Validate phone number format
            const phoneRegex = /^\+[1-9]\d{1,14}$/;
            if (!phoneRegex.test(phoneE164)) {
                return res.status(400).json({ 
                    error: 'Phone number must be in E.164 format (e.g., +1234567890)' 
                });
            }
            contact.phoneE164 = phoneE164;
        }
        if (relationship !== undefined) contact.relationship = relationship;
        if (isPrimary !== undefined) contact.isPrimary = isPrimary;
        
        await contact.save();
        
        res.json({
            success: true,
            data: contact,
            message: 'Contact updated successfully'
        });
    } catch (error) {
        console.error('Error updating contact:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                error: 'A contact with this phone number already exists for this user' 
            });
        }
        
        res.status(500).json({ error: 'Failed to update contact' });
    }
};

// Delete a contact
exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        
        const contact = await Contact.findByIdAndDelete(id);
        
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        
        res.json({
            success: true,
            message: 'Contact deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
};

// Verify a contact (mark as verified)
exports.verifyContact = async (req, res) => {
    try {
        const { id } = req.params;
        
        const contact = await Contact.findById(id);
        
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        
        contact.verifiedAt = new Date();
        await contact.save();
        
        res.json({
            success: true,
            data: contact,
            message: 'Contact verified successfully'
        });
    } catch (error) {
        console.error('Error verifying contact:', error);
        res.status(500).json({ error: 'Failed to verify contact' });
    }
};

// Get primary contact for a user
exports.getPrimaryContact = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const primaryContact = await Contact.findOne({ 
            userId, 
            isPrimary: true 
        });
        
        res.json({
            success: true,
            data: primaryContact
        });
    } catch (error) {
        console.error('Error fetching primary contact:', error);
        res.status(500).json({ error: 'Failed to fetch primary contact' });
    }
};
