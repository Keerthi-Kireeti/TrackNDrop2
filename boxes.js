// TrackNDrop - Boxes Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // API Base URL
    const API_BASE = 'http://localhost:3000/api';
    
    // DOM Elements
    const boxesContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
    const addBoxBtn = document.getElementById('addBoxBtn');
    const loadMoreBoxesBtn = document.getElementById('loadMoreBoxesBtn');
    const boxModal = document.getElementById('boxModal');
    const closeModal = document.getElementById('closeModal');
    const searchInput = document.querySelector('input[placeholder="Search boxes..."]');
    const scanBtn = document.getElementById('scanBtn');
    
    // State variables
    let currentOffset = 6; // Start with 6 as we already have 6 boxes displayed
    const limit = 6;
    let allBoxes = [];
    
    // Fetch all boxes initially
    fetchBoxes();
    
    // Event Listeners
    if (addBoxBtn) {
        addBoxBtn.addEventListener('click', openAddBoxModal);
    }
    
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            window.location.href = 'scan.html';
        });
    }
    
    if (loadMoreBoxesBtn) {
        loadMoreBoxesBtn.addEventListener('click', loadMoreBoxes);
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closeBoxModal);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Add event delegation for view details buttons
    if (boxesContainer) {
        boxesContainer.addEventListener('click', function(e) {
            // Check if the clicked element is a "View Details" button
            if (e.target.textContent === 'View Details' || 
                (e.target.parentElement && e.target.parentElement.textContent === 'View Details')) {
                // Find the closest box-card parent
                const boxCard = e.target.closest('.box-card');
                if (boxCard) {
                    // Get the box ID from the card
                    const boxId = boxCard.querySelector('h3').textContent;
                    openBoxDetailsModal(boxId);
                }
            }
        });
    }
    
    // Functions
    function fetchBoxes() {
        fetch(`${API_BASE}/boxes`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(boxes => {
                allBoxes = boxes;
                // We don't need to render boxes here as they are already in the HTML
                // But we store them for search functionality
            })
            .catch(error => {
                console.error('Error fetching boxes:', error);
            });
    }
    
    function loadMoreBoxes() {
        fetch(`${API_BASE}/boxes?limit=${limit}&offset=${currentOffset}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(boxes => {
                if (boxes.length === 0) {
                    // No more boxes to load
                    loadMoreBoxesBtn.textContent = 'No More Boxes';
                    loadMoreBoxesBtn.disabled = true;
                    return;
                }
                
                // Render the new boxes
                boxes.forEach(box => {
                    const boxCard = createBoxCard(box);
                    boxesContainer.appendChild(boxCard);
                });
                
                // Update the offset for the next load
                currentOffset += boxes.length;
            })
            .catch(error => {
                console.error('Error loading more boxes:', error);
                loadMoreBoxesBtn.textContent = 'Error Loading Boxes';
            });
    }
    
    function createBoxCard(box) {
        // Create a status badge based on the box status
        let statusBadge = '';
        if (box.status === 'active') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Active</span>';
        } else if (box.status === 'needs_inspection') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Needs Inspection</span>';
        } else if (box.status === 'retired') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">End of Life</span>';
        } else {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">In Maintenance</span>';
        }
        
        // Calculate cycle percentage
        let maxCycles = 150; // Default for plastic
        if (box.type.toLowerCase().includes('metal')) {
            maxCycles = 200;
        } else if (box.type.toLowerCase().includes('wooden') || box.type.toLowerCase().includes('pallet')) {
            maxCycles = 100;
        }
        
        const cyclePercentage = Math.min(100, Math.round((box.cycle_count / maxCycles) * 100));
        
        // Determine progress bar color
        let progressBarColor = 'bg-blue-500';
        if (cyclePercentage > 90) {
            progressBarColor = 'bg-red-500';
        } else if (cyclePercentage > 75) {
            progressBarColor = 'bg-yellow-500';
        }
        
        // Create the box card element
        const boxCard = document.createElement('div');
        boxCard.className = 'box-card bg-white p-6 rounded-xl shadow-sm border border-gray-100';
        boxCard.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-semibold text-blue-800">${box.box_id}</h3>
                    <p class="text-gray-500">${box.type}</p>
                </div>
                ${statusBadge}
            </div>
            <div class="mb-4">
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-500">Cycle Count</span>
                    <span class="font-medium">${box.cycle_count}/${maxCycles}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="${progressBarColor} h-2 rounded-full" style="width: ${cyclePercentage}%"></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p class="text-sm text-gray-500">Current Location</p>
                    <p class="font-medium">${box.location || 'Unknown'}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Last Used</p>
                    <p class="font-medium">${formatDate(box.last_used) || 'N/A'}</p>
                </div>
            </div>
            <div class="flex justify-between">
                <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details</button>
                <button class="text-gray-500 hover:text-gray-700 text-sm">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        `;
        
        return boxCard;
    }
    
    function formatDate(dateString) {
        if (!dateString) return null;
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // Return as is if not a valid date
        }
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    function openBoxDetailsModal(boxId) {
        // Find the box in our allBoxes array
        const box = allBoxes.find(b => b.box_id === boxId);
        
        if (box) {
            // Update modal title
            const modalTitle = boxModal.querySelector('h3');
            if (modalTitle) {
                modalTitle.textContent = `Box Details - ${box.box_id}`;
            }
            
            // Update basic information
            const basicInfo = boxModal.querySelector('.bg-blue-100:nth-of-type(1) .space-y-2');
            if (basicInfo) {
                basicInfo.innerHTML = `
                    <p><span class="text-blue-600">Type:</span> ${box.type}</p>
                    <p><span class="text-blue-600">Size:</span> 24" x 18" x 12"</p>
                    <p><span class="text-blue-600">Weight:</span> 8.5 lbs</p>
                    <p><span class="text-blue-600">Manufacture Date:</span> ${formatDate(box.manufacture_date) || 'Unknown'}</p>
                `;
            }
            
            // Update current status
            const currentStatus = boxModal.querySelector('.bg-yellow-100 .space-y-2');
            if (currentStatus) {
                let statusBadge = '';
                if (box.status === 'active') {
                    statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-200 text-blue-800">Active</span>';
                } else if (box.status === 'needs_inspection') {
                    statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">Needs Inspection</span>';
                } else if (box.status === 'retired') {
                    statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-200 text-red-800">End of Life</span>';
                } else {
                    statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">In Maintenance</span>';
                }
                
                currentStatus.innerHTML = `
                    <p><span class="text-yellow-600">Status:</span> ${statusBadge}</p>
                    <p><span class="text-yellow-600">Location:</span> ${box.location || 'Unknown'}</p>
                    <p><span class="text-yellow-600">Last Used:</span> ${formatDate(box.last_used) || 'N/A'}</p>
                    <p><span class="text-yellow-600">Assigned To:</span> Logistics Team</p>
                `;
            }
            
            // Update lifecycle metrics
            const lifecycleMetrics = boxModal.querySelector('.bg-blue-100:nth-of-type(2) .space-y-2');
            if (lifecycleMetrics) {
                // Calculate max cycles based on box type
                let maxCycles = 150; // Default for plastic
                if (box.type.toLowerCase().includes('metal')) {
                    maxCycles = 200;
                } else if (box.type.toLowerCase().includes('wooden') || box.type.toLowerCase().includes('pallet')) {
                    maxCycles = 100;
                }
                
                lifecycleMetrics.innerHTML = `
                    <p><span class="text-blue-600">Cycle Count:</span> ${box.cycle_count}/${maxCycles}</p>
                    <p><span class="text-blue-600">Mileage:</span> ${Math.floor(Math.random() * 5000)} km</p>
                    <p><span class="text-blue-600">Last Inspection:</span> ${Math.floor(Math.random() * 50)} cycles ago</p>
                    <p><span class="text-blue-600">Repair Count:</span> ${Math.floor(Math.random() * 5)}</p>
                `;
            }
            
            // Fetch box history
            fetch(`${API_BASE}/boxes/${box.id}/history`)
                .then(response => response.json())
                .then(history => {
                    // Update history table
                    const historyTableBody = boxModal.querySelector('tbody');
                    if (historyTableBody && history.length > 0) {
                        historyTableBody.innerHTML = '';
                        
                        history.forEach(entry => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td class="px-6 py-4 whitespace-nowrap">${formatDate(entry.timestamp) || 'Unknown'}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${formatActionType(entry.action_type)}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${entry.location || 'N/A'}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${entry.user_id || 'System'}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${entry.notes || 'No notes'}</td>
                            `;
                            historyTableBody.appendChild(row);
                        });
                    } else if (historyTableBody) {
                        historyTableBody.innerHTML = `
                            <tr>
                                <td colspan="5" class="px-6 py-4 text-center text-gray-500">No history available for this box.</td>
                            </tr>
                        `;
                    }
                })
                .catch(error => {
                    console.error('Error fetching box history:', error);
                    const historyTableBody = boxModal.querySelector('tbody');
                    if (historyTableBody) {
                        historyTableBody.innerHTML = `
                            <tr>
                                <td colspan="5" class="px-6 py-4 text-center text-red-500">Error loading history.</td>
                            </tr>
                        `;
                    }
                });
            
            // Show the modal
            boxModal.classList.remove('hidden');
        } else {
            console.error('Box not found:', boxId);
            alert('Box details not found. Please try again.');
        }
    }
    
    function formatActionType(actionType) {
        if (!actionType) return 'Unknown';
        
        // Convert snake_case to Title Case with spaces
        return actionType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    function closeBoxModal() {
        boxModal.classList.add('hidden');
    }
    
    function openAddBoxModal() {
        // Create a modal for adding a new box
        const addBoxModalHTML = `
            <div id="addBoxModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-xl w-full max-w-md p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-bold text-blue-800">Add New Box</h3>
                        <button id="closeAddBoxModal" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <form id="addBoxForm" class="space-y-4">
                        <div>
                            <label for="boxId" class="block text-sm font-medium text-blue-700 mb-1">Box ID</label>
                            <input type="text" id="boxId" name="boxId" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="BX-XXXX-XX" required>
                        </div>
                        
                        <div>
                            <label for="boxType" class="block text-sm font-medium text-blue-700 mb-1">Box Type</label>
                            <select id="boxType" name="boxType" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="">Select a type...</option>
                                <option value="Plastic Container">Plastic Container</option>
                                <option value="Metal Crate">Metal Crate</option>
                                <option value="Wooden Pallet">Wooden Pallet</option>
                            </select>
                        </div>
                        
                        <div>
                            <label for="manufactureDate" class="block text-sm font-medium text-blue-700 mb-1">Manufacture Date</label>
                            <input type="date" id="manufactureDate" name="manufactureDate" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        
                        <div>
                            <label for="location" class="block text-sm font-medium text-blue-700 mb-1">Initial Location</label>
                            <input type="text" id="location" name="location" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Warehouse A">
                        </div>
                        
                        <div class="flex justify-end pt-4">
                            <button type="button" id="cancelAddBox" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition mr-2">Cancel</button>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Add Box</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Add the modal to the DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = addBoxModalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // Add event listeners
        document.getElementById('closeAddBoxModal').addEventListener('click', closeAddBoxModal);
        document.getElementById('cancelAddBox').addEventListener('click', closeAddBoxModal);
        document.getElementById('addBoxForm').addEventListener('submit', handleAddBox);
    }
    
    function closeAddBoxModal() {
        const addBoxModal = document.getElementById('addBoxModal');
        if (addBoxModal) {
            addBoxModal.remove();
        }
    }
    
    function handleAddBox(e) {
        e.preventDefault();
        
        // Get form values
        const boxId = document.getElementById('boxId').value;
        const type = document.getElementById('boxType').value;
        const manufactureDate = document.getElementById('manufactureDate').value;
        const location = document.getElementById('location').value;
        
        // Validate form
        if (!boxId || !type || !manufactureDate) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Create box object
        const newBox = {
            box_id: boxId,
            type,
            manufacture_date: manufactureDate,
            location: location || null
        };
        
        // Send API request
        fetch(`${API_BASE}/boxes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newBox)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Add the new box to allBoxes array
                newBox.id = data.id;
                newBox.cycle_count = 0;
                newBox.status = 'active';
                allBoxes.push(newBox);
                
                // Create and add the box card to the UI
                const boxCard = createBoxCard(newBox);
                boxesContainer.prepend(boxCard);
                
                // Close the modal
                closeAddBoxModal();
                
                // Show success message
                alert('Box added successfully!');
            })
            .catch(error => {
                console.error('Error adding box:', error);
                alert('Error adding box. Please try again.');
            });
    }
    
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        if (!searchTerm) {
            // If search is empty, reset to initial state
            // This would require reloading the page or storing the initial HTML
            // For simplicity, we'll just reload the page
            window.location.reload();
            return;
        }
        
        // Filter boxes based on search term
        const filteredBoxes = allBoxes.filter(box => 
            box.box_id.toLowerCase().includes(searchTerm) ||
            box.type.toLowerCase().includes(searchTerm) ||
            (box.location && box.location.toLowerCase().includes(searchTerm))
        );
        
        // Clear current boxes
        boxesContainer.innerHTML = '';
        
        // Add filtered boxes
        if (filteredBoxes.length > 0) {
            filteredBoxes.forEach(box => {
                const boxCard = createBoxCard(box);
                boxesContainer.appendChild(boxCard);
            });
        } else {
            // No results
            boxesContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-gray-500">No boxes found matching "${searchTerm}"</p>
                </div>
            `;
        }
    }
});