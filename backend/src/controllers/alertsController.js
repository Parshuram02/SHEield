const { AlertEvent, Contact } = require('../models');
const twilio = require('twilio');
const config = require('../config');

// Initialize Twilio client
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

// Send SMS alert to emergency contacts
exports.sendAlert = async (req, res) => {
    try {
        const { eventId, userId, customMessage } = req.body;
        
        if (!eventId && !userId) {
            return res.status(400).json({ 
                error: 'Either eventId or userId is required' 
            });
        }

        let alertEvent;
        
        if (eventId) {
            // Get existing alert event
            alertEvent = await AlertEvent.findById(eventId).populate('recipients.contactId');
            if (!alertEvent) {
                return res.status(404).json({ error: 'Alert event not found' });
            }
        } else {
            // Create new alert event from payload
            const { type, confidence, location, audioFiles, notes } = req.body;
            
            alertEvent = new AlertEvent({
                userId,
                type: type || 'manual',
                trigger: {
                    source: 'manual',
                    model: 'user_request'
                },
                confidence: confidence || 0.8,
                location,
                audioFiles: audioFiles || [],
                notes: notes || customMessage || 'Manual alert sent by user'
            });
            
            await alertEvent.save();
        }

        // Get emergency contacts for the user
        const contacts = await Contact.find({ 
            userId: alertEvent.userId,
            verifiedAt: { $exists: true } // Only send to verified contacts
        });

        if (contacts.length === 0) {
            return res.status(400).json({ 
                error: 'No verified emergency contacts found for this user' 
            });
        }

        const smsResults = [];
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Send SMS to each contact
        for (const contact of contacts) {
            try {
                // Create SMS message
                const message = createSMSMessage(alertEvent, contact, baseUrl);
                
                // Send via Twilio (SMS)
                const twilioMessage = await twilioClient.messages.create({
                    body: message,
                    from: config.twilio.fromNumber,
                    to: contact.phoneE164,
                    statusCallback: `${baseUrl}/api/alerts/twilio/status`
                });

                // Optionally send WhatsApp if configured
                let whatsappSid = null;
                if (config.twilio.whatsappFrom) {
                    try {
                        const wa = await twilioClient.messages.create({
                            body: message,
                            from: config.twilio.whatsappFrom,
                            to: `whatsapp:${contact.phoneE164.replace(/^\+?/, '')}`.startsWith('whatsapp:')
                                ? `whatsapp:${contact.phoneE164}`
                                : `whatsapp:${contact.phoneE164}`
                        });
                        whatsappSid = wa.sid;
                        console.log(`WhatsApp sent to ${contact.name}: ${wa.sid}`);
                    } catch (waErr) {
                        console.warn(`WhatsApp send failed for ${contact.name}:`, waErr.message);
                    }
                }

                // Update alert event with recipient info
                const recipientInfo = {
                    contactId: contact._id,
                    status: 'sent',
                    provider: 'twilio', // primary provider record
                    providerMessageId: twilioMessage.sid,
                    deliveredAt: null,
                    failedAt: null
                };

                alertEvent.recipients.push(recipientInfo);
                
                smsResults.push({
                    contactId: contact._id,
                    contactName: contact.name,
                    phone: contact.phoneE164,
                    status: 'sent',
                    twilioSid: twilioMessage.sid,
                    whatsappSid
                });

                console.log(`SMS sent to ${contact.name} (${contact.phoneE164}): ${twilioMessage.sid}`);

            } catch (error) {
                console.error(`Failed to send SMS to ${contact.name}:`, error);
                
                // Update alert event with failed recipient
                const recipientInfo = {
                    contactId: contact._id,
                    status: 'failed',
                    provider: 'twilio',
                    providerMessageId: null,
                    deliveredAt: null,
                    failedAt: new Date(),
                    error: error.message
                };

                alertEvent.recipients.push(recipientInfo);
                
                smsResults.push({
                    contactId: contact._id,
                    contactName: contact.name,
                    phone: contact.phoneE164,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        // Update alert event
        alertEvent.actions.smsSent = true;
        await alertEvent.save();

        res.json({
            success: true,
            alertId: alertEvent._id,
            message: 'Alert sent to emergency contacts',
            results: smsResults,
            sentCount: smsResults.filter(r => r.status === 'sent').length,
            failedCount: smsResults.filter(r => r.status === 'failed').length
        });

    } catch (error) {
        console.error('Error sending alert:', error);
        res.status(500).json({ error: 'Failed to send alert' });
    }
};

// Create SMS message content
function createSMSMessage(alertEvent, contact, baseUrl) {
    const alertType = alertEvent.type || 'emergency';
    const userName = 'User'; // Will be replaced with actual user name when auth is implemented
    
    let message = `🚨 EMERGENCY ALERT 🚨\n`;
    message += `${userName} needs help!\n`;
    message += `Type: ${alertType.toUpperCase()}\n`;
    
    if (alertEvent.location) {
        message += `Location: ${alertEvent.location.lat.toFixed(4)}, ${alertEvent.location.lng.toFixed(4)}\n`;
    }
    
    message += `Time: ${new Date(alertEvent.occurredAt).toLocaleTimeString()}\n`;
    
    // Add evidence link if available
    if (alertEvent.audioFiles && alertEvent.audioFiles.length > 0) {
        message += `Evidence: ${baseUrl}/api/evidence/${alertEvent._id}`;
    }
    
    // Ensure message is under 160 characters for single SMS
    if (message.length > 160) {
        message = message.substring(0, 157) + '...';
    }
    
    return message;
}

// Get all alerts for a user
exports.getAlerts = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20, type } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const query = { userId };
        if (type) query.type = type;

        const alerts = await AlertEvent.find(query)
            .populate('recipients.contactId', 'name phoneE164')
            .sort({ occurredAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await AlertEvent.countDocuments(query);
        
        res.json({
            success: true,
            data: alerts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
};

// Get a single alert by ID
exports.getAlert = async (req, res) => {
    try {
        const { id } = req.params;
        
        const alert = await AlertEvent.findById(id)
            .populate('recipients.contactId', 'name phoneE164 relationship');
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        res.json({
            success: true,
            data: alert
        });
    } catch (error) {
        console.error('Error fetching alert:', error);
        res.status(500).json({ error: 'Failed to fetch alert' });
    }
};

// Twilio webhook for SMS status updates
exports.twilioStatusCallback = async (req, res) => {
    try {
        const { 
            MessageSid, 
            MessageStatus, 
            To, 
            From, 
            ErrorCode, 
            ErrorMessage 
        } = req.body;

        console.log(`Twilio status update for ${MessageSid}: ${MessageStatus}`);

        // Find alert event with this Twilio SID
        const alertEvent = await AlertEvent.findOne({
            'recipients.providerMessageId': MessageSid
        });

        if (!alertEvent) {
            console.warn(`No alert event found for Twilio SID: ${MessageSid}`);
            return res.status(200).json({ received: true });
        }

        // Update recipient status
        const recipient = alertEvent.recipients.find(r => r.providerMessageId === MessageSid);
        if (recipient) {
            recipient.status = MessageStatus;
            
            if (MessageStatus === 'delivered') {
                recipient.deliveredAt = new Date();
            } else if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
                recipient.failedAt = new Date();
                recipient.error = ErrorMessage || 'Delivery failed';
            }
            
            await alertEvent.save();
            console.log(`Updated alert ${alertEvent._id} recipient status to ${MessageStatus}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error processing Twilio status callback:', error);
        res.status(500).json({ error: 'Failed to process status callback' });
    }
};

// Retry failed SMS
exports.retryFailedSMS = async (req, res) => {
    try {
        const { alertId, recipientId } = req.params;
        
        const alertEvent = await AlertEvent.findById(alertId);
        if (!alertEvent) {
            return res.status(404).json({ error: 'Alert event not found' });
        }

        const recipient = alertEvent.recipients.id(recipientId);
        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        if (recipient.status !== 'failed') {
            return res.status(400).json({ error: 'Can only retry failed messages' });
        }

        const contact = await Contact.findById(recipient.contactId);
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        // Retry sending SMS
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const message = createSMSMessage(alertEvent, contact, baseUrl);
        
        const twilioMessage = await twilioClient.messages.create({
            body: message,
            from: config.twilio.fromNumber,
            to: contact.phoneE164,
            statusCallback: `${baseUrl}/api/alerts/twilio/status`
        });

        // Update recipient info
        recipient.status = 'sent';
        recipient.providerMessageId = twilioMessage.sid;
        recipient.error = null;
        recipient.failedAt = null;
        
        await alertEvent.save();

        res.json({
            success: true,
            message: 'SMS retry successful',
            twilioSid: twilioMessage.sid
        });

    } catch (error) {
        console.error('Error retrying SMS:', error);
        res.status(500).json({ error: 'Failed to retry SMS' });
    }
};


