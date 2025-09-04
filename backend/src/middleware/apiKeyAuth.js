module.exports = function apiKeyAuth(req, res, next) {
    const configuredKey = process.env.API_KEY;
    if (!configuredKey) {
        return res.status(500).json({ error: 'Server API key not configured' });
    }
    const headerKey = req.header('x-api-key');
    if (headerKey && headerKey === configuredKey) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
};





