const { Op } = require('sequelize');
const { Product, Order, OrderItem, Review } = require('../models');
const { syncProductRating } = require('./ratingService');

const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_COMMENT_LENGTH = 2000;

async function hasUserPurchasedProduct(userId, productId) {
    if (!userId || !productId) {
        return false;
    }

    const orderItem = await OrderItem.findOne({
        where: { product_id: productId },
        include: [
            {
                model: Order,
                required: true,
                where: {
                    user_id: userId,
                    payment_status: 'paid',
                    status: { [Op.ne]: 'cancelled' }
                },
                attributes: ['id']
            }
        ],
        attributes: ['id']
    });

    return Boolean(orderItem);
}

async function getUserReviewForProduct(userId, productId) {
    if (!userId || !productId) {
        return null;
    }

    const review = await Review.findOne({
        where: {
            user_id: userId,
            product_id: productId
        }
    });

    if (!review) {
        return null;
    }

    return {
        id: review.id,
        rating: review.rating,
        comment: review.comment || ''
    };
}

async function getReviewFormState(userId, productId) {
    if (!userId) {
        return {
            canReview: false,
            hasReview: false,
            review: null
        };
    }

    const [canReview, review] = await Promise.all([
        hasUserPurchasedProduct(userId, productId),
        getUserReviewForProduct(userId, productId)
    ]);

    return {
        canReview,
        hasReview: Boolean(review),
        review
    };
}

function validateReviewForm({ rating, comment }) {
    const errors = {};
    const parsedRating = Number(rating);
    const normalizedComment = (comment || '').trim();

    if (!Number.isInteger(parsedRating) || parsedRating < MIN_RATING || parsedRating > MAX_RATING) {
        errors.rating = 'Выберите оценку от 1 до 5';
    }

    if (normalizedComment.length > MAX_COMMENT_LENGTH) {
        errors.comment = `Комментарий не должен превышать ${MAX_COMMENT_LENGTH} символов`;
    }

    return {
        errors,
        values: {
            rating: parsedRating,
            comment: normalizedComment || null
        },
        isValid: Object.keys(errors).length === 0
    };
}

async function submitReview(userId, productId, formData) {
    const product = await Product.findByPk(productId);

    if (!product) {
        const error = new Error('Товар не найден');
        error.status = 404;
        throw error;
    }

    const canReview = await hasUserPurchasedProduct(userId, productId);

    if (!canReview) {
        return {
            success: false,
            errors: { form: 'Оставить отзыв можно только после покупки и оплаты товара.' }
        };
    }

    const { errors, values, isValid } = validateReviewForm(formData);

    if (!isValid) {
        return { success: false, errors };
    }

    const existingReview = await Review.findOne({
        where: {
            user_id: userId,
            product_id: productId
        }
    });

    if (existingReview) {
        await existingReview.update({
            rating: values.rating,
            comment: values.comment
        });
    } else {
        await Review.create({
            user_id: userId,
            product_id: productId,
            rating: values.rating,
            comment: values.comment
        });
    }

    await syncProductRating(productId);

    return {
        success: true,
        updated: Boolean(existingReview)
    };
}

module.exports = {
    MIN_RATING,
    MAX_RATING,
    MAX_COMMENT_LENGTH,
    hasUserPurchasedProduct,
    getUserReviewForProduct,
    getReviewFormState,
    validateReviewForm,
    submitReview
};
