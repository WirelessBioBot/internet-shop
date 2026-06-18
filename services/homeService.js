const { Op } = require('sequelize');
const {
    Category,
    Product,
    ProductImage,
    Recommendation,
    SearchHistory
} = require('../models');
const { getCategoryImage } = require('../utils/categoryImages');
const {
    fetchAndSyncRecommendations,
    loadProductsByRecommendations
} = require('./recommendationSyncService');

const HOME_POPULAR_PRODUCTS_LIMIT = 8;
const HOME_OFTEN_CHOSEN_LIMIT = 4;
const POPULAR_PRODUCTS_LIMIT = HOME_POPULAR_PRODUCTS_LIMIT;
const GUEST_OFTEN_CHOSEN_LIMIT = HOME_OFTEN_CHOSEN_LIMIT;
const RECOMMENDATIONS_LIMIT = 8;

const productInclude = [
    {
        model: ProductImage,
        as: 'images',
        required: false,
        attributes: ['image_url']
    },
    {
        model: Category,
        attributes: ['id', 'name']
    }
];

function formatProduct(product) {
    const plain = product.get({ plain: true });
    const firstImage = (plain.images || [])
        .map((img) => img.image_url)
        .find(Boolean);

    return {
        id: plain.id,
        title: plain.name,
        price: Number(plain.price),
        rating: Number(plain.rating),
        brand: plain.brand,
        image: firstImage || '/images/placeholder.svg',
        category: plain.Category ? plain.Category.name : null
    };
}

const HOME_CATEGORIES_LIMIT = 10;

async function getCategories(limit = 8) {
    const categories = await Category.findAll({
        where: { parent_id: null },
        order: [['name', 'ASC']],
        limit
    });

    return categories.map((category) => formatCategoryBrief(category));
}

function formatCategoryBrief(category) {
    return {
        id: category.id,
        name: category.name,
        image: getCategoryImage(category.name)
    };
}

async function getPopularCategories(limit = HOME_CATEGORIES_LIMIT) {
    const [categories, productCounts] = await Promise.all([
        Category.findAll({
            where: { parent_id: null },
            order: [['name', 'ASC']]
        }),
        getProductCountsByCategory()
    ]);

    const ranked = categories
        .map((category) => ({
            ...formatCategoryBrief(category),
            productsCount: productCounts[category.id] || 0
        }))
        .sort((a, b) => b.productsCount - a.productsCount || a.name.localeCompare(b.name, 'ru'));

    const withProducts = ranked.filter((category) => category.productsCount > 0);
    const selected = (withProducts.length ? withProducts : ranked).slice(0, limit);

    return selected.map(({ id, name, image }) => ({ id, name, image }));
}

async function getCategoriesFromRecommendationItems(items, limit = HOME_CATEGORIES_LIMIT) {
    if (!items.length) {
        return [];
    }

    const productIds = items.map((item) => item.product_id);
    const products = await Product.findAll({
        where: { id: { [Op.in]: productIds } },
        include: [{
            model: Category,
            attributes: ['id', 'name', 'parent_id'],
            include: [{
                model: Category,
                as: 'parent',
                attributes: ['id', 'name'],
                required: false
            }]
        }]
    });

    const productMap = new Map(products.map((product) => [Number(product.id), product]));
    const categoryScores = new Map();

    for (const item of items) {
        const product = productMap.get(Number(item.product_id));
        const category = product?.Category;
        if (!category) {
            continue;
        }

        const rootCategory = category.parent || category;
        const categoryId = Number(rootCategory.id);
        const existing = categoryScores.get(categoryId) || {
            id: categoryId,
            name: rootCategory.name,
            score: 0
        };
        existing.score += Number(item.score) || 1;
        categoryScores.set(categoryId, existing);
    }

    return [...categoryScores.values()]
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ru'))
        .slice(0, limit)
        .map((category) => ({
            id: category.id,
            name: category.name,
            image: getCategoryImage(category.name)
        }));
}

async function getRecommendedCategoriesForUser(userId, limit = HOME_CATEGORIES_LIMIT) {
    const fetchLimit = Math.max(limit * 3, RECOMMENDATIONS_LIMIT);

    if (process.env.RECOMMENDATION_SERVICE_ENABLED !== 'false') {
        try {
            const items = await fetchAndSyncRecommendations(userId, fetchLimit);
            if (items.length) {
                const categories = await getCategoriesFromRecommendationItems(items, limit);
                if (categories.length) {
                    return categories;
                }
            }
        } catch (error) {
            console.warn('Recommendation Service недоступен для категорий:', error.message);
        }
    }

    const recommendations = await Recommendation.findAll({
        where: { user_id: userId },
        attributes: ['product_id', 'score'],
        order: [['score', 'DESC']],
        limit: fetchLimit,
        raw: true
    });

    if (recommendations.length) {
        const categories = await getCategoriesFromRecommendationItems(recommendations, limit);
        if (categories.length) {
            return categories;
        }
    }

    return getPopularCategories(limit);
}

async function getHomeCategories(userId, limit = HOME_CATEGORIES_LIMIT) {
    if (!userId) {
        return getPopularCategories(limit);
    }

    return getRecommendedCategoriesForUser(userId, limit);
}

const CATEGORY_SORT_OPTIONS = ['name_asc', 'name_desc', 'products_desc', 'products_asc'];

function parseCategoryPageFilters(query = {}) {
    return {
        q: (query.q || '').trim(),
        sort: CATEGORY_SORT_OPTIONS.includes(query.sort) ? query.sort : 'name_asc',
        stock: query.stock === 'with_products' ? 'with_products' : 'all'
    };
}

async function getProductCountsByCategory() {
    const rows = await Product.findAll({
        attributes: [
            'category_id',
            [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'count']
        ],
        group: ['category_id'],
        raw: true
    });

    return Object.fromEntries(
        rows.map((row) => [Number(row.category_id), Number(row.count)])
    );
}

function mapCategoryForPage(category, productCounts) {
    const plain = category.get({ plain: true });

    return {
        id: plain.id,
        name: plain.name,
        parentId: plain.parent_id,
        parentName: plain.parent ? plain.parent.name : null,
        childrenCount: (plain.children || []).length,
        productsCount: productCounts[plain.id] || 0,
        image: getCategoryImage(plain.name)
    };
}

function sortCategories(items, sort) {
    const sorted = [...items];

    switch (sort) {
        case 'name_desc':
            sorted.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
            break;
        case 'products_desc':
            sorted.sort((a, b) => b.productsCount - a.productsCount || a.name.localeCompare(b.name, 'ru'));
            break;
        case 'products_asc':
            sorted.sort((a, b) => a.productsCount - b.productsCount || a.name.localeCompare(b.name, 'ru'));
            break;
        default:
            sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    }

    return sorted;
}

function filterCategories(items, filters) {
    let result = items;

    if (filters.q) {
        const query = filters.q.toLowerCase();
        result = result.filter((item) => item.name.toLowerCase().includes(query));
    }

    if (filters.stock === 'with_products') {
        result = result.filter((item) => item.productsCount > 0);
    }

    return result;
}

function hasActiveCategoryFilters(filters) {
    return Boolean(
        filters.q
        || filters.sort !== 'name_asc'
        || filters.stock !== 'all'
    );
}

async function getCategoriesPageData(query = {}) {
    const filters = parseCategoryPageFilters(query);

    const [categories, productCounts] = await Promise.all([
        Category.findAll({
            include: [
                {
                    model: Category,
                    as: 'parent',
                    attributes: ['id', 'name'],
                    required: false
                },
                {
                    model: Category,
                    as: 'children',
                    attributes: ['id'],
                    required: false
                }
            ],
            order: [['name', 'ASC']]
        }),
        getProductCountsByCategory()
    ]);

    const allCategories = categories.map((category) => mapCategoryForPage(category, productCounts));
    const filtered = sortCategories(
        filterCategories(allCategories, filters),
        filters.sort
    );

    return {
        categories: filtered,
        filters,
        totalCount: filtered.length,
        hasActiveFilters: hasActiveCategoryFilters(filters)
    };
}

async function getCategoryById(categoryId) {
    const category = await Category.findByPk(categoryId);

    if (!category) {
        return null;
    }

    return {
        id: category.id,
        name: category.name,
        image: getCategoryImage(category.name)
    };
}

async function getProductsByCategory(categoryId) {
    const products = await Product.findAll({
        where: { category_id: categoryId },
        include: productInclude,
        order: [['rating', 'DESC'], ['created_at', 'DESC']]
    });

    return products.map(formatProduct);
}

async function getPopularProducts(limit = POPULAR_PRODUCTS_LIMIT) {
    const products = await Product.findAll({
        where: {
            stock_quantity: { [Op.gt]: 0 }
        },
        include: productInclude,
        order: [['rating', 'DESC'], ['created_at', 'DESC']],
        limit
    });

    return products.map(formatProduct);
}

async function getOftenChosenProducts(limit = GUEST_OFTEN_CHOSEN_LIMIT) {
    const popular = await getPopularProducts(POPULAR_PRODUCTS_LIMIT);
    const popularIds = popular.map((product) => product.id);

    const products = await Product.findAll({
        where: {
            stock_quantity: { [Op.gt]: 0 },
            ...(popularIds.length ? { id: { [Op.notIn]: popularIds } } : {})
        },
        include: productInclude,
        order: [['rating', 'DESC'], ['created_at', 'DESC']],
        limit
    });

    if (products.length) {
        return products.map(formatProduct);
    }

    return popular.slice(0, limit);
}

async function getRecommendationsFromDb(userId, limit = RECOMMENDATIONS_LIMIT) {
    const recommendations = await Recommendation.findAll({
        where: { user_id: userId },
        include: [
            {
                model: Product,
                required: true,
                where: { stock_quantity: { [Op.gt]: 0 } },
                include: productInclude
            }
        ],
        order: [['score', 'DESC']],
        limit
    });

    if (!recommendations.length) {
        return null;
    }

    return recommendations
        .map((row) => row.Product)
        .filter(Boolean)
        .map(formatProduct);
}

async function getRecommendations(userId, limit = RECOMMENDATIONS_LIMIT) {
    if (!userId) {
        return getOftenChosenProducts(limit);
    }

    const fromDb = await getRecommendationsFromDb(userId, limit);
    if (fromDb?.length) {
        return fromDb;
    }

    if (process.env.RECOMMENDATION_SERVICE_ENABLED !== 'false') {
        try {
            const items = await fetchAndSyncRecommendations(userId, limit, true);
            if (items.length) {
                const products = await loadProductsByRecommendations(items);
                if (products.length) {
                    return products;
                }
            }
        } catch (error) {
            console.warn('Recommendation Service недоступен:', error.message);
        }
    }

    return getPopularProducts(limit);
}

async function refreshRecommendationsForUser(userId, limit = RECOMMENDATIONS_LIMIT) {
    if (process.env.RECOMMENDATION_SERVICE_ENABLED === 'false') {
        return false;
    }

    try {
        await fetchAndSyncRecommendations(userId, limit, true);
        return true;
    } catch (error) {
        console.warn('Не удалось обновить рекомендации:', error.message);
        return false;
    }
}

function triggerRecommendationRefresh(userId, limit = RECOMMENDATIONS_LIMIT) {
    if (!userId || process.env.RECOMMENDATION_SERVICE_ENABLED === 'false') {
        return;
    }

    refreshRecommendationsForUser(userId, limit).catch((error) => {
        console.warn('Фоновое обновление рекомендаций не удалось:', error.message);
    });
}

async function searchProducts(query, limit = 12) {
    const trimmed = query.trim();
    if (!trimmed) {
        return [];
    }

    const products = await Product.findAll({
        where: {
            [Op.or]: [
                { name: { [Op.iLike]: `%${trimmed}%` } },
                { description: { [Op.iLike]: `%${trimmed}%` } },
                { brand: { [Op.iLike]: `%${trimmed}%` } }
            ]
        },
        include: productInclude,
        order: [['rating', 'DESC']],
        limit
    });

    return products.map(formatProduct);
}

async function saveSearchQuery(query, userId) {
    const trimmed = query.trim();
    if (!trimmed || !userId) {
        return;
    }

    await SearchHistory.create({
        query: trimmed,
        user_id: userId
    });
}

const CATALOG_SORT_OPTIONS = ['name_asc', 'name_desc', 'price_asc', 'price_desc', 'rating_desc'];

function parseCatalogPageFilters(query = {}) {
    return {
        q: (query.q || '').trim(),
        category: (query.category || 'all').trim(),
        brand: (query.brand || 'all').trim(),
        stock: query.stock === 'in_stock' ? 'in_stock' : 'all',
        sort: CATALOG_SORT_OPTIONS.includes(query.sort) ? query.sort : 'rating_desc'
    };
}

function buildCatalogWhere(filters) {
    const conditions = [];

    if (filters.category !== 'all') {
        const categoryId = Number(filters.category);
        if (!Number.isNaN(categoryId)) {
            conditions.push({ category_id: categoryId });
        }
    }

    if (filters.stock === 'in_stock') {
        conditions.push({ stock_quantity: { [Op.gt]: 0 } });
    }

    if (filters.brand !== 'all') {
        conditions.push({ brand: filters.brand });
    }

    if (filters.q) {
        conditions.push({
            [Op.or]: [
                { name: { [Op.iLike]: `%${filters.q}%` } },
                { description: { [Op.iLike]: `%${filters.q}%` } },
                { brand: { [Op.iLike]: `%${filters.q}%` } }
            ]
        });
    }

    if (!conditions.length) {
        return {};
    }

    if (conditions.length === 1) {
        return conditions[0];
    }

    return { [Op.and]: conditions };
}

function getCatalogOrder(sort) {
    switch (sort) {
        case 'name_desc':
            return [['name', 'DESC']];
        case 'price_asc':
            return [['price', 'ASC'], ['name', 'ASC']];
        case 'price_desc':
            return [['price', 'DESC'], ['name', 'ASC']];
        case 'name_asc':
            return [['name', 'ASC']];
        default:
            return [['rating', 'DESC'], ['name', 'ASC']];
    }
}

function hasActiveCatalogFilters(filters) {
    return Boolean(
        filters.q
        || filters.category !== 'all'
        || filters.brand !== 'all'
        || filters.stock !== 'all'
        || filters.sort !== 'rating_desc'
    );
}

async function getDistinctBrands() {
    const rows = await Product.findAll({
        attributes: ['brand'],
        where: {
            brand: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
        },
        group: ['brand'],
        order: [['brand', 'ASC']],
        raw: true
    });

    return rows.map((row) => row.brand).filter(Boolean);
}

async function getCatalogPageData(query = {}) {
    const filters = parseCatalogPageFilters(query);

    let activeCategory = null;
    if (filters.category !== 'all') {
        const categoryId = Number(filters.category);
        if (Number.isNaN(categoryId)) {
            const error = new Error('Некорректная категория');
            error.status = 404;
            throw error;
        }

        activeCategory = await getCategoryById(categoryId);
        if (!activeCategory) {
            const error = new Error('Категория не найдена');
            error.status = 404;
            throw error;
        }
    }

    const [products, filterCategories, brands] = await Promise.all([
        Product.findAll({
            where: buildCatalogWhere(filters),
            include: productInclude,
            order: getCatalogOrder(filters.sort)
        }),
        Category.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        }),
        getDistinctBrands()
    ]);

    return {
        products: products.map(formatProduct),
        filterCategories: filterCategories.map((category) => ({
            id: category.id,
            name: category.name
        })),
        brands,
        filters,
        activeCategory,
        totalCount: products.length,
        hasActiveFilters: hasActiveCatalogFilters(filters)
    };
}

module.exports = {
    HOME_CATEGORIES_LIMIT,
    HOME_POPULAR_PRODUCTS_LIMIT,
    HOME_OFTEN_CHOSEN_LIMIT,
    getCategories,
    getHomeCategories,
    getPopularCategories,
    getCategoriesPageData,
    parseCategoryPageFilters,
    getCatalogPageData,
    parseCatalogPageFilters,
    getCategoryById,
    getProductsByCategory,
    getPopularProducts,
    getOftenChosenProducts,
    getRecommendations,
    refreshRecommendationsForUser,
    triggerRecommendationRefresh,
    searchProducts,
    saveSearchQuery,
    formatProduct,
    GUEST_OFTEN_CHOSEN_LIMIT,
    RECOMMENDATIONS_LIMIT
};
