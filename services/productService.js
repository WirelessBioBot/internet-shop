const {
    Product,
    ProductImage,
    ProductSpec,
    Category,
    Review,
    User,
    UserAction
} = require('../models');
const { calculateAverageRating } = require('./ratingService');

function buildSystemSpecs(product, category) {
    return [
        { label: 'Бренд', value: product.brand || '—' },
        { label: 'Категория', value: category ? category.name : '—' },
        { label: 'Наличие', value: product.stock_quantity > 0 ? 'В наличии' : 'Нет в наличии' },
        {
            label: 'Дата добавления',
            value: product.created_at
                ? new Date(product.created_at).toLocaleDateString('ru-RU')
                : '—'
        }
    ];
}

function formatCustomSpecs(specs) {
    return (specs || []).map((spec) => ({
        label: spec.name,
        value: spec.value
    }));
}

function formatProductDetail(product) {
    const plain = product.get({ plain: true });
    const images = (plain.images || []).map((img) => img.image_url);
    const customSpecs = formatCustomSpecs(plain.specs);
    const systemSpecs = buildSystemSpecs(plain, plain.Category);

    return {
        id: plain.id,
        name: plain.name,
        description: plain.description || 'Описание отсутствует.',
        price: Number(plain.price),
        rating: Number(plain.rating),
        brand: plain.brand,
        stockQuantity: plain.stock_quantity,
        inStock: plain.stock_quantity > 0,
        category: plain.Category
            ? { id: plain.Category.id, name: plain.Category.name }
            : null,
        images: images.length ? images : ['/images/placeholder.svg'],
        customSpecs,
        specs: [...customSpecs, ...systemSpecs]
    };
}

function formatReview(review, currentUserId = null) {
    const plain = review.get({ plain: true });

    return {
        id: plain.id,
        authorName: plain.User ? plain.User.name : 'Пользователь',
        rating: plain.rating,
        comment: plain.comment || '',
        isOwn: Boolean(currentUserId && plain.User && plain.User.id === currentUserId),
        createdAt: plain.created_at
            ? new Date(plain.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
            : ''
    };
}

async function getProductById(productId) {
    const product = await Product.findByPk(productId, {
        include: [
            {
                model: ProductImage,
                as: 'images',
                attributes: ['id', 'image_url']
            },
            {
                model: Category,
                attributes: ['id', 'name']
            },
            {
                model: ProductSpec,
                as: 'specs',
                attributes: ['id', 'name', 'value', 'sort_order'],
                separate: true,
                order: [['sort_order', 'ASC'], ['id', 'ASC']]
            }
        ]
    });

    if (!product) {
        return null;
    }

    const rating = await calculateAverageRating(productId);
    const formatted = formatProductDetail(product);
    formatted.rating = rating;

    return formatted;
}

async function getProductReviews(productId, currentUserId = null) {
    const reviews = await Review.findAll({
        where: { product_id: productId },
        include: [
            {
                model: User,
                attributes: ['id', 'name']
            }
        ],
        order: [['created_at', 'DESC']]
    });

    return reviews.map((review) => formatReview(review, currentUserId));
}

async function recordProductView(userId, productId) {
    if (!userId) {
        return;
    }

    await UserAction.create({
        user_id: userId,
        product_id: productId,
        action_type: 'view'
    });
}

async function recordAddToCartAction(userId, productId) {
    await UserAction.create({
        user_id: userId,
        product_id: productId,
        action_type: 'add_to_cart'
    });
}

module.exports = {
    getProductById,
    getProductReviews,
    recordProductView,
    recordAddToCartAction
};
