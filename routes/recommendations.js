const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { refreshRecommendationsForUser } = require('../services/homeService');
const recommendationClient = require('../services/recommendationClient');

router.get('/api/recommendations/health', async (req, res) => {
    try {
        const ok = await recommendationClient.checkHealth();
        res.json({ service: 'recommendation', available: ok });
    } catch (error) {
        res.json({ service: 'recommendation', available: false, error: error.message });
    }
});

router.post('/api/recommendations/refresh', requireAuth, async (req, res) => {
    try {
        const success = await refreshRecommendationsForUser(req.session.userId);
        res.json({
            success,
            message: success
                ? 'Рекомендации обновлены'
                : 'Сервис рекомендаций недоступен'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
