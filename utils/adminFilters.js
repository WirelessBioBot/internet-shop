const ORDER_FILTER_KEYS = {
    orderQ: 'order_q',
    orderStatus: 'order_status',
    orderPayment: 'order_payment',
    productQ: 'product_q',
    productCategory: 'product_category',
    productStock: 'product_stock',
    userQ: 'user_q',
    userRole: 'user_role'
};

const SECTION_FIELDS = {
    order: ['orderQ', 'orderStatus', 'orderPayment'],
    product: ['productQ', 'productCategory', 'productStock'],
    user: ['userQ', 'userRole']
};

function parseAdminFilters(query = {}) {
    return {
        orderQ: (query.order_q || '').trim(),
        orderStatus: (query.order_status || '').trim(),
        orderPayment: (query.order_payment || '').trim(),
        productQ: (query.product_q || '').trim(),
        productCategory: (query.product_category || '').trim(),
        productStock: (query.product_stock || '').trim(),
        userQ: (query.user_q || '').trim(),
        userRole: (query.user_role || '').trim()
    };
}

function buildAdminQueryString(filters, { excludeSection = null, onlySection = null } = {}) {
    const params = new URLSearchParams();
    const sections = onlySection
        ? [onlySection]
        : Object.keys(SECTION_FIELDS).filter((section) => section !== excludeSection);

    sections.forEach((section) => {
        SECTION_FIELDS[section].forEach((field) => {
            const value = filters[field];
            if (value) {
                params.set(ORDER_FILTER_KEYS[field], value);
            }
        });
    });

    const query = params.toString();
    return query ? `?${query}` : '';
}

function hasOrderFilters(filters) {
    return Boolean(filters.orderQ || filters.orderStatus || filters.orderPayment);
}

function hasProductFilters(filters) {
    return Boolean(filters.productQ || filters.productCategory || filters.productStock);
}

function hasUserFilters(filters) {
    return Boolean(filters.userQ || filters.userRole);
}

module.exports = {
    parseAdminFilters,
    buildAdminQueryString,
    hasOrderFilters,
    hasProductFilters,
    hasUserFilters
};
