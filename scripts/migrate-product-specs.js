require('dotenv').config();

const { sequelize } = require('../models');
const { setProductSpecs } = require('../services/productSpecService');

const demoSpecs = [
    [
        { name: 'Экран', value: '6.1" Super Retina XDR' },
        { name: 'Процессор', value: 'Apple A16 Bionic' },
        { name: 'Память', value: '256 ГБ' },
        { name: 'Камера', value: '48 Мп + 12 Мп' }
    ],
    [
        { name: 'Экран', value: '14.2" Liquid Retina XDR' },
        { name: 'Процессор', value: 'Apple M3 Pro' },
        { name: 'ОЗУ', value: '18 ГБ' },
        { name: 'Накопитель', value: '512 ГБ SSD' }
    ],
    [
        { name: 'Тип', value: 'Вкладыши, TWS' },
        { name: 'Шумоподавление', value: 'Активное' },
        { name: 'Время работы', value: 'до 6 ч' },
        { name: 'Защита', value: 'IPX4' }
    ],
    [
        { name: 'Платформа', value: 'PlayStation 5' },
        { name: 'Накопитель', value: '825 ГБ SSD' },
        { name: 'Разрешение', value: 'до 4K' },
        { name: 'Частота кадров', value: 'до 120 Гц' }
    ],
    [
        { name: 'Экран', value: '6.2" Dynamic AMOLED 2X' },
        { name: 'Процессор', value: 'Snapdragon 8 Gen 3' },
        { name: 'Память', value: '256 ГБ' },
        { name: 'Камера', value: '50 Мп + 12 Мп + 10 Мп' }
    ],
    [
        { name: 'Тип', value: 'Накладные, беспроводные' },
        { name: 'Шумоподавление', value: 'Активное' },
        { name: 'Время работы', value: 'до 30 ч' },
        { name: 'Интерфейс', value: 'Bluetooth 5.2' }
    ]
];

async function main() {
    await sequelize.authenticate();

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS product_specs (
            id BIGSERIAL PRIMARY KEY,
            product_id BIGINT NOT NULL,
            name VARCHAR(100) NOT NULL,
            value VARCHAR(255) NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT fk_spec_product
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            CONSTRAINT uq_product_spec_name UNIQUE (product_id, name)
        )
    `);

    for (let index = 0; index < demoSpecs.length; index += 1) {
        const productId = index + 1;
        await setProductSpecs(productId, demoSpecs[index]);
    }

    console.log('Таблица product_specs готова, демо-характеристики загружены');
    process.exit(0);
}

main().catch((error) => {
    console.error('Ошибка миграции характеристик:', error);
    process.exit(1);
});
