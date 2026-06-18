document.addEventListener('DOMContentLoaded', () => {
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        const min = Number(quantityInput.min) || 1;
        const max = Number(quantityInput.max) || min;

        function clampQuantity(value) {
            return Math.min(max, Math.max(min, value));
        }

        function updateQuantity(nextValue) {
            quantityInput.value = String(clampQuantity(nextValue));
        }

        document.querySelectorAll('[data-quantity-action]').forEach((button) => {
            button.addEventListener('click', () => {
                const current = Number(quantityInput.value) || min;
                const step = button.dataset.quantityAction === 'increase' ? 1 : -1;
                updateQuantity(current + step);
            });
        });

        quantityInput.addEventListener('change', () => {
            updateQuantity(Number(quantityInput.value) || min);
        });
    }

    const reviewForm = document.querySelector('[data-review-form]');
    if (!reviewForm) {
        return;
    }

    const ratingInput = reviewForm.querySelector('#rating');
    const starButtons = Array.from(reviewForm.querySelectorAll('.star-btn'));
    const ratingError = reviewForm.querySelector('[data-rating-error]');
    const ratingField = reviewForm.querySelector('.review-rating-field');
    const commentInput = reviewForm.querySelector('#comment');
    const maxCommentLength = commentInput ? Number(commentInput.maxLength) || 2000 : 2000;

    function setRating(value) {
        const rating = Number(value);

        if (!ratingInput) {
            return;
        }

        ratingInput.value = rating ? String(rating) : '';

        starButtons.forEach((button) => {
            const starValue = Number(button.dataset.rating);
            const isActive = starValue <= rating;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        if (ratingField) {
            ratingField.classList.remove('has-error');
        }

        if (ratingError) {
            ratingError.hidden = true;
        }
    }

    function previewRating(value) {
        starButtons.forEach((button) => {
            const starValue = Number(button.dataset.rating);
            button.classList.toggle('is-hover', starValue <= value);
        });
    }

    function clearRatingPreview() {
        const currentRating = Number(ratingInput?.value) || 0;
        previewRating(currentRating);
    }

    starButtons.forEach((button) => {
        button.addEventListener('click', () => {
            setRating(button.dataset.rating);
        });

        button.addEventListener('mouseenter', () => {
            previewRating(Number(button.dataset.rating));
        });
    });

    reviewForm.querySelector('[data-rating-input]')?.addEventListener('mouseleave', clearRatingPreview);

    if (ratingInput?.value) {
        setRating(ratingInput.value);
    }

    reviewForm.addEventListener('submit', (event) => {
        let isValid = true;

        if (!ratingInput?.value) {
            isValid = false;
            ratingField?.classList.add('has-error');
            if (ratingError) {
                ratingError.hidden = false;
            }
        }

        if (commentInput && commentInput.value.trim().length > maxCommentLength) {
            isValid = false;
            commentInput.focus();
        }

        if (!isValid) {
            event.preventDefault();
            if (!ratingInput?.value) {
                starButtons[0]?.focus();
            }
        }
    });
});
