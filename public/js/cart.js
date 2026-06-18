document.addEventListener('DOMContentLoaded', () => {
    const cartLayout = document.querySelector('[data-cart-layout]');
    if (!cartLayout) {
        return;
    }

    const totalEl = document.querySelector('[data-cart-total]');
    const activeQuantityEl = document.querySelector('[data-cart-active-quantity]');
    const checkoutBtn = document.querySelector('[data-cart-checkout]');
    const cartBadge = document.querySelector('.cart-badge');

    function formatPrice(value) {
        return `${Number(value).toLocaleString('ru-RU')} ₽`;
    }

    function updateCartBadge(count) {
        if (!cartBadge) {
            return;
        }

        if (count > 0) {
            cartBadge.textContent = String(count);
            cartBadge.hidden = false;
        } else {
            cartBadge.hidden = true;
        }
    }

    function setCheckoutState(activeQuantity) {
        if (!checkoutBtn) {
            return;
        }

        if (activeQuantity > 0) {
            checkoutBtn.classList.remove('is-disabled');
            checkoutBtn.removeAttribute('aria-disabled');
            checkoutBtn.removeAttribute('tabindex');
        } else {
            checkoutBtn.classList.add('is-disabled');
            checkoutBtn.setAttribute('aria-disabled', 'true');
            checkoutBtn.setAttribute('tabindex', '-1');
        }
    }

    function applyRemovedState(itemEl, isRemoved) {
        const quantityBlock = itemEl.querySelector('[data-quantity-block]');
        const restoreButton = itemEl.querySelector('[data-cart-restore]');
        const subtotalEl = itemEl.querySelector('[data-item-subtotal]');

        itemEl.classList.toggle('cart-item--removed', isRemoved);

        if (quantityBlock) {
            quantityBlock.hidden = isRemoved;
        }

        if (restoreButton) {
            restoreButton.hidden = !isRemoved;
        }

        if (subtotalEl && isRemoved) {
            subtotalEl.textContent = formatPrice(0);
        }
    }

    function updateSummaryFromDom() {
        let total = 0;
        let activeQuantity = 0;

        document.querySelectorAll('[data-cart-item]').forEach((itemEl) => {
            if (itemEl.classList.contains('cart-item--removed')) {
                return;
            }

            const price = Number(itemEl.dataset.price) || 0;
            const input = itemEl.querySelector('.quantity-input');
            const quantity = Number(input?.value) || 0;

            total += price * quantity;
            activeQuantity += quantity;
        });

        if (totalEl) {
            totalEl.textContent = formatPrice(total);
        }

        if (activeQuantityEl) {
            activeQuantityEl.textContent = `${activeQuantity} шт.`;
        }

        setCheckoutState(activeQuantity);
        updateCartBadge(activeQuantity);

        return { total, activeQuantity };
    }

    function updateItemSubtotal(itemEl, quantity) {
        const subtotalEl = itemEl.querySelector('[data-item-subtotal]');
        const price = Number(itemEl.dataset.price) || 0;

        if (subtotalEl && !itemEl.classList.contains('cart-item--removed')) {
            subtotalEl.textContent = formatPrice(price * quantity);
        }
    }

    async function requestCart(url, options = {}) {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            ...options
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'Не удалось обновить корзину');
        }

        return data;
    }

    function syncFromServer(data) {
        if (typeof data.cartCount === 'number') {
            updateCartBadge(data.cartCount);
        }

        if (totalEl) {
            totalEl.textContent = formatPrice(data.total);
        }

        if (activeQuantityEl) {
            activeQuantityEl.textContent = `${data.activeQuantity} шт.`;
        }

        setCheckoutState(data.activeQuantity);

        data.items.forEach((item) => {
            const itemEl = document.querySelector(`[data-cart-item][data-item-id="${item.id}"]`);
            if (!itemEl) {
                return;
            }

            const input = itemEl.querySelector('.quantity-input');
            if (input) {
                input.value = String(item.quantity);
            }

            applyRemovedState(itemEl, item.isRemoved);

            if (!item.isRemoved) {
                const subtotalEl = itemEl.querySelector('[data-item-subtotal]');
                if (subtotalEl) {
                    subtotalEl.textContent = formatPrice(item.subtotal);
                }
            }
        });
    }

    async function setItemQuantity(itemEl, quantity) {
        const itemId = itemEl.dataset.itemId;
        const stock = Number(itemEl.dataset.stock) || 1;
        const qty = Math.max(0, Math.min(stock, quantity));
        const input = itemEl.querySelector('.quantity-input');

        if (input) {
            input.value = String(qty);
        }

        const isRemoved = qty === 0;
        applyRemovedState(itemEl, isRemoved);

        if (!isRemoved) {
            updateItemSubtotal(itemEl, qty);
        }

        updateSummaryFromDom();

        try {
            const data = await requestCart(`/cart/item/${itemId}/quantity`, {
                method: 'POST',
                body: JSON.stringify({ quantity: qty })
            });
            syncFromServer(data);
        } catch (error) {
            window.location.reload();
        }
    }

    document.querySelectorAll('[data-cart-item]').forEach((itemEl) => {
        const input = itemEl.querySelector('.quantity-input');
        const stock = Number(itemEl.dataset.stock) || 1;
        const initialQuantity = Number(input?.value) || 0;

        applyRemovedState(itemEl, initialQuantity === 0);

        itemEl.querySelectorAll('[data-quantity-action]').forEach((button) => {
            button.addEventListener('click', () => {
                const current = Number(input.value) || 0;
                const step = button.dataset.quantityAction === 'increase' ? 1 : -1;
                setItemQuantity(itemEl, current + step);
            });
        });

        input?.addEventListener('change', () => {
            const value = Number(input.value);
            if (Number.isNaN(value)) {
                setItemQuantity(itemEl, 1);
                return;
            }
            setItemQuantity(itemEl, value);
        });

        itemEl.querySelector('[data-cart-restore]')?.addEventListener('click', async () => {
            try {
                const data = await requestCart(`/cart/item/${itemEl.dataset.itemId}/restore`, {
                    method: 'POST',
                    body: JSON.stringify({})
                });
                syncFromServer(data);
            } catch (error) {
                window.location.reload();
            }
        });

        itemEl.querySelector('[data-cart-remove]')?.addEventListener('click', async () => {
            try {
                const data = await requestCart(`/cart/item/${itemEl.dataset.itemId}/remove`, {
                    method: 'POST',
                    body: JSON.stringify({})
                });

                itemEl.remove();

                if (!document.querySelector('[data-cart-item]')) {
                    window.location.reload();
                    return;
                }

                syncFromServer(data);
                updateSummaryFromDom();
            } catch (error) {
                window.location.reload();
            }
        });
    });

    checkoutBtn?.addEventListener('click', (event) => {
        if (checkoutBtn.classList.contains('is-disabled')) {
            event.preventDefault();
        }
    });
});
