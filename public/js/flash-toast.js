document.addEventListener('DOMContentLoaded', () => {
    const toast = document.querySelector('.flash-toast');
    if (!toast) {
        return;
    }

    const hideDelay = 4500;
    let hideTimer;

    function hideToast() {
        toast.classList.add('flash-toast--hide');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }

    function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideToast, hideDelay);
    }

    requestAnimationFrame(() => {
        toast.classList.add('flash-toast--visible');
    });

    scheduleHide();

    const closeButton = toast.querySelector('.flash-toast__close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            clearTimeout(hideTimer);
            hideToast();
        });
    }
});
