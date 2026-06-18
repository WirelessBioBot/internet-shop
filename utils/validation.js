const EMAIL_REGEX =
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;

function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
}

function normalizeName(name) {
    return (name || '').trim().replace(/\s+/g, ' ');
}

function validateEmail(email) {
    const normalized = normalizeEmail(email);

    if (!normalized) {
        return 'Введите email';
    }

    if (normalized.length > MAX_EMAIL_LENGTH) {
        return 'Email слишком длинный';
    }

    if (!EMAIL_REGEX.test(normalized) || normalized.includes('..')) {
        return 'Некорректный формат email';
    }

    return null;
}

function validateName(name) {
    const normalized = normalizeName(name);

    if (!normalized) {
        return 'Введите имя пользователя';
    }

    if (normalized.length < MIN_NAME_LENGTH || normalized.length > MAX_NAME_LENGTH) {
        return `Имя должно содержать от ${MIN_NAME_LENGTH} до ${MAX_NAME_LENGTH} символов`;
    }

    if (!/[\p{L}]/u.test(normalized)) {
        return 'Имя должно содержать буквы';
    }

    if (/[\x00-\x1F\x7F]/.test(normalized)) {
        return 'Имя содержит недопустимые символы';
    }

    return null;
}

function validatePassword(password, { fieldLabel = 'Пароль' } = {}) {
    if (!password) {
        return `Введите ${fieldLabel.toLowerCase()}`;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return `${fieldLabel} должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
        return `${fieldLabel} слишком длинный`;
    }

    if (!/[a-zA-Zа-яА-ЯёЁ]/.test(password) || !/\d/.test(password)) {
        return `${fieldLabel} должен содержать буквы и цифры`;
    }

    if (/\s/.test(password)) {
        return `${fieldLabel} не должен содержать пробелы`;
    }

    return null;
}

function validatePasswordConfirm(password, passwordConfirm) {
    if (!passwordConfirm) {
        return 'Подтвердите пароль';
    }

    if (password !== passwordConfirm) {
        return 'Пароли не совпадают';
    }

    return null;
}

function validateLoginPassword(password) {
    if (!password) {
        return 'Введите пароль';
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
        return 'Пароль слишком длинный';
    }

    return null;
}

module.exports = {
    EMAIL_REGEX,
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_LENGTH,
    MIN_NAME_LENGTH,
    MAX_NAME_LENGTH,
    MAX_EMAIL_LENGTH,
    normalizeEmail,
    normalizeName,
    validateEmail,
    validateName,
    validatePassword,
    validatePasswordConfirm,
    validateLoginPassword
};
