// TrackNDrop Role-Based Access Control

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const userString = localStorage.getItem('user');
  if (!userString) {
    // If not logged in and not on login page, redirect to login
    if (!window.location.href.includes('login.html') && 
        !window.location.href.includes('index.html') && 
        !window.location.href.includes('signup.html') &&
        !window.location.href.includes('track.html') &&
        !window.location.href.includes('credentials.html')) {
      window.location.href = 'login.html';
      return;
    }
  } else {
    // Parse user data
    const user = JSON.parse(userString);
    const userType = user.user_type || 'user';
    
    // Handle role-based access control for navigation
    const dashboardLink = document.querySelector('a[href="dashboard.html"]');
    const generateQRLink = document.querySelector('a[href="generate-qr.html"]');
    const profileIcon = document.querySelector('a[href="profile.html"] i.fas.fa-user-circle');
    
    // Hide dashboard for regular users
    if (userType === 'user') {
      if (dashboardLink) dashboardLink.style.display = 'none';
      if (generateQRLink) generateQRLink.style.display = 'none';
    }
    
    // Hide generate QR for delivery executive
    if (userType === 'delivery_executive') {
      if (generateQRLink) generateQRLink.style.display = 'none';
    }
    
    // Show profile icon for all logged-in users
    if (profileIcon) {
      profileIcon.parentElement.style.display = 'inline-block';
    }
    
    // Update logout/login link text
    const loginLogoutLink = document.querySelector('a[href="login.html"]');
    if (loginLogoutLink) {
      loginLogoutLink.textContent = 'Logout';
      loginLogoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        // Clear user data on logout
        localStorage.removeItem('user');
        window.location.href = 'login.html';
      });
    }
  }
});