const mongoose = require('mongoose');
const MONGO_URI = "mongodb://127.0.0.1:27017/kmit-club";

const clubSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true, required: true },
    headUsername: { type: String, unique: true, sparse: true },
    description: String,
    image: String
});

const clubHeadSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    name: String,
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    isActive: { type: Boolean, default: true }
});

const Club = mongoose.model('Club', clubSchema);
const ClubHead = mongoose.model('ClubHead', clubHeadSchema);

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const clubs = await Club.find({});
        console.log("=== CLUBS ===");
        console.log(JSON.stringify(clubs, null, 2));

        const clubHeads = await ClubHead.find({});
        console.log("=== CLUB HEADS ===");
        console.log(JSON.stringify(clubHeads, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
