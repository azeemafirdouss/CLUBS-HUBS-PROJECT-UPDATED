// Student Dashboard Logic - KMIT Clubs Hub

window.onload = async function() {
  const role = localStorage.getItem('role');
  if (!getToken() || role !== "student"){
    alert("Please login as student first!");
    window.location.href = "login.html";
    return;
  }

  // Handle PhonePe payment redirect statuses
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('paymentStatus');
  if (paymentStatus === 'success') {
      const eventName = urlParams.get('event') || 'Event';
      const txnId = urlParams.get('txn') || '';
      showPaymentResultModal(true, `You have successfully registered for the event: **${eventName}**!`, txnId);
      window.history.replaceState({}, document.title, window.location.pathname);
  } else if (paymentStatus === 'failed') {
      const reason = urlParams.get('reason') || 'Transaction failed or was cancelled.';
      showPaymentResultModal(false, reason);
      window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // Load notifications feed
  loadNotifications();
  
  const res = await apiRequest("/student/dashboard");
  if (res.error) {
    document.body.innerHTML = "Unauthorized or error";
    return;
  }
  
  // Set student ID globally
  window.studentId = res._id || res.id;
  
  document.getElementById("studentName").innerText = res.username;
  document.getElementById("userName").innerText = res.username;
  document.getElementById("clubsCount").innerText = res.joinedClubs.length;
  document.getElementById("pendingCount").innerText = res.pendingRequests.length;

  const clubsCountBadge = document.getElementById("clubsCountBadge");
  if (clubsCountBadge) clubsCountBadge.innerText = res.joinedClubs.length;
  const clubsCountBadgeSecond = document.getElementById("clubsCountBadgeSecond");
  if (clubsCountBadgeSecond) clubsCountBadgeSecond.innerText = res.joinedClubs.length;
  const pendingCountBadgeSecond = document.getElementById("pendingCountBadgeSecond");
  if (pendingCountBadgeSecond) pendingCountBadgeSecond.innerText = res.pendingRequests.length;
  
  // My Clubs - Redesigned
  document.getElementById("clubsList").innerHTML = res.joinedClubs.length
    ? res.joinedClubs.map(club => `
      <div class="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 flex items-center gap-3 transition-all duration-200">
        <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
        ${club.name}
      </div>`).join("")
    : "<p class='text-slate-500 text-sm py-4'>No clubs joined yet. Send requests below!</p>";
     
  // Pending Requests - Redesigned
  document.getElementById("pendingRequests").innerHTML = res.pendingRequests.length
    ? res.pendingRequests.map(club => `
      <div class="p-4 bg-amber-50/30 hover:bg-amber-50/60 border border-amber-100/50 rounded-2xl font-bold text-amber-800 flex items-center gap-3 transition-all duration-200">
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
        ${club.name}
      </div>`).join("")
    : "<p class='text-slate-500 text-sm py-4'>No pending requests</p>";
     
  // Explore Clubs - Redesigned
  const allClubsRes = await apiRequest("/clubs");
  const exploreClubsList = document.getElementById("exploreClubsList");
  if (allClubsRes.error || !Array.isArray(allClubsRes)) {
    exploreClubsList.innerHTML = `<p class='text-red-500'>Failed to load clubs</p>`;
    return;
  }

  const exploreCount = allClubsRes.length;
  const exploreCountBadge = document.getElementById("exploreCountBadge");
  if (exploreCountBadge) exploreCountBadge.innerText = exploreCount;
  const exploreCountBadgeSecond = document.getElementById("exploreCountBadgeSecond");
  if (exploreCountBadgeSecond) exploreCountBadgeSecond.innerText = exploreCount;
  
  const joinedClubIds = new Set(res.joinedClubs.map(c => c._id || c.id));
  const pendingClubIds = new Set(res.pendingRequests.map(c => c._id || c.id));
  
  exploreClubsList.innerHTML = allClubsRes.length
    ? allClubsRes.map(club => {
        const isJoined = joinedClubIds.has(club._id || club.id);
        const isPending = pendingClubIds.has(club._id || club.id);
        
        let btnHtml = '';
        if (isJoined) {
          btnHtml = `<button class="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-not-allowed" disabled>✓ Joined Member</button>`;
        } else if (isPending) {
          btnHtml = `<button class="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 cursor-not-allowed" disabled>⌛ Requested (Pending)</button>`;
        } else {
          btnHtml = `<button class="w-full py-2.5 rounded-xl text-xs font-bold btn-gradient-purple text-white" onclick="joinClub('${club._id || club.id}')">Request to Join Club</button>`;
        }

        return `
        <div class="glass-card rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
          <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 w-24 h-24 flex items-center justify-center shadow-inner">
            <img src="images/${club.image || 'kmit.png'}" alt="${club.name}" class="h-16 w-16 object-contain hover:scale-110 transition-transform duration-300" onerror="this.src='images/kmit.png'" />
          </div>
          <div class="font-extrabold text-slate-800 text-base mb-1">${club.name}</div>
          <div class="text-slate-500 text-xs mb-4 line-clamp-2 h-8 leading-relaxed">${club.description || 'No description available.'}</div>
          ${btnHtml}
        </div>`;
      }).join("")
    : "<p class='text-slate-500 py-4 col-span-full text-center'>No clubs available</p>";
    
  loadApprovedEvents(); 
};

async function leaveClub(clubId) {
  if (!confirm('Are you sure you want to leave this club?')) return;
  const res = await apiRequest("/student/leave-club", "POST", { clubId });
  if (res.message) {
    alert('Successfully left the club');
    window.location.reload();
  } else {
    alert('Error: ' + (res.error || 'Failed to leave club'));
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  window.location.href = 'login.html';
}

async function joinClub(clubId) {
    if (!confirm('Are you sure you want to send a join request to this club?')) return;
    const res = await apiRequest("/student/join-club", "POST", { clubId });
    if (res.message) {
        alert(res.message);
        window.location.reload();
    } else {
        alert('Error: ' + (res.error || 'Failed to send request'));
    }
}

async function loadApprovedEvents() {
    const events = await apiRequest("/events/approved");
    window.approvedEvents = events; // Store events globally
    const list = document.getElementById("eventsList");
    const registeredList = document.getElementById("registeredEventsList");

    if (!events || events.length === 0) {
        list.innerHTML = `
          <div class="flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <i data-lucide="calendar" class="w-12 h-12 text-slate-300 mb-3"></i>
            <p class="text-slate-500 text-sm font-medium">No upcoming approved events</p>
          </div>`;
        document.getElementById("eventsCount").innerText = 0;
        const countBadge = document.getElementById("eventsCountBadge");
        if (countBadge) countBadge.innerText = 0;
        const countBadgeSecond = document.getElementById("eventsCountBadgeSecond");
        if (countBadgeSecond) countBadgeSecond.innerText = 0;
        
        if (registeredList) {
            registeredList.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <i data-lucide="calendar-check" class="w-12 h-12 text-slate-300 mb-3"></i>
                  <p class="text-slate-500 text-sm font-medium">You haven't registered for any events yet</p>
                </div>`;
        }
        const regCountBadge = document.getElementById("registeredEventsCountBadge");
        if (regCountBadge) regCountBadge.innerText = 0;
        const regCountBadgeSecond = document.getElementById("registeredEventsCountBadgeSecond");
        if (regCountBadgeSecond) regCountBadgeSecond.innerText = 0;
        
        if (window.lucide) {
            window.lucide.createIcons();
        }
        return;
    }
    
    document.getElementById("eventsCount").innerText = events.length;
    const countBadge = document.getElementById("eventsCountBadge");
    if (countBadge) countBadge.innerText = events.length;
    const countBadgeSecond = document.getElementById("eventsCountBadgeSecond");
    if (countBadgeSecond) countBadgeSecond.innerText = events.length;

    // Render all upcoming events
    list.innerHTML = events.map(event => {
        const isRegistered = window.studentId && event.registeredStudents && event.registeredStudents.some(id => {
            const idStr = (typeof id === 'object' && id !== null) ? (id._id || id.id || id.toString()) : id;
            return String(idStr) === String(window.studentId);
        });
        const fee = event.registrationFee || 0;
        
        let buttonHtml = '';
        if (event.isCompleted) {
            if (isRegistered) {
                buttonHtml = `
                <div class="flex flex-col gap-2">
                    <span class="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5">
                        <i data-lucide="graduation-cap" class="w-4 h-4"></i> Completed
                    </span>
                    <button onclick="viewMemories('${event._id}')" class="btn-gradient-purple text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all duration-300">
                        <i data-lucide="image" class="w-4 h-4"></i> View Memories
                    </button>
                </div>`;
            } else {
                buttonHtml = `<span class="bg-slate-100 text-slate-500 border border-slate-200 text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5">
                    <i data-lucide="archive" class="w-4 h-4"></i> Completed
                </span>`;
            }
        } else if (isRegistered) {
            buttonHtml = `<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Registered ${fee > 0 ? '(Paid)' : '(Free)'}
            </span>`;
        } else {
            if (fee > 0) {
                buttonHtml = `<button onclick="initiatePayment('${event._id}')" class="btn-gradient-blue text-white text-xs font-bold px-5 py-3 rounded-xl transition-all duration-300">
                    Register & Pay (₹${fee})
                </button>`;
            } else {
                buttonHtml = `<button onclick="registerForEvent('${event._id}')" class="btn-gradient-indigo text-white text-xs font-bold px-5 py-3 rounded-xl transition-all duration-300">
                    Register (Free Entry)
                </button>`;
            }
        }

        return `
        <div class="glass-card rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div class="flex-1 space-y-2">
                <p class="text-xl font-extrabold text-slate-800 tracking-tight">${event.title}</p>
                <p class="text-sm text-blue-600 font-bold flex items-center gap-1.5">
                  <span class="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                  Hosted by ${event.club?.name || event.clubName || "Unknown Club"}
                </p>
                <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i> ${new Date(event.date).toLocaleDateString()}</span>
                    <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i> ${new Date(event.date).toLocaleTimeString()}</span>
                    <span class="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded"><i data-lucide="ticket" class="w-3.5 h-3.5"></i> ${fee > 0 ? `₹${fee}` : 'Free Entry'}</span>
                </div>
                <p class="text-sm text-slate-600 leading-relaxed pt-2">${event.description || 'No description provided.'}</p>
            </div>
            <div class="flex-shrink-0 self-end md:self-center">
                ${buttonHtml}
            </div>
        </div>`;
    }).join("");

    // Filter and render registered events
    const registeredEvents = events.filter(event => window.studentId && event.registeredStudents && event.registeredStudents.some(id => {
        const idStr = (typeof id === 'object' && id !== null) ? (id._id || id.id || id.toString()) : id;
        return String(idStr) === String(window.studentId);
    }));
    const regCountBadge = document.getElementById("registeredEventsCountBadge");
    if (regCountBadge) regCountBadge.innerText = registeredEvents.length;
    const regCountBadgeSecond = document.getElementById("registeredEventsCountBadgeSecond");
    if (regCountBadgeSecond) regCountBadgeSecond.innerText = registeredEvents.length;

    if (registeredList) {
        if (registeredEvents.length === 0) {
            registeredList.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <i data-lucide="calendar-check" class="w-12 h-12 text-slate-300 mb-3"></i>
                  <p class="text-slate-500 text-sm font-medium">You haven't registered for any events yet</p>
                </div>`;
        } else {
            registeredList.innerHTML = registeredEvents.map(event => {
                const fee = event.registrationFee || 0;
                let actionHtml = '';
                if (event.isCompleted) {
                    actionHtml = `
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <span class="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-4 py-2.5 rounded-full flex items-center justify-center gap-1.5">
                            <i data-lucide="graduation-cap" class="w-4 h-4"></i> Completed
                        </span>
                        <button onclick="viewMemories('${event._id}')" class="btn-gradient-purple text-white text-xs font-bold px-5 py-3 rounded-full flex items-center justify-center gap-1.5 transition-all duration-300">
                            <i data-lucide="image" class="w-4 h-4"></i> View Memories 📸
                        </button>
                    </div>`;
                } else {
                    actionHtml = `
                    <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5">
                        <i data-lucide="check-circle" class="w-4 h-4"></i> Registered ${fee > 0 ? '(Paid)' : '(Free)'}
                    </span>`;
                }

                return `
                <div class="glass-card rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div class="flex-1 space-y-2">
                        <p class="text-xl font-extrabold text-slate-800 tracking-tight">${event.title}</p>
                        <p class="text-sm text-blue-600 font-bold flex items-center gap-1.5">
                          <span class="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                          Hosted by ${event.club?.name || event.clubName || "Unknown Club"}
                        </p>
                        <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                            <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i> ${new Date(event.date).toLocaleDateString()}</span>
                            <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i> ${new Date(event.date).toLocaleTimeString()}</span>
                            <span class="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded"><i data-lucide="ticket" class="w-3.5 h-3.5"></i> ${fee > 0 ? `₹${fee}` : 'Free'}</span>
                        </div>
                        <p class="text-sm text-slate-600 leading-relaxed pt-2">${event.description || ''}</p>
                    </div>
                    <div class="flex-shrink-0 self-end md:self-center">
                        ${actionHtml}
                    </div>
                </div>`;
            }).join("");
        }
    }
    
    // Re-initialize Lucide icons since we injected dynamic elements
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Fetch and render notifications feed
async function loadNotifications() {
    try {
        const notificationsList = document.getElementById("notificationsList");
        const notifications = await apiRequest("/student/notifications");
        
        if (notifications.error) {
            notificationsList.innerHTML = `<p class="text-red-500 py-2 text-sm">Error: ${notifications.error}</p>`;
            return;
        }
        
        if (!notifications || notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="text-center py-6 text-slate-500 text-sm">
                    <p>No new notifications at this time.</p>
                </div>`;
            return;
        }
        
        const typeIcons = {
            'club': '🏛️',
            'event': '📅',
            'announcement': '📢',
            'general': 'ℹ️'
        };
        
        notificationsList.innerHTML = notifications.map(notif => {
            const icon = typeIcons[notif.type] || 'ℹ️';
            return `
                <div class="py-3 flex items-start space-x-3 hover:bg-slate-50/60 rounded-xl px-3 transition-colors duration-150 border-b border-slate-50 last:border-b-0">
                    <span class="text-xl flex-shrink-0 mt-0.5">${icon}</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-800">${notif.title}</p>
                        <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">${notif.message}</p>
                        <span class="text-[10px] text-slate-400 mt-1 block font-medium">${new Date(notif.createdAt).toLocaleString()}</span>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error("Error loading notifications:", err);
        document.getElementById("notificationsList").innerHTML = `<p class="text-red-500 py-2 text-sm">Failed to load notifications.</p>`;
    }
}

// Register for free events
async function registerForEvent(eventId) {
    if (!confirm('Are you sure you want to register for this event?')) return;
    try {
        const res = await apiRequest(`/student/events/${eventId}/register`, "POST");
        if (res.error) {
            alert("Error registering: " + res.error);
            return;
        }
        alert("✅ " + res.message);
        window.location.reload();
    } catch (err) {
        console.error("Registration error:", err);
        alert("Registration failed: " + err.message);
    }
}

let checkoutTimerInterval = null;
let currentCheckoutEventId = null;

function openCheckoutModal(eventId, title, fee) {
    currentCheckoutEventId = eventId;
    document.getElementById("checkoutEventId").value = eventId;
    document.getElementById("checkoutEventTitle").innerText = title;
    document.getElementById("checkoutEventFee").innerText = `₹${fee}`;
    
    // Find organizing club payment details
    const event = (window.approvedEvents || []).find(e => e._id === eventId);
    let upiId = "admin@kmit";
    let qrCode = "images/kmit.png";
    
    if (event && event.club) {
        if (event.club.upiId) upiId = event.club.upiId;
        if (event.club.upiQrCode) qrCode = event.club.upiQrCode;
    }
    
    document.getElementById("checkoutClubUpiId").innerText = upiId;
    document.getElementById("checkoutClubQrCode").src = qrCode;
    
    // Reset inputs
    const upiIdInput = document.getElementById("upiIdInput");
    if (upiIdInput) upiIdInput.value = "";
    
    // Set active tab to QR code by default
    switchPaymentTab('qr');
    
    // Show modal form, hide processing and success
    document.getElementById("qrPaymentContainer").classList.remove("hidden");
    document.getElementById("paymentForm").classList.add("hidden");
    document.getElementById("paymentProcessing").classList.add("hidden");
    document.getElementById("paymentSuccess").classList.add("hidden");
    document.getElementById("paymentTabsHeader").classList.remove("hidden");
    
    document.getElementById("checkoutModal").classList.remove("hidden");
    document.getElementById("checkoutModal").classList.add("flex");
    
    // Start countdown timer
    startCheckoutTimer(180); // 3 minutes
}

function closeCheckoutModal() {
    document.getElementById("checkoutModal").classList.add("hidden");
    document.getElementById("checkoutModal").classList.remove("flex");
    if (checkoutTimerInterval) {
        clearInterval(checkoutTimerInterval);
    }
}

function switchPaymentTab(type) {
    const tabQr = document.getElementById("tabButtonQr");
    const tabUpi = document.getElementById("tabButtonUpi");
    const qrContainer = document.getElementById("qrPaymentContainer");
    const upiForm = document.getElementById("paymentForm");
    
    if (type === 'qr') {
        tabQr.className = "w-1/2 pb-2.5 font-bold text-xs border-b-2 border-violet-600 phonepe-brand-color transition-all duration-200";
        tabUpi.className = "w-1/2 pb-2.5 font-bold text-xs border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all duration-200";
        qrContainer.classList.remove("hidden");
        upiForm.classList.add("hidden");
    } else {
        tabUpi.className = "w-1/2 pb-2.5 font-bold text-xs border-b-2 border-violet-600 phonepe-brand-color transition-all duration-200";
        tabQr.className = "w-1/2 pb-2.5 font-bold text-xs border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all duration-200";
        upiForm.classList.remove("hidden");
        qrContainer.classList.add("hidden");
    }
}

function startCheckoutTimer(seconds) {
    if (checkoutTimerInterval) {
        clearInterval(checkoutTimerInterval);
    }
    
    let timeRemaining = seconds;
    const timerDisplay = document.getElementById("checkoutTimer");
    
    const updateDisplay = () => {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    updateDisplay();
    
    checkoutTimerInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) {
            clearInterval(checkoutTimerInterval);
            timerDisplay.innerText = "00:00";
            alert("❌ Payment session expired. Please reopen checkout to generate a new transaction.");
            closeCheckoutModal();
        } else {
            updateDisplay();
        }
    }, 1000);
}

function copyUpiId() {
    const upiId = document.getElementById("checkoutClubUpiId").innerText;
    navigator.clipboard.writeText(upiId).then(() => {
        alert("📋 UPI ID copied to clipboard!");
    }).catch(err => {
        console.error("Copy failed", err);
    });
}

async function simulateQrPaymentSuccess() {
    const eventId = currentCheckoutEventId;
    if (!eventId) return;
    
    // Hide tabs and containers, show processing
    document.getElementById("qrPaymentContainer").classList.add("hidden");
    document.getElementById("paymentTabsHeader").classList.add("hidden");
    document.getElementById("paymentProcessing").classList.remove("hidden");
    document.getElementById("paymentProcessMessage").innerText = "Verifying transaction with PhonePe Gateway...";
    
    if (checkoutTimerInterval) clearInterval(checkoutTimerInterval);
    
    // Simulate 1.8 seconds network confirmation check
    setTimeout(async () => {
        try {
            const res = await apiRequest(`/student/events/${eventId}/register`, "POST", {
                paymentDetails: {
                    paymentMethod: "upi_qr"
                }
            });
            
            if (res.error) {
                alert("❌ Scan validation failed: " + res.error);
                // Go back to QR view
                document.getElementById("paymentProcessing").classList.add("hidden");
                document.getElementById("qrPaymentContainer").classList.remove("hidden");
                document.getElementById("paymentTabsHeader").classList.remove("hidden");
                startCheckoutTimer(180);
                return;
            }
            
            // Show success screen
            document.getElementById("paymentProcessing").classList.add("hidden");
            document.getElementById("paymentSuccess").classList.remove("hidden");
            document.getElementById("paymentSuccessMessage").innerText = `Transaction ${res.transactionId || 'Success'} verified. Seat reserved!`;
            
            setTimeout(() => {
                closeCheckoutModal();
                window.location.reload();
            }, 2000);
            
        } catch (err) {
            console.error("Payment error:", err);
            alert("❌ Connection error verifying payment. Please retry.");
            document.getElementById("paymentProcessing").classList.add("hidden");
            document.getElementById("qrPaymentContainer").classList.remove("hidden");
            document.getElementById("paymentTabsHeader").classList.remove("hidden");
            startCheckoutTimer(180);
        }
    }, 1800);
}

// Attach formatting helpers and payment handler
window.addEventListener('DOMContentLoaded', () => {
    const paymentForm = document.getElementById("paymentForm");
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const eventId = document.getElementById("checkoutEventId").value;
            const upiIdInputVal = document.getElementById("upiIdInput").value.trim();
            
            if (!upiIdInputVal) {
                alert("❌ Please enter a valid UPI ID.");
                return;
            }
            
            if (!upiIdInputVal.includes('@')) {
                alert("❌ Invalid UPI ID. It must contain the '@' symbol (e.g. mobileNumber@ybl).");
                return;
            }
            
            // Hide tabs and containers, show processing
            document.getElementById("paymentForm").classList.add("hidden");
            document.getElementById("paymentTabsHeader").classList.add("hidden");
            document.getElementById("paymentProcessing").classList.remove("hidden");
            document.getElementById("paymentProcessMessage").innerText = "Requesting payment collect from PhonePe App...";
            
            if (checkoutTimerInterval) clearInterval(checkoutTimerInterval);
            
            // Simulate 2 seconds waiting for user PIN approval on mobile PhonePe app
            setTimeout(async () => {
                try {
                    const res = await apiRequest(`/student/events/${eventId}/register`, "POST", {
                        paymentDetails: {
                            paymentMethod: "upi_id",
                            upiId: upiIdInputVal
                        }
                    });
                    
                    if (res.error) {
                        alert("❌ Payment collection failed: " + res.error);
                        // Re-show form
                        document.getElementById("paymentProcessing").classList.add("hidden");
                        document.getElementById("paymentForm").classList.remove("hidden");
                        document.getElementById("paymentTabsHeader").classList.remove("hidden");
                        startCheckoutTimer(180);
                        return;
                    }
                    
                    // Show success screen
                    document.getElementById("paymentProcessing").classList.add("hidden");
                    document.getElementById("paymentSuccess").classList.remove("hidden");
                    document.getElementById("paymentSuccessMessage").innerText = `Request approved (Txn: ${res.transactionId || 'Success'}). Seat reserved!`;
                    
                    setTimeout(() => {
                        closeCheckoutModal();
                        window.location.reload();
                    }, 2000);
                    
                } catch (err) {
                    console.error("UPI ID Payment error:", err);
                    alert("❌ Connection error processing UPI collect. Please try again.");
                    document.getElementById("paymentProcessing").classList.add("hidden");
                    document.getElementById("paymentForm").classList.remove("hidden");
                    document.getElementById("paymentTabsHeader").classList.remove("hidden");
                    startCheckoutTimer(180);
                }
            }, 2000);
        });
    }
});

function viewMemories(eventId) {
    const event = (window.approvedEvents || []).find(e => e._id === eventId);
    if (!event) {
        alert("Event not found.");
        return;
    }
    
    document.getElementById("memoriesEventTitle").innerText = `${event.title} • Hosted by ${event.club?.name || event.clubName || "Unknown Club"}`;
    
    const grid = document.getElementById("memoriesImagesGrid");
    const images = event.eventImages || [];
    
    if (images.length === 0) {
        grid.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <span class="text-5xl mb-4 animate-bounce">📸</span>
                <p class="font-extrabold text-slate-800 text-lg">Memories are in the making!</p>
                <p class="text-xs text-slate-500 mt-1 max-w-sm">The Club Head hasn't uploaded event photos yet. Check back soon to see the captured moments!</p>
            </div>
        `;
    } else {
        grid.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-2">
                ${images.map((url, index) => `
                    <div class="group relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer" onclick="openLightbox('${url}', '${event.title.replace(/'/g, "\\'")}')">
                        <img src="${url}" alt="Event Memory ${index + 1}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='images/kmit.png'">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-slate-900/0 to-slate-900/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                            <span class="text-white text-xs font-semibold tracking-wide bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1">
                                🔍 Click to view full size
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    document.getElementById("memoriesModal").classList.remove("hidden");
    document.getElementById("memoriesModal").classList.add("flex");
}

function closeMemoriesModal() {
    document.getElementById("memoriesModal").classList.add("hidden");
    document.getElementById("memoriesModal").classList.remove("flex");
}

function openLightbox(url, caption) {
    document.getElementById("lightboxImage").src = url;
    document.getElementById("lightboxCaption").innerText = caption || "Event Memory";
    document.getElementById("lightboxModal").classList.remove("hidden");
    document.getElementById("lightboxModal").classList.add("flex");
}

function closeLightboxModal() {
    document.getElementById("lightboxModal").classList.add("hidden");
    document.getElementById("lightboxModal").classList.remove("flex");
}

function showSection(sectionId, element) {
    // Hide all sections by removing 'active' class
    document.querySelectorAll(".dashboard-section").forEach(sec => sec.classList.remove("active"));
    
    // Show selected section by adding 'active' class
    const targetSec = document.getElementById(sectionId);
    if (targetSec) {
        targetSec.classList.add("active");
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
}

// --- REAL PHONEPE PAYMENT HELPERS ---

async function initiatePayment(eventId) {
    if (!confirm('Are you sure you want to register and proceed to pay for this event?')) return;
    
    // Show a premium overlay loader to prevent double click
    const body = document.body;
    const loader = document.createElement('div');
    loader.id = "payment-gateway-loader";
    loader.className = "fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-white gap-4 animate-fade-in";
    loader.innerHTML = `
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white animate-bounce"></div>
        <p class="font-extrabold text-lg">Connecting to PhonePe Payment Gateway...</p>
        <p class="text-sm text-slate-300">Do not refresh or close this page.</p>
    `;
    body.appendChild(loader);

    try {
        const res = await apiRequest(`/student/events/${eventId}/pay-initiate`, "POST");
        if (res.error) {
            alert("❌ Payment initiation failed: " + res.error);
            loader.remove();
            return;
        }

        if (res.redirect && res.paymentUrl) {
            // Redirect to PhonePe Secure Checkout
            window.location.href = res.paymentUrl;
        } else {
            // If it's processed directly without redirect (e.g., free event fallback)
            alert("✅ " + (res.message || "Registration successful!"));
            window.location.reload();
        }
    } catch (err) {
        console.error("Payment initiation error:", err);
        alert("❌ Failed to initiate checkout. Please check connection and try again.");
        loader.remove();
    }
}

function showPaymentResultModal(isSuccess, message, txnId = "") {
    const modalDiv = document.createElement('div');
    modalDiv.className = "fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300";
    
    const iconHtml = isSuccess 
        ? `<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 animate-bounce">
             <i class="fas fa-circle-check text-4xl"></i>
           </div>`
        : `<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 animate-pulse">
             <i class="fas fa-circle-xmark text-4xl"></i>
           </div>`;
           
    const title = isSuccess ? "Payment Successful!" : "Payment Failed";
    const titleColor = isSuccess ? "text-emerald-700" : "text-red-700";
    const headerBorder = isSuccess ? "bg-emerald-500" : "bg-red-500";
    
    let txnHtml = "";
    if (isSuccess && txnId) {
        txnHtml = `
            <div class="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Transaction ID</span>
                <span class="font-mono text-xs font-bold text-slate-700 block select-all mt-0.5">${txnId}</span>
            </div>
        `;
    }

    modalDiv.innerHTML = `
        <div class="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden border border-slate-100 transform transition-all duration-300">
            <div class="absolute top-0 left-0 right-0 h-2 ${headerBorder}"></div>
            <div class="text-center space-y-4">
                ${iconHtml}
                <h3 class="text-2xl font-black ${titleColor} tracking-tight">${title}</h3>
                <p class="text-slate-600 text-sm leading-relaxed">${message}</p>
                ${txnHtml}
                <div class="pt-4">
                    <button id="closePaymentResultBtn" class="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-lg">
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    
    document.getElementById("closePaymentResultBtn").addEventListener('click', () => {
        modalDiv.classList.add("opacity-0");
        setTimeout(() => modalDiv.remove(), 300);
        window.location.reload(); // Reload to refresh registration badges
    });
}
