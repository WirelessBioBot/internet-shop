require('dotenv').config();

const { sequelize, Category } = require('../models');

const extraCategories = [
    'Планшеты',
    'Умные часы',
    'Телевизоры',
    'Аксессуары'
];

async function add() {
    await sequelize.authenticate();

    for (const name of extraCategories) {
        const [, created] = await Category.findOrCreate({
            where: { name },
            defaults: { name }
        });
        console.log(created ? `Добавлена: ${name}` : `Уже есть: ${name}`);
    }

    process.exit(0);
}

add().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
