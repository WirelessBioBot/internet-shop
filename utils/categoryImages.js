const CATEGORY_IMAGES = {
    'Смартфоны': '/images/categories/smartphones.svg',
    'Ноутбуки': '/images/categories/laptops.svg',
    'Наушники': '/images/categories/headphones.svg',
    'Игровые консоли': '/images/categories/consoles.svg',
    'Планшеты': '/images/categories/tablets.svg',
    'Умные часы': '/images/categories/watches.svg',
    'Телевизоры': '/images/categories/tvs.svg',
    'Аксессуары': '/images/categories/accessories.svg'
};

function getCategoryImage(name) {
    return CATEGORY_IMAGES[name] || '/images/placeholder.svg';
}

module.exports = { getCategoryImage };
