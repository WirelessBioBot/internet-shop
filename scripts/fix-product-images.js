require('dotenv').config();

const { sequelize, Product, ProductImage } = require('../models');

const productImages = {
    'iPhone 15': ['/images/products/iphone.svg', '/images/products/galaxy.svg'],
    'MacBook Pro 14': ['/images/products/macbook.svg', '/images/products/macbook-2.svg'],
    'AirPods Pro': ['/images/products/airpods.svg', '/images/products/sony-headphones.svg'],
    'PlayStation 5': ['/images/products/ps5.svg', '/images/products/airpods.svg'],
    'Samsung Galaxy S24': ['/images/products/galaxy.svg', '/images/products/iphone.svg'],
    'Sony WH-1000XM5': ['/images/products/sony-headphones.svg', '/images/products/airpods.svg']
};

async function fix() {
    await sequelize.authenticate();

    const products = await Product.findAll();
    let updated = 0;

    for (const product of products) {
        const urls = productImages[product.name];
        if (!urls) {
            continue;
        }

        await ProductImage.destroy({ where: { product_id: product.id } });
        for (const imageUrl of urls) {
            await ProductImage.create({
                product_id: product.id,
                image_url: imageUrl
            });
        }
        updated += 1;
    }

    console.log(`Обновлены изображения для ${updated} товаров`);
    process.exit(0);
}

fix().catch((error) => {
    console.error('Ошибка:', error.message);
    process.exit(1);
});
