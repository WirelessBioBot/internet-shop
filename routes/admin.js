const express = require('express');
const router = express.Router();
const { pageTitle } = require('../config/site');
const requireAdmin = require('../middleware/requireAdmin');
const {
    parseAdminFilters,
    buildAdminQueryString
} = require('../utils/adminFilters');
const {
    getDashboardStats,
    getActiveOrders,
    getCompletedOrders,
    getUsersList,
    updateOrderStatus,
    updateOrderPaymentStatus,
    ORDER_STATUSES,
    PAYMENT_STATUSES,
    ORDER_STATUS_LABELS,
    PAYMENT_STATUS_LABELS
} = require('../services/adminService');
const {
    getCategoriesForSelect,
    getProductsList,
    getProductForEdit,
    createProduct,
    updateProduct,
    DEFAULT_IMAGE
} = require('../services/adminProductService');
const {
    getCategoriesAdminList,
    getCategoryForEdit,
    getCategoriesForParentSelect,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../services/adminCategoryService');

function emptyCategoryValues() {
    return {
        name: '',
        parent_id: ''
    };
}

function emptyProductValues() {
    return {
        name: '',
        description: '',
        brand: '',
        price: '',
        stock_quantity: '0',
        category_id: '',
        image_url: DEFAULT_IMAGE,
        specs: [{ name: '', value: '' }]
    };
}

router.get('/admin', requireAdmin, async (req, res, next) => {
    try {
        const filters = parseAdminFilters(req.query);
        req.session.adminQuery = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';

        const [stats, activeOrders, completedOrders, users, products, categories, adminCategories] = await Promise.all([
            getDashboardStats(),
            getActiveOrders(filters),
            getCompletedOrders(filters),
            getUsersList(filters),
            getProductsList(filters),
            getCategoriesForSelect(),
            getCategoriesAdminList()
        ]);

        res.render('admin/dashboard', {
            title: pageTitle('Админ-панель'),
            layout: 'admin',
            stats,
            activeOrders,
            completedOrders,
            users,
            products,
            categories,
            adminCategories,
            filters,
            orderResetUrl: `/admin${buildAdminQueryString(filters, { excludeSection: 'order' })}#orders`,
            productResetUrl: `/admin${buildAdminQueryString(filters, { excludeSection: 'product' })}#products`,
            userResetUrl: `/admin${buildAdminQueryString(filters, { excludeSection: 'user' })}#users`,
            orderStatuses: ORDER_STATUSES,
            paymentStatuses: PAYMENT_STATUSES,
            orderStatusLabels: ORDER_STATUS_LABELS,
            paymentStatusLabels: PAYMENT_STATUS_LABELS,
            flash: req.session.flash || null,
            activeNav: 'overview'
        });

        delete req.session.flash;
    } catch (error) {
        next(error);
    }
});

router.get('/admin/categories/new', requireAdmin, async (req, res, next) => {
    try {
        const parentCategories = await getCategoriesForParentSelect();

        res.render('admin/category-form', {
            title: pageTitle('Новая категория'),
            isEdit: false,
            categoryId: null,
            parentCategories,
            values: emptyCategoryValues(),
            errors: {},
            activeNav: 'categories'
        });
    } catch (error) {
        next(error);
    }
});

router.post('/admin/categories', requireAdmin, async (req, res, next) => {
    try {
        const result = await createCategory(req.body);

        if (!result.success) {
            const parentCategories = await getCategoriesForParentSelect();
            return res.status(400).render('admin/category-form', {
                title: pageTitle('Новая категория'),
                isEdit: false,
                categoryId: null,
                parentCategories,
                values: {
                    name: result.values.name,
                    parent_id: result.values.parent_id ? String(result.values.parent_id) : ''
                },
                errors: result.errors,
                activeNav: 'categories'
            });
        }

        req.session.flash = {
            type: 'success',
            message: `Категория «${result.category.name}» создана.`
        };

        res.redirect('/admin#categories');
    } catch (error) {
        if (error.status === 400) {
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect('/admin/categories/new');
        }
        next(error);
    }
});

router.get('/admin/categories/:id/edit', requireAdmin, async (req, res, next) => {
    try {
        const [category, parentCategories] = await Promise.all([
            getCategoryForEdit(req.params.id),
            getCategoriesForParentSelect(req.params.id)
        ]);

        if (!category) {
            req.session.flash = { type: 'error', message: 'Категория не найдена' };
            return res.redirect('/admin#categories');
        }

        res.render('admin/category-form', {
            title: pageTitle(`Редактирование: ${category.name}`),
            isEdit: true,
            categoryId: category.id,
            parentCategories,
            values: {
                name: category.name,
                parent_id: category.parentId ? String(category.parentId) : ''
            },
            errors: {},
            activeNav: 'categories'
        });
    } catch (error) {
        next(error);
    }
});

router.post('/admin/categories/:id', requireAdmin, async (req, res, next) => {
    try {
        const result = await updateCategory(req.params.id, req.body);

        if (!result.success) {
            const parentCategories = await getCategoriesForParentSelect(req.params.id);
            return res.status(400).render('admin/category-form', {
                title: pageTitle('Редактирование категории'),
                isEdit: true,
                categoryId: req.params.id,
                parentCategories,
                values: {
                    name: result.values.name,
                    parent_id: result.values.parent_id ? String(result.values.parent_id) : ''
                },
                errors: result.errors,
                activeNav: 'categories'
            });
        }

        req.session.flash = {
            type: 'success',
            message: `Категория «${result.category.name}» обновлена.`
        };

        res.redirect('/admin#categories');
    } catch (error) {
        if (error.status === 404) {
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect('/admin#categories');
        }
        if (error.status === 400) {
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect(`/admin/categories/${req.params.id}/edit`);
        }
        next(error);
    }
});

router.post('/admin/categories/:id/delete', requireAdmin, async (req, res, next) => {
    try {
        await deleteCategory(req.params.id);
        req.session.flash = {
            type: 'success',
            message: 'Категория удалена.'
        };
        res.redirect('/admin#categories');
    } catch (error) {
        if (error.status === 400 || error.status === 404) {
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect('/admin#categories');
        }
        next(error);
    }
});

router.get('/admin/products/new', requireAdmin, async (req, res, next) => {
    try {
        const categories = await getCategoriesForSelect();

        res.render('admin/product-form', {
            title: pageTitle('Новый товар'),
            isEdit: false,
            productId: null,
            categories,
            values: emptyProductValues(),
            errors: {},
            activeNav: 'products'
        });
    } catch (error) {
        next(error);
    }
});

router.post('/admin/products', requireAdmin, async (req, res, next) => {
    try {
        const result = await createProduct(req.body);

        if (!result.success) {
            const categories = await getCategoriesForSelect();
            return res.status(400).render('admin/product-form', {
                title: pageTitle('Новый товар'),
                isEdit: false,
                productId: null,
                categories,
                values: result.values,
                errors: result.errors,
                activeNav: 'products'
            });
        }

        req.session.flash = {
            type: 'success',
            message: `Товар «${result.product.name}» добавлен в каталог.`
        };

        res.redirect('/admin#products');
    } catch (error) {
        if (error.status === 400) {
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect('/admin/products/new');
        }
        next(error);
    }
});

router.get('/admin/products/:id/edit', requireAdmin, async (req, res, next) => {
    try {
        const [product, categories] = await Promise.all([
            getProductForEdit(req.params.id),
            getCategoriesForSelect()
        ]);

        if (!product) {
            req.session.flash = { type: 'error', message: 'Товар не найден' };
            return res.redirect('/admin#products');
        }

        res.render('admin/product-form', {
            title: pageTitle(`Редактирование: ${product.name}`),
            isEdit: true,
            productId: product.id,
            categories,
            values: {
                name: product.name,
                description: product.description,
                brand: product.brand === '—' ? '' : product.brand,
                price: String(product.price),
                stock_quantity: String(product.stockQuantity),
                category_id: String(product.categoryId),
                image_url: product.imageUrl,
                specs: product.specs.length ? product.specs : [{ name: '', value: '' }]
            },
            errors: {},
            activeNav: 'products'
        });
    } catch (error) {
        next(error);
    }
});

router.post('/admin/products/:id', requireAdmin, async (req, res, next) => {
    try {
        const result = await updateProduct(req.params.id, req.body);

        if (!result.success) {
            const categories = await getCategoriesForSelect();
            return res.status(400).render('admin/product-form', {
                title: pageTitle('Редактирование товара'),
                isEdit: true,
                productId: req.params.id,
                categories,
                values: result.values,
                errors: result.errors,
                activeNav: 'products'
            });
        }

        req.session.flash = {
            type: 'success',
            message: `Товар «${result.product.name}» обновлён.`
        };

        res.redirect('/admin#products');
    } catch (error) {
        if (error.status === 404) {
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect('/admin#products');
        }
        if (error.status === 400) {
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect(`/admin/products/${req.params.id}/edit`);
        }
        next(error);
    }
});

router.post('/admin/orders/:id/status', requireAdmin, async (req, res, next) => {
    try {
        await updateOrderStatus(req.params.id, req.body.status);
        req.session.flash = {
            type: 'success',
            message: `Статус заказа #${req.params.id} обновлён.`
        };
        res.redirect(`/admin${req.session.adminQuery || ''}#orders`);
    } catch (error) {
        if (error.status === 400 || error.status === 404) {
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect(`/admin${req.session.adminQuery || ''}#orders`);
        }
        next(error);
    }
});

router.post('/admin/orders/:id/payment', requireAdmin, async (req, res, next) => {
    try {
        await updateOrderPaymentStatus(req.params.id, req.body.payment_status);
        req.session.flash = {
            type: 'success',
            message: `Статус оплаты заказа #${req.params.id} обновлён.`
        };
        res.redirect(`/admin${req.session.adminQuery || ''}#orders`);
    } catch (error) {
        if (error.status === 400 || error.status === 404) {
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect(`/admin${req.session.adminQuery || ''}#orders`);
        }
        next(error);
    }
});

module.exports = router;
