// Admin Dashboard JavaScript

// Global variables
let allEvents = [];
let allUsers = [];
let allClubs = [];
let fundRequests = [];

// Initialize dashboard when page loads
window.onload = async function() {
    const role = localStorage.getItem('role');
    if (!getToken() || role !== "admin") {
        alert("Please login as Admin first!");
        window.location.href = "login.html";
        return;
    }

    // Set admin name if available
    const adminName = localStorage.getItem('username') || 'Admin';
    document.getElementById('adminName').textContent = adminName;

    // Load all data first, then update dashboard
    try {
        await Promise.all([
            loadAllEvents(),
            loadAllUsers(),
            loadAllClubs(),
            loadFundRequests()
        ]);
        
        // Now update the dashboard with the loaded data
        await loadDashboardStats();
        await loadRecentActivity();
        
        console.log("Dashboard initialized successfully");
    } catch (error) {
        console.error("Error initializing dashboard:", error);
    }
};

// Section navigation
function showSection(sectionId, element) {
    // Hide all sections
    document.querySelectorAll("main section").forEach(sec => sec.classList.add("hidden"));
    
    // Show selected section
    const targetSec = document.getElementById(sectionId);
    if (targetSec) {
        targetSec.classList.remove("hidden");
    }
    
    // Update active link in sidebar
    document.querySelectorAll(".sidebar-link").forEach(link => link.classList.remove("active"));
    
    let activeEl = element;
    if (!activeEl && typeof event !== 'undefined' && event) {
        activeEl = event.target.closest('.sidebar-link');
    }
    if (activeEl) {
        activeEl.classList.add("active");
    }
    
    // Refresh section data if needed
    if (sectionId === 'events') refreshEvents();
    if (sectionId === 'users') refreshUsers();
    if (sectionId === 'clubs') refreshClubs();
    if (sectionId === 'funds') refreshFunds();
    if (sectionId === 'reports') generateReport('preview');
    if (sectionId === 'reset-requests') loadResetRequests();
    if (sectionId === 'payments-ledger') loadPaymentsLedger();
}

// FIXED: Load dashboard statistics
async function loadDashboardStats() {
    try {
        console.log("Calculating dashboard stats...");
        console.log("Events:", allEvents.length);
        console.log("Users:", allUsers.length);
        console.log("Clubs:", allClubs.length);

        // Count pending events
        const pendingEvents = allEvents.filter(e => e.status === 'pending').length;
        
        // Count faculty members
        const facultyCount = allUsers.filter(u => u.role === 'faculty').length;
        
        // Calculate total members from clubs data
        let totalMembers = 0;
        allClubs.forEach(club => {
            if (club.members && Array.isArray(club.members)) {
                totalMembers += club.members.length;
            }
        });

        // Update UI with actual values
        document.getElementById("totalClubs").textContent = allClubs.length;
        document.getElementById("totalMembers").textContent = totalMembers;
        document.getElementById("totalFaculty").textContent = facultyCount;
        document.getElementById("pendingEvents").textContent = pendingEvents;

        console.log("Dashboard stats updated:", {
            clubs: allClubs.length,
            members: totalMembers,
            faculty: facultyCount,
            pendingEvents: pendingEvents
        });

    } catch (error) {
        console.error("Error loading dashboard stats:", error);
        // Set fallback values
        document.getElementById("totalClubs").textContent = "0";
        document.getElementById("totalMembers").textContent = "0";
        document.getElementById("totalFaculty").textContent = "0";
        document.getElementById("pendingEvents").textContent = "0";
    }
}

// Load all events
async function loadAllEvents() {
    try {
        allEvents = await apiRequest("/admin/events");
        if (!allEvents) allEvents = [];
        console.log("Events loaded:", allEvents.length);
    } catch (error) {
        console.error("Error loading events:", error);
        allEvents = [];
    }
}

// Load all users
async function loadAllUsers() {
    try {
        allUsers = await apiRequest("/admin/users");
        if (!allUsers) allUsers = [];
        console.log("Users loaded:", allUsers.length);
    } catch (error) {
        console.error("Error loading users:", error);
        allUsers = [];
    }
}

// Load all clubs
async function loadAllClubs() {
    try {
        // Try to get detailed clubs data first
        allClubs = await apiRequest("/admin/clubs-detailed");
        
        // If detailed endpoint fails, fall back to basic clubs
        if (!allClubs || allClubs.length === 0) {
            console.log("Detailed clubs failed, trying basic clubs...");
            allClubs = await apiRequest("/clubs");
        }
        
        if (!allClubs) allClubs = [];
        
        console.log("Clubs loaded:", allClubs.length);
        
    } catch (error) {
        console.error("Error loading clubs:", error);
        allClubs = [];
    }
}

// Load fund requests
async function loadFundRequests() {
    try {
        fundRequests = await apiRequest("/admin/fund-requests") || [];
        console.log("Fund requests:", fundRequests.length);
    } catch (error) {
        console.error("Error loading fund requests:", error);
        fundRequests = [];
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const activityContainer = document.getElementById("recentActivity");
        
        // Create activity from actual data
        const activities = [];
        
        // Add recent pending events
        const recentPendingEvents = allEvents
            .filter(e => e.status === 'pending')
            .slice(0, 2);
        
        recentPendingEvents.forEach(event => {
            activities.push({
                action: 'Event pending approval',
                details: `${event.title} by ${event.club?.name || 'Unknown Club'}`,
                time: 'Recently'
            });
        });
        
        // Add club activities if available
        if (allClubs.length > 0) {
            activities.push({
                action: 'Club registration',
                details: `${allClubs.length} clubs registered in system`,
                time: 'Active'
            });
        }
        
        // Add user activities
        const recentUsers = allUsers.slice(0, 2);
        recentUsers.forEach(user => {
            activities.push({
                action: 'User registered',
                details: `${user.name} (${user.role})`,
                time: 'Recently'
            });
        });
        
        // Add fallback activities if no real data
        if (activities.length === 0) {
            activities.push(
                { action: 'System initialized', details: 'Admin dashboard is ready', time: 'Just now' },
                { action: 'No recent activity', details: 'Activities will appear here', time: '--' }
            );
        }
        
        activityContainer.innerHTML = activities.map(activity => `
            <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg mb-2">
                <div class="bg-secondary text-white p-2 rounded-full">
                    <i class="fas fa-bell text-sm"></i>
                </div>
                <div class="flex-1">
                    <p class="font-medium text-sm">${activity.action}</p>
                    <p class="text-xs text-gray-600">${activity.details}</p>
                </div>
                <span class="text-xs text-gray-500 whitespace-nowrap">${activity.time}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error("Error loading recent activity:", error);
        document.getElementById("recentActivity").innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <i class="fas fa-exclamation-triangle mb-2"></i>
                <p>Unable to load recent activity</p>
            </div>
        `;
    }
}

// Refresh functions for each section
async function refreshEvents() {
    await loadAllEvents();
    renderEventsTable();
    await loadDashboardStats(); // Update stats when events change
}

async function refreshUsers() {
    await loadAllUsers();
    renderUsersTable();
    await loadDashboardStats(); // Update stats when users change
}

async function refreshClubs() {
    await loadAllClubs();
    renderClubsTable();
    await loadDashboardStats(); // Update stats when clubs change
}

async function refreshFunds() {
    await loadFundRequests();
    renderFundsTable();
}

// Render events table
function renderEventsTable() {
    const table = document.getElementById('eventTable');
    const filter = document.getElementById('eventFilter').value;
    
    let filteredEvents = allEvents;
    if (filter !== 'all') {
        filteredEvents = allEvents.filter(event => event.status === filter);
    }
    
    if (!filteredEvents || filteredEvents.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <i class="fas fa-calendar-times text-3xl mb-2 block"></i>
                    <p>No events found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = filteredEvents.map(event => {
        const statusColor = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'approved': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800'
        }[event.status] || 'bg-gray-100 text-gray-800';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-4 font-medium">${event.title}</td>
                <td class="py-3 px-4">${event.club?.name || 'Unknown Club'}</td>
                <td class="py-3 px-4">${new Date(event.date).toLocaleDateString()}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor}">
                        ${event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                </td>
                <td class="py-3 px-4 text-center">
                    <div class="flex justify-center space-x-2">
                        ${event.status === 'pending' ? `
                            <button onclick="approveEvent('${event._id}')" class="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600">
                                <i class="fas fa-check mr-1"></i>Approve
                            </button>
                            <button onclick="rejectEvent('${event._id}')" class="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600">
                                <i class="fas fa-times mr-1"></i>Reject
                            </button>
                        ` : ''}
                        <button onclick="viewEventDetails('${event._id}')" class="bg-secondary text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
                            <i class="fas fa-eye mr-1"></i>View
                        </button>
                        <button onclick="deleteEvent('${event._id}')" class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render users table
function renderUsersTable() {
    const table = document.getElementById('userTable');
    const filter = document.getElementById('userFilter').value;
    
    let filteredUsers = allUsers;
    if (filter !== 'all') {
        filteredUsers = allUsers.filter(user => user.role === filter);
    }
    
    if (!filteredUsers || filteredUsers.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <i class="fas fa-users-slash text-3xl mb-2 block"></i>
                    <p>No users found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = filteredUsers.map(user => {
        const roleColor = {
            'student': 'bg-blue-100 text-blue-800',
            'faculty': 'bg-purple-100 text-purple-800',
            'clubhead': 'bg-green-100 text-green-800',
            'admin': 'bg-red-100 text-red-800'
        }[user.role] || 'bg-gray-100 text-gray-800';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-4 font-medium">${user.username}</td>
                <td class="py-3 px-4">${user.name}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${roleColor}">
                        ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                </td>
                <td class="py-3 px-4">${user.email || 'N/A'}</td>
                <td class="py-3 px-4 text-center">
                    <div class="flex justify-center space-x-2">
                        <button onclick="editUser('${user._id}')" class="bg-secondary text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
                            <i class="fas fa-key mr-1"></i>Reset Pass
                        </button>
                        <button onclick="deleteUser('${user._id}')" class="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render clubs table
function renderClubsTable() {
    const table = document.getElementById('clubTable');
    
    if (!allClubs || allClubs.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <i class="fas fa-chess-queen text-3xl mb-2 block"></i>
                    <p>No clubs found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = allClubs.map(club => {
        const memberCount = club.members ? club.members.length : 0;
        const headUsername = club.headUsername || 'Not assigned';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-4 font-medium">${club.name}</td>
                <td class="py-3 px-4">
                    ${headUsername !== 'Not assigned' ? 
                        `<span class="text-green-600 font-semibold">${headUsername}</span>` : 
                        '<span class="text-red-500">Not assigned</span>'
                    }
                </td>
                <td class="py-3 px-4">
                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        ${memberCount} members
                    </span>
                </td>
                <td class="py-3 px-4">${club.description || 'No description'}</td>
                <td class="py-3 px-4 text-center">
                    <div class="flex justify-center space-x-2">
                        <button onclick="viewClubDetails('${club._id}')" class="bg-secondary text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
                            <i class="fas fa-eye mr-1"></i>View
                        </button>
                        <button onclick="editClub('${club._id}')" class="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600">
                            <i class="fas fa-edit mr-1"></i>Edit
                        </button>
                        <button onclick="deleteClub('${club._id}', '${club.name}')" class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render funds table
function renderFundsTable() {
    const table = document.getElementById('fundTable');
    
    if (!fundRequests || fundRequests.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <i class="fas fa-money-bill-wave text-3xl mb-2 block"></i>
                    <p>No fund requests found</p>
                    <p class="text-sm">Events with fund amounts will appear here</p>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = fundRequests.map(event => {
        const statusColor = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'approved': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800'
        }[event.status] || 'bg-gray-100 text-gray-800';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-4 font-medium">${event.title}</td>
                <td class="py-3 px-4">${event.club?.name || 'Unknown Club'}</td>
                <td class="py-3 px-4">₹${event.fundRequest ? event.fundRequest.toLocaleString() : '0'}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor}">
                        ${event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                </td>
                <td class="py-3 px-4 text-center">
                    <div class="flex justify-center space-x-2">
                        ${event.status === 'pending' ? `
                            <button onclick="approveEvent('${event._id}')" class="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600">
                                <i class="fas fa-check mr-1"></i>Approve
                            </button>
                            <button onclick="rejectEvent('${event._id}')" class="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600">
                                <i class="fas fa-times mr-1"></i>Reject
                            </button>
                        ` : ''}
                        <button onclick="openFundModal('${event._id}')" class="bg-secondary text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
                            <i class="fas fa-edit mr-1"></i>Modify Funds
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Event approval
async function approveEvent(eventId) {
    if (!confirm('Are you sure you want to approve this event?')) return;
    
    try {
        await apiRequest(`/admin/events/${eventId}/approve`, 'POST');
        alert('Event approved successfully!');
        await refreshEvents();
        await loadDashboardStats();
    } catch (error) {
        alert('Error approving event: ' + (error.message || 'Unknown error'));
    }
}

// Event rejection
async function rejectEvent(eventId) {
    if (!confirm('Are you sure you want to reject this event?')) return;
    
    try {
        await apiRequest(`/admin/events/${eventId}/reject`, 'POST');
        alert('Event rejected successfully!');
        await refreshEvents();
        await loadDashboardStats();
    } catch (error) {
        alert('Error rejecting event: ' + (error.message || 'Unknown error'));
    }
}

// View event details
function viewEventDetails(eventId) {
    const event = allEvents.find(e => e._id === eventId);
    if (event) {
        alert(`Event Details:\n\nTitle: ${event.title}\nClub: ${event.club?.name || 'Unknown'}\nDate: ${new Date(event.date).toLocaleString()}\nStatus: ${event.status}\nDescription: ${event.description || 'No description'}`);
    }
}

// Filter events
function filterEvents() {
    renderEventsTable();
}

// Filter users
function filterUsers() {
    renderUsersTable();
}

// Edit user (direct reset password override)
async function editUser(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;
    
    const newPassword = prompt(`Reset password for ${user.role} '${user.username}' (${user.name}):\n\nEnter new password (minimum 8 characters):`);
    if (newPassword === null) return; // user cancelled
    
    if (newPassword.trim() === "") {
        alert("❌ Password cannot be empty.");
        return;
    }
    
    if (newPassword.length < 8) {
        alert("❌ Password must be at least 8 characters long.");
        return;
    }
    
    try {
        const result = await apiRequest(`/admin/users/${userId}/reset-password`, 'POST', { newPassword });
        if (result.message) {
            alert(result.message);
        } else {
            alert('Error: ' + (result.error || 'Password reset failed'));
        }
    } catch (error) {
        console.error('Password reset error:', error);
        alert('Error: ' + (error.message || 'Unknown error'));
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('⚠️ PERMANENT DELETE!\n\nThis user will be COMPLETELY REMOVED from the database.\n userdata is removed completely .\n\nContinue?')) return;
    
    try {
        const result = await apiRequest(`/admin/users/${userId}`, 'DELETE');
        
        if (result.message) {
            alert('✅ User permanently deleted !');
            allUsers = allUsers.filter(user => user._id !== userId);
            renderUsersTable();
            await loadDashboardStats(); // Update stats after deletion
        } else {
            alert('Error: ' + (result.error || 'Deletion failed'));
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting user: ' + (error.message || 'Unknown error'));
    }
}

// View club details
function viewClubDetails(clubId) {
    const club = allClubs.find(c => c._id === clubId);
    if (club) {
        const memberCount = club.members ? club.members.length : 0;
        const pendingCount = club.pendingRequests ? club.pendingRequests.length : 0;
        
        alert(`🏛️ Club Details:\n\n` +
              `Name: ${club.name}\n` +
              `Head: ${club.headUsername || 'Not assigned'}\n` +
              `Members: ${memberCount} students\n` +
              `Pending Requests: ${pendingCount}\n` +
              `Description: ${club.description || 'No description'}\n` +
              `Slug: ${club.slug || 'N/A'}`);
    }
}

// Edit club
function editClub(clubId) {
    const club = allClubs.find(c => c._id === clubId);
    if (club) {
        alert(`Edit club: ${club.name}\n\nThis feature would open a club edit form in a real implementation.`);
    }
}

// Open fund modal
function openFundModal(requestId) {
    const request = fundRequests.find(r => r._id === requestId);
    if (request) {
        document.getElementById('fundEventId').value = request._id;
        document.getElementById('fundEventTitle').textContent = `${request.title} - ${request.club?.name || 'Unknown Club'}`;
        document.getElementById('fundAmount').value = request.fundRequest || 0;
        document.getElementById('fundModal').classList.remove('hidden');
    }
}

// Close fund modal
function closeFundModal() {
    document.getElementById('fundModal').classList.add('hidden');
    document.getElementById('fundForm').reset();
}

// Handle fund form submission
document.getElementById('fundForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('fundEventId').value;
    const approvedAmount = parseInt(document.getElementById('fundAmount').value);
    
    if (!approvedAmount || approvedAmount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    try {
        const result = await apiRequest(`/admin/events/${eventId}/update-funds`, 'POST', {
            approvedFund: approvedAmount
        });
        
        if (result.message) {
            alert(`Approved funds updated to ₹${approvedAmount.toLocaleString()} successfully!`);
            closeFundModal();
            await refreshFunds();
        } else {
            alert('Error: ' + (result.error || 'Failed to update funds'));
        }
        
    } catch (error) {
        console.error('Error updating fund amount:', error);
        alert('Error updating fund amount: ' + (error.message || 'Unknown error'));
    }
});

// Generate reports
async function generateReport(type) {
    const reportContainer = document.getElementById('reportContainer');
    
    try {
        // Calculate statistics from actual data
        const totalClubs = allClubs.length;
        const totalUsers = allUsers.length;
        const totalEvents = allEvents.length;
        const pendingEvents = allEvents.filter(e => e.status === 'pending').length;
        const approvedEvents = allEvents.filter(e => e.status === 'approved').length;
        const rejectedEvents = allEvents.filter(e => e.status === 'rejected').length;
        
        const totalFundsRequested = fundRequests.reduce((sum, req) => sum + (req.fundRequest || 0), 0);
        const approvedFunds = fundRequests
            .filter(req => req.status === 'approved')
            .reduce((sum, req) => sum + (req.fundRequest || 0), 0);
        
        // Generate report content
        const reportContent = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-slate-800/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Clubs</span>
                        <div class="flex items-baseline justify-between mt-2">
                            <span class="text-2xl font-bold text-white">${totalClubs}</span>
                            <span class="text-blue-500 bg-blue-500/10 text-xs px-2 py-0.5 rounded-full">Active</span>
                        </div>
                    </div>
                    <div class="bg-slate-800/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</span>
                        <div class="flex items-baseline justify-between mt-2">
                            <span class="text-2xl font-bold text-white">${totalUsers}</span>
                            <span class="text-purple-500 bg-purple-500/10 text-xs px-2 py-0.5 rounded-full">Enrolled</span>
                        </div>
                    </div>
                    <div class="bg-slate-800/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Events</span>
                        <div class="flex items-baseline justify-between mt-2">
                            <span class="text-2xl font-bold text-white">${totalEvents}</span>
                            <span class="text-emerald-500 bg-emerald-500/10 text-xs px-2 py-0.5 rounded-full">${approvedEvents} Appr.</span>
                        </div>
                    </div>
                    <div class="bg-slate-800/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Funds</span>
                        <div class="flex items-baseline justify-between mt-2">
                            <span class="text-xl font-bold text-emerald-400">₹${approvedFunds.toLocaleString()}</span>
                            <span class="text-slate-400 text-xs">of ₹${totalFundsRequested.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <h4 class="text-md font-bold text-slate-100 mt-6 mb-3 flex items-center gap-2">
                    <i class="fas fa-list text-blue-400 text-sm"></i> Detailed Club Performance
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${allClubs.map(club => {
                        const memberCount = club.members ? club.members.length : 0;
                        const clubEvents = allEvents.filter(e => e.club?._id === club._id).length;
                        return `
                            <div class="flex justify-between items-center p-3 bg-slate-800/35 border border-slate-800/60 rounded-xl hover:bg-slate-800/50 transition-colors">
                                <span class="font-medium text-slate-200">${club.name}</span>
                                <div class="text-xs flex gap-3">
                                    <span class="text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded">${memberCount} members</span>
                                    <span class="text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded">${clubEvents} events</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        reportContainer.innerHTML = reportContent;
        
        // Trigger SVG charts rendering
        drawClubParticipationChart();
        drawEventStatusChart();
        
        if (type === 'pdf') {
            const element = document.getElementById('reports');
            if (!element) return;
            
            const opt = {
                margin:       12,
                filename:     `kmit_clubs_report_${new Date().toISOString().slice(0,10)}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            const buttons = document.querySelector('#reports .flex.space-x-3');
            if (buttons) buttons.style.visibility = 'hidden';
            
            html2pdf().set(opt).from(element).save().then(() => {
                if (buttons) buttons.style.visibility = 'visible';
            }).catch(err => {
                console.error("PDF export error:", err);
                alert("Failed to export PDF: " + err.message);
                if (buttons) buttons.style.visibility = 'visible';
            });
        } else if (type === 'csv') {
            const pendingCount = allEvents.filter(e => e.status === 'pending').length;
            const approvedCount = allEvents.filter(e => e.status === 'approved').length;
            const rejectedCount = allEvents.filter(e => e.status === 'rejected').length;
            
            let csvText = "KMIT CLUBS HUBS - REPORTS & ANALYTICS\n";
            csvText += `Generated on,${new Date().toLocaleString()}\n\n`;
            
            csvText += "SYSTEM METRICS\n";
            csvText += "Metric,Count/Amount\n";
            csvText += `Total Clubs,${totalClubs}\n`;
            csvText += `Total Users,${totalUsers}\n`;
            csvText += `Total Events,${totalEvents}\n`;
            csvText += `Approved Funds (INR),${approvedFunds}\n`;
            csvText += `Total Funds Requested (INR),${totalFundsRequested}\n\n`;
            
            csvText += "CLUB PARTICIPATION\n";
            csvText += "Club Name,Members Count,Events Count\n";
            allClubs.forEach(c => {
                const memberCount = c.members ? c.members.length : 0;
                const clubEvents = allEvents.filter(e => e.club?._id === c._id).length;
                csvText += `"${c.name}",${memberCount},${clubEvents}\n`;
            });
            csvText += "\n";
            
            csvText += "EVENT STATUS DISTRIBUTION\n";
            csvText += "Status,Count\n";
            csvText += `Approved,${approvedCount}\n`;
            csvText += `Pending,${pendingCount}\n`;
            csvText += `Rejected,${rejectedCount}\n`;
            
            const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `kmit_clubs_report_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        reportContainer.innerHTML = '<p class="text-red-500">Error generating report</p>';
    }
}

// Global Tooltip controls
function showTooltip(event, title, value) {
    let tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chart-tooltip';
        tooltip.className = 'fixed bg-slate-900/95 text-white text-xs rounded-lg p-2 shadow-xl border border-slate-700/50 pointer-events-none transition-opacity duration-200 z-50';
        document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = `<div class="font-bold">${title}</div><div class="text-slate-300 mt-0.5">${value}</div>`;
    tooltip.style.opacity = '1';
    
    // Track cursor positioning
    const updatePosition = (e) => {
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top = (e.clientY + 12) + 'px';
    };
    updatePosition(event);
}

function hideTooltip() {
    const tooltip = document.getElementById('chart-tooltip');
    if (tooltip) {
        tooltip.style.opacity = '0';
    }
}

// Programmatic interactive SVG Horizontal Bar Chart for Club Participation
function drawClubParticipationChart() {
    const container = document.getElementById('clubParticipationChart');
    if (!container) return;

    if (allClubs.length === 0) {
        container.innerHTML = `<p class="text-slate-500 text-sm">No club data available</p>`;
        return;
    }

    // Sort clubs descending by member count
    const sortedClubs = [...allClubs].sort((a, b) => {
        const aCount = a.members ? a.members.length : 0;
        const bCount = b.members ? b.members.length : 0;
        return bCount - aCount;
    });

    const width = 600;
    const barHeight = 25;
    const barGap = 15;
    const paddingLeft = 140;
    const paddingRight = 40;
    const paddingTop = 25;
    const paddingBottom = 25;
    
    const height = sortedClubs.length * (barHeight + barGap) + paddingTop + paddingBottom;
    const chartWidth = width - paddingLeft - paddingRight;

    const maxMembers = Math.max(...sortedClubs.map(c => c.members ? c.members.length : 0), 1);

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="w-full h-full" style="font-family: 'Outfit', sans-serif;">
        <defs>
            <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#3b82f6" />
                <stop offset="100%" stop-color="#6366f1" />
            </linearGradient>
            <filter id="barShadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.2"/>
            </filter>
        </defs>`;

    sortedClubs.forEach((club, index) => {
        const count = club.members ? club.members.length : 0;
        const barWidth = (count / maxMembers) * chartWidth;
        const y = paddingTop + index * (barHeight + barGap);

        svg += `
        <g class="cursor-pointer group" 
           onmouseover="showTooltip(event, '${club.name}', '${count} Members')" 
           onmousemove="showTooltip(event, '${club.name}', '${count} Members')" 
           onmouseout="hideTooltip()">
            <!-- Club Name Label -->
            <text x="${paddingLeft - 15}" y="${y + barHeight/2 + 5}" text-anchor="end" class="text-xs font-semibold fill-slate-300 transition-colors group-hover:fill-blue-400">${club.name}</text>
            
            <!-- Grey Background Bar track -->
            <rect x="${paddingLeft}" y="${y}" width="${chartWidth}" height="${barHeight}" rx="6" fill="#1e293b" />
            
            <!-- Colored Fill Bar -->
            <rect x="${paddingLeft}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="url(#barGrad)" filter="url(#barShadow)" class="transition-all duration-300 hover:opacity-90">
                <animate attributeName="width" from="0" to="${barWidth}" dur="0.8s" fill="freeze" />
            </rect>
            
            <!-- Value text -->
            <text x="${paddingLeft + barWidth + 8}" y="${y + barHeight/2 + 5}" class="text-xs font-bold fill-slate-300">${count}</text>
        </g>`;
    });

    svg += `</svg>`;
    container.innerHTML = svg;
}

// Programmatic interactive SVG Donut Chart for Event Status Distribution
function drawEventStatusChart() {
    const container = document.getElementById('eventStatusChart');
    if (!container) return;

    const total = allEvents.length;
    if (total === 0) {
        container.innerHTML = `<p class="text-slate-500 text-sm">No event data available</p>`;
        return;
    }

    const approvedCount = allEvents.filter(e => e.status === 'approved').length;
    const pendingCount = allEvents.filter(e => e.status === 'pending').length;
    const rejectedCount = allEvents.filter(e => e.status === 'rejected').length;

    const r = 70;
    const circumference = 2 * Math.PI * r;
    
    const approvedPct = ((approvedCount / total) * 100).toFixed(0);
    const pendingPct = ((pendingCount / total) * 100).toFixed(0);
    const rejectedPct = ((rejectedCount / total) * 100).toFixed(0);

    const approvedLen = (approvedCount / total) * circumference;
    const pendingLen = (pendingCount / total) * circumference;
    const rejectedLen = (rejectedCount / total) * circumference;

    let svg = `<svg viewBox="0 0 300 240" class="w-full h-full" style="font-family: 'Outfit', sans-serif;">
        <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
            </filter>
        </defs>
        
        <!-- Donut slices rotated to start at the top -->
        <g transform="rotate(-90 120 120)" filter="url(#glow)">
    `;

    let currentOffset = 0;

    // Approved Slice (Green)
    if (approvedCount > 0) {
        svg += `
        <circle cx="120" cy="120" r="${r}" fill="transparent" 
                stroke="#10b981" stroke-width="22" 
                stroke-dasharray="${approvedLen} ${circumference}" 
                stroke-dashoffset="${-currentOffset}"
                class="cursor-pointer transition-all duration-300 hover:stroke-[26px]"
                onmouseover="showTooltip(event, 'Approved Events', '${approvedCount} (${approvedPct}%)')" 
                onmousemove="showTooltip(event, 'Approved Events', '${approvedCount} (${approvedPct}%)')" 
                onmouseout="hideTooltip()">
            <animate attributeName="stroke-dasharray" from="0 ${circumference}" to="${approvedLen} ${circumference}" dur="0.8s" fill="freeze" />
        </circle>`;
        currentOffset += approvedLen;
    }

    // Pending Slice (Yellow)
    if (pendingCount > 0) {
        svg += `
        <circle cx="120" cy="120" r="${r}" fill="transparent" 
                stroke="#f59e0b" stroke-width="22" 
                stroke-dasharray="${pendingLen} ${circumference}" 
                stroke-dashoffset="${-currentOffset}"
                class="cursor-pointer transition-all duration-300 hover:stroke-[26px]"
                onmouseover="showTooltip(event, 'Pending Events', '${pendingCount} (${pendingPct}%)')" 
                onmousemove="showTooltip(event, 'Pending Events', '${pendingCount} (${pendingPct}%)')" 
                onmouseout="hideTooltip()">
            <animate attributeName="stroke-dasharray" from="0 ${circumference}" to="${pendingLen} ${circumference}" dur="0.8s" fill="freeze" />
        </circle>`;
        currentOffset += pendingLen;
    }

    // Rejected Slice (Red)
    if (rejectedCount > 0) {
        svg += `
        <circle cx="120" cy="120" r="${r}" fill="transparent" 
                stroke="#ef4444" stroke-width="22" 
                stroke-dasharray="${rejectedLen} ${circumference}" 
                stroke-dashoffset="${-currentOffset}"
                class="cursor-pointer transition-all duration-300 hover:stroke-[26px]"
                onmouseover="showTooltip(event, 'Rejected Events', '${rejectedCount} (${rejectedPct}%)')" 
                onmousemove="showTooltip(event, 'Rejected Events', '${rejectedCount} (${rejectedPct}%)')" 
                onmouseout="hideTooltip()">
            <animate attributeName="stroke-dasharray" from="0 ${circumference}" to="${rejectedLen} ${circumference}" dur="0.8s" fill="freeze" />
        </circle>`;
        currentOffset += rejectedLen;
    }

    svg += `
        </g>
        
        <!-- Center Labels -->
        <text x="120" y="115" text-anchor="middle" class="text-[10px] font-bold fill-slate-400 uppercase tracking-wider">Total</text>
        <text x="120" y="134" text-anchor="middle" class="text-2xl font-extrabold fill-slate-100">${total}</text>
        <text x="120" y="146" text-anchor="middle" class="text-[9px] font-semibold fill-slate-400">Events</text>

        <!-- Legends (right-hand column list) -->
        <g transform="translate(205, 45)">
            <!-- Approved -->
            <g class="cursor-pointer" 
               onmouseover="showTooltip(event, 'Approved', '${approvedCount} Events')" 
               onmousemove="showTooltip(event, 'Approved', '${approvedCount} Events')" 
               onmouseout="hideTooltip()">
                <rect x="0" y="0" width="12" height="12" rx="3" fill="#10b981" />
                <text x="18" y="10" class="text-xs font-semibold fill-slate-200">Approved</text>
                <text x="18" y="22" class="text-[10px] font-bold fill-slate-400">${approvedCount} (${approvedPct}%)</text>
            </g>

            <!-- Pending -->
            <g class="cursor-pointer" transform="translate(0, 48)" 
               onmouseover="showTooltip(event, 'Pending', '${pendingCount} Events')" 
               onmousemove="showTooltip(event, 'Pending', '${pendingCount} Events')" 
               onmouseout="hideTooltip()">
                <rect x="0" y="0" width="12" height="12" rx="3" fill="#f59e0b" />
                <text x="18" y="10" class="text-xs font-semibold fill-slate-200">Pending</text>
                <text x="18" y="22" class="text-[10px] font-bold fill-slate-400">${pendingCount} (${pendingPct}%)</text>
            </g>

            <!-- Rejected -->
            <g class="cursor-pointer" transform="translate(0, 96)" 
               onmouseover="showTooltip(event, 'Rejected', '${rejectedCount} Events')" 
               onmousemove="showTooltip(event, 'Rejected', '${rejectedCount} Events')" 
               onmouseout="hideTooltip()">
                <rect x="0" y="0" width="12" height="12" rx="3" fill="#ef4444" />
                <text x="18" y="10" class="text-xs font-semibold fill-slate-200">Rejected</text>
                <text x="18" y="22" class="text-[10px] font-bold fill-slate-400">${rejectedCount} (${rejectedPct}%)</text>
            </g>
        </g>
    </svg>`;

    container.innerHTML = svg;
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

// Add Club Modal operations
function openAddClubModal() {
    document.getElementById('addClubModal').classList.remove('hidden');
    document.getElementById('addClubModal').classList.add('flex');
}

function closeAddClubModal() {
    document.getElementById('addClubModal').classList.add('hidden');
    document.getElementById('addClubModal').classList.remove('flex');
    document.getElementById('addClubForm').reset();
}

// Add Club Form submission handler
window.addEventListener('DOMContentLoaded', () => {
    const addClubForm = document.getElementById('addClubForm');
    if (addClubForm) {
        addClubForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('newClubName').value.trim();
            const slug = document.getElementById('newClubSlug').value.trim();
            const headUsername = document.getElementById('newClubHeadUsername').value.trim();
            const description = document.getElementById('newClubDescription').value.trim();
            const image = document.getElementById('newClubImage').value.trim();
            
            // Validate headUsername ending with -Head
            if (!/^[A-Za-z0-9]+-Head$/i.test(headUsername)) {
                alert("❌ Club Head Username must end with '-Head' (e.g. Mudra-Head)");
                return;
            }
            
            try {
                const result = await apiRequest("/admin/clubs", "POST", {
                    name,
                    slug,
                    description,
                    image: image || "kmit.png",
                    headUsername
                });
                
                if (result.club) {
                    alert(`✅ Club "${name}" added successfully!`);
                    closeAddClubModal();
                    await refreshClubs();
                } else {
                    alert('Error adding club: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error("Error adding club:", error);
                alert("Error adding club: " + (error.message || "Server error"));
            }
        });
    }
});

// Delete Club function
async function deleteClub(clubId, clubName) {
    if (!confirm(`⚠️ WARNING!\n\nAre you sure you want to delete the club "${clubName}"?\nThis will permanently delete the club, all its events, its club head account, and all student membership associations.\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const result = await apiRequest(`/admin/clubs/${clubId}`, 'DELETE');
        if (result.message) {
            alert('✅ ' + result.message);
            await refreshClubs();
            await refreshEvents(); // Events will be deleted too
        } else {
            alert('Error: ' + (result.error || 'Failed to delete club'));
        }
    } catch (error) {
        console.error('Delete club error:', error);
        alert('Error deleting club: ' + (error.message || 'Unknown error'));
    }
}

// Delete Event function
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await apiRequest(`/admin/events/${eventId}`, 'DELETE');
        if (result.message) {
            alert('✅ Event deleted successfully!');
            await refreshEvents();
        } else {
            alert('Error: ' + (result.error || 'Failed to delete event'));
        }
    } catch (error) {
        console.error('Delete event error:', error);
        alert('Error deleting event: ' + (error.message || 'Unknown error'));
    }
}

// --- CSV PARSING AND IMPORT/EXPORT FUNCTIONALITY ---

// Simple client-side CSV parser that handles quotes and commas
function parseCSV(text) {
    const lines = text.split('\n');
    if (lines.length === 0) return [];
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' || char === "'") {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                values.push(currentValue.trim().replace(/^["']|["']$/g, ''));
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim().replace(/^["']|["']$/g, ''));
        
        if (values.length > 0) {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            result.push(obj);
        }
    }
    return result;
}

// User CSV Import
function importUsersCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const text = e.target.result;
            const parsed = parseCSV(text);
            
            if (parsed.length === 0) {
                alert("⚠️ CSV file is empty or formatted incorrectly. Make sure headers are present (e.g. role,username,name,email,password).");
                return;
            }
            
            // Check that required headers are there
            const first = parsed[0];
            if (!('role' in first) || !('username' in first)) {
                alert("⚠️ Required headers 'role' and 'username' are missing. CSV must include headers: role,username,name,email,password");
                return;
            }
            
            const response = await apiRequest("/admin/users/import", "POST", { users: parsed });
            if (response.message) {
                let msg = response.message;
                if (response.errors && response.errors.length > 0) {
                    msg += "\n\nSkipped details:\n" + response.errors.join("\n");
                }
                alert(msg);
                await refreshUsers();
            } else {
                alert("Error importing users: " + (response.error || "Unknown error"));
            }
        } catch (err) {
            console.error("CSV parse error:", err);
            alert("Failed to parse CSV file: " + err.message);
        } finally {
            // Reset input value
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// User CSV Export
function exportUsersCSV() {
    if (allUsers.length === 0) {
        alert("No users available to export.");
        return;
    }
    
    let csvText = "role,username,name,email\n";
    allUsers.forEach(u => {
        csvText += `"${u.role || ''}","${u.username || ''}","${u.name || ''}","${u.email || ''}"\n`;
    });
    
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kmit_users_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Club CSV Import
function importClubsCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const text = e.target.result;
            const parsed = parseCSV(text);
            
            if (parsed.length === 0) {
                alert("⚠️ CSV file is empty or formatted incorrectly. Make sure headers are present (e.g. name,slug,description,headusername,image).");
                return;
            }
            
            const first = parsed[0];
            if (!('name' in first) || !('slug' in first)) {
                alert("⚠️ Required headers 'name' and 'slug' are missing. CSV must include headers: name,slug,description,headusername,image");
                return;
            }
            
            // Map header fields correctly
            const mapped = parsed.map(c => ({
                name: c.name,
                slug: c.slug,
                description: c.description || '',
                headUsername: c.headusername || c.headUsername || '',
                image: c.image || 'kmit.png'
            }));
            
            const response = await apiRequest("/admin/clubs/import", "POST", { clubs: mapped });
            if (response.message) {
                let msg = response.message;
                if (response.errors && response.errors.length > 0) {
                    msg += "\n\nSkipped details:\n" + response.errors.join("\n");
                }
                alert(msg);
                await refreshClubs();
            } else {
                alert("Error importing clubs: " + (response.error || "Unknown error"));
            }
        } catch (err) {
            console.error("CSV parse error:", err);
            alert("Failed to parse CSV file: " + err.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// Club CSV Export
function exportClubsCSV() {
    if (allClubs.length === 0) {
        alert("No clubs available to export.");
        return;
    }
    
    let csvText = "name,slug,headUsername,description,image\n";
    allClubs.forEach(c => {
        csvText += `"${c.name || ''}","${c.slug || ''}","${c.headUsername || ''}","${c.description || ''}","${c.image || ''}"\n`;
    });
    
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kmit_clubs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Load and render Password Reset Requests
async function loadResetRequests() {
    const tableBody = document.getElementById("resetRequestsTable");
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="py-8 text-center text-gray-500">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p>Loading reset requests...</p>
            </td>
        </tr>
    `;
    
    try {
        const requests = await apiRequest("/admin/reset-requests");
        if (!requests || requests.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-gray-500">
                        <i class="fas fa-check-circle text-emerald-500 text-3xl mb-2 block"></i>
                        <p class="font-semibold text-slate-800 text-sm">No pending reset requests</p>
                        <p class="text-xs text-slate-400 mt-1">All requests have been resolved or the system is clear!</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = requests.map(req => {
            const formattedDate = new Date(req.createdAt).toLocaleString();
            const roleColor = req.role === 'student' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="py-3 px-6 font-medium text-slate-800">${req.username}</td>
                    <td class="py-3 px-6">
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColor}">
                            ${req.role.charAt(0).toUpperCase() + req.role.slice(1)}
                        </span>
                    </td>
                    <td class="py-3 px-6">${req.contactEmail}</td>
                    <td class="py-3 px-6 text-sm text-slate-600 max-w-xs truncate" title="${req.reason || ''}">${req.reason || 'N/A'}</td>
                    <td class="py-3 px-6 text-sm text-slate-500">${formattedDate}</td>
                    <td class="py-3 px-6 text-center">
                        <button onclick="resolveResetRequest('${req._id}', '${req.username}', '${req.role}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md">
                            <i class="fas fa-key mr-1"></i>Resolve & Reset
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (error) {
        console.error("Error loading reset requests:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2 block"></i>
                    <p>Failed to load reset requests</p>
                    <p class="text-xs mt-1">${error.message || 'Unknown error'}</p>
                </td>
            </tr>
        `;
    }
}

// Resolve and Reset password for a specific request
async function resolveResetRequest(requestId, username, role) {
    const newPassword = prompt(`Resolve Password Reset Request:\n\nUser: ${username} (${role})\n\nEnter new password for this user (minimum 8 characters):`);
    if (newPassword === null) return; // User cancelled
    
    if (newPassword.trim() === "") {
        alert("❌ Password cannot be empty.");
        return;
    }
    
    if (newPassword.length < 8) {
        alert("❌ Password must be at least 8 characters long.");
        return;
    }
    
    try {
        const result = await apiRequest(`/admin/reset-requests/${requestId}/resolve`, 'POST', { newPassword });
        if (result.message) {
            alert(result.message);
            // Reload the table
            await loadResetRequests();
        } else {
            alert('Error: ' + (result.error || 'Failed to resolve request'));
        }
    } catch (error) {
        console.error("Resolve request error:", error);
        alert('Error: ' + (error.message || 'Unknown error'));
    }
}

window.allPayments = [];

async function loadPaymentsLedger() {
    try {
        const list = document.getElementById("paymentsLedgerTable");
        list.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-gray-500">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p>Loading payments ledger...</p>
                </td>
            </tr>`;
            
        const payments = await apiRequest("/admin/payments");
        if (payments.error) {
            list.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-red-500">Error: ${payments.error}</td></tr>`;
            return;
        }
        
        window.allPayments = payments || [];
        
        // Calculate metrics
        let totalRevenue = 0;
        let paidTxns = 0;
        let freeRegs = 0;
        
        window.allPayments.forEach(p => {
            if (p.amountPaid > 0) {
                totalRevenue += p.amountPaid;
                paidTxns++;
            } else {
                freeRegs++;
            }
        });
        
        document.getElementById("ledgerTotalRevenue").innerText = `₹${totalRevenue}`;
        document.getElementById("ledgerTotalTxns").innerText = paidTxns;
        document.getElementById("ledgerTotalFree").innerText = freeRegs;
        
        // Reset search input
        const searchInput = document.getElementById("ledgerSearchInput");
        if (searchInput) searchInput.value = "";
        
        renderPaymentsLedgerTable(window.allPayments);
    } catch (error) {
        console.error("Error loading payments ledger:", error);
        document.getElementById("paymentsLedgerTable").innerHTML = `<tr><td colspan="6" class="py-4 text-center text-red-500">Failed to load payments.</td></tr>`;
    }
}

function renderPaymentsLedgerTable(payments) {
    const list = document.getElementById("paymentsLedgerTable");
    if (!list) return;
    
    if (payments.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-gray-500">
                    <p class="font-medium text-slate-400">No payment records found.</p>
                </td>
            </tr>`;
        return;
    }
    
    list.innerHTML = payments.map(p => {
        const student = p.student || {};
        const event = p.event || {};
        const club = event.club || {};
        const isFree = p.amountPaid === 0;
        const payMethodText = p.paymentMethod === 'phonepe' ? 'PhonePe Gateway' : p.paymentMethod === 'upi_qr' ? 'PhonePe QR' : p.paymentMethod === 'upi_id' ? `UPI ID` : p.paymentMethod === 'legacy' ? 'Legacy' : 'Free';
        const payDate = new Date(p.createdAt).toLocaleString();
        
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="py-4 px-6">
                    <p class="font-semibold text-slate-800 text-xs">${student.name || 'Unknown Student'}</p>
                    <p class="text-[10px] text-slate-500 font-mono">${student.username || 'N/A'}</p>
                </td>
                <td class="py-4 px-6 text-xs text-slate-700 font-medium">${event.title || 'Unknown Event'}</td>
                <td class="py-4 px-6 text-xs text-slate-600">${club.name || 'N/A'}</td>
                <td class="py-4 px-6">
                    <span class="${isFree ? 'bg-slate-100 text-slate-800' : 'bg-emerald-100 text-emerald-800'} text-[10px] font-bold px-2 py-0.5 rounded-full inline-block shadow-sm">
                        ${isFree ? 'Free Entry' : 'Paid ₹' + p.amountPaid}
                    </span>
                </td>
                <td class="py-4 px-6 font-mono text-[10px] text-slate-500">
                    ${!isFree ? `
                        <p class="font-semibold text-slate-700">${p.transactionId}</p>
                        <p class="text-[9px] text-slate-400 font-sans mt-0.5">${payMethodText} ${p.upiId ? `(${p.upiId})` : ''}</p>
                    ` : `
                        <span class="text-slate-400">-</span>
                    `}
                </td>
                <td class="py-4 px-6 text-xs text-slate-500 font-medium">${payDate}</td>
            </tr>
        `;
    }).join('');
}

function filterPaymentsLedger() {
    const query = document.getElementById("ledgerSearchInput").value.trim().toLowerCase();
    
    if (!query) {
        renderPaymentsLedgerTable(window.allPayments);
        return;
    }
    
    const filtered = window.allPayments.filter(p => {
        const student = p.student || {};
        const event = p.event || {};
        const club = event.club || {};
        
        return (
            (student.name && student.name.toLowerCase().includes(query)) ||
            (student.username && student.username.toLowerCase().includes(query)) ||
            (event.title && event.title.toLowerCase().includes(query)) ||
            (club.name && club.name.toLowerCase().includes(query))
        );
    });
    
    renderPaymentsLedgerTable(filtered);
}