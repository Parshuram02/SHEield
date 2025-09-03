const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phoneE164: {
            type: String,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
        },
        apiKeyHash: {
            type: String,
            select: false,
        },
        settings: {
            sirenDefault: { type: Boolean, default: false },
            flashDefault: { type: Boolean, default: false },
            alertSensitivity: { type: Number, min: 0, max: 1, default: 0.5 },
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('User', UserSchema);


