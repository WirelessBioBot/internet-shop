const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const ProductImage = require('./ProductImage');
const ProductSpec = require('./ProductSpec');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');
const Shipment = require('./Shipment');
const Review = require('./Review');
const UserAction = require('./UserAction');
const Recommendation = require('./Recommendation');
const SearchHistory = require('./SearchHistory');
const PasswordResetToken = require('./PasswordResetToken');
const Favorite = require('./Favorite');

Category.hasMany(Category, { as: 'children', foreignKey: 'parent_id' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parent_id' });

Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });

Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Product.hasMany(ProductSpec, { foreignKey: 'product_id', as: 'specs' });
ProductSpec.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(Cart, { foreignKey: 'user_id' });
Cart.belongsTo(User, { foreignKey: 'user_id' });

Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id' });
CartItem.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

Order.hasOne(Payment, { foreignKey: 'order_id' });
Payment.belongsTo(Order, { foreignKey: 'order_id' });

Order.hasOne(Shipment, { foreignKey: 'order_id' });
Shipment.belongsTo(Order, { foreignKey: 'order_id' });

Product.hasMany(Review, { foreignKey: 'product_id' });
Review.belongsTo(Product, { foreignKey: 'product_id' });
Review.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(UserAction, { foreignKey: 'user_id' });
UserAction.belongsTo(User, { foreignKey: 'user_id' });
UserAction.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(Recommendation, { foreignKey: 'user_id' });
Recommendation.belongsTo(User, { foreignKey: 'user_id' });
Recommendation.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(SearchHistory, { foreignKey: 'user_id' });
SearchHistory.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(PasswordResetToken, { foreignKey: 'user_id' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Favorite, { foreignKey: 'user_id' });
Favorite.belongsTo(User, { foreignKey: 'user_id' });
Product.hasMany(Favorite, { foreignKey: 'product_id' });
Favorite.belongsTo(Product, { foreignKey: 'product_id' });

module.exports = {
    sequelize,
    User,
    Category,
    Product,
    ProductImage,
    ProductSpec,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Payment,
    Shipment,
    Review,
    UserAction,
    Recommendation,
    SearchHistory,
    PasswordResetToken,
    Favorite
};
