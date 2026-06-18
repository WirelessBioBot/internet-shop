document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('admin-menu-toggle');
    const sidebar = document.getElementById('admin-sidebar');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('is-open');
        });
    }

    if (window.location.hash === '#completed-orders') {
        const completed = document.getElementById('completed-orders');
        if (completed) {
            completed.open = true;
        }
    }

    const params = new URLSearchParams(window.location.search);
    const orderStatus = params.get('order_status');
    if (orderStatus === 'delivered' || orderStatus === 'cancelled') {
        const completed = document.getElementById('completed-orders');
        if (completed) {
            completed.open = true;
        }
    }
});
