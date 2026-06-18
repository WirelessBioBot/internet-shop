const RECOMMENDATION_SERVICE_URL = process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = Number(process.env.RECOMMENDATION_TIMEOUT_MS) || 5000;

async function fetchRecommendations(userId, limit = 8) {
    const url = `${RECOMMENDATION_SERVICE_URL}/api/v1/recommendations/${userId}?limit=${limit}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Recommendation service responded with ${response.status}`);
        }

        return response.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function generateRecommendations(userId, limit = 8) {
    const url = `${RECOMMENDATION_SERVICE_URL}/api/v1/recommendations/${userId}/generate?limit=${limit}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Recommendation service responded with ${response.status}`);
        }

        return response.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function checkHealth() {
    const url = `${RECOMMENDATION_SERVICE_URL}/health`;
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
}

module.exports = {
    fetchRecommendations,
    generateRecommendations,
    checkHealth
};
