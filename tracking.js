// TrackNDrop Tracking JavaScript
// This file handles tracking functionality without map integration

// Use the API_BASE from script.js

// Initialize tracking functionality
function initializeTracking() {
  const trackInput = document.getElementById('trackingInput');
  const trackButton = document.getElementById('trackButton');
  const statusDiv = document.getElementById('statusDiv');
  
  if (!trackInput || !trackButton || !statusDiv) return;
  
  // Define the tracking request handler
  const handleTrackingRequest = () => {
    const trackingNo = trackInput.value.trim();
    if (!trackingNo) {
      statusDiv.innerHTML = '<div class="text-red-600 font-medium">Please enter a tracking number.</div>';
      return;
    }
    
    // Show loading state
    statusDiv.innerHTML = '<div class="flex justify-center"><i class="fas fa-spinner fa-spin text-blue-600 text-2xl"></i></div>';
    
    // Fetch tracking data from API
    // For demo purposes, we'll simulate the API response
    // In a real implementation, you would use fetch() to get data from your backend
    setTimeout(() => {
      // Simulate API response
      const data = simulateTrackingData(trackingNo);
      
      if (!data.box) {
        statusDiv.innerHTML = '<div class="text-red-600 font-medium">Box not found. Please check the tracking number.</div>';
        return;
      }
      
      // Render box details
      const boxDetailsHtml = `
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <h4 class="font-bold text-blue-800 text-lg mb-2">Box Details</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p class="text-sm text-gray-600">Box ID:</p>
              <p class="font-medium">${data.box.box_id}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Status:</p>
              <p class="font-medium text-green-600">${data.box.status}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Last Updated:</p>
              <p class="font-medium">${data.box.last_updated}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Current Location:</p>
              <p class="font-medium">${data.box.current_location || 'In Transit'}</p>
            </div>
          </div>
        </div>
      `;
      
      // Render status/history
      let historyHtml = '';
      if (data.history && data.history.length > 0) {
        // Sort history by timestamp (newest first)
        const sortedHistory = [...data.history].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        historyHtml = sortedHistory.map(event => {
          let icon = '<i class="fas fa-info-circle text-blue-600 mr-3 text-lg"></i>';
          if (event.action_type === 'check_in') icon = '<i class="fas fa-sign-in-alt text-blue-600 mr-3 text-lg"></i>';
          if (event.action_type === 'check_out') icon = '<i class="fas fa-sign-out-alt text-yellow-600 mr-3 text-lg"></i>';
          if (event.action_type === 'inspection') icon = '<i class="fas fa-tools text-yellow-600 mr-3 text-lg"></i>';
          if (event.action_type === 'retire') icon = '<i class="fas fa-times-circle text-red-600 mr-3 text-lg"></i>';
          if (event.action_type === 'scan') icon = '<i class="fas fa-qrcode text-green-600 mr-3 text-lg"></i>';
          
          return `<div class="flex items-center p-2 ${event === sortedHistory[0] ? 'bg-blue-50 rounded' : ''}">
            ${icon}
            <div>
              <p class="text-gray-700"><span class="font-medium">${new Date(event.timestamp).toLocaleString()}:</span> ${event.action_type.replace('_', ' ')}</p>
              ${event.location ? `<p class="text-sm text-gray-600 ml-6">Location: ${event.location}</p>` : ''}
              ${event.user_id ? `<p class="text-sm text-gray-600 ml-6">By: ${event.user_id}</p>` : ''}
            </div>
          </div>`;
        }).join('');
      } else {
        historyHtml = '<div class="text-gray-500 p-4">No history available for this box.</div>';
      }
      
      // Combine box details and history
      statusDiv.innerHTML = boxDetailsHtml + 
        '<h4 class="font-bold text-blue-800 text-lg mt-6 mb-2">Tracking History</h4>' + 
        '<div class="space-y-3 bg-gray-50 p-2 rounded-lg border border-gray-200">' + 
        historyHtml + 
        '</div>';
      
    }, 1500); // Simulate network delay
  };
  
  // Add event listener for tracking button
  trackButton.addEventListener('click', handleTrackingRequest);
  
  // Add event listener for Enter key in tracking input
  trackInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleTrackingRequest();
    }
  });
  
  // Check if there's a tracking number in the URL (for direct links)
  const urlParams = new URLSearchParams(window.location.search);
  const trackingNo = urlParams.get('tracking');
  if (trackingNo) {
    trackInput.value = trackingNo;
    // Trigger tracking request
    handleTrackingRequest();
  }
  
  // Focus the input field when page loads
  trackInput.focus();
}

// Simulate tracking data for demo purposes
function simulateTrackingData(trackingNo) {
  // In a real implementation, this data would come from your backend API
  return {
    box: {
      box_id: trackingNo,
      status: 'In Transit',
      last_updated: new Date().toLocaleString(),
      current_location: 'Rogers, AR'
    },
    history: [
      {
        action_type: 'check_in',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        location: 'Bentonville, AR',
        user_id: 'system'
      },
      {
        action_type: 'scan',
        timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        location: 'Rogers, AR',
        user_id: 'system'
      },
      {
        action_type: 'check_out',
        timestamp: new Date().toISOString(), // now
        location: 'Fayetteville, AR',
        user_id: 'system'
      }
    ]
  };
}

// Initialize tracking when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeTracking();
});