(function () {
    const EMAIL_REGEX =
        /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
    const MIN_PASSWORD_LENGTH = 8;
    const MAX_PASSWORD_LENGTH = 128;
    const MIN_NAME_LENGTH = 2;
    const MAX_NAME_LENGTH = 100;
    const MAX_EMAIL_LENGTH = 255;

    function normalizeEmail(value) {
        return (value || '').trim().toLowerCase();
    }

    function normalizeName(value) {
        return (value || '').trim().replace(/\s+/g, ' ');
    }

    function validateEmail(value) {
        const email = normalizeEmail(value);

        if (!email) {
            return 'Введите email';
        }

        if (email.length > MAX_EMAIL_LENGTH) {
            return 'Email слишком длинный';
        }

        if (!EMAIL_REGEX.test(email) || email.includes('..')) {
            return 'Некорректный формат email';
        }

        return '';
    }

    function validateName(value) {
        const name = normalizeName(value);

        if (!name) {
            return 'Введите имя пользователя';
        }

        if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
            return `Имя должно содержать от ${MIN_NAME_LENGTH} до ${MAX_NAME_LENGTH} символов`;
        }

        if (!/[\p{L}]/u.test(name)) {
            return 'Имя должно содержать буквы';
        }

        if (/[\x00-\x1F\x7F]/.test(name)) {
            return 'Имя содержит недопустимые символы';
        }

        return '';
    }

    function validatePassword(value, fieldLabel) {
        const label = fieldLabel || 'Пароль';

        if (!value) {
            return `Введите ${label.toLowerCase()}`;
        }

        if (value.length < MIN_PASSWORD_LENGTH) {
            return `${label} должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
        }

        if (value.length > MAX_PASSWORD_LENGTH) {
            return `${label} слишком длинный`;
        }

        if (!/[a-zA-Zа-яА-ЯёЁ]/.test(value) || !/\d/.test(value)) {
            return `${label} должен содержать буквы и цифры`;
        }

        if (/\s/.test(value)) {
            return `${label} не должен содержать пробелы`;
        }

        return '';
    }

    function validatePasswordConfirm(password, confirm) {
        if (!confirm) {
            return 'Подтвердите пароль';
        }

        if (password !== confirm) {
            return 'Пароли не совпадают';
        }

        return '';
    }

    function validateLoginPassword(value) {
        if (!value) {
            return 'Введите пароль';
        }

        if (value.length > MAX_PASSWORD_LENGTH) {
            return 'Пароль слишком длинный';
        }

        return '';
    }

    function setFieldError(group, message) {
        if (!group) {
            return;
        }

        group.classList.toggle('has-error', Boolean(message));

        let errorEl = group.querySelector('.field-error');
        if (message) {
            if (!errorEl) {
                errorEl = document.createElement('span');
                errorEl.className = 'field-error';
                group.appendChild(errorEl);
            }
            errorEl.textContent = message;
        } else if (errorEl) {
            errorEl.remove();
        }
    }

    function setFormError(form, message) {
        let alertEl = form.querySelector('.alert-error[data-client-error]');

        if (message) {
            if (!alertEl) {
                alertEl = document.createElement('div');
                alertEl.className = 'alert alert-error';
                alertEl.setAttribute('role', 'alert');
                alertEl.dataset.clientError = 'true';
                form.insertBefore(alertEl, form.firstChild);
            }
            alertEl.textContent = message;
        } else if (alertEl) {
            alertEl.remove();
        }
    }

    function bindLiveValidation(form, rules) {
        rules.forEach(function (rule) {
            const input = form.querySelector(rule.selector);
            const group = input ? input.closest('.form-group') : null;

            if (!input || !group) {
                return;
            }

            input.addEventListener('input', function () {
                const message = rule.validate(input.value, form);
                setFieldError(group, message);
            });

            input.addEventListener('blur', function () {
                const message = rule.validate(input.value, form);
                setFieldError(group, message);
            });
        });
    }

    function validateForm(form, rules) {
        let isValid = true;

        rules.forEach(function (rule) {
            const input = form.querySelector(rule.selector);
            const group = input ? input.closest('.form-group') : null;
            const message = input ? rule.validate(input.value, form) : 'Заполните обязательные поля';

            setFieldError(group, message);
            if (message) {
                isValid = false;
            }
        });

        return isValid;
    }

    window.AuthValidation = {
        validateEmail,
        validateName,
        validatePassword,
        validatePasswordConfirm,
        validateLoginPassword,
        setFieldError,
        setFormError,
        bindLiveValidation,
        validateForm
    };
})();
