const categoriesData = [
    'Смартфоны',
    'Ноутбуки',
    'Наушники',
    'Игровые консоли',
    'Планшеты',
    'Умные часы',
    'Телевизоры',
    'Аксессуары'
];

const catalogByCategory = {
    'Смартфоны': [
        {
            name: 'iPhone 15',
            brand: 'Apple',
            price: 120000,
            images: ['/images/products/iphone.svg', '/images/products/galaxy.svg'],
            description: 'iPhone 15 — флагманский смартфон Apple с динамическим островом, мощным процессором A16 Bionic и улучшенной камерой 48 Мп.',
            specs: [
                { name: 'Экран', value: '6.1" Super Retina XDR' },
                { name: 'Процессор', value: 'Apple A16 Bionic' },
                { name: 'Память', value: '256 ГБ' },
                { name: 'Камера', value: '48 Мп + 12 Мп' }
            ]
        },
        {
            name: 'Samsung Galaxy S24',
            brand: 'Samsung',
            price: 95000,
            images: ['/images/products/galaxy.svg', '/images/products/iphone.svg'],
            description: 'Samsung Galaxy S24 — Android-смартфон с ярким AMOLED-экраном, Galaxy AI и продвинутой системой камер.',
            specs: [
                { name: 'Экран', value: '6.2" Dynamic AMOLED 2X' },
                { name: 'Процессор', value: 'Snapdragon 8 Gen 3' },
                { name: 'Память', value: '256 ГБ' },
                { name: 'Камера', value: '50 Мп + 12 Мп + 10 Мп' }
            ]
        },
        {
            name: 'Google Pixel 8',
            brand: 'Google',
            price: 85000,
            images: ['/images/products/pixel.svg', '/images/products/galaxy.svg'],
            description: 'Google Pixel 8 — смартфон с чистым Android, продвинутой вычислительной фотографией и Tensor G3.',
            specs: [
                { name: 'Экран', value: '6.2" OLED, 120 Гц' },
                { name: 'Процессор', value: 'Google Tensor G3' },
                { name: 'Память', value: '128 ГБ' },
                { name: 'Камера', value: '50 Мп + 12 Мп' }
            ]
        }
    ],
    'Ноутбуки': [
        {
            name: 'MacBook Pro 14',
            brand: 'Apple',
            price: 220000,
            images: ['/images/products/macbook.svg', '/images/products/macbook-2.svg'],
            description: 'MacBook Pro 14 на чипе Apple Silicon — профессиональный ноутбук для работы с видео, кодом и дизайном.',
            specs: [
                { name: 'Экран', value: '14.2" Liquid Retina XDR' },
                { name: 'Процессор', value: 'Apple M3 Pro' },
                { name: 'ОЗУ', value: '18 ГБ' },
                { name: 'Накопитель', value: '512 ГБ SSD' }
            ]
        },
        {
            name: 'Lenovo ThinkPad X1 Carbon',
            brand: 'Lenovo',
            price: 180000,
            images: ['/images/products/thinkpad.svg', '/images/products/macbook.svg'],
            description: 'ThinkPad X1 Carbon — ультралёгкий бизнес-ноутбук с прочным корпусом, отличной клавиатурой и долгим временем автономной работы.',
            specs: [
                { name: 'Экран', value: '14" IPS, 2.8K' },
                { name: 'Процессор', value: 'Intel Core Ultra 7' },
                { name: 'ОЗУ', value: '16 ГБ' },
                { name: 'Накопитель', value: '512 ГБ SSD' }
            ]
        },
        {
            name: 'ASUS ROG Zephyrus G14',
            brand: 'ASUS',
            price: 150000,
            images: ['/images/products/rog-laptop.svg', '/images/products/macbook-2.svg'],
            description: 'ROG Zephyrus G14 — компактный игровой ноутбук с мощной видеокартой и ярким дисплеем для современных игр.',
            specs: [
                { name: 'Экран', value: '14" OLED, 165 Гц' },
                { name: 'Процессор', value: 'AMD Ryzen 9 7940HS' },
                { name: 'Видеокарта', value: 'NVIDIA RTX 4060' },
                { name: 'ОЗУ', value: '16 ГБ' }
            ]
        }
    ],
    'Наушники': [
        {
            name: 'AirPods Pro',
            brand: 'Apple',
            price: 30000,
            images: ['/images/products/airpods.svg', '/images/products/sony-headphones.svg'],
            description: 'AirPods Pro с активным шумоподавлением, пространственным звуком и адаптивным режимом прозрачности.',
            specs: [
                { name: 'Тип', value: 'Вкладыши, TWS' },
                { name: 'Шумоподавление', value: 'Активное' },
                { name: 'Время работы', value: 'до 6 ч' },
                { name: 'Защита', value: 'IPX4' }
            ]
        },
        {
            name: 'Sony WH-1000XM5',
            brand: 'Sony',
            price: 35000,
            images: ['/images/products/sony-headphones.svg', '/images/products/airpods.svg'],
            description: 'Sony WH-1000XM5 — беспроводные наушники с лидирующим шумоподавлением и длительным временем работы.',
            specs: [
                { name: 'Тип', value: 'Накладные, беспроводные' },
                { name: 'Шумоподавление', value: 'Активное' },
                { name: 'Время работы', value: 'до 30 ч' },
                { name: 'Интерфейс', value: 'Bluetooth 5.2' }
            ]
        },
        {
            name: 'JBL Tune 760NC',
            brand: 'JBL',
            price: 12000,
            images: ['/images/products/jbl-headphones.svg', '/images/products/sony-headphones.svg'],
            description: 'JBL Tune 760NC — доступные накладные наушники с активным шумоподавлением и фирменным звуком JBL Pure Bass.',
            specs: [
                { name: 'Тип', value: 'Накладные, беспроводные' },
                { name: 'Шумоподавление', value: 'Активное' },
                { name: 'Время работы', value: 'до 35 ч' },
                { name: 'Интерфейс', value: 'Bluetooth 5.0' }
            ]
        }
    ],
    'Игровые консоли': [
        {
            name: 'PlayStation 5',
            brand: 'Sony',
            price: 70000,
            images: ['/images/products/ps5.svg', '/images/products/xbox.svg'],
            description: 'PlayStation 5 — игровая консоль нового поколения с поддержкой 4K, трассировкой лучей и быстрой загрузкой игр.',
            specs: [
                { name: 'Платформа', value: 'PlayStation 5' },
                { name: 'Накопитель', value: '825 ГБ SSD' },
                { name: 'Разрешение', value: 'до 4K' },
                { name: 'Частота кадров', value: 'до 120 Гц' }
            ]
        },
        {
            name: 'Xbox Series X',
            brand: 'Microsoft',
            price: 65000,
            images: ['/images/products/xbox.svg', '/images/products/ps5.svg'],
            description: 'Xbox Series X — мощная игровая консоль с поддержкой 4K, Quick Resume и подпиской Game Pass.',
            specs: [
                { name: 'Платформа', value: 'Xbox Series X' },
                { name: 'Накопитель', value: '1 ТБ SSD' },
                { name: 'Разрешение', value: 'до 4K' },
                { name: 'Частота кадров', value: 'до 120 Гц' }
            ]
        },
        {
            name: 'Nintendo Switch OLED',
            brand: 'Nintendo',
            price: 35000,
            images: ['/images/products/switch.svg', '/images/products/ps5.svg'],
            description: 'Nintendo Switch OLED — гибридная консоль с ярким OLED-экраном, портативным и домашним режимами игры.',
            specs: [
                { name: 'Экран', value: '7" OLED' },
                { name: 'Режимы', value: 'Портативный / ТВ' },
                { name: 'Накопитель', value: '64 ГБ' },
                { name: 'Автономность', value: 'до 9 ч' }
            ]
        }
    ],
    'Планшеты': [
        {
            name: 'iPad Pro 12.9',
            brand: 'Apple',
            price: 140000,
            images: ['/images/products/ipad.svg', '/images/products/galaxy-tab.svg'],
            description: 'iPad Pro 12.9 — профессиональный планшет с чипом M2, Liquid Retina XDR и поддержкой Apple Pencil.',
            specs: [
                { name: 'Экран', value: '12.9" Liquid Retina XDR' },
                { name: 'Процессор', value: 'Apple M2' },
                { name: 'Память', value: '256 ГБ' },
                { name: 'Камера', value: '12 Мп + LiDAR' }
            ]
        },
        {
            name: 'Samsung Galaxy Tab S9',
            brand: 'Samsung',
            price: 90000,
            images: ['/images/products/galaxy-tab.svg', '/images/products/ipad.svg'],
            description: 'Galaxy Tab S9 — флагманский Android-планшет с AMOLED-экраном, S Pen в комплекте и защитой IP68.',
            specs: [
                { name: 'Экран', value: '11" Dynamic AMOLED 2X' },
                { name: 'Процессор', value: 'Snapdragon 8 Gen 2' },
                { name: 'Память', value: '256 ГБ' },
                { name: 'Защита', value: 'IP68' }
            ]
        },
        {
            name: 'Xiaomi Pad 6',
            brand: 'Xiaomi',
            price: 35000,
            images: ['/images/products/pad-6.svg', '/images/products/galaxy-tab.svg'],
            description: 'Xiaomi Pad 6 — стильный планшет с высокой частотой обновления экрана и производительным процессором Snapdragon.',
            specs: [
                { name: 'Экран', value: '11" IPS, 144 Гц' },
                { name: 'Процессор', value: 'Snapdragon 870' },
                { name: 'Память', value: '128 ГБ' },
                { name: 'Батарея', value: '8840 мА·ч' }
            ]
        }
    ],
    'Умные часы': [
        {
            name: 'Apple Watch Ultra 2',
            brand: 'Apple',
            price: 90000,
            images: ['/images/products/watch-ultra.svg', '/images/products/galaxy-watch.svg'],
            description: 'Apple Watch Ultra 2 — прочные умные часы для спорта и приключений с GPS, дайвингом и длительной автономностью.',
            specs: [
                { name: 'Экран', value: '49 мм, Always-On Retina' },
                { name: 'Корпус', value: 'Титан' },
                { name: 'Автономность', value: 'до 36 ч' },
                { name: 'Защита', value: 'WR100, IP6X' }
            ]
        },
        {
            name: 'Samsung Galaxy Watch 6',
            brand: 'Samsung',
            price: 35000,
            images: ['/images/products/galaxy-watch.svg', '/images/products/watch-ultra.svg'],
            description: 'Galaxy Watch 6 — умные часы на Wear OS с мониторингом здоровья, сном и интеграцией с экосистемой Samsung.',
            specs: [
                { name: 'Экран', value: '1.5" Super AMOLED' },
                { name: 'Корпус', value: 'Алюминий' },
                { name: 'Автономность', value: 'до 40 ч' },
                { name: 'Защита', value: 'IP68, 5 ATM' }
            ]
        },
        {
            name: 'Garmin Fenix 7',
            brand: 'Garmin',
            price: 70000,
            images: ['/images/products/garmin-watch.svg', '/images/products/galaxy-watch.svg'],
            description: 'Garmin Fenix 7 — мультиспортивные GPS-часы с картами, пульсометром и недельной автономностью.',
            specs: [
                { name: 'Экран', value: '1.3" MIP, сенсорный' },
                { name: 'GPS', value: 'Multi-GNSS' },
                { name: 'Автономность', value: 'до 18 дней' },
                { name: 'Защита', value: '10 ATM' }
            ]
        }
    ],
    'Телевизоры': [
        {
            name: 'Samsung QLED 55"',
            brand: 'Samsung',
            price: 120000,
            images: ['/images/products/tv-samsung.svg', '/images/products/tv-lg.svg'],
            description: 'Samsung QLED 55" — телевизор с квантовыми точками, ярким HDR-изображением и Smart TV на Tizen.',
            specs: [
                { name: 'Диагональ', value: '55"' },
                { name: 'Разрешение', value: '4K UHD' },
                { name: 'HDR', value: 'HDR10+' },
                { name: 'Частота', value: '120 Гц' }
            ]
        },
        {
            name: 'LG OLED C3 65"',
            brand: 'LG',
            price: 180000,
            images: ['/images/products/tv-lg.svg', '/images/products/tv-samsung.svg'],
            description: 'LG OLED C3 65" — OLED-телевизор с идеальным чёрным, α9 AI-процессором и поддержкой Dolby Vision.',
            specs: [
                { name: 'Диагональ', value: '65"' },
                { name: 'Разрешение', value: '4K UHD' },
                { name: 'HDR', value: 'Dolby Vision, HDR10' },
                { name: 'Частота', value: '120 Гц' }
            ]
        },
        {
            name: 'Sony Bravia XR A80L',
            brand: 'Sony',
            price: 150000,
            images: ['/images/products/tv-sony.svg', '/images/products/tv-lg.svg'],
            description: 'Sony Bravia XR A80L — OLED-телевизор с процессором Cognitive Processor XR и акустической поверхностью.',
            specs: [
                { name: 'Диагональ', value: '55"' },
                { name: 'Разрешение', value: '4K UHD' },
                { name: 'HDR', value: 'Dolby Vision, HDR10' },
                { name: 'Звук', value: 'Acoustic Surface Audio+' }
            ]
        }
    ],
    'Аксессуары': [
        {
            name: 'Apple MagSafe Charger',
            brand: 'Apple',
            price: 5000,
            images: ['/images/products/magsafe.svg', '/images/products/powerbank.svg'],
            description: 'MagSafe Charger — беспроводная зарядка для iPhone с магнитным креплением и мощностью до 15 Вт.',
            specs: [
                { name: 'Тип', value: 'Беспроводная зарядка' },
                { name: 'Мощность', value: 'до 15 Вт' },
                { name: 'Стандарт', value: 'MagSafe, Qi' },
                { name: 'Кабель', value: 'USB-C, 1 м' }
            ]
        },
        {
            name: 'Anker USB-C Hub 7-in-1',
            brand: 'Anker',
            price: 4500,
            images: ['/images/products/usb-hub.svg', '/images/products/magsafe.svg'],
            description: 'Anker USB-C Hub 7-in-1 — многофункциональный адаптер с HDMI, USB-A, SD-картами и Power Delivery.',
            specs: [
                { name: 'Порты', value: 'HDMI, 2× USB-A, SD, microSD, USB-C' },
                { name: 'HDMI', value: '4K@30 Гц' },
                { name: 'Power Delivery', value: 'до 100 Вт' },
                { name: 'Материал', value: 'Алюминий' }
            ]
        },
        {
            name: 'Xiaomi Power Bank 20000 mAh',
            brand: 'Xiaomi',
            price: 3500,
            images: ['/images/products/powerbank.svg', '/images/products/usb-hub.svg'],
            description: 'Xiaomi Power Bank 20000 mAh — ёмкий внешний аккумулятор с быстрой зарядкой и двумя USB-портами.',
            specs: [
                { name: 'Ёмкость', value: '20000 мА·ч' },
                { name: 'Выход', value: '2× USB-A, 18 Вт' },
                { name: 'Вход', value: 'USB-C, 18 Вт' },
                { name: 'Вес', value: '434 г' }
            ]
        }
    ]
};

const categoryFallbackImage = {
    'Смартфоны': '/images/products/iphone.svg',
    'Ноутбуки': '/images/products/macbook.svg',
    'Наушники': '/images/products/airpods.svg',
    'Игровые консоли': '/images/products/ps5.svg',
    'Планшеты': '/images/products/ipad.svg',
    'Умные часы': '/images/products/watch-ultra.svg',
    'Телевизоры': '/images/products/tv-samsung.svg',
    'Аксессуары': '/images/products/magsafe.svg'
};

module.exports = {
    categoriesData,
    catalogByCategory,
    categoryFallbackImage
};
