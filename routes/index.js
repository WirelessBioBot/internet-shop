const express = require('express');
const router = express.Router();
const { pageTitle } = require('../config/site');
const {
    getHomeCategories,
    getCategoriesPageData,
    getCatalogPageData,
    getPopularProducts,
    getOftenChosenProducts,
    getRecommendations,
    searchProducts,
    saveSearchQuery,
    HOME_CATEGORIES_LIMIT,
    HOME_POPULAR_PRODUCTS_LIMIT,
    HOME_OFTEN_CHOSEN_LIMIT
} = require('../services/homeService');

router.get('/', async (req, res, next) => {
    try {
        const searchQuery = (req.query.q || '').trim();
        const userId = req.session.userId || null;

        const [categories, popularProducts, recommendations] = await Promise.all([
            getHomeCategories(userId, HOME_CATEGORIES_LIMIT),
            getPopularProducts(HOME_POPULAR_PRODUCTS_LIMIT),
            userId
                ? getRecommendations(userId)
                : getOftenChosenProducts(HOME_OFTEN_CHOSEN_LIMIT)
        ]);

        let searchResults = [];
        if (searchQuery) {
            await saveSearchQuery(searchQuery, userId);
            searchResults = await searchProducts(searchQuery);
        }

        res.render('index', {
            title: pageTitle('Главная'),
            categories,
            products: popularProducts,
            recommendations,
            recommendationsTitle: userId ? 'Рекомендуем вам' : 'Часто выбирают',
            recommendationsEmptyMessage: userId
                ? 'Рекомендации появятся после авторизации и активности в магазине.'
                : 'Товары появятся после наполнения каталога.',
            searchQuery,
            searchResults,
            cartCount: req.session.cartCount || 0
        });

    } catch (error) {
        next(error);
    }
});

router.get('/categories', async (req, res, next) => {
    try {
        const pageData = await getCategoriesPageData(req.query);

        res.render('categories', {
            title: pageTitle('Категории'),
            ...pageData,
            cartCount: req.session.cartCount || 0
        });
    } catch (error) {
        next(error);
    }
});

router.get('/catalog', async (req, res, next) => {
    try {
        const pageData = await getCatalogPageData(req.query);

        const pageTitleText = pageData.activeCategory
            ? pageData.activeCategory.name
            : 'Каталог';

        res.render('catalog', {
            title: pageTitle(pageTitleText),
            ...pageData,
            cartCount: req.session.cartCount || 0
        });
    } catch (error) {
        if (error.status === 404) {
            return res.status(404).render('error', {
                title: 'Категория не найдена',
                message: 'Запрашиваемая категория не существует или была удалена.'
            });
        }

        next(error);
    }
});

module.exports = router;
