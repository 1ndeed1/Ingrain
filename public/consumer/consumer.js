let currentUserId = localStorage.getItem('userId');
let cart = [];
let allProducts = [];
const socket = io('http://localhost:3000', { 
    withCredentials: true,
    auth: { 
        token: localStorage.getItem('token'), // Changed from document.cookie to localStorage
        userId: localStorage.getItem('userId')
    }
});

document.addEventListener('DOMContentLoaded', () => {
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
    const mainContent = document.getElementById('mainContent');

    if (!cartToggle || !closeCart || !cartSidebar || !placeOrderBtn || !logoutBtn || !searchInput || !ordersLink || !messagesLink || !mainContent) {
        console.error('Missing DOM elements');
        document.getElementById('productsContainer').innerHTML = '<p class="error">Page setup error. Please refresh.</p>';
        return;
    }

    // Update nav with profile link
    const nav = document.querySelector('nav');
    nav.innerHTML = `
        <a href="/consumer/profile">Profile</a>
        <a href="#" id="ordersLink">Orders</a>
        <a href="#" id="messagesLink">Messages</a>
        <a href="#" id="cartToggle"><i class="fas fa-shopping-cart"></i> Cart (<span id="cartCount">0</span>)</a>
        <button id="logoutBtn" class="btn-outline"><i class="fas fa-sign-out-alt"></i> Logout</button>
    `;

    // Reattach event listeners after updating nav
    document.getElementById('ordersLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadOrdersSection();
    });
    document.getElementById('messagesLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadMessagesSection();
    });
    document.getElementById('cartToggle').addEventListener('click', (e) => {
        e.preventDefault();
        cartSidebar.classList.toggle('active');
    });
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error('Logout failed:', err);
        }
        localStorage.removeItem('role');
        window.location.href = '/login';
    });

    cartSidebar.classList.remove('active');

    loadProducts();
    setInterval(loadProducts, 10000);

    closeCart.addEventListener('click', () => {
        cartSidebar.classList.remove('active');
    });

    placeOrderBtn.addEventListener('click', placeOrder);

    searchInput.addEventListener('input', searchProducts);

    socket.on('connect', () => {
        socket.userId = localStorage.getItem('userId'); // Assume userId is set during login
        console.log('Consumer connected:', socket.userId); // Added logging
    });

    socket.on('connect_error', (err) => {
        console.error('Consumer connection error:', err.message); // Added error handling
        if (err.message.includes('Authentication')) {
            alert('Authentication failed. Please log in again.');
            window.location.href = '/login';
        }
    });

    socket.on('newMessage', (message) => {
        console.log('Consumer received new message:', message); // Added logging
        if (selectedContact && (message.senderId._id === selectedContact._id || message.receiverId._id === selectedContact._id)) {
            renderMessages();
        }
    });
});

async function loadProducts() {
    const sortBy = document.getElementById('sortBy').value;
    const filterType = document.getElementById('filterType').value;

    try {
        const response = await fetch(`/api/consumer/products?sort=${sortBy}&type=${filterType}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            const errorText = await response.json();
            throw new Error(errorText.message || `Failed to load products: ${response.status}`);
        }
        allProducts = await response.json();
        renderProducts(allProducts);
    } catch (err) {
        document.getElementById('productsContainer').innerHTML = `<p class="error">Error loading products: ${err.message}. Please try again later.</p>`;
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            localStorage.removeItem('role');
            window.location.href = '/login';
        }
    }
}

function renderProducts(products) {
    const container = document.getElementById('productsContainer');
    container.innerHTML = products.length ? products.map(product => `
        <div class="product-card">
            <div class="product-image" style="background-image: url('${product.imageUrl || '/uploads/default.jpg'}')"></div>
            <div class="product-info">
                <h3 class="product-title">${product.name || 'Unnamed Product'}</h3>
                <div class="product-meta">
                    <span class="product-price">₹${product.price || 0}/kg</span>
                    <span>${product.quantityProduced || 0} kg</span>
                </div>
            </div>
            <div class="product-details">
                <div>
                    <h3>${product.name || 'Unnamed Product'}</h3>
                    <p>Farmer: ${product.farmerId?.profile?.name || 'Unknown'}</p>
                    <p>${product.description || 'No description available'}</p>
                    <p>Available: ${product.quantityProduced || 0} kg</p>
                </div>
                <div class="product-actions">
                    <button onclick="addToCart('${product._id || ''}', '${product.name || 'Unnamed'}', ${product.price || 0}, ${product.quantityProduced || 0})" class="btn-primary">Add to Cart</button>
                    <button onclick="openChat('${product.farmerId?._id || 'unknown'}')" class="btn-primary"><i class="fas fa-comment"></i> Chat</button>
                </div>
            </div>
        </div>
    `).join('') : '<p>No products found. Check back later!</p>';
}

function searchProducts() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allProducts.filter(product => 
        (product.name?.toLowerCase() || '').includes(search) || 
        (product.farmerId?.profile?.name?.toLowerCase() || '').includes(search)
    );
    renderProducts(filtered);
}

function addToCart(productId, name, price, maxQty) {
    if (!productId) {
        console.error('Invalid product ID');
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
    if (!cart.length) return alert('Cart is empty!');
    try {
        const response = await fetch('/api/consumer/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ orders: cart.map(item => ({ productId: item.productId, quantity: item.quantity })) })
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Order failed');
        alert('Order placed successfully!');
        cart = [];
        updateCart();
        document.getElementById('cartSidebar').classList.remove('active');
    } catch (err) {
        alert('Failed to place order: ' + err.message);
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            localStorage.removeItem('role');
            window.location.href = '/login';
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
                <p>Loading orders...</p>
            </div>
        </section>
    `;

    try {
        const response = await fetch('/api/consumer/orders', {
            credentials: 'include'
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to load orders');
        const orders = await response.json();
        renderOrders(orders);
    } catch (err) {
        document.getElementById('ordersContainer').innerHTML = `<p class="error">${err.message}</p>`;
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            localStorage.removeItem('role');
            window.location.href = '/login';
        }
    }
}

function renderOrders(orders) {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = orders.length ? orders.map(order => `
        <div class="order-card">
            <h3>Order #${order._id}</h3>
            <p><strong>Farmer:</strong> ${order.farmerId?.profile?.name || 'Unknown'}</p>
            <p><strong>Items:</strong> ${order.items.map(item => `${item.name} (${item.quantity} kg)`).join(', ')}</p>
            <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
    `).join('') : '<p>No orders yet.</p>';
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
        const response = await fetch('/api/consumer/contacts', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load contacts');
        const contacts = await response.json();
        contactsContainer.innerHTML = contacts.map(contact => `
            <div class="contact" onclick="selectContact('${contact._id}', '${contact.profile.name}')">
                ${contact.profile.name} <!-- Backend provides email if no name -->
            </div>
        `).join('');
        if (preselectedFarmerId) {
            const contact = contacts.find(c => c._id === preselectedFarmerId);
            if (contact) selectContact(contact._id, contact.profile.name);
        }
    } catch (err) {
        contactsContainer.innerHTML = `<p class="error">${err.message}</p>`;
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
        const response = await fetch('/api/messages', { credentials: 'include' });
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
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll to bottom
    } catch (err) {
        messagesContainer.innerHTML = `<p class="error">${err.message}</p>`;
    }
}  