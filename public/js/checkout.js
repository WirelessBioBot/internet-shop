(function () {
    const methodRadios = document.querySelectorAll('input[name="delivery_method"]');
    const addressBlock = document.getElementById('delivery-address-block');
    const cdekBlock = document.getElementById('delivery-cdek-block');
    const addressField = document.getElementById('delivery_address');
    const cdekField = document.getElementById('cdek_point');

    if (!methodRadios.length || !addressBlock || !cdekBlock) {
        return;
    }

    function updateDeliveryFields() {
        const method = document.querySelector('input[name="delivery_method"]:checked')?.value;
        const isCdek = method === 'cdek';

        addressBlock.hidden = isCdek;
        cdekBlock.hidden = !isCdek;

        if (addressField) {
            addressField.required = !isCdek;
        }

        if (cdekField) {
            cdekField.required = isCdek;
        }
    }

    methodRadios.forEach(function (radio) {
        radio.addEventListener('change', updateDeliveryFields);
    });

    updateDeliveryFields();
})();
