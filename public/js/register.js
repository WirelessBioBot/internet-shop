document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.auth-form[data-auth-form="register"]');
    const validation = window.AuthValidation;

    if (!form || !validation) {
        return;
    }

    const rules = [
        {
            selector: '#name',
            validate: (value) => validation.validateName(value)
        },
        {
            selector: '#email',
            validate: (value) => validation.validateEmail(value)
        },
        {
            selector: '#password',
            validate: (value) => validation.validatePassword(value)
        },
        {
            selector: '#password_confirm',
            validate: (value, formEl) => {
                const password = formEl.querySelector('#password')?.value || '';
                return validation.validatePasswordConfirm(password, value);
            }
        }
    ];

    validation.bindLiveValidation(form, rules);

    const passwordInput = form.querySelector('#password');
    const confirmInput = form.querySelector('#password_confirm');
    const confirmGroup = confirmInput?.closest('.form-group');

    if (passwordInput && confirmInput && confirmGroup) {
        passwordInput.addEventListener('input', () => {
            if (confirmInput.value) {
                const message = validation.validatePasswordConfirm(
                    passwordInput.value,
                    confirmInput.value
                );
                validation.setFieldError(confirmGroup, message);
            }
        });
    }

    form.addEventListener('submit', (event) => {
        validation.setFormError(form, '');

        if (!validation.validateForm(form, rules)) {
            event.preventDefault();
            const firstInvalid = form.querySelector('.form-group.has-error input');
            firstInvalid?.focus();
        }
    });
});
