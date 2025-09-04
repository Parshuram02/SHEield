require('dotenv').config();

function getEnv(name, defaultValue) {
    const value = process.env[name];
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    return value;
}

const config = {
    server: {
        port: Number(getEnv('PORT', 8000)),
        apiKey: getEnv('API_KEY', 'change-me')
    },
    mongodb: {
        uri: getEnv('MONGODB_URI', 'mongodb://localhost:27017/sheield')
    },
    twilio: {
        accountSid: getEnv('TWILIO_ACCOUNT_SID', ''),
        authToken: getEnv('TWILIO_AUTH_TOKEN', ''),
        fromNumber: getEnv('TWILIO_FROM_NUMBER', ''),
        whatsappFrom: getEnv('TWILIO_WHATSAPP_FROM', '')
    },
    googleMaps: {
        apiKey: getEnv('GOOGLE_MAPS_API_KEY', '')
    },
    speech: {
        google: getEnv('GOOGLE_APPLICATION_CREDENTIALS', ''),
        deepgram: getEnv('DEEPGRAM_API_KEY', ''),
        assemblyAi: getEnv('ASSEMBLYAI_API_KEY', '')
    }
};

module.exports = config;



