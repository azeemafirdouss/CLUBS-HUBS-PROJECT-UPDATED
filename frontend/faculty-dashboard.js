// Faculty Coordinator Dashboard Logic

window.onload = async function() {
    const role = localStorage.getItem('role');
    if (!getToken() || role !== "faculty") {
        alert("Please login as Faculty first!");
        window.location.href = "login.html";
        return;
    }
    document.getElementById("today-date").innerText = new Date().toDateString();

    // Fetch all data from the new, combined dashboard endpoint
    const res = await apiRequest("/faculty/dashboard?_=" + new Date().getTime());
    if (res.error) {
        document.body.innerHTML = `<h2>Error: ${res.error}</h2>`;
        return;
    }

    // Populate the dashboard cards with real data
    document.querySelector('#pendingApprovalsCard p').innerText = res.pendingEvents.length;
    document.querySelector('#usersManagedCard p').innerText = res.allUsers.length;
    
    // Find clubs count card and update
    const clubsCardCount = document.querySelector('.stats-card-3 p');
    if (clubsCardCount) {
        clubsCardCount.innerText = res.clubs.length;
    }

    renderPendingEvents(res.pendingEvents);
    renderClubs(res.clubs);
    renderUsers(res.allUsers);
    
    // Load notifications into the timeline
    await loadFacultyNotifications();
};

function renderPendingEvents(events) {
    const list = document.getElementById("pendingEventsList");
    if (!events || events.length === 0) {
        list.innerHTML = "<div class='text-slate-500 text-sm py-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50'>No pending event proposals.</div>";
        return;
    }
    list.innerHTML = events.map(event => `
        <div class="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-sm transition-all duration-200 gap-4 flex-wrap md:flex-nowrap">
            <div>
                <p class="font-extrabold text-slate-800 text-base">${event.title} <span class="text-xs font-normal text-slate-400">by ${event.club.name}</span></p>
                <p class="text-sm text-slate-500 mt-1">${event.description}</p>
                <div class="flex gap-3 text-xs text-slate-400 mt-2 font-medium">
                  <span>📅 Date: ${new Date(event.date).toLocaleDateString()}</span>
                  <span>💰 Funds Req: ₹${event.fundRequest || 0}</span>
                  <span>🎟️ Fee: ₹${event.registrationFee || 0}</span>
                </div>
            </div>
            <div class="flex gap-2 flex-shrink-0">
                <button class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200" onclick="respondToEvent('${event._id}', 'approved')">Approve</button>
                <button class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 ml-1" onclick="respondToEvent('${event._id}', 'rejected')">Reject</button>
            </div>
        </div>
    `).join("");
}

function renderUsers(users) {
    const tbody = document.getElementById("manageUsersTableBody");
    if (!tbody) return;
    if (!users || users.length === 0){
        tbody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-slate-500 text-sm">No active student or club head accounts found.</td></tr>`;
        return;
    }
    tbody.innerHTML = users.map(user => `
        <tr class="hover:bg-slate-50/50 transition-colors">
            <td class="p-4 border-b border-slate-100 text-slate-800 font-semibold text-sm">${user.name || user.username}</td>
            <td class="p-4 border-b border-slate-100 text-sm">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${user.role === 'Student' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}">
                ${user.role}
              </span>
            </td>
            <td class="p-4 border-b border-slate-100 text-slate-500 font-mono text-xs">${user.username}</td>
        </tr>
    `).join("");
}

function renderClubs(clubs) {
    const container = document.getElementById("clubDetailsContainer");
    if (!container) return;
    if (!clubs || clubs.length === 0) {
        container.innerHTML = "<p class='text-slate-500 text-sm py-4'>No clubs listed.</p>";
        return;
    }
    container.innerHTML = clubs.map(club => `
        <div class="border border-slate-100 bg-slate-50/50 rounded-2xl p-5 mb-4 hover:shadow-sm transition-all duration-200 flex justify-between items-center gap-4 flex-wrap">
            <div>
                <p class="font-extrabold text-slate-800 text-lg">${club.name}</p>
                <p class="text-xs text-slate-500 mt-1">Club Head Username: <span class="font-mono text-slate-700">${club.headUsername || 'Not Assigned'}</span></p>
            </div>
            <div class="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-center">
                <span class="text-xs font-semibold text-indigo-500 uppercase tracking-widest block">Total Members</span>
                <span class="text-xl font-black">${club.members.length}</span>
            </div>
        </div>
    `).join("");
}

async function respondToEvent(eventId, action) {
    if (!confirm(`Are you sure you want to ${action} this event?`)) return;
    const res = await apiRequest("/faculty/events/respond", "POST", { eventId, action });
    if (res.message) {
        alert(res.message);
        window.location.reload();
    } else {
        alert("Error: " + (res.error || "Failed to respond."));
    }
}

async function loadFacultyNotifications() {
    try {
        const timeline = document.getElementById("facultyNotificationsTimeline");
        if (!timeline) return;

        const notifications = await apiRequest("/student/notifications");
        
        if (notifications.error) {
            timeline.innerHTML = `<p class="text-red-500 py-2 text-sm">Error loading activities: ${notifications.error}</p>`;
            return;
        }
        
        if (!notifications || notifications.length === 0) {
            timeline.innerHTML = `
                <div class="text-center py-6 text-slate-500 text-sm">
                    <p>No activity logs stored in the system yet.</p>
                </div>`;
            return;
        }
        
        const typeIcons = {
            'club': '🏛️',
            'event': '📅',
            'announcement': '📢',
            'general': 'ℹ️'
        };
        
        // Update stats card for notifications
        const notifCardCount = document.querySelector('.stats-card-4 p');
        if (notifCardCount) {
            notifCardCount.innerText = notifications.length;
        }

        timeline.innerHTML = notifications.map(notif => {
            const icon = typeIcons[notif.type] || 'ℹ️';
            return `
            <div class="relative">
              <!-- Timeline circle indicator -->
              <span class="absolute -left-[33px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white border-2 border-indigo-600 shadow-sm">
                <span class="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping"></span>
              </span>
              <div class="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <div class="flex items-center justify-between gap-4 flex-wrap">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">${icon}</span>
                    <h4 class="font-bold text-slate-800 text-sm">${notif.title}</h4>
                  </div>
                  <span class="text-[10px] text-slate-400 font-semibold">${new Date(notif.createdAt).toLocaleString()}</span>
                </div>
                <p class="text-xs text-slate-600 mt-2 leading-relaxed">${notif.message}</p>
              </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error("Error loading notifications:", err);
        document.getElementById("facultyNotificationsTimeline").innerHTML = `<p class="text-red-500 py-2 text-sm font-medium">Failed to load system activity log.</p>`;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'login.html';
}