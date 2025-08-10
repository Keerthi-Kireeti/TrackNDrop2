// TrackNDrop Alerts JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Tab switching functionality
  const alertTabs = document.querySelectorAll('.alert-tab');
  const alertContents = document.querySelectorAll('.alert-content');
  
  alertTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Remove active class from all tabs
      alertTabs.forEach(t => {
        t.classList.remove('border-blue-500', 'text-blue-600');
        t.classList.add('text-gray-500');
      });
      
      // Add active class to clicked tab
      this.classList.add('border-blue-500', 'text-blue-600');
      this.classList.remove('text-gray-500');
      
      // Hide all content sections
      alertContents.forEach(content => {
        content.classList.add('hidden');
      });
      
      // Show the corresponding content section
      const tabType = this.getAttribute('data-tab');
      const contentToShow = document.getElementById(`${tabType}-alerts`);
      if (contentToShow) {
        contentToShow.classList.remove('hidden');
      }
    });
  });
  
  // Close notification functionality
  const closeButtons = document.querySelectorAll('.close-notification');
  
  closeButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Find the parent notification element and remove it
      const notification = this.closest('.flex.items-start');
      if (notification) {
        notification.remove();
      }
    });
  });
});