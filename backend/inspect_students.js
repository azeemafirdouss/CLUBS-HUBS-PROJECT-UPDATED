const mongoose = require('mongoose');
const MONGO_URI = "mongodb://127.0.0.1:27017/kmit-club";

const studentSchema = new mongoose.Schema({
    username: String,
    name: String,
    rollNumber: String,
    isActive: { type: Boolean, default: true }
});
const clubHeadSchema = new mongoose.Schema({
    username: String,
    name: String,
    isActive: { type: Boolean, default: true }
});
const facultySchema = new mongoose.Schema({
    username: String,
    name: String,
    email: String,
    isActive: { type: Boolean, default: true }
});

const Student = mongoose.model('Student', studentSchema);
const ClubHead = mongoose.model('ClubHead', clubHeadSchema);
const Faculty = mongoose.model('Faculty', facultySchema);

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const students = await Student.find({});
        console.log("=== STUDENTS ===");
        console.log(JSON.stringify(students.map(s => ({ id: s._id, username: s.username, name: s.name, rollNumber: s.rollNumber, isActive: s.isActive })), null, 2));

        const clubHeads = await ClubHead.find({});
        console.log("=== CLUB HEADS ===");
        console.log(JSON.stringify(clubHeads.map(c => ({ id: c._id, username: c.username, name: c.name, isActive: c.isActive })), null, 2));

        const faculty = await Faculty.find({});
        console.log("=== FACULTY ===");
        console.log(JSON.stringify(faculty.map(f => ({ id: f._id, username: f.username, name: f.name, email: f.email, isActive: f.isActive })), null, 2));

        const resetRequests = await mongoose.model('ResetRequest', new mongoose.Schema({
            username: String,
            role: String,
            contactEmail: String,
            status: String
        })).find({});
        console.log("=== RESET REQUESTS ===");
        console.log(JSON.stringify(resetRequests, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
