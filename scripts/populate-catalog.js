require('dotenv').config();

const {
    sequelize,
    Category,
    Product,
    ProductImage
} = require('../models');
const { setProductSpecs } = require('../services/productSpecService');
const {
    categoriesData,
    catalogByCategory,
    categoryFallbackImage
} = require('./catalogData');

async function ensureCategory(name) {
    const [category] = await Category.findOrCreate({
        where: { name },
        defaults: { name }
    });
    return category;
}

async function ensureProductImages(product, images, categoryName) {
    const imageCount = await ProductImage.count({ where: { product_id: product.id } });
    if (imageCount > 0) {
        return false;
    }

    const urls = images?.length ? images : [categoryFallbackImage[categoryName] || '/images/placeholder.svg'];

    for (const imageUrl of urls) {
        await ProductImage.create({
            product_id: product.id,
            image_url: imageUrl
        });
    }

    return true;
}

async function ensureProduct(category, item) {
    let product = await Product.findOne({ where: { name: item.name } });

    if (!product) {
        product = await Product.create({
            name: item.name,
            description: item.description,
            price: item.price,
            stock_quantity: 50,
            brand: item.brand,
            category_id: category.id,
            rating: 4.5
        });

        if (item.specs?.length) {
            await setProductSpecs(product.id, item.specs);
        }

        await ensureProductImages(product, item.images, category.name);
        return { product, created: true, imagesAdded: true };
    }

    if (Number(product.category_id) !== Number(category.id)) {
        await product.update({ category_id: category.id });
    }

    const imagesAdded = await ensureProductImages(product, item.images, category.name);
    return { product, created: false, imagesAdded };
}

async function main() {
    await sequelize.authenticate();

    let createdCount = 0;
    let imagesAddedCount = 0;

    for (const categoryName of categoriesData) {
        const category = await ensureCategory(categoryName);
        const items = catalogByCategory[categoryName] || [];

        for (const item of items) {
            const result = await ensureProduct(category, item);
            if (result.created) {
                createdCount += 1;
            }
            if (result.imagesAdded) {
                imagesAddedCount += 1;
            }
        }

        const totalInCategory = await Product.count({ where: { category_id: category.id } });
        console.log(`${categoryName}: ${totalInCategory} товар(ов)`);
    }

    console.log(`Добавлено новых товаров: ${createdCount}`);
    console.log(`Добавлены изображения для: ${imagesAddedCount} товар(ов)`);
    process.exit(0);
}

main().catch((error) => {
    console.error('Ошибка наполнения каталога:', error);
    process.exit(1);
});
