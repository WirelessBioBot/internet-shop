document.addEventListener('DOMContentLoaded', () => {
    const cardInput = document.getElementById('card_number');
    const expiryInput = document.getElementById('card_expiry');

    if (cardInput) {
        cardInput.addEventListener('input', () => {
            const digits = cardInput.value.replace(/\D/g, '').slice(0, 16);
            cardInput.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
        });
    }

    if (expiryInput) {
        expiryInput.addEventListener('input', () => {
            let value = expiryInput.value.replace(/\D/g, '').slice(0, 4);
            if (value.length >= 3) {
                value = `${value.slice(0, 2)}/${value.slice(2)}`;
            }
            expiryInput.value = value;
        });
    }
});
