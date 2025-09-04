require('dotenv').config();

function getEnv(name, defaultValue) {
    const value = process.env[name];
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    return value;
}

const config = {
    port: Number(getEnv('PORT', 8000)),
    apiKey: getEnv('API_KEY', ''),
    mongodbUri: getEnv('MONGODB_URI', ''),
    twilio: {
        accountSid: getEnv('TWILIO_ACCOUNT_SID', ''),
        authToken: getEnv('TWILIO_AUTH_TOKEN', ''),
        fromNumber: getEnv('TWILIO_FROM_NUMBER', ''),
    },
    googleMapsApiKey: getEnv('GOOGLE_MAPS_API_KEY', ''),
    speech: {
        google: getEnv('GOOGLE_STT_KEY', ''),
        deepgram: getEnv('DEEPGRAM_API_KEY', ''),
        assemblyAi: getEnv('ASSEMBLYAI_API_KEY', ''),
    },
};

module.exports = config;



