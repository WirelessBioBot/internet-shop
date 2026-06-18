function isStorePath(path) {
    if (path.startsWith('/admin')) {
        return false;
    }

    if (path === '/login' || path === '/logout' || path === '/forgot-password') {
        return false;
    }

    if (path.startsWith('/reset-password/')) {
        return false;
    }

    if (path.startsWith('/api/')) {
        return false;
    }

    return true;
}

function redirectAdminFromStore(req, res, next) {
    if (req.session.userRole !== 'admin') {
        return next();
    }

    if (!isStorePath(req.path)) {
        return next();
    }

    return res.redirect('/admin');
}

module.exports = redirectAdminFromStore;
