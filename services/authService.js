const bcrypt = require('bcrypt');
const { User } = require('../models');
const {
    normalizeEmail,
    normalizeName,
    validateEmail,
    validateName,
    validatePassword,
    validatePasswordConfirm,
    validateLoginPassword
} = require('../utils/validation');

const BCRYPT_ROUNDS = 10;

function validateRegistration({ name, email, password, passwordConfirm }) {
    const errors = {};
    const values = {
        name: normalizeName(name),
        email: normalizeEmail(email)
    };

    const nameError = validateName(name);
    if (nameError) {
        errors.name = nameError;
    }

    const emailError = validateEmail(email);
    if (emailError) {
        errors.email = emailError;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        errors.password = passwordError;
    }

    const confirmError = validatePasswordConfirm(password, passwordConfirm);
    if (confirmError) {
        errors.passwordConfirm = confirmError;
    }

    return { errors, values, isValid: Object.keys(errors).length === 0 };
}

async function isEmailTaken(email) {
    const user = await User.findOne({ where: { email } });
    return Boolean(user);
}

async function registerUser(formData) {
    const { errors, values, isValid } = validateRegistration(formData);

    if (!isValid) {
        return { success: false, errors, values };
    }

    if (await isEmailTaken(values.email)) {
        return {
            success: false,
            errors: { email: 'Пользователь с таким email уже зарегистрирован' },
            values
        };
    }

    const passwordHash = await bcrypt.hash(formData.password, BCRYPT_ROUNDS);

    const user = await User.create({
        name: values.name,
        email: values.email,
        password_hash: passwordHash,
        role: 'user'
    });

    return { success: true, user };
}

function validateLogin({ email, password }) {
    const errors = {};
    const values = {
        email: normalizeEmail(email)
    };

    const emailError = validateEmail(email);
    if (emailError) {
        errors.email = emailError;
    }

    const passwordError = validateLoginPassword(password);
    if (passwordError) {
        errors.password = passwordError;
    }

    return { errors, values, isValid: Object.keys(errors).length === 0 };
}

async function loginUser({ email, password }) {
    const { errors, values, isValid } = validateLogin({ email, password });

    if (!isValid) {
        return { success: false, errors, values };
    }

    const user = await User.findOne({ where: { email: values.email } });

    if (!user) {
        return {
            success: false,
            errors: { form: 'Неверный email или пароль' },
            values
        };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
        return {
            success: false,
            errors: { form: 'Неверный email или пароль' },
            values
        };
    }

    return { success: true, user };
}

module.exports = {
    registerUser,
    validateRegistration,
    loginUser,
    validateLogin
};
