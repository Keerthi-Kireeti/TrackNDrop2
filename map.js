// --- Google Maps Integration ---
// Global variables for map, markers, and directions
let map;
let markers = [];
let directionsService;
let directionsRenderer;
let movementInterval;

// Handle Google Maps API loading errors
window.gm_authFailure = function() {
  const mapElement = document.getElementById('map');
  if (mapElement) {
    mapElement.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;background:#f8f9fa;"><i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i><h3 class="text-lg font-bold text-gray-800 mb-2">Google Maps could not load correctly</h3><p class="text-gray-600">There may be an issue with the API key or quota limits. Please try again later.</p></div>';
  }
  console.error('Google Maps authentication failed. Please check your API key and billing settings.');
};

// Add a timeout to detect if map fails to load
let mapLoadTimeout;

// Function to handle map loading errors
function handleMapLoadError() {
  const mapElement = document.getElementById('map');
  if (mapElement) {
    // Create a static map fallback using a static map image
    const staticMapHtml = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;background:#f8f9fa;">
        <div class="mb-4" style="width:100%;max-width:600px;height:300px;background-image:url('https://maps.googleapis.com/maps/api/staticmap?center=36.3728,-94.2088&zoom=8&size=600x300&maptype=roadmap&markers=color:red%7C36.3728,-94.2088&key=AIzaSyBNLrJhOMz6idD05pzfn5lhA-TAw-mAZCU');background-size:cover;background-position:center;border-radius:8px;"></div>
        <h3 class="text-lg font-bold text-gray-800 mb-2">Interactive Map could not be loaded</h3>
        <p class="text-gray-600 mb-4">Using static map instead. For full functionality, please check your internet connection.</p>
        <button id="retryMapBtn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Try Interactive Map</button>
      </div>
    `;
    
    mapElement.innerHTML = staticMapHtml;
    
    // Add retry button functionality
    const retryBtn = document.getElementById('retryMapBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function() {
        mapElement.innerHTML = '<div class="flex flex-col items-center justify-center h-full py-20"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div><p class="text-gray-600">Loading interactive map...</p></div>';
        
        // Reload the Google Maps script
        const script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBNLrJhOMz6idD05pzfn5lhA-TAw-mAZCU&callback=initMap&libraries=places';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      });
    }
    
    // Create a simple tracking simulation for the static map
    createStaticMapSimulation();
  }
}

// Create a simple tracking simulation for the static map
function createStaticMapSimulation() {
  // This function will simulate tracking functionality when the interactive map isn't available
  const trackInput = document.getElementById('trackingInput');
  const trackButton = document.getElementById('trackButton');
  const statusDiv = document.getElementById('statusDiv');
  
  if (!trackInput || !trackButton || !statusDiv) return;
  
  // Define the tracking request handler for static map
  const handleStaticTrackingRequest = () => {
    const trackingNo = trackInput.value.trim();
    if (!trackingNo) {
      statusDiv.innerHTML = '<div class="text-red-600 font-medium">Please enter a tracking number.</div>';
      return;
    }
    
    // Show loading state
    statusDiv.innerHTML = '<div class="flex justify-center"><i class="fas fa-spinner fa-spin text-blue-600 text-2xl"></i></div>';
    
    // Simulate tracking data (since we can't use the interactive map)
    setTimeout(() => {
      const mockData = {
        box: {
          box_id: trackingNo,
          status: 'In Transit',
          last_updated: new Date().toLocaleString()
        },
        history: [
          {
            action_type: 'check_in',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            location: 'Bentonville, AR',
            user_id: 'system'
          },
          {
            action_type: 'scan',
            timestamp: new Date(Date.now() - 43200000).toISOString(),
            location: 'Rogers, AR',
            user_id: 'system'
          },
          {
            action_type: 'check_out',
            timestamp: new Date().toISOString(),
            location: 'Fayetteville, AR',
            user_id: 'system'
          }
        ]
      };
      
      // Render status/history
      let historyHtml = '';
      if (mockData.history && mockData.history.length > 0) {
        // Sort history by timestamp (newest first)
        const sortedHistory = [...mockData.history].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        historyHtml = sortedHistory.map(event => {
          let icon = '<i class="fas fa-info-circle text-blue-600 mr-3 text-lg"></i>';
          if (event.action_type === 'check_in') icon = '<i class="fas fa-sign-in-alt text-blue-600 mr-3 text-lg"></i>';
          if (event.action_type === 'check_out') icon = '<i class="fas fa-sign-out-alt text-yellow-600 mr-3 text-lg"></i>';
          if (event.action_type === 'inspection') icon = '<i class="fas fa-tools text-yellow-600 mr-3 text-lg"></i>';
          if (event.action_type === 'retire') icon = '<i class="fas fa-times-circle text-red-600 mr-3 text-lg"></i>';
          if (event.action_type === 'scan') icon = '<i class="fas fa-qrcode text-green-600 mr-3 text-lg"></i>';
          
          return `<div class="flex items-center">
            ${icon}
            <p class="text-gray-700"><span class="font-medium">${new Date(event.timestamp).toLocaleString()}:</span> ${event.action_type.replace('_', ' ')}${event.location ? ' @ ' + event.location : ''}${event.user_id ? ' by ' + event.user_id : ''}</p>
          </div>`;
        }).join('');
      } else {
        historyHtml = '<div class="text-gray-500">No history available for this box.</div>';
      }
      
      statusDiv.innerHTML = historyHtml;
    }, 1500);
  };
  
  // Add event listener for tracking button
  trackButton.addEventListener('click', handleStaticTrackingRequest);
  
  // Add event listener for Enter key in tracking input
  trackInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleStaticTrackingRequest();
    }
  });
}

// Initialize the map
function initMap() {
  // Clear any existing timeout
  if (mapLoadTimeout) clearTimeout(mapLoadTimeout);
  
  // Set a timeout to detect if map fails to initialize
  mapLoadTimeout = setTimeout(handleMapLoadError, 10000); // 10 seconds timeout
  
  // Check if Google Maps API is loaded
  if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    console.error('Google Maps API not loaded');
    handleMapLoadError();
    return;
  }
  
  try {
    // Create map instance
    map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 36.3728, lng: -94.2088 }, // Walmart HQ as default center
    zoom: 8,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [
      // Custom map styles for better visibility in both light and dark modes
      { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
      { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#dadada' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
      { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] }
    ]
  });
  
  // Initialize directions service and renderer
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
    suppressMarkers: true, // We'll add custom markers
    polylineOptions: {
      strokeColor: '#0071ce', // Walmart blue
      strokeWeight: 5,
      strokeOpacity: 0.7
    }
  });
  
  // Add a button to recenter the map
  const centerControlDiv = document.createElement('div');
  const centerControl = createCenterControl();
  centerControlDiv.appendChild(centerControl);
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(centerControlDiv);
  
  // Check if there's a tracking number in the URL (for direct links)
  const urlParams = new URLSearchParams(window.location.search);
  const trackingNo = urlParams.get('tracking');
  if (trackingNo) {
    const trackInput = document.querySelector('input[type="text"]');
    if (trackInput) {
      trackInput.value = trackingNo;
      // Trigger tracking request
      const trackButton = document.querySelector('.bg-blue-600');
      if (trackButton) trackButton.click();
    }
  }
  
  // Initialize tracking functionality
  initializeTracking();
  
  // Clear the timeout since map loaded successfully
  clearTimeout(mapLoadTimeout);
  console.log('Google Maps loaded successfully');
  } catch (error) {
    console.error('Error initializing Google Maps:', error);
    handleMapLoadError();
  }
}

// Create a custom control to recenter the map
function createCenterControl() {
  const controlButton = document.createElement('button');
  controlButton.classList.add('custom-map-control-button');
  controlButton.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
  controlButton.title = 'Center Map';
  controlButton.type = 'button';
  
  controlButton.addEventListener('click', () => {
    if (markers.length > 0) {
      // Create bounds that include all markers
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(marker => bounds.extend(marker.getPosition()));
      map.fitBounds(bounds);
    } else {
      // Default to Walmart HQ if no markers
      map.setCenter({ lat: 36.3728, lng: -94.2088 });
      map.setZoom(8);
    }
  });
  
  return controlButton;
}

// Add a marker to the map
function addMarker(position, title, icon, zIndex = 1) {
  const marker = new google.maps.Marker({
    position: position,
    map: map,
    title: title,
    icon: icon,
    zIndex: zIndex,
    animation: google.maps.Animation.DROP
  });
  
  markers.push(marker);
  return marker;
}

// Clear all markers from the map
function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

// Generate waypoints for the route
function generateWaypoints(origin, destination) {
  // For demo purposes, we'll create a few waypoints between origin and destination
  // In a real implementation, these would come from your backend with actual tracking data
  const waypoints = [];
  const numPoints = 4;
  
  for (let i = 1; i <= numPoints; i++) {
    const lat = origin.lat + (destination.lat - origin.lat) * (i / (numPoints + 1));
    const lng = origin.lng + (destination.lng - origin.lng) * (i / (numPoints + 1));
    
    // Add some randomness to make it look more like a real route
    const latJitter = (Math.random() - 0.5) * 0.05;
    const lngJitter = (Math.random() - 0.5) * 0.05;
    
    waypoints.push({
      location: new google.maps.LatLng(lat + latJitter, lng + lngJitter),
      stopover: true
    });
  }
  
  return waypoints;
}

// Update map with tracking data
function updateMapWithTrackingData(data) {
  if (!map || !data.box) return;
  
  // Clear existing markers
  clearMarkers();
  
  // For demo purposes, we'll create a simulated route
  // In a real implementation, you would use actual coordinates from the tracking data
  
  // Simulate origin and destination based on history
  // In a real implementation, these would come from your backend
  const origin = { lat: 36.3728, lng: -94.2088 }; // Walmart HQ
  const destination = { lat: 36.0544, lng: -94.1642 }; // Fayetteville, AR
  
  // Add origin marker (green)
  addMarker(
    origin,
    'Origin',
    {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#008000',
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2
    },
    2
  );
  
  // Add destination marker (red)
  addMarker(
    destination,
    'Destination',
    {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#FF0000',
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2
    },
    2
  );
  
  // Generate waypoints for the route
  const waypoints = generateWaypoints(origin, destination);
  
  // Add current location marker (blue)
  // In a real implementation, this would be the most recent location from tracking data
  const currentLocation = waypoints.length > 0 ? 
    waypoints[Math.floor(waypoints.length / 2)].location : 
    new google.maps.LatLng(
      (origin.lat + destination.lat) / 2,
      (origin.lng + destination.lng) / 2
    );
  
  const currentMarker = addMarker(
    currentLocation,
    'Current Location',
    {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#0071ce', // Walmart blue
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2
    },
    3
  );
  
  // Add info window to current location marker
  const infoWindow = new google.maps.InfoWindow({
    content: `<div class="p-2">
      <h3 class="font-bold text-blue-800">Box ID: ${data.box.box_id}</h3>
      <p class="text-sm">Status: <span class="font-medium text-green-600">In Transit</span></p>
      <p class="text-sm">Last Updated: ${new Date().toLocaleString()}</p>
    </div>`
  });
  
  // Open info window when marker is clicked
  currentMarker.addListener('click', () => {
    infoWindow.open(map, currentMarker);
  });
  
  // Automatically open info window
  infoWindow.open(map, currentMarker);
  
  // Calculate and display route
  directionsService.route(
    {
      origin: new google.maps.LatLng(origin.lat, origin.lng),
      destination: new google.maps.LatLng(destination.lat, destination.lng),
      waypoints: waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING
    },
    (response, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(response);
        
        // Fit map to route bounds
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(origin.lat, origin.lng));
        bounds.extend(new google.maps.LatLng(destination.lat, destination.lng));
        waypoints.forEach(wp => bounds.extend(wp.location));
        map.fitBounds(bounds);
        
        // Simulate real-time movement along the route
        simulateMovement(response.routes[0].overview_path, currentMarker, infoWindow, data.box);
      } else {
        console.error('Directions request failed due to ' + status);
      }
    }
  );
}

// Simulate real-time movement along the route
function simulateMovement(path, marker, infoWindow, boxData) {
  // Clear any existing interval
  if (movementInterval) clearInterval(movementInterval);
  
  let currentIndex = 0;
  const pathLength = path.length;
  const speed = 1; // Lower is faster
  
  // Update marker position every 2 seconds
  movementInterval = setInterval(() => {
    // Move to next point
    currentIndex += 1;
    
    // If we've reached the end of the path, stop the simulation
    if (currentIndex >= pathLength) {
      clearInterval(movementInterval);
      return;
    }
    
    // Get the next position
    const position = path[currentIndex];
    
    // Update marker position with animation
    marker.setPosition(position);
    
    // Update info window content and position
    infoWindow.setContent(`<div class="p-2">
      <h3 class="font-bold text-blue-800">Box ID: ${boxData.box_id}</h3>
      <p class="text-sm">Status: <span class="font-medium text-green-600">In Transit</span></p>
      <p class="text-sm">Last Updated: ${new Date().toLocaleString()}</p>
      <p class="text-sm text-gray-600">Moving to destination...</p>
    </div>`);
    infoWindow.open(map, marker);
    
    // Calculate progress percentage
    const progress = Math.round((currentIndex / pathLength) * 100);
    
    // Update status message if needed
    const statusDiv = document.getElementById('statusDiv');
    if (statusDiv && progress % 20 === 0) { // Update status at 0%, 20%, 40%, 60%, 80%, 100%
      const progressUpdate = `<div class="flex items-center">
        <i class="fas fa-truck text-blue-600 mr-3 text-lg"></i>
        <p class="text-gray-700"><span class="font-medium">${new Date().toLocaleString()}:</span> Package is ${progress}% of the way to destination</p>
      </div>`;
      
      // Add to the beginning of the status updates
      statusDiv.innerHTML = progressUpdate + statusDiv.innerHTML;
    }
  }, 2000 * speed);
}

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
    const API_BASE = 'http://localhost:3000/api';
    fetch(`${API_BASE}/track/${trackingNo}`)
      .then(res => res.json())
      .then(data => {
        if (!data.box) {
          statusDiv.innerHTML = '<div class="text-red-600 font-medium">Box not found. Please check the tracking number.</div>';
          return;
        }
        
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
            
            return `<div class="flex items-center">
              ${icon}
              <p class="text-gray-700"><span class="font-medium">${new Date(event.timestamp).toLocaleString()}:</span> ${event.action_type.replace('_', ' ')}${event.location ? ' @ ' + event.location : ''}${event.user_id ? ' by ' + event.user_id : ''}</p>
            </div>`;
          }).join('');
        } else {
          historyHtml = '<div class="text-gray-500">No history available for this box.</div>';
        }
        
        statusDiv.innerHTML = historyHtml;
        
        // Update map with tracking data
        updateMapWithTrackingData(data);
      })
      .catch(error => {
        console.error('Tracking error:', error);
        statusDiv.innerHTML = '<div class="text-red-600">Error fetching tracking information. Please try again.</div>';
      });
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
  
  // Focus the input field when page loads
  trackInput.focus();
}