const { ProductSpec } = require('../models');

function formatSpec(spec) {
    return {
        label: spec.name,
        value: spec.value
    };
}

async function getProductSpecs(productId) {
    const specs = await ProductSpec.findAll({
        where: { product_id: productId },
        order: [['sort_order', 'ASC'], ['id', 'ASC']]
    });

    return specs.map(formatSpec);
}

async function setProductSpecs(productId, specs, transaction = null) {
    await ProductSpec.destroy({ where: { product_id: productId }, transaction });

    if (!specs.length) {
        return [];
    }

    const rows = await ProductSpec.bulkCreate(
        specs.map((spec, index) => ({
            product_id: productId,
            name: spec.name,
            value: spec.value,
            sort_order: spec.sort_order ?? index
        })),
        { transaction }
    );

    return rows.map(formatSpec);
}

module.exports = {
    getProductSpecs,
    setProductSpecs,
    formatSpec
};
