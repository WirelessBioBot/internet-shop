(function () {
    const list = document.getElementById('admin-specs-list');
    const template = document.getElementById('admin-spec-row-template');
    const addButton = document.getElementById('add-spec-row');

    if (!list || !template || !addButton) {
        return;
    }

    function bindRemoveButton(row) {
        const removeButton = row.querySelector('.admin-spec-remove');
        if (!removeButton) {
            return;
        }

        removeButton.addEventListener('click', function () {
            const rows = list.querySelectorAll('.admin-spec-row');
            if (rows.length <= 1) {
                row.querySelectorAll('input').forEach(function (input) {
                    input.value = '';
                });
                return;
            }

            row.remove();
        });
    }

    function addRow() {
        const fragment = template.content.cloneNode(true);
        const row = fragment.querySelector('.admin-spec-row');
        list.appendChild(fragment);
        bindRemoveButton(row);
        row.querySelector('input')?.focus();
    }

    list.querySelectorAll('.admin-spec-row').forEach(bindRemoveButton);
    addButton.addEventListener('click', addRow);
})();
