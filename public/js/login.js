document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.auth-form[data-auth-form="login"]');
    const validation = window.AuthValidation;

    if (!form || !validation) {
        return;
    }

    const rules = [
        {
            selector: '#email',
            validate: (value) => validation.validateEmail(value)
        },
        {
            selector: '#password',
            validate: (value) => validation.validateLoginPassword(value)
        }
    ];

    validation.bindLiveValidation(form, rules);

    form.addEventListener('submit', (event) => {
        validation.setFormError(form, '');

        if (!validation.validateForm(form, rules)) {
            event.preventDefault();
            const firstInvalid = form.querySelector('.form-group.has-error input');
            firstInvalid?.focus();
        }
    });
});
