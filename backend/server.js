const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
// ADD THESE LINES FOR THE TEST
console.log("--- DOTENV TEST ---");
console.log("MONGO_URI Variable:", process.env.MONGO_URI);
console.log("JWT_SECRET Variable:", process.env.JWT_SECRET);
console.log("---------------------");

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
// Make sure you have this middleware file
const { authenticateToken } = require("./middleware");
const Event = require('./models/eventModel');

const app = express();
app.use(express.static(path.join(__dirname, '../frontend')));

// Configure 
// const JWT_SECRET = process.env.JWT_SECRET;
// // const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/kmit_club_azeem";
// MONGO_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxx.mongodb.net/kmit_club_azeem
// Configure 
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-testing";
const MONGO_URI = process.env.MONGO_URI ;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const mailTransporter = (EMAIL_USER && EMAIL_PASS) ? nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
}) : null;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Serve the frontend files from the frontend/ folder so you can open pages at
// http://localhost:5000/register.html and avoid file:// origin / CORB issues.
// app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB connection
mongoose.connect(MONGO_URI)
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Simple health endpoint to verify server is up    
// app.get('/', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handlers to help diagnose crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  // optional: process.exit(1);
});

// Validation functions
const validateStudentRollNo = (rollNo) => {
  const pattern = /^(22|23|24|25)BD1A05[A-G][0-9]$/;
  return pattern.test(rollNo);
};

const validateFacultyEmail = (email) => {
  const pattern = /^[A-Za-z]{5,15}[0-9]{0,3}@gmail\.com$/;
  return pattern.test(email);
};

const validateFacultyName = (name) => {
  const pattern = /^[A-Za-z\s]{1,30}$/;
  return pattern.test(name);
};

const validateFacultyPassword = (password) => {
  const pattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{10,}$/;
  return pattern.test(password);
};

const validateClubPassword = (password) => {
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  return pattern.test(password);
};

const validateClubHeadUsername = (username) => {
  // allow either "-Head" or "-head" (case-insensitive)
  const pattern = /^[A-Za-z0-9\s-]+-Head$/i;
  return pattern.test(username);
};

// Helper to escape user-controlled strings before placing into RegExp
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Student Schema
const studentSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    name: String,
    rollNumber: String,
    joinedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Club' }],
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Club' }],
    isActive: { type: Boolean, default: true }  // ← ADD THIS
});
const Student = mongoose.model("Student", studentSchema);

// Faculty Schema
const facultySchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    name: String,
    email: String,
    otp: String,
    otpExpires: Date,
     isActive: { type: Boolean, default: true } 
});
const Faculty = mongoose.model("Faculty", facultySchema);

// ClubHead Schema
const clubHeadSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    name: String,
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
     isActive: { type: Boolean, default: true } 
});
const ClubHead = mongoose.model("ClubHead", clubHeadSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    name: String
});
const Admin = mongoose.model("Admin", adminSchema);

// Club Schema
const clubSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true, required: true },
    headUsername: { type: String, unique: true, sparse: true }, // sparse allows null
    password: String,
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    description: String,
    image: String,
    upiId: { type: String, default: "admin@kmit" },
    upiQrCode: { type: String, default: "images/default-upi-qr.png" }
});
const Club = mongoose.model("Club", clubSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['club', 'event', 'announcement', 'general'], default: 'general' },
    createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model("Notification", notificationSchema);

// ResetRequest Schema
const resetRequestSchema = new mongoose.Schema({
    username: { type: String, required: true },
    role: { type: String, required: true, enum: ['student', 'clubhead'] },
    contactEmail: { type: String, required: true },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});
const ResetRequest = mongoose.model("ResetRequest", resetRequestSchema);

// Registration / Payment Schema
const registrationSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    paymentMethod: { type: String, enum: ['free', 'upi_qr', 'upi_id', 'phonepe'], required: true },
    upiId: { type: String },
    transactionId: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const Registration = mongoose.model("Registration", registrationSchema);

// Self-healing function for stale ClubHead references
async function healClubHeadReferences() {
  try {
    console.log("🔄 Starting ClubHead self-healing check...");
    const clubHeads = await ClubHead.find({});
    let healedCount = 0;
    
    for (const clubHead of clubHeads) {
      // Find the club that matches this head
      const correctClub = await Club.findOne({ 
        headUsername: { $regex: new RegExp(`^${escapeRegex(clubHead.username)}$`, 'i') } 
      });
      
      if (correctClub) {
        // If club head reference is missing or incorrect, update it
        if (!clubHead.club || clubHead.club.toString() !== correctClub._id.toString()) {
          clubHead.club = correctClub._id;
          await clubHead.save();
          healedCount++;
          console.log(`✅ Healed: Associated ClubHead '${clubHead.username}' with Club '${correctClub.name}'`);
        }
      } else {
        console.log(`⚠️ Warning: No matching club found for ClubHead '${clubHead.username}'`);
      }
    }
    console.log(`✨ ClubHead self-healing completed. Healed ${healedCount} reference(s).`);

    // Clean any malformed eventImages (e.g. split by commas or newlines)
    console.log("🧹 Starting eventImages cleanup check...");
    const events = await Event.find({ isCompleted: true });
    let cleanedEventsCount = 0;
    for (const event of events) {
      if (!event.eventImages) continue;
      let needsSave = false;
      let newImages = [];
      for (const img of event.eventImages) {
        if (typeof img === 'string' && (img.includes('\n') || img.includes(','))) {
          const parts = img.split(/[\n,]+/).map(p => p.trim()).filter(p => p.length > 0);
          newImages.push(...parts);
          needsSave = true;
        } else {
          newImages.push(img);
        }
      }
      if (needsSave) {
        event.eventImages = newImages;
        await event.save();
        cleanedEventsCount++;
        console.log(`✅ Cleaned eventImages for event "${event.title}":`, newImages);
      }
    }
    console.log(`✨ eventImages cleanup completed. Cleaned ${cleanedEventsCount} event(s).`);
  } catch (error) {
    console.error("❌ Error during ClubHead and eventImages self-healing:", error);
  }
}

// Run self-healing when MongoDB connection is established
mongoose.connection.once('open', () => {
  healClubHeadReferences();
});

// REGISTER endpoint
app.post("/register", async (req, res) => {
  try {
    const { role } = req.body;
    
    if (role === "student") {
      const { studentUsername, studentPassword } = req.body;
      
      // Validate format
      if (!validateStudentRollNo(studentUsername)) {
        return res.status(400).json({ error: "❌ Invalid Roll No format. Use format like: 23BD1A05C7" });
      }
      
      // Check strong password validation for Student
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(studentPassword)) {
        return res.status(400).json({ error: "❌ Invalid password format. Must be at least 8 characters with at least one uppercase letter, one lowercase letter, one number, and one special character." });
      }
      
      // Check if user already exists
      const existingStudent = await Student.findOne({ username: studentUsername });
      if (existingStudent) {
        return res.status(400).json({ error: "❌ Student already exists" });
      }

      const hashedPassword = await bcrypt.hash(studentPassword, 10);
      const student = new Student({
        username: studentUsername,
        password: hashedPassword,
        name: studentUsername,
        rollNumber: studentUsername
      });
      await student.save();
      return res.json({ message: "✅ Student registration successful" });
    }
    if (role === "faculty") {
  const { facultyEmail, facultyPassword, name } = req.body;

  // Validate formats
  if (!validateFacultyEmail(facultyEmail)) {
    return res.status(400).json({ error: "❌ Invalid email format. Use: 5-15 letters + optional digits + @gmail.com" }); // FIXED MESSAGE
  }
  
  if (!validateFacultyName(name)) {
    return res.status(400).json({ error: "❌ Invalid name format. Only letters (1-20 characters)" });
  }
  
  if (!validateFacultyPassword(facultyPassword)) {
    return res.status(400).json({ error: "❌ Invalid password format. Must contain uppercase, lowercase, number, and special character" }); // FIXED MESSAGE
  }
  

      // Check if faculty already exists
      const existingFaculty = await Faculty.findOne({ username: facultyEmail });
      if (existingFaculty) {
        return res.status(400).json({ error: "❌ Faculty already exists" });
      }

      const hashedPassword = await bcrypt.hash(facultyPassword, 10);
      const faculty = new Faculty({
        username: facultyEmail,
        password: hashedPassword,
        name,
        email: facultyEmail
      });
      await faculty.save();
      return res.json({ message: "✅ Faculty registration successful" });
    }

    
// PASTE THIS NEW BLOCK IN ITS PLACE

if (role === "clubhead") {
    const { clubUsername, clubPassword } = req.body;

    // 1. Validate the username format (e.g., "Mudra-Head")
    if (!validateClubHeadUsername(clubUsername)) {
        return res.status(400).json({ error: "❌ Invalid club username format. Use: Clubname-Head" });
    }
    
    // 2. Validate the password format
    if (!validateClubPassword(clubPassword)) {
        return res.status(400).json({ error: "❌ Invalid password format. Must be at least 8 characters with at least one uppercase letter, one lowercase letter, one number, and one special character." });
    }

    // 3. Check if the club is configured to have a head with this username
    // This uses a case-insensitive search to be more user-friendly
    const club = await Club.findOne({ headUsername: { $regex: new RegExp(`^${escapeRegex(clubUsername)}$`, 'i') } });
    if (!club) {
        return res.status(400).json({ error: "❌ This club is not configured for a head or the username is incorrect." });
    }

    // 4. Check if a head is already registered
    const existingHead = await ClubHead.findOne({ username: { $regex: new RegExp(`^${escapeRegex(clubUsername)}$`, 'i') } });
    if (existingHead) {
        return res.status(400).json({ error: "❌ This club already has a head assigned." });
    }

    const hashedPassword = await bcrypt.hash(clubPassword, 10);
    const clubHead = new ClubHead({
        username: clubUsername,
        password: hashedPassword,
        name: clubUsername.replace(/-head$/i, '') + " Head", // Auto-generates a name like "Mudra Head"
        club: club._id
    });
    await clubHead.save();
    return res.json({ message: "✅ Club Head registration successful" });
}

    if (role === "admin") {
      const { adminId, adminPassword } = req.body;

      // Validate admin ID format
      if (!/^[a-zA-Z0-9]{4,20}$/.test(adminId)) {
        return res.status(400).json({ error: "❌ Invalid Admin ID format. Use 4-20 alphanumeric characters" });
      }

      // Validate admin password format
      if (!validateClubPassword(adminPassword)) {
        return res.status(400).json({ error: "❌ Invalid password format. Must contain uppercase, lowercase, number, and special character" });
      }

      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ username: adminId });
      if (existingAdmin) {
        return res.status(400).json({ error: "❌ Admin already exists" });
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = new Admin({
        username: adminId,
        password: hashedPassword,
        name: "Admin " + adminId
      });
      await admin.save();
      return res.json({ message: "✅ Admin registration successful" });
    }
    
    res.status(400).json({ error: "❌ Invalid role" });
  } catch (err) {
    console.error("Registration error:", err);
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ error: `❌ ${field} already exists` });
    }
    
    res.status(500).json({ error: "❌ Server error during registration" });
  }
});


// LOGIN endpoint
app.post("/login", async (req, res) => {
	try {
  let { role, username, password } = req.body || {};
  username = (username || '').trim();
  password = (password || '').trim();
  console.log('DEBUG /login payload (raw):', { role, usernameProvided: username });
  
  if (!username || !password) {
    return res.status(400).json({ error: "❌ Username and password are required." });
  }
  let user, userModel;
	if (role === "student") userModel = Student;
	else if (role === "faculty") userModel = Faculty;
	else if (role === "clubhead") userModel = ClubHead;
	// else if (role === "admin") userModel = Admin;
	// else return res.status(400).json({ error: "Invalid role" });
else if (role === "admin") {
  // Fixed admin credentials
  if (username === "admin" && password === "Admin123$") {
    const token = jwt.sign(
      { id: "admin-fixed", role: "admin", username: "admin", name: "Super Admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    return res.json({ token, role: "admin" });
  } else {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }
} else {
  return res.status(400).json({ error: "Invalid role" });
}




  // perform case-insensitive username lookup to avoid case/format mismatches
  if (role === 'clubhead') {
    // Normalize clubhead username: collapse duplicate '-head' suffixes
    const normalized = username.replace(/(-head)+$/i, '-head');
    const withoutSuffix = normalized.replace(/-head$/i, '');
    // Try matching several common variants (case-insensitive): exact normalized, without suffix, withoutSuffix+"-head"
    user = await userModel.findOne({ $or: [
      { username: { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' } },
      { username: { $regex: `^${escapeRegex(withoutSuffix)}$`, $options: 'i' } },
      { username: { $regex: `^${escapeRegex(withoutSuffix)}-head$`, $options: 'i' } }
    ], isActive: true  // ✅ ADDED for clubhead// 
    });
    
    // Self-healing: Ensure correct club reference is matched
    if (user && (!user.club || !(await Club.findById(user.club)))) {
      const correctClub = await Club.findOne({ headUsername: { $regex: new RegExp(`^${escapeRegex(user.username)}$`, 'i') } });
      if (correctClub) {
        user.club = correctClub._id;
        await user.save();
      }
    }
  } else {
    user = await userModel.findOne({ username: { $regex: `^${escapeRegex(username)}$`, $options: 'i' },
    isActive: true  // ✅ ADDED for student and faculty
   });
  }
  if (!user) {
    console.log('Login failed: user not found for', username, 'role', role);
  }
	if (!user) return res.status(401).json({ error: "Invalid credentials" });
	const valid = await bcrypt.compare(password, user.password);
	if (!valid) return res.status(401).json({ error: "Invalid credentials" });
		const token = jwt.sign({ id: user._id, role, username: user.username, name: user.name }, JWT_SECRET, { expiresIn: "1h" });

		res.json({ token, role });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});
app.get("/student/dashboard", authenticateToken, async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ error: "Unauthorized" });
    const student = await Student.findOne({ username: req.user.username })
        .populate('joinedClubs')
        .populate('pendingRequests');
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
});
app.get("/clubs", async (req, res) => {
    try {
        const clubs = await Club.find({}, 'name description image slug _id headUsername members pendingRequests');
        res.json(clubs);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// DEV: debug endpoint to list ClubHead documents (username and club name)
// Only enabled when not in production
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/clubheads', async (req, res) => {
    try {
      const heads = await ClubHead.find({}).populate('club', 'name');
      const out = heads.map(h => ({ id: h._id, username: h.username, clubId: h.club?._id, clubName: h.club?._doc?.name || h.club?.name || null }));
      res.json(out);
    } catch (err) {
      console.error('Error in /debug/clubheads', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
}
// Add these 3 new endpoints to your server.js file

// 1. STUDENT: REQUEST TO JOIN A CLUB
app.post("/student/join-club", authenticateToken, async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ error: "Unauthorized" });

    try {
        const { clubId } = req.body;
        const studentId = req.user.id; // From the JWT

        // Add request to the Club's pending list
        // Using $addToSet prevents adding duplicate requests
        await Club.findByIdAndUpdate(clubId, { $addToSet: { pendingRequests: studentId } });
        
        // Also add the club to the Student's pending list to keep them in sync
        await Student.findByIdAndUpdate(studentId, { $addToSet: { pendingRequests: clubId } });

        res.json({ message: "Request sent successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// 2. CLUB HEAD: GET DASHBOARD DATA (INCL. REQUESTS AND MEMBERS)
app.get("/clubhead/dashboard", authenticateToken, async (req, res) => {
    if (req.user.role !== "clubhead") return res.status(403).json({ error: "Unauthorized" });

    try {
        // Find the club head to know which club they manage
        const clubHead = await ClubHead.findById(req.user.id);
         console.log("DEBUG: Checking Club Head:", clubHead); 
        if (!clubHead) return res.status(404).json({ error: "Club head not found" });


        // Find the club and populate the details of students in pendingRequests and members
        let clubData = await Club.findById(clubHead.club)
            .populate('pendingRequests', 'name username rollNumber') // Get student details
            .populate('members', 'name username rollNumber');        // Get member details

        if (!clubData) {
            // Self-healing: try to find the club by headUsername matching clubHead's username
            const correctClub = await Club.findOne({ headUsername: { $regex: new RegExp(`^${escapeRegex(clubHead.username)}$`, 'i') } });
            if (correctClub) {
                clubHead.club = correctClub._id;
                await clubHead.save();
                
                clubData = await Club.findById(correctClub._id)
                    .populate('pendingRequests', 'name username rollNumber')
                    .populate('members', 'name username rollNumber');
            }
        }

        if (!clubData) return res.status(404).json({ error: "Club data not found" });
        
        res.json(clubData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// 3. CLUB HEAD: RESPOND TO A JOIN REQUEST (ACCEPT/REJECT)
app.post("/clubhead/respond", authenticateToken, async (req, res) => {
    if (req.user.role !== "clubhead") return res.status(403).json({ error: "Unauthorized" });
    
    try {
        const { studentId, action } = req.body; // action can be "accept" or "reject"
        const clubHead = await ClubHead.findById(req.user.id);
        const clubId = clubHead.club;

        // Step A: Remove student from the pending list in both Club and Student documents
        await Club.findByIdAndUpdate(clubId, { $pull: { pendingRequests: studentId } });
        await Student.findByIdAndUpdate(studentId, { $pull: { pendingRequests: clubId } });

        // Step B: If accepted, add student to the members list in both documents
        if (action === "accept") {
            await Club.findByIdAndUpdate(clubId, { $addToSet: { members: studentId } });
            await Student.findByIdAndUpdate(studentId, { $addToSet: { joinedClubs: clubId } });
        }

        res.json({ message: `Request has been ${action}ed.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
// --- EVENT PROPOSAL & APPROVAL APIS ---


// CLUB HEAD: Create a new event proposal
// In server.js, replace your existing /clubhead/events endpoint with this one

// CLUB HEAD: Create a new event proposal
app.post("/clubhead/events", authenticateToken, async (req, res) => {
    if (req.user.role !== "clubhead") {
        return res.status(403).json({ error: "Unauthorized" });
    }
    try {
        const { title, description, date, fundRequest, registrationFee } = req.body;

        // Find the club head from the token
        const clubHead = await ClubHead.findById(req.user.id);
        
        // --- THIS IS THE FIX ---
        // Add a check to ensure the club head and their club link exist
        if (!clubHead || !clubHead.club) {
            return res.status(404).json({ error: "Could not find the club for this user." });
        }

        const newEvent = new Event({
            title,
            description,
            date,
            club: clubHead.club, 
            status: 'pending',
            fundRequest: fundRequest || 0,
            registrationFee: registrationFee || 0
        });

        await newEvent.save();
        res.status(201).json({ message: "Event proposal submitted successfully!" });

    } catch (err) {
        console.error("Error creating event:", err); 
        res.status(500).json({ error: "Server error while creating event." });
    }
});

app.get("/clubhead/my-events", authenticateToken, async (req, res) => {
    if (req.user.role !== "clubhead") return res.status(403).json({ error: "Unauthorized" });
    try {
        const clubHead = await ClubHead.findById(req.user.id);
        const events = await Event.find({ club: clubHead.club });
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});



// FACULTY: Get all data for the dashboard in one call
app.get("/faculty/dashboard", authenticateToken, async (req, res) => {
    if (req.user.role !== "faculty") return res.status(403).json({ error: "Unauthorized" });
    try {
        const pendingEvents = await Event.find({ status: 'pending' }).populate('club', 'name');
        
        const clubs = await Club.find({}).populate({
            path: 'members',
            select: 'username' // Only select the username for members
        });

        const students = await Student.find({ isActive: true }, 'username name');
        const clubHeads = await ClubHead.find({ isActive: true }, 'username name');
        
        // Combine users cleanly for the table
        const allUsers = [
            ...students.map(s => ({ username: s.username, name: s.name || s.username, role: 'Student' })),
            ...clubHeads.map(ch => ({ username: ch.username, name: ch.name || ch.username, role: 'Club Head' }))
        ];

        res.json({ pendingEvents, clubs, allUsers });
    } catch (err) {
        console.error("Error in /faculty/dashboard:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// FACULTY: Respond to an event proposal
app.post("/faculty/events/respond", authenticateToken, async (req, res) => {
    if (req.user.role !== "faculty") return res.status(403).json({ error: "Unauthorized" });
    try {
        const { eventId, action } = req.body;
        if (!['approved', 'rejected'].includes(action)) {
            return res.status(400).json({ error: "Invalid action." });
        }
        const updatedEvent = await Event.findByIdAndUpdate(eventId, { status: action }, { new: true }).populate('club', 'name');
        if (!updatedEvent) return res.status(404).json({ error: "Event not found." });

        if (action === 'approved') {
            try {
                await Notification.create({
                    title: "New Event Scheduled! 📅",
                    message: `"${updatedEvent.title}" has been approved for ${new Date(updatedEvent.date).toLocaleDateString()} hosted by ${updatedEvent.club?.name || 'KMIT Club'}. Register now!`,
                    type: "event"
                });
            } catch (notifErr) {
                console.error("Failed to create faculty event notification:", notifErr);
            }
        }

        res.json({ message: `Event has been successfully ${action}.` });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// PUBLIC: Get all approved events for students
// app.get("/events/approved", async (req, res) => {
//     try {
//         const approvedEvents = await Event.find({ status: 'approved' }).sort({ date: 1 }).populate('club', 'name');
//         res.json(approvedEvents);
//     } catch (err) {
//         res.status(500).json({ error: "Server error" });
//     }
// });
// PUBLIC: Get all approved events for students
app.get("/events/approved", async (req, res) => {
    try {
        const approvedEvents = await Event.find({ status: 'approved' })
            .sort({ date: 1 })                     // Sort events by date (ascending)
            .populate('club', 'name upiId upiQrCode'); // Replace club ObjectId with club name and UPI settings

        // Dynamically calculate and attach average ratings
        const eventsWithRatings = await Promise.all(approvedEvents.map(async (event) => {
            const regs = await Registration.find({ event: event._id, rating: { $exists: true, $ne: null } });
            let avgRating = 0;
            if (regs.length > 0) {
                const sum = regs.reduce((acc, r) => acc + r.rating, 0);
                avgRating = Number((sum / regs.length).toFixed(1));
            }
            const eventObj = event.toObject();
            eventObj.averageRating = avgRating;
            eventObj.ratingCount = regs.length;
            return eventObj;
        }));

        res.json(eventsWithRatings);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 1. Get all users (COMPLETE THIS)
app.get("/admin/users", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    
    
    try {
        // ✅ ADD isActive: true FILTER
        const students = await Student.find({ isActive: true }, 'username name email');
        const faculty = await Faculty.find({ isActive: true }, 'username name email');
        const clubHeads = await ClubHead.find({ isActive: true }, 'username name email');
        
        const allUsers = [
            ...students.map(s => ({ ...s._doc, role: 'student' })),
            ...faculty.map(f => ({ ...f._doc, role: 'faculty' })),
            ...clubHeads.map(ch => ({ ...ch._doc, role: 'clubhead' }))
        ];
        res.json(allUsers);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Import users from CSV endpoint
app.post("/admin/users/import", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    
    try {
        const { users } = req.body;
        if (!Array.isArray(users)) {
            return res.status(400).json({ error: "Invalid data format. Expected array of users." });
        }
        
        let successCount = 0;
        let skipCount = 0;
        let errors = [];
        
        for (const u of users) {
            const role = (u.role || '').toLowerCase();
            const username = (u.username || '').trim();
            const password = u.password || 'KmitPassword123$';
            const name = (u.name || username).trim();
            const email = (u.email || '').trim();
            
            if (!username) {
                skipCount++;
                errors.push(`Skipped row: Username/Email is missing.`);
                continue;
            }
            
            if (role === "student") {
                // Validate student roll number
                if (!validateStudentRollNo(username)) {
                    skipCount++;
                    errors.push(`Skipped student ${username}: Invalid Roll No format.`);
                    continue;
                }
                const existing = await Student.findOne({ username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } });
                if (existing) {
                    skipCount++;
                    continue;
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                const student = new Student({
                    username: username,
                    password: hashedPassword,
                    name: name,
                    rollNumber: username,
                    isActive: true
                });
                await student.save();
                successCount++;
            } else if (role === "faculty") {
                // Validate faculty email
                if (!validateFacultyEmail(username)) {
                    skipCount++;
                    errors.push(`Skipped faculty ${username}: Invalid email format.`);
                    continue;
                }
                const existing = await Faculty.findOne({ username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } });
                if (existing) {
                    skipCount++;
                    continue;
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                const faculty = new Faculty({
                    username: username,
                    password: hashedPassword,
                    name: name,
                    email: email || username,
                    isActive: true
                });
                await faculty.save();
                successCount++;
            } else if (role === "clubhead") {
                // Validate club head username
                if (!validateClubHeadUsername(username)) {
                    skipCount++;
                    errors.push(`Skipped clubhead ${username}: Invalid format (must end in -Head).`);
                    continue;
                }
                // Check if club exists
                const club = await Club.findOne({ headUsername: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } });
                if (!club) {
                    skipCount++;
                    errors.push(`Skipped clubhead ${username}: No matching club found with headUsername.`);
                    continue;
                }
                const existing = await ClubHead.findOne({ username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } });
                if (existing) {
                    skipCount++;
                    continue;
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                const clubHead = new ClubHead({
                    username: username,
                    password: hashedPassword,
                    name: name,
                    club: club._id,
                    isActive: true
                });
                await clubHead.save();
                successCount++;
            } else {
                skipCount++;
                errors.push(`Skipped ${username}: Unknown role '${role}'.`);
            }
        }
        
        res.json({
            message: `✅ CSV Import complete! Imported: ${successCount}, Skipped: ${skipCount}`,
            errors: errors
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during import" });
    }
});

// Import clubs from CSV endpoint
app.post("/admin/clubs/import", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    
    try {
        const { clubs } = req.body;
        if (!Array.isArray(clubs)) {
            return res.status(400).json({ error: "Invalid data format. Expected array of clubs." });
        }
        
        let successCount = 0;
        let skipCount = 0;
        let errors = [];
        
        for (const c of clubs) {
            const name = (c.name || '').trim();
            const slug = (c.slug || '').trim().toLowerCase();
            const description = (c.description || '').trim();
            const headUsername = (c.headUsername || '').trim();
            const image = (c.image || 'kmit.png').trim();
            
            if (!name || !slug) {
                skipCount++;
                errors.push(`Skipped row: Name or Slug is missing.`);
                continue;
            }
            
            // Check if club already exists
            const existingSlug = await Club.findOne({ slug });
            if (existingSlug) {
                skipCount++;
                errors.push(`Skipped club ${name}: Slug '${slug}' already exists.`);
                continue;
            }
            
            let finalHeadUsername = undefined;
            if (headUsername) {
                if (!validateClubHeadUsername(headUsername)) {
                    skipCount++;
                    errors.push(`Skipped club ${name}: Invalid headUsername format '${headUsername}' (must end in -Head).`);
                    continue;
                }
                const existingHeadUser = await Club.findOne({ headUsername: { $regex: new RegExp(`^${escapeRegex(headUsername)}$`, 'i') } });
                if (existingHeadUser) {
                    skipCount++;
                    errors.push(`Skipped club ${name}: headUsername '${headUsername}' is already assigned to another club.`);
                    continue;
                }
                finalHeadUsername = headUsername;
            }
            
            const club = new Club({
                name,
                slug,
                headUsername: finalHeadUsername,
                description,
                image,
                members: [],
                pendingRequests: []
            });
            await club.save();

            // Re-link existing ClubHead if there is one
            if (finalHeadUsername) {
                await ClubHead.updateMany(
                    { username: { $regex: new RegExp(`^${escapeRegex(finalHeadUsername)}$`, 'i') } },
                    { club: club._id }
                );
            }

            successCount++;
        }
        
        res.json({
            message: `✅ Club CSV Import complete! Imported: ${successCount}, Skipped: ${skipCount}`,
            errors: errors
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during club import" });
    }
});

// 2. Admin event approval (COMPLETE THIS)
app.post("/admin/events/:eventId/approve", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    
    try {
        const event = await Event.findByIdAndUpdate(
            req.params.eventId, 
            { status: 'approved' },
            { new: true }
        ).populate('club', 'name');
        
        if (!event) return res.status(404).json({ error: "Event not found" });

        // Auto-create a notification when event is approved!
        try {
            await Notification.create({
                title: "New Event Scheduled! 📅",
                message: `"${event.title}" has been approved for ${new Date(event.date).toLocaleDateString()} hosted by ${event.club?.name || 'KMIT Club'}. Register now!`,
                type: "event"
            });
        } catch (notifErr) {
            console.error("Failed to create admin event notification:", notifErr);
        }

        res.json({ message: "Event approved", event });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 3. Admin event rejection
app.post("/admin/events/:eventId/reject", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    
    try {
        const event = await Event.findByIdAndUpdate(
            req.params.eventId, 
            { status: 'rejected' },
            { new: true }
        );
        if (!event) return res.status(404).json({ error: "Event not found" });
        res.json({ message: "Event rejected", event });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
// ADMIN: Get ALL events (pending, approved, rejected) with funds
// ADMIN: Get ALL events
app.get("/admin/events", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    try {
        const events = await Event.find({})
            .populate('club', 'name')
            .sort({ createdAt: -1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ADMIN: Get fund requests
app.get("/admin/fund-requests", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    try {
        const eventsWithFunds = await Event.find({ fundRequest: { $gt: 0 } })
            .populate('club', 'name')
            .sort({ createdAt: -1 });
        res.json(eventsWithFunds);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
// ADMIN: Deactivate user (soft delete)
app.post("/admin/users/:id/deactivate", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    
    try {
        const { id } = req.params;
        
        // Try to find and deactivate in all user collections
        let user = await Student.findByIdAndUpdate(id, { isActive: false });
        if (!user) user = await Faculty.findByIdAndUpdate(id, { isActive: false });
        if (!user) user = await ClubHead.findByIdAndUpdate(id, { isActive: false });
        
        if (!user) return res.status(404).json({ error: "User not found" });
        
        res.json({ message: "User deactivated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
// ADMIN: Hard delete user (PERMANENT - COMPLETELY REMOVES FROM DATABASE)
app.delete("/admin/users/:id", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    
    try {
        const { id } = req.params;
        
        // Try to delete from all collections
        let result = await Student.findByIdAndDelete(id);
        if (!result) result = await Faculty.findByIdAndDelete(id);
        if (!result) result = await ClubHead.findByIdAndDelete(id);
        
        if (!result) return res.status(404).json({ error: "User not found" });
        
        res.json({ message: "✅ User permanently deleted from database" });
    } catch (err) {
        console.error("Hard delete error:", err);
        res.status(500).json({ error: "Server error during deletion" });
    }
});

// ADMIN: Update approved fund amount
app.post("/admin/events/:id/update-funds", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    
    try {
        const { approvedFund } = req.body;
        const event = await Event.findByIdAndUpdate(
            req.params.id,
            { approvedFund: approvedFund },
            { new: true }
        );
        
        if (!event) return res.status(404).json({ error: "Event not found" });
        res.json({ message: "Approved funds updated successfully", event });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ADMIN: Get detailed clubs information with members and heads
app.get("/admin/clubs-detailed", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    
    try {
        const clubs = await Club.find({})
            .populate('members', 'username name')
            .populate('pendingRequests', 'username name');
        res.json(clubs);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// --- NEW NOTIFICATION & ANNOUNCEMENT APIS ---

// GET: Student notifications feed
app.get("/student/notifications", authenticateToken, async (req, res) => {
    if (!["student", "faculty", "admin"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized" });
    }
    try {
        const notifications = await Notification.find({}).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST: Club Head posts a custom announcement
app.post("/clubhead/announcements", authenticateToken, async (req, res) => {
    if (req.user.role !== "clubhead") return res.status(403).json({ error: "Unauthorized" });
    try {
        const { message } = req.body;
        if (!message || message.trim() === "") {
            return res.status(400).json({ error: "Announcement message is required." });
        }
        const clubHead = await ClubHead.findById(req.user.id).populate('club', 'name');
        if (!clubHead || !clubHead.club) {
            return res.status(404).json({ error: "Club not found for this club head." });
        }
        const title = `Announcement from ${clubHead.club.name} 📢`;
        const notification = new Notification({
            title,
            message,
            type: "announcement"
        });
        await notification.save();
        res.json({ message: "Announcement broadcasted successfully!", notification });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// --- NEW CLUB MANAGEMENT APIS (ADMIN) ---

// POST: Admin creates a new club
app.post("/admin/clubs", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    try {
        const { name, slug, description, image, headUsername } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ error: "Club name and slug are required." });
        }
        
        // Check if slug or name already exists
        const existingClub = await Club.findOne({ $or: [{ slug }, { name }] });
        if (existingClub) {
            return res.status(400).json({ error: "A club with this name or slug already exists." });
        }

        const newClub = new Club({
            name,
            slug,
            description,
            image: image || "kmit.png",
            headUsername,
            members: [],
            pendingRequests: []
        });
        await newClub.save();

        // Re-link existing ClubHead if there is one
        if (headUsername) {
            await ClubHead.updateMany(
                { username: { $regex: new RegExp(`^${escapeRegex(headUsername)}$`, 'i') } },
                { club: newClub._id }
            );
        }

        // Trigger Notification
        try {
            await Notification.create({
                title: "New Club Added! 🏛️",
                message: `We are excited to announce the addition of a new club: "${name}"! Explore it on your dashboard and request to join.`,
                type: "club"
            });
        } catch (notifErr) {
            console.error("Failed to create club notification:", notifErr);
        }

        res.status(201).json({ message: `Club "${name}" created successfully!`, club: newClub });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// DELETE: Admin deletes a club
app.delete("/admin/clubs/:id", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    try {
        const clubId = req.params.id;
        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ error: "Club not found." });

        // Remove club references from Student joinedClubs & pendingRequests
        await Student.updateMany(
            { $or: [{ joinedClubs: clubId }, { pendingRequests: clubId }] },
            { $pull: { joinedClubs: clubId, pendingRequests: clubId } }
        );

        // Delete associated events
        await Event.deleteMany({ club: clubId });

        // Delete corresponding ClubHead user(s)
        if (club.headUsername) {
            await ClubHead.deleteMany({ username: { $regex: new RegExp(`^${escapeRegex(club.headUsername)}$`, 'i') } });
        }
        await ClubHead.deleteMany({ club: clubId });

        // Finally delete the club
        await Club.findByIdAndDelete(clubId);

        res.json({ message: `Club "${club.name}" and all its related events, heads, and members links have been removed.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// --- NEW EVENT REMOVAL APIS ---

// DELETE: Admin deletes an event
app.delete("/admin/events/:eventId", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    try {
        const event = await Event.findByIdAndDelete(req.params.eventId);
        if (!event) return res.status(404).json({ error: "Event not found" });
        res.json({ message: "Event successfully deleted by Admin." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// DELETE: Club Head deletes their own event
app.delete("/clubhead/events/:eventId", authenticateToken, async (req, res) => {
    if (req.user.role !== "clubhead") return res.status(403).json({ error: "Unauthorized" });
    try {
        const clubHead = await ClubHead.findById(req.user.id);
        if (!clubHead || !clubHead.club) {
            return res.status(404).json({ error: "Club Head or club link not found." });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) return res.status(404).json({ error: "Event not found" });

        // Verify event belongs to this Club Head's club
        if (event.club.toString() !== clubHead.club.toString()) {
            return res.status(403).json({ error: "Unauthorized: You cannot delete another club's event." });
        }

        await Event.findByIdAndDelete(req.params.eventId);
        res.json({ message: "Event successfully deleted." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// --- NEW STUDENT REGISTRATION & SIMULATED PAYMENT APIs ---

// POST: Student registers for an event (with simulated PhonePe/UPI payment if fee > 0)
app.post("/student/events/:eventId/register", authenticateToken, async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ error: "Unauthorized" });
    try {
        const { paymentDetails } = req.body;
        const studentId = req.user.id;
        
        const event = await Event.findById(req.params.eventId);
        if (!event) return res.status(404).json({ error: "Event not found." });
        if (event.status !== 'approved') {
            return res.status(400).json({ error: "You can only register for approved events." });
        }

        // Check if already registered
        if (event.registeredStudents.some(id => id.toString() === studentId)) {
            return res.status(400).json({ error: "You are already registered for this event." });
        }

        let paymentMethod = 'free';
        let upiIdInput = undefined;
        let transactionId = 'FREE-' + Date.now();

        // Handle simulated UPI payment
        if (event.registrationFee > 0) {
            if (!paymentDetails || !paymentDetails.paymentMethod) {
                return res.status(400).json({ error: "❌ Payment details (method) are required for this event." });
            }
            
            paymentMethod = paymentDetails.paymentMethod;
            if (!['upi_qr', 'upi_id'].includes(paymentMethod)) {
                return res.status(400).json({ error: "❌ Invalid payment method. Must be upi_qr or upi_id." });
            }

            if (paymentMethod === 'upi_id') {
                if (!paymentDetails.upiId || paymentDetails.upiId.trim() === "") {
                    return res.status(400).json({ error: "❌ UPI ID is required." });
                }
                upiIdInput = paymentDetails.upiId.trim();
                if (!upiIdInput.includes('@')) {
                    return res.status(400).json({ error: "❌ Invalid UPI ID format. Missing '@' symbol." });
                }
            }

            // Generate simulated transaction ID
            transactionId = 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
        }

        // Create registration log
        const registration = new Registration({
            event: event._id,
            student: studentId,
            paymentMethod: paymentMethod,
            upiId: upiIdInput,
            transactionId: transactionId,
            amountPaid: event.registrationFee,
            status: 'completed'
        });
        await registration.save();

        // Register student
        event.registeredStudents.push(studentId);
        await event.save();

        res.json({ 
            message: "✅ Registration successful! You are now registered for the event.", 
            registrationFee: event.registrationFee,
            transactionId: transactionId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// --- REAL PHONEPE PAYMENT INTEGRATION ENDPOINTS ---

const https = require('https');

function phonepeRequest(url, method, headers, requestBody = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: method.toUpperCase(),
            headers: headers
        };

        if (requestBody && method.toUpperCase() === 'POST') {
            options.headers['Content-Length'] = Buffer.byteLength(requestBody);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    reject(new Error(`Failed to parse PhonePe response: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (requestBody && method.toUpperCase() === 'POST') {
            req.write(requestBody);
        }
        req.end();
    });
}

// POST: Initiate PhonePe Payment Gateway Redirect Flow (Local Offline Mock)
app.post("/student/events/:eventId/pay-initiate", authenticateToken, async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ error: "Unauthorized" });
    try {
        const studentId = req.user.id;
        const eventId = req.params.eventId;
        
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: "Event not found." });
        if (event.status !== 'approved') {
            return res.status(400).json({ error: "You can only register for approved events." });
        }

        // Check if already registered
        if (event.registeredStudents.some(id => id.toString() === studentId)) {
            return res.status(400).json({ error: "You are already registered for this event." });
        }

        // Check if there is already a completed registration
        const existingReg = await Registration.findOne({ event: eventId, student: studentId, status: 'completed' });
        if (existingReg) {
            return res.status(400).json({ error: "You have already paid and registered for this event." });
        }

        // Handle free event registration directly
        if (!event.registrationFee || event.registrationFee <= 0) {
            const transactionId = 'FREE-' + Date.now();
            const registration = new Registration({
                event: event._id,
                student: studentId,
                paymentMethod: 'free',
                transactionId: transactionId,
                amountPaid: 0,
                status: 'completed'
            });
            await registration.save();

            event.registeredStudents.push(studentId);
            await event.save();

            return res.json({ 
                message: "✅ Registration successful for free event!", 
                registrationFee: 0,
                transactionId: transactionId,
                redirect: false
            });
        }

        // Generate unique merchant transaction ID
        const merchantTransactionId = 'MTXN' + Date.now() + studentId.toString().slice(-4) + Math.floor(Math.random() * 100);

        // Delete any stale pending registration to avoid duplicate key issues
        await Registration.deleteMany({ event: eventId, student: studentId, status: 'pending' });

        // Save new pending registration log
        const registration = new Registration({
            event: event._id,
            student: studentId,
            paymentMethod: 'phonepe',
            transactionId: merchantTransactionId,
            amountPaid: event.registrationFee,
            status: 'pending'
        });
        await registration.save();

        console.log(`[PhonePe Pay] Initiating LOCAL payment redirect for student ${studentId}. Txn ID: ${merchantTransactionId}. Amount: Rs.${event.registrationFee}`);

        // Return local redirection URL to the simulator page
        const localRedirectUrl = `/phonepe-checkout.html?transactionId=${merchantTransactionId}&amount=${event.registrationFee}&event=${encodeURIComponent(event.title)}`;

        return res.json({
            redirect: true,
            paymentUrl: localRedirectUrl,
            transactionId: merchantTransactionId
        });

    } catch (err) {
        console.error("[PhonePe Pay] Exception:", err);
        res.status(500).json({ error: "Server error initiating payment: " + err.message });
    }
});

// POST/GET: PhonePe callback redirect endpoint (Local Offline Checker)
app.all("/api/payment-callback", async (req, res) => {
    try {
        console.log(`[PhonePe Callback] Received callback. Method: ${req.method}. Query:`, req.query, "Body:", req.body);
        
        // Extract transaction ID and payment status code
        let transactionId = req.query.transactionId || req.body.transactionId;
        if (!transactionId && req.body && typeof req.body === 'object') {
            transactionId = req.body.merchantTransactionId || req.body.transactionId;
        }

        let code = req.query.code || req.body.code || "PAYMENT_SUCCESS";

        if (!transactionId) {
            console.error("[PhonePe Callback] Missing transaction ID.");
            return res.status(400).send("❌ Invalid callback request: Transaction ID is missing.");
        }

        const registration = await Registration.findOne({ transactionId: transactionId });
        if (!registration) {
            console.error(`[PhonePe Callback] Registration not found for txn: ${transactionId}`);
            return res.status(404).send("❌ Error: Registration record not found.");
        }

        const event = await Event.findById(registration.event);
        if (!event) {
            console.error(`[PhonePe Callback] Event not found for registration: ${registration.event}`);
            return res.status(404).send("❌ Error: Event not found.");
        }

        if (code === "PAYMENT_SUCCESS") {
            // Update registration status to completed
            registration.status = 'completed';
            await registration.save();

            // Add student to registered list in Event
            if (!event.registeredStudents.some(id => id.toString() === registration.student.toString())) {
                event.registeredStudents.push(registration.student);
                await event.save();
            }

            console.log(`[PhonePe Callback] SUCCESS: Registered student ${registration.student} for event ${event.title}`);
            return res.redirect(`/student-dashboard.html?paymentStatus=success&event=${encodeURIComponent(event.title)}&txn=${transactionId}`);
        } else {
            // Update registration status to failed
            registration.status = 'failed';
            await registration.save();

            const reason = "Payment was cancelled or failed on gateway.";
            console.log(`[PhonePe Callback] FAILURE: Txn ${transactionId} failed.`);
            return res.redirect(`/student-dashboard.html?paymentStatus=failed&reason=${encodeURIComponent(reason)}`);
        }

    } catch (err) {
        console.error("[PhonePe Callback] Error handling callback:", err);
        return res.status(500).send("❌ Internal Server Error handling payment callback.");
    }
});

// GET: Student gets their registration list (with populated event details)
app.get("/student/registrations", authenticateToken, async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ error: "Unauthorized" });
    try {
        const student = await Student.findOne({ username: req.user.username });
        if (!student) return res.status(404).json({ error: "Student not found." });

        const registrations = await Registration.find({ student: student._id })
            .populate({
                path: 'event',
                populate: { path: 'club', select: 'name' }
            });
        res.json(registrations);
    } catch (err) {
        console.error("[Student Registrations] Error:", err);
        res.status(500).json({ error: "Server error fetching registrations" });
    }
});

// POST: Student submits feedback/rating for a completed event they registered for
app.post("/student/events/:eventId/feedback", authenticateToken, async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ error: "Unauthorized" });
    try {
        const { rating, feedback } = req.body;
        const studentId = req.user.id;
        const eventId = req.params.eventId;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5 stars." });
        }

        // Find the student
        const student = await Student.findOne({ username: req.user.username });
        if (!student) return res.status(404).json({ error: "Student not found." });

        // Find the event
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: "Event not found." });
        
        if (!event.isCompleted) {
            return res.status(400).json({ error: "You can only submit feedback for completed events." });
        }

        // Find completed registration for this student and event
        const registration = await Registration.findOne({
            event: eventId,
            student: student._id,
            status: 'completed'
        });

        if (!registration) {
            return res.status(400).json({ error: "You must be registered for this event to leave feedback." });
        }

        // Save rating & feedback
        registration.rating = Number(rating);
        registration.feedback = feedback || "";
        await registration.save();

        console.log(`[Feedback] Saved review for event ${event.title} by student ${student.username}. Rating: ${rating}`);
        res.json({ message: "Thank you for your feedback!" });
    } catch (err) {
        console.error("[Feedback POST] Error:", err);
        res.status(500).json({ error: "Server error submitting feedback" });
    }
});

// GET: Public feedbacks for an event
app.get("/public/events/:eventId/feedback", async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const reviews = await Registration.find({ event: eventId, rating: { $exists: true, $ne: null } })
            .populate('student', 'username name');
        
        const feedbackList = reviews.map(r => ({
            studentName: r.student?.name || r.student?.username || "Anonymous Student",
            rating: r.rating,
            feedback: r.feedback,
            createdAt: r.createdAt
        }));
        
        res.json(feedbackList);
    } catch (err) {
        console.error("[Feedback GET] Error:", err);
        res.status(500).json({ error: "Server error fetching event reviews" });
    }
});

// GET: Club Head views registration details for their events
app.get("/clubhead/events/:eventId/registrations", authenticateToken, async (req, res) => {
    if (req.user.role !== "clubhead") return res.status(403).json({ error: "Unauthorized" });
    try {
        const clubHead = await ClubHead.findById(req.user.id);
        const event = await Event.findById(req.params.eventId).populate('registeredStudents', 'username name rollNumber');
        if (!event) return res.status(404).json({ error: "Event not found." });

        // Verify event belongs to this Club Head's club
        if (event.club.toString() !== clubHead.club.toString()) {
            return res.status(403).json({ error: "Unauthorized." });
        }

        const registrations = await Registration.find({ event: event._id }).populate('student', 'username name rollNumber');
        
        // Backward compatibility: If no registration logs exist but students are registered (legacy data)
        if (registrations.length === 0 && event.registeredStudents.length > 0) {
            const legacyRegistrations = event.registeredStudents
                .filter(s => s !== null && s !== undefined)
                .map(student => ({
                    student: student,
                    paymentMethod: event.registrationFee > 0 ? 'legacy' : 'free',
                    transactionId: 'LEGACY-' + event._id,
                    amountPaid: event.registrationFee || 0,
                    createdAt: event.createdAt || new Date()
                }));
            return res.json(legacyRegistrations);
        }

        res.json(registrations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});


// GET: Admin retrieves all registrations (payments ledger)
app.get("/admin/payments", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    try {
        const registrations = await Registration.find({})
            .populate('student', 'username name rollNumber')
            .populate({
                path: 'event',
                select: 'title registrationFee club',
                populate: { path: 'club', select: 'name' }
            })
            .sort({ createdAt: -1 });
        
        res.json(registrations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching payments ledger." });
    }
});

// POST: Club Head marks an event as completed and adds photo gallery URLs
app.post("/clubhead/events/:eventId/complete", authenticateToken, async (req, res) => {
    if (req.user.role !== "clubhead") return res.status(403).json({ error: "Unauthorized" });
    try {
        const { eventImages } = req.body;
        const clubHead = await ClubHead.findById(req.user.id);
        const event = await Event.findById(req.params.eventId);
        if (!event) return res.status(404).json({ error: "Event not found." });

        // Verify event belongs to this Club Head's club
        if (event.club.toString() !== clubHead.club.toString()) {
            return res.status(403).json({ error: "Unauthorized: You cannot manage another club's event." });
        }

        // Validate eventImages format
        if (!Array.isArray(eventImages)) {
            return res.status(400).json({ error: "Images must be sent as an array of URLs." });
        }

        // Update event fields
        event.isCompleted = true;
        event.eventImages = eventImages.filter(url => typeof url === 'string' && url.trim() !== "");
        await event.save();

        res.json({ message: "✅ Event marked as completed and memories gallery updated!", event });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error while completing event." });
    }
});

// --- PASSWORD RESET ENDPOINTS ---
app.post("/forgot-password/request", async (req, res) => {
  try {
    const { role, username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "❌ Username/Email is required." });
    }
    
    if (role === "faculty") {
      const faculty = await Faculty.findOne({ username: { $regex: new RegExp(`^${escapeRegex(username.trim())}$`, 'i') }, isActive: true });
      if (!faculty) {
        return res.status(404).json({ error: "❌ Faculty account with this email not found." });
      }
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      faculty.otp = otp;
      faculty.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await faculty.save();
      
      console.log(`\n=============================================`);
      console.log(`[OTP MAIL] Sent to: ${faculty.username}`);
      console.log(`[OTP CODE] Code: ${otp}`);
      console.log(`=============================================\n`);
      
      if (mailTransporter) {
        try {
          await mailTransporter.sendMail({
            from: `"KMIT Clubs Hubs" <${EMAIL_USER}>`,
            to: faculty.username,
            subject: "Your OTP for Password Reset",
            text: `Hi ${faculty.name || 'Faculty'},\n\nYour OTP for password reset is: ${otp}.\n\nThis OTP is valid for 10 minutes.\n\nRegards,\nKMIT Clubs Hubs`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
              <h2 style="color: #3b82f6;">KMIT Clubs Hubs Password Reset</h2>
              <p>Hi <strong>${faculty.name || 'Faculty'}</strong>,</p>
              <p>You requested a password reset. Please use the following 6-digit One-Time Password (OTP) to reset your password:</p>
              <div style="background-color: #eff6ff; border: 1px dashed #3b82f6; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; color: #2563eb; letter-spacing: 4px; margin: 20px 0; border-radius: 6px;">
                ${otp}
              </div>
              <p style="font-size: 13px; color: #666;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #999; text-align: center;">KMIT Clubs Hubs Dashboard System</p>
            </div>`
          });
          console.log(`[SMTP MAIL] OTP successfully sent to: ${faculty.username}`);
        } catch (mailErr) {
          console.error("❌ Failed to send SMTP email, falling back to console:", mailErr);
        }
      }
      
      return res.json({ message: "✅ OTP sent to your email.", otpSimulated: otp });
    }
    
    return res.status(400).json({ error: "❌ Request OTP is only applicable to Faculty." });
  } catch (err) {
    console.error("Forgot request error:", err);
    res.status(500).json({ error: "❌ Server error during forgot request." });
  }
});

app.post("/forgot-password/reset", async (req, res) => {
  try {
    const { role, username, newPassword } = req.body;
    
    if (!newPassword || newPassword.trim() === "") {
      return res.status(400).json({ error: "❌ Password cannot be empty." });
    }

    if (role === "student" || role === "clubhead") {
      return res.status(403).json({ error: "❌ Public self-reset is disabled for Student/Club Head. Please submit a Reset Request instead." });
    }

    if (role === "faculty") {
      const { otp } = req.body;
      if (!otp) return res.status(400).json({ error: "❌ OTP is required." });
      
      const faculty = await Faculty.findOne({ username: { $regex: new RegExp(`^${escapeRegex(username.trim())}$`, 'i') }, isActive: true });
      if (!faculty) return res.status(404).json({ error: "❌ Faculty account not found." });
      
      if (faculty.otp !== otp || new Date() > faculty.otpExpires) {
        return res.status(400).json({ error: "❌ Invalid or expired OTP." });
      }
      
      if (!validateFacultyPassword(newPassword)) {
        return res.status(400).json({ error: "❌ Invalid password format. Must contain uppercase, lowercase, number, and special character (min 10 chars)" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      faculty.password = hashedPassword;
      faculty.otp = undefined;
      faculty.otpExpires = undefined;
      await faculty.save();
      
      return res.json({ message: "✅ Password reset successful! You can now login." });
    }
    
    return res.status(400).json({ error: "❌ Invalid role for password reset." });
  } catch (err) {
    console.error("Forgot reset error:", err);
    res.status(500).json({ error: "❌ Server error during forgot reset." });
  }
});

// --- PASSWORD RESET REQUESTS AND ADMIN OVERRIDES ---

// POST: Public submission of password reset requests (Student / Club Head)
app.post("/forgot-password/request-reset", async (req, res) => {
  try {
    const { role, username, contactEmail, reason } = req.body;
    
    if (!role || !username || !contactEmail) {
      return res.status(400).json({ error: "❌ Username, role, and contact email are required." });
    }
    
    const cleanRole = role.toLowerCase().trim();
    if (!['student', 'clubhead'].includes(cleanRole)) {
      return res.status(400).json({ error: "❌ Request reset is only applicable for Students and Club Heads." });
    }
    
    // Check if user exists
    let userExists = false;
    if (cleanRole === 'student') {
      const student = await Student.findOne({ username: { $regex: new RegExp(`^${escapeRegex(username.trim())}$`, 'i') }, isActive: true });
      if (student) userExists = true;
    } else if (cleanRole === 'clubhead') {
      const clubHead = await ClubHead.findOne({ username: { $regex: new RegExp(`^${escapeRegex(username.trim())}$`, 'i') }, isActive: true });
      if (clubHead) userExists = true;
    }
    
    if (!userExists) {
      return res.status(404).json({ error: `❌ ${role} account with username '${username}' not found or is inactive.` });
    }
    
    // Check if there is already a pending request
    const existingRequest = await ResetRequest.findOne({ 
      username: { $regex: new RegExp(`^${escapeRegex(username.trim())}$`, 'i') }, 
      role: cleanRole, 
      status: 'pending' 
    });
    
    if (existingRequest) {
      return res.status(400).json({ error: "❌ You already have a pending reset request. Please wait for the Admin to resolve it." });
    }
    
    // Create new request
    const newRequest = new ResetRequest({
      username: username.trim(),
      role: cleanRole,
      contactEmail: contactEmail.trim(),
      reason: (reason || '').trim(),
      status: 'pending'
    });
    
    await newRequest.save();
    res.json({ message: "✅ Password reset request submitted to Admin successfully!" });
  } catch (err) {
    console.error("Request reset error:", err);
    res.status(500).json({ error: "❌ Server error while submitting reset request." });
  }
});

// GET: Admin retrieves all pending reset requests
app.get("/admin/reset-requests", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  try {
    const requests = await ResetRequest.find({ status: 'pending' }).sort({ createdAt: 1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching reset requests." });
  }
});

// POST: Admin resolves a password reset request and resets the password
app.post("/admin/reset-requests/:requestId/resolve", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  try {
    const { requestId } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.trim() === "") {
      return res.status(400).json({ error: "❌ Password cannot be empty." });
    }
    
    const request = await ResetRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "❌ Reset request not found." });
    }
    
    if (request.status === 'resolved') {
      return res.status(400).json({ error: "❌ Request is already resolved." });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    let user = null;
    
    if (request.role === 'student') {
      user = await Student.findOne({ username: { $regex: new RegExp(`^${escapeRegex(request.username)}$`, 'i') } });
      if (user) {
        user.password = hashedPassword;
        await user.save();
      }
    } else if (request.role === 'clubhead') {
      user = await ClubHead.findOne({ username: { $regex: new RegExp(`^${escapeRegex(request.username)}$`, 'i') } });
      if (user) {
        user.password = hashedPassword;
        await user.save();
      }
    }
    
    if (!user) {
      return res.status(404).json({ error: "❌ User matching this request was not found in the database." });
    }
    
    request.status = 'resolved';
    await request.save();
    
    res.json({ message: `✅ Request resolved and password reset for ${request.role} '${request.username}' successfully!` });
  } catch (err) {
    console.error("Resolve reset request error:", err);
    res.status(500).json({ error: "❌ Server error resolving reset request." });
  }
});

// POST: Admin directly resets a user's password (Student, Faculty, or Club Head)
app.post("/admin/users/:id/reset-password", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.trim() === "") {
      return res.status(400).json({ error: "❌ Password cannot be empty." });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    let user = await Student.findById(id);
    let userRole = "";
    
    if (user) {
      user.password = hashedPassword;
      await user.save();
      userRole = "student";
    }
    
    if (!user) {
      user = await Faculty.findById(id);
      if (user) {
        user.password = hashedPassword;
        await user.save();
        userRole = "faculty";
      }
    }
    
    if (!user) {
      user = await ClubHead.findById(id);
      if (user) {
        user.password = hashedPassword;
        await user.save();
        userRole = "clubhead";
      }
    }
    
    if (!user) return res.status(404).json({ error: "❌ User not found." });
    
    res.json({ message: `✅ Password for ${userRole} '${user.username}' successfully reset.` });
  } catch (err) {
    console.error("Admin direct password reset error:", err);
    res.status(500).json({ error: "❌ Server error during password reset." });
  }
});

// Server running
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
