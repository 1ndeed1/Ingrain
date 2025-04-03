// public/farmer/profile.js
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Profile page loaded');
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'farmer') {
        console.log('No token or incorrect role, redirecting to login');
        window.location.href = '/login';
        return;
    }

    // Check profile status and pre-fill form if it exists
    console.log('Checking profile status...');
    try {
        const response = await fetch('/api/farmer/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Profile check response:', response.status, response.statusText);
        if (!response.ok) {
            throw new Error(`Profile check failed: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Profile data:', data);

        // Pre-fill the form with existing data if profile is complete
        if (data.isProfileComplete) {
            document.getElementById('name').value = data.name || '';
            document.getElementById('farmName').value = data.farmName || '';
            document.getElementById('location').value = data.location || '';
            document.getElementById('bio').value = data.bio || '';
            document.getElementById('contactNumber').value = data.contactNumber || '';
            // Display the current profile picture
            if (data.profilePicture) {
                document.getElementById('currentImage').src = data.profilePicture;
            }
        }
    } catch (err) {
        console.error('Error checking profile:', err);
        alert('Error checking profile status: ' + err.message);
        return;
    }

    // Handle profile form submission
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            const response = await fetch('/api/farmer/profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to save profile');

            console.log('Profile saved, redirecting to /farmer/farmer.html');
            alert('Profile saved successfully!');
            window.location.href = '/farmer/farmer.html';
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('Failed to save profile: ' + err.message);
        }
    });

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', () => {
        console.log('Logging out, redirecting to /login');
        localStorage.clear();
        window.location.href = '/login';
    });
});