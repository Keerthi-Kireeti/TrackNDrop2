// TrackNDrop Main JavaScript

// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Apply theme based on user preference
document.addEventListener('DOMContentLoaded', function() {
  // Apply theme based on user preference
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.toggle('dark', currentTheme === 'dark');
  
  // Theme toggle functionality for existing toggle buttons
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
  
  console.log('script.js loaded - tracking functionality handled by tracking.js');
});
