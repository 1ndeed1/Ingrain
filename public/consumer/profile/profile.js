document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');

    const profileForm = document.getElementById('profileForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileDisplay = document.getElementById('profileDisplay');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    console.log('profileForm:', profileForm);
    console.log('logoutBtn:', logoutBtn);
    console.log('profileDisplay:', profileDisplay);
    console.log('editProfileBtn:', editProfileBtn);
    console.log('cancelBtn:', cancelBtn);

    if (!profileForm || !logoutBtn || !profileDisplay || !editProfileBtn || !cancelBtn) {
        console.error('One or more elements are missing. Check HTML IDs.');
        profileDisplay.innerHTML = '<p class="error">Page setup error. Please refresh.</p>';
        return;
    }

    loadProfile();

    editProfileBtn.addEventListener('click', () => {
        console.log('Edit Profile clicked');
        profileDisplay.classList.add('hidden');
        editProfileBtn.classList.add('hidden');
        profileForm.classList.remove('hidden');
        prefillForm(window.currentProfile);
    });

    cancelBtn.addEventListener('click', () => {
        console.log('Cancel clicked');
        profileForm.classList.add('hidden');
        profileDisplay.classList.remove('hidden');
        editProfileBtn.classList.remove('hidden');
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const formData = new FormData(profileForm);
        console.log('Form data being sent:', Object.fromEntries(formData)); // Log form data

        try {
            const response = await fetch('/api/consumer/profile', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save profile');
            console.log('Profile saved:', data);
            alert(data.message);
            window.location.href = '/consumer';
        } catch (err) {
            console.error('Save error:', err);
            alert('Error: ' + err.message);
            if (err.message.includes('token') || err.message.includes('Authentication')) {
                window.location.href = '/login';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save Changes';
        }
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
        window.location.href = '/login';
    });
});

async function loadProfile() {
    const profileDisplay = document.getElementById('profileDisplay');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const profileForm = document.getElementById('profileForm');

    profileDisplay.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading profile...</p>';

    try {
        const response = await fetch('/api/consumer/profile', {
            credentials: 'include'
        });
        const profile = await response.json();
        if (!response.ok) throw new Error(profile.error || 'Failed to load profile');
        console.log('Loaded profile:', profile);
        window.currentProfile = profile || {};

        if (profile.isProfileComplete) {
            profileDisplay.innerHTML = `
                <div class="profile-photo-large">
                    <img src="${profile.profilePicture || '/uploads/default.jpg'}" alt="Profile Photo">
                </div>
                <h3 class="profile-name">${profile.name || 'Unnamed'}</h3>
                <p class="profile-detail"><strong>Date of Birth:</strong> ${profile.dob ? new Date(profile.dob).toLocaleDateString() : 'Not set'}</p>
                <p class="profile-detail"><strong>Address:</strong> ${profile.address || 'Not provided'}</p>
            `;
            profileDisplay.classList.remove('hidden');
            editProfileBtn.classList.remove('hidden');
            profileForm.classList.add('hidden');
        } else {
            profileDisplay.innerHTML = '<p class="prompt">Please complete your profile to continue.</p>';
            profileDisplay.classList.remove('hidden');
            editProfileBtn.classList.add('hidden');
            profileForm.classList.remove('hidden');
            prefillForm(profile);
        }
    } catch (err) {
        console.error('Load error:', err);
        profileDisplay.innerHTML = `<p class="error">${err.message}</p>`;
        editProfileBtn.classList.add('hidden');
        profileForm.classList.remove('hidden');
        prefillForm({});
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            window.location.href = '/login';
        }
    }
}

function prefillForm(profile) {
    console.log('Prefilling form with:', profile);
    const nameInput = document.getElementById('name');
    const dobInput = document.getElementById('dob');
    const addressInput = document.getElementById('address');
    const profilePictureInput = document.getElementById('profilePicture');

    if (!nameInput || !dobInput || !addressInput || !profilePictureInput) {
        console.error('Form inputs missing');
        return;
    }

    nameInput.value = profile.name || '';
    dobInput.value = profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : '';
    addressInput.value = profile.address || '';
}