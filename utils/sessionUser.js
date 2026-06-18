const { getCartItemsCount } = require('../services/cartService');

async function setUserSession(req, user) {
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    req.session.cartCount = await getCartItemsCount(user.id);
}

module.exports = { setUserSession };
