const mongoose = require('mongoose');
const { Schema } = mongoose;

const LocationSchema = new Schema(
    {
        lat: { type: Number },
        lng: { type: Number },
        accuracyMeters: { type: Number },
        source: { type: String, enum: ['device', 'ip', 'manual'], default: 'device' },
    },
    { _id: false }
);

const RecipientSchema = new Schema(
    {
        contactId: { type: Schema.Types.ObjectId, ref: 'Contact' },
        status: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' },
        provider: { type: String, enum: ['twilio', 'none'], default: 'twilio' },
        providerMessageId: { type: String },
        deliveredAt: { type: Date },
        failedAt: { type: Date },
        error: { type: String },
    },
    { _id: false }
);

const AlertEventSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: {
            type: String,
            enum: ['scream', 'crash', 'running', 'keyword', 'manual', 'unknown'],
            default: 'unknown',
            index: true,
        },
        confidence: { type: Number, min: 0, max: 1 },
        trigger: {
            source: { type: String, enum: ['model', 'keyword', 'manual'], required: true },
            model: { type: String },
            keyword: { type: String },
        },
        location: LocationSchema,
        audioFiles: [{ type: String }],
        notes: { type: String },
        actions: {
            smsSent: { type: Boolean, default: false },
            siren: { type: Boolean, default: false },
            flash: { type: Boolean, default: false },
        },
        recipients: [RecipientSchema],
        meta: { type: Schema.Types.Mixed },
        occurredAt: { type: Date, default: Date.now, index: true },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('AlertEvent', AlertEventSchema);


