const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { User, PasswordResetToken } = require('../models');
const { sendPasswordResetEmail, getAppUrl } = require('./emailService');
const {
    normalizeEmail,
    validateEmail,
    validatePassword,
    validatePasswordConfirm
} = require('../utils/validation');

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL_MS = 60 * 60 * 1000;

const GENERIC_SUCCESS_MESSAGE =
    'Если аккаунт с таким email зарегистрирован, мы отправили письмо со ссылкой для сброса пароля.';

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function validateForgotPasswordForm(email) {
    const errors = {};
    const values = {
        email: normalizeEmail(email)
    };

    const emailError = validateEmail(email);
    if (emailError) {
        errors.email = emailError;
    }

    return {
        errors,
        values,
        isValid: Object.keys(errors).length === 0
    };
}

function validateResetPasswordForm({ password, passwordConfirm }) {
    const errors = {};

    const passwordError = validatePassword(password, { fieldLabel: 'Новый пароль' });
    if (passwordError) {
        errors.password = passwordError;
    }

    const confirmError = validatePasswordConfirm(password, passwordConfirm);
    if (confirmError) {
        errors.password_confirm = confirmError;
    }

    return {
        errors,
        isValid: Object.keys(errors).length === 0
    };
}

async function requestPasswordReset(email) {
    const { errors, values, isValid } = validateForgotPasswordForm(email);

    if (!isValid) {
        return { success: false, errors, values };
    }

    const user = await User.findOne({ where: { email: values.email } });

    if (user) {
        const rawToken = generateToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

        await PasswordResetToken.destroy({ where: { user_id: user.id } });
        await PasswordResetToken.create({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: expiresAt
        });

        const resetUrl = `${getAppUrl()}/reset-password/${rawToken}`;

        try {
            await sendPasswordResetEmail({
                to: user.email,
                name: user.name,
                resetUrl
            });
        } catch (error) {
            console.error('Не удалось отправить письмо для сброса пароля:', error.message);
            await PasswordResetToken.destroy({ where: { token_hash: tokenHash } });
            return {
                success: false,
                errors: { form: 'Не удалось отправить письмо. Попробуйте позже.' },
                values
            };
        }
    }

    return {
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
        values
    };
}

async function getResetTokenRecord(rawToken) {
    if (!rawToken || !/^[a-f0-9]{64}$/i.test(rawToken)) {
        return null;
    }

    const tokenHash = hashToken(rawToken);

    return PasswordResetToken.findOne({
        where: {
            token_hash: tokenHash,
            expires_at: { [Op.gt]: new Date() }
        },
        include: [
            {
                model: User,
                attributes: ['id', 'name', 'email']
            }
        ]
    });
}

async function resetPassword(rawToken, formData) {
    const tokenRecord = await getResetTokenRecord(rawToken);

    if (!tokenRecord || !tokenRecord.User) {
        return {
            success: false,
            errors: { form: 'Ссылка недействительна или срок её действия истёк. Запросите восстановление пароля снова.' }
        };
    }

    const validation = validateResetPasswordForm(formData);

    if (!validation.isValid) {
        return { success: false, errors: validation.errors };
    }

    const passwordHash = await bcrypt.hash(formData.password, BCRYPT_ROUNDS);

    await User.update(
        { password_hash: passwordHash },
        { where: { id: tokenRecord.user_id } }
    );

    await PasswordResetToken.destroy({ where: { user_id: tokenRecord.user_id } });

    return { success: true };
}

module.exports = {
    GENERIC_SUCCESS_MESSAGE,
    requestPasswordReset,
    getResetTokenRecord,
    resetPassword,
    validateForgotPasswordForm,
    validateResetPasswordForm
};
