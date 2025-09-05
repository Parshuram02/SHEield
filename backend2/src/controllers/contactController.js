const Contact = require('../models/contact');

// Add a new emergency contact
exports.addContact = async (req, res) => {
    try {
        console.log('Adding contact - Request body:', req.body);
        const { userId, name, phoneE164, isPrimary, relationship } = req.body;
        // If isPrimary, unset previous primary
        if (isPrimary) {
            console.log('Setting as primary, unsetting previous primary contacts for user:', userId);
            await Contact.updateMany({ userId, isPrimary: true }, { isPrimary: false });
        }
        const contact = new Contact({ userId, name, phoneE164, relationship, isPrimary: !!isPrimary });
        await contact.save();
        console.log('Contact added successfully:', contact);
        res.status(201).json({ message: 'Contact added', contact });
    } catch (err) {
        console.error('Error adding contact:', err);
        res.status(500).json({ error: err.message });
    }
};// Set a contact as primary
exports.setPrimary = async (req, res) => {
	try {
		console.log('Setting contact as primary - Request body:', req.body);
		const { userId, contactId } = req.body;
		// Unset previous primary
		console.log('Unsetting previous primary contacts for user:', userId);
		await Contact.updateMany({ userId, isPrimary: true }, { isPrimary: false });
		// Set new primary
		console.log('Setting contact as primary:', contactId);
		const updated = await Contact.findByIdAndUpdate(contactId, { isPrimary: true }, { new: true });
		console.log('Contact updated:', updated);
		res.json({ message: 'Primary contact set', contact: updated });
	} catch (err) {
		console.error('Error setting primary contact:', err);
		res.status(500).json({ error: err.message });
	}
};

// Remove primary status from a contact
exports.removePrimary = async (req, res) => {
    try {
        console.log('Removing primary status - Request body:', req.body);
        const { contactId, userId } = req.body;
        
        if (!userId) {
            console.warn('No userId provided for removing primary status');
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        console.log(`Removing primary status from contact ${contactId} for user ${userId}`);
        const updated = await Contact.findOneAndUpdate(
            { _id: contactId, userId: userId },
            { isPrimary: false }, 
            { new: true }
        );
        
        if (!updated) {
            console.warn(`Contact not found or doesn't belong to user ${userId}`);
            return res.status(404).json({ error: 'Contact not found or access denied' });
        }
        
        console.log('Contact updated:', updated);
        res.json({ message: 'Primary status removed', contact: updated });
    } catch (err) {
        console.error('Error removing primary status:', err);
        res.status(500).json({ error: err.message });
    }
};// Delete an emergency contact
exports.deleteContact = async (req, res) => {
	try {
		console.log('Deleting contact - Request body:', req.body);
		const { contactId, userId } = req.body;
		
		if (!userId) {
			console.warn('No userId provided for contact deletion');
			return res.status(400).json({ error: 'User ID is required' });
		}
		
		console.log(`Deleting contact ${contactId} for user ${userId}`);
		const result = await Contact.findOneAndDelete({ _id: contactId, userId: userId });
		
		if (!result) {
			console.warn(`Contact not found or doesn't belong to user ${userId}`);
			return res.status(404).json({ error: 'Contact not found or access denied' });
		}
		
		console.log('Delete result:', result);
		res.json({ message: 'Contact deleted' });
	} catch (err) {
		console.error('Error deleting contact:', err);
		res.status(500).json({ error: err.message });
	}
};

// Get all contacts for a user
exports.getContacts = async (req, res) => {
	try {
		console.log('Getting contacts for user - Query:', req.query);
		const userId = req.params.USER_ID;
		console.log('Fetching contacts for user ID:', userId);
		
		if (!userId) {
			return res.status(400).json({ error: 'User ID is required' });
		}
		
		const contacts = await Contact.find({ userId }).sort({ isPrimary: -1, createdAt: -1 });
		console.log(`Found ${contacts.length} contacts for user ${userId}`);
		
		res.json({ 
			message: 'Contacts retrieved successfully',
			contacts,
			count: contacts.length
		});
	} catch (err) {
		console.error('Error fetching contacts:', err);
		res.status(500).json({ error: err.message });
	}
};
