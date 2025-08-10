// TrackNDrop Settings JavaScript

// Default values for lifecycle thresholds
const defaultSettings = {
  plastic_max_cycles: 150,
  plastic_inspection_threshold: 135,
  metal_max_cycles: 200,
  metal_inspection_threshold: 180,
  wooden_max_cycles: 100,
  wooden_inspection_threshold: 90
};

// Animation for button click
function animateButton(button) {
  button.classList.add('animate-pulse', 'scale-105');
  setTimeout(() => {
    button.classList.remove('animate-pulse', 'scale-105');
  }, 500);
}

// Show notification popup
function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-500 ease-in-out z-50 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;
  notification.innerHTML = `
    <div class="flex items-center">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.add('translate-y-2');
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('opacity-0');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
  // Apply theme based on user preference
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.toggle('dark', currentTheme === 'dark');
  
  // Load saved settings or use defaults
  function loadSettings() {
    const inputs = document.querySelectorAll('[data-setting-key]');
    inputs.forEach(input => {
      const key = input.getAttribute('data-setting-key');
      const savedValue = localStorage.getItem(key);
      if (savedValue) {
        input.value = savedValue;
      } else if (defaultSettings[key]) {
        input.value = defaultSettings[key];
      }
    });
  }
  
  // Load settings on page load
  loadSettings();
  
  // Action buttons for each material type
  const actionButtons = document.querySelectorAll('[data-action]');
  actionButtons.forEach(button => {
    button.addEventListener('click', function() {
      const action = this.getAttribute('data-action');
      const type = this.getAttribute('data-type');
      
      if (action === 'save') {
        // Save settings for this material type
        const maxCyclesInput = document.querySelector(`[data-setting-key="${type}_max_cycles"]`);
        const inspectionThresholdInput = document.querySelector(`[data-setting-key="${type}_inspection_threshold"]`);
        
        if (maxCyclesInput && inspectionThresholdInput) {
          localStorage.setItem(`${type}_max_cycles`, maxCyclesInput.value);
          localStorage.setItem(`${type}_inspection_threshold`, inspectionThresholdInput.value);
          
          // Animate button
          animateButton(this);
          
          // Show notification
          showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} settings saved successfully!`);
        }
      } else if (action === 'reset') {
        // Reset settings for this material type
        const maxCyclesInput = document.querySelector(`[data-setting-key="${type}_max_cycles"]`);
        const inspectionThresholdInput = document.querySelector(`[data-setting-key="${type}_inspection_threshold"]`);
        
        if (maxCyclesInput && inspectionThresholdInput) {
          maxCyclesInput.value = defaultSettings[`${type}_max_cycles`];
          inspectionThresholdInput.value = defaultSettings[`${type}_inspection_threshold`];
          
          // Remove from localStorage
          localStorage.removeItem(`${type}_max_cycles`);
          localStorage.removeItem(`${type}_inspection_threshold`);
          
          // Animate button
          animateButton(this);
          
          // Show notification
          showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} settings reset to defaults!`);
        }
      }
    });
  });
  
  // Save All Settings Button
  const saveAllSettingsBtn = document.getElementById('saveAllSettingsBtn');
  if (saveAllSettingsBtn) {
    saveAllSettingsBtn.addEventListener('click', function() {
      // Save all settings
      const inputs = document.querySelectorAll('[data-setting-key]');
      inputs.forEach(input => {
        const key = input.getAttribute('data-setting-key');
        localStorage.setItem(key, input.value);
      });
      
      // Animate button
      animateButton(this);
      
      // Show notification
      showNotification('All settings saved successfully!');
    });
  }
  
  // Reset All Settings Button
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', function() {
      // Reset all settings to defaults
      const inputs = document.querySelectorAll('[data-setting-key]');
      inputs.forEach(input => {
        const key = input.getAttribute('data-setting-key');
        if (defaultSettings[key]) {
          input.value = defaultSettings[key];
          localStorage.removeItem(key);
        }
      });
      
      // Animate button
      animateButton(this);
      
      // Show notification
      showNotification('All settings reset to defaults!');
    });
  }
});