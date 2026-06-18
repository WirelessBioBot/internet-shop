const { Op } = require('sequelize');
const { sequelize, Category, Product, ProductImage, ProductSpec } = require('../models');
const { setProductSpecs } = require('./productSpecService');

const DEFAULT_IMAGE = '/images/placeholder.svg';

function parseSpecsFromForm(formData) {
    const names = formData.spec_name;
    const values = formData.spec_value;
    const nameList = Array.isArray(names) ? names : (names ? [names] : []);
    const valueList = Array.isArray(values) ? values : (values ? [values] : []);
    const length = Math.max(nameList.length, valueList.length);
    const specs = [];

    for (let index = 0; index < length; index += 1) {
        const name = (nameList[index] || '').trim();
        const value = (valueList[index] || '').trim();

        if (!name && !value) {
            continue;
        }

        specs.push({ name, value });
    }

    return specs;
}

function parseProductForm(formData) {
    return {
        name: (formData.name || '').trim(),
        description: (formData.description || '').trim(),
        brand: (formData.brand || '').trim(),
        price: (formData.price || '').trim(),
        stock_quantity: (formData.stock_quantity || '').trim(),
        category_id: (formData.category_id || '').trim(),
        image_url: (formData.image_url || '').trim() || DEFAULT_IMAGE,
        specs: parseSpecsFromForm(formData)
    };
}

function validateSpecs(specs) {
    const errors = {};
    const seenNames = new Set();

    for (let index = 0; index < specs.length; index += 1) {
        const spec = specs[index];
        const row = index + 1;

        if (!spec.name) {
            errors.specs = `Строка ${row}: укажите название характеристики`;
            break;
        }

        if (!spec.value) {
            errors.specs = `Строка ${row}: укажите значение характеристики`;
            break;
        }

        if (spec.name.length > 100) {
            errors.specs = `Строка ${row}: название слишком длинное`;
            break;
        }

        if (spec.value.length > 255) {
            errors.specs = `Строка ${row}: значение слишком длинное`;
            break;
        }

        const key = spec.name.toLowerCase();
        if (seenNames.has(key)) {
            errors.specs = `Характеристика «${spec.name}» указана более одного раза`;
            break;
        }

        seenNames.add(key);
    }

    return errors;
}

function validateProductForm(values) {
    const errors = {};

    if (!values.name || values.name.length < 2) {
        errors.name = 'Введите название (минимум 2 символа)';
    } else if (values.name.length > 255) {
        errors.name = 'Название слишком длинное';
    }

    if (!values.category_id) {
        errors.category_id = 'Выберите категорию';
    }

    const price = Number(values.price);
    if (!values.price || Number.isNaN(price) || price <= 0) {
        errors.price = 'Укажите корректную цену больше 0';
    }

    const stock = Number(values.stock_quantity);
    if (values.stock_quantity === '' || Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
        errors.stock_quantity = 'Укажите целое количество на складе (0 или больше)';
    }

    if (values.brand && values.brand.length > 100) {
        errors.brand = 'Бренд слишком длинный';
    }

    if (values.image_url && !values.image_url.startsWith('/')) {
        errors.image_url = 'URL изображения должен начинаться с /';
    }

    Object.assign(errors, validateSpecs(values.specs));

    return {
        errors,
        isValid: Object.keys(errors).length === 0,
        parsed: {
            name: values.name,
            description: values.description,
            brand: values.brand,
            price,
            stock_quantity: stock,
            category_id: Number(values.category_id),
            image_url: values.image_url,
            specs: values.specs
        }
    };
}

async function ensureCategoryExists(categoryId) {
    const category = await Category.findByPk(categoryId);
    if (!category) {
        const error = new Error('Выбранная категория не найдена');
        error.status = 400;
        throw error;
    }

    return category;
}

function mapProductForAdmin(product) {
    const plain = product.get({ plain: true });
    const firstImage = (plain.images || [])[0]?.image_url || DEFAULT_IMAGE;

    return {
        id: plain.id,
        name: plain.name,
        brand: plain.brand || '—',
        description: plain.description || '',
        price: Number(plain.price),
        stockQuantity: plain.stock_quantity,
        rating: Number(plain.rating),
        categoryId: plain.category_id,
        categoryName: plain.Category ? plain.Category.name : '—',
        imageUrl: firstImage,
        specs: (plain.specs || []).map((spec) => ({
            name: spec.name,
            value: spec.value
        })),
        createdAt: plain.created_at
            ? new Date(plain.created_at).toLocaleDateString('ru-RU')
            : '—'
    };
}

async function getCategoriesForSelect() {
    const categories = await Category.findAll({
        attributes: ['id', 'name'],
        order: [['name', 'ASC']]
    });

    return categories.map((category) => ({
        id: category.id,
        name: category.name
    }));
}

async function getProductsList(filters = {}, limit = 100) {
    const where = {};

    if (filters.productQ) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${filters.productQ}%` } },
            { brand: { [Op.iLike]: `%${filters.productQ}%` } }
        ];
    }

    if (filters.productCategory) {
        where.category_id = Number(filters.productCategory);
    }

    if (filters.productStock === 'low') {
        where.stock_quantity = { [Op.lte]: 5, [Op.gt]: 0 };
    } else if (filters.productStock === 'out') {
        where.stock_quantity = 0;
    } else if (filters.productStock === 'in') {
        where.stock_quantity = { [Op.gt]: 0 };
    }

    const products = await Product.findAll({
        where,
        include: [
            { model: Category, attributes: ['id', 'name'] },
            {
                model: ProductImage,
                as: 'images',
                required: false,
                attributes: ['image_url']
            }
        ],
        order: [['created_at', 'DESC']],
        limit
    });

    return products.map(mapProductForAdmin);
}

async function getProductForEdit(productId) {
    const product = await Product.findByPk(productId, {
        include: [
            { model: Category, attributes: ['id', 'name'] },
            {
                model: ProductImage,
                as: 'images',
                required: false,
                attributes: ['id', 'image_url']
            },
            {
                model: ProductSpec,
                as: 'specs',
                required: false,
                attributes: ['id', 'name', 'value', 'sort_order'],
                separate: true,
                order: [['sort_order', 'ASC'], ['id', 'ASC']]
            }
        ]
    });

    if (!product) {
        return null;
    }

    return mapProductForAdmin(product);
}

async function upsertPrimaryImage(productId, imageUrl, transaction) {
    const existing = await ProductImage.findOne({
        where: { product_id: productId },
        order: [['id', 'ASC']],
        transaction
    });

    if (existing) {
        await existing.update({ image_url: imageUrl }, { transaction });
        return;
    }

    await ProductImage.create({
        product_id: productId,
        image_url: imageUrl
    }, { transaction });
}

async function createProduct(formData) {
    const values = parseProductForm(formData);
    const validation = validateProductForm(values);

    if (!validation.isValid) {
        return { success: false, errors: validation.errors, values };
    }

    await ensureCategoryExists(validation.parsed.category_id);

    const transaction = await sequelize.transaction();

    try {
        const product = await Product.create({
            name: validation.parsed.name,
            description: validation.parsed.description || null,
            brand: validation.parsed.brand || null,
            price: validation.parsed.price,
            stock_quantity: validation.parsed.stock_quantity,
            category_id: validation.parsed.category_id,
            rating: 0
        }, { transaction });

        await upsertPrimaryImage(product.id, validation.parsed.image_url, transaction);
        await setProductSpecs(product.id, validation.parsed.specs, transaction);
        await transaction.commit();

        return { success: true, product };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function updateProduct(productId, formData) {
    const product = await Product.findByPk(productId);

    if (!product) {
        const error = new Error('Товар не найден');
        error.status = 404;
        throw error;
    }

    const values = parseProductForm(formData);
    const validation = validateProductForm(values);

    if (!validation.isValid) {
        return { success: false, errors: validation.errors, values };
    }

    await ensureCategoryExists(validation.parsed.category_id);

    const transaction = await sequelize.transaction();

    try {
        await product.update({
            name: validation.parsed.name,
            description: validation.parsed.description || null,
            brand: validation.parsed.brand || null,
            price: validation.parsed.price,
            stock_quantity: validation.parsed.stock_quantity,
            category_id: validation.parsed.category_id
        }, { transaction });

        await upsertPrimaryImage(product.id, validation.parsed.image_url, transaction);
        await setProductSpecs(product.id, validation.parsed.specs, transaction);
        await transaction.commit();

        return { success: true, product };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

module.exports = {
    DEFAULT_IMAGE,
    parseProductForm,
    getCategoriesForSelect,
    getProductsList,
    getProductForEdit,
    createProduct,
    updateProduct
};
