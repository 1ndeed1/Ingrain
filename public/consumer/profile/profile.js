document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileDisplay = document.getElementById('profileDisplay');

    loadProfile();

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(profileForm);
        try {
            const response = await fetch('/api/consumer/profile', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to save profile');
            const data = await response.json();
            alert(data.message);
            loadProfile();
        } catch (err) {
            alert('Error: ' + err.message);
            if (err.message.includes('token') || err.message.includes('Authentication')) {
                window.location.href = '/login';
            }
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
    try {
        const response = await fetch('/api/consumer/profile', {
            credentials: 'include'
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to load profile');
        const profile = await response.json();
        if (profile.isProfileComplete) {
            profileDisplay.innerHTML = `
                <div class="profile-photo-large">
                    <img src="${profile.profilePicture || '/uploads/default.jpg'}" alt="Profile Photo">
                </div>
                <p><strong>Name:</strong> ${profile.name}</p>
                <p><strong>Bio:</strong> ${profile.bio || 'Not provided'}</p>
                <p><strong>Contact Number:</strong> ${profile.contactNumber || 'Not provided'}</p>
            `;
            document.getElementById('name').value = profile.name || '';
            document.getElementById('bio').value = profile.bio || '';
            document.getElementById('contactNumber').value = profile.contactNumber || '';
        } else {
            profileDisplay.innerHTML = '<p>Please complete your profile above.</p>';
        }
    } catch (err) {
        profileDisplay.innerHTML = `<p class="error">${err.message}</p>`;
        if (err.message.includes('token') || err.message.includes('Authentication')) {
            window.location.href = '/login';
        }
    }
}