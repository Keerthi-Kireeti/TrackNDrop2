// Theme Fix Script - Updated for Black/Grey/Light Grey Dark Mode

// This script will be used to diagnose and fix theme issues

// Function to check theme status
function checkThemeStatus() {
  const currentTheme = localStorage.getItem('theme');
  console.log('Current theme in localStorage:', currentTheme);
  console.log('Dark class on document.documentElement:', document.documentElement.classList.contains('dark'));
  console.log('Dark class on body:', document.body.classList.contains('dark'));
  
  // Check if the theme is applied correctly
  const isDarkThemeApplied = document.documentElement.classList.contains('dark');
  const isDarkThemeStored = currentTheme === 'dark';
  
  if (isDarkThemeStored !== isDarkThemeApplied) {
    console.log('Theme mismatch detected! Fixing...');
    document.documentElement.classList.toggle('dark', isDarkThemeStored);
    document.body.classList.toggle('dark', isDarkThemeStored);
    console.log('Theme fixed. Dark mode is now:', document.documentElement.classList.contains('dark'));
  } else {
    console.log('Theme is applied correctly.');
  }
  
  // Apply immediate styles for dark mode
  if (isDarkThemeStored) {
    document.documentElement.style.colorScheme = 'dark';
    document.body.style.backgroundColor = '#000000';
    document.body.style.color = '#d1d5db';
  } else {
    document.documentElement.style.colorScheme = 'light';
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  }
  
  return {
    storedTheme: currentTheme,
    appliedTheme: isDarkThemeApplied ? 'dark' : 'light'
  };
}

// Function to force theme
function forceTheme(theme) {
  if (theme !== 'dark' && theme !== 'light') {
    console.error('Invalid theme. Use "dark" or "light"');
    return false;
  }
  
  localStorage.setItem('theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.body.classList.toggle('dark', theme === 'dark');
  
  // Apply immediate styles
  if (theme === 'dark') {
    document.documentElement.style.colorScheme = 'dark';
    document.body.style.backgroundColor = '#000000';
    document.body.style.color = '#d1d5db';
  } else {
    document.documentElement.style.colorScheme = 'light';
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  }
  
  console.log(`Theme forced to ${theme}`);
  return true;
}

// Function to reset theme
function resetTheme() {
  localStorage.removeItem('theme');
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('dark');
  document.documentElement.style.colorScheme = 'light';
  document.body.style.backgroundColor = '';
  document.body.style.color = '';
  console.log('Theme reset to default (light)');
  return true;
}

// Function to apply dark mode styles to all elements
function applyDarkModeStyles() {
  if (!document.documentElement.classList.contains('dark')) {
    return;
  }
  
  // Apply to common elements that might not be covered by CSS
  const elements = document.querySelectorAll('*');
  elements.forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    
    // Check if element has background color that needs to be changed
    if (computedStyle.backgroundColor && 
        (computedStyle.backgroundColor.includes('rgb(255, 255, 255)') || 
         computedStyle.backgroundColor.includes('white'))) {
      element.style.backgroundColor = '#111111';
    }
    
    // Check if element has text color that needs to be changed
    if (computedStyle.color && 
        (computedStyle.color.includes('rgb(0, 0, 0)') || 
         computedStyle.color.includes('black'))) {
      element.style.color = '#d1d5db';
    }
  });
  
  console.log('Dark mode styles applied to all elements');
}

// Make functions available globally
window.themeTools = {
  check: checkThemeStatus,
  force: forceTheme,
  reset: resetTheme,
  applyStyles: applyDarkModeStyles
};

// Run a check when the script loads
console.log('Theme Fix Script loaded - Black/Grey/Light Grey Dark Mode');
console.log('Use the following commands in the console to manage themes:');
console.log('- themeTools.check() - Check current theme status');
console.log('- themeTools.force("dark") or themeTools.force("light") - Force a specific theme');
console.log('- themeTools.reset() - Reset theme to default');
console.log('- themeTools.applyStyles() - Apply dark mode styles to all elements');

// Auto-run check
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    console.log('Auto-checking theme status:');
    checkThemeStatus();
    
    // Apply styles if in dark mode
    if (document.documentElement.classList.contains('dark')) {
      applyDarkModeStyles();
    }
  }, 1000); // Delay to ensure other scripts have run
});