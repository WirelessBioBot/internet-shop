require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const { sequelize } = require('./models');
const { getCartItemsCount } = require('./services/cartService');
const site = require('./config/site');
const { ruPlural } = require('./utils/ruPlural');

const redirectAdminFromStore = require('./middleware/redirectAdminFromStore');

const app = express();
const indexRouter = require('./routes/index');
const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');
const favoritesRouter = require('./routes/favorites');
const recommendationsRouter = require('./routes/recommendations');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.ruPlural = ruPlural;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'techstore-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(async (req, res, next) => {
    try {
        const isAuthPage = req.path === '/register' || req.path === '/login';
        const isAdminPage = req.path.startsWith('/admin');
        if (process.env.DEMO_USER_ID && !req.session.userId && !isAuthPage && !isAdminPage) {
            req.session.userId = Number(process.env.DEMO_USER_ID);
        }

        if (req.session.userId && req.session.cartCount === undefined) {
            req.session.cartCount = await getCartItemsCount(req.session.userId);
        }

        res.locals.cartCount = req.session.cartCount || 0;
        res.locals.searchQuery = req.query.q || '';
        res.locals.isLoggedIn = Boolean(req.session.userId);
        res.locals.userName = req.session.userName || '';
        res.locals.isAdmin = req.session.userRole === 'admin';
        res.locals.siteName = site.siteName;
        res.locals.siteTagline = site.siteTagline;
        res.locals.flash = req.session.flash || null;
        delete req.session.flash;
        next();
    } catch (error) {
        next(error);
    }
});

app.use(redirectAdminFromStore);

app.use('/', indexRouter);
app.use('/', productsRouter);
app.use('/', authRouter);
app.use('/', profileRouter);
app.use('/', cartRouter);
app.use('/', ordersRouter);
app.use('/', favoritesRouter);
app.use('/', adminRouter);
app.use('/', recommendationsRouter);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', {
        title: 'Ошибка сервера',
        message: 'Произошла ошибка при загрузке страницы. Проверьте подключение к базе данных.'
    });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Подключение к PostgreSQL установлено');
    } catch (error) {
        console.warn('PostgreSQL недоступен:', error.message);
        console.warn('Запустите docker-compose up -d, примените sql/schema.sql и npm run db:seed');
    }

    app.listen(PORT, () => {
        console.log(`Сервер запущен: http://localhost:${PORT}`);
    });
}

startServer();
