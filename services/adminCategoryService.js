const { Op } = require('sequelize');
const { Category, Product } = require('../models');
const { getCategoryImage } = require('../utils/categoryImages');

function parseCategoryForm(formData) {
    const parentId = (formData.parent_id || '').trim();

    return {
        name: (formData.name || '').trim(),
        parent_id: parentId || null
    };
}

function validateCategoryForm(values, { excludeId = null } = {}) {
    const errors = {};

    if (!values.name || values.name.length < 2) {
        errors.name = 'Введите название (минимум 2 символа)';
    } else if (values.name.length > 100) {
        errors.name = 'Название слишком длинное';
    }

    if (values.parent_id !== null) {
        const parentId = Number(values.parent_id);
        if (Number.isNaN(parentId)) {
            errors.parent_id = 'Некорректная родительская категория';
        } else if (excludeId && parentId === Number(excludeId)) {
            errors.parent_id = 'Категория не может быть родителем самой себя';
        } else {
            values.parent_id = parentId;
        }
    }

    return {
        errors,
        isValid: Object.keys(errors).length === 0,
        values
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

function mapCategoryForAdmin(category, productCounts) {
    const plain = category.get({ plain: true });

    return {
        id: plain.id,
        name: plain.name,
        parentId: plain.parent_id,
        parentName: plain.parent ? plain.parent.name : null,
        childrenCount: (plain.children || []).length,
        productsCount: productCounts[plain.id] || 0,
        image: getCategoryImage(plain.name),
        canDelete: (productCounts[plain.id] || 0) === 0 && (plain.children || []).length === 0
    };
}

async function getCategoriesAdminList() {
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

    return categories.map((category) => mapCategoryForAdmin(category, productCounts));
}

async function getCategoryForEdit(categoryId) {
    const category = await Category.findByPk(categoryId, {
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
        ]
    });

    if (!category) {
        return null;
    }

    const productCounts = await getProductCountsByCategory();
    return mapCategoryForAdmin(category, productCounts);
}

async function getCategoriesForParentSelect(excludeId = null) {
    const where = excludeId ? { id: { [Op.ne]: excludeId } } : {};

    const categories = await Category.findAll({
        where,
        attributes: ['id', 'name', 'parent_id'],
        order: [['name', 'ASC']]
    });

    return categories.map((category) => ({
        id: category.id,
        name: category.name,
        parentId: category.parent_id
    }));
}

async function ensureParentCategory(parentId, excludeId = null) {
    if (parentId === null) {
        return;
    }

    const parent = await Category.findByPk(parentId);
    if (!parent) {
        const error = new Error('Родительская категория не найдена');
        error.status = 400;
        throw error;
    }

    if (excludeId && Number(parent.parent_id) === Number(excludeId)) {
        const error = new Error('Нельзя сделать дочернюю категорию родительской');
        error.status = 400;
        throw error;
    }
}

async function ensureUniqueName(name, excludeId = null) {
    const where = { name };
    if (excludeId) {
        where.id = { [Op.ne]: excludeId };
    }

    const existing = await Category.findOne({ where });
    if (existing) {
        const error = new Error('Категория с таким названием уже существует');
        error.status = 400;
        throw error;
    }
}

async function createCategory(formData) {
    const values = parseCategoryForm(formData);
    const validation = validateCategoryForm(values);

    if (!validation.isValid) {
        return {
            success: false,
            errors: validation.errors,
            values: {
                name: values.name,
                parent_id: values.parent_id ? String(values.parent_id) : ''
            }
        };
    }

    await ensureParentCategory(validation.values.parent_id);
    await ensureUniqueName(validation.values.name);

    const category = await Category.create({
        name: validation.values.name,
        parent_id: validation.values.parent_id
    });

    return { success: true, category };
}

async function updateCategory(categoryId, formData) {
    const category = await Category.findByPk(categoryId);

    if (!category) {
        const error = new Error('Категория не найдена');
        error.status = 404;
        throw error;
    }

    const values = parseCategoryForm(formData);
    const validation = validateCategoryForm(values, { excludeId: categoryId });

    if (!validation.isValid) {
        return {
            success: false,
            errors: validation.errors,
            values: {
                name: values.name,
                parent_id: values.parent_id ? String(values.parent_id) : ''
            }
        };
    }

    await ensureParentCategory(validation.values.parent_id, categoryId);
    await ensureUniqueName(validation.values.name, categoryId);

    await category.update({
        name: validation.values.name,
        parent_id: validation.values.parent_id
    });

    return { success: true, category };
}

async function deleteCategory(categoryId) {
    const category = await Category.findByPk(categoryId, {
        include: [
            { model: Category, as: 'children', attributes: ['id'], required: false }
        ]
    });

    if (!category) {
        const error = new Error('Категория не найдена');
        error.status = 404;
        throw error;
    }

    const productsCount = await Product.count({ where: { category_id: categoryId } });
    const childrenCount = category.children?.length || 0;

    if (productsCount > 0) {
        const error = new Error('Нельзя удалить категорию с товарами. Сначала перенесите или удалите товары.');
        error.status = 400;
        throw error;
    }

    if (childrenCount > 0) {
        const error = new Error('Нельзя удалить категорию с дочерними категориями.');
        error.status = 400;
        throw error;
    }

    await category.destroy();
    return { success: true };
}

module.exports = {
    getCategoriesAdminList,
    getCategoryForEdit,
    getCategoriesForParentSelect,
    createCategory,
    updateCategory,
    deleteCategory,
    parseCategoryForm
};
