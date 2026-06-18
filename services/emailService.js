const nodemailer = require('nodemailer');
const { siteName } = require('../config/site');

function getAppUrl() {
    return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function createTransport() {
    if (!process.env.SMTP_HOST) {
        return null;
    }

    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || ''
            }
            : undefined
    });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
    const from = process.env.SMTP_FROM || `"${siteName}" <no-reply@electromarket.local>`;
    const subject = `Восстановление пароля — ${siteName}`;
    const greeting = name ? `Здравствуйте, ${name}!` : 'Здравствуйте!';

    const text = [
        greeting,
        '',
        'Вы запросили восстановление пароля в интернет-магазине.',
        'Перейдите по ссылке, чтобы задать новый пароль:',
        resetUrl,
        '',
        'Ссылка действует 1 час. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.',
        '',
        `С уважением, команда ${siteName}`
    ].join('\n');

    const html = `
        <p>${greeting}</p>
        <p>Вы запросили восстановление пароля в интернет-магазине <strong>${siteName}</strong>.</p>
        <p><a href="${resetUrl}">Перейти к смене пароля</a></p>
        <p>Или скопируйте ссылку в браузер:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Ссылка действует 1 час. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        <p>С уважением,<br>команда ${siteName}</p>
    `;

    const transport = createTransport();

    if (!transport) {
        console.log(`[password-reset] Ссылка для ${to}: ${resetUrl}`);
        return { sent: false, devMode: true };
    }

    await transport.sendMail({
        from,
        to,
        subject,
        text,
        html
    });

    return { sent: true, devMode: false };
}

module.exports = {
    getAppUrl,
    sendPasswordResetEmail
};
