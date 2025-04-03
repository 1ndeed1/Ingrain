// public/consumer/consumer.js
// Frontend script for consumer.html

document.addEventListener('DOMContentLoaded', async () => {
    // Authentication check
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'consumer') {
        window.location.href = '/login';
        return;
    }

    // Initial load of products
    await loadProducts();

    // Poll for updates every 10 seconds
    setInterval(loadProducts, 1000);

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/login';
    });
});

async function loadProducts() {
    const container = document.getElementById('productsContainer');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/consumer/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load products');

        const products = await response.json();

        // Only re-render if products have changed
        const currentProductIds = Array.from(container.querySelectorAll('.product-card'))
            .map(card => card.dataset.id);
        const newProductIds = products.map(p => p._id);
        if (JSON.stringify(currentProductIds) !== JSON.stringify(newProductIds)) {
            renderProducts(products);
        }
    } catch (err) {
        console.error('Error:', err);
        if (!container.querySelector('.product-card')) {
            container.innerHTML = `
                <div class="error-message">
                    Failed to load products. <button onclick="loadProducts()">Retry</button>
                </div>
            `;
        }
    }
}

function renderProducts(products) {
    const container = document.getElementById('productsContainer');

    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">No products available</div>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card" data-id="${product._id}">
            <div class="product-image" style="background-image: url('${product.imageUrl || '/uploads/default.jpg'}')"></div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-meta">
                    <span class="product-price">₹${product.price}/kg</span>
                    <span class="product-quantity">${product.quantityProduced} kg available</span>
                </div>
                <form class="order-form" data-id="${product._id}" onsubmit="placeOrder(event)">
                    <input type="number" min="1" max="${product.quantityProduced}" 
                           placeholder="Qty (kg)" required>
                    <button type="submit">
                        <i class="fas fa-cart-plus"></i> Add
                    </button>
                </form>
            </div>
        </div>
    `).join('');
}

async function placeOrder(event) {
    event.preventDefault();
    const form = event.target;
    const productId = form.dataset.id;
    const quantity = form.querySelector('input').value;
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/consumer/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, quantity })
        });

        if (!response.ok) throw new Error('Order failed');

        alert('Order placed successfully!');
        form.reset();
    } catch (err) {
        console.error('Order error:', err);
        alert('Failed to place order: ' + err.message);
    }
}