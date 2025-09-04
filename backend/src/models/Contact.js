const mongoose = require('mongoose');
const { Schema } = mongoose;

const ContactSchema = new Schema(
    {
        userId: {
            type: Schema.Types.Mixed, // Allow both ObjectId and String for flexibility
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phoneE164: {
            type: String,
            required: true,
            trim: true,
        },
        relationship: {
            type: String,
            trim: true,
        },
        isPrimary: {
            type: Boolean,
            default: false,
        },
        verifiedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('Contact', ContactSchema);


