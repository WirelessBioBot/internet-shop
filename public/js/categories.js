document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.categories-filters__form');
    if (!form) {
        return;
    }

    const searchInput = form.querySelector('input[name="q"]');
    const selects = form.querySelectorAll('select');

    let searchTimer;

    selects.forEach((select) => {
        select.addEventListener('change', () => {
            form.requestSubmit();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                form.requestSubmit();
            }, 400);
        });
    }
});
