// This is the complete, final script for clubhead-dashboard.js

/**
 * This is the main function that runs when the page is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. We start by loading all the initial data for the dashboard.
    loadInitialDashboard();

    // 2. We find the event form and attach our createEvent function to its 'submit' event.
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', createEvent);
    }

    // Attach complete event form submission handler
    const completeEventForm = document.getElementById('completeEventForm');
    if (completeEventForm) {
        completeEventForm.addEventListener('submit', submitCompleteEvent);
    }

    // Attach announcement form submission handler
    const announcementForm = document.getElementById('announcementForm');
    if (announcementForm) {
        announcementForm.addEventListener('submit', broadcastAnnouncement);
    }



    // 3. Setup navigation
    setupNavigation();
});

// Global variables to store data
window.dashboardData = null;

/**
 * Fetches and displays all the initial data for the Club Head dashboard.
 */
async function loadInitialDashboard() {
    const role = localStorage.getItem('role');
    if (!getToken() || role !== "clubhead") {
        alert("Please login as a Club Head first!");
        window.location.href = "login.html";
        return;
    }

    // Fetch the main dashboard data (with cache-busting)
    const res = await apiRequest("/clubhead/dashboard?_=" + new Date().getTime());

    if (res.error) {
        document.body.innerHTML = `<h2>Error: ${res.error}</h2>`;
        return;
    }

    // Store data globally
    window.dashboardData = res;

    // Populate the dashboard stat cards
    document.getElementById("clubName").innerText = res.name;
    document.getElementById("totalMembers").innerText = res.members.length;
    document.getElementById("pendingRequestsCount").innerText = res.pendingRequests.length;

    // Render all sections
    renderDashboardSection(res);
    await renderEventsSection();
    
    // Update events count
    updateEventsCount();
}

/**
 * Navigation functionality
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.dashboard-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked nav item
            this.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.classList.remove('active'));
            
            // Show the selected section
            document.getElementById(sectionId).classList.add('active');
            
            // If clicking on members section, render it
            if (sectionId === 'members' && window.dashboardData) {
                renderMembersSection(window.dashboardData.members);
            }
            

        });
    });
}

/**
 * Renders the dashboard section with all data
 */
function renderDashboardSection(data) {
    // Render pending requests
    renderPendingRequests(data.pendingRequests);
    
    // Render members in dashboard
    renderMembersDashboard(data.members);
    
    // Load events for dashboard
    loadMyEventStatus();
}

/**
 * Renders the members section with enhanced styling
 */
function renderMembersSection(members) {
    const list = document.getElementById("membersListFull");
    if (!members || members.length === 0) {
        list.innerHTML = `
            <div class="text-center py-12">
                <span class="text-6xl text-gray-300 mb-4">👥</span>
                <p class="text-gray-500 text-lg">No members yet</p>
                <p class="text-gray-400 text-sm mt-2">Members will appear here when they join your club</p>
            </div>`;
        return;
    }
    
    list.innerHTML = members.map(member => `
        <div class="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="bg-green-100 rounded-full p-3">
                        <span class="text-green-600 text-lg">👤</span>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800 text-lg">${member.username}</h4>
                        <p class="text-gray-500 text-sm">Club Member</p>
                    </div>
                </div>
                <div class="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    Active
                </div>
            </div>
        </div>
    `).join("");
}

/**
 * Renders the members list for the dashboard section
 */
function renderMembersDashboard(members) {
    const list = document.getElementById("membersList");
    if (!members || members.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8">
                <span class="text-4xl text-gray-300 mb-3">👥</span>
                <p class="text-gray-500">No members yet</p>
            </div>`;
        return;
    }
    list.innerHTML = members.map(mem => `
        <div class="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
            <div class="flex items-center space-x-3">
                <div class="bg-green-100 rounded-full p-2">
                    <span class="text-green-600">👤</span>
                </div>
                <div>
                    <div class="font-semibold text-gray-800">${mem.username}</div>
                    <div class="text-green-600 text-xs font-medium">Active Member</div>
                </div>
            </div>
        </div>
    `).join("");
}

/**
 * Renders the events section with enhanced styling
 */
async function renderEventsSection() {
    const events = await apiRequest("/clubhead/my-events");
    const list = document.getElementById("eventsListFull");
    
    if (!events || events.length === 0) {
        list.innerHTML = `
            <div class="text-center py-12">
                <span class="text-6xl text-gray-300 mb-4">📅</span>
                <p class="text-gray-500 text-lg">No events created yet</p>
                <p class="text-gray-400 text-sm mt-2">Create your first event to get started</p>
            </div>`;
        return;
    }

    list.innerHTML = events.map(event => {
        let statusColor = 'bg-yellow-100 text-yellow-800';
        let statusIcon = '⏰';
        let statusText = event.status.charAt(0).toUpperCase() + event.status.slice(1);
        if (event.isCompleted) {
            statusColor = 'bg-indigo-100 text-indigo-800 border border-indigo-300';
            statusIcon = '🎓';
            statusText = 'Completed';
        } else if (event.status === 'approved') {
            statusColor = 'bg-green-100 text-green-800';
            statusIcon = '✅';
        } else if (event.status === 'rejected') {
            statusColor = 'bg-red-100 text-red-800';
            statusIcon = '❌';
        }

        const requestedAmount = event.fundRequest || 0;
        const approvedAmount = event.approvedFund || 0;
        
        const fundDisplay = requestedAmount > 0 ? 
            `<div class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div class="flex items-center justify-between">
                    <span class="text-blue-700 font-medium">Funds Requested:</span>
                    <span class="text-blue-800 font-bold">₹${requestedAmount.toLocaleString()}</span>
                </div>
                ${approvedAmount > 0 ? 
                    `<div class="flex items-center justify-between mt-2">
                        <span class="text-green-700 font-medium">Funds Approved:</span>
                        <span class="text-green-800 font-bold">₹${approvedAmount.toLocaleString()}</span>
                    </div>` : 
                    `<div class="flex items-center justify-between mt-2">
                        <span class="text-gray-600">Approval Status:</span>
                        <span class="text-yellow-600 font-medium">Pending</span>
                    </div>`
                }
            </div>` : 
            '';

        const regButton = event.status === 'approved' ? `
            <button onclick="viewRegistrations('${event._id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold mr-2 transition-colors">
                👤 View Registrations
            </button>
        ` : '';
        const completeButton = (event.status === 'approved' && !event.isCompleted) ? `
            <button onclick="openCompleteEventModal('${event._id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold mr-2 transition-colors">
                📸 Complete Event
            </button>
        ` : '';
        const deleteButton = `
            <button onclick="deleteEvent('${event._id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors">
                🗑️ Delete Event
            </button>
        `;

        return `
        <div class="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-gray-800 mb-2">${event.title}</h3>
                    <p class="text-gray-600 mb-3">${event.description}</p>
                    <div class="flex items-center text-gray-500 text-sm">
                        <span class="mr-2">📅</span>
                        ${new Date(event.date).toLocaleDateString()} at ${new Date(event.date).toLocaleTimeString()}
                        <span class="mx-3">|</span>
                        <span class="mr-2">🎟️</span>
                        Fee: ₹${event.registrationFee || 0}
                    </div>
                </div>
                <div class="flex items-center space-x-2 ${statusColor} px-3 py-1 rounded-full text-sm font-medium ml-4">
                    <span>${statusIcon}</span>
                    <span>${statusText}</span>
                </div>
            </div>
            ${fundDisplay}
            <div class="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                ${regButton}
                ${completeButton}
                ${deleteButton}
            </div>
        </div>`;
    }).join("");
    
    // Update events count
    document.getElementById("eventsCount").innerText = events.length;
}

/**
 * Fetches and displays the status of events created by this club for dashboard section.
 */
async function loadMyEventStatus() {
    const events = await apiRequest("/clubhead/my-events");
    const list = document.getElementById("eventsList");
    if (!events || events.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8">
                <span class="text-4xl text-gray-300 mb-3">📅</span>
                <p class="text-gray-500">No events yet</p>
            </div>`;
        return;
    }

    list.innerHTML = events.map(event => {
        let statusColor = 'text-yellow-600';
        let statusBg = 'bg-yellow-50 border-yellow-200';
        let statusText = event.status;
        if (event.isCompleted) {
            statusColor = 'text-indigo-600 font-bold';
            statusBg = 'bg-indigo-50 border-indigo-200';
            statusText = 'completed';
        } else if (event.status === 'approved') {
            statusColor = 'text-green-600';
            statusBg = 'bg-green-50 border-green-200';
        } else if (event.status === 'rejected') {
            statusColor = 'text-red-600';
            statusBg = 'bg-red-50 border-red-200';
        }

        const requestedAmount = event.fundRequest || 0;
        const approvedAmount = event.approvedFund || 0;
        
        const fundDisplay = requestedAmount > 0 ? 
            `<div class="mt-2 space-y-1">
                <p class="text-sm text-blue-600">💰 Requested: ₹${requestedAmount.toLocaleString()}</p>
                ${approvedAmount > 0 ? 
                    `<p class="text-sm text-green-600 font-semibold">✅ Approved: ₹${approvedAmount.toLocaleString()}</p>` : 
                    '<p class="text-sm text-gray-500">⏳ Approved: Pending</p>'
                }
            </div>` : 
            '';

        return `<div class="border ${statusBg} p-4 rounded-lg">
                    <p class="font-bold text-gray-800">${event.title}</p>
                    <p class="text-sm text-gray-600 mt-1">${new Date(event.date).toLocaleDateString()}</p>
                    ${fundDisplay}
                    <p class="text-sm font-bold ${statusColor} mt-2">Status: ${statusText}</p>
                </div>`;
    }).join("");
}

/**
 * Updates the events count in the stats card
 */
async function updateEventsCount() {
    const events = await apiRequest("/clubhead/my-events");
    if (events && events.length > 0) {
        document.getElementById("eventsCount").innerText = events.length;
    }
}

/**
 * Renders the list of students waiting to join the club with enhanced styling.
 */
function renderPendingRequests(requests) {
    const list = document.getElementById("pendingRequestsList");
    if (!requests || requests.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8">
                <span class="text-4xl text-gray-300 mb-3">✅</span>
                <p class="text-gray-500">No pending requests</p>
                <p class="text-gray-400 text-sm mt-1">All join requests have been processed</p>
            </div>`;
        return;
    }
    list.innerHTML = requests.map(req => `
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                    <div class="bg-yellow-100 rounded-full p-2">
                        <span class="text-yellow-600">👤</span>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800">${req.username}</h4>
                        <p class="text-yellow-700 text-sm">Waiting for approval</p>
                    </div>
                </div>
            </div>
            <div class="flex gap-2">
                <button class="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center transition-all duration-200" 
                        onclick="respondToRequest('${req._id}', 'accept')">
                    <span class="mr-2">✓</span>
                    Accept
                </button>
                <button class="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center transition-all duration-200" 
                        onclick="respondToRequest('${req._id}', 'reject')">
                    <span class="mr-2">✕</span>
                    Reject
                </button>
            </div>
        </div>
    `).join("");
}

/**
 * Handles the 'Accept' or 'Reject' action for a student join request.
 */
async function respondToRequest(studentId, action) {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;

    const res = await apiRequest("/clubhead/respond", "POST", { studentId, action });
    if (res.message) {
        alert(res.message);
        window.location.reload();
    } else {
        alert("Error: " + (res.error || "Failed to respond"));
    }
}

/**
 * This function runs when the "Create Event" form is submitted.
 */
async function createEvent(event) {
    event.preventDefault(); // Stops the page from reloading

    const form = document.getElementById('eventForm');
    const eventData = {
        title: form.title.value,
        description: form.description.value,
        date: form.date.value,
        fundRequest: form.fundRequest ? (parseInt(form.fundRequest.value) || 0) : 0,
        registrationFee: parseInt(form.registrationFee.value) || 0
    };

    try {
        const res = await apiRequest("/clubhead/events", "POST", eventData);
        if (res.message) {
            alert(res.message);
            closeModal();
            window.location.reload();
        } else {
            alert("Server Error: " + (res.error || "An unknown error occurred."));
        }
    } catch (error) {
        console.error("API Request Failed:", error);
        alert("CRITICAL ERROR: Could not reach the server. Is it running? Details: " + error);
    }
}

/**
 * Opens the 'Create Event' modal.
 */
function openCreateEventModal() {
    document.getElementById('createEventModal').classList.remove('hidden');
}

/**
 * Closes the 'Create Event' modal.
 */
function closeModal() {
    document.getElementById('createEventModal').classList.add('hidden');
}

/**
 * Logs the user out.
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'login.html';
}

// Broadcast announcement
async function broadcastAnnouncement(e) {
    e.preventDefault();
    const messageInput = document.getElementById('announcementMessage');
    const message = messageInput.value.trim();
    if (!message) return;
    
    try {
        const res = await apiRequest("/clubhead/announcements", "POST", { message });
        if (res.message) {
            alert("✅ Announcement broadcasted successfully!");
            messageInput.value = "";
        } else {
            alert("Error: " + (res.error || "Failed to broadcast announcement."));
        }
    } catch (err) {
        console.error("Announcement error:", err);
        alert("Error: " + (err.message || "Failed to connect to server."));
    }
}

// Delete Event
async function deleteEvent(eventId) {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
    try {
        const res = await apiRequest(`/clubhead/events/${eventId}`, "DELETE");
        if (res.message) {
            alert("✅ Event deleted successfully!");
            await loadInitialDashboard();
        } else {
            alert("Error: " + (res.error || "Failed to delete event."));
        }
    } catch (err) {
        console.error("Delete event error:", err);
        alert("Error deleting event: " + err.message);
    }
}

// View Registrations
async function viewRegistrations(eventId) {
    try {
        const list = document.getElementById("registrantsList");
        list.innerHTML = `
            <div class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p class="text-gray-500 mt-2">Fetching registrations...</p>
            </div>`;
            
        document.getElementById("registrationsModal").classList.remove("hidden");
        document.getElementById("registrationsModal").classList.add("flex");
        
        const registrants = await apiRequest(`/clubhead/events/${eventId}/registrations`);
        if (registrants.error) {
            list.innerHTML = `<p class="text-red-500 text-center py-4">Error: ${registrants.error}</p>`;
            return;
        }
        
        // Defensively filter out null/undefined entries
        const validRegistrants = (registrants || []).filter(reg => reg !== null && reg !== undefined);
        
        if (validRegistrants.length === 0) {
            list.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p class="font-medium">No registrations yet.</p>
                    <p class="text-xs text-gray-400 mt-1">Students will appear here once they register.</p>
                </div>`;
            return;
        }
        
        list.innerHTML = validRegistrants.map(reg => {
            const student = reg.student || {};
            const isFree = reg.amountPaid === 0;
            const payMethodText = reg.paymentMethod === 'phonepe' ? 'PhonePe Gateway' : reg.paymentMethod === 'upi_qr' ? 'PhonePe QR' : reg.paymentMethod === 'upi_id' ? `UPI (${reg.upiId || ''})` : reg.paymentMethod === 'legacy' ? 'Legacy' : 'Free';
            const payDate = new Date(reg.createdAt).toLocaleString();
            
            return `
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-semibold text-gray-800">${student.name || student.username || 'Unknown Student'}</p>
                            <p class="text-xs text-gray-500">Roll No: ${student.username || 'N/A'}</p>
                            <p class="text-[10px] text-slate-400 mt-2"><i class="far fa-clock mr-1"></i>${payDate}</p>
                        </div>
                        <div class="text-right">
                            <span class="${isFree ? 'bg-gray-100 text-gray-800' : 'bg-emerald-100 text-emerald-800'} text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block">
                                ${isFree ? 'Free Entry' : 'Paid ₹' + reg.amountPaid}
                            </span>
                            ${!isFree ? `
                                <p class="text-[10px] text-gray-500 mt-1.5 font-mono">ID: ${reg.transactionId}</p>
                                <p class="text-[9px] text-slate-400 font-medium">${payMethodText}</p>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error("Error fetching registrations:", err);
        document.getElementById("registrantsList").innerHTML = `<p class="text-red-500 text-center py-4">Failed to load registrations.</p>`;
    }
}


function closeRegistrationsModal() {
    document.getElementById("registrationsModal").classList.add("hidden");
    document.getElementById("registrationsModal").classList.remove("flex");
}

function openCompleteEventModal(eventId) {
    document.getElementById("completeEventId").value = eventId;
    document.getElementById("completeEventImages").value = "";
    document.getElementById("completeEventModal").classList.remove("hidden");
    document.getElementById("completeEventModal").classList.add("flex");
}

function closeCompleteEventModal() {
    document.getElementById("completeEventModal").classList.add("hidden");
    document.getElementById("completeEventModal").classList.remove("flex");
}

async function submitCompleteEvent(e) {
    e.preventDefault();
    const eventId = document.getElementById("completeEventId").value;
    const imagesRaw = document.getElementById("completeEventImages").value;
    
    // Split by comma, trim, filter out empty strings
    const eventImages = imagesRaw
        .split(/[\n,]+/)
        .map(url => url.trim())
        .filter(url => url.length > 0);
        
    try {
        const res = await apiRequest(`/clubhead/events/${eventId}/complete`, "POST", { eventImages });
        if (res.message) {
            alert("✅ Event marked as completed and memories uploaded successfully!");
            closeCompleteEventModal();
            // Reload dashboard to update stats and listing
            await loadInitialDashboard();
        } else {
            alert("Error: " + (res.error || "Failed to mark event as completed."));
        }
    } catch (err) {
        console.error("Complete event API error:", err);
        alert("Error connecting to server: " + err.message);
    }
}