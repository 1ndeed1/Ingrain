// DOM Elements
const contentSection = document.getElementById('content');
const navButtons = document.querySelectorAll('.nav-btn');
const logoutBtn = document.getElementById('logoutBtn');
const profilePhoto = document.getElementById('profilePhoto');
const profileName = document.getElementById('profileName');

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
            <h2>Your Listed Crops</h2>
            <div id="cropContainer">
                <p id="loadingMessage">Loading your crops...</p>
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
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/farmer/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
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
    }
}

// Handle section switching
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const section = button.dataset.section;
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        loadSection(section);
    });
});

function loadSection(section) {
    if (section === 'profile') {
        contentSection.innerHTML = profileTemplate;
        loadProfile();
    } else if (section === 'crops') {
        contentSection.innerHTML = cropsTemplate;
        initCropSection();
    } else if (section === 'orders') {
        contentSection.innerHTML = placeholderTemplate('Orders');
    } else if (section === 'analytics') {
        contentSection.innerHTML = placeholderTemplate('Analytics');
    } else if (section === 'messages') {
        contentSection.innerHTML = placeholderTemplate('Messages');
    }
}

// Profile logic
async function loadProfile() {
    const token = localStorage.getItem('token');
    const profileDataDiv = document.getElementById('profileData');
    
    try {
        const response = await fetch('/api/farmer/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load profile');
        }
        const profile = await response.json();
        
        if (!profile.isProfileComplete) {
            profileDataDiv.innerHTML = '<p>Please complete your profile <a href="/farmer/profile/profile.html">here</a>.</p>';
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
            <button class="btn-primary" onclick="window.location.href='/farmer/profile/profile.html'">Edit Profile</button>
        `;
    } catch (err) {
        profileDataDiv.innerHTML = `<p class="error">${err.message}</p>`;
        if (err.message.includes('token')) {
            setTimeout(() => window.location.href = '/login', 2000);
        }
    }
}

// Crop section logic
function initCropSection() {
    const addCropForm = document.getElementById('addCropForm');
    const toggleDetailsBtn = document.getElementById('toggleDetails');
    const optionalFields = document.getElementById('optionalFields');

    toggleDetailsBtn.addEventListener('click', () => {
        optionalFields.style.display = optionalFields.style.display === 'none' ? 'block' : 'none';
        toggleDetailsBtn.textContent = optionalFields.style.display === 'none' ? 'More Details' : 'Hide Details';
    });

    addCropForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
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
                headers: { 'Authorization': `Bearer ${token}` },
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

    loadCrops();
}

async function loadCrops() {
    const token = localStorage.getItem('token');
    document.getElementById('loadingMessage').style.display = 'block';
    const cropContainer = document.getElementById('cropContainer');
    cropContainer.innerHTML = '';

    try {
        const response = await fetch('/api/farmer/crops', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to load crops');
        const crops = await response.json();
        renderCrops(crops);
    } catch (err) {
        cropContainer.innerHTML = `<p class="error">${err.message}</p>`;
    } finally {
        document.getElementById('loadingMessage').style.display = 'none';
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
                <p><strong>Quantity:</strong> ${crop.quantityProduced} kg</p>
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
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/farmer/crops/${cropId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete crop');
        showMessage('Crop deleted successfully');
        loadCrops();
    } catch (err) {
        showMessage(err.message, true);
    }
}

function calculateProfit() {
    const investment = parseFloat(document.getElementById('investment').value) || 0;
    const price = parseFloat(document.getElementById('price').value) || 0;
    const quantity = parseFloat(document.getElementById('quantityProduced').value) || 0;
    const profitIndexEl = document.getElementById('profitIndex');
    if (investment && price && quantity) {
        const revenue = price * quantity;
        const profitIndex = (revenue / investment).toFixed(2);
        profitIndexEl.textContent = `Profit Index: ${profitIndex}`;
    } else {
        profitIndexEl.textContent = '';
    }
}

function toggleCustomType() {
    const cropType = document.getElementById('cropType').value;
    const customInput = document.getElementById('customCropType');
    customInput.style.display = cropType === 'Custom' ? 'block' : 'none';
}

function showMessage(text, isError = false) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.className = 'notification' + (isError ? ' error' : '');
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

// Validate token on load
async function validateToken() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'farmer') {
        showMessage('Please log in as a farmer', true);
        setTimeout(() => window.location.href = '/login', 2000);
        return false;
    }

    try {
        const response = await fetch('/api/farmer/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        return true;
    } catch (err) {
        showMessage('Session expired, please log in again', true);
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setTimeout(() => window.location.href = '/login', 2000);
        return false;
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    const isValid = await validateToken();
    if (!isValid) return;

    // Load sidebar profile data
    loadSidebarProfile();

    // Default to crops section
    loadSection('crops');
    navButtons[1].classList.add('active');
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
});