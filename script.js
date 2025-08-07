document.addEventListener('DOMContentLoaded', () => {
// QR Scanner Implementation
let html5QrCode;

document.addEventListener('DOMContentLoaded', () => {
  const startScannerBtn = document.getElementById('startScanner');
  const scannerResultDiv = document.getElementById('scannerResult');
  const closeScannerBtn = document.getElementById('closeScanner');
  const reader = document.getElementById('reader');

  if (startScannerBtn) {
    startScannerBtn.addEventListener('click', () => {
      startScannerBtn.disabled = true;
      startScannerBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Starting Scanner...';
      
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: 250
        },
        (decodedText) => {
          // Handle successful scan
          processScannedData(decodedText);
          scannerResultDiv.classList.remove('hidden');
          startScannerBtn.classList.add('hidden');
          html5QrCode.stop();
        },
        (errorMessage) => {
          console.warn(`QR Code scan error: ${errorMessage}`);
          startScannerBtn.disabled = false;
          startScannerBtn.innerHTML = '<i class="fas fa-camera mr-2"></i> Start Scanner';
        }
      ).catch(err => {
        console.error(`Unable to start scanning: ${err}`);
        startScannerBtn.disabled = false;
        startScannerBtn.innerHTML = '<i class="fas fa-camera mr-2"></i> Start Scanner';
        alert("Failed to access camera. Please ensure camera permissions are granted.");
      });
    });

    if (closeScannerBtn) {
      closeScannerBtn.addEventListener('click', () => {
        scannerResultDiv.classList.add('hidden');
        startScannerBtn.classList.remove('hidden');
        startScannerBtn.disabled = false;
        startScannerBtn.innerHTML = '<i class="fas fa-camera mr-2"></i> Start Scanner';
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop();
        }
      });
    }
  }
});

// --- Backend API base URL ---
const API_BASE = 'http://localhost:3000/api';
console.log('API_BASE set to:', API_BASE);

// --- Login Page Integration ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const userType = document.querySelector('input[name="user_type"]:checked')?.value || 'user';
    if (!username || !password) {
      alert('Please enter both username and password.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, user_type: userType })
      });
      const data = await res.json();
      if (res.ok) {
        // Optionally store user info in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      alert('Server error. Please try again.');
    }
  });
}

// --- Dashboard Stats Integration ---
const usageChartElement = document.getElementById('usageChart');
const turnoverChartElement = document.getElementById('turnoverChart');
if (usageChartElement && turnoverChartElement) {
  fetch(`${API_BASE}/dashboard/stats`).then(res => res.json()).then(stats => {
    // Usage Chart
    const usageCtx = usageChartElement.getContext('2d');
    new Chart(usageCtx, {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Needs Inspection', 'End of Life'],
        datasets: [{
          data: stats.usage_chart,
          backgroundColor: ['#3B82F6', '#FBBF24', '#EF4444'],
          hoverOffset: 4
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
    // Turnover Chart
    const turnoverCtx = turnoverChartElement.getContext('2d');
    new Chart(turnoverCtx, {
      type: 'line',
      data: {
        labels: stats.turnover_chart.labels,
        datasets: [
          { label: 'Checked In', data: stats.turnover_chart.checked_in, borderColor: '#3B82F6', tension: 0.1 },
          { label: 'Checked Out', data: stats.turnover_chart.checked_out, borderColor: '#FBBF24', tension: 0.1 }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
    });
  });
}

// --- Alerts Integration ---
const alertsSection = document.getElementById('alerts');
if (alertsSection) {
  function renderAlerts(alerts) {
    const allAlertsDiv = document.getElementById('all-alerts');
    const inspectionAlertsDiv = document.getElementById('inspection-alerts');
    const eolAlertsDiv = document.getElementById('eol-alerts');
    function alertCard(alert) {
      let icon = '<i class="fas fa-info-circle text-xl"></i>';
      let border = 'border-blue-200 bg-blue-50';
      if (alert.alert_type === 'inspection') {
        icon = '<i class="fas fa-exclamation-triangle text-xl"></i>';
        border = 'border-yellow-200 bg-yellow-50';
      } else if (alert.alert_type === 'eol') {
        icon = '<i class="fas fa-times-circle text-xl"></i>';
        border = 'border-red-200 bg-red-50';
      }
      return `
        <div class="flex items-start p-4 rounded-lg border ${border}">
          <div class="mr-4">${icon}</div>
          <div class="flex-1">
            <h4 class="font-medium mb-1 text-blue-800">${alert.message}</h4>
            <div class="mt-2 text-sm text-gray-500">${new Date(alert.created_at).toLocaleString()}</div>
          </div>
        </div>
      `;
    }
    if (allAlertsDiv && allAlertsDiv.querySelector('.space-y-4'))
      allAlertsDiv.querySelector('.space-y-4').innerHTML = alerts.map(alertCard).join('');
    if (inspectionAlertsDiv && inspectionAlertsDiv.querySelector('.space-y-4'))
      inspectionAlertsDiv.querySelector('.space-y-4').innerHTML = alerts.filter(a => a.alert_type === 'inspection').map(alertCard).join('');
    if (eolAlertsDiv && eolAlertsDiv.querySelector('.space-y-4'))
      eolAlertsDiv.querySelector('.space-y-4').innerHTML = alerts.filter(a => a.alert_type === 'eol').map(alertCard).join('');
  }
  fetch(`${API_BASE}/alerts`).then(res => res.json()).then(renderAlerts);
}

// --- Box Management Integration ---
const boxesSection = document.getElementById('boxes');
if (boxesSection) {
  const grid = boxesSection.querySelector('.grid');
  function renderBoxes(boxes) {
    grid.innerHTML = boxes.map(box => {
      let statusClass = 'bg-blue-100 text-blue-800';
      let statusText = 'Active';
      if (box.status === 'needs_inspection') {
        statusClass = 'bg-yellow-100 text-yellow-800';
        statusText = 'Needs Inspection';
      } else if (box.status === 'retired') {
        statusClass = 'bg-red-100 text-red-800';
        statusText = 'End of Life';
      }
      const maxCycles = box.type === 'Metal Crate' ? 200 : box.type === 'Wooden Pallet' ? 100 : 150;
      const percent = Math.min(100, Math.round((box.cycle_count / maxCycles) * 100));
      let barColor = 'bg-blue-500';
      if (box.status === 'needs_inspection') barColor = 'bg-yellow-500';
      if (box.status === 'retired') barColor = 'bg-red-500';
      return `
        <div class="box-card bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-xl font-semibold text-blue-800">${box.box_id}</h3>
              <p class="text-gray-500">${box.type}</p>
            </div>
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${statusText}</span>
          </div>
          <div class="mb-4">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-500">Cycle Count</span>
              <span class="font-medium">${box.cycle_count}/${maxCycles}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="${barColor} h-2 rounded-full" style="width: ${percent + '%'}"></div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p class="text-sm text-gray-500">Current Location</p>
              <p class="font-medium">${box.location || 'Unknown'}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Last Used</p>
              <p class="font-medium">${box.last_used || 'N/A'}</p>
            </div>
          </div>
          <div class="flex justify-between">
            <button class="text-blue-600 hover:text-blue-800 text-sm font-medium" data-boxid="${box.id}" data-action="view">View Details</button>
            <button class="text-red-600 hover:text-red-800 text-sm font-medium" data-boxid="${box.id}" data-action="retire">Retire</button>
          </div>
        </div>
      `;
    }).join('');
    // Add event listeners for actions
    grid.querySelectorAll('button[data-action="view"]').forEach(btn => {
      btn.addEventListener('click', () => {
        // TODO: Show modal with box details and history
        alert('View details for box ID: ' + btn.dataset.boxid);
      });
    });
    grid.querySelectorAll('button[data-action="retire"]').forEach(btn => {
      btn.addEventListener('click', () => {
        fetch(`${API_BASE}/boxes/${btn.dataset.boxid}/retire`, { method: 'POST' })
          .then(res => res.json())
          .then(() => location.reload());
      });
    });
  }
  fetch(`${API_BASE}/boxes`).then(res => res.json()).then(renderBoxes);
}

// --- QR Scan Integration ---
function processScannedData(decodedText) {
  // Parse the QR code data (format: BOX_ID|TYPE|CYCLE_COUNT|LOCATION|LAST_USED|MFG_DATE)
  const data = decodedText.split('|');
  // Set the box details
  document.getElementById('boxId').textContent = data[0] || 'N/A';
  document.getElementById('boxType').textContent = data[1] || 'N/A';
  document.getElementById('cycleCount').textContent = data[2] || '0';
  document.getElementById('currentLocation').textContent = data[3] || 'Unknown';
  document.getElementById('lastUsed').textContent = data[4] || 'N/A';
  document.getElementById('manufactureDate').textContent = data[5] || 'N/A';
  // Calculate and display health status
  updateHealthStatus(data[2]);
  // Optionally, send scan event to backend
  fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ box_id: data[0], action_type: 'scan', location: data[3] })
  });
}

// --- Tracking Integration ---
const trackInput = document.querySelector('input[placeholder="Enter Tracking Number..."]');
const trackButton = document.querySelector('button.bg-blue-600');
if (trackInput && trackButton) {
  const statusDiv = document.querySelector('.mt-8.text-left .space-y-3');
  const mapImg = document.querySelector('.mt-10.bg-gray-200 img');
  trackButton.addEventListener('click', () => {
    const trackingNo = trackInput.value.trim();
    if (!trackingNo) return;
    fetch(`${API_BASE}/track/${trackingNo}`)
      .then(res => res.json())
      .then(data => {
        if (!data.box) {
          statusDiv.innerHTML = '<div class="text-red-600">Box not found.</div>';
          return;
        }
        // Render status/history
        let historyHtml = '';
        if (data.history && data.history.length > 0) {
          historyHtml = data.history.map(event => {
            let icon = '<i class="fas fa-info-circle text-blue-600 mr-3 text-lg"></i>';
            if (event.action_type === 'check_in') icon = '<i class="fas fa-sign-in-alt text-blue-600 mr-3 text-lg"></i>';
            if (event.action_type === 'check_out') icon = '<i class="fas fa-sign-out-alt text-yellow-600 mr-3 text-lg"></i>';
            if (event.action_type === 'inspection') icon = '<i class="fas fa-tools text-yellow-600 mr-3 text-lg"></i>';
            if (event.action_type === 'retire') icon = '<i class="fas fa-times-circle text-red-600 mr-3 text-lg"></i>';
            return `<div class="flex items-center">
              ${icon}
              <p class="text-gray-700"><span class="font-medium">${new Date(event.timestamp).toLocaleString()}:</span> ${event.action_type.replace('_', ' ')}${event.location ? ' @ ' + event.location : ''}${event.user_id ? ' by ' + event.user_id : ''}</p>
            </div>`;
          }).join('');
        } else {
          historyHtml = '<div class="text-gray-500">No history available.</div>';
        }
        statusDiv.innerHTML = historyHtml;
        // Optionally update map or other info
        // mapImg.src = ...
      })
      .catch(() => {
        statusDiv.innerHTML = '<div class="text-red-600">Error fetching tracking info.</div>';
      });
  });
}

// --- Settings Integration ---
const settingsSection = document.getElementById('settings');
if (settingsSection) {
  fetch(`${API_BASE}/settings`).then(res => res.json()).then(settings => {
    // TODO: Populate settings UI with fetched values
  });
  // TODO: Add event listeners to save settings changes via POST /api/settings
}

// --- QR Generation Integration ---
const qrForm = document.getElementById('qrForm');
if (qrForm) {
  const boxSelect = document.getElementById('boxSelect');
  const qrResult = document.getElementById('qrResult');
  const qrImage = document.getElementById('qrImage');
  const boxIdSpan = document.getElementById('boxId');
  const boxLocationSpan = document.getElementById('boxLocation');
  const downloadBtn = document.getElementById('downloadBtn');
  
  console.log('QR Generation page loaded, fetching boxes...');
  
  // Populate box dropdown
  fetch(`${API_BASE}/boxes`)
    .then(res => {
      console.log('Response status:', res.status);
      return res.json();
    })
    .then(boxes => {
      console.log('Fetched boxes:', boxes);
      if (boxes && boxes.length > 0) {
        boxes.forEach(box => {
          const option = document.createElement('option');
          option.value = box.id;
          option.textContent = `${box.box_id} - ${box.type}`;
          boxSelect.appendChild(option);
        });
        console.log('Added', boxes.length, 'boxes to dropdown');
      } else {
        console.log('No boxes found in response');
        boxSelect.innerHTML = '<option value="">No boxes available</option>';
      }
    })
    .catch(err => {
      console.error('Error fetching boxes:', err);
      boxSelect.innerHTML = '<option value="">Error loading boxes</option>';
    });
  
  // Handle form submission
  qrForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boxId = boxSelect.value;
    const location = document.getElementById('location').value;
    if (!boxId || !location) return;
    
    try {
      const res = await fetch(`${API_BASE}/boxes/${boxId}/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location })
      });
      const data = await res.json();
      if (res.ok) {
        qrImage.src = data.qr;
        boxIdSpan.textContent = boxSelect.options[boxSelect.selectedIndex].text.split(' - ')[0];
        boxLocationSpan.textContent = location;
        qrResult.classList.remove('hidden');
      } else {
        alert(data.error || 'Failed to generate QR code');
      }
    } catch (err) {
      alert('Server error. Please try again.');
    }
  });
  
  // Handle download
  downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `qr-${boxIdSpan.textContent}.png`;
    link.href = qrImage.src;
    link.click();
  });
}

function updateHealthStatus(cycleCount) {
  const count = parseInt(cycleCount) || 0;
  const maxCycles = 150; // Assuming maximum lifecycle is 150 cycles
  const healthPercent = Math.max(0, 100 - Math.floor((count / maxCycles) * 100));
  
  const healthBar = document.getElementById('healthBar');
  const healthStatus = document.getElementById('healthStatus');
  const inspectionStatus = document.getElementById('inspectionStatus');
  
  // Update health bar
  healthBar.style.width = `${healthPercent}%`;
  
  // Update colors based on health
  if (healthPercent > 70) {
    healthBar.className = 'bg-green-500 h-2.5 rounded-full';
    healthStatus.textContent = 'Excellent condition';
    healthStatus.className = 'text-sm text-green-500 mt-1';
  } else if (healthPercent > 30) {
    healthBar.className = 'bg-yellow-500 h-2.5 rounded-full';
    healthStatus.textContent = 'Good condition';
    healthStatus.className = 'text-sm text-yellow-500 mt-1';
  } else {
    healthBar.className = 'bg-red-500 h-2.5 rounded-full';
    healthStatus.textContent = 'Needs replacement soon';
    healthStatus.className = 'text-sm text-red-500 mt-1';
  }
  
  // Update inspection status
  if (count > 100) {
    inspectionStatus.textContent = 'Needs Inspection';
    inspectionStatus.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800';
  } else if (count > 50) {
    inspectionStatus.textContent = 'Monitor Condition';
    inspectionStatus.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800';
  } else {
    inspectionStatus.textContent = 'Good Condition';
    inspectionStatus.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
  }
}
    // --- Common Navigation Logic ---
    const mobileMenuButton = document.querySelector('nav button.md\\:hidden');
    const navLinksContainer = document.querySelector('nav .hidden.md\\:flex');

    if (mobileMenuButton && navLinksContainer) {
        mobileMenuButton.addEventListener('click', () => {
            navLinksContainer.classList.toggle('hidden');
            navLinksContainer.classList.toggle('flex');
            navLinksContainer.classList.toggle('flex-col');
            navLinksContainer.classList.toggle('absolute');
            navLinksContainer.classList.toggle('top-full');
            navLinksContainer.classList.toggle('left-0');
            navLinksContainer.classList.toggle('w-full');
            navLinksContainer.classList.toggle('bg-blue-800');
            navLinksContainer.classList.toggle('py-2');
            navLinksContainer.classList.toggle('space-y-2');
            navLinksContainer.classList.toggle('md:space-y-0');
        });
    }

    // --- Box Management Page Specific Logic ---
    const boxModal = document.getElementById('boxModal');
    if (boxModal) {
        const closeModalBtn = document.getElementById('closeModal');
        const viewDetailsButtons = document.querySelectorAll('.box-card button.text-blue-600');

        viewDetailsButtons.forEach(button => {
            button.addEventListener('click', () => {
                boxModal.classList.remove('hidden');
            });
        });

        closeModalBtn.addEventListener('click', () => {
            boxModal.classList.add('hidden');
        });

        boxModal.addEventListener('click', (e) => {
            if (e.target === boxModal) {
                boxModal.classList.add('hidden');
            }
        });
    }

    // --- QR Scanner Page Specific Logic ---
    const startScannerBtn = document.getElementById('startScanner');
    const scannerResultDiv = document.getElementById('scannerResult');
    const closeScannerBtn = document.getElementById('closeScanner');
    const reader = document.getElementById('reader');

    if (startScannerBtn) {
        startScannerBtn.addEventListener('click', () => {
            const html5QrCode = new Html5Qrcode("reader");
            html5QrCode.start(
                { facingMode: "environment" }, // Use the environment camera
                {
                    fps: 10,    // Set the frames per second
                    qrbox: 250  // Set the size of the scanning box
                },
                (decodedText, decodedResult) => {
                    // Handle the scanned QR code
                    document.getElementById('boxId').innerText = decodedText; // Display scanned QR code
                    document.getElementById('boxType').innerText = "Plastic Container"; // Example data
                    document.getElementById('cycleCount').innerText = "147/150"; // Example data
                    document.getElementById('currentLocation').innerText = "Warehouse A"; // Example data
                    document.getElementById('lastUsed').innerText = "2 days ago"; // Example data
                    document.getElementById('manufactureDate').innerText = "March 15, 2022"; // Example data
                    document.getElementById('inspectionStatus').innerText = "Needs Inspection"; // Example data
                    scannerResultDiv.classList.remove('hidden');
                    startScannerBtn.classList.add('hidden');
                    html5QrCode.stop(); // Stop scanning after successful scan
                },
                (errorMessage) => {
                    // Handle scan error
                    console.warn(`QR Code scan error: ${errorMessage}`);
                }
            ).catch(err => {
                console.error(`Unable to start scanning: ${err}`);
            });
        });

        if (closeScannerBtn) {
            closeScannerBtn.addEventListener('click', () => {
                scannerResultDiv.classList.add('hidden');
                startScannerBtn.classList.remove('hidden');
            });
        }
    }

    // --- Alerts Page Specific Logic ---
    const alertTabs = document.querySelectorAll('.alert-tab');
    if (alertTabs.length > 0) {
        const alertContents = document.querySelectorAll('.alert-content');

        alertTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all tabs and hide all content
                alertTabs.forEach(t => {
                    t.classList.remove('border-blue-500', 'text-blue-600');
                    t.classList.add('text-gray-500', 'hover:text-gray-700');
                });
                alertContents.forEach(content => content.classList.add('hidden'));

                // Activate clicked tab and show corresponding content
                tab.classList.add('border-blue-500', 'text-blue-600');
                tab.classList.remove('text-gray-500', 'hover:text-gray-700');
                const targetContentId = `${tab.dataset.tab}-alerts`;
                const targetContent = document.getElementById(targetContentId);
                if (targetContent) {
                    targetContent.classList.remove('hidden');
                }
            });
        });
    }

    // --- Login Page Specific Logic ---
    // This block is now handled by the new loginForm listener
});
