const path = require('path');
const mongoose = require('../backend/node_modules/mongoose');
const jwt = require('../backend/node_modules/jsonwebtoken');
const https = require('https');
require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/kmit-club";
const JWT_SECRET = process.env.JWT_SECRET || "mysecret123";

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // 1. Find a student
        const Student = mongoose.model('Student', new mongoose.Schema({ username: String }));
        const student = await Student.findOne({});
        if (!student) {
            console.error("No student found in DB.");
            return mongoose.disconnect();
        }
        console.log(`Using Student: ${student.username} (ID: ${student._id})`);

        // 2. Find an event with registrationFee > 0
        const Event = mongoose.model('Event', new mongoose.Schema({ title: String, registrationFee: Number, status: String, registeredStudents: Array }));
        const event = await Event.findOne({ registrationFee: { $gt: 0 }, status: 'approved' });
        if (!event) {
            console.error("No approved paid event found in DB.");
            return mongoose.disconnect();
        }
        console.log(`Using Event: ${event.title} (Fee: ₹${event.registrationFee}, ID: ${event._id})`);

        // Generate JWT token
        const token = jwt.sign(
            { id: student._id, role: 'student', username: student.username },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log(`Generated JWT Token: ${token.slice(0, 15)}...`);

        // 3. Make HTTP request to local server
        const http = require('http');
        const reqOpts = {
            hostname: '127.0.0.1',
            port: 5000,
            path: `/student/events/${event._id}/pay-initiate`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        console.log(`Sending POST request to http://127.0.0.1:5000/student/events/${event._id}/pay-initiate ...`);

        const req = http.request(reqOpts, (res) => {
            console.log(`Response Status: ${res.statusCode}`);
            console.log(`Response Headers:`, res.headers);
            
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log("Response Body:");
                console.log(data);
                mongoose.disconnect();
            });
        });

        req.on('error', (err) => {
            console.error("HTTP request error:", err);
            mongoose.disconnect();
        });

        req.end();

    } catch (err) {
        console.error("Error during debug script execution:", err);
        mongoose.disconnect();
    }
}

run();
