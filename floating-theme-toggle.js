// Floating Theme Toggle Button

document.addEventListener('DOMContentLoaded', function() {
  // Ensure theme is properly initialized
  initializeTheme();
  
  // Create floating theme toggle button
  const floatingToggle = document.createElement('button');
  floatingToggle.id = 'floatingThemeToggle';
  floatingToggle.className = 'floating-theme-toggle';
  
  // Set initial icon based on current theme
  const currentTheme = localStorage.getItem('theme') || 'light';
  floatingToggle.innerHTML = currentTheme === 'dark' ? 
    '<i class="fas fa-sun"></i>' : 
    '<i class="fas fa-moon"></i>';
  
  // Add event listener for theme toggle
  floatingToggle.addEventListener('click', function() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    this.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    
    // Force a repaint to ensure all styles are applied
    document.body.offsetHeight;
    
    // Apply theme to body as well for compatibility
    document.body.classList.toggle('dark', isDark);
    
    // Update color scheme
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    
    console.log('Theme switched to:', isDark ? 'dark' : 'light');
  });
  
  // Append to body
  document.body.appendChild(floatingToggle);
});

// Function to initialize theme properly
function initializeTheme() {
  const currentTheme = localStorage.getItem('theme') || 'light';
  const isDark = currentTheme === 'dark';
  
  // Apply theme to document element
  document.documentElement.classList.toggle('dark', isDark);
  
  // Ensure body also has the theme class for compatibility
  document.body.classList.toggle('dark', isDark);
  
  // Force immediate style application
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  
  // Apply dark mode styles immediately
  if (isDark) {
    document.body.style.backgroundColor = '#000000';
    document.body.style.color = '#d1d5db';
  } else {
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  }
  
  // Log theme status for debugging
  console.log('Theme initialized:', currentTheme);
  console.log('Dark class applied:', document.documentElement.classList.contains('dark'));
  console.log('Body dark class:', document.body.classList.contains('dark'));
}