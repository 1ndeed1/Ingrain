let currentUserId = localStorage.getItem('userId');
let cart = [];
let allProducts = [];
let profile = null;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
const socket = io('http://localhost:3000', {
    withCredentials: true,
    auth: {
        token: localStorage.getItem('token'),
        userId: localStorage.getItem('userId')
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const role = localStorage.getItem('role');
    if (role !== 'consumer') {
        window.location.href = '/login';
        return;
    }

    const cartToggle = document.getElementById('cartToggle');
    const closeCart = document.getElementById('closeCart');
    const cartSidebar = document.getElementById('cartSidebar');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    const ordersLink = document.getElementById('ordersLink');
    const messagesLink = document.getElementById('messagesLink');
    const profileLink = document.getElementById('profileLink');
    const profileModal = document.getElementById('profileModal');
    const goToProfileBtn = document.getElementById('goToProfileBtn');
    const skipProfileBtn = document.getElementById('skipProfileBtn');
    const productsContainer = document.getElementById('productsContainer');

    if (!cartToggle || !closeCart || !cartSidebar || !placeOrderBtn || !logoutBtn || !searchInput || !ordersLink || !messagesLink || !profileLink || !profileModal || !goToProfileBtn || !skipProfileBtn || !productsContainer) {
        console.error('Missing DOM elements', {
            cartToggle, closeCart, cartSidebar, placeOrderBtn, logoutBtn, searchInput, ordersLink, messagesLink, profileLink, profileModal, goToProfileBtn, skipProfileBtn, productsContainer
        });
        productsContainer.innerHTML = '<p class="error">Page setup error. Please refresh or check console.</p>';
        return;
    }

    await loadProfile().then(() => {
        if (profile && !profile.isProfileComplete) {
            profileModal.classList.add('active');
        } else {
            profileModal.classList.remove('active');
        }
    }).catch(err => {
        console.error('Profile load error:', err);
        profileModal.classList.remove('active');
    });

    goToProfileBtn.addEventListener('click', () => {
        window.location.href = '/consumer/profile';
    });

    skipProfileBtn.addEventListener('click', () => {
        profileModal.classList.remove('active');
    });

    cartSidebar.classList.remove('active');

    loadProducts();
    setInterval(loadProducts, 10000); // Refresh products every 10 seconds

    productsContainer.addEventListener('click', (e) => {
        const productCard = e.target.closest('.product-card');
        if (!productCard) return;

        const productId = productCard.querySelector('[data-product-id]')?.dataset.productId;
        const farmerId = productCard.querySelector('[data-farmer-id]')?.dataset.farmerId;

        if (!productId) {
            console.warn('No product ID found for card', productCard);
            return;
        }

        if (e.target.closest('.btn-secondary')) {
            toggleFavorite(productId);
        } else if (e.target.closest('.btn-primary:not([data-farmer-id])')) {
            const name = productCard.querySelector('.product-title').textContent;
            const price = parseFloat(productCard.querySelector('.product-price').textContent.replace('₹', '').replace('/kg', ''));
            const maxQty = parseFloat(productCard.querySelector('.product-meta span:last-child').textContent.replace(' kg', ''));
            addToCart(productId, name, price, maxQty);
        } else if (e.target.closest('button[data-farmer-id]')) {
            openChat(farmerId);
        }
    });

    cartToggle.addEventListener('click', (e) => {
        e.preventDefault();
        cartSidebar.classList.toggle('active');
    });

    closeCart.addEventListener('click', () => {
        cartSidebar.classList.remove('active');
    });

    placeOrderBtn.addEventListener('click', placeOrder);

    searchInput.addEventListener('input', searchProducts);

    ordersLink.addEventListener('click', (e) => {
        e.preventDefault();
        loadOrdersSection();
    });

    messagesLink.addEventListener('click', (e) => {
        e.preventDefault();
        loadMessagesSection();
    });

    profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/consumer/profile';
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error('Logout failed:', err);
        }
        localStorage.removeItem('role');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/login';
    });

    socket.on('connect', () => {
        socket.userId = localStorage.getItem('userId');
        socket.emit('join', socket.userId);
        console.log('Consumer connected:', socket.userId);
    });

    socket.on('connect_error', (err) => {
        console.error('Consumer connection error:', err.message);
        if (err.message.includes('Authentication')) {
            alert('Authentication failed. Please log in again.');
            window.location.href = '/login';
        }
    });

    socket.on('orderUpdate', (data) => {
        showMessage(`Order #${data.orderId} status updated to ${data.status}`);
        if (document.getElementById('ordersContainer')) {
            loadOrdersSection();
        }
    });

    socket.on('newMessage', (message) => {
        if (selectedContact && (message.senderId._id === selectedContact._id || message.receiverId._id === selectedContact._id)) {
            renderMessages();
        }
    });
});

async function loadProfile() {
    const profileLink = document.getElementById('profileLink');
    profileLink.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    try {
        const response = await fetch('/api/consumer/profile', {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to load profile');
        profile = await response.json();
        if (profile.isProfileComplete && profile.profilePicture) {
            profileLink.innerHTML = `
                <img src="${profile.profilePicture}" alt="Profile" class="profile-img">
                <span>${profile.name || 'User'}</span>
            `;
            profileLink.classList.add('profile-complete');
        } else {
            profileLink.innerHTML = '<i class="fas fa-user"></i> Profile';
        }
        return profile;
    } catch (err) {
        console.error('Profile load error:', err);
        profileLink.innerHTML = '<i class="fas fa-user"></i> Profile';
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            window.location.href = '/login';
        }
        throw err;
    }
}

async function loadProducts() {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading products...</p>';
    const sortBy = document.getElementById('sortBy').value;
    const filterType = document.getElementById('filterType').value;

    try {
        const response = await fetch(`/api/consumer/products?sort=${sortBy}&type=${filterType}`, {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) {
            const errorText = await response.json();
            throw new Error(errorText.message || `Failed to load products: ${response.status}`);
        }
        allProducts = await response.json();
        renderProducts(allProducts);
    } catch (err) {
        container.innerHTML = `<p class="error">Error loading products: ${err.message}. Please try again later or check your profile.</p>`;
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            localStorage.removeItem('role');
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            window.location.href = '/login';
        }
    }
}

function renderProducts(products) {
    const container = document.getElementById('productsContainer');
    container.innerHTML = products.length ? products.map(product => {
        const imageUrl = product.imageUrl || '/uploads/default.jpg';
        const name = product.name || 'Unnamed Product';
        const price = product.price || 0;
        const quantityAvailable = product.quantityAvailable || 0;
        const farmerName = product.farmerId?.profile?.name || 'Unknown';
        const description = product.description || 'No description available';

        return `
            <div class="product-card">
                <div class="product-image" style="background-image: url('${imageUrl}')"></div>
                <div class="product-info">
                    <h3 class="product-title">${name}</h3>
                    <div class="product-meta">
                        <span class="product-price">₹${price}/kg</span>
                        <span>${quantityAvailable} kg</span>
                    </div>
                </div>
                <div class="product-details">
                    <div>
                        <h3>${name}</h3>
                        <p>Farmer: ${farmerName}</p>
                        <p>${description}</p>
                        <p>Available: ${quantityAvailable} kg</p>
                    </div>
                    <div class="product-actions">
                        <button data-product-id="${product._id || ''}" class="btn-secondary">
                            <i class="fas ${isFavorite(product._id) ? 'fa-heart' : 'fa-heart-o'}"></i>
                            ${isFavorite(product._id) ? 'Unfavorite' : 'Favorite'}
                        </button>
                        <button data-product-id="${product._id || ''}" class="btn-primary">Add to Cart</button>
                        <button data-farmer-id="${product.farmerId?._id || 'unknown'}" class="btn-primary">
                            <i class="fas fa-comment"></i> Chat
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('') : '<p>No products found. Check back later or complete your profile.</p>';
}

function searchProducts() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allProducts.filter(product =>
        (product.name?.toLowerCase() || '').includes(search) ||
        (product.farmerId?.profile?.name?.toLowerCase() || '').includes(search)
    );
    renderProducts(filtered);
}

function isFavorite(productId) {
    return favorites.includes(productId);
}

function toggleFavorite(productId) {
    if (!productId) {
        console.warn('Invalid product ID for favorite toggle');
        return;
    }
    if (isFavorite(productId)) {
        favorites = favorites.filter(id => id !== productId);
    } else {
        favorites.push(productId);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderProducts(allProducts);
}

function addToCart(productId, name, price, maxQty) {
    if (!productId) {
        console.error('Invalid product ID for adding to cart');
        return;
    }
    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        if (existing.quantity < maxQty) existing.quantity++;
    } else {
        cart.push({ productId, name, price, quantity: 1, maxQty });
    }
    updateCart();
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartCountSidebar = document.getElementById('cartCountSidebar');
    const cartTotal = document.getElementById('cartTotal');
    const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

    cartCount.textContent = cartCountSidebar.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartTotal.textContent = total.toFixed(2);

    cartItems.innerHTML = cart.length ? cart.map(item => `
        <div class="cart-item">
            <span>${item.name}</span>
            <div>
                <input type="number" min="1" max="${item.maxQty}" value="${item.quantity}" onchange="updateQuantity('${item.productId}', this.value)">
                <button onclick="removeFromCart('${item.productId}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('') : '<p>Your cart is empty.</p>';
}

function updateQuantity(productId, value) {
    const item = cart.find(item => item.productId === productId);
    if (item) {
        item.quantity = Math.min(Math.max(1, parseInt(value)), item.maxQty);
        updateCart();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    updateCart();
}

async function placeOrder() {
    if (!cart.length) {
        showMessage('Cart is empty!', true);
        return;
    }
    if (!profile?.isProfileComplete) {
        showMessage('Please complete your profile before placing an order.', true);
        document.getElementById('profileModal').classList.add('active');
        return;
    }

    const container = document.getElementById('productsContainer');
    container.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Placing order...</p>';

    try {
        const productIds = [...new Set(cart.map(item => item.productId))];
        const response = await fetch(`/api/consumer/products?ids=${productIds.join(',')}`, {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch products');
        const products = await response.json();

        const orderItems = [];
        cart.forEach(item => {
            let existing = orderItems.find(o => o.productId === item.productId);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                orderItems.push({ ...item });
            }
        });

        const updatedCart = orderItems.map(item => {
            const product = products.find(p => p._id === item.productId);
            if (!product) throw new Error(`Product ${item.productId} not found`);
            if (product.quantityAvailable < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantityAvailable} kg`);
            }
            return {
                productId: item.productId,
                quantity: item.quantity,
                version: product.version,
                farmerId: product.farmerId._id
            };
        });

        const orderResponse = await fetch('/api/consumer/orders', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include',
            body: JSON.stringify({
                orders: updatedCart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    version: item.version
                })),
                status: 'Pending'
            })
        });

        if (!orderResponse.ok) throw new Error((await orderResponse.json()).error || 'Order failed');
        const result = await orderResponse.json();

        showMessage(`Order placed successfully! Order Numbers: ${result.orderNumbers.join(', ')}`);
        cart = [];
        updateCart();
        document.getElementById('cartSidebar').classList.remove('active');
        loadOrdersSection();
    } catch (err) {
        console.error('Order placement error:', err);
        container.innerHTML = `<p class="error">Order failed: ${err.message}</p>`;
        showMessage(`Order failed: ${err.message}`, true);
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            showMessage('Session expired. Redirecting to login...', true);
            setTimeout(() => {
                localStorage.removeItem('role');
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                window.location.href = '/login';
            }, 2000);
        } else if (err.message.includes('Insufficient stock')) {
            showMessage(err.message + ' Please refresh the page.', true);
            loadProducts();
        }
    }
}

async function openChat(farmerId) {
    loadMessagesSection(farmerId);
}

async function loadOrdersSection() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <section class="order-section">
            <h2>Your Orders</h2>
            <div id="ordersContainer">
                <p><i class="fas fa-spinner fa-spin"></i> Loading orders...</p>
            </div>
        </section>
    `;

    try {
        const response = await fetch('/api/consumer/orders', {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to load orders');
        const orders = await response.json();
        renderOrders(orders);
    } catch (err) {
        document.getElementById('ordersContainer').innerHTML = `<p class="error">${err.message}</p>`;
        showMessage(`Failed to load orders: ${err.message}`, true);
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            localStorage.removeItem('role');
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            window.location.href = '/login';
        }
    }
}

function renderOrders(orders) {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = orders.length ? orders.map(order => {
        let actionButton = '';
        if (order.status === 'Accepted') {
            actionButton = `
                <button class="btn-primary" onclick="showPaymentModal('${order.orderNumber}')">Pay Now</button>
            `;
        } else if (order.status === 'Pending Payment') {
            actionButton = `
                <p>Waiting for farmer to review payment...</p>
                ${order.paymentProof ? `<img src="${order.paymentProof}" alt="Payment Proof" style="max-width: 200px;" onerror="this.style.display='none'">` : ''}
            `;
        } else if (order.status === 'Shipped' || order.status === 'Delivered') {
            actionButton = `<p>Order ${order.status.toLowerCase()}</p>`;
        } else if (order.status === 'Pending') {
            actionButton = `<p>Waiting for farmer acceptance...</p>`;
        } else if (order.status === 'Cancelled') {
            actionButton = `<p>Order Cancelled</p>`;
        }

        return `
            <div class="order-card">
                <h3>Order #${order.orderNumber}</h3>
                <p><strong>Farmer:</strong> ${order.farmerId?.profile?.name || 'Unknown'}</p>
                <p><strong>Items:</strong> ${order.items.map(item => `${item.name} (${item.quantity} kg)`).join(', ')}</p>
                <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
                <p><strong>Status:</strong> ${order.status || 'Pending'}</p>
                <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                ${actionButton}
                <button onclick="loadOrderDetails('${order.orderNumber}')">View Details</button>
                ${order.status === 'Pending' ? '<button onclick="cancelOrder(\'' + order._id + '\')">Cancel Order</button>' : ''}
            </div>
        `;
    }).join('') : '<p>No orders yet.</p>';
}

async function loadOrderDetails(orderNumber) {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <section class="order-details-section">
            <h2>Order Details</h2>
            <div id="orderDetailsContainer">
                <p><i class="fas fa-spinner fa-spin"></i> Loading order details...</p>
            </div>
        </section>
    `;

    try {
        const response = await fetch(`/api/consumer/orders/${orderNumber}`, {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to load order details');
        const order = await response.json();

        const container = document.getElementById('orderDetailsContainer');
        let actionButton = '';
        if (order.status === 'Accepted') {
            actionButton = `
                <button class="btn-primary" onclick="showPaymentModal('${order.orderNumber}')">Pay Now</button>
            `;
        } else if (order.status === 'Pending Payment') {
            actionButton = `
                <p>Payment submitted. Waiting for farmer review...</p>
                ${order.paymentProof ? `<img src="${order.paymentProof}" alt="Payment Proof" style="max-width: 200px;" onerror="this.style.display='none'">` : ''}
            `;
        } else if (order.status === 'Shipped' || order.status === 'Delivered') {
            actionButton = `<p>Order ${order.status.toLowerCase()}</p>`;
        } else if (order.status === 'Pending') {
            actionButton = `<p>Waiting for farmer acceptance...</p>`;
        } else if (order.status === 'Cancelled') {
            actionButton = `<p>Order Cancelled</p>`;
        }

        container.innerHTML = `
            <div class="order-card">
                <h3>Order #${order.orderNumber}</h3>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
                <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Shipping Address:</strong> ${order.shippingAddress || 'Not provided'}</p>
                <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
                <h4>Items:</h4>
                <ul>
                    ${order.items.map(item => `
                        <li>${item.name} - ${item.quantity} kg @ ₹${item.price}/kg</li>
                    `).join('')}
                </ul>
                ${actionButton}
                ${order.status === 'Pending' ? '<button onclick="cancelOrder(\'' + order._id + '\')">Cancel Order</button>' : ''}
            </div>
        `;
    } catch (err) {
        document.getElementById('orderDetailsContainer').innerHTML = `<p class="error">${err.message}</p>`;
        showMessage(`Failed to load order details: ${err.message}`, true);
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            showMessage('Session expired. Redirecting to login...', true);
            setTimeout(() => {
                localStorage.removeItem('role');
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                window.location.href = '/login';
            }, 2000);
        }
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
        const response = await fetch(`/api/consumer/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}` 
            },
            credentials: 'include'
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to cancel order');
        showMessage('Order cancelled successfully!');
        loadOrdersSection();
    } catch (err) {
        showMessage('Failed to cancel order: ' + err.message, true);
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            showMessage('Session expired. Redirecting to login...', true);
            setTimeout(() => {
                localStorage.removeItem('role');
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                window.location.href = '/login';
            }, 2000);
        }
    }
}

let selectedContact = null;

async function loadMessagesSection(preselectedFarmerId = null) {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <section class="messages-section">
            <h2>Messages</h2>
            <div class="chat-container">
                <div class="contacts-list">
                    <h3>Contacts</h3>
                    <div id="contactsContainer"></div>
                </div>
                <div class="chat-area">
                    <div id="chatHeader">Select a contact to start chatting</div>
                    <div id="messagesContainer"></div>
                    <form id="messageForm" style="display: none;">
                        <input type="text" id="messageInput" placeholder="Type a message..." required>
                        <button type="submit" class="btn-primary"><i class="fas fa-paper-plane"></i></button>
                    </form>
                </div>
            </div>
        </section>
    `;

    loadContacts(preselectedFarmerId);
    const messageForm = document.getElementById('messageForm');
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedContact) return;
        const content = document.getElementById('messageInput').value;
        socket.emit('sendMessage', { receiverId: selectedContact._id, content });
        document.getElementById('messageInput').value = '';
        renderMessages();
    });
}

async function loadContacts(preselectedFarmerId) {
    const contactsContainer = document.getElementById('contactsContainer');
    try {
        const response = await fetch('/api/consumer/contacts', { 
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to load contacts');
        const contacts = await response.json();
        contactsContainer.innerHTML = contacts.map(contact => `
            <div class="contact" onclick="selectContact('${contact._id}', '${contact.profile.name}')">
                ${contact.profile.name}
            </div>
        `).join('');
        if (preselectedFarmerId) {
            const contact = contacts.find(c => c._id === preselectedFarmerId);
            if (contact) selectContact(contact._id, contact.profile.name);
        }
    } catch (err) {
        contactsContainer.innerHTML = `<p class="error">${err.message}</p>`;
        showMessage(`Failed to load contacts: ${err.message}`, true);
    }
}

async function selectContact(id, name) {
    selectedContact = { _id: id, name };
    document.getElementById('chatHeader').textContent = `Chat with ${name}`;
    document.getElementById('messageForm').style.display = 'block';
    renderMessages();
}

async function renderMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!selectedContact) return;
    try {
        const response = await fetch('/api/messages', { 
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to load messages');
        const messages = await response.json();
        const filteredMessages = messages.filter(msg =>
            (msg.senderId._id === selectedContact._id && msg.receiverId._id === currentUserId) ||
            (msg.receiverId._id === selectedContact._id && msg.senderId._id === currentUserId)
        );
        messagesContainer.innerHTML = filteredMessages.map(msg => `
            <div class="message ${msg.senderId._id === currentUserId ? 'sent' : 'received'}">
                <p>${msg.content}</p>
                <span>${new Date(msg.timestamp).toLocaleTimeString()}</span>
                ${msg.productId ? `<p><small>Re: ${msg.productId.name}</small></p>` : ''}
                ${msg.orderId ? `<p><small>Order #${msg.orderId._id}</small></p>` : ''}
            </div>
        `).join('');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (err) {
        messagesContainer.innerHTML = `<p class="error">${err.message}</p>`;
        showMessage(`Failed to load messages: ${err.message}`, true);
    }
}

function showMessage(text, isError = false) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.className = 'notification' + (isError ? ' error' : '');
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

function showPaymentModal(orderNumber) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Make Payment for Order #${orderNumber}</h2>
            <p>Scan the QR code below to pay ₹<span id="paymentAmount"></span></p>
            <div class="qr-code-container">
                <img src="/uploads/payment-qr-code.png" alt="Payment QR Code" id="qrCode" class="qr-code-image">
            </div>
            <p>After payment, upload a screenshot as proof.</p>
            <form id="paymentForm">
                <input type="file" id="paymentProof" name="paymentProof" accept="image/*" required>
                <button type="submit" class="btn-primary">Submit Payment Proof</button>
            </form>
            <button class="btn-secondary" onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    fetch(`/api/consumer/orders/${orderNumber}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => response.json())
    .then(order => {
        document.getElementById('paymentAmount').textContent = order.total.toFixed(2);
    })
    .catch(err => {
        showMessage(`Failed to load order details: ${err.message}`, true);
    });

    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('paymentProof');
        const file = fileInput.files[0];
        if (!file) {
            showMessage('Please upload a payment screenshot.', true);
            return;
        }

        const formData = new FormData();
        formData.append('paymentProof', file);

        try {
            const response = await fetch(`/api/consumer/orders/${orderNumber}/pay`, {
                method: 'POST',
                credentials: 'include',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to submit payment proof');
            showMessage('Payment proof submitted successfully. Waiting for farmer review.');
            modal.remove();
            loadOrdersSection();
        } catch (err) {
            showMessage(err.message, true);
        }
    });
}

let allOrders = [];
async function loadAllOrders() {
    const response = await fetch('/api/consumer/orders', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (response.ok) {
        allOrders = await response.json();
    }
}

loadAllOrders();