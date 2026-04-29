// TrackNDrop Login JavaScript

// Note: API_BASE is already defined in script.js

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const loginSuccessOverlay = document.getElementById('loginSuccessOverlay');
  
  // Error message container
  const errorContainer = document.createElement('div');
  errorContainer.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4 hidden';
  errorContainer.id = 'errorContainer';
  errorContainer.innerHTML = '<span class="block sm:inline" id="errorMessage"></span>';
  loginForm.insertAdjacentElement('afterend', errorContainer);
  
  // Handle login form submission
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Hide any previous error messages
    errorContainer.classList.add('hidden');
    
    // Get form values
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const userType = document.querySelector('input[name="user_type"]:checked').value;
    
    // Basic validation
    if (!username || !password) {
      showError('Please enter both username and password');
      return;
    }
    
    try {
      // Send login request to API
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, user_type: userType })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle different error types
        if (response.status === 401) {
          showError('Invalid username or password');
        } else if (data.error) {
          showError(data.error);
        } else {
          showError('Login failed. Please try again.');
        }
        return;
      }
      
      // Login successful
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Show success overlay
      loginSuccessOverlay.classList.remove('hidden');
      loginSuccessOverlay.classList.add('flex');
      
      // Redirect based on user type after a short delay
      setTimeout(() => {
        switch (userType) {
          case 'admin':
            window.location.href = 'dashboard.html';
            break;
          case 'delivery_executive':
            window.location.href = 'boxes.html';
            break;
          case 'user':
          default:
            window.location.href = 'track.html';
            break;
        }
      }, 1500);
      
    } catch (error) {
      console.error('Login error:', error);
      showError('Network error. Please try again later.');
    }
  });
  
  // Function to display error messages
  function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
  }
});

// User credentials information
/*
Available user credentials:

1. Admin:
   - Username: admin
   - Password: admin123
   - Role: admin

2. Regular User:
   - Username: user1
   - Password: user123
   - Role: user

3. Delivery Executive:
   - Username: dex1
   - Password: dex123
   - Role: delivery_executive
*/