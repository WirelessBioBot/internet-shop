require('dotenv').config();

const bcrypt = require('bcrypt');
const {
    sequelize,
    User,
    Category,
    Product,
    ProductImage,
    Recommendation,
    Review,
    UserAction,
    Favorite
} = require('../models');
const { syncAllProductRatings } = require('../services/ratingService');
const { setProductSpecs } = require('../services/productSpecService');
const { categoriesData, catalogByCategory } = require('./catalogData');

const reviewsData = [
    { productName: 'iPhone 15', userIndex: 0, rating: 5, comment: 'Отличный телефон, камера на высоте!' },
    { productName: 'iPhone 15', userIndex: 1, rating: 4, comment: 'Хорошее качество, но цена высоковата.' },
    { productName: 'MacBook Pro 14', userIndex: 0, rating: 5, comment: 'Мощный ноутбук, тянет всё без тормозов.' },
    { productName: 'AirPods Pro', userIndex: 1, rating: 5, comment: 'Шумоподавление работает превосходно.' },
    { productName: 'PlayStation 5', userIndex: 0, rating: 4, comment: 'Консоль супер, жаль мало эксклюзивов.' }
];

async function clearTables() {
    await sequelize.query(`
        TRUNCATE TABLE
            search_history,
            recommendations,
            user_actions,
            favorites,
            reviews,
            shipments,
            payments,
            orders_items,
            orders,
            cart_items,
            cart,
            product_images,
            product_specs,
            products,
            categories,
            password_reset_tokens,
            users
        RESTART IDENTITY CASCADE
    `);
}

async function seed() {
    await sequelize.authenticate();
    console.log('Подключение к PostgreSQL установлено');

    await clearTables();
    console.log('Таблицы очищены');

    const passwordHash = await bcrypt.hash('password123', 10);

    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    const users = await User.bulkCreate([
        {
            name: 'Демо Пользователь',
            email: 'demo@electromarket.ru',
            password_hash: passwordHash,
            phone: '+79001234567',
            role: 'user'
        },
        {
            name: 'Анна Иванова',
            email: 'anna@electromarket.ru',
            password_hash: passwordHash,
            phone: '+79007654321',
            role: 'user'
        },
        {
            name: 'Администратор',
            email: 'admin@electromarket.ru',
            password_hash: adminPasswordHash,
            phone: '+79001111111',
            role: 'admin'
        }
    ]);

    const demoUser = users[0];

    const categories = {};
    for (const name of categoriesData) {
        categories[name] = await Category.create({ name });
    }

    const products = [];
    const productsByName = {};

    for (const [categoryName, items] of Object.entries(catalogByCategory)) {
        for (const item of items) {
            const product = await Product.create({
                name: item.name,
                description: item.description,
                price: item.price,
                stock_quantity: 50,
                brand: item.brand,
                category_id: categories[categoryName].id
            });

            for (const imageUrl of item.images) {
                await ProductImage.create({
                    product_id: product.id,
                    image_url: imageUrl
                });
            }

            if (item.specs?.length) {
                await setProductSpecs(product.id, item.specs);
            }

            products.push(product);
            productsByName[item.name] = product;
        }
    }

    for (const review of reviewsData) {
        await Review.create({
            user_id: users[review.userIndex].id,
            product_id: productsByName[review.productName].id,
            rating: review.rating,
            comment: review.comment
        });
    }

    await syncAllProductRatings();
    console.log('Рейтинги товаров пересчитаны по отзывам');

    await Recommendation.bulkCreate([
        { user_id: demoUser.id, product_id: productsByName['AirPods Pro'].id, score: 0.95 },
        { user_id: demoUser.id, product_id: productsByName['PlayStation 5'].id, score: 0.9 },
        { user_id: demoUser.id, product_id: productsByName['Sony WH-1000XM5'].id, score: 0.85 }
    ]);

    await UserAction.bulkCreate([
        { user_id: demoUser.id, product_id: productsByName['iPhone 15'].id, action_type: 'view' },
        { user_id: demoUser.id, product_id: productsByName['iPhone 15'].id, action_type: 'click' },
        { user_id: demoUser.id, product_id: productsByName['Samsung Galaxy S24'].id, action_type: 'view' },
        { user_id: users[1].id, product_id: productsByName['iPhone 15'].id, action_type: 'purchase' },
        { user_id: users[1].id, product_id: productsByName['AirPods Pro'].id, action_type: 'purchase' },
        { user_id: users[1].id, product_id: productsByName['AirPods Pro'].id, action_type: 'view' },
        { user_id: users[1].id, product_id: productsByName['PlayStation 5'].id, action_type: 'add_to_cart' },
        { user_id: demoUser.id, product_id: productsByName['AirPods Pro'].id, action_type: 'favorite' },
        { user_id: demoUser.id, product_id: productsByName['Sony WH-1000XM5'].id, action_type: 'favorite' }
    ]);

    await Favorite.bulkCreate([
        { user_id: demoUser.id, product_id: productsByName['AirPods Pro'].id },
        { user_id: demoUser.id, product_id: productsByName['Sony WH-1000XM5'].id }
    ]);

    console.log('Демо-данные загружены');
    console.log(`ID демо-пользователя: ${demoUser.id}`);
    console.log('Логин: demo@electromarket.ru / password123');
    console.log('Админ: admin@electromarket.ru / admin123');
    console.log('Админ-панель: http://localhost:3000/admin');
    console.log('Для персональных рекомендаций добавьте в .env: DEMO_USER_ID=' + demoUser.id);
    console.log('Страница товара: http://localhost:3000/product/1');
    console.log('Recommendation Service: http://localhost:8000/docs');
    process.exit(0);
}

seed().catch((error) => {
    console.error('Ошибка seed:', error);
    process.exit(1);
});
