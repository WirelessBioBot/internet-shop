const express = require('express');
const router = express.Router();
const { pageTitle } = require('../config/site');
const requireAuth = require('../middleware/requireAuth');
const {
    getProductById,
    getProductReviews,
    recordProductView,
    recordAddToCartAction
} = require('../services/productService');
const { isProductFavorite } = require('../services/favoriteService');
const { addProductToCart } = require('../services/cartService');
const { triggerRecommendationRefresh } = require('../services/homeService');
const { getReviewFormState, submitReview, MAX_COMMENT_LENGTH } = require('../services/reviewService');

router.get('/product/:id', async (req, res, next) => {
    try {
        const productId = req.params.id;
        const userId = req.session.userId || null;

        const [product, reviews, isFavorite, reviewForm] = await Promise.all([
            getProductById(productId),
            getProductReviews(productId, userId),
            userId ? isProductFavorite(userId, productId) : Promise.resolve(false),
            userId ? getReviewFormState(userId, productId) : Promise.resolve({
                canReview: false,
                hasReview: false,
                review: null
            })
        ]);

        if (!product) {
            return res.status(404).render('error', {
                title: 'Товар не найден',
                message: 'Запрашиваемый товар не существует или был удалён.'
            });
        }

        if (userId) {
            await recordProductView(userId, product.id);
            triggerRecommendationRefresh(userId);
        }

        res.render('product', {
            title: pageTitle(product.name),
            product,
            reviews,
            reviewForm,
            maxCommentLength: MAX_COMMENT_LENGTH,
            isFavorite,
            flash: req.session.flash || null,
            isLoggedIn: Boolean(userId),
            cartCount: req.session.cartCount || 0
        });

        delete req.session.flash;
    } catch (error) {
        next(error);
    }
});

router.post('/product/:id/cart', async (req, res, next) => {
    try {
        const productId = req.params.id;
        const userId = req.session.userId;
        const quantity = Number(req.body.quantity) || 1;

        if (!userId) {
            return res.redirect(`/login?returnUrl=${encodeURIComponent(`/product/${productId}`)}`);
        }

        req.session.cartCount = await addProductToCart(userId, productId, quantity);
        await recordAddToCartAction(userId, productId);
        triggerRecommendationRefresh(userId);

        req.session.flash = {
            type: 'success',
            message: 'Товар добавлен в корзину.'
        };

        res.redirect(`/product/${productId}`);
    } catch (error) {
        if (error.status === 404 || error.status === 400) {
            req.session.flash = {
                type: 'error',
                message: error.message
            };
            return res.redirect(`/product/${req.params.id}`);
        }
        next(error);
    }
});

router.post('/product/:id/review', requireAuth, async (req, res, next) => {
    try {
        const productId = req.params.id;

        const result = await submitReview(req.session.userId, productId, {
            rating: req.body.rating,
            comment: req.body.comment
        });

        if (!result.success) {
            const message = result.errors.form
                || result.errors.rating
                || result.errors.comment
                || 'Не удалось сохранить отзыв.';

            req.session.flash = {
                type: 'error',
                message
            };
        } else {
            req.session.flash = {
                type: 'success',
                message: result.updated
                    ? 'Ваш отзыв обновлён.'
                    : 'Спасибо! Ваш отзыв опубликован.'
            };
        }

        res.redirect(`/product/${productId}#reviews`);
    } catch (error) {
        if (error.status === 404) {
            req.session.flash = {
                type: 'error',
                message: error.message
            };
            return res.redirect('/catalog');
        }

        next(error);
    }
});

module.exports = router;
