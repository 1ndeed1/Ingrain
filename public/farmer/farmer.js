// DOM Elements
const contentSection = document.getElementById('content');
const navButtons = document.querySelectorAll('.nav-btn');
const logoutBtn = document.getElementById('logoutBtn');
const profilePhoto = document.getElementById('profilePhoto');
const profileName = document.getElementById('profileName');
const homeLink = document.getElementById('homeLink');
let currentUserId = localStorage.getItem('userId');

// Socket.IO Setup
const socket = io('http://localhost:3000', { 
    withCredentials: true,
    auth: { 
        token: localStorage.getItem('token'),
        userId: localStorage.getItem('userId')
    }
});

// Templates for sections
const profileTemplate = `
    <section class="profile-section">
        <h2>Your Profile</h2>
        <div id="profileData">Loading profile...</div>
    </section>
`;

const cropsTemplate = `
    <section class="crops-section">
        <div class="crop-form">
            <h2>Add New Crop</h2>
            <form id="addCropForm" enctype="multipart/form-data">
                <div class="form-row">
                    <div class="form-group">
                        <label for="name">Crop Name</label>
                        <input type="text" id="name" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="cropType">Crop Type</label>
                        <select id="cropType" name="cropType" onchange="toggleCustomType()">
                            <option value="Grains">Grains</option>
                            <option value="Vegetables">Vegetables</option>
                            <option value="Fruits">Fruits</option>
                            <option value="Legumes">Legumes</option>
                            <option value="Custom">Custom</option>
                        </select>
                        <input type="text" id="customCropType" name="customCropType" placeholder="Enter custom type" style="display: none;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="quantityProduced">Quantity (kg)</label>
                        <input type="number" id="quantityProduced" name="quantityProduced" min="1" required>
                    </div>
                    <div class="form-group">
                        <label for="investment">Investment (₹)</label>
                        <input type="number" id="investment" name="investment" min="0" required oninput="calculateProfit()">
                    </div>
                    <div class="form-group">
                        <label for="price">Price (₹/kg)</label>
                        <input type="number" id="price" name="price" min="0" required oninput="calculateProfit()">
                        <span id="profitIndex"></span>
                    </div>
                </div>
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" rows="2" required></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="image">Crop Image</label>
                        <input type="file" id="image" name="image" accept="image/*">
                    </div>
                    <div class="form-group">
                        <button type="button" id="toggleDetails" class="btn-secondary">More Details</button>
                    </div>
                </div>
                <div id="optionalFields" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="scientificName">Scientific Name</label>
                            <input type="text" id="scientificName" name="scientificName">
                        </div>
                        <div class="form-group">
                            <label for="cropFamily">Crop Family</label>
                            <input type="text" id="cropFamily" name="cropFamily">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="fertilizerNeeds">Fertilizers Used</label>
                            <input type="text" id="fertilizerNeeds" name="fertilizerNeeds">
                        </div>
                        <div class="form-group">
                            <label for="soilType">Soil Type</label>
                            <select name="soilType">
                                <option value="">Select</option>
                                <option value="loamy">Loamy</option>
                                <option value="sandy">Sandy</option>
                                <option value="clay">Clay</option>
                                <option value="silt">Silt</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="waterNeeds">Water Needs</label>
                            <select name="waterNeeds">
                                <option value="">Select</option>
                                <option value="low">Low</option>
                                <option value="moderate">Moderate</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="carbonFootprint">Carbon Footprint</label>
                            <input type="text" id="carbonFootprint" name="carbonFootprint">
                        </div>
                    </div>
                </div>
                <button type="submit" class="btn-primary">Add Crop</button>
            </form>
        </div>
        <div class="crop-list">
            <h2>Your Listed Crops <button id="refreshCropsBtn" class="btn-refresh">Refresh</button></h2>
            <div id="cropContainer">
                <p id="loadingMessage">Loading your crops...</p>
            </div>
        </div>
    </section>
`;

const ordersTemplate = `
    <section class="orders-section">
        <h2>Orders <button id="refreshOrdersBtn" class="btn-refresh">Refresh</button></h2>
        <div id="ordersContainer">
            <p>Loading orders...</p>
        </div>
    </section>
`;

const messagesTemplate = `
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

const placeholderTemplate = (title) => `
    <section class="placeholder-section">
        <h2>${title}</h2>
        <p>Feature coming soon!</p>
    </section>
`;

// Load profile data for sidebar
async function loadSidebarProfile() {
    try {
        const response = await fetch('/api/farmer/profile', {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to load profile');
        const profile = await response.json();
        if (profile.isProfileComplete) {
            profilePhoto.src = profile.profilePicture || '/uploads/default.jpg';
            profileName.textContent = profile.name || 'Farmer';
        } else {
            profilePhoto.src = '/uploads/default.jpg';
            profileName.textContent = 'Complete Profile';
        }
    } catch (err) {
        profilePhoto.src = '/uploads/default.jpg';
        profileName.textContent = 'Error';
        console.error('Sidebar profile load error:', err);
        showMessage('Failed to load sidebar profile', true);
    }
}

// Handle section switching with History API
navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const section = button.dataset.section || (button.id === 'analyticsLink' ? 'analytics' : '');
        if (section) {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            loadSection(section);
            if (section !== 'analytics') {
                window.history.pushState({ section }, '', `#${section}`);
            }
        }
    });
});

if (homeLink) {
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/';
    });
}

function loadSection(section) {
    if (section === 'analytics') {
        window.location.href = '/analytics'; // Redirect to standalone analytics page
        return;
    }
    if (section === 'profile') {
        contentSection.innerHTML = profileTemplate;
        loadProfile();
    } else if (section === 'crops') {
        contentSection.innerHTML = cropsTemplate;
        initCropSection();
    } else if (section === 'orders') {
        contentSection.innerHTML = ordersTemplate;
        loadOrders();
    } else if (section === 'messages') {
        contentSection.innerHTML = messagesTemplate;
        initChat();
    }
}

// Handle browser back/forward
window.onpopstate = (event) => {
    if (event.state && event.state.section) {
        loadSection(event.state.section);
        const activeBtn = document.querySelector(`.nav-btn[data-section="${event.state.section}"]`);
        if (activeBtn) {
            navButtons.forEach(btn => btn.classList.remove('active'));
            activeBtn.classList.add('active');
        }
    }
};

// Profile logic
async function loadProfile() {
    const profileDataDiv = document.getElementById('profileData');
    try {
        const response = await fetch('/api/farmer/profile', {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to load profile');
        }
        const profile = await response.json();
        
        if (!profile.isProfileComplete) {
            profileDataDiv.innerHTML = '<p>Please complete your profile <a href="/farmer/profile">here</a>.</p>';
            return;
        }

        profileDataDiv.innerHTML = `
            <div class="profile-photo-large">
                <img src="${profile.profilePicture || '/uploads/default.jpg'}" alt="Profile Photo">
            </div>
            <p><strong>Name:</strong> ${profile.name || 'Not provided'}</p>
            <p><strong>Farm Name:</strong> ${profile.farmName || 'Not provided'}</p>
            <p><strong>Location:</strong> ${profile.location || 'Not provided'}</p>
            <p><strong>Bio:</strong> ${profile.bio || 'Not provided'}</p>
            <p><strong>Contact Number:</strong> ${profile.contactNumber || 'Not provided'}</p>
            <button class="btn-primary" onclick="window.location.href='/farmer/profile'">Edit Profile</button>
        `;
    } catch (err) {
        profileDataDiv.innerHTML = `<p class="error">${err.message} <button onclick="loadProfile()">Retry</button></p>`;
    }
}

// Crop section logic
function initCropSection() {
    const addCropForm = document.getElementById('addCropForm');
    const toggleDetailsBtn = document.getElementById('toggleDetails');
    const optionalFields = document.getElementById('optionalFields');
    const refreshCropsBtn = document.getElementById('refreshCropsBtn');

    toggleDetailsBtn.addEventListener('click', () => {
        optionalFields.style.display = optionalFields.style.display === 'none' ? 'block' : 'none';
        toggleDetailsBtn.textContent = optionalFields.style.display === 'none' ? 'More Details' : 'Hide Details';
    });

    addCropForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        
        formData.append('name', e.target.name.value);
        formData.append('cropType', e.target.cropType.value === 'Custom' ? e.target.customCropType.value : e.target.cropType.value);
        formData.append('quantityProduced', parseFloat(e.target.quantityProduced.value));
        formData.append('investment', parseFloat(e.target.investment.value));
        formData.append('price', parseFloat(e.target.price.value));
        formData.append('description', e.target.description.value);
        if (e.target.image.files[0]) formData.append('image', e.target.image.files[0]);
        
        ['scientificName', 'cropFamily', 'fertilizerNeeds', 'soilType', 'waterNeeds', 'carbonFootprint']
            .forEach(field => {
                if (e.target[field].value) formData.append(field, e.target[field].value);
            });

        try {
            const response = await fetch('/api/farmer/crops', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to add crop');
            showMessage('Crop added successfully');
            e.target.reset();
            optionalFields.style.display = 'none';
            toggleDetailsBtn.textContent = 'More Details';
            loadCrops();
        } catch (err) {
            showMessage(err.message, true);
        }
    });

    if (refreshCropsBtn) {
        refreshCropsBtn.addEventListener('click', loadCrops);
    }
    loadCrops();
}

async function loadCrops() {
    const cropContainer = document.getElementById('cropContainer');
    if (!cropContainer) return;
    const loadingMessage = document.getElementById('loadingMessage');

    if (loadingMessage) loadingMessage.style.display = 'block';
    cropContainer.innerHTML = '';

    try {
        const response = await fetch('/api/farmer/crops', {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to load crops');
        const crops = await response.json();
        renderCrops(crops);
    } catch (err) {
        cropContainer.innerHTML = `<p class="error">${err.message} <button onclick="loadCrops()">Retry</button></p>`;
    } finally {
        if (loadingMessage) loadingMessage.style.display = 'none';
    }
}

function renderCrops(crops) {
    const cropContainer = document.getElementById('cropContainer');
    if (crops.length === 0) {
        cropContainer.innerHTML = '<p>No crops listed yet.</p>';
        return;
    }
    cropContainer.innerHTML = crops.map(crop => `
        <div class="crop-card">
            <div class="crop-image">
                ${crop.imageUrl ? `<img src="${crop.imageUrl}" alt="${crop.name}">` : `<p class="no-image">${crop.name.charAt(0)}</p>`}
            </div>
            <div class="crop-info">
                <h3>${crop.name}</h3>
                <p><strong>Type:</strong> ${crop.cropType}</p>
                <p><strong>Price:</strong> ₹${crop.price}/kg</p>
                <p><strong>Quantity Available:</strong> ${crop.quantityAvailable} kg</p>
                <p><strong>Investment:</strong> ₹${crop.investment}</p>
                <p><strong>Description:</strong> ${crop.description}</p>
                ${crop.scientificName ? `<p><strong>Scientific Name:</strong> ${crop.scientificName}</p>` : ''}
                ${crop.carbonFootprint ? `<p><strong>Carbon Footprint:</strong> ${crop.carbonFootprint}</p>` : ''}
            </div>
            <button onclick="deleteCrop('${crop._id}', event)">Delete</button>
        </div>
    `).join('');
}

async function deleteCrop(cropId, event) {
    event.stopPropagation();
    if (!confirm('Delete this crop?')) return;
    try {
        const response = await fetch(`/api/farmer/crops/${cropId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete crop');
        showMessage('Crop deleted successfully');
        loadCrops();
    } catch (err) {
        showMessage(err.message, true);
    }
}

// Orders section logic
async function loadOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    if (!ordersContainer) return;

    ordersContainer.innerHTML = '<p>Loading orders...</p>';

    try {
        const response = await fetch('/api/farmer/orders', {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to load orders');
        const orders = await response.json();
        renderOrders(orders);
    } catch (err) {
        ordersContainer.innerHTML = `<p class="error">${err.message} <button onclick="loadOrders()">Retry</button></p>`;
    }

    const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
    if (refreshOrdersBtn) {
        refreshOrdersBtn.addEventListener('click', loadOrders);
    }
}

function renderOrders(orders) {
    const ordersContainer = document.getElementById('ordersContainer');
    if (orders.length === 0) {
        ordersContainer.innerHTML = '<p>No orders yet.</p>';
        return;
    }
    ordersContainer.innerHTML = orders.map(order => {
        let actionButtons = '';
        if (order.status === 'Pending') {
            actionButtons = `
                <button class="btn-primary" onclick="updateOrderStatus('${order._id}', 'Accepted')">Accept</button>
                <button class="btn-secondary" onclick="updateOrderStatus('${order._id}', 'Rejected')">Reject</button>
            `;
        } else if (order.status === 'Accepted') {
            actionButtons = `
                <button class="btn-primary" onclick="updateOrderStatus('${order._id}', 'Pending Payment')">Request Payment</button>
            `;
        } else if (order.status === 'Pending Payment') {
            actionButtons = `
                <button class="btn-primary" onclick="showPaymentProof('${order._id}', '${order.orderNumber}')">Review Payment</button>
            `;
        } else if (order.status === 'Shipped') {
            actionButtons = `
                <button class="btn-primary" onclick="updateOrderStatus('${order._id}', 'Delivered')">Mark as Delivered</button>
            `;
        } else {
            actionButtons = `<p>Order ${order.status.toLowerCase()}</p>`;
        }

        return `
            <div class="order-card">
                <div class="order-info">
                    <h3>Order #${order.orderNumber}</h3>
                    <p><strong>Consumer:</strong> ${order.consumerId?.profile?.name || 'Unknown'}</p>
                    <p><strong>Items:</strong> ${order.items.map(item => `${item.name} (${item.quantity} kg)`).join(', ')}</p>
                    <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
                    <p><strong>Status:</strong> ${order.status || 'Pending'}</p>
                    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                    ${order.paymentProof ? `<img src="${order.paymentProof}" alt="Payment Proof" style="max-width: 200px;" onerror="this.style.display='none'">` : ''}
                </div>
                <div>
                    ${actionButtons}
                    <button class="btn-primary" onclick="loadOrderDetails('${order.orderNumber}')">View Details</button>
                </div>
            </div>
        `;
    }).join('');
}

async function loadOrderDetails(orderNumber) {
    contentSection.innerHTML = `
        <section class="order-details-section">
            <h2>Order Details</h2>
            <div id="orderDetailsContainer">
                <p>Loading order details...</p>
            </div>
        </section>
    `;

    try {
        const response = await fetch(`/api/farmer/orders?orderNumber=${orderNumber}`, {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to load order details');
        const orders = await response.json();
        const order = orders[0]; // Assuming orderNumber is unique

        const container = document.getElementById('orderDetailsContainer');
        let actionButtons = '';
        if (order.status === 'Pending') {
            actionButtons = `
                <button class="btn-primary" onclick="updateOrderStatus('${order._id}', 'Accepted')">Accept</button>
                <button class="btn-secondary" onclick="updateOrderStatus('${order._id}', 'Rejected')">Reject</button>
            `;
        } else if (order.status === 'Accepted') {
            actionButtons = `
                <button class="btn-primary" onclick="updateOrderStatus('${order._id}', 'Pending Payment')">Request Payment</button>
            `;
        } else if (order.status === 'Pending Payment') {
            actionButtons = `
                <button class="btn-primary" onclick="showPaymentProof('${order._id}', '${order.orderNumber}')">Review Payment</button>
            `;
        } else if (order.status === 'Shipped') {
            actionButtons = `
                <button class="btn-primary" onclick="updateOrderStatus('${order._id}', 'Delivered')">Mark as Delivered</button>
            `;
        } else {
            actionButtons = `<p>Order ${order.status.toLowerCase()}</p>`;
        }

        container.innerHTML = `
            <div class="order-card">
                <h3>Order #${order.orderNumber}</h3>
                <p><strong>Consumer:</strong> ${order.consumerId?.profile?.name || 'Unknown'}</p>
                <p><strong>Items:</strong> ${order.items.map(item => `${item.name} (${item.quantity} kg @ ₹${item.price}/kg)`).join(', ')}</p>
                <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Shipping Address:</strong> ${order.shippingAddress || 'Not provided'}</p>
                <p><strong>Payment Status:</strong> ${order.paymentStatus || 'Pending'}</p>
                ${order.paymentProof ? `<img src="${order.paymentProof}" alt="Payment Proof" style="max-width: 200px;" onerror="this.style.display='none'">` : ''}
                <div>${actionButtons}</div>
            </div>
        `;
    } catch (err) {
        document.getElementById('orderDetailsContainer').innerHTML = `<p class="error">${err.message} <button onclick="loadOrderDetails('${orderNumber}')">Retry</button></p>`;
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/farmer/orders/${orderId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include',
            body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to update order status');
        showMessage(`Order ${status.toLowerCase()} successfully`);
        loadOrders();
    } catch (err) {
        showMessage(err.message, true);
    }
}

function showPaymentProof(orderId, orderNumber) {
    fetch(`/api/farmer/orders?orderNumber=${orderNumber}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => response.json())
    .then(orders => {
        const order = orders[0];
        if (!order || !order.paymentProof) {
            showMessage('No payment proof available.', true);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Review Payment for Order #${orderNumber}</h2>
                <p>Total Amount: ₹${order.total.toFixed(2)}</p>
                <img src="${order.paymentProof}" alt="Payment Proof" style="max-width: 300px;" onerror="this.style.display='none'">
                <div>
                    <button class="btn-primary" onclick="verifyPayment('${orderId}', '${orderNumber}', true)">Verify Payment</button>
                    <button class="btn-secondary" onclick="verifyPayment('${orderId}', '${orderNumber}', false)">Reject Payment</button>
                </div>
                <button class="btn-secondary" onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
    })
    .catch(err => {
        showMessage(`Failed to load payment proof: ${err.message}`, true);
    });
}

async function verifyPayment(orderId, orderNumber, isVerified) {
    try {
        const newStatus = isVerified ? 'Shipped' : 'Pending Payment';
        const paymentStatus = isVerified ? 'Paid' : 'Failed';
        const response = await fetch(`/api/farmer/orders/${orderId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus, paymentStatus })
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to verify payment');
        showMessage(`Payment ${isVerified ? 'verified' : 'rejected'} successfully. Order status updated to ${newStatus.toLowerCase()}.`);
        document.querySelector('.modal.active').remove();
        loadOrders();
    } catch (err) {
        showMessage(err.message, true);
    }
}

// Chat section logic
let selectedContact = null;

function initChat() {
    loadContacts();
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

async function loadContacts() {
    const contactsContainer = document.getElementById('contactsContainer');
    try {
        const response = await fetch('/api/farmer/contacts', { 
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

// Logout logic
if (logoutBtn) {
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
}

// Utility function to show messages
function showMessage(text, isError = false) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.className = 'notification' + (isError ? ' error' : '');
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('role');
    if (role !== 'farmer') {
        window.location.href = '/login';
        return;
    }

    loadSidebarProfile();
    const initialSection = window.location.hash.replace('#', '') || 'orders';
    loadSection(initialSection);
    const activeBtn = document.querySelector(`.nav-btn[data-section="${initialSection}"]`) || document.getElementById('analyticsLink');
    if (activeBtn) {
        navButtons.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    socket.on('connect', () => {
        socket.userId = currentUserId;
        socket.emit('join', currentUserId);
        console.log('Farmer connected:', currentUserId);
    });

    socket.on('connect_error', (err) => {
        console.error('Farmer connection error:', err.message);
        if (err.message.includes('Authentication')) {
            alert('Authentication failed. Please log in again.');
            window.location.href = '/login';
        }
    });

    socket.on('newOrder', (data) => {
        showMessage(`New order received (Order #${data.orderId})`);
        loadOrders();
    });

    socket.on('orderUpdate', (data) => {
        showMessage(`Order #${data.orderId} status updated to ${data.status}`);
        loadOrders();
    });

    socket.on('newMessage', (message) => {
        if (selectedContact && (message.senderId._id === selectedContact._id || message.receiverId._id === selectedContact._id)) {
            renderMessages();
        }
    });
});

// Additional utility function for profit calculation
function calculateProfit() {
    const investment = parseFloat(document.getElementById('investment').value) || 0;
    const price = parseFloat(document.getElementById('price').value) || 0;
    const quantity = parseFloat(document.getElementById('quantityProduced').value) || 0;
    const profit = (price * quantity) - investment;
    const profitIndex = document.getElementById('profitIndex');
    if (profitIndex) {
        profitIndex.textContent = `Profit: ₹${profit.toFixed(2)} (${((profit / investment) * 100).toFixed(2)}%)`;
    }
}

// Toggle custom crop type input
function toggleCustomType() {
    const cropType = document.getElementById('cropType').value;
    const customCropType = document.getElementById('customCropType');
    customCropType.style.display = cropType === 'Custom' ? 'block' : 'none';
}